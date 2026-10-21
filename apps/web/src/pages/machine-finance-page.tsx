import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { LoaderCircle } from 'lucide-react'
import { financingSchema } from '@locacao/shared'
import { useAuth } from '@/auth/auth-context'
import { MachineTabs } from '@/components/machine-tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { brand } from '@/config/brand'
import { ApiError, apiFetch } from '@/lib/api'

interface Machine {
  id: string
  code: string
  type: { name: string }
}

interface Financing {
  lender: string
  installmentAmount: string
  installmentCount: number
  firstDueDate: string
  lastDueDate: string
  paidBefore: number
  payoffAmount: string | null
  paidCount: number
  paidAmount: number
  remainingCount: number
  remainingAmount: number
  upcoming: { id: string; installmentNumber: number; dueDate: string; amount: string }[]
}

interface MonthResult {
  month: string
  days: number
  daysInMonth: number
  revenue: number
  installment: number
  maintenance: number
  net: number
}

interface Result {
  dailyPrice: number
  installmentAmount: number | null
  breakEvenDays: number | null
  months: MonthResult[]
}

type Range = 'month' | '6m' | 'all'

const RANGES: { id: Range; label: string }[] = [
  { id: 'month', label: 'Este mês' },
  { id: '6m', label: '6 meses' },
  { id: 'all', label: 'Desde o início' },
]

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const brDate = (iso: string) => iso.split('-').reverse().join('/')
const localToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
const shortMonth = (month: string) =>
  new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' }).format(new Date(`${month}-01T00:00:00Z`)).replace('.', '')
const monthYear = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`)).replace('.', '')
const toInput = (value: string | number | null) => (value === null || value === '' ? '' : Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 }))
const signed = (n: number) => `${n < 0 ? '−' : '+'} ${money.format(Math.abs(n))}`

const emptyForm = { lender: '', installmentAmount: '', installmentCount: '', firstDueDate: '', paidBefore: '0', payoffAmount: '' }

function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-semibold">
      <span>
        {label} {hint && <span className="font-normal text-muted-foreground">{hint}</span>}
      </span>
      {children}
      {error && <span className="text-xs font-normal text-destructive">{error}</span>}
    </label>
  )
}

export function MachineFinancePage() {
  const { id = '' } = useParams()
  const { user } = useAuth()
  const canEdit = user?.permissions.includes('financeiro:editar') ?? false

  const [machine, setMachine] = useState<Machine | null>(null)
  const [financing, setFinancing] = useState<Financing | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [enabled, setEnabled] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null)
  const [range, setRange] = useState<Range>('month')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const path = `/machines/${encodeURIComponent(id)}`
    const [m, f, r] = await Promise.all([
      apiFetch<Machine>(path),
      apiFetch<Financing | null>(`${path}/financing`),
      apiFetch<Result>(`${path}/result`),
    ])
    setMachine(m)
    setFinancing(f)
    setResult(r)
    setEnabled(Boolean(f))
    setForm(
      f
        ? {
            lender: f.lender,
            installmentAmount: toInput(f.installmentAmount),
            installmentCount: String(f.installmentCount),
            firstDueDate: f.firstDueDate,
            paidBefore: String(f.paidBefore),
            payoffAmount: toInput(f.payoffAmount),
          }
        : emptyForm,
    )
  }, [id])

  useEffect(() => {
    load()
      .catch((err: unknown) => setMessage({ kind: 'error', text: err instanceof ApiError ? err.message : 'Não foi possível carregar.' }))
      .finally(() => setLoading(false))
  }, [load])

  useEffect(() => {
    document.title = `${machine ? `${machine.code} · ` : ''}Financiamento · ${brand.name}`
  }, [machine])

  const summary = useMemo(() => {
    const months = result?.months ?? []
    const slice = range === 'month' ? months.slice(-1) : range === '6m' ? months.slice(-6) : months
    const total = (key: keyof Omit<MonthResult, 'month'>) => slice.reduce((s, m) => s + m[key], 0)
    return {
      revenue: total('revenue'),
      installment: total('installment'),
      maintenance: total('maintenance'),
      net: total('net'),
      days: total('days'),
      daysInPeriod: total('daysInMonth'),
    }
  }, [result, range])

  const last6 = (result?.months ?? []).slice(-6)
  const maxDays = Math.max(...last6.map((m) => m.daysInMonth), 1)
  const today = localToday()
  const rangeText = range === 'month' ? 'este mês' : range === '6m' ? 'nos últimos 6 meses' : 'desde o início'

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || !canEdit) return
    const parsed = financingSchema.safeParse(form)
    if (!parsed.success) {
      const next: Record<string, string> = {}
      for (const issue of parsed.error.issues) next[String(issue.path[0])] ??= issue.message
      setErrors(next)
      setMessage({ kind: 'error', text: 'Confira os campos destacados.' })
      return
    }
    setErrors({})
    setBusy(true)
    setMessage(null)
    try {
      await apiFetch(`/machines/${encodeURIComponent(id)}/financing`, { method: 'PUT', body: JSON.stringify(parsed.data) })
      await load()
      setMessage({ kind: 'success', text: 'Financiamento salvo. As parcelas em aberto estão em Financeiro → A pagar.' })
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) {
        setErrors(Object.fromEntries(Object.entries(err.fieldErrors).map(([k, v]) => [k, v[0] ?? ''])))
      }
      setMessage({ kind: 'error', text: err instanceof ApiError ? err.message : 'Não foi possível salvar.' })
    } finally {
      setBusy(false)
    }
  }

  async function handleRemove() {
    if (!window.confirm('Remover o financiamento? As parcelas em aberto saem do A pagar; as já pagas ficam no histórico.')) return
    setBusy(true)
    try {
      await apiFetch(`/machines/${encodeURIComponent(id)}/financing`, { method: 'DELETE' })
      await load()
      setMessage({ kind: 'success', text: 'Financiamento removido.' })
    } catch (err) {
      setMessage({ kind: 'error', text: err instanceof ApiError ? err.message : 'Não foi possível remover.' })
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
        <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> Carregando…
      </div>
    )
  }

  const pays = summary.net >= 0
  const progress = financing ? Math.round((financing.paidCount / financing.installmentCount) * 100) : 0
  const input = (key: keyof typeof emptyForm) => ({
    value: form[key],
    onChange: (e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value }),
    'aria-invalid': Boolean(errors[key]),
    className: 'h-11 font-normal',
  })

  return (
    <section className="flex flex-col gap-5">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link to="/maquinas" className="underline-offset-4 hover:underline">
            Frota
          </Link>{' '}
          › {machine?.code}
        </p>
        <h1 className="mt-1 text-2xl font-bold">
          Máquina {machine?.code} <span className="text-base font-normal text-muted-foreground">{machine?.type.name}</span>
        </h1>
        <MachineTabs id={id} />
      </div>

      {message && (
        <p
          role={message.kind === 'error' ? 'alert' : 'status'}
          className={`rounded-lg border px-4 py-3 text-sm ${
            message.kind === 'error' ? 'border-destructive/40 bg-destructive/10 text-destructive' : 'border-success/40 bg-success/10 text-success'
          }`}
        >
          {message.text}
        </p>
      )}

      <section aria-labelledby="pays" className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="pays" className="text-lg font-bold">
            Ela se paga?
          </h2>
          {result && result.months.length > 0 && (
            <span className={`rounded-full px-3 py-1 text-sm font-bold ${pays ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'}`}>
              {pays ? 'Sim' : 'Não'} · {pays ? 'sobrou' : 'faltou'} {money.format(Math.abs(summary.net))} {rangeText}
            </span>
          )}
          <div role="group" aria-label="Período" className="ml-auto flex overflow-hidden rounded-lg border border-input text-sm">
            {RANGES.map((r) => (
              <button
                key={r.id}
                type="button"
                aria-pressed={range === r.id}
                onClick={() => setRange(r.id)}
                className={`min-h-10 px-3 ${range === r.id ? 'bg-foreground text-background' : 'bg-card'}`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-lg bg-info/10 p-3.5">
            <p className="text-sm text-muted-foreground">Faturou com aluguel</p>
            <p className="mt-1 text-xl font-bold">{signed(summary.revenue)}</p>
            <p className="text-xs text-muted-foreground">
              {summary.days} diárias de {summary.daysInPeriod}
            </p>
          </div>
          <div className="rounded-lg bg-warning/10 p-3.5">
            <p className="text-sm text-muted-foreground">Parcela do financiamento</p>
            <p className="mt-1 text-xl font-bold">{signed(-summary.installment)}</p>
          </div>
          <div className="rounded-lg bg-warning/10 p-3.5">
            <p className="text-sm text-muted-foreground">Manutenção</p>
            <p className="mt-1 text-xl font-bold">{signed(-summary.maintenance)}</p>
          </div>
          <div className={`rounded-lg p-3.5 ${pays ? 'bg-success/15' : 'bg-destructive/10'}`}>
            <p className={`text-sm ${pays ? 'text-success' : 'text-destructive'}`}>{pays ? 'Sobrou' : 'Faltou'}</p>
            <p className={`mt-1 text-xl font-bold ${pays ? 'text-success' : 'text-destructive'}`}>{signed(summary.net)}</p>
            <p className="text-xs text-muted-foreground">aluguel − parcela − manutenção</p>
          </div>
        </div>
        {result?.breakEvenDays && (
          <p className="text-sm text-muted-foreground">
            Para cobrir só a parcela, esta máquina precisa de <strong className="text-foreground">{result.breakEvenDays} diárias por mês</strong> (diária
            de {money.format(result.dailyPrice)}).
          </p>
        )}
      </section>

      <div className="flex flex-wrap items-start gap-5">
        <form noValidate onSubmit={handleSave} className="flex min-w-0 flex-[1_1_22rem] flex-col gap-4 rounded-xl border border-border bg-card p-5">
          <h2 className="text-base font-bold">Dados do financiamento</h2>
          <fieldset disabled={!canEdit || busy} className="flex flex-col gap-4">
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="size-5" />
              Esta máquina é financiada
            </label>
            {enabled && (
              <>
                <Field label="Banco ou financeira" error={errors.lender}>
                  <Input maxLength={200} {...input('lender')} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Valor da parcela" error={errors.installmentAmount}>
                    <Input inputMode="decimal" placeholder="0,00" {...input('installmentAmount')} />
                  </Field>
                  <Field label="Nº de parcelas" error={errors.installmentCount}>
                    <Input inputMode="numeric" {...input('installmentCount')} />
                  </Field>
                  <Field label="1ª parcela" error={errors.firstDueDate}>
                    <Input type="date" {...input('firstDueDate')} />
                  </Field>
                  <Field label="Já pagas" hint="(antes do sistema)" error={errors.paidBefore}>
                    <Input inputMode="numeric" {...input('paidBefore')} />
                  </Field>
                </div>
                <Field label="Saldo para quitação" hint="(do extrato do banco, opcional)" error={errors.payoffAmount}>
                  <Input inputMode="decimal" placeholder="0,00" {...input('payoffAmount')} />
                </Field>
              </>
            )}
          </fieldset>
          {canEdit && enabled && (
            <Button type="submit" disabled={busy} className="min-h-11 font-bold">
              {busy && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
              Salvar e gerar parcelas em A pagar
            </Button>
          )}
          {canEdit && !enabled && financing && (
            <Button type="button" variant="outline" disabled={busy} onClick={handleRemove} className="min-h-11 text-destructive">
              Remover financiamento
            </Button>
          )}
        </form>

        <div className="flex min-w-0 flex-[1.3_1_28rem] flex-col gap-4">
          {financing && (
            <section className="rounded-xl border border-border bg-card p-5">
              <div className="flex justify-between text-sm">
                <strong>
                  {financing.paidCount} de {financing.installmentCount} parcelas pagas
                </strong>
                <span className="text-muted-foreground">termina em {monthYear(financing.lastDueDate)}</span>
              </div>
              <div
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Parcelas pagas"
                className="mt-2.5 h-3 overflow-hidden rounded-full bg-muted"
              >
                <div className="h-full rounded-full bg-[#2a78d6]" style={{ width: `${progress}%` }} />
              </div>
              <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-muted-foreground">Já pago</dt>
                  <dd className="text-lg font-bold">{money.format(financing.paidAmount)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Falta pagar ({financing.remainingCount})</dt>
                  <dd className="text-lg font-bold text-warning">{money.format(financing.remainingAmount)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Quitação pelo banco</dt>
                  <dd className="text-lg font-bold">{financing.payoffAmount ? money.format(Number(financing.payoffAmount)) : '—'}</dd>
                </div>
              </dl>
              <p className="mt-3 text-xs text-muted-foreground">
                "Falta pagar" soma as parcelas restantes (com juros). A quitação é o valor que o banco informa para pagar tudo hoje.
              </p>
            </section>
          )}

          {last6.length > 0 && (
            <section className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-base font-bold">Quanto sobrou nos últimos meses</h2>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-120 text-sm">
                  <thead className="text-left text-xs text-muted-foreground">
                    <tr>
                      <th scope="col" className="py-1.5 pr-2">Mês</th>
                      <th scope="col" className="py-1.5 pr-2">Dias alugados</th>
                      <th scope="col" className="py-1.5 pr-2 text-right">Faturou</th>
                      <th scope="col" className="py-1.5 pr-2 text-right">Gastou</th>
                      <th scope="col" className="py-1.5 text-right">Sobrou</th>
                    </tr>
                  </thead>
                  <tbody>
                    {last6.map((m) => (
                      <tr key={m.month} className="border-t border-border">
                        <th scope="row" className="py-2 pr-2 text-left font-normal text-muted-foreground capitalize">
                          {shortMonth(m.month)}
                        </th>
                        <td className="py-2 pr-2">
                          <div className="flex items-center gap-2" title={`${m.days} de ${m.daysInMonth} dias`}>
                            <span className="h-2.5 rounded-r bg-[#2a78d6]" style={{ width: `${(m.days / maxDays) * 100}%`, minWidth: m.days ? 4 : 0 }} />
                            <span className="text-xs text-muted-foreground tabular-nums">{m.days}</span>
                          </div>
                        </td>
                        <td className="py-2 pr-2 text-right tabular-nums">{money.format(m.revenue)}</td>
                        <td className="py-2 pr-2 text-right tabular-nums">{money.format(m.installment + m.maintenance)}</td>
                        <td className={`py-2 text-right font-bold tabular-nums ${m.net < 0 ? 'text-destructive' : 'text-success'}`}>{signed(m.net)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Gastou = parcela do financiamento + manutenções do mês.</p>
            </section>
          )}

          {financing && financing.upcoming.length > 0 && (
            <section className="overflow-x-auto rounded-xl border border-border bg-card">
              <table className="w-full min-w-110 text-sm">
                <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-3">Parcela</th>
                    <th scope="col" className="px-4 py-3">Vencimento</th>
                    <th scope="col" className="px-4 py-3">Situação</th>
                    <th scope="col" className="px-4 py-3 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {financing.upcoming.map((p) => (
                    <tr key={p.id} className="border-t border-border">
                      <td className="px-4 py-3">
                        {p.installmentNumber} de {financing.installmentCount}
                      </td>
                      <td className="px-4 py-3">{brDate(p.dueDate)}</td>
                      <td className="px-4 py-3">
                        {p.dueDate < today ? <span className="font-semibold text-destructive">Vencida</span> : 'Em aberto'}
                      </td>
                      <td className="px-4 py-3 text-right">{money.format(Number(p.amount))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
                A baixa das parcelas é feita em{' '}
                <Link to="/financeiro" className="underline underline-offset-4">
                  Financeiro → A pagar
                </Link>
                .
              </p>
            </section>
          )}
        </div>
      </div>
    </section>
  )
}