import { Navigate, useParams } from 'react-router'
import { discoveryPaths } from '@/routes/discoveryPaths'
import { useResultPage } from '@/features/discovery/hooks/useResultPage'
import { DiscoveryStage } from '@/features/discovery/components/DiscoveryStage'
import { ResultOverview } from '@/features/discovery/components/ResultOverview'
import { ResultHeader } from '@/features/discovery/components/ResultHeader'
import { InterestCode } from '@/features/discovery/components/InterestCode'
import { HighlightedDimensions } from '@/features/discovery/components/HighlightedDimensions'
import { DimensionProfile } from '@/features/discovery/components/DimensionProfile'
import { DimensionGuide } from '@/features/discovery/components/DimensionGuide'
import { AffineOccupations } from '@/features/discovery/components/AffineOccupations'
import { RecommendedCareers } from '@/features/discovery/components/RecommendedCareers'
import { ResultNextSteps } from '@/features/discovery/components/ResultNextSteps'
import { FlatProfileNotice } from '@/features/discovery/components/FlatProfileNotice'
import { ResultNotes } from '@/features/discovery/components/ResultNotes'
import '@/features/discovery/styles/result-page.css'

export function HelenaResultView() {
  const { pagina } = useParams()
  const model = useResultPage(pagina)
  if (!model) return <Navigate replace to={discoveryPaths.helena} />
  const { resumen } = model
  return (
    <DiscoveryStage ambient="profile">
      <div className="sx-d-result-page">
        <ResultHeader page={model.page} tipo={resumen.tipoResultado} />
        {(model.errorResultado || model.errorConsulta) && (
          <div className="sx-d-warning" role="alert">
            <p>{model.errorResultado?.mensaje || model.errorConsulta}</p>
            <button type="button" className="sx-d-action" onClick={model.reintentar}>
              Reintentar
            </button>
          </div>
        )}
        <ResultOverview>
          {resumen.perfilPlano ? (
            <FlatProfileNotice />
          ) : resumen.tipoResultado === 'COINCIDENCIAS' ? (
            <InterestCode dimensiones={resumen.protagonistas} empate={resumen.hayEmpate} />
          ) : (
            <HighlightedDimensions dimensiones={resumen.protagonistas} />
          )}
          <DimensionProfile
            resumen={resumen}
            guia={model.guia}
            abrirGuia={() => model.setGuia(!model.guia)}
            expandidas={model.expandidas}
            alternar={model.alternarDimension}
          />
        </ResultOverview>
        {model.guia && <DimensionGuide resumen={resumen} cerrar={() => model.setGuia(false)} />}
        {model.mostrarOcupaciones && (
          <AffineOccupations
            ocupaciones={model.ocupaciones}
            ajuste={model.ajuste}
            filtrar={model.setAjuste}
            seleccion={model.elegida?.clave}
            elegir={model.setSeleccion}
            guardar={model.guardarOcupacion}
          />
        )}
        {model.mostrarCarreras && (
          <RecommendedCareers
            carreras={model.carreras}
            ocupacion={model.elegida?.titulo}
            verTodas={() => model.setSeleccion(null)}
            siguientePlan={model.siguientePlan}
            guardar={model.guardarCarrera}
            crearPlan={model.crearPlan}
          />
        )}
        {resumen.secciones.siguientesPasos && <ResultNextSteps />}
        <ResultNotes tipo={resumen.tipoResultado} />
      </div>
    </DiscoveryStage>
  )
}
