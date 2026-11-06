// Copia de `app/schemas/testimonios.py`. Aparte de servidor.ts por tamaño; servidor.ts lo reexporta.
import type { EstadoDisponibilidad } from './servidor'

export type TestimonioEstado = {
  codigo: string
  titulo: string
  estado: EstadoDisponibilidad
  visto: boolean
  pista: string | null
  descripcion: string | null
  video_id: string | null
  inicio: number | null
  fin: number | null
  // Ajustes Central (7): quién lo cuenta (solo disponible) y su origen, caso o actividad (siempre; nunca los dos).
  persona: string | null
  ocupacion: { codigo: string; titulo: string } | null
  contexto: string | null
  cita: string | null
  caso: { codigo: string; titulo: string } | null
  actividad: { codigo: string; titulo: string } | null
  caso_disponible: boolean
  actividad_disponible: boolean
  es_favorita: boolean
}
