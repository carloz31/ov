import { Link } from 'react-router'
import { Brain, Compass, Flag, Lightbulb, LockKeyhole, Sparkles, Users, type LucideIcon } from 'lucide-react'
import { discoveryPaths } from '@/routes/discoveryPaths'
import { Parchment } from '@/components/student/Parchment'
import { Seal } from '@/components/student/Seal'
import type { HelenaPage } from '@/types/profile'
import { TEXTO_ROMPER_SELLO } from '../lib/resultPage'
import type { HallazgoPagina, IconoPagina } from '../types'
import { PageFinding } from './PageFinding'

type Pagina = HelenaPage & { icono: IconoPagina; hallazgo: HallazgoPagina | null }

const ICONOS: Record<IconoPagina, LucideIcon> = { Flag, Compass, Brain, Users, Sparkles }

// Ajuste perfil-capitulos: capítulo II, las páginas en el orden del libro; cada una con su sello y su avance,
// el enlace para romper el sello o su hallazgo.
export function ProfileHelena({
  pages,
  bloqueo,
  onBloqueado,
}: {
  pages: Pagina[]
  // Ajuste libro-helena-regreso: con el libro cerrado, el enlace lleva candado y Lumi explica qué falta.
  bloqueo?: string
  onBloqueado?: () => void
}) {
  return (
    <Parchment label="Capítulo II" title="Lo que Helena descubre de mí" className="sx-d-highlight sx-d-chapter">
      {pages.map((p) => {
        const Icono = ICONOS[p.icono]
        return (
          <div className="sx-d-row sx-d-helena-page" key={p.id}>
            <Seal state={p.state} icono={<Lightbulb />}>
              <Icono />
            </Seal>
            <div>
              <strong>{p.title}</strong>
              {p.state === 'sealed' ? (
                <div className="sx-d-mini-bar">
                  <span>
                    <span style={{ width: `${p.missions.total ? (p.missions.done / p.missions.total) * 100 : 0}%` }} />
                  </span>
                  <small>
                    {p.missions.done} de {p.missions.total} misiones
                  </small>
                </div>
              ) : p.state === 'ready' ? (
                <Link className="sx-d-finding-reveal" to={discoveryPaths.helena}>
                  {TEXTO_ROMPER_SELLO}
                </Link>
              ) : (
                p.hallazgo && <PageFinding hallazgo={p.hallazgo} />
              )}
            </div>
          </div>
        )
      })}
      <Link
        className="sx-d-action sx-d-action-gold"
        to={discoveryPaths.helena}
        title={bloqueo}
        onClick={
          onBloqueado
            ? (event) => {
                event.preventDefault()
                onBloqueado()
              }
            : undefined
        }
      >
        Abrir el libro de Helena
        {bloqueo && (
          <>
            <small className="sr-only">{bloqueo}</small>
            <LockKeyhole className="sx-quick-lock" size={12} aria-hidden="true" />
          </>
        )}
      </Link>
    </Parchment>
  )
}
