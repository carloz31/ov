import { Loader2, Search } from 'lucide-react'
import type { FamiliaBreve } from '@/types/servidor'
import { useBuscadorFamilia } from '../../hooks/useBuscadorFamilia'

// Ajuste entrevistas por familia: la familia de carreras a investigar, solo del catálogo. Elegida, queda como chip
// con «Cambiar».
export function BuscadorFamilia({
  familia,
  onElegir,
  onCambiar,
}: {
  familia: FamiliaBreve | null
  onElegir: (familia: FamiliaBreve) => void
  onCambiar: () => void
}) {
  const b = useBuscadorFamilia(onElegir)
  const abierto = b.estado !== 'inactivo'
  return (
    <div className="sx-i-buscador">
      <label className="sx-i-buscador-campo">
        <Search aria-hidden="true" size={18} />
        <span className="sr-only">Busca la familia de carreras</span>
        {familia ? (
          <span className="sx-i-chip-familia">
            {familia.nombre}
            <button type="button" onClick={onCambiar}>
              Cambiar
            </button>
          </span>
        ) : (
          <input
            role="combobox"
            aria-expanded={b.estado === 'listo'}
            aria-controls="familias-resultados"
            aria-activedescendant={b.estado === 'listo' ? `familia-${b.activo}` : undefined}
            value={b.texto}
            placeholder="Escribe una familia de carreras…"
            onChange={(e) => b.escribir(e.target.value)}
            onKeyDown={b.alTeclear}
          />
        )}
        {b.estado === 'escribiendo' && <Loader2 aria-hidden="true" size={16} className="animate-spin" />}
      </label>
      {!familia && abierto && (
        <div className="sx-i-resultados" aria-live="polite">
          {b.estado === 'listo' && (
            <ul id="familias-resultados" role="listbox">
              {b.resultados.map((r, i) => (
                <li
                  key={r.codigo}
                  id={`familia-${i}`}
                  role="option"
                  aria-selected={i === b.activo}
                  onMouseEnter={() => b.setActivo(i)}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    b.elegir(r)
                  }}
                >
                  <span>{r.nombre}</span>
                  <small>{r.area_nombre}</small>
                </li>
              ))}
            </ul>
          )}
          {b.estado === 'listo' && <small>Máximo 8 resultados · flechas y Enter para elegir</small>}
          {b.estado === 'sin_resultados' && <p>No encontramos esa familia. Prueba con otra palabra.</p>}
          {b.estado === 'error' && (
            <p>
              No pudimos buscar ahora.{' '}
              <button type="button" className="sx-i-boton" data-tono="claro" onClick={b.reintentar}>
                Reintentar
              </button>
            </p>
          )}
        </div>
      )}
    </div>
  )
}
