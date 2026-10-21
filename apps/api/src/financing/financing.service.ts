import { Injectable, NotFoundException } from '@nestjs/common';
import type { FinancingData } from '@locacao/shared';
import { todayInSaoPaulo } from '../agenda/agenda.service.js';
import { type Actor, writeAudit } from '../common/audit.js';
import { PrismaService } from '../prisma/prisma.service.js';

const DAY_MS = 86_400_000;
const MAX_HISTORY_MONTHS = 60;

const toDate = (value: string) => new Date(`${value}T00:00:00Z`);
const toIso = (value: Date) => value.toISOString().slice(0, 10);
const monthStart = (date: Date, offset = 0) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + offset, 1));
const monthsBetween = (from: Date, to: Date) =>
  (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + to.getUTCMonth() - from.getUTCMonth();

// Mesmo dia nos meses seguintes; 31/01 + 1 mês vira 28/02
function addMonths(date: Date, months: number): Date {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(date.getUTCDate(), lastDay));
  return target;
}

function overlapDays(start: Date, end: Date, from: Date, to: Date): number {
  const s = Math.max(start.getTime(), from.getTime());
  const e = Math.min(end.getTime(), to.getTime());
  return e > s ? Math.round((e - s) / DAY_MS) : 0;
}

const cents = (value: unknown) => Math.round(Number(value) * 100);

@Injectable()
export class FinancingService {
  constructor(private readonly prisma: PrismaService) {}

  async get(machineId: string) {
    await this.findMachine(machineId);
    const financing = await this.prisma.machineFinancing.findFirst({ where: { machineId, archivedAt: null } });
    if (!financing) return null;

    const [paidInSystem, upcoming] = await Promise.all([
      this.prisma.financialEntry.count({ where: { financingId: financing.id, paidAt: { not: null }, cancelledAt: null } }),
      this.prisma.financialEntry.findMany({
        where: { financingId: financing.id, paidAt: null, cancelledAt: null },
        orderBy: { installmentNumber: 'asc' },
        take: 6,
        select: { id: true, installmentNumber: true, dueDate: true, amount: true },
      }),
    ]);

    const amount = cents(financing.installmentAmount);
    const paidCount = Math.min(financing.paidBefore + paidInSystem, financing.installmentCount);
    const remaining = financing.installmentCount - paidCount;

    return {
      ...financing,
      firstDueDate: toIso(financing.firstDueDate),
      lastDueDate: toIso(addMonths(financing.firstDueDate, financing.installmentCount - 1)),
      paidCount,
      paidAmount: (paidCount * amount) / 100,
      remainingCount: remaining,
      remainingAmount: (remaining * amount) / 100,
      upcoming: upcoming.map((e) => ({ ...e, dueDate: toIso(e.dueDate) })),
    };
  }

  // Salva e regenera as parcelas em aberto; as já pagas no sistema ficam intactas
  async save(machineId: string, data: FinancingData, actor: Actor) {
    const machine = await this.findMachine(machineId);
    const values = {
      lender: data.lender,
      installmentAmount: data.installmentAmount,
      installmentCount: data.installmentCount,
      firstDueDate: toDate(data.firstDueDate),
      paidBefore: data.paidBefore,
      payoffAmount: data.payoffAmount ?? null,
      archivedAt: null,
    };

    await this.prisma.$transaction(async (tx) => {
      const financing = await tx.machineFinancing.upsert({
        where: { machineId },
        create: { machineId, ...values },
        update: values,
      });
      await tx.financialEntry.deleteMany({ where: { financingId: financing.id, paidAt: null } });

      const rows = [];
      for (let n = data.paidBefore + 1; n <= data.installmentCount; n++) {
        rows.push({
          kind: 'PAYABLE' as const,
          description: `Financiamento ${machine.code} · parcela ${n} de ${data.installmentCount}`,
          supplier: data.lender,
          dueDate: addMonths(values.firstDueDate, n - 1),
          amount: data.installmentAmount,
          financingId: financing.id,
          installmentNumber: n,
          installmentCount: data.installmentCount,
        });
      }
      // skipDuplicates: parcelas já pagas pelo sistema não são recriadas
      if (rows.length) await tx.financialEntry.createMany({ data: rows, skipDuplicates: true });
    });

    await writeAudit(this.prisma, { action: 'financiamento.salvo', entity: 'machine', entityId: machineId, actor, after: data });
    return this.get(machineId);
  }

  async remove(machineId: string, actor: Actor) {
    await this.findMachine(machineId);
    const financing = await this.prisma.machineFinancing.findFirst({ where: { machineId, archivedAt: null } });
    if (!financing) throw new NotFoundException('Esta máquina não tem financiamento');
    // Mantém o histórico do que já foi pago; apaga só o que estava em aberto
    await this.prisma.$transaction([
      this.prisma.financialEntry.deleteMany({ where: { financingId: financing.id, paidAt: null } }),
      this.prisma.machineFinancing.update({ where: { id: financing.id }, data: { archivedAt: new Date() } }),
    ]);
    await writeAudit(this.prisma, { action: 'financiamento.removido', entity: 'machine', entityId: machineId, actor });
  }

  // "Ela se paga?": aluguel (competência) − parcela − manutenção, mês a mês
  async result(machineId: string) {
    const machine = await this.findMachine(machineId);
    const current = monthStart(toDate(todayInSaoPaulo()));
    const historyStart = monthStart(current, -(MAX_HISTORY_MONTHS - 1));

    const [financing, items, maintenances] = await Promise.all([
      this.prisma.machineFinancing.findFirst({ where: { machineId, archivedAt: null } }),
      this.prisma.contractItem.findMany({
        where: { machineId, endDate: { gt: historyStart }, startDate: { lt: monthStart(current, 1) }, contract: { status: { in: ['ACTIVE', 'FINISHED'] } } },
        select: { startDate: true, endDate: true, dailyRate: true },
        take: 2000,
      }),
      this.prisma.maintenance.findMany({
        where: { machineId, date: { gte: historyStart, lt: monthStart(current, 1) } },
        select: { date: true, totalAmount: true },
        take: 2000,
      }),
    ]);

    // Começa no primeiro movimento da máquina (aluguel, manutenção ou parcela)
    const firsts = [
      ...items.map((i) => i.startDate),
      ...maintenances.map((m) => m.date),
      ...(financing ? [financing.firstDueDate] : []),
    ].filter((d) => d <= current);
    const earliest = firsts.length ? monthStart(new Date(Math.min(...firsts.map((d) => d.getTime())))) : current;
    const start = earliest < historyStart ? historyStart : earliest;
    const count = monthsBetween(start, current) + 1;

    const months = Array.from({ length: count }, (_, i) => {
      const from = monthStart(start, i);
      const to = monthStart(from, 1);
      let days = 0;
      let revenue = 0;
      for (const item of items) {
        const d = overlapDays(item.startDate, item.endDate, from, to);
        days += d;
        revenue += cents(item.dailyRate) * d;
      }
      const maintenance = maintenances.filter((m) => m.date >= from && m.date < to).reduce((sum, m) => sum + cents(m.totalAmount), 0);
      let installment = 0;
      if (financing) {
        const index = monthsBetween(monthStart(financing.firstDueDate), from);
        if (index >= 0 && index < financing.installmentCount) installment = cents(financing.installmentAmount);
      }
      return {
        month: toIso(from).slice(0, 7),
        days: Math.min(days, Math.round((to.getTime() - from.getTime()) / DAY_MS)),
        daysInMonth: Math.round((to.getTime() - from.getTime()) / DAY_MS),
        revenue: revenue / 100,
        installment: installment / 100,
        maintenance: maintenance / 100,
        net: (revenue - installment - maintenance) / 100,
      };
    });

    const dailyPrice = Number(machine.type.dailyPrice);
    const installmentAmount = financing ? Number(financing.installmentAmount) : null;
    return {
      dailyPrice,
      installmentAmount,
      // Diárias por mês para cobrir só a parcela
      breakEvenDays: installmentAmount && dailyPrice > 0 ? Math.ceil(installmentAmount / dailyPrice) : null,
      months,
    };
  }

  private async findMachine(id: string) {
    const machine = await this.prisma.machine.findFirst({
      where: { id, archivedAt: null },
      select: { id: true, code: true, type: { select: { dailyPrice: true } } },
    });
    if (!machine) throw new NotFoundException('Máquina não encontrada');
    return machine;
  }
}