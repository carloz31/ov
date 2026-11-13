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
import { PartidaLlegadaResult } from '@/features/discovery/components/PartidaLlegadaResult'
import { AvisoFavorito } from '@/features/discovery/components/AvisoFavorito'
import { GuiaDimensiones } from '@/features/discovery/components/GuiaDimensiones'
import { ResultadoIntereses } from '@/features/discovery/components/ResultadoIntereses'
import { appPaths } from '@/routes/paths'
import '@/features/discovery/styles/result-page.css'
import '@/features/discovery/styles/resultado-intereses.css'

export function HelenaResultView() {
  const { pagina } = useParams()
  const model = useResultPage(pagina)
  if (!model) return <Navigate replace to={discoveryPaths.helena} />
  if (model.espera)
    return (
      <DiscoveryStage ambient="profile">
        <div className="sx-d-result-page" aria-busy={!model.espera.error}>
          {model.espera.error && (
            <div className="sx-d-warning" role="alert">
              <p>{model.espera.error}</p>
              <button type="button" className="sx-d-action" onClick={model.espera.reintentar}>
                Reintentar
              </button>
            </div>
          )}
        </div>
      </DiscoveryStage>
    )
  if (model.comparacion)
    return (
      <DiscoveryStage ambient="profile">
        <div className="sx-d-result-page">
          <ResultHeader page={model.comparacion.page} tipo="COMPARACION" />
          <PartidaLlegadaResult {...model.comparacion} />
        </div>
      </DiscoveryStage>
    )
  const { resumen } = model
  // Ajuste resultados-intereses (api): guía común, letras y barras que la abren, encuadre y «Cómo leer».
  const api = resumen.puntajeVisual
  const guia = api ? (
    <GuiaDimensiones
      resumen={resumen}
      abierta={model.guia}
      resaltada={model.resaltada}
      abrir={() => model.abrirGuia()}
      cerrar={() => model.setGuia(false)}
    />
  ) : (
    model.guia && <DimensionGuide resumen={resumen} cerrar={() => model.setGuia(false)} />
  )
  const perfil = (
    <DimensionProfile
      resumen={resumen}
      guia={model.guia}
      abrirGuia={() => model.setGuia(!model.guia)}
      expandidas={model.expandidas}
      alternar={model.alternarDimension}
      alPulsar={api ? model.abrirGuia : undefined}
    />
  )
  return (
    <DiscoveryStage ambient="profile">
      <div className="sx-d-result-page">
        <ResultHeader
          page={model.page}
          tipo={resumen.tipoResultado}
          encuadre={api ? resumen.mensaje : undefined}
        />
        {(model.errorResultado || model.errorConsulta) && (
          <div className="sx-d-warning" role="alert">
            <p>{model.errorResultado?.mensaje || model.errorConsulta}</p>
            <button type="button" className="sx-d-action" onClick={model.reintentar}>
              Reintentar
            </button>
          </div>
        )}
        {resumen.lectura &&
          (api ? (
            <section className="sx-r-lectura" aria-label="Cómo leer este resultado">
              <p className="sx-r-rotulo">Cómo leer este resultado</p>
              <p className="sx-d-result-lectura">{resumen.lectura}</p>
            </section>
          ) : (
            <p className="sx-d-result-lectura">{resumen.lectura}</p>
          ))}
        {model.intereses ? (
          <ResultadoIntereses
            modelo={model.intereses}
            perfil={
              <ResultOverview>
                <InterestCode
                  dimensiones={resumen.protagonistas}
                  empate={resumen.hayEmpate}
                  alPulsar={model.abrirGuia}
                />
                {perfil}
              </ResultOverview>
            }
            guia={guia}
            rutas={{
              ocupacion: discoveryPaths.occupation,
              carreras: appPaths.student.catalog.careers,
              profesiones: appPaths.student.catalog.professions,
            }}
          />
        ) : (
          <>
            <ResultOverview>
              {resumen.perfilPlano ? (
                <FlatProfileNotice
                  reinicio={
                    model.reinicio && {
                      texto: model.reinicio.texto,
                      accion: (
                        <>
                          {model.reinicio.puede && (
                            <button
                              type="button"
                              className="sx-d-action"
                              disabled={model.reinicio.ocupado}
                              onClick={model.reinicio.reiniciar}
                            >
                              Volver a hacer las misiones
                            </button>
                          )}
                          {model.reinicio.error && <p role="alert">{model.reinicio.error}</p>}
                        </>
                      ),
                    }
                  }
                />
              ) : resumen.tipoResultado === 'COINCIDENCIAS' ? (
                <InterestCode dimensiones={resumen.protagonistas} empate={resumen.hayEmpate} />
              ) : (
                <HighlightedDimensions
                  dimensiones={resumen.protagonistas}
                  pagina={resumen.pagina}
                  puntajeVisual={resumen.puntajeVisual}
                />
              )}
              {perfil}
            </ResultOverview>
            {guia}
            {model.mostrarOcupaciones && (
              <AffineOccupations
                ocupaciones={model.ocupaciones}
                ajuste={model.ajuste}
                filtrar={model.setAjuste}
                seleccion={model.elegida?.clave}
                elegir={model.setSeleccion}
                guardar={model.guardarOcupacion}
                pendiente={model.ocupacionPendiente}
              />
            )}
            {model.mostrarCarreras && (
              <RecommendedCareers
                carreras={model.carreras}
                ocupacion={model.elegida?.titulo}
                verTodas={() => model.setSeleccion(null)}
                siguientePlan={model.siguientePlan}
                guardar={model.guardarCarrera}
                pendiente={model.carreraPendiente}
                crearPlan={model.crearPlan}
              />
            )}
            {resumen.secciones.siguientesPasos && <ResultNextSteps />}
            <ResultNotes tipo={resumen.tipoResultado} />
          </>
        )}
        <AvisoFavorito aviso={model.avisoFavorito} onDismiss={model.cerrarAvisoFavorito} />
      </div>
    </DiscoveryStage>
  )
}
