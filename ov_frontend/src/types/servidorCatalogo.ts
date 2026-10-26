// Contratos de app/schemas/catalogo.py y app/schemas/favoritos.py de ov_backend (F06: separados de servidor.ts,
// que los reexporta).
export type TipoInstitucionServidor = 'UNIVERSIDAD' | 'INSTITUTO' | 'FFAA_POLICIA'
export type GestionInstitucion = 'PUBLICA' | 'PRIVADA'
export type TipoFavorito = 'CARRERA' | 'OCUPACION' | 'INSTITUCION' | 'FICHA' | 'TESTIMONIO'
export type FamiliaPublica = { codigo: string; nombre: string }
export type UbicacionPublica = { codigo: string; nombre: string }
export type CarreraResumen = {
  codigo: string
  nombre: string
  familia: FamiliaPublica
  riasec: string[]
  es_favorita: boolean
}
export type OcupacionResumen = { codigo: string; codigo_onet: string; titulo: string; riasec: string[]; es_favorita: boolean }
export type InstitucionResumen = {
  codigo: string
  nombre: string
  tipo: TipoInstitucionServidor
  gestion: GestionInstitucion | null
  ubicacion: UbicacionPublica
  es_favorita: boolean
}
export type RangoIngresoPublico = { minimo: number; maximo: number | null; porcentaje: number }
export type IngresoPublico = { promedio_mensual: number; fuente: string; anio: number; rangos: RangoIngresoPublico[] }
export type CarreraDetalle = CarreraResumen & {
  descripcion: string | null
  duracion: string | null
  ocupaciones: OcupacionResumen[]
  instituciones: InstitucionResumen[]
  ingreso: IngresoPublico | null
}
export type OcupacionDetalle = OcupacionResumen & {
  descripcion: string | null
  lugares_trabajo: string | null
  conocimientos: string[]
  habilidades: string[]
  carreras: CarreraResumen[]
}
export type InstitucionDetalle = InstitucionResumen & {
  descripcion: string | null
  pagina_web: string | null
  carreras: CarreraResumen[]
}
// F06: los listados se paginan; `total` cuenta lo filtrado.
export type Pagina<T> = { total: number; items: T[] }
// HU-042: `codigo` nulo solo si el catálogo no tiene otra que la actual.
export type Inesperada = { codigo: string | null; revisitando: boolean }
export type FavoritosCuenta = {
  carreras: CarreraResumen[]
  ocupaciones: OcupacionResumen[]
  instituciones: InstitucionResumen[]
}
