import { Link } from 'react-router'
import { Lightbulb, Sparkles } from 'lucide-react'
import { discoveryPaths } from '@/routes/discoveryPaths'
import { Parchment } from '@/components/student/Parchment'
import { Seal } from '@/components/student/Seal'
import type { HelenaPage } from '@/types/profile'

type Pagina = HelenaPage & { llegadaPendiente: boolean }

// Ajuste pasaporte-perfil: capítulo II, la página lista para romper destacada y el resto con su avance.
export function ProfileHelena({ destacada, pages }: { destacada?: Pagina; pages: Pagina[] }) {
  return (
    <Parchment label="Capítulo II" title="Lo que Helena descubre de mí" className="sx-d-highlight sx-d-chapter">
      {destacada && (
        <div className="sx-d-helena-ready">
          <Seal state="ready" icono={<Lightbulb />} />
          <div>
            <p className="sx-d-eyebrow">Helena terminó de leer</p>
            <strong>{destacada.title}</strong>
            <Link to={discoveryPaths.helena}>Romper el sello →</Link>
          </div>
        </div>
      )}
      {pages.map((p) => (
        <div className="sx-d-row sx-d-helena-page" key={p.id}>
          <Seal state={p.state}>{p.result?.areas.map((a) => a.code).join('') ?? <Sparkles />}</Seal>
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
            ) : (
              <p className="sx-d-muted">
                {p.state === 'ready'
                  ? 'Lista para revelar'
                  : p.llegadaPendiente
                    ? 'Descifrada · la llegada se escribe al final'
                    : 'Descifrada'}
              </p>
            )}
          </div>
        </div>
      ))}
      <Link className="sx-d-action sx-d-action-gold" to={discoveryPaths.helena}>
        Abrir el libro de Helena
      </Link>
    </Parchment>
  )
}
