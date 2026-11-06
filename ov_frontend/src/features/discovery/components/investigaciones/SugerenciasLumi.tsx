import { Loader2, Plus, X } from 'lucide-react'
import type { ModeloPreguntas } from '../../hooks/usePreguntasGuion'

// F09 (boceto 10): «Lumi te sugiere», con sus estados: leyendo, sin sugerencias y error con Reintentar. Nunca
// bloquea el paso.
export function SugerenciasLumi({ p }: { p: ModeloPreguntas }) {
  return (
    <>
      <p className="sx-i-grupo">Lumi te sugiere, a partir de lo que escribiste</p>
      {p.estadoSugerencias === 'cargando' && (
        <div className="sx-i-sugerencia" data-estado="cargando" role="status">
          <Loader2 aria-hidden="true" size={18} className="animate-spin" /> Lumi está leyendo lo que
          escribiste…
        </div>
      )}
      {p.estadoSugerencias === 'sin_sugerencias' && (
        <div className="sx-i-sugerencia" data-estado="aviso">
          Con lo que escribiste no pude armar preguntas nuevas, pero las tres base y tu duda ya son un buen
          comienzo. Agrega las tuyas.
        </div>
      )}
      {p.estadoSugerencias === 'error' && (
        <div className="sx-i-sugerencia" data-estado="aviso" role="alert">
          <span>No pude pensar sugerencias ahora.</span>
          <button type="button" className="sx-i-boton" data-tono="claro" onClick={p.reintentarSugerencias}>
            Reintentar
          </button>
        </div>
      )}
      {p.estadoSugerencias === 'listas' &&
        p.pendientes.map((s) => (
          <div className="sx-i-sugerencia" key={s.codigo}>
            <span>{s.texto}</span>
            <button
              type="button"
              className="sx-i-boton"
              data-tono="claro"
              aria-busy={p.guardando === s.codigo || undefined}
              onClick={() => p.agregar(s)}
            >
              {p.guardando === s.codigo ? (
                <Loader2 aria-hidden="true" size={14} className="animate-spin" />
              ) : (
                <Plus aria-hidden="true" size={14} />
              )}{' '}
              Agregar
            </button>
            <button
              type="button"
              className="sx-i-quitar"
              aria-label="Descartar sugerencia"
              onClick={() => p.descartar(s)}
            >
              <X aria-hidden="true" size={16} />
            </button>
          </div>
        ))}
      {p.estadoSugerencias === 'listas' && (
        <small className="sx-i-letra-chica">
          Son ideas, no obligaciones. Al agregar una pasa a tu lista y la puedes editar.
        </small>
      )}
    </>
  )
}
