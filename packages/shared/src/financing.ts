import { z } from 'zod';
import { parseDecimal } from './machine.js';

export const MAX_INSTALLMENTS = 240;

const isoDate = z
  .string({ error: 'Informe a data' })
  .regex(/^\d{4}-\d{2}-\d{2}$/, { error: 'Data inválida' })
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
  }, { error: 'Data inválida' });

const money = (label: string, min: number) =>
  z
    .unknown()
    .transform(parseDecimal)
    .pipe(
      z
        .number({ error: `${label}: informe um número` })
        .min(min, { error: `${label}: mínimo R$ ${min.toFixed(2).replace('.', ',')}` })
        .max(100_000_000, { error: `${label}: valor muito alto` })
        .transform((n) => Math.round(n * 100) / 100),
    );

const int = (label: string, min: number, max: number) =>
  z.coerce
    .number({ error: `${label}: informe um número` })
    .int({ error: `${label}: use número inteiro` })
    .min(min, { error: `${label}: mínimo ${min}` })
    .max(max, { error: `${label}: máximo ${max}` });

// Financiamento com parcelas de valor fixo
export const financingSchema = z
  .object({
    lender: z
      .string({ error: 'Informe o banco ou financeira' })
      .trim()
      .min(2, { error: 'Informe o banco ou financeira' })
      .max(200, { error: 'Máximo de 200 caracteres' }),
    installmentAmount: money('Parcela', 0.01),
    installmentCount: int('Nº de parcelas', 1, MAX_INSTALLMENTS),
    firstDueDate: isoDate,
    paidBefore: int('Já pagas', 0, MAX_INSTALLMENTS).default(0),
    // Opcional: valor que o banco informa para quitar hoje
    payoffAmount: z.preprocess(
      (value) => (value === '' || value === null ? undefined : value),
      money('Quitação', 0).optional(),
    ),
  })
  .refine((d) => d.paidBefore <= d.installmentCount, {
    error: 'Já pagas não pode ser maior que o nº de parcelas',
    path: ['paidBefore'],
  });

export type FinancingInput = z.input<typeof financingSchema>;
export type FinancingData = z.output<typeof financingSchema>;

export const ENTRY_ORIGINS = ['all', 'contract', 'financing', 'maintenance', 'manual'] as const;
export type EntryOrigin = (typeof ENTRY_ORIGINS)[number];

export const ENTRY_ORIGIN_LABELS: Record<EntryOrigin, string> = {
  all: 'Todas',
  contract: 'Contratos',
  financing: 'Financiamentos',
  maintenance: 'Manutenções',
  manual: 'Avulsos',
};