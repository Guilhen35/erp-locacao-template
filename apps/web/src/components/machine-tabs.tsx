import { NavLink } from 'react-router'
import { useAuth } from '@/auth/auth-context'

// Abas da máquina; a de financiamento só aparece para quem vê o financeiro
export function MachineTabs({ id }: { id: string }) {
  const { user } = useAuth()
  if (!user?.permissions.includes('financeiro:ler')) return null

  const tab = ({ isActive }: { isActive: boolean }) =>
    `-mb-px inline-flex min-h-11 items-center border-b-[3px] px-4 text-sm ${
      isActive ? 'border-primary font-bold' : 'border-transparent text-muted-foreground hover:text-foreground'
    }`

  return (
    <nav aria-label="Seções da máquina" className="mt-3 flex gap-1 border-b border-border">
      <NavLink to={`/maquinas/${id}`} end className={tab}>
        Dados e fotos
      </NavLink>
      <NavLink to={`/maquinas/${id}/financeiro`} className={tab}>
        Financiamento e resultado
      </NavLink>
    </nav>
  )
}