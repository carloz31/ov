import { nombresTipoInstitucion } from '@/lib/servidor/adaptadoresCatalogo'
import type { FamiliaPublica, TipoInstitucionServidor, UbicacionPublica } from '@/types/servidor'
import type { ClaseCatalogo, FiltrosCatalogo as Filtros } from '@/store/servidor/catalogo'

const LETRAS = ['R', 'I', 'A', 'S', 'E', 'C']

// F06: filtros básicos de cada pestaña (el acabado queda para la revisión estética). Los selects esperan sus
// opciones; las letras RIASEC se eligen en orden, como las espera el servidor.
export function FiltrosCatalogo({
  clase,
  filtros,
  opciones,
  onCambiar,
  onLetra,
  onFavoritos,
}: {
  clase: ClaseCatalogo
  filtros: Omit<Filtros, 'buscar'>
  opciones: { familias: FamiliaPublica[]; ubicaciones: UbicacionPublica[] } | null
  onCambiar: (cambios: Partial<Filtros>) => void
  onLetra: (letra: string) => void
  onFavoritos: () => void
}) {
  const valor = (texto: string) => (texto === '' ? undefined : texto)
  return (
    <div className="sx-d-actions sx-d-filtros">
      {clase === 'carreras' && (
        <select
          className="sx-d-input"
          aria-label="Familia"
          disabled={!opciones}
          value={filtros.familia ?? ''}
          onChange={(e) => onCambiar({ familia: valor(e.target.value) })}
        >
          <option value="">Todas las familias</option>
          {opciones?.familias.map((f) => (
            <option key={f.codigo} value={f.codigo}>
              {f.nombre}
            </option>
          ))}
        </select>
      )}
      {clase === 'ocupaciones' && (
        <div className="sx-d-tabs" role="group" aria-label="Código de interés">
          {LETRAS.map((letra) => (
            <button
              type="button"
              key={letra}
              aria-pressed={(filtros.riasec ?? '').includes(letra)}
              onClick={() => onLetra(letra)}
            >
              {letra}
            </button>
          ))}
          {filtros.riasec && <span>Código: {filtros.riasec}</span>}
        </div>
      )}
      {clase === 'instituciones' && (
        <>
          <select
            className="sx-d-input"
            aria-label="Tipo"
            value={filtros.tipo ?? ''}
            onChange={(e) => onCambiar({ tipo: valor(e.target.value) })}
          >
            <option value="">Todos los tipos</option>
            {(Object.keys(nombresTipoInstitucion) as TipoInstitucionServidor[]).map((tipo) => (
              <option key={tipo} value={tipo}>
                {nombresTipoInstitucion[tipo]}
              </option>
            ))}
          </select>
          <select
            className="sx-d-input"
            aria-label="Ubicación"
            disabled={!opciones}
            value={filtros.ubicacion ?? ''}
            onChange={(e) => onCambiar({ ubicacion: valor(e.target.value) })}
          >
            <option value="">Todas las ubicaciones</option>
            {opciones?.ubicaciones.map((u) => (
              <option key={u.codigo} value={u.codigo}>
                {u.nombre}
              </option>
            ))}
          </select>
        </>
      )}
      <div className="sx-d-tabs" role="group" aria-label="Favoritos">
        <button type="button" aria-pressed={!!filtros.favoritos} onClick={onFavoritos}>
          Mis favoritos
        </button>
      </div>
    </div>
  )
}
