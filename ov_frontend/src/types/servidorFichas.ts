import type { ContenidoEstado } from './servidor'

// GET /cuentas/{c}/fichas (ajuste mochila): lo de la tarjeta, solo con la ficha obtenida (nulos si está
// bloqueada); `visto` y `es_favorita`, por ficha. El contenido va en FichaDetalle.
export type FichaCuenta = ContenidoEstado & {
  tema: string | null
  descripcion: string | null
  obtenida_en: string | null
  visto: boolean
  es_favorita: boolean
  actividad: { codigo: string; titulo: string } | null
  tramo: { codigo: string; nombre: string; numero: number } | null
}
// GET /cuentas/{c}/fichas/{codigo}: el texto de una ficha obtenida, que el modal pide al abrirse.
export type FichaDetalle = { codigo: string; titulo: string; contenido: string }
