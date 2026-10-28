import { TrailBar } from '@/components/student/TrailBar'
import {
  fechaCorta,
  NUMERO_SECCION,
  resumenSeccion,
  seccionesListas,
  TITULOS_SECCION,
} from '@/lib/servidor/adaptadoresPlanes'
import type { CodigoSeccionPlan, OpcionesTarjeta, PlanCarrera } from '@/types/servidor'
import { PildoraEstado } from './PildoraEstado'

// F07a (F07b-pantallas §4): el menú del plan abierto. Cabecera del plan y una entrada por sección con su título,
// su píldora y una línea de resumen; las bloqueadas también se pueden elegir (muestran su bloqueo).
export function MenuSeccionesPlan({
  plan,
  opciones,
  seccion,
  onElegir,
}: {
  plan: PlanCarrera
  opciones: OpcionesTarjeta
  seccion: CodigoSeccionPlan
  onElegir: (codigo: CodigoSeccionPlan) => void
}) {
  const listas = seccionesListas(plan)
  return (
    <nav className="sx-p-menu" aria-label="Secciones del plan">
      <div className="sx-p-menu-cabecera">
        <span className="sx-d-plan-letter" data-position={'ABC'.indexOf(plan.prioridad)}>
          {plan.prioridad}
        </span>
        <div>
          <small>
            Plan {plan.prioridad} · {plan.institucion?.nombre ?? 'Aún sin institución'}
          </small>
          <strong>{plan.carrera.nombre}</strong>
        </div>
      </div>
      <p className="sx-p-cambio">Último cambio: {fechaCorta(plan.actualizada_en)}</p>
      <ul>
        {plan.secciones.map((s) => (
          <li key={s.codigo}>
            <button
              type="button"
              className="sx-p-menu-entrada"
              aria-current={s.codigo === seccion ? 'true' : undefined}
              onClick={() => onElegir(s.codigo)}
            >
              <span className="sx-p-menu-titulo">
                <strong>
                  {NUMERO_SECCION[s.codigo]} · {TITULOS_SECCION[s.codigo]}
                </strong>
                <PildoraEstado estado={s.estado} />
              </span>
              <small>{resumenSeccion(plan, s, opciones)}</small>
            </button>
          </li>
        ))}
      </ul>
      <TrailBar label={`${listas} de 4 secciones listas`} value={(listas / 4) * 100} text="" />
    </nav>
  )
}
