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

type ModeloLibro = ReturnType<typeof useHelenaPages>

export function HelenaPageCard({ page, model }: { page: ModeloLibro['pages'][number]; model: ModeloLibro }) {
  const resultadoHref = discoveryPaths.helenaPage(page.id)
  const intereses = page.tipoResultado === 'COINCIDENCIAS'
  const plano = intereses && page.perfilPlano
  return (
    <Parchment
      className={`sx-d-helena-card sx-d-helena-${page.state}${page.state === 'revealed' ? ' sx-d-revealed' : ''}`}
      label={page.antetitulo}
      title={page.title}
    >
      <div className="sx-d-helena-subtitle">
        <span className="sx-d-tag">{page.required ? 'Para tu proyecto' : 'Opcional'}</span>
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
                <p>{model.requisito}</p>
              )}
            </div>
          )}
        </>
      ) : page.state === 'ready' ? (
        <div className="sx-d-helena-box sx-d-helena-ready-box">
          <Seal state="ready" large />
          <p>{page.textoSello}</p>
        </div>
      ) : (
        <>
          {model.opening === page.id && (
            <div className="sx-d-breaking-seal" aria-hidden="true">
              <Seal state="ready" large />
            </div>
          )}
          <HelenaPageSummary resumen={page.resumen} plano={plano} />
          <HelenaPageContents contenidos={page.resumen.contenidos} />
        </>
      )}
      <footer className="sx-d-helena-actions">
        {page.state === 'sealed' ? (
          <Link className="sx-d-action" to={page.activityHref ?? appPaths.student.exploration}>
            Ir a la siguiente misión
          </Link>
        ) : page.state === 'ready' ? (
          <button
            type="button"
            className="sx-d-action sx-d-action-gold"
            disabled={page.revelacionBloqueada}
            onClick={() => model.revelarPagina(page.id)}
          >
            Romper el sello
          </button>
        ) : plano ? (
          <>
            <Link className="sx-d-action" to="/student/exploration?punto=mara-test">
              Revisar mis encuentros con Mara
            </Link>
            <Link to={resultadoHref}>Ver resultado completo</Link>
          </>
        ) : (
          <>
            <Link className="sx-d-action sx-d-action-gold" to={resultadoHref}>
              Ver resultado completo
              <ChevronRight aria-hidden="true" />
            </Link>
            <Link to={`${resultadoHref}?guia=1`}>
              {intereses ? '¿Qué significa cada letra?' : '¿Qué es cada inteligencia?'}
            </Link>
          </>
        )}
      </footer>
    </Parchment>
  )
}
