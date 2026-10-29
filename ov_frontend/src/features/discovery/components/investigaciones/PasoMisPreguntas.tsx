import { Loader2, X } from 'lucide-react'
import { MAXIMO_IDEAL_PREGUNTAS, MINIMO_IDEAL_PREGUNTAS } from '@/lib/servidor/adaptadoresInvestigaciones'
import type { ModeloPreguntas } from '../../hooks/usePreguntasGuion'
import { SugerenciasLumi } from './SugerenciasLumi'

type Fila = ModeloPreguntas['guion']['propias'][number]

function FilaPregunta({ fila, indice, p }: { fila: Fila; indice: number; p: ModeloPreguntas }) {
  return (
    <li className="sx-i-pregunta">
      <span className="sx-i-numero">{fila.numero}</span>
      <input
        aria-label={`Pregunta ${fila.numero}`}
        value={fila.texto}
        onChange={(e) => p.editar(indice, e.target.value)}
      />
      {fila.origen === 'SUGERIDA' && <small className="sx-i-meta">sugerida</small>}
      <button type="button" className="sx-i-quitar" aria-label={`Quitar la pregunta ${fila.numero}`} onClick={() => p.quitar(indice)}>
        <X aria-hidden="true" size={16} />
      </button>
    </li>
  )
}

// F09 (boceto 10 · HU-059): las preguntas base (fijas), tu duda, las sugerencias de Lumi y las tuyas, numeradas
// seguido. Sin tope; mínimo, las base y una tuya.
export function PasoMisPreguntas({
  p,
  ocupacion,
  onVolver,
}: {
  p: ModeloPreguntas
  ocupacion: string
  onVolver: () => void
}) {
  const indices = p.guion.propias.map((fila, indice) => ({ fila, indice }))
  const duda = indices.filter(({ fila }) => fila.origen === 'DUDA')
  const mias = indices.filter(({ fila }) => fila.origen !== 'DUDA')
  return (
    <div className="sx-i-asistente">
      <section className="sx-i-panel">
        <p className="sx-i-kicker">Paso 2 de 3 · {ocupacion}</p>
        <div className="sx-i-panel-cabecera">
          <h2>Mi lista de preguntas</h2>
          <span>
            <strong>{p.guion.total} preguntas</strong>{' '}
            <small className="sx-i-meta">
              · lo ideal: entre {MINIMO_IDEAL_PREGUNTAS} y {MAXIMO_IDEAL_PREGUNTAS}
            </small>
          </span>
        </div>
        <p className="sx-i-grupo">Preguntas base · siempre van</p>
        <ol className="sx-i-preguntas">
          {p.guion.base.map((b) => (
            <li className="sx-i-pregunta" data-base="true" key={b.numero}>
              <span className="sx-i-numero">{b.numero}</span>
              <span>{b.texto}</span>
            </li>
          ))}
        </ol>
        {duda.length > 0 && (
          <>
            <p className="sx-i-grupo">Tu duda del paso anterior</p>
            <ol className="sx-i-preguntas">
              {duda.map(({ fila, indice }) => (
                <FilaPregunta key={indice} fila={fila} indice={indice} p={p} />
              ))}
            </ol>
          </>
        )}
        <SugerenciasLumi p={p} />
        <p className="sx-i-grupo">Mis preguntas</p>
        {mias.length > 0 && (
          <ol className="sx-i-preguntas">
            {mias.map(({ fila, indice }) => (
              <FilaPregunta key={indice} fila={fila} indice={indice} p={p} />
            ))}
          </ol>
        )}
        <form
          className="sx-i-agregar"
          onSubmit={(e) => {
            e.preventDefault()
            p.agregarPropia()
          }}
        >
          <input
            className="sx-d-input"
            aria-label="Escribe una pregunta que quieras hacer"
            placeholder="Escribe una pregunta que quieras hacer"
            value={p.nueva}
            onChange={(e) => p.setNueva(e.target.value)}
          />
          <button type="submit" className="sx-i-boton" data-tono="claro" disabled={!p.nueva.trim()}>
            Agregar
          </button>
        </form>
        {p.muchas && (
          <p className="sx-i-aviso" role="status">
            Con más de 10 la entrevista se alarga; elige las que más te importen.
          </p>
        )}
        <div className="sx-i-acciones">
          <button type="button" className="sx-i-boton" data-tono="claro" onClick={onVolver}>
            Volver
          </button>
          <button
            type="button"
            className="sx-i-boton"
            disabled={!p.puedeTerminar || p.terminando}
            aria-busy={p.terminando || undefined}
            onClick={() => void p.terminar()}
          >
            {p.terminando && <Loader2 aria-hidden="true" size={18} className="animate-spin" />}
            Terminar mi guion
          </button>
        </div>
        <small className="sx-i-letra-chica">
          Mínimo: las 3 base y 1 tuya. Tu guion sigue editable hasta que publiques.
        </small>
      </section>
    </div>
  )
}
