// Contratos de app/schemas/logros.py de ov_backend (ajuste pasaporte-perfil: separados de servidor.ts, que los reexporta).
export type GrupoInsigniaPublico = { codigo: string; nombre: string; orden: number }
// Una oculta no obtenida llega enmascarada (`???`), pero conserva `grupo`, `orden` y `pista`.
export type InsigniaEstado = {
  codigo: string
  nombre: string
  descripcion: string | null
  requisito: string | null
  estado: 'BLOQUEADA' | 'OBTENIDA'
  grupo: GrupoInsigniaPublico
  orden: number
  pista: string | null
  obtenida_en: string | null
}
export type NivelEstado = {
  numero: number
  titulo: string
  descripcion: string | null
  estado: 'BLOQUEADO' | 'OBTENIDO'
}
// `afinidad`: solo el estudiante (F05). `vitrina`: códigos que la cuenta muestra, en orden (hasta 3).
export type LogrosCuenta = {
  insignias: InsigniaEstado[]
  niveles: NivelEstado[]
  vitrina: string[]
  afinidad?: number | null
}
export type VitrinaEntrada = { cuenta: string; codigos: string[] }
export type VitrinaCuenta = { vitrina: string[] }
