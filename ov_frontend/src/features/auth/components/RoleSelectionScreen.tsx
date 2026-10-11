import { useEffect } from 'react'
import { Compass, LogOut, Sparkles } from 'lucide-react'
import { roleOptions } from '../data/roleOptions'
import { RoleOptionCard } from './RoleOptionCard'
import type { PlatformRole } from '../types'

type RoleSelectionScreenProps = { onSelectRole: (role: PlatformRole) => void; onSignOut?: () => void }

function RoleSelectionScreen({ onSelectRole, onSignOut }: RoleSelectionScreenProps) {
  useEffect(() => {
    const previous = document.title
    document.title = 'Elige un perfil | Orientación vocacional'
    return () => {
      document.title = previous
    }
  }, [])
  return (
    <main className="relative min-h-svh overflow-hidden bg-background px-5 pb-12 pt-24 sm:px-8 lg:py-16">
      <div className="pointer-events-none absolute -left-24 -top-24 size-80 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-16 size-96 rounded-full bg-[var(--case-coral)]/10 blur-3xl" />
      {onSignOut && (
        <button className="ov-access-sign-out" type="button" onClick={onSignOut}>
          <LogOut size={16} aria-hidden="true" /> Cerrar sesión
        </button>
      )}
      <div className="relative mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-6 flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <Compass className="size-7" />
          </div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="size-3.5" /> Plataforma de orientación vocacional
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            ¿Qué perfil quieres ver?
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
            Cada perfil tiene un espacio diseñado para acompañar el proceso vocacional desde su propio rol.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {roleOptions.map((option) => (
            <RoleOptionCard key={option.id} onSelect={() => onSelectRole(option.id)} option={option} />
          ))}
        </div>
        <p className="mt-8 text-center text-xs text-muted-foreground">
          Selecciona un perfil para acceder a su experiencia de demostración.
        </p>
      </div>
    </main>
  )
}

export { RoleSelectionScreen }
