import { Loader2, Search } from 'lucide-react'
import type { OcupacionBreve } from '@/types/servidor'
import { useBuscadorOcupacion } from '../../hooks/useBuscadorOcupacion'

// F09 (boceto 09): la ocupación a investigar, solo del catálogo. Elegida, queda como chip con «Cambiar».
export function BuscadorOcupacion({
  ocupacion,
  onElegir,
  onCambiar,
}: {
  ocupacion: OcupacionBreve | null
  onElegir: (ocupacion: OcupacionBreve) => void
  onCambiar: () => void
}) {
  const b = useBuscadorOcupacion(onElegir)
  const abierto = b.estado !== 'inactivo'
  return (
    <div className="sx-i-buscador">
      <label className="sx-i-buscador-campo">
        <Search aria-hidden="true" size={18} />
        <span className="sr-only">Busca la ocupación</span>
        {ocupacion ? (
          <span className="sx-i-chip-ocupacion">
            {ocupacion.titulo}
            <button type="button" onClick={onCambiar}>
              Cambiar
            </button>
          </span>
        ) : (
          <input
            role="combobox"
            aria-expanded={b.estado === 'listo'}
            aria-controls="ocupaciones-resultados"
            aria-activedescendant={b.estado === 'listo' ? `ocupacion-${b.activo}` : undefined}
            value={b.texto}
            placeholder="Escribe una ocupación…"
            onChange={(e) => b.escribir(e.target.value)}
            onKeyDown={b.alTeclear}
          />
        )}
        {b.estado === 'escribiendo' && <Loader2 aria-hidden="true" size={16} className="animate-spin" />}
      </label>
      {!ocupacion && abierto && (
        <div className="sx-i-resultados" aria-live="polite">
          {b.estado === 'listo' && (
            <ul id="ocupaciones-resultados" role="listbox">
              {b.resultados.map((r, i) => (
                <li
                  key={r.codigo}
                  id={`ocupacion-${i}`}
                  role="option"
                  aria-selected={i === b.activo}
                  onMouseEnter={() => b.setActivo(i)}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    b.elegir(r)
                  }}
                >
                  <span>{r.titulo}</span>
                  <small>{b.grupo(r.grupo)}</small>
                </li>
              ))}
            </ul>
          )}
          {b.estado === 'listo' && <small>Máximo 8 resultados · flechas y Enter para elegir</small>}
          {b.estado === 'sin_resultados' && <p>No encontramos esa ocupación. Prueba con otra palabra.</p>}
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
