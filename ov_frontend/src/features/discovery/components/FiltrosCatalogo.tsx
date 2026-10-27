import { Star } from 'lucide-react'
import type { OpcionesCatalogo } from '@/store/servidor/catalogo'
import type { ClaseCatalogo } from '@/store/servidor/catalogo'
import type { FiltrosUrl } from '../lib/filtrosCatalogo'

const LETRAS = ['R', 'I', 'A', 'S', 'E', 'C']
const TIPOS_CARRERA = [
  ['', 'Todas'],
  ['UNIVERSIDAD', 'Universitaria'],
  ['INSTITUTO', 'Técnica'],
  ['FFAA_POLICIA', 'FF. AA. y Policía'],
] as const
const TIPOS_INSTITUCION = [
  ['', 'Todas'],
  ['UNIVERSIDAD', 'Universidad'],
  ['INSTITUTO', 'Instituto'],
  ['FFAA_POLICIA', 'FF. AA. y Policía'],
] as const
const GESTIONES = [
  ['', 'Todas'],
  ['PUBLICA', 'Pública'],
  ['PRIVADA', 'Privada'],
] as const

function Chips({
  etiqueta,
  opciones,
  valor,
  onElegir,
}: {
  etiqueta: string
  opciones: readonly (readonly [string, string])[]
  valor: string | undefined
  onElegir: (valor: string) => void
}) {
  return (
    <div className="sx-c-grupo" role="group" aria-label={etiqueta}>
      <span className="sx-c-grupo-nombre">{etiqueta}</span>
      {opciones.map(([codigo, nombre]) => (
        <button
          type="button"
          key={codigo || 'todas'}
          className="sx-c-chip"
          aria-pressed={(valor ?? '') === codigo}
          onClick={() => onElegir(codigo)}
        >
          {nombre}
        </button>
      ))}
    </div>
  )
}

function Selector({
  etiqueta,
  todas,
  opciones,
  valor,
  onElegir,
}: {
  etiqueta: string
  todas: string
  opciones: { codigo: string; nombre: string }[] | null
  valor: string | undefined
  onElegir: (valor: string) => void
}) {
  return (
    <label className="sx-c-selector">
      <span>{etiqueta}</span>
      <select disabled={!opciones} value={valor ?? ''} onChange={(e) => onElegir(e.target.value)}>
        <option value="">{todas}</option>
        {opciones?.map((o) => (
          <option key={o.codigo} value={o.codigo}>
            {o.nombre}
          </option>
        ))}
      </select>
    </label>
  )
}

// Ajuste catalogo-datos-reales (F6a): los filtros de cada pestaña. Carreras: tipo, área, familia (según el área),
// letras RIASEC y «Afines a mi resultado». Profesiones: letras, afines y grupo. Instituciones: tipo, gestión y
// departamento. Los cambios esperan antes de pedir la lista (`useCatalogoServidor`).
export function FiltrosCatalogo({
  clase,
  filtros,
  letras,
  afinesDisponibles,
  opciones,
  onCambiar,
  onLetra,
  onAfines,
}: {
  clase: ClaseCatalogo
  filtros: FiltrosUrl
  letras: string
  afinesDisponibles: boolean
  opciones: OpcionesCatalogo
  onCambiar: (cambios: FiltrosUrl) => void
  onLetra: (letra: string) => void
  onAfines: () => void
}) {
  const areas = opciones
    ? [
        ...new Map(
          opciones.familias.map((f) => [f.area_codigo, { codigo: f.area_codigo, nombre: f.area_nombre }]),
        ).values(),
      ]
    : null
  const familias = opciones?.familias.filter((f) => !filtros.area || f.area_codigo === filtros.area) ?? null
  const intereses = (
    <div className="sx-c-grupo" role="group" aria-label="Intereses">
      <span className="sx-c-grupo-nombre">Intereses</span>
      {LETRAS.map((letra) => (
        <button
          type="button"
          key={letra}
          className="sx-c-letra"
          aria-pressed={letras.includes(letra)}
          onClick={() => onLetra(letra)}
        >
          {letra}
        </button>
      ))}
      {letras && (
        <small>
          Código: <strong>{letras}</strong> · en el orden en que los pulsas
        </small>
      )}
      <button
        type="button"
        className="sx-c-chip"
        aria-pressed={!!filtros.afines}
        disabled={!afinesDisponibles}
        title={afinesDisponibles ? undefined : 'Revela tu página de intereses para usar este filtro'}
        onClick={onAfines}
      >
        <Star aria-hidden="true" size={16} /> Afines a mi resultado
      </button>
    </div>
  )
  if (clase === 'carreras')
    return (
      <div className="sx-c-filtros">
        <div className="sx-c-fila">
          <Chips
            etiqueta="Tipo"
            opciones={TIPOS_CARRERA}
            valor={filtros.tipo}
            onElegir={(tipo) => onCambiar({ tipo })}
          />
          <Selector
            etiqueta="Área"
            todas="Todas las áreas"
            opciones={areas}
            valor={filtros.area}
            onElegir={(area) => onCambiar({ area })}
          />
          <Selector
            etiqueta="Familia"
            todas="Todas las familias"
            opciones={familias}
            valor={filtros.familia}
            onElegir={(familia) => onCambiar({ familia })}
          />
        </div>
        <div className="sx-c-fila">{intereses}</div>
      </div>
    )
  if (clase === 'ocupaciones')
    return (
      <div className="sx-c-filtros">
        <div className="sx-c-fila">
          {intereses}
          <Selector
            etiqueta="Grupo"
            todas="Todos los grupos"
            opciones={opciones?.grupos ?? null}
            valor={filtros.grupo}
            onElegir={(grupo) => onCambiar({ grupo })}
          />
        </div>
      </div>
    )
  return (
    <div className="sx-c-filtros">
      <div className="sx-c-fila">
        <Chips
          etiqueta="Tipo"
          opciones={TIPOS_INSTITUCION}
          valor={filtros.tipo}
          onElegir={(tipo) => onCambiar({ tipo })}
        />
        <Chips
          etiqueta="Gestión"
          opciones={GESTIONES}
          valor={filtros.gestion}
          onElegir={(gestion) => onCambiar({ gestion })}
        />
        <Selector
          etiqueta="Departamento"
          todas="Todo el país"
          opciones={opciones?.ubicaciones ?? null}
          valor={filtros.ubicacion}
          onElegir={(ubicacion) => onCambiar({ ubicacion })}
        />
      </div>
    </div>
  )
}
