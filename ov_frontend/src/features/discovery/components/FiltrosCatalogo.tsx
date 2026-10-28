import { Star } from 'lucide-react'
import type { OpcionesCatalogo } from '@/store/servidor/catalogo'
import type { ClaseCatalogo } from '@/store/servidor/catalogo'
import type { FiltrosUrl } from '../lib/filtrosCatalogo'
import { PanelFiltros, type FilaFiltro } from './PanelFiltros'

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
  opciones,
  valor,
  onElegir,
}: {
  opciones: readonly (readonly [string, string])[]
  valor: string | undefined
  onElegir: (valor: string) => void
}) {
  return opciones.map(([codigo, nombre]) => (
    <button
      type="button"
      key={codigo || 'todas'}
      className="sx-c-chip"
      aria-pressed={(valor ?? '') === codigo}
      onClick={() => onElegir(codigo)}
    >
      {nombre}
    </button>
  ))
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

// Ajuste catalogo-datos-reales (F6a, rediseño tras la revisión): los filtros de cada pestaña como filas de un
// panel. Carreras: Tipo, Campo (área y familia según el área) e Intereses. Profesiones: Intereses y Grupo.
// Instituciones: Tipo, Gestión y Lugar. Los cambios esperan antes de pedir la lista (`useCatalogoServidor`).
// Ajuste catalogo-apoderado: con `soloLetras` (modo lectura) no hay «Afines a mi resultado»; queda una ayuda.
export function FiltrosCatalogo({
  clase,
  filtros,
  letras,
  afinesDisponibles,
  opciones,
  onCambiar,
  onLetra,
  onAfines,
  soloLetras = false,
}: {
  clase: ClaseCatalogo
  filtros: FiltrosUrl
  letras: string
  afinesDisponibles: boolean
  opciones: OpcionesCatalogo
  onCambiar: (cambios: FiltrosUrl) => void
  onLetra: (letra: string) => void
  onAfines: () => void
  soloLetras?: boolean
}) {
  const areas = opciones
    ? [
        ...new Map(
          opciones.familias.map((f) => [f.area_codigo, { codigo: f.area_codigo, nombre: f.area_nombre }]),
        ).values(),
      ]
    : null
  const familias = opciones?.familias.filter((f) => !filtros.area || f.area_codigo === filtros.area) ?? null
  const intereses: FilaFiltro = {
    etiqueta: 'Intereses',
    controles: (
      <>
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
        {soloLetras ? (
          !letras && (
            <small className="sx-c-ayuda">
              Filtre por el tipo de interés de la {clase === 'carreras' ? 'carrera' : 'profesión'}
            </small>
          )
        ) : (
          <>
            <button
              type="button"
              className="sx-c-chip"
              aria-pressed={!!filtros.afines}
              disabled={!afinesDisponibles}
              aria-describedby={afinesDisponibles ? undefined : 'afines-sin-resultado'}
              onClick={onAfines}
            >
              <Star aria-hidden="true" size={16} /> Afines a mi resultado
            </button>
            {!afinesDisponibles && (
              <small id="afines-sin-resultado" className="sr-only">
                Revela tu página de intereses para usar este filtro.
              </small>
            )}
          </>
        )}
      </>
    ),
  }
  const filas: FilaFiltro[] =
    clase === 'carreras'
      ? [
          {
            etiqueta: 'Tipo',
            controles: (
              <Chips opciones={TIPOS_CARRERA} valor={filtros.tipo} onElegir={(tipo) => onCambiar({ tipo })} />
            ),
          },
          {
            etiqueta: 'Campo',
            controles: (
              <>
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
              </>
            ),
          },
          intereses,
        ]
      : clase === 'ocupaciones'
        ? [
            intereses,
            {
              etiqueta: 'Grupo',
              controles: (
                <Selector
                  etiqueta="Grupo"
                  todas="Todos los grupos"
                  opciones={opciones?.grupos ?? null}
                  valor={filtros.grupo}
                  onElegir={(grupo) => onCambiar({ grupo })}
                />
              ),
            },
          ]
        : [
            {
              etiqueta: 'Tipo',
              controles: (
                <Chips
                  opciones={TIPOS_INSTITUCION}
                  valor={filtros.tipo}
                  onElegir={(tipo) => onCambiar({ tipo })}
                />
              ),
            },
            {
              etiqueta: 'Gestión',
              controles: (
                <Chips
                  opciones={GESTIONES}
                  valor={filtros.gestion}
                  onElegir={(gestion) => onCambiar({ gestion })}
                />
              ),
            },
            {
              etiqueta: 'Lugar',
              controles: (
                <Selector
                  etiqueta="Departamento"
                  todas="Todo el país"
                  opciones={opciones?.ubicaciones ?? null}
                  valor={filtros.ubicacion}
                  onElegir={(ubicacion) => onCambiar({ ubicacion })}
                />
              ),
            },
          ]
  return <PanelFiltros filas={filas} />
}
