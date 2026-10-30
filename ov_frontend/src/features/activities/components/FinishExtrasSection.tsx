import { Fragment } from 'react'
import { CircleHelp, ClipboardList, KeyRound, LayoutGrid, Map, MessageCircle } from 'lucide-react'
import { Link } from 'react-router'
import { appPaths } from '@/routes/paths'
import type { ExtraCierre } from '../lib/finishSummary'

const iconos = {
  SECCIONES: LayoutGrid,
  SECCION_PLAN: ClipboardList,
  BLOQUE: Map,
  // Las opcionales nuevas van como intriga: el «?» de su punto en el mapa, sin nombre (F04b).
  ACTIVIDAD: CircleHelp,
  CONVERSACIONES: MessageCircle,
  pieza: KeyRound,
}
// Vista de cada sección del perfil; el check-in se abre como aviso del panel y no tiene enlace.
const rutasSeccion: Record<string, string> = {
  DIARIO: appPaths.student.journal,
  CATALOGO: appPaths.student.catalog.professions,
  PLANES: appPaths.student.decisions,
  FAMILIA: appPaths.student.conversations,
}
// Las actividades nuevas y las zonas del camino no llevan enlace: «Volver al mapa» ya cumple esa función. La
// sección de planes tampoco: el usuario la quiere como fila informativa. Solo la Ciudad lleva «Ir».
function enlace(e: ExtraCierre) {
  if (e.tipo === 'BLOQUE') return e.codigo === 'CIUDAD' ? appPaths.student.exploration : undefined
  if (e.tipo === 'CONVERSACIONES') return appPaths.student.conversations
  return undefined
}

export function FinishExtrasSection({ extras }: { extras: ExtraCierre[] }) {
  return (
    <section className="sx-finish-extras" aria-labelledby="finish-extras-title">
      <h3 id="finish-extras-title">Se abrió para ti</h3>
      <ul className="sx-finish-opened">
        {extras.map((e) => {
          const Icon = iconos[e.tipo]
          const ruta = enlace(e)
          return (
            <li key={`${e.tipo}:${e.codigo}`}>
              <Icon size={17} aria-hidden="true" />
              <span>
                {e.secciones
                  ? e.secciones.map((s, i) => (
                      <Fragment key={s.codigo}>
                        {i > 0 && (i === e.secciones!.length - 1 ? ' y ' : ', ')}
                        {rutasSeccion[s.codigo] ? <Link to={rutasSeccion[s.codigo]}>{s.nombre}</Link> : s.nombre}
                      </Fragment>
                    ))
                  : e.texto}
              </span>
              {ruta && (
                <Link className="sx-finish-go" to={ruta} aria-label={`Ir: ${e.texto}`}>
                  Ir
                </Link>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
