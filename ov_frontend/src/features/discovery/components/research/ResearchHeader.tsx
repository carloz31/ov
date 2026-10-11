import { useStudentResearch } from '@/features/discovery/hooks/useStudentResearch'
import { Link } from 'react-router'
import { discoveryPaths } from '@/routes/discoveryPaths'
import { updateDiscovery } from '@/store/discoveryStore'
import { getAllies } from '@/data/content/research'
export function ResearchHeader({ model }: { model: ReturnType<typeof useStudentResearch> }) {
  const { navigate, unlocked, research, legends, setGuide, setAllies } = model
  return (
    <header className="sx-d-header">
      <div>
        <h1>{legends ? 'Salón de Leyendas' : 'Investigaciones'}</h1>
        <p>
          {legends
            ? 'Entrevistas que siguen inspirando nuevos viajes'
            : 'Entrevistas a profesionales hechas por tu salón'}
        </p>
      </div>
      {unlocked && (
        <div className="sx-d-actions">
          {research?.publishedVideoId ? (
            <button
              type="button"
              className="sx-d-action sx-d-action-gold"
              onClick={() => {
                updateDiscovery((s) => ({ ...s, research: undefined }))
                navigate(discoveryPaths.researchGuide)
              }}
            >
              Iniciar otra investigación
            </button>
          ) : research?.guideReadyAt ? (
            <>
              <button type="button" className="sx-d-action sx-d-action-ghost" onClick={() => setAllies(true)}>
                Aliados · {getAllies(research.occupationId).length}
              </button>
              <button type="button" className="sx-d-action sx-d-action-gold" onClick={() => setGuide(true)}>
                Ver mi guion
              </button>
            </>
          ) : (
            <Link className="sx-d-action sx-d-action-gold" to={discoveryPaths.researchGuide}>
              {research ? 'Continuar mi guion' : 'Iniciar investigación'}
            </Link>
          )}
        </div>
      )}
    </header>
  )
}
