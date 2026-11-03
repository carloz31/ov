import type { ResultadoPublico } from '@/types/servidor'
import { fragmentosResumenTercera } from '../data/dimensionExamples'
import type { RutasCatalogo } from '../hooks/useModoCatalogo'
import { useResultadoPortal } from '../hooks/useResultadoPortal'
import type { DimensionPagina } from '../types'
import { FamiliasPortal } from './FamiliasPortal'
import { GuiaDimensiones } from './GuiaDimensiones'
import { OcupacionesAfinesPortal } from './OcupacionesAfinesPortal'
import '../styles/result-page.css'
import '../styles/resultado-intereses.css'
import '../styles/resultado-portal.css'

// Ajuste resultados-intereses: el resultado de intereses del hijo en el portal del apoderado (boceto 02). La
// misma estructura que el del estudiante, con los textos del apoderado y sin favoritos, planes ni
// «recomendada por tu test».
function CodigoPortal({
  protagonistas,
  ordenadas,
  alternarGuia,
  guia,
  abrirGuia,
}: {
  protagonistas: DimensionPagina[]
  ordenadas: DimensionPagina[]
  alternarGuia: () => void
  guia: boolean
  abrirGuia: (codigo: string) => void
}) {
  const fragmentos = protagonistas.map((d) => fragmentosResumenTercera[d.code])
  return (
    <section className="sx-p-panel sx-p-codigo" aria-label="Su código de interés">
      <div>
        <h2>Su código de interés</h2>
        <div className="sx-p-circulos">
          {protagonistas.map((d) => (
            <button
              key={d.code}
              type="button"
              onClick={() => abrirGuia(d.code)}
              aria-label={`${d.name}: qué significa`}
            >
              <span className="sx-p-circulo" data-dimension={d.code} aria-hidden="true">
                {d.code}
              </span>
              <strong>{d.name}</strong>
            </button>
          ))}
        </div>
        <p>
          {fragmentos.length === 3 && fragmentos.every(Boolean)
            ? `Le atraen sobre todo las actividades en las que ${fragmentos[0]}, seguidas de las que ${fragmentos[1]} y de las que ${fragmentos[2]}. `
            : ''}
          <button
            type="button"
            className="sx-p-enlace"
            aria-expanded={guia}
            aria-controls="guia-dimensiones"
            onClick={alternarGuia}
          >
            Qué significa cada tipo
          </button>
        </p>
      </div>
      <div>
        <h2>Cuánto resonó cada tipo de actividad</h2>
        <ul className="sx-p-barras">
          {ordenadas.map((d) => (
            <li key={d.code} data-destacada={protagonistas.some((p) => p.code === d.code) || undefined}>
              <span>{d.name}</span>
              <span className="sx-p-pista" aria-hidden="true">
                <span style={{ width: `${d.score}%` }} />
              </span>
              <strong>{d.score}</strong>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export function ResultadoInteresesPortal({
  remoto,
  nombre,
  rutas,
}: {
  remoto: ResultadoPublico
  nombre: string
  rutas: RutasCatalogo
}) {
  const m = useResultadoPortal(remoto)
  return (
    <div className="sx-d-result-page sx-r-portal">
      <section className="sx-p-panel" aria-labelledby="titulo-que-mide">
        <h2 id="titulo-que-mide">Qué mide este test y cómo leerlo</h2>
        {remoto.mensaje && <p className="sx-p-mensaje">{remoto.mensaje}</p>}
        <p>{remoto.lectura}</p>
      </section>
      <CodigoPortal
        protagonistas={m.resumen.protagonistas}
        ordenadas={m.resumen.ordenadas}
        guia={m.guia}
        alternarGuia={m.alternarGuia}
        abrirGuia={m.abrirGuia}
      />
      {m.guia && (
        <GuiaDimensiones
          resumen={m.resumen}
          abierta
          resaltada={m.resaltada}
          abrir={() => m.abrirGuia()}
          cerrar={m.cerrarGuia}
        />
      )}
      <OcupacionesAfinesPortal
        ocupaciones={m.ocupaciones}
        porArea={m.porArea}
        pocoMarcado={m.pocoMarcado}
        vista={m.vista}
        elegirVista={m.elegirVista}
        filtro={m.filtro}
        filtrar={m.filtrar}
        todas={m.todas}
        mostrarTodas={m.mostrarTodas}
        href={rutas.occupation}
      />
      {!!m.familias.length && (
        <FamiliasPortal familias={m.familias} nombre={nombre} carreras={rutas.catalog.careers} />
      )}
    </div>
  )
}
