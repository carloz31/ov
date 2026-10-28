import { Link } from 'react-router'
import { ArrowLeft, Pencil } from 'lucide-react'
import { PantallaCarga } from '@/components/student/PantallaCarga'
import { SeccionBloqueada } from '@/components/student/SeccionBloqueada'
import { mensajeBloqueo, NUMERO_SECCION, TITULOS_SECCION } from '@/lib/servidor/adaptadoresPlanes'
import { appPaths } from '@/routes/paths'
import { usePlanAbierto } from '../hooks/usePlanAbierto'
import type { AvisoPlan as Aviso } from '../hooks/useAccionesPlanes'
import { AvisoPlan } from './AvisoPlan'
import { MenuSeccionesPlan } from './MenuSeccionesPlan'
import { PildoraEstado } from './PildoraEstado'
import { SeccionConocimiento } from './SeccionConocimiento'
import { SeccionPorQue } from './SeccionPorQue'
import '../styles/planes.css'

// F07a (F07b-pantallas §4): un plan abierto. A la izquierda, el menú de secciones; a la derecha, solo la sección
// elegida, en lectura («Editar») o en edición («Cancelar» / «Guardar sección»). REALIDAD y PASOS llegan en F07b.
export function PlanAbierto({
  carrera,
  seccion: seccionUrl,
  avisoInicial,
}: {
  carrera: string
  seccion: string | null
  avisoInicial?: Omit<Aviso, 'id'>
}) {
  const v = usePlanAbierto(carrera, seccionUrl, avisoInicial)
  if (!v.datos || !v.plan || !v.estadoSeccion)
    return (
      <PantallaCarga
        estado={v.estado === 'error' ? 'error' : 'cargando'}
        titulo="Abriendo tu plan"
        frase="Lumi está buscando tu tarjeta…"
        mensaje={v.mensajeError}
        onReintentar={v.reintentar}
        enSeccion
      />
    )
  const { plan, estadoSeccion: s, edicion } = v
  const opciones = v.datos.opciones
  const editable = s.estado !== 'BLOQUEADA' && (s.codigo === 'POR_QUE' || s.codigo === 'CONOCIMIENTO')
  const editando = edicion.editando === s.codigo
  const titulo = TITULOS_SECCION[s.codigo]
  return (
    <>
      <nav className="sx-p-migas">
        <Link to={appPaths.student.decisions}>
          <ArrowLeft aria-hidden="true" size={16} /> Mis planes
        </Link>
      </nav>
      <div className="sx-p-plan">
        <MenuSeccionesPlan plan={plan} opciones={opciones} seccion={v.seccion} onElegir={v.elegir} />
        {s.estado === 'BLOQUEADA' ? (
          <SeccionBloqueada titulo={`${NUMERO_SECCION[s.codigo]} · ${titulo}`} mensaje={mensajeBloqueo(s)} />
        ) : (
          <section className="sx-p-panel" data-editando={editando} aria-labelledby="sx-p-panel-titulo">
            <header>
              <span className="sx-p-numero">{NUMERO_SECCION[s.codigo]}</span>
              <h2 id="sx-p-panel-titulo">{titulo}</h2>
              <PildoraEstado estado={s.estado} />
              {editable &&
                (editando ? (
                  <span className="sx-p-editando">Editando</span>
                ) : (
                  <button
                    type="button"
                    className="sx-d-action sx-d-action-ghost"
                    onClick={() => edicion.editar(s.codigo)}
                  >
                    <Pencil aria-hidden="true" size={16} /> Editar
                  </button>
                ))}
            </header>
            {s.codigo === 'POR_QUE' && (
              <SeccionPorQue
                plan={plan}
                opciones={opciones}
                encaje={v.encaje}
                borrador={editando ? edicion.porQue : null}
                onCambiar={edicion.cambiarPorQue}
                onEditar={() => edicion.editar('POR_QUE')}
              />
            )}
            {s.codigo === 'CONOCIMIENTO' && (
              <SeccionConocimiento
                plan={plan}
                opciones={opciones}
                borrador={editando ? edicion.conocimiento : null}
                onCambiar={edicion.cambiarConocimiento}
              />
            )}
            {!editable && <p className="sx-p-ayuda">Esta sección llega en el siguiente lote.</p>}
            {editando && (
              <div className="sx-d-actions sx-p-acciones">
                <button
                  type="button"
                  className="sx-d-action sx-d-action-ghost"
                  disabled={edicion.guardando}
                  onClick={edicion.cancelar}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="sx-d-action"
                  aria-busy={edicion.guardando}
                  disabled={edicion.guardando}
                  onClick={() => void edicion.guardar()}
                >
                  {edicion.guardando ? 'Guardando…' : 'Guardar sección'}
                </button>
              </div>
            )}
          </section>
        )}
      </div>
      <AvisoPlan aviso={v.aviso} onDismiss={v.cerrarAviso} />
    </>
  )
}
