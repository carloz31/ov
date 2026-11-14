// app/schemas/panel.py · Panel del salón de la orientadora (ajuste panel-salon): GET /cuentas/{c}/panel/*. Todo
// conteo es de estudiantes distintos; nada del diario ni de registros.
export type SalonPanel = { codigo: string; nombre: string }
export type IndicadoresPanel = {
  ingresaron: number
  dias_ingreso: number
  test_listo: number
  test_por_revisar: number
  test_sin_terminar: number
  con_plan_a: number
  con_tres_planes: number
  familias_participando: number
  familias_ruta_completa: number
  familias_conversaron: number
}
export type AlertaPanel = {
  codigo: string
  nombre: string
  descripcion: string | null
  cantidad: number
  nombres: string[] | null
}
export type GrupoAlertaPanel = { codigo: string; nombre: string; alertas: AlertaPanel[] }
export type AvisosPanel = { con_avisos: number; grupos: GrupoAlertaPanel[] }
export type EtiquetaCuestionario = 'REQUISITO' | 'REQUISITO_ALGUNOS' | 'CAMINO' | 'OPCIONAL'
export type EstadoTest = 'LISTO' | 'POR_REVISAR' | 'EN_CURSO' | 'SIN_EMPEZAR'
export type TestPanel = {
  instrumento: string
  nombre: string
  etiqueta: EtiquetaCuestionario
  listo: number
  por_revisar: number
  perfil_plano: number
  prisa: number
  en_curso: number
  sin_empezar: number
}
export type CuestionarioPanel = {
  aplicacion: string
  nombre: string
  etiqueta: EtiquetaCuestionario
  n: number
}
// `codigo`: SIN_EMPEZAR, el de un bloque del camino o TERMINO.
export type TramoPanel = { codigo: string; nombre: string; cantidad: number }
export type DetenidosPanel = { actividad: string; titulo: string; cantidad: number; dias: number }
export type BandaSeguridad = {
  codigo: 'BAJA' | 'MEDIA' | 'ALTA'
  desde: number
  hasta: number
  cantidad: number
}
export type SeguridadPanel = { bandas: BandaSeguridad[]; sin_senales: number }
export type SeguimientoPanel = {
  fecha: string
  salon: SalonPanel | null
  total_estudiantes: number
  indicadores: IndicadoresPanel
  avisos: AvisosPanel
  test: TestPanel
  cuestionarios: CuestionarioPanel[]
  tramos: TramoPanel[]
  detenidos: DetenidosPanel | null
  seguridad: SeguridadPanel
}
export type EstudiantePanel = { codigo: string; nombre: string; salon: string }

export type TipoFormacion = 'UNIVERSIDAD' | 'INSTITUTO' | 'FFAA_POLICIA'
export type GestionPanel = 'PUBLICA' | 'PRIVADA'
export type CarreraConPlanes = { nombre: string; cantidad: number }
type ConteosInteres = { en_planes: number; plan_a: number; solo_favoritos: number; total: number }
export type FilaArea = ConteosInteres & { codigo: string; nombre: string; carreras: CarreraConPlanes[] }
export type FilaInstitucion = ConteosInteres & {
  codigo: string
  nombre: string
  tipo: TipoFormacion
  gestion: GestionPanel | null
}
export type DesgloseFormacion = {
  tipo: TipoFormacion | null
  gestion: GestionPanel | null
  cantidad: number
}
export type FilaFormacion = { tipo: TipoFormacion; cantidad: number; desglose: DesgloseFormacion[] }
export type InteresesPanel = {
  con_planes: number
  con_favoritos: number
  areas: { filas: FilaArea[]; total: number }
  instituciones: { filas: FilaInstitucion[]; total: number; plan_a_sin_institucion: number }
  formacion: { con_plan_a: number; filas: FilaFormacion[] }
  complicaciones: { filas: { texto: string; cantidad: number }[]; otra: number }
  frente_test: {
    base: number
    coinciden: number
    no_coinciden: number
    codigos: { letra: string; nombre: string; cantidad: number }[]
    resultados_listos: number
  }
}
export type PaginaAreasPanel = { total: number; items: FilaArea[]; tipos: TipoFormacion[] }
export type PaginaInstitucionesPanel = {
  total: number
  items: FilaInstitucion[]
  tipos: TipoFormacion[]
  plan_a_sin_institucion: number
}
// Columna de orden: `<columna>` ascendente o `-<columna>` descendente.
export type ColumnaInteres = 'nombre' | 'en_planes' | 'plan_a' | 'solo_favoritos' | 'total'
export type ConjuntoPanel =
  | 'avisos'
  | 'alerta'
  | 'test'
  | 'tramo'
  | 'detenidos'
  | 'seguridad_baja'
  | 'area'
  | 'institucion'
  | 'plan_fuera_test'
