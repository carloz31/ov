import type { ConversacionesCuenta } from '@/types/servidor'
import type { RolConversacion } from '@/lib/servidor/adaptadoresConversaciones'
import type { TextosFamilia } from './data/textosFamilia'

// F08: lo que las vistas de Familia (estudiante) y Conversaciones (apoderado) reciben de su hook. El rol solo
// cambia estilo y textos; las pantallas son las mismas.
export type ResultadoAccionFamilia = { ok: true } | { ok: false; mensaje: string }
export type RutasFamilia = {
  lista: string
  carta: string
  regalo: string
  conversacion: (codigo: string) => string
  // Estudiante: el mapa (temas por abrir) y el diario (entrada abierta al conversar).
  mapa?: string
  diario?: string
}
export type AvisoFamilia = { id: number; titulo: string; descripcion?: string; error: boolean }
export type ModeloFamilia = {
  rol: RolConversacion
  textos: TextosFamilia
  datos: ConversacionesCuenta | null
  estado: 'listo' | 'cargando' | 'error'
  mensajeError?: string
  reintentar: () => void
  // 'carta' o el código de la conversación en envío.
  enviando: string | null
  guardarCarta: (texto: string) => Promise<ResultadoAccionFamilia>
  responder: (conversacion: string, texto: string) => Promise<ResultadoAccionFamilia>
  rutas: RutasFamilia
  // Ayuda de la sección (el «?» de Responder); nulo si el rol no la tiene.
  abrirAyuda: (() => void) | null
  // Las ideas de la carta (la guía de Lumi).
  abrirIdeas: () => void
  // El aviso (toast) de la última acción; el inicial lo deja la navegación (la carta guardada vuelve a la lista).
  aviso: AvisoFamilia | null
  avisar: (aviso: Omit<AvisoFamilia, 'id'>) => void
  cerrarAviso: () => void
}
export type EstadoNavegacionFamilia = { aviso?: Omit<AvisoFamilia, 'id'> }
