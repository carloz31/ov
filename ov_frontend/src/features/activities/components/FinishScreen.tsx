import { BookOpen } from 'lucide-react'
import { useActivityFinish } from '../hooks/useActivityFinish'
import type { DesbloqueoNuevo, EntradaDesbloqueada } from '@/types/servidor'
import type { Actividad } from '@/types/activities'
import { LumiMedallion } from '@/components/student/LumiMedallion'
import { FinishBackpackSection } from './FinishBackpackSection'
import { FinishJournalSection } from './FinishJournalSection'
import { FinishExtrasSection } from './FinishExtrasSection'
import { FinishMedalsSection } from './FinishMedalsSection'
import { VolverAlMapa } from './VolverAlMapa'
import '../styles/finish.css'

export function FinishScreen({
  activity,
  onClose,
  yaCompletada = false,
  desbloqueosServidor,
  entradasDiario,
  salida,
}: {
  activity: Actividad
  onClose?: () => void
  yaCompletada?: boolean
  desbloqueosServidor?: DesbloqueoNuevo[]
  entradasDiario?: EntradaDesbloqueada[]
  // Ajuste del diario (F05): un recuerdo de Lumi sale «Volver al diario», sin mochila, carta ni «Se abrió para ti».
  salida?: { texto: string; onClick: () => void }
}) {
  const { resumen, preguntaDiario } = useActivityFinish(
    activity,
    desbloqueosServidor,
    yaCompletada,
    entradasDiario,
  )
  const mochila = !salida && resumen.modo === 'recursos'
  // Con mochila, la tarjeta tiene dos columnas; «Se abrió para ti» va a la derecha si la mochila es corta.
  const novedades = !salida && (mochila || resumen.modo === 'soloExtras')
  // Ajuste del diario (F05): la carta del buzón va como una fila justo debajo de «Se abrió para ti».
  const carta = !salida && resumen.diario.visible && preguntaDiario && (
    <FinishJournalSection pregunta={preguntaDiario.texto} enlace={preguntaDiario.enlace} />
  )
  const abierto = (
    <>
      {novedades && resumen.extras.length > 0 && <FinishExtrasSection extras={resumen.extras} />}
      {carta}
    </>
  )
  return (
    <div className="sx-card-stage">
      <section
        className={`sx-glass sx-player-card sx-finish-card sx-finish-summary case-scrollbar ${mochila ? 'has-backpack' : ''} ${resumen.totalRecursos >= 5 ? 'is-compact' : ''} ${resumen.modo === 'reintento' ? 'is-retry' : ''}`}
      >
        <div className="sx-finish-main">
          <div className="sx-finish-intro">
            <div className="sx-finish-avatar">
              <LumiMedallion celebration />
              <small>Lumi</small>
            </div>
            <h2>{resumen.titulo}</h2>
            <p className="sx-finish-subtitle">{resumen.subtitulo}</p>
            {!activity.recompensa?.mensajeFin?.startsWith('Obtuviste:') &&
              activity.recompensa?.mensajeFin && <p>{activity.recompensa.mensajeFin}</p>}
            {activity.id === 'act-tip-01' && (
              <p className="sx-finish-note">
                Has recorrido 1 de 14 encuentros. Las próximas voces de la aldea estarán disponibles cuando
                orientación las prepare.
              </p>
            )}
          </div>
          {novedades && resumen.medallas.length > 0 && <FinishMedalsSection medallas={resumen.medallas} />}
          {!resumen.abiertoAlLado && abierto}
        </div>
        {mochila && (
          <div className="sx-finish-side">
            <FinishBackpackSection resumen={resumen} />
            {resumen.abiertoAlLado && abierto}
          </div>
        )}
        <footer className="sx-finish-footer">
          {salida ? (
            <button className="sx-primary-button" onClick={salida.onClick}>
              <BookOpen size={18} /> {salida.texto}
            </button>
          ) : (
            <VolverAlMapa actividad={activity.id} onClose={onClose} />
          )}
        </footer>
      </section>
    </div>
  )
}
