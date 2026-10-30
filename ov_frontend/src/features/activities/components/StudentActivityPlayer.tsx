import { LoaderCircle } from 'lucide-react'
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
      {/* Guardar una respuesta del test se indica en «Continuar»; guardar la actividad, con un cargador al centro. */}
      {guardando && !respuestaPendiente.current && (
        <div className="sx-player-cargando" role="status">
          <LoaderCircle className="size-8 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          <span className="sr-only">Guardando la actividad en el servidor…</span>
        </div>
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
