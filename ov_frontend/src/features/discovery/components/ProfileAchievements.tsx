import { Link } from 'react-router'
import { ArrowRight } from 'lucide-react'
import { appPaths } from '@/routes/paths'
import { Parchment } from '@/components/student/Parchment'
import { achievementIcons } from '../lib/passport'
import type { CondicionesPasaporte, PassportBadge } from '@/types/profile'

// Ajuste pasaporte-perfil: capítulo I, la tira de sellos y el siguiente título en resumen.
export function ProfileAchievements({
  sellos,
  obtenidas,
  siguiente,
}: {
  sellos: PassportBadge[]
  obtenidas: number
  siguiente?: { titulo: string; condiciones: CondicionesPasaporte | null }
}) {
  const sobran = sellos.length > 5 ? sellos.length - 4 : 0
  const puntos = siguiente?.condiciones?.bloques[siguiente.condiciones.mejor] ?? []
  const falta = puntos.find((c) => !c.cumplida)
  return (
    <Parchment label="Capítulo I" title="Lo que he logrado" className="sx-d-chapter">
      <div className="sx-d-row">
        <strong>Sellos del pasaporte</strong>
        <strong>
          {obtenidas} de {sellos.length}
        </strong>
      </div>
      <div className="sx-d-stamp-strip">
        {sellos.slice(0, sobran ? 4 : 5).map((b) => {
          const Icon = achievementIcons[b.icon] ?? achievementIcons.sparkles
          return (
            <span key={b.code} className="sx-d-stamp" data-earned={b.done}>
              {b.done && <Icon aria-hidden="true" size={20} />}
              <span className="sr-only">{b.done ? b.title : 'Sello por descubrir'}</span>
            </span>
          )
        })}
        {sobran > 0 && <span className="sx-d-stamp sx-d-stamp-more">+{sobran}</span>}
      </div>
      <div className="sx-d-next-title">
        <p className="sx-d-eyebrow">Siguiente título</p>
        {siguiente ? (
          <>
            <strong>{siguiente.titulo}</strong>
            {puntos.length > 0 && (
              <div className="sx-d-next-progress">
                <span className="sx-d-next-dots" aria-hidden="true">
                  {puntos.map((c, i) => (
                    <span key={i} data-done={c.cumplida} />
                  ))}
                </span>
                <span>
                  {siguiente.condiciones?.cumplidas} de {siguiente.condiciones?.total} condiciones
                  {falta && ` · te falta ${falta.texto.charAt(0).toLocaleLowerCase()}${falta.texto.slice(1)}`}
                </span>
              </div>
            )}
          </>
        ) : (
          <strong>Llegaste al último título del viaje</strong>
        )}
      </div>
      <Link className="sx-d-action" to={appPaths.student.passport}>
        Abrir mi pasaporte
        <ArrowRight aria-hidden="true" size={16} />
      </Link>
    </Parchment>
  )
}
