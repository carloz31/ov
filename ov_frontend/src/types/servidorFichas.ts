import type { ContenidoEstado } from './servidor'

// GET /cuentas/{c}/fichas (ajuste mochila): el detalle solo con la ficha obtenida (nulos si está bloqueada);
// `visto` y `es_favorita`, por ficha.
export type FichaCuenta = ContenidoEstado & {
  tema: string | null
  descripcion: string | null
  contenido: string | null
  obtenida_en: string | null
  visto: boolean
  es_favorita: boolean
  actividad: { codigo: string; titulo: string } | null
  tramo: { codigo: string; nombre: string; numero: number } | null
}
