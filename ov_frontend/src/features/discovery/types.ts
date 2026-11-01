import type { HelenaDimension, TipoResultadoHelena } from '@/types/profile'
import type { InstrumentPageId } from '@/types/discovery'

export type DimensionPagina = HelenaDimension
export type FilaResumenPagina = {
  codigo: string
  nombre: string
  descripcion: string
  marcador: 'letra' | 'inteligencia'
}
export type ContenidoPagina = {
  texto: string
  icono: 'perfil' | 'ocupaciones' | 'carreras' | 'ideas'
}
export type ResumenPagina = {
  rotulo: string
  filas: FilaResumenPagina[]
  titulo?: string
  cierre: string
  contenidos: ContenidoPagina[]
}
export type OcupacionResultado = {
  clave: string
  codigo: string | null
  titulo: string
  ajuste: string
  descripcion?: string
  letras?: string[]
  compartidas?: number
  href?: string
  favorita: boolean
}
export type CarreraResultado = {
  codigo: string
  nombre: string
  familia: string
  duracion?: string
  via: { codigo_onet: string; titulo: string }[]
  favorita: boolean
  plan?: string
}
export type ResumenResultado = {
  tipoResultado: TipoResultadoHelena
  // Ajuste carga-instrumentos: qué página del libro es, la lectura del instrumento y, en api, el puntaje
  // visual (0–100 sin «%») con las cuatro piezas de cada dimensión.
  pagina?: InstrumentPageId
  lectura?: string
  puntajeVisual: boolean
  dimensiones: DimensionPagina[]
  ordenadas: DimensionPagina[]
  protagonistas: DimensionPagina[]
  perfilPlano: boolean
  hayEmpate: boolean
  secciones: { ocupaciones: boolean; carreras: boolean; siguientesPasos: boolean }
}
