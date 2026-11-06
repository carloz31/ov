import { desglosePorTipo, textoReacciones } from '@/lib/servidor/adaptadoresInvestigaciones'
import type { ModeloDetalle } from '../../hooks/useEntrevistaDetalle'
import { FilaReaccion } from './FilaReaccion'

// F09 (bocetos 05 y 06 · HU-063): «Lo que dejó a tu salón» (de un compañero, con «Dejar mi reacción») o «Lo que
// dicen de tu entrevista» (propia, solo lectura). La propia primero, luego por fecha; «Mostrar más» cada 10.
export function ReaccionesEntrevista({ m }: { m: ModeloDetalle }) {
  const e = m.datos!
  const ahora = new Date()
  const resumen = [textoReacciones(e.reacciones), ...desglosePorTipo(e.reacciones_por_tipo, m.tipos)]
  if (e.propia) resumen.push(`Favoritos ${e.favoritos}`)
  return (
    <section className="sx-i-panel" aria-labelledby="reacciones-titulo">
      <div className="sx-i-panel-cabecera">
        <div>
          <h2 id="reacciones-titulo">
            {e.propia ? 'Lo que dicen de tu entrevista' : 'Lo que dejó a tu salón'}
          </h2>
          <p className="sx-i-meta">{resumen.join(' · ')}</p>
        </div>
        {!e.propia && !m.reaccionPropia && (
          <button type="button" className="sx-i-boton" onClick={() => m.abrirReaccion()}>
            Dejar mi reacción
          </button>
        )}
      </div>
      {!e.propia && (
        <p className="sx-i-nota-clara">
          Tu reacción se publica con tu nombre y la ven el salón, los autores y tu orientadora. Una por
          entrevista; puedes editarla o borrarla.
        </p>
      )}
      {m.reacciones.length === 0 ? (
        <p className="sx-i-meta">
          {e.propia
            ? 'Todavía nadie ha reaccionado a tu entrevista.'
            : 'Sé la primera persona en dejar su reacción.'}
        </p>
      ) : (
        <ul className="sx-i-reacciones">
          {m.reacciones.map((r) => (
            <FilaReaccion
              key={r.codigo}
              reaccion={r}
              tipos={m.tipos}
              ahora={ahora}
              soloLectura={e.propia}
              onEditar={() => m.abrirReaccion(r)}
              onEliminar={() => m.pedirEliminar(r)}
              onReportar={() => m.abrirReporte({ tipo: 'reaccion', reaccion: r })}
            />
          ))}
        </ul>
      )}
      {m.hayMas && (
        <button type="button" className="sx-i-boton" data-tono="claro" onClick={m.mostrarMas}>
          Mostrar más
        </button>
      )}
      {e.propia && (
        <small className="sx-i-letra-chica">
          Los autores no reaccionan a su propia entrevista; solo leen. El «⋯» de cada comentario permite
          reportarlo si es inadecuado.
        </small>
      )}
    </section>
  )
}
