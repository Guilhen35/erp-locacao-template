/* eslint-disable @typescript-eslint/no-explicit-any */
// MODO DEMONSTRAÇÃO: intercepta as chamadas /api/* e responde com dados fictícios.
// Nada é enviado a servidores. Qualquer alteração (salvar, editar, excluir) abre o aviso de demo.

type Row = Record<string, any>

export const DEMO_EVENT = 'demo:somente-leitura'
const SESSION_KEY = 'erp_demo_logado'
const PHONE = '00000000000'
const CITY = 'Sua Cidade'
const UF = null

const pad = (n: number) => String(n).padStart(2, '0')
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const now = new Date()
const TODAY = iso(now)
const day = (offset: number) => iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset))
const monthOf = (date: string) => date.slice(0, 7)
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000) + 1
const money = (n: number) => n.toFixed(2)
const HEX: Record<string, string> = { r: 'a', u: 'b', t: 'c', m: 'd', c: 'e', k: 'f', n: '1', e: '2', f: '3', g: '4', i: '5' }
const uid = (prefix: string, n: number) => `${HEX[prefix]}0000000-0000-4000-8000-${String(n).padStart(12, '0')}`

// ---------- Usuários e perfis ----------
const ALL_PERMISSIONS = [
  'clientes:ler', 'clientes:editar', 'maquinas:ler', 'maquinas:editar', 'contratos:ler', 'contratos:editar',
  'financeiro:ler', 'financeiro:editar', 'manutencao:ler', 'manutencao:editar', 'relatorios:ler',
  'usuarios:gerenciar', 'auditoria:ler',
]
const roles = [
  { id: uid('r', 1), name: 'admin', description: 'Acesso total ao sistema' },
  { id: uid('r', 2), name: 'equipe', description: 'Operação do dia a dia, sem gestão de usuários e auditoria' },
]
const demoUser = {
  id: uid('u', 1), name: 'Visitante Demo', email: 'demo@exemplo.com', role: 'admin',
  permissions: ALL_PERMISSIONS, mustChangePassword: false,
}
const users = [
  { id: demoUser.id, name: demoUser.name, email: demoUser.email, isActive: true, mustChangePassword: false, mfaEnabled: false, lastLoginAt: new Date().toISOString(), lockedUntil: null, role: { id: roles[0].id, name: 'admin' } },
  { id: uid('u', 2), name: 'Operador Exemplo', email: 'operador@exemplo.com', isActive: true, mustChangePassword: false, mfaEnabled: false, lastLoginAt: new Date(Date.now() - 86_400_000).toISOString(), lockedUntil: null, role: { id: roles[1].id, name: 'equipe' } },
  { id: uid('u', 3), name: 'Financeiro Exemplo', email: 'financeiro@exemplo.com', isActive: true, mustChangePassword: true, mfaEnabled: false, lastLoginAt: null, lockedUntil: null, role: { id: roles[1].id, name: 'equipe' } },
]

// ---------- Frota ----------
const types: Row[] = [
  ['Tesoura elétrica 8 m', 'SCISSOR', 'ELECTRIC', '8.00', 230, 'Áreas internas, piso nivelado', 280],
  ['Tesoura diesel 12 m', 'SCISSOR', 'DIESEL', '12.00', 450, 'Obras externas, terreno irregular', 420],
  ['Articulada 16 m', 'ARTICULATED', 'DIESEL', '16.00', 230, 'Alcance sobre obstáculos', 650],
  ['Telescópica 20 m', 'TELESCOPIC', 'DIESEL', '20.30', 230, 'Grandes alturas e alcance horizontal', 890],
  ['Mastro vertical 6 m', 'MAST', 'ELECTRIC', '6.00', 136, 'Manutenção predial e lojas', 180],
].map(([name, category, powerSource, workingHeightM, capacityKg, usage, daily], i) => ({
  id: uid('t', i + 1), name, category, powerSource, workingHeightM, capacityKg, usage,
  dailyPrice: money(daily as number), weeklyPrice: money((daily as number) * 6), monthlyPrice: money((daily as number) * 22),
}))

const machines: Row[] = [
  [0, 'Genie', 'GS-1930', 2021], [0, 'JLG', '1930ES', 2022], [0, 'Skyjack', 'SJ3219', 2020],
  [1, 'Genie', 'GS-4069 RT', 2019], [1, 'Haulotte', 'H12 SX', 2021],
  [2, 'JLG', '450AJ', 2020], [2, 'Genie', 'Z-45/25J', 2022],
  [3, 'Genie', 'S-65', 2018], [3, 'JLG', '660SJ', 2021],
  [4, 'Genie', 'GR-20', 2023], [4, 'JLG', '1230ES', 2022], [0, 'Haulotte', 'Compact 8', 2019],
].map(([t, manufacturer, model, year], i) => ({
  id: uid('m', i + 1), code: `PLT-${pad(i + 1).padStart(3, '0')}`, typeId: types[t as number].id,
  manufacturer, model, year, serialNumber: `SN-DEMO-${1000 + i}`, assetTag: `PAT-${200 + i}`,
  hourMeter: 400 + i * 137, blocked: i === 11, blockedReason: i === 11 ? 'Aguardando vistoria anual' : null,
  showOnWebsite: i % 3 !== 0, photos: [],
}))

// ---------- Clientes (todos fictícios) ----------
const clients: Row[] = [
  ['COMPANY', 'Construtora Exemplo Ltda', 'Construtora Exemplo', 'Carlos M.'],
  ['COMPANY', 'Engenharia Modelo S.A.', 'Modelo Engenharia', 'Ana P.'],
  ['COMPANY', 'Montagens Industriais Demo Ltda', 'Demo Montagens', 'Bruno R.'],
  ['COMPANY', 'Shopping Fictício Ltda', 'Shopping Fictício', 'Fernanda L.'],
  ['COMPANY', 'Pinturas Teste Ltda', 'Pinturas Teste', 'Diego S.'],
  ['INDIVIDUAL', 'João da Silva (exemplo)', null, null],
  ['COMPANY', 'Eventos Amostra Ltda', 'Amostra Eventos', 'Juliana T.'],
  ['INDIVIDUAL', 'Maria Souza (exemplo)', null, null],
].map(([type, name, tradeName, contactName], i) => ({
  id: uid('c', i + 1), type, name, tradeName, contactName,
  document: type === 'COMPANY' ? '00000000000000' : '00000000000',
  contactDocument: null, phone: PHONE, whatsapp: PHONE, email: `contato${i + 1}@exemplo.com`,
  zipCode: '00000000', street: 'Rua Exemplo', number: '0', district: 'Centro', city: CITY, state: UF,
  notes: 'Cadastro fictício para demonstração.',
}))

// ---------- Contratos ----------
const contractSeeds: [number, string, number, number, number[]][] = [
  // cliente, status, início, fim (dias a partir de hoje), máquinas
  [0, 'ACTIVE', -12, 6, [0, 3]],
  [1, 'ACTIVE', -5, 10, [5]],
  [2, 'ACTIVE', -20, -2, [7]], // devolução atrasada
  [3, 'ACTIVE', 2, 9, [1, 9]],
  [4, 'ACTIVE', -3, 1, [6]],
  [6, 'ACTIVE', 4, 7, [8]],
  [5, 'DRAFT', 10, 14, [2]],
  [0, 'FINISHED', -40, -25, [0, 4]],
  [1, 'FINISHED', -70, -45, [5, 7]],
  [7, 'CANCELLED', -15, -10, [10]],
  [3, 'FINISHED', -100, -80, [3, 8]],
  [2, 'FINISHED', -130, -110, [6]],
]
const contracts: Row[] = contractSeeds.map(([c, status, s, e, ms], i) => {
  const startDate = day(s)
  const endDate = day(e)
  const items = ms.map((m, j) => {
    const machine = machines[m]
    const type = types.find((t) => t.id === machine.typeId)!
    const days = daysBetween(startDate, endDate)
    const rate = Number(type.dailyPrice)
    return {
      id: uid('i', i * 10 + j + 1), machineId: machine.id, startDate, endDate, days, dailyRate: money(rate),
      amount: money(rate * days), reserved: status === 'ACTIVE',
      machine: { id: machine.id, code: machine.code, type: { name: type.name } },
    }
  })
  return {
    id: uid('k', i + 1), number: 1001 + i, status, startDate, endDate, clientId: clients[c].id,
    siteName: 'Obra exemplo', siteZipCode: '00000000', siteStreet: 'Avenida Exemplo', siteNumber: String(100 + i),
    siteDistrict: 'Distrito Industrial', siteCity: CITY, siteState: UF,
    paymentMethod: i % 2 ? 'BOLETO' : 'PIX', installments: i % 3 === 0 ? 2 : 1,
    totalAmount: money(items.reduce((sum, it) => sum + Number(it.amount), 0)),
    notes: null, signatureStatus: status === 'DRAFT' ? 'PENDING' : 'DIGITAL', items,
  }
})

// ---------- Manutenções ----------
const maintenances: Row[] = [
  [2, 'CORRECTIVE', 'OPEN', -1, 'Troca do cilindro hidráulico de elevação', true, 'Oficina Exemplo', [['Cilindro hidráulico', 1, 2400], ['Mão de obra', 6, 120]]],
  [4, 'PREVENTIVE', 'DONE', -18, 'Revisão das 500 horas', false, 'Oficina Exemplo', [['Kit filtros', 1, 380], ['Óleo hidráulico (L)', 20, 28]]],
  [7, 'PREVENTIVE', 'DONE', -35, 'Inspeção anual de segurança', false, 'Inspeções Demo', [['Laudo técnico', 1, 650]]],
  [10, 'CORRECTIVE', 'DONE', -8, 'Reparo no carregador de baterias', false, 'Elétrica Teste', [['Placa do carregador', 1, 890]]],
].map(([m, kind, status, d, description, blocksMachine, supplier, lines], i) => {
  const items = (lines as [string, number, number][]).map(([desc, q, p]) => ({ description: desc, quantity: money(q), unitPrice: money(p), amount: money(q * p) }))
  const machine = machines[m as number]
  return {
    id: uid('n', i + 1), machineId: machine.id, kind, status, date: day(d as number), hourMeter: machine.hourMeter,
    description, blocksMachine, supplier, paymentMethod: 'BOLETO', dueDate: day((d as number) + 20), paid: status === 'DONE' && i !== 1,
    sendToFinance: true, totalAmount: money(items.reduce((s, it) => s + Number(it.amount), 0)), items,
    machine: { id: machine.id, code: machine.code }, _count: { items: items.length },
  }
})

// ---------- Financiamento ----------
const financingMachine = machines[7]
const FIN_INSTALLMENT = 4200
const finFirst = new Date(now.getFullYear(), now.getMonth() - 14, 10)
const financingDue = (n: number) => iso(new Date(finFirst.getFullYear(), finFirst.getMonth() + n, 10))

// ---------- Lançamentos financeiros ----------
const entries: Row[] = []
let entrySeq = 1
const contractRef = (k: Row) => {
  const client = clients.find((c) => c.id === k.clientId)!
  return { id: k.id, number: k.number, client: { id: client.id, name: client.name, tradeName: client.tradeName } }
}
for (const k of contracts.filter((c) => c.status !== 'DRAFT' && c.status !== 'CANCELLED')) {
  const total = Number(k.totalAmount)
  for (let n = 1; n <= k.installments; n++) {
    const dueDate = iso(new Date(Date.parse(`${k.endDate}T12:00:00`) + (n - 1) * 30 * 86_400_000))
    const paid = k.status === 'FINISHED' || (dueDate < TODAY && k.number % 2 === 0)
    entries.push({
      id: uid('e', entrySeq++), kind: 'RECEIVABLE', description: `Contrato nº ${k.number}`, supplier: null, dueDate,
      amount: money(total / k.installments), paymentMethod: k.paymentMethod, paidAt: paid ? dueDate : null,
      installmentNumber: k.installments > 1 ? n : null, installmentCount: k.installments > 1 ? k.installments : null,
      manual: false, contract: contractRef(k), maintenance: null, financing: null,
    })
  }
}
for (const m of maintenances) {
  entries.push({
    id: uid('e', entrySeq++), kind: 'PAYABLE', description: m.description, supplier: m.supplier, dueDate: m.dueDate,
    amount: m.totalAmount, paymentMethod: 'BOLETO', paidAt: m.paid ? m.dueDate : null, installmentNumber: null,
    installmentCount: null, manual: false, contract: null, maintenance: { id: m.id, machine: { code: m.machine.code } }, financing: null,
  })
}
for (let n = 1; n <= 36; n++) {
  const dueDate = financingDue(n - 1)
  if (dueDate > day(120)) break
  entries.push({
    id: uid('f', n), kind: 'PAYABLE', description: `Financiamento ${financingMachine.code}`, supplier: 'Banco Exemplo', dueDate,
    amount: money(FIN_INSTALLMENT), paymentMethod: 'BOLETO', paidAt: dueDate < TODAY ? dueDate : null,
    installmentNumber: n, installmentCount: 36, manual: false, contract: null, maintenance: null,
    financing: { id: uid('g', 1), machine: { id: financingMachine.id, code: financingMachine.code } },
  })
}
;[['Aluguel do galpão', 'Imobiliária Exemplo', 3500, 5], ['Seguro da frota', 'Seguradora Demo', 1890, 12], ['Energia elétrica', 'Concessionária Exemplo', 640, -3]].forEach(([description, supplier, amount, d]) => {
  entries.push({
    id: uid('e', entrySeq++), kind: 'PAYABLE', description, supplier, dueDate: day(d as number), amount: money(amount as number),
    paymentMethod: 'BOLETO', paidAt: null, installmentNumber: null, installmentCount: null, manual: true,
    contract: null, maintenance: null, financing: null,
  })
})

// ---------- Regras de leitura ----------
const typeOf = (id: string) => types.find((t) => t.id === id)!
const clientOf = (id: string) => clients.find((c) => c.id === id)!
const activeItemsFor = (machineId: string) =>
  contracts
    .filter((k) => k.status === 'ACTIVE')
    .flatMap((k) => k.items.filter((it: Row) => it.machineId === machineId).map((it: Row) => ({ k, it })))
    .sort((a, b) => a.it.startDate.localeCompare(b.it.startDate))
const openBlockingMaint = (machineId: string) =>
  maintenances.filter((m) => m.machineId === machineId && m.status === 'OPEN' && m.blocksMachine)

function fleetStatus(machine: Row) {
  if (machine.blocked) return 'BLOCKED'
  if (openBlockingMaint(machine.id).length) return 'MAINTENANCE'
  const next = activeItemsFor(machine.id)[0]
  if (!next) return 'AVAILABLE'
  return next.it.startDate <= TODAY ? 'RENTED' : 'RESERVED'
}

function machineListItem(machine: Row) {
  const type = typeOf(machine.typeId)
  return {
    ...machine, coverPhotoId: null,
    type: { id: type.id, name: type.name, category: type.category, powerSource: type.powerSource, workingHeightM: type.workingHeightM, dailyPrice: type.dailyPrice },
    contractItems: activeItemsFor(machine.id).map(({ k, it }) => {
      const client = clientOf(k.clientId)
      return { startDate: it.startDate, endDate: it.endDate, contract: { id: k.id, number: k.number, client: { name: client.name, tradeName: client.tradeName } } }
    }),
    maintenances: openBlockingMaint(machine.id).map((m) => ({ id: m.id, description: m.description })),
  }
}

function movement(k: Row, it: Row) {
  const client = clientOf(k.clientId)
  return {
    id: it.id, startDate: it.startDate, endDate: it.endDate, machine: { id: it.machine.id, code: it.machine.code },
    contract: { id: k.id, number: k.number },
    client: { id: client.id, name: client.name, tradeName: client.tradeName, contactName: client.contactName, phone: client.phone },
    site: { name: k.siteName, street: k.siteStreet, number: k.siteNumber, district: k.siteDistrict, city: k.siteCity },
  }
}

function agenda(from: string, to: string) {
  const reserved = contracts.filter((k) => k.status === 'ACTIVE').flatMap((k) => k.items.map((it: Row) => ({ k, it })))
  const inRange = (d: string) => d >= from && d < to
  return {
    today: TODAY,
    items: reserved.filter(({ it }) => inRange(it.startDate) || inRange(it.endDate)).map(({ k, it }) => movement(k, it)),
    overdue: reserved.filter(({ it }) => it.endDate < TODAY).map(({ k, it }) => movement(k, it)),
  }
}

function financeList(p: URLSearchParams) {
  const kind = p.get('kind') ?? 'RECEIVABLE'
  const filter = p.get('filter') ?? 'all'
  const origin = p.get('origin') ?? 'all'
  const month = p.get('month') ?? monthOf(TODAY)
  const inMonth = (e: Row) => monthOf(e.dueDate) === month
  const byFilter: Record<string, (e: Row) => boolean> = {
    all: inMonth,
    open: (e) => inMonth(e) && !e.paidAt,
    overdue: (e) => !e.paidAt && e.dueDate < TODAY,
    paid: (e) => inMonth(e) && !!e.paidAt,
  }
  const byOrigin: Record<string, (e: Row) => boolean> = {
    all: () => true, contract: (e) => !!e.contract, financing: (e) => !!e.financing,
    maintenance: (e) => !!e.maintenance, manual: (e) => e.manual,
  }
  const matches = entries.filter((e) => (byFilter[filter] ?? inMonth)(e) && (byOrigin[origin] ?? byOrigin.all)(e))
  const sum = (fn: (e: Row) => boolean) => entries.filter(fn).reduce((s, e) => s + Number(e.amount), 0)
  return {
    today: TODAY,
    totals: {
      receivable: sum((e) => e.kind === 'RECEIVABLE' && inMonth(e)),
      received: sum((e) => e.kind === 'RECEIVABLE' && inMonth(e) && !!e.paidAt),
      overdue: sum((e) => e.kind === 'RECEIVABLE' && !e.paidAt && e.dueDate < TODAY),
      payable: sum((e) => e.kind === 'PAYABLE' && inMonth(e)),
      financing: sum((e) => !!e.financing && inMonth(e)),
      financingOverdue: entries.filter((e) => !!e.financing && !e.paidAt && e.dueDate < TODAY).length,
    },
    counts: { RECEIVABLE: matches.filter((e) => e.kind === 'RECEIVABLE').length, PAYABLE: matches.filter((e) => e.kind === 'PAYABLE').length },
    items: matches.filter((e) => e.kind === kind).sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
  }
}

function lastMonths(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1)
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
  })
}

function dashboardFinancial() {
  const month = monthOf(TODAY)
  const open = (kind: string) =>
    entries
      .filter((e) => e.kind === kind && !e.paidAt && e.dueDate >= day(-30) && e.dueDate <= day(30))
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 6)
      .map((e) => ({
        id: e.id, who: e.contract ? (e.contract.client.tradeName ?? e.contract.client.name) : (e.supplier ?? '—'),
        description: e.description, dueDate: e.dueDate, amount: Number(e.amount),
      }))
  const months = lastMonths(6)
  const revenueBase = [0.62, 0.71, 0.8, 0.76, 0.9, 1]
  const topClients = clients.slice(0, 5).map((c, i) => ({ clientId: c.id, name: c.tradeName ?? c.name, amount: 18_000 - i * 2_900 }))
  const receivable = entries.filter((e) => e.kind === 'RECEIVABLE' && monthOf(e.dueDate) === month)
  return {
    today: TODAY,
    totals: {
      receivable: receivable.reduce((s, e) => s + Number(e.amount), 0),
      received: receivable.filter((e) => e.paidAt).reduce((s, e) => s + Number(e.amount), 0),
      overdue: entries.filter((e) => e.kind === 'RECEIVABLE' && !e.paidAt && e.dueDate < TODAY).reduce((s, e) => s + Number(e.amount), 0),
      overdueCount: entries.filter((e) => e.kind === 'RECEIVABLE' && !e.paidAt && e.dueDate < TODAY).length,
    },
    receivables: open('RECEIVABLE'),
    payables: open('PAYABLE'),
    revenue: {
      types: types.map((t) => ({ id: t.id, name: t.name })),
      months: months.map((m, i) => ({ month: m, values: types.map((t, j) => Math.round(Number(t.dailyPrice) * (14 - j * 2) * revenueBase[i])) })),
    },
    topClients: { month: topClients.slice(0, 4), sixMonths: topClients.map((c) => ({ ...c, amount: c.amount * 5 })) },
  }
}

function dashboardRentals() {
  const d = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const ranking = machines
    .map((m, i) => {
      const days = Math.max(0, d - 3 - ((i * 5) % 19))
      return { machineId: m.id, code: m.code, days, occupancy: Math.round((days / d) * 100) }
    })
    .sort((a, b) => b.days - a.days)
    .slice(0, 6)
  return {
    month: monthOf(TODAY), daysInMonth: d,
    activeContracts: contracts.filter((k) => k.status === 'ACTIVE' && k.startDate <= TODAY).length,
    startingSoon: contracts.filter((k) => k.status === 'ACTIVE' && k.startDate > TODAY).length,
    ranking,
  }
}

function financingInfo() {
  const all = Array.from({ length: 36 }, (_, i) => ({ n: i + 1, dueDate: financingDue(i) }))
  const paid = all.filter((p) => p.dueDate < TODAY)
  const remaining = all.length - paid.length
  return {
    lender: 'Banco Exemplo', installmentAmount: money(FIN_INSTALLMENT), installmentCount: 36,
    firstDueDate: all[0].dueDate, lastDueDate: all[35].dueDate, paidBefore: 0, payoffAmount: null,
    paidCount: paid.length, paidAmount: paid.length * FIN_INSTALLMENT, remainingCount: remaining, remainingAmount: remaining * FIN_INSTALLMENT,
    upcoming: all.filter((p) => p.dueDate >= TODAY).slice(0, 4).map((p) => ({ id: uid('f', p.n), installmentNumber: p.n, dueDate: p.dueDate, amount: money(FIN_INSTALLMENT) })),
  }
}

function machineResult(machine: Row) {
  const type = typeOf(machine.typeId)
  const daily = Number(type.dailyPrice)
  const financed = machine.id === financingMachine.id
  const months = lastMonths(6).map((m, i) => {
    const [y, mo] = m.split('-').map(Number)
    const daysInMonth = new Date(y, mo, 0).getDate()
    const days = [18, 22, 15, 25, 20, 12][i]
    const revenue = days * daily
    const installment = financed ? FIN_INSTALLMENT : 0
    const maintenance = i === 3 ? 650 : 0
    return { month: m, days, daysInMonth, revenue, installment, maintenance, net: revenue - installment - maintenance }
  })
  return { dailyPrice: daily, installmentAmount: financed ? FIN_INSTALLMENT : null, breakEvenDays: financed ? Math.ceil(FIN_INSTALLMENT / daily) : null, months }
}

// ---------- Roteador ----------
const json = (data: unknown, status = 200) =>
  new Response(status === 204 ? null : JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
const notFound = () => json({ statusCode: 404, message: 'Registro não encontrado' }, 404)
const contains = (value: unknown, q: string) => String(value ?? '').toLowerCase().includes(q)

function handleGet(path: string, p: URLSearchParams): Response {
  const q = (p.get('q') ?? '').trim().toLowerCase()
  let m: RegExpMatchArray | null

  if (path === '/auth/me') {
    let logged = false
    try { logged = sessionStorage.getItem(SESSION_KEY) === '1' } catch { /* sem storage */ }
    return logged ? json({ user: demoUser }) : json({ statusCode: 401, message: 'Sessão inválida ou expirada' }, 401)
  }
  if (path === '/clients') {
    const items = clients.filter((c) => !q || contains(c.name, q) || contains(c.tradeName, q) || contains(c.city, q))
    return json({ total: items.length, page: Number(p.get('page') ?? 1), pageSize: 20, items })
  }
  if ((m = path.match(/^\/clients\/([^/]+)$/))) return clients.find((c) => c.id === m![1]) ? json(clientOf(m[1])) : notFound()
  if (path === '/machine-types') return json(types.map((t) => ({ ...t, _count: { machines: machines.filter((x) => x.typeId === t.id).length } })))
  if (path === '/machines') {
    const typeId = p.get('typeId')
    const items = machines
      .filter((x) => (!typeId || x.typeId === typeId) && (!q || contains(x.code, q) || contains(x.model, q) || contains(x.manufacturer, q)))
      .map(machineListItem)
    return json({ total: items.length, items })
  }
  if (path === '/machines/next-code') return json({ code: `PLT-${String(machines.length + 1).padStart(3, '0')}` })
  if ((m = path.match(/^\/machines\/([^/]+)\/financing$/))) return json(m[1] === financingMachine.id ? financingInfo() : null)
  if ((m = path.match(/^\/machines\/([^/]+)\/result$/))) {
    const machine = machines.find((x) => x.id === m![1])
    return machine ? json(machineResult(machine)) : notFound()
  }
  if ((m = path.match(/^\/machines\/([^/]+)$/))) {
    const machine = machines.find((x) => x.id === m![1])
    return machine ? json({ ...machineListItem(machine), photos: [] }) : notFound()
  }
  if (path === '/contracts/availability') return json({ conflicts: [] })
  if (path === '/contracts') {
    const status = p.get('status')
    const items = contracts
      .filter((k) => (!status || k.status === status) && (!q || contains(k.number, q) || contains(clientOf(k.clientId).name, q) || contains(clientOf(k.clientId).tradeName, q)))
      .sort((a, b) => b.number - a.number)
      .map((k) => ({ ...k, client: clientOf(k.clientId) }))
    return json({ total: items.length, items })
  }
  if ((m = path.match(/^\/contracts\/([^/]+)$/))) {
    const k = contracts.find((x) => x.id === m![1])
    return k ? json({ ...k, client: clientOf(k.clientId) }) : notFound()
  }
  if (path === '/maintenances') {
    const status = p.get('status')
    return json({ items: maintenances.filter((x) => !status || x.status === status).sort((a, b) => b.date.localeCompare(a.date)) })
  }
  if ((m = path.match(/^\/maintenances\/([^/]+)$/))) {
    const x = maintenances.find((y) => y.id === m![1])
    return x ? json(x) : notFound()
  }
  if (path === '/finance/entries') return json(financeList(p))
  if (path === '/users') return json(users)
  if (path === '/users/roles') return json(roles)
  if (path === '/agenda') return json(agenda(p.get('from') ?? TODAY, p.get('to') ?? day(30)))
  if (path === '/agenda/maintenances') {
    const from = p.get('from') ?? TODAY
    const to = p.get('to') ?? day(30)
    return json(
      maintenances
        .filter((x) => (x.date >= from && x.date < to) || x.status === 'OPEN')
        .map(({ id, date, status, description, blocksMachine, machine }) => ({ id, date, status, description, blocksMachine, machine })),
    )
  }
  if (path === '/dashboard/fleet') {
    const counts: Record<string, number> = { AVAILABLE: 0, RENTED: 0, RESERVED: 0, MAINTENANCE: 0, BLOCKED: 0 }
    for (const x of machines) counts[fleetStatus(x)] += 1
    return json({ total: machines.length, counts })
  }
  if (path === '/dashboard/rentals') return json(dashboardRentals())
  if (path === '/dashboard/financial') return json(dashboardFinancial())
  return notFound()
}

function handle(path: string, method: string, p: URLSearchParams): Response {
  if (method === 'GET') return handleGet(path, p)

  // Entrar e sair funcionam; o resto é somente leitura
  if (path === '/auth/login' && method === 'POST') {
    try { sessionStorage.setItem(SESSION_KEY, '1') } catch { /* sem storage */ }
    return json({ user: demoUser })
  }
  if (path === '/auth/logout' && method === 'POST') {
    try { sessionStorage.removeItem(SESSION_KEY) } catch { /* sem storage */ }
    return json(null, 204)
  }

  window.dispatchEvent(new CustomEvent(DEMO_EVENT))
  return json({ statusCode: 403, message: 'Modo demonstração: alterações estão desativadas nesta versão.' }, 403)
}

export function installDemoApi() {
  const original = window.fetch.bind(window)
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const url = new URL(raw, location.href)
    if (url.origin !== location.origin || !url.pathname.startsWith('/api/')) return original(input, init)

    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()
    const path = url.pathname.slice(4)
    // Pequeno atraso para parecer uma chamada de rede
    return new Promise((resolve) => setTimeout(() => resolve(handle(path, method, url.searchParams)), 150))
  }
}
