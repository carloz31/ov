import { useEffect } from 'react'
import { ArrowRight, X } from 'lucide-react'
import { posicionDimension } from '../lib/resultadoIntereses'
import type { DimensionPagina, ResumenResultado } from '../types'

// Ajuste resultados-intereses (api): la guía de dimensiones común a los tres tests. Cerrada es una fila con las
// letras; abierta, una grilla de tarjetas con las cuatro piezas, sin pintar las vacías. Pulsar una letra del
// código o una barra la abre con esa tarjeta resaltada.
const titulos = {
  intereses: 'Los seis tipos de interés (RIASEC)',
  habilidades: 'Las cinco habilidades sociales',
  inteligencias: 'Las siete inteligencias',
}

function TarjetaDimension({
  dimension,
  indice,
  intereses,
  resaltada,
}: {
  dimension: DimensionPagina
  indice: number
  intereses: boolean
  resaltada: boolean
}) {
  const letra = intereses ? dimension.code : dimension.name.slice(0, 1)
  return (
    <article
      id={`guia-${dimension.code}`}
      className="sx-r-guia-tarjeta"
      data-fuerte={indice === 0 || undefined}
      data-resaltada={resaltada || undefined}
    >
      <header>
        <span className="sx-r-guia-letra" data-dimension={dimension.code} aria-hidden="true">
          {letra}
        </span>
        <div>
          <h3>{dimension.name}</h3>
          <p>
            {posicionDimension(indice, !intereses)} · {dimension.score}
          </p>
        </div>
      </header>
      <p className="sx-r-guia-que">{dimension.description}</p>
      {dimension.ejemplos && (
        <section>
          <h4>Suele notarse cuando</h4>
          <p>{dimension.ejemplos}</p>
        </section>
      )}
      {!!dimension.fortalezas?.length && (
        <section>
          <h4>Suele venir con</h4>
          <ul>
            {dimension.fortalezas.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </section>
      )}
      {!!dimension.desarrollo?.length && (
        <section className="sx-r-guia-desarrollo">
          <h4>Para desarrollarla</h4>
          <ul>
            {dimension.desarrollo.map((d) => (
              <li key={d}>
                <ArrowRight aria-hidden="true" />
                {d}
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  )
}

export function GuiaDimensiones({
  resumen,
  abierta,
  resaltada,
  abrir,
  cerrar,
}: {
  resumen: ResumenResultado
  abierta: boolean
  resaltada: string | null
  abrir: () => void
  cerrar: () => void
}) {
  const intereses = resumen.tipoResultado === 'COINCIDENCIAS'
  const clave = intereses ? 'intereses' : resumen.pagina === 'habilidades' ? 'habilidades' : 'inteligencias'
  useEffect(() => {
    if (!abierta || !resaltada) return
    try {
      document.getElementById(`guia-${resaltada}`)?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
    } catch {
      // Sin documento (pruebas): no hay a dónde desplazarse.
    }
  }, [abierta, resaltada])
  if (!abierta)
    return (
      <section className="sx-r-guia sx-r-guia-cerrada" aria-labelledby="titulo-guia">
        <div>
          <p className="sx-r-rotulo">Guía rápida</p>
          <h2 id="titulo-guia">{titulos[clave]}</h2>
          <p>
            {intereses
              ? 'Qué significa cada letra, cuándo se nota y qué suele venir con ella. Pulsa una letra de tu código para abrirla ahí.'
              : 'Qué es cada una, cuándo se nota, qué suele venir con ella y cómo desarrollarla.'}
          </p>
        </div>
        <div className="sx-r-guia-letras" aria-hidden="true">
          {resumen.dimensiones.map((d) => (
            <span key={d.code} className="sx-r-guia-letra" data-dimension={d.code}>
              {intereses ? d.code : d.name.slice(0, 1)}
            </span>
          ))}
        </div>
        <button type="button" className="sx-r-boton" aria-controls="guia-dimensiones" onClick={abrir}>
          Abrir la guía
        </button>
      </section>
    )
  return (
    <section id="guia-dimensiones" className="sx-r-guia" aria-labelledby="titulo-guia">
      <div className="sx-r-guia-cabecera">
        <div>
          <p className="sx-r-rotulo">Guía rápida</p>
          <h2 id="titulo-guia">{titulos[clave]}</h2>
          <p>
            {intereses
              ? 'Cada tipo se describe con lo que es, cuándo se nota y qué suele venir con él. Tu código resalta los tres con más fuerza.'
              : 'Cada una se describe con lo que es, cuándo se nota, qué suele venir con ella y cómo desarrollarla.'}
          </p>
        </div>
        <button type="button" className="sx-r-cerrar" aria-label="Cerrar guía" onClick={cerrar}>
          <X aria-hidden="true" />
        </button>
      </div>
      <div className="sx-r-guia-grilla">
        {resumen.ordenadas.map((d, i) => (
          <TarjetaDimension
            key={d.code}
            dimension={d}
            indice={i}
            intereses={intereses}
            resaltada={resaltada === d.code}
          />
        ))}
      </div>
      <p className="sx-r-nota">{intereses ? 'Ninguno es mejor que otro.' : 'Ninguna es mejor que otra.'}</p>
    </section>
  )
}
