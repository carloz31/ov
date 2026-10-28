import { Link } from 'react-router'
import { Check, Contrast, Lock, Trash2 } from 'lucide-react'
import { textoGestion } from '@/lib/servidor/adaptadoresCatalogo'
import {
  ESTADOS_SECCION,
  fechaCorta,
  NUMERO_SECCION,
  planCompleto,
  seccionSiguiente,
  textoBotonPlan,
  TITULOS_SECCION,
  tooltipSeccion,
} from '@/lib/servidor/adaptadoresPlanes'
import { appPaths } from '@/routes/paths'
import type { PlanCarrera, SeccionPlan } from '@/types/servidor'

// Una sección como casilla independiente (se llenan en cualquier orden): ícono de estado y, en el plan A, título y
// estado en texto. El detalle y el mensaje de bloqueo van en el tooltip.
function CasillaSeccion({ seccion, conTexto }: { seccion: SeccionPlan; conTexto: boolean }) {
  const icono =
    seccion.estado === 'LISTA' ? (
      <Check size={14} />
    ) : seccion.estado === 'EN_PROCESO' ? (
      <Contrast size={16} />
    ) : seccion.estado === 'BLOQUEADA' ? (
      <Lock size={12} />
    ) : (
      NUMERO_SECCION[seccion.codigo]
    )
  return (
    <li className="sx-p-casilla" data-estado={seccion.estado} title={tooltipSeccion(seccion)}>
      <span className="sx-p-casilla-icono" aria-hidden="true">
        {icono}
      </span>
      {conTexto ? (
        <>
          <span className="sx-p-casilla-titulo">{TITULOS_SECCION[seccion.codigo]}</span>
          <small>{ESTADOS_SECCION[seccion.estado]}</small>
        </>
      ) : (
        <span className="sr-only">{tooltipSeccion(seccion)}</span>
      )}
    </li>
  )
}

// F07a · ajuste v4.2: el frente de un plan en Mis planes. El A es la tarjeta principal («tu ruta principal», casillas
// con texto); B y C son compactas, con «Hacer mi plan A». Sin cita del «por qué», sin barra ni orden por flechas.
export function TarjetaPlan({
  plan,
  indice,
  principal,
  primerInteres,
  ocupado,
  onEliminar,
  onHacerA,
}: {
  plan: PlanCarrera
  indice: number
  principal: boolean
  primerInteres: boolean
  ocupado: boolean
  onEliminar: () => void
  onHacerA?: () => void
}) {
  const letra = plan.prioridad,
    gestion = plan.institucion && textoGestion(plan.institucion.gestion),
    completo = planCompleto(plan)
  return (
    <article className="sx-d-plan-card sx-p-tarjeta" data-position={indice} data-principal={principal}>
      <div className="sx-d-parchment">
        <div className="sx-p-tarjeta-cabecera">
          <span className="sx-d-plan-letter" data-position={indice}>
            {letra}
          </span>
          <div>
            {principal && <small className="sx-p-rotulo">Plan A · tu ruta principal</small>}
            <h2>{plan.carrera.nombre}</h2>
            <p>
              {plan.institucion
                ? [plan.institucion.nombre, gestion].filter(Boolean).join(' · ')
                : 'Aún sin institución elegida'}
            </p>
          </div>
          <button type="button" className="sx-d-icon" aria-label={`Eliminar plan ${letra}`} onClick={onEliminar}>
            <Trash2 aria-hidden="true" />
          </button>
        </div>
        {(primerInteres || completo) && (
          <div className="sx-d-tags">
            {primerInteres && <span className="sx-d-tag">Tu primer interés</span>}
            {completo && <span className="sx-p-sello">Plan completo</span>}
          </div>
        )}
        <ul className="sx-p-casillas" aria-label="Secciones del plan">
          {plan.secciones.map((s) => (
            <CasillaSeccion key={s.codigo} seccion={s} conTexto={principal} />
          ))}
        </ul>
        <div className="sx-p-tarjeta-acciones">
          <Link
            className="sx-d-action"
            to={appPaths.student.plan(plan.carrera.codigo, seccionSiguiente(plan))}
          >
            {textoBotonPlan(plan)}
          </Link>
          {!principal && onHacerA && (
            <button type="button" className="sx-d-action sx-d-action-ghost" disabled={ocupado} onClick={onHacerA}>
              Hacer mi plan A
            </button>
          )}
        </div>
        <p className="sx-p-cambio">Último cambio: {fechaCorta(plan.actualizada_en)}</p>
      </div>
    </article>
  )
}
