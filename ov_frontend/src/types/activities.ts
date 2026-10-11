import type { ChallengeResult } from './challenges'
/* =====================================================================
 * MODELO DE DATOS v2 — Plataforma de orientación vocacional (prototipo)
 *
 * Cambios respecto a v1:
 *  - NodoEleccion: respuestas tipo RPG que no son ítems ni retos (no se evalúan).
 *  - NodoItem: etiqueta de encuadre ("Para conocerte mejor:").
 *  - Actividad.presentacion: "narrativa" | "directa" (tests sin diálogo).
 *  - NodoDiapositiva: contenido por BLOQUES (párrafo, lista, destacado,
 *    comparación mito/realidad, pasos, fuente) en vez de un solo cuerpo.
 *  - NodoPregunta: formato V/F, explicación tras responder, qué hacer al
 *    agotar pistas.
 *  - Plantilla de registro: el front dibuja una matriz (línea de tiempo,
 *    FODA, tabla) pero por detrás cada celda es una consigna normal.
 *  - Recompensa: afinidad con la aldea.
 * ===================================================================== */

export type ID = string
export type FechaISO = string

/* =====================================================================
 * A) CONTENIDO
 * ===================================================================== */

export interface Personaje {
  id: ID
  nombre: string
  rol: 'companero' | 'npc' | 'narrador'
  descripcion: string // para el equipo de diseño, no se muestra
  ubicacion?: string // "Molino", "Plaza", "Río"...
  avatarUrl: string
  expresiones?: Record<string, string>
}

export interface Recurso {
  id: ID
  titulo: string
  tipo: 'ficha' | 'video' | 'lectura' | 'enlace' | 'audio'
  url?: string
  contenido?: string // markdown (fichas resumen)
  fuente?: string
  resumen?: string
  descripcion?: string
  formatoArchivo?: 'pdf' | 'archivo'
  guardableEnRecursos: boolean // aparece en la sección Recursos / favoritos
}

/* ---------- Instrumentos ---------- */

export type FormatoRespuesta =
  | { tipo: 'si_no'; etiquetas: { si: string; no: string } }
  | { tipo: 'likert'; puntos: number; etiquetas: string[] }
  | { tipo: 'opcion_unica'; opciones: { valor: string; texto: string }[] }

export interface ItemInstrumento {
  id: ID
  codigo: string // numeración original del instrumento
  texto: string // redacción oficial (lo que se muestra)
  formato: FormatoRespuesta
}

export type Visibilidad = 'estudiante_orientadora' | 'estudiante_orientadora_padres' | 'solo_estudiante'

export interface Instrumento {
  id: ID
  nombre: string
  version: string
  items: ItemInstrumento[]
  clave: {
    dimensiones: { id: ID; nombre: string }[]
    asignacion: { itemId: ID; dimensionId: ID; valorQueSuma: string | number }[]
  }
  visibilidad: Visibilidad
}

/* ---------- Bloques de contenido (diapositivas) ---------- */

export type BloqueContenido =
  | { tipo: 'parrafo'; texto: string }
  | { tipo: 'lista'; titulo?: string; items: string[]; ordenada?: boolean }
  | { tipo: 'destacado'; texto: string; variante: 'dato' | 'idea_clave' | 'alerta' }
  | {
      tipo: 'comparacion'
      izquierda: { titulo: string; texto: string }
      derecha: { titulo: string; texto: string }
    }
  | { tipo: 'pasos'; titulo?: string; pasos: { titulo: string; texto: string }[] }
  | { tipo: 'reflexion'; texto: string } // pregunta abierta, no se responde
  | { tipo: 'fuente'; texto: string; url?: string }
  | { tipo: 'tabla'; titulo?: string; columnas: string[]; filas: string[][]; nota?: string }

/* ---------- Nodos ---------- */

export interface NodoBase {
  id: ID
  transicion?: string
  nuevoMomento?: boolean
}

export interface NodoDialogo extends NodoBase {
  tipo: 'dialogo'
  hablanteId: ID
  texto: string
  expresion?: string
}

/** Respuesta RPG del jugador. No se evalúa. Por defecto no se guarda. */
export interface NodoEleccion extends NodoBase {
  tipo: 'eleccion'
  enunciado?: string
  nota?: string
  opciones: {
    id: ID
    texto: string
    reaccion?: NodoDialogo[] // si no hay, se sigue con el siguiente nodo
  }[]
  registrar: boolean // true solo si la elección aporta información útil
}

export interface NodoDiapositiva extends NodoBase {
  tipo: 'diapositiva'
  etiqueta?: string
  presentadorId?: ID
  titulo: string
  bloques: BloqueContenido[]
  mediaUrl?: string
  recursoIds?: ID[] // "Profundizar"
}

export interface NodoPregunta extends NodoBase {
  tipo: 'pregunta'
  hablanteId: ID
  formato: 'opcion_unica' | 'opcion_multiple' | 'verdadero_falso'
  enunciado: string
  opciones: {
    id: ID
    texto: string
    correcta: boolean
    retroalimentacion: string // por qué esta opción es / no es
    explicacion?: string
    tambienEra?: string
  }[]
  explicacion: string // se muestra al acertar (refuerza el contenido)
  bloqueante: boolean
  pistas: NodoDialogo[] // una por intento fallido (normalmente del compañero)
  alAgotarPistas: 'revelar_y_continuar' | 'reintentar'
}

export interface NodoItem extends NodoBase {
  tipo: 'item'
  instrumentoId: ID
  itemId: ID
  hablanteId: ID
  etiqueta?: string // "Para conocerte mejor:"
  reacciones?: Record<string, NodoDialogo[]> // clave = valor de respuesta
}

export interface NodoConsigna extends NodoBase {
  tipo: 'consigna'
  hablanteId?: ID
  etiqueta?: string // texto corto para celdas de plantilla
  premisa: string
  ayuda?: string
  placeholder?: string
  entregable: EspecEntregable
  obligatoria: boolean
  visibilidad: Visibilidad
  slot?: string // ubicación en la plantilla: "col.fila"
}

export type EspecEntregable =
  | { tipo: 'texto'; minCaracteres?: number; maxCaracteres?: number }
  | { tipo: 'archivo'; formatos: string[]; maxArchivos: number; maxMB: number }
  | { tipo: 'opcion'; opciones: string[]; multiple: boolean }

export interface NodoResultado extends NodoBase {
  tipo: 'resultado'
  hablanteId: ID
  instrumentoId: ID
}

export type Nodo =
  NodoDialogo | NodoEleccion | NodoDiapositiva | NodoPregunta | NodoItem | NodoConsigna | NodoResultado

/* ---------- Plantillas de registro ----------
 * Solo afectan al FRONT. El backend sigue viendo consignas sueltas.
 * FODA = matriz 2x2; línea de tiempo = matriz con columnas temporales.
 */
export interface PlantillaMatriz {
  tipo: 'matriz'
  estilo: 'linea_tiempo' | 'foda' | 'tabla'
  columnas: { id: ID; etiqueta: string; subtitulo?: string }[]
  filas: { id: ID; etiqueta: string; icono?: string }[]
  // cada celda la ocupa una consigna con slot "columnaId.filaId"
  consignasFuera?: ID[] // consignas que se muestran debajo de la matriz
  alternativa?: {
    // entregar todo en un archivo (hecho a mano)
    nodoId: ID // consigna tipo archivo
    reemplazaSlots: boolean // si se usa, las celdas dejan de ser obligatorias
    textoBoton: string
  }
}

export type Plantilla = PlantillaMatriz | { tipo: 'secuencial' } // secuencial = una consigna tras otra

/* ---------- Actividad ---------- */

export type TipoActividad = 'encuentro' | 'registro' | 'instrumento'

export const NODOS_PERMITIDOS: Record<TipoActividad, Nodo['tipo'][]> = {
  encuentro: ['dialogo', 'eleccion', 'diapositiva', 'pregunta'],
  registro: ['dialogo', 'eleccion', 'consigna'],
  instrumento: ['dialogo', 'eleccion', 'item', 'resultado'],
}

export interface Actividad {
  id: ID
  codigo?: string
  tipo: TipoActividad
  audiencia?: 'estudiante' | 'apoderado'
  titulo: string
  subtitulo?: string
  bloque: number
  orden: number
  obligatoria: boolean
  requisitos: ID[]
  ubicacion?: string
  duracionEstimadaMin: number
  personajeIds: ID[]
  objetivoAprendizaje?: string // encuentros: qué debe saber al terminar
  // Solo instrumentos. En "directa" el front renderiza únicamente nodos
  // item y resultado (se omiten diálogo, elección y reacciones).
  presentacion?: 'narrativa' | 'directa'
  plantilla?: Plantilla // solo registros
  nodos: Nodo[]
  recompensa?: {
    afinidad?: number
    piezaLlave?: ID
    recursoIds?: ID[]
    mensajeFin?: string
  }
  siguienteSugerida?: ID
  promptDiario?: string
}

export interface ContenidoActividad extends Actividad {
  mapa?: {
    x: number
    y: number
    etiqueta?: string
    icono: 'informativa' | 'test' | 'registro'
  }
}

/* =====================================================================
 * B) REGISTROS DEL ESTUDIANTE
 * ===================================================================== */

export interface ProgresoActividad {
  estudianteId: ID
  actividadId: ID
  estado: 'no_iniciada' | 'en_curso' | 'completada'
  nodoActualId?: ID
  iniciadaEn?: FechaISO
  completadaEn?: FechaISO
}

export interface RespuestaItem {
  estudianteId: ID
  instrumentoId: ID
  itemId: ID
  aplicacion: 'unica' | 'entrada' | 'salida'
  valor: string | number
  actividadId: ID
  respondidaEn: FechaISO
}

export interface RespuestaEleccion {
  // solo si NodoEleccion.registrar = true
  estudianteId: ID
  actividadId: ID
  nodoId: ID
  opcionId: ID
  respondidaEn: FechaISO
}

export interface IntentoPregunta {
  estudianteId: ID
  actividadId: ID
  nodoId: ID
  opcionIds: ID[]
  correcta: boolean
  numeroIntento: number
  revelada: boolean // true si se mostró la respuesta al agotar pistas
  respondidaEn: FechaISO
}

export interface Archivo {
  id: ID
  nombre: string
  mime: string
  tamanoBytes: number
  url: string
}

export interface Entregable {
  id: ID
  estudianteId: ID
  actividadId: ID
  nodoId: ID
  contenido:
    | { tipo: 'texto'; texto: string }
    | { tipo: 'archivo'; archivos: Archivo[] }
    | { tipo: 'opcion'; seleccion: string[] }
  version: number // ACT-18 vuelve a editar la línea de tiempo -> v2
  enviadoEn: FechaISO
}

export interface ResultadoInstrumento {
  estudianteId: ID
  instrumentoId: ID
  aplicacion: 'unica' | 'entrada' | 'salida'
  puntajes: { dimensionId: ID; puntaje: number }[]
  versionClave: string
  calculadoEn: FechaISO
}

export interface Afinidad {
  // acumulado narrativo
  estudianteId: ID
  total: number
  movimientos: { actividadId: ID; cantidad: number; fecha: FechaISO }[]
}

export interface JourneyState {
  version: 2
  progress: Record<string, ProgresoActividad>
  items: RespuestaItem[]
  choices: RespuestaEleccion[]
  attempts: IntentoPregunta[]
  submissions: Entregable[]
  results: ResultadoInstrumento[]
  rewards: { actividadId: string; cantidad: number; fecha: string }[]
  pieces: string[]
  resources: string[]
  drafts: Record<string, string>
  challengeResults?: ChallengeResult[]
  readResourceIds?: string[]
}
