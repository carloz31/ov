import { Fragment } from 'react'
import { Check } from 'lucide-react'
import type { CondicionesPasaporte } from '@/types/profile'

// Ajuste pasaporte-perfil: las condiciones de una insignia o de un título. Con varias reglas, cada una es un
// bloque y «o bien» los separa; las de conteo llevan una barra con «actual de requerido».
export function ConditionList({ condiciones }: { condiciones: CondicionesPasaporte }) {
  return (
    <div className="sx-p-conditions">
      {condiciones.bloques.map((bloque, i) => (
        <Fragment key={i}>
          {i > 0 && <p className="sx-p-conditions-or">o bien</p>}
          <ul>
            {bloque.map((c, j) => (
              <li key={j} data-done={c.cumplida}>
                <span className="sx-p-condition-mark" aria-hidden="true">
                  {c.cumplida && <Check size={14} />}
                </span>
                <div>
                  <span>
                    {c.texto}
                    <span className="sr-only">{c.cumplida ? ' (cumplida)' : ' (pendiente)'}</span>
                  </span>
                  {c.requerido !== undefined && (
                    <div className="sx-p-condition-bar">
                      <span>
                        <span style={{ width: `${((c.actual ?? 0) / c.requerido) * 100}%` }} />
                      </span>
                      <small>
                        {c.actual ?? 0} de {c.requerido}
                      </small>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Fragment>
      ))}
    </div>
  )
}
