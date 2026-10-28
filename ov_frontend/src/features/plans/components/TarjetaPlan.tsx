import { Link } from 'react-router'
import { ArrowDown, ArrowUp, Check, Lock, Trash2 } from 'lucide-react'
import { TrailBar } from '@/components/student/TrailBar'
import { textoGestion } from '@/lib/servidor/adaptadoresCatalogo'
import {
  fechaCorta,
  inicioRelato,
  mensajeBloqueo,
  seccionesListas,
  seccionSiguiente,
  textoBotonPlan,
  textoMotivo,
  TITULOS_SECCION,
} from '@/lib/servidor/adaptadoresPlanes'
import { appPaths } from '@/routes/paths'
import type { OpcionesTarjeta, PlanCarrera } from '@/types/servidor'
import { PildoraEstado } from './PildoraEstado'

// F07a (F07b-pantallas §2): el frente de un plan del servidor en Mis planes, sobre el marcado de la tarjeta local.
export function TarjetaPlan({
  plan,
  indice,
  total,
  primerInteres,
  opciones,
  ocupado,
  onEliminar,
  onMover,
}: {
  plan: PlanCarrera
  indice: number
  total: number
  primerInteres: boolean
  opciones: OpcionesTarjeta
  ocupado: boolean
  onEliminar: () => void
  onMover: (direccion: -1 | 1) => void
}) {
  const letra = plan.prioridad,
    listas = seccionesListas(plan),
    gestion = plan.institucion && textoGestion(plan.institucion.gestion),
    motivo = plan.motivos[0] && textoMotivo(plan.motivos[0], opciones),
    relato = inicioRelato(plan.relato, 90)
  return (
    <article className="sx-d-plan-card" data-position={indice} data-complete={plan.lista_para_comparar}>
      <div className="sx-d-parchment">
        <div className="sx-d-row">
          <span className="sx-d-plan-letter" data-position={indice}>
            {letra}
          </span>
          <strong>Plan {letra}</strong>
          <button type="button" className="sx-d-icon" aria-label={`Eliminar plan ${letra}`} onClick={onEliminar}>
            <Trash2 aria-hidden="true" />
          </button>
        </div>
        <h2>{plan.carrera.nombre}</h2>
        <p>
          {plan.institucion
            ? [plan.institucion.nombre, gestion].filter(Boolean).join(' · ')
            : 'Aún sin institución elegida'}
        </p>
        {(primerInteres || plan.lista_para_comparar) && (
          <div className="sx-d-tags">
            {primerInteres && <span className="sx-d-tag">Tu primer interés</span>}
            {plan.lista_para_comparar && <span className="sx-d-tag">Lista para comparar</span>}
          </div>
        )}
        <div className="sx-d-quote">
          <strong>Por qué la elijo</strong>
          {motivo && <p className="sx-p-motivo">{motivo}</p>}
          <p className="sx-d-clamp">
            <em>{relato ? `«${relato}»` : motivo ? '' : 'Todavía no cuentas por qué la eliges.'}</em>
          </p>
        </div>
        <ul className="sx-d-plan-sections">
          {plan.secciones.map((s) => (
            <li key={s.codigo} data-done={s.estado === 'LISTA'} data-estado={s.estado}>
              <span aria-hidden="true">
                {s.estado === 'LISTA' && <Check size={18} />}
                {s.estado === 'BLOQUEADA' && <Lock size={14} />}
              </span>
              <div className="sx-p-seccion-texto">
                {TITULOS_SECCION[s.codigo]}
                {s.estado === 'BLOQUEADA' && <small>{mensajeBloqueo(s)}</small>}
              </div>
              <PildoraEstado estado={s.estado} />
            </li>
          ))}
        </ul>
        <TrailBar label={`${listas} de 4 secciones listas`} value={(listas / 4) * 100} />
        <p className="sx-p-cambio">Último cambio: {fechaCorta(plan.actualizada_en)}</p>
        <Link
          className="sx-d-action sx-d-full"
          to={appPaths.student.plan(plan.carrera.codigo, seccionSiguiente(plan))}
        >
          {textoBotonPlan(plan)}
        </Link>
        <div className="sx-d-actions sx-d-priority">
          {indice > 0 && (
            <button type="button" aria-label="Subir prioridad" disabled={ocupado} onClick={() => onMover(-1)}>
              <ArrowUp aria-hidden="true" />
              Subir prioridad
            </button>
          )}
          {indice < total - 1 && (
            <button type="button" aria-label="Bajar prioridad" disabled={ocupado} onClick={() => onMover(1)}>
              <ArrowDown aria-hidden="true" />
              Bajar prioridad
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
