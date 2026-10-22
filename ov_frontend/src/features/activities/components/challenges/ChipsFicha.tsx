import { BookOpen, LockKeyhole } from 'lucide-react'
import { abrirRecurso } from '@/store/visorRecursoStore'

export type ChipFicha = { codigo: string; titulo: string; bloqueada?: boolean }

// F04d: fichas de la batalla como chips (libro y título) que abren el visor encima, en modo repaso; una
// bloqueada lleva candado y abre su pop up de requisito. Con varias, saltan de línea.
export function ChipsFicha({ etiqueta, fichas }: { etiqueta: string; fichas: ChipFicha[] }) {
  if (!fichas.length) return null
  return (
    <div className="sx-ficha-chips">
      <span>{etiqueta}</span>
      <ul>
        {fichas.map((f) => (
          <li key={f.codigo}>
            <button type="button" className="sx-ficha-chip" onClick={() => abrirRecurso(f.codigo, 'repaso')}>
              {f.bloqueada ? (
                <LockKeyhole size={15} aria-label="Bloqueada" />
              ) : (
                <BookOpen size={15} aria-hidden="true" />
              )}
              {f.titulo}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
