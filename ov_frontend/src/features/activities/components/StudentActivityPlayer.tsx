import { NodeRenderer } from './NodeRenderer'
import { useActivityPlayer } from '../hooks/useActivityPlayer'
import type { InstrumentoServidor } from './MaraInteractionPlayer'
import type { RegistroServidor } from '../hooks/useRegistroServidor'
import type { Actividad } from '@/types/activities'
import { PlayerAmbient } from './PlayerAmbient'
import { PlayerTopBar } from './PlayerTopBar'
export function StudentActivityPlayer({
  activity,
  imageUrl,
  direct = false,
  edit = false,
  instrumentoServidor,
  registroServidor,
  onClose,
  salida,
  desdeInicio = false,
}: {
  activity: Actividad
  imageUrl?: string
  direct?: boolean
  edit?: boolean
  instrumentoServidor?: InstrumentoServidor
  registroServidor?: RegistroServidor
  onClose: () => void
  // Ajuste del diario (F05): la salida del cierre cuando no es «Volver al mapa» (los recuerdos de Lumi).
  salida?: {
    texto: string
    titulo?: string
    aviso?: { titulo: string; descripcion: string }
    onClick: () => void
  }
  desdeInicio?: boolean
}) {
  const model = useActivityPlayer({
    activity,
    direct,
    edit,
    instrumentoServidor,
    registroServidor,
    onClose,
    desdeInicio,
  })
  const {
    pageRef,
    mode,
    nodes,
    index,
    progress,
    node,
    reaction,
    enviando,
    storageError,
    guardando,
    errorServidor,
    respuestaPendiente,
    itemResponse,
    soloLectura,
    advance,
    move,
    confirmacion,
  } = model

  return (
    <div
      ref={pageRef}
      className={`fixed inset-0 z-40 sx-root sx-player location-${activity.id}`}
      data-ambient={mode}
    >
      <PlayerAmbient mode={mode} imageUrl={imageUrl} />
      <PlayerTopBar
        activity={activity}
        finished={!node && !reaction}
        index={index}
        total={nodes.length}
        progress={progress}
        nuevoMomento={node?.nuevoMomento}
        salida={salida?.aviso && { ...salida.aviso, accion: salida.texto }}
        onClose={() => {
          if (!enviando.current) onClose()
        }}
      />
      {storageError && (
        <p className="sx-player-error" role="alert">
          {storageError}
        </p>
      )}
      {/* Ajuste de F03: guardar una respuesta del test se indica en la opción elegida, no con este aviso. */}
      {guardando && !respuestaPendiente.current && (
        <p className="sx-player-error" role="status">
          Guardando la actividad en el servidor…
        </p>
      )}
      {errorServidor && (
        <div className="sx-player-error" role="alert">
          <p>{errorServidor}</p>
          <button
            type="button"
            className="sx-primary-button"
            disabled={guardando}
            onClick={() =>
              respuestaPendiente.current
                ? itemResponse(respuestaPendiente.current.valor)
                : soloLectura && node?.tipo === 'item'
                  ? advance()
                  : move(undefined)
            }
          >
            {soloLectura && node?.tipo === 'item'
              ? 'Continuar la revisión'
              : `Reintentar${confirmacion.current || respuestaPendiente.current?.confirmada ? ' consulta' : ''}`}
          </button>
        </div>
      )}
      <main className="sx-player-stage">
        <NodeRenderer model={model} activity={activity} edit={edit} direct={direct} salida={salida} />
      </main>
    </div>
  )
}
