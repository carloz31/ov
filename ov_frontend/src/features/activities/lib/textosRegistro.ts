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

// Ajuste front de registros (lote 2, §6): los rótulos de las formas de eco. La línea del resultado de test se elige
// aquí, por el nombre que entrega el backend, en una sola tabla.
const LINEA_RESULTADO: Record<string, string> = { 'Tu test de intereses': 'Tu código, en orden' }
export const ECOS = {
  planes: ['Tu Plan A', 'Tu Plan B'],
  proyecto: 'Tu proyecto hoy',
  hoy: 'Hoy',
  porQue: 'Por qué:',
  camino: 'Camino:',
  ideaFue: 'La idea fue',
  hecho: 'hecho',
  hechos: 'hechos',
  pendiente: 'pendiente',
  pendientes: 'pendientes',
  pasoHecho: 'Hecho',
  pasoPendiente: 'Pendiente',
  verCompleto: 'ver completo',
  verPasos: (n: number) => `ver los ${n} pasos`,
  verMenos: 'ver menos',
  lineaResultado: (nombre?: string) => (nombre && LINEA_RESULTADO[nombre]) || 'Lo que salió más alto',
} as const

// Ajuste front de registros (lote 2, §5): la elección con varias «Otra» y el selector de piezas.
export const ELECCION = {
  agregarOtra: (etiqueta: string) => `+ ${etiqueta}`,
  cual: '¿Cuál?',
  cualPuesto: (puesto: number) => `${puesto}.º · ¿Cuál?`,
  eligeUna: 'Elige una',
  cerrar: 'Cerrar',
  verPieza: 'ver completa',
  segundo: '2.º lugar',
  tercero: '3.er lugar',
} as const
