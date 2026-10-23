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
}: {
  activity: Actividad
  onClose?: () => void
  yaCompletada?: boolean
  desbloqueosServidor?: DesbloqueoNuevo[]
  entradasDiario?: EntradaDesbloqueada[]
}) {
  const { resumen, escribirDiario, preguntaDiario } = useActivityFinish(
    activity,
    desbloqueosServidor,
    yaCompletada,
    entradasDiario,
  )
  const mochila = resumen.modo === 'recursos'
  // Con mochila, la tarjeta tiene dos columnas; «Se abrió para ti» va a la derecha si la mochila es corta.
  const novedades = mochila || resumen.modo === 'soloExtras'
  const abierto = novedades && resumen.extras.length > 0 && <FinishExtrasSection extras={resumen.extras} />
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
          {resumen.diario.visible && preguntaDiario && (
            <FinishJournalSection
              pregunta={preguntaDiario.texto}
              nueva={resumen.diario.nueva}
              onWrite={escribirDiario}
              titulo={preguntaDiario.titulo}
            />
          )}
        </div>
        {mochila && (
          <div className="sx-finish-side">
            <FinishBackpackSection resumen={resumen} />
            {resumen.abiertoAlLado && abierto}
          </div>
        )}
        <footer className="sx-finish-footer">
          <VolverAlMapa actividad={activity.id} onClose={onClose} />
        </footer>
      </section>
    </div>
  )
}
