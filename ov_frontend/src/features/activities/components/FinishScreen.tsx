import { Map } from 'lucide-react'
import { useActivityFinish } from '../hooks/useActivityFinish'
import type { DesbloqueoNuevo } from '@/types/servidor'
import type { Actividad } from '@/types/activities'
import { LumiMedallion } from '@/components/student/LumiMedallion'
import { FinishBackpackSection } from './FinishBackpackSection'
import { FinishJournalSection } from './FinishJournalSection'
import { FinishExtrasSection } from './FinishExtrasSection'
import '../styles/finish.css'

export function FinishScreen({
  activity,
  onClose,
  yaCompletada = false,
  desbloqueosServidor,
  resultadosGenerados,
}: {
  activity: Actividad
  onClose?: () => void
  yaCompletada?: boolean
  desbloqueosServidor?: DesbloqueoNuevo[]
  resultadosGenerados?: { instrumento: string; aplicacion: string }[]
}) {
  const { resumen, abrirLibro, escribirDiario, volverAlMapa } = useActivityFinish(
    activity,
    desbloqueosServidor,
    yaCompletada,
  )
  const mochila = resumen.modo === 'recursos'
  return (
    <div className="sx-card-stage">
      <section
        className={`sx-glass sx-player-card sx-finish-card sx-finish-summary case-scrollbar ${mochila ? 'has-backpack' : ''} ${resumen.totalRecursos >= 5 ? 'is-compact' : ''} ${resumen.modo === 'reintento' ? 'is-retry' : ''}`}
      >
        <div className="sx-finish-intro">
          <div className="sx-finish-avatar">
            <LumiMedallion celebration />
            <small>Lumi</small>
          </div>
          <h2>{resumen.titulo}</h2>
          <p className="sx-finish-subtitle">{resumen.subtitulo}</p>
          {!activity.recompensa?.mensajeFin?.startsWith('Obtuviste:') && activity.recompensa?.mensajeFin && (
            <p>{activity.recompensa.mensajeFin}</p>
          )}
          {activity.id === 'act-tip-01' && (
            <p className="sx-finish-note">
              Has recorrido 1 de 14 encuentros. Las próximas voces de la aldea estarán disponibles cuando
              orientación las prepare.
            </p>
          )}
          {activity.id === 'act-tip-14' &&
            resultadosGenerados?.some((r) => r.instrumento === 'TEST-RIASEC') && (
              <section className="sx-finish-elena">
                <h3>Elena tiene algo que mostrarte</h3>
                <button className="sx-secondary-button" onClick={abrirLibro}>
                  Abrir el libro de Helena
                </button>
              </section>
            )}
        </div>
        {mochila && <FinishBackpackSection resumen={resumen} />}
        {resumen.diario.visible && activity.promptDiario && (
          <FinishJournalSection
            pregunta={activity.promptDiario}
            nueva={resumen.diario.nueva}
            onWrite={escribirDiario}
          />
        )}
        {(mochila || resumen.modo === 'soloExtras') && resumen.extras.length > 0 && (
          <FinishExtrasSection extras={resumen.extras} tarjetas={!mochila} />
        )}
        <footer className="sx-finish-footer">
          <button
            className="sx-primary-button"
            onClick={() => {
              volverAlMapa()
              onClose?.()
            }}
          >
            <Map size={18} /> Volver al mapa
          </button>
        </footer>
      </section>
    </div>
  )
}
