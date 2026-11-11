// Ajuste front de registros (lote 1, §7): los textos del front de los registros, en un solo lugar. Los mensajes
// de sensible, emocional y fallo, y la repregunta, vienen del backend. Lumi escucha: ningún texto dice que «lee».

// Frases de confirmación tras guardar un ítem; rotan por el ítem.
export const CONFIRMACIONES = [
  'Listo, quedó en tu registro.',
  'Anotado en tu registro.',
  'Ya está guardado. Sigamos.',
  'Queda en tu registro, tal como lo dijiste.',
  'Guardado. Vamos con lo que sigue.',
] as const
export const confirmacion = (indice: number) =>
  CONFIRMACIONES[((indice % CONFIRMACIONES.length) + CONFIRMACIONES.length) % CONFIRMACIONES.length]

export const QUEDO_CON_PISTA = 'Quedó guardado. Aún tengo algo que preguntarte sobre esto; puedes volver más adelante.'
export const ROTULO_PISTA_LECTURA = 'Lumi aún quiere saber'
export const ROTULO_PISTA_EDICION = 'Podrías contar más sobre esto'
export const AVISO_SIN_EVALUAR = 'Lumi no llegó a escuchar esta respuesta.'
// Decisión del usuario: sin `{eco}` (el backend solo dice que algo cambió).
export const AVISO_ECO_CAMBIADO =
  'Esto lo respondiste antes de que cambiara algo de lo que habías dicho. Puede que hoy lo veas distinto.'
export const ROTULO_EDICION = 'Modificando tu respuesta'
export const TU_RESPUESTA = 'Tu respuesta'
export const VER_COMPLETA = 'ver completa'
export const PIE_REGISTRO = 'Lo ven tú y tu orientadora'

export const BOTONES = {
  anterior: 'Anterior',
  enviar: 'Enviar',
  continuar: 'Continuar',
  modificar: 'Modificar',
  cancelar: 'Cancelar',
  responder: 'Responder',
  volverAEnviar: 'Volver a enviar',
  seguirSinResponder: 'Seguir sin responder',
} as const

// Errores de selección, comunes a todos los registros.
export const ERROR_ELECCION = 'Elige una opción para continuar.'
export const ERROR_OTRA = 'Escribe cuál es tu otra opción.'
export const ETIQUETA_OTRA = 'Otra'
