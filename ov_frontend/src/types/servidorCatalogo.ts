// Contratos de app/schemas/catalogo.py y app/schemas/favoritos.py de ov_backend (F06: separados de servidor.ts,
// que los reexporta).
export type TipoInstitucionServidor = 'UNIVERSIDAD' | 'INSTITUTO' | 'FFAA_POLICIA'
export type GestionInstitucion = 'PUBLICA' | 'PRIVADA'
export type TipoFavorito = 'CARRERA' | 'OCUPACION' | 'INSTITUCION' | 'FICHA' | 'TESTIMONIO' | 'ENTREVISTA'
// Campo detallado CINE; el área es su campo específico (2 cifras).
export type FamiliaPublica = { codigo: string; nombre: string; area_codigo: string; area_nombre: string }
// Ajuste resultados-intereses: la familia en una tarjeta, con sus tipos y cuántas carreras tiene.
export type FamiliaResumida = FamiliaPublica & {
  descripcion: string | null
  tipos: TipoInstitucionServidor[]
  total_carreras: number
}
// Solo para el estudiante y solo si la ocupación está entre sus afines.
export type Afinidad = { parecido: number; banda: 'MUY_AFIN' | 'AFIN' | 'CERCANA' }
export type UbicacionPublica = { codigo: string; nombre: string }
// Grupo mayor O*NET (2 cifras); ya no filtra el catálogo, solo nombra el grupo de una ocupación.
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
  // Su área es la de la ocupación; nula si la curaduría no le da familia.
  familia_principal: FamiliaPublica | null
  // Solo al filtrar por familia: si la tiene como principal o como secundaria.
  via_familia?: 'PRINCIPAL' | 'SECUNDARIA' | null
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
export type OcupacionDeFamilia = { codigo: string; titulo: string; riasec: string[]; afinidad: Afinidad | null }
// La relación carrera–ocupación es por familia: vía principal y vía alternativa.
export type OcupacionesDeLaFamilia = { principales: OcupacionDeFamilia[]; secundarias: OcupacionDeFamilia[] }
export type CarreraDetalle = CarreraResumen & {
  descripcion: string | null
  // Nombre del programa CINE, solo si difiere del de la carrera.
  nombre_cine: string | null
  ambito_laboral: string[]
  ocupaciones_de_la_familia: OcupacionesDeLaFamilia
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
  familia_principal: FamiliaResumida | null
  programa_ejemplo: ProgramaEjemplo | null
  familias_secundarias: FamiliaSecundaria[]
  otras_ocupaciones_de_la_familia: OcupacionEnlace[]
  // Las que llegan a la familia principal, como principal o secundaria (el filtro del catálogo).
  total_ocupaciones_familia: number
  afinidad: Afinidad | null
}
export type ProgramaEjemplo = { codigo: string; nombre: string; tipo: TipoInstitucionServidor; duracion: string | null }
export type FamiliaSecundaria = { codigo: string; nombre: string; total_carreras: number; programas: string[] }
export type OcupacionEnlace = { codigo: string; titulo: string }
// GET /catalogo/familias/{codigo}: la ficha de la familia elegida en el catálogo de carreras.
export type FamiliaFicha = FamiliaPublica & {
  descripcion: string | null
  carreras_por_tipo: Partial<Record<TipoInstitucionServidor, number>>
  total_carreras: number
  ocupaciones_principales: number
  ocupaciones_secundarias: number
  ingresos: { tipo: TipoInstitucionServidor; promedio_jovenes: number }[]
  vecinas: FamiliaPublica[]
  // Solo el estudiante: su posición (1–5) entre las familias recomendadas por su test.
  recomendada_posicion: number | null
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
