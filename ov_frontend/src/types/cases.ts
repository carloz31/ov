type ForestFireProfessional = {
  id: string
  name: string
  personName: string
  occupationId: string
  description: string
  skills: string[]
  // Ajuste carga-casos (api): los conocimientos de la ocupación del servidor, para la hoja de vida.
  knowledge?: string[]
}

type ForestFireCommunityMessage = {
  id: string
  speaker: string
  context: string
  message: string
  position: { x: number; y: number }
  summary: string
}

type ForestFireProblem = {
  id: string
  title: string
  detail: string
  resultNarrative: string
  expectedProfessionalIds: string[]
  professionalContributions: Record<string, string>
  missingContributionNarratives: Record<string, string>
}

type ForestFirePhase = {
  id: string
  number: number
  name: string
  subtitle: string
  listenPrompt: string
  listenPromptMobile: string
  backgroundImage: string
  // Ajuste carga-casos: imagen que se ve si `backgroundImage` no existe.
  backgroundFallback?: string
  backgroundPosition: string
  messages: ForestFireCommunityMessage[]
  problems: ForestFireProblem[]
}

type ForestFireAssignments = Record<string, Record<string, string[]>>

type ForestFireWordCloudEntry = {
  occupationId: string
  mentions: number
  comments: string[]
}

// Ajuste carga-casos: un caso de la Central como JSON (`src/data/cases/plataforma/<id>.json`). Lo que tiene el
// servidor (título, escala, estado) no va aquí. Formato en ov_backend/docs/sistema/integracion.md.
type CasoJson = {
  id: string
  tematica: string
  intro: { narrativa: string[]; imagen: string; alerta: string }
  presupuesto: number
  profesionales: { onet: string; persona: string }[]
  fases: {
    id: string
    nombre: string
    subtitulo: string
    escuchar: { texto: string; textoMovil: string }
    fondo: { imagen: string; posicion: string }
    mensajes: {
      id: string
      quien: string
      contexto: string
      mensaje: string
      resumen: string
      posicion: { x: number; y: number }
    }[]
    problemas: {
      id: string
      titulo: string
      detalle: string
      resultado: string
      necesidades: { onet: string; aporte: string; siFalta: string }[]
    }[]
  }[]
}

// El caso que juega la Central: el incendio en local; en api, un JSON con las ocupaciones y la escala del servidor.
type CasoJugable = {
  id: string
  titulo: string
  tematica: string
  intro: { narrativa: string[]; imagen: string; imagenRespaldo?: string; alerta: string; llama?: boolean }
  presupuesto: number
  maximo: number
  minimo: number
  phases: ForestFirePhase[]
  professionals: ForestFireProfessional[]
}

export type {
  CasoJson,
  CasoJugable,
  ForestFireAssignments,
  ForestFireCommunityMessage,
  ForestFirePhase,
  ForestFireProblem,
  ForestFireProfessional,
  ForestFireWordCloudEntry,
}
