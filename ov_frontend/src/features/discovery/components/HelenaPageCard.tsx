import { ChevronRight, LockKeyhole } from 'lucide-react'
import { Link } from 'react-router'
import { Parchment } from '@/components/student/Parchment'
import { Seal } from '@/components/student/Seal'
import { TrailBar } from '@/components/student/TrailBar'
import { appPaths } from '@/routes/paths'
import { discoveryPaths } from '@/routes/discoveryPaths'
import type { useHelenaPages } from '../hooks/useHelenaPages'
import { HelenaPageSummary } from './HelenaPageSummary'
import { HelenaPageContents } from './HelenaPageContents'
import { PartidaLlegadaSummary } from './PartidaLlegadaSummary'
import { ScopeChip } from './ScopeChip'
import { RevealSeal } from './RevealSeal'

type ModeloLibro = ReturnType<typeof useHelenaPages>

export function HelenaPageCard({ page, model }: { page: ModeloLibro['pages'][number]; model: ModeloLibro }) {
  const resultadoHref = discoveryPaths.helenaPage(page.id)
  const intereses = page.tipoResultado === 'COINCIDENCIAS'
  const plano = intereses && page.perfilPlano
  // Ajuste de F03: la llegada lista ocupa la tarjeta igual que el primer revelado.
  const lista = page.state === 'ready' || !!page.selloLlegada
  return (
    <Parchment
      className={`sx-d-helena-card sx-d-helena-${lista ? 'ready' : page.state}${page.state === 'revealed' ? ' sx-d-revealed' : ''}${model.entrando === page.id && !lista ? ' sx-d-helena-entrando' : ''}`}
      label={page.antetitulo}
      title={page.title}
    >
      <div className="sx-d-helena-subtitle">
        <ScopeChip prioritario={page.required} />
        <span>{page.subtitle}</span>
      </div>
      {page.demo && <p className="sx-d-demo">{page.avisoDemo}</p>}
      {page.state === 'sealed' ? (
        <>
          <div className="sx-d-helena-box sx-d-helena-mystery">
            <div className="sx-d-fog" aria-hidden="true">
              <div className="sx-d-fog-bars">
                {[1, 2, 3, 4].map((n) => (
                  <span key={n} />
                ))}
              </div>
              <LockKeyhole />
            </div>
            <p>
              <em>{page.teaser}</em>
            </p>
          </div>
          <TrailBar
            label={`Misiones de Helena · ${page.missions.done} de ${page.missions.total}`}
            value={page.missions.total ? (page.missions.done / page.missions.total) * 100 : 0}
          />
          {page.mostrarRequisito && (
            <div className="sx-d-helena-requirement">
              {model.errorConsulta || model.errorResultado ? (
                <>
                  <p role="alert">{model.errorConsulta || model.errorResultado?.mensaje}</p>
                  <button
                    className="sx-d-action"
                    onClick={() => {
                      model.setErrorConsulta('')
                      model.setIntento((i) => i + 1)
                    }}
                  >
                    Reintentar consulta
                  </button>
                </>
              ) : (
                <p>{page.requisito}</p>
              )}
            </div>
          )}
        </>
      ) : lista ? (
        <>
          <RevealSeal
            {...page.revelado}
            ocupado={!!page.revelacionBloqueada || model.revelando}
            romper={() => model.revelarPagina(page.id)}
          />
          {model.errorAccion && <p role="alert">{model.errorAccion}</p>}
        </>
      ) : (
        <>
          {model.opening === page.id && (
            <div className="sx-d-breaking-seal" aria-hidden="true">
              <Seal state="ready" large />
            </div>
          )}
          {page.partidaLlegada ? (
            <PartidaLlegadaSummary modelo={page.partidaLlegada} />
          ) : (
            <HelenaPageSummary resumen={page.resumen} plano={plano} />
          )}
          {page.resumen.contenidos.length > 0 && <HelenaPageContents contenidos={page.resumen.contenidos} />}
          {model.errorAccion && plano && <p role="alert">{model.errorAccion}</p>}
        </>
      )}
      {!lista && (
        <footer className="sx-d-helena-actions">
          {page.state === 'sealed' ? (
            <Link className="sx-d-action" to={page.activityHref ?? appPaths.student.exploration}>
              Ir a la siguiente misión
            </Link>
          ) : plano && page.reinicioApi ? (
            <>
              {page.puedeReiniciar && (
                <button
                  type="button"
                  className="sx-d-action"
                  disabled={model.revelando}
                  onClick={model.reiniciarIntereses}
                >
                  Volver a hacer las misiones
                </button>
              )}
              <Link to={resultadoHref}>Ver resultado completo</Link>
            </>
          ) : plano ? (
            <>
              <Link className="sx-d-action" to="/student/exploration?punto=mara-test">
                Revisar mis encuentros con Mara
              </Link>
              <Link to={resultadoHref}>Ver resultado completo</Link>
            </>
          ) : (
            // La guía de cada tipo, letra o zona se abre desde la vista explicada, no desde la tarjeta.
            <Link className="sx-d-action sx-d-action-gold" to={resultadoHref}>
              Ver resultado completo
              <ChevronRight aria-hidden="true" />
            </Link>
          )}
        </footer>
      )}
    </Parchment>
  )
}
