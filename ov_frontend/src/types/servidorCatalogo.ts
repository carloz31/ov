// Contratos de app/schemas/catalogo.py y app/schemas/favoritos.py de ov_backend (F06: separados de servidor.ts,
// que los reexporta).
export type TipoInstitucionServidor = 'UNIVERSIDAD' | 'INSTITUTO' | 'FFAA_POLICIA'
export type GestionInstitucion = 'PUBLICA' | 'PRIVADA'
export type TipoFavorito = 'CARRERA' | 'OCUPACION' | 'INSTITUCION' | 'FICHA' | 'TESTIMONIO' | 'ENTREVISTA'
// Campo detallado CINE; el área es su campo de educación.
export type FamiliaPublica = { codigo: string; nombre: string; area_codigo: string; area_nombre: string }
export type UbicacionPublica = { codigo: string; nombre: string }
// Grupo mayor O*NET (2 cifras).
export type GrupoPublico = { codigo: string; nombre: string }
export type EstiloPublico = { codigo: string; nombre: string }
export type CarreraResumen = {
  codigo: string
  nombre: string
  tipo: TipoInstitucionServidor
  familia: FamiliaPublica
  duracion: string | null
  riasec: string[]
  es_favorita: boolean
}
export type OcupacionResumen = {
  codigo: string
  codigo_onet: string
  titulo: string
  resumen: string | null
  grupo: string
  riasec: string[]
  es_favorita: boolean
}
export type InstitucionResumen = {
  codigo: string
  nombre: string
  tipo: TipoInstitucionServidor
  gestion: GestionInstitucion | null
  ubicacion: UbicacionPublica
  distrito: string | null
  es_favorita: boolean
}
// Ingreso mensual en soles: promedio y extremos.
// `Tramo` en app/schemas/catalogo.py; aquí `TramoIngreso`, porque `Tramo` ya nombra los tramos del avance.
export type TramoIngreso = { promedio: number; minimo: number; maximo: number }
// `ubicacion` nula en el promedio nacional.
export type IngresoFamiliaPublico = { ubicacion: UbicacionPublica | null; jovenes: TramoIngreso; adultos: TramoIngreso }
// Ingresos de los egresados de la familia y el tipo de la carrera, no de la carrera exacta.
export type IngresoCarreraPublico = {
  fuente: string
  nacional: IngresoFamiliaPublico
  departamentos: IngresoFamiliaPublico[]
}
// `ingreso`: de los egresados de la institución en la familia de la carrera; nulo si no hay dato.
// F07b: `duracion_ciclos` de la carrera en esa institución, nula si no se conoce.
export type InstitucionEnCarrera = InstitucionResumen & { ingreso: TramoIngreso | null; duracion_ciclos: number | null }
export type CarreraEnInstitucion = CarreraResumen & { ingreso: TramoIngreso | null }
// Otras carreras del mismo tipo en la familia: cuántas y hasta 3 por nombre.
export type CarrerasParecidas = { total: number; carreras: CarreraResumen[] }
export type CarreraDetalle = CarreraResumen & {
  descripcion: string | null
  // Nombre del programa CINE, solo si difiere del de la carrera.
  nombre_cine: string | null
  ambito_laboral: string[]
  ocupaciones: OcupacionResumen[]
  instituciones: InstitucionEnCarrera[]
  ingreso: IngresoCarreraPublico | null
  parecidas: CarrerasParecidas
}
export type OcupacionDetalle = OcupacionResumen & {
  descripcion: string | null
  tambien_llamado: string[]
  // Preparación de 1 a 5.
  job_zone: number | null
  tareas: string[]
  personalidad: string | null
  estilos_trabajo: EstiloPublico[]
  conocimientos: string[]
  aptitudes: string[]
  // Cada dimensión RIASEC de 0 a 100.
  puntajes: Record<string, number>
  carreras: CarreraResumen[]
}
export type InstitucionDetalle = InstitucionResumen & {
  descripcion: string | null
  direccion: string | null
  pagina_web: string | null
  carreras: CarreraEnInstitucion[]
}
// F06: los listados se paginan; `total` cuenta lo filtrado y `total_dominio`, todo el catálogo.
export type Pagina<T> = { total: number; total_dominio: number; items: T[] }
// HU-042: `codigo` nulo solo si el catálogo no tiene otra que la actual.
export type Inesperada = { codigo: string | null; revisitando: boolean }
export type FavoritosCuenta = {
  carreras: CarreraResumen[]
  ocupaciones: OcupacionResumen[]
  instituciones: InstitucionResumen[]
}
