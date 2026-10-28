import type { ConversacionCuenta, ConversacionesCuenta } from '@/types/servidor'

// F08 (spec §2): de los estados del servidor a pestañas, líneas de estado y puntos del regalo. Solo importa tipos.
export type RolConversacion = 'estudiante' | 'apoderado'
export type PestanaConversacion = 'te_toca' | 'esperando' | 'listas' | 'por_abrir'
export const ORDEN_PESTANAS: PestanaConversacion[] = ['te_toca', 'esperando', 'listas', 'por_abrir']

// El apoderado no tiene «Por abrir»: lo que su hijo no abrió lo puede adelantar desde «Te toca responder».
export function pestanaDe(
  conversacion: ConversacionCuenta,
  rol: RolConversacion,
): PestanaConversacion | null {
  switch (conversacion.estado) {
    case 'sin_responder':
    case 'te_toca':
      return 'te_toca'
    case 'esperando_al_otro':
      return 'esperando'
    case 'conversada':
      return 'listas'
    case 'bloqueada':
      return rol === 'estudiante' ? 'por_abrir' : null
  }
}

export type PestanaConContador = { pestana: PestanaConversacion; cantidad: number }
// Las pestañas del rol con su contador; «Por abrir», solo para el estudiante.
export function pestanasConversaciones(
  conversaciones: ConversacionCuenta[],
  rol: RolConversacion,
): PestanaConContador[] {
  return ORDEN_PESTANAS.filter((p) => rol === 'estudiante' || p !== 'por_abrir').map((pestana) => ({
    pestana,
    cantidad: conversaciones.filter((c) => pestanaDe(c, rol) === pestana).length,
  }))
}

// La primera pestaña con contenido va seleccionada; sin ninguna, la primera.
export function pestanaInicial(pestanas: PestanaConContador[]): PestanaConversacion {
  return (pestanas.find((p) => p.cantidad > 0) ?? pestanas[0]).pestana
}

export const conversacionesDePestana = (
  conversaciones: ConversacionCuenta[],
  rol: RolConversacion,
  pestana: PestanaConversacion,
) => conversaciones.filter((c) => pestanaDe(c, rol) === pestana)

// Un tema que el hijo aún no abrió: el apoderado puede adelantar su respuesta.
export const puedeAdelantar = (conversacion: ConversacionCuenta) =>
  conversacion.abierta_para_hijo === false && conversacion.estado === 'sin_responder'

// La línea de estado de la tarjeta. `otro`: «Tu familia» para el estudiante, el nombre del hijo para el apoderado.
export function lineaEstado(conversacion: ConversacionCuenta, otro: string): string {
  switch (conversacion.estado) {
    case 'sin_responder':
      return 'Nadie ha respondido aún'
    case 'te_toca':
      return `${otro} ya respondió`
    case 'esperando_al_otro':
      return 'Tu mirada ya está guardada'
    case 'conversada':
      return 'Las dos miradas están listas'
    case 'bloqueada':
      return conversacion.bloqueo_mensaje ?? ''
  }
}

// Avatares E/F: relleno = ya respondió.
export function respondieron(conversacion: ConversacionCuenta, rol: RolConversacion) {
  const yo = conversacion.mi_respuesta !== null
  const otro = conversacion.estado === 'te_toca' || conversacion.estado === 'conversada'
  return rol === 'estudiante' ? { estudiante: yo, familia: otro } : { estudiante: otro, familia: yo }
}

// Los puntos numerados del regalo: uno por conversación, lleno si ya está conversada.
export const puntosRegalo = (datos: ConversacionesCuenta) =>
  datos.conversaciones.map((c) => ({ numero: c.orden, lleno: c.estado === 'conversada' }))

// La pantalla de la sección: sin carta propia, la carta pendiente, nunca la lista.
export const pantallaSeccion = (datos: ConversacionesCuenta): 'carta_pendiente' | 'lista' =>
  datos.carta_pendiente ? 'carta_pendiente' : 'lista'

// La carta se edita hasta la entrega; después, solo lectura.
export const cartaEditable = (datos: ConversacionesCuenta) => !datos.cartas_disponibles

// Tras guardar una respuesta: con las dos, «Listas para conversar»; si no, «Esperando».
export const vistaTrasResponder = (conversacion: ConversacionCuenta | undefined) =>
  conversacion?.estado === 'conversada' ? 'lista' : 'esperando'
