import { useEffect, useRef, useState } from 'react'
import { DEMO_EVENT } from './demo-api'

const CONTATO = 'https://paulohenrique-dev.vercel.app/#contato'

export function DemoModal() {
  const [open, setOpen] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const show = () => setOpen(true)
    // Qualquer formulário (exceto o login) abre o aviso antes de validar ou enviar
    const onSubmit = (e: Event) => {
      if (location.pathname === '/login') return
      e.preventDefault()
      e.stopImmediatePropagation()
      show()
    }
    window.addEventListener(DEMO_EVENT, show)
    document.addEventListener('submit', onSubmit, true)
    return () => {
      window.removeEventListener(DEMO_EVENT, show)
      document.removeEventListener('submit', onSubmit, true)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <div className="pointer-events-none fixed bottom-3 left-3 hidden sm:block z-40 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground shadow-lg">
        Demonstração · dados fictícios
      </div>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="demo-titulo"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-card p-7 text-card-foreground shadow-2xl"
          >
            <p className="text-xs font-semibold tracking-widest text-primary uppercase">Versão de demonstração</p>
            <h2 id="demo-titulo" className="mt-2 text-xl font-bold">
              Alterações desativadas
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Esta é uma demonstração com dados fictícios: você pode navegar por todas as telas, mas salvar, editar e excluir
              estão bloqueados.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Gostou? Fale com <strong className="text-foreground">Paulo Henrique</strong>, desenvolvedor deste sistema, para
              criar um sob medida para o seu negócio!
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <a
                href={CONTATO}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-ring"
              >
                Falar com o desenvolvedor
              </a>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-input px-4 py-2.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-ring"
              >
                Continuar navegando
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
