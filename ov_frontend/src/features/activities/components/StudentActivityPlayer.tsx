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
}: {
  activity: Actividad
  imageUrl?: string
  direct?: boolean
  edit?: boolean
  instrumentoServidor?: InstrumentoServidor
  registroServidor?: RegistroServidor
  onClose: () => void
}) {
  const model = useActivityPlayer({ activity, direct, edit, instrumentoServidor, registroServidor, onClose })
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
        onClose={() => {
          if (!enviando.current) onClose()
        }}
      />
      {storageError && (
        <p className="sx-player-error" role="alert">
          {storageError}
        </p>
      )}
      {guardando && (
        <p className="sx-player-error" role="status">
          {respuestaPendiente.current
            ? 'Guardando la respuesta en el servidor…'
            : 'Guardando la actividad en el servidor…'}
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
        <NodeRenderer model={model} activity={activity} edit={edit} direct={direct} />
      </main>
    </div>
  )
}
