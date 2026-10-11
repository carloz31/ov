import type { Actividad } from '@/types/activities'
export type ChallengeQuestion = {
  id: string
  enunciado: string
  opciones: { id: string; texto: string }[]
  correcta: string
  explicacion: string
}
export type Challenge = Omit<Actividad, 'tipo' | 'requisitos'> & {
  tipo: 'desafio'
  codigo: string
  nombre: string
  presentacionEnemigo: string
  ilustracion: string
  vidasEnemigo: number
  vidasEstudiante: number
  opcionesPorPregunta: number
  banco: ChallengeQuestion[]
  requisitos: { tipo: 'ficha' | 'actividad'; id: string; titulo: string }[]
  recompensa: NonNullable<Actividad['recompensa']> & { titulo: string; lugar: string; href: string }
  logroOculto?: { codigo: string; nombre: string }
}
export type ChallengeResult = {
  estudianteId: string
  actividadId: string
  fechaHora: string
  victoria: boolean
  aciertos: number
  preguntas: number
  vidasRestantes: number
  evento?: 'COMPLETA_ACTIVIDAD'
  logroOculto?: string
}
export type Battle = {
  questions: ChallengeQuestion[]
  index: number
  enemyLife: number
  sparks: number
  hits: number
  selected?: string
  answered: number
  finished: boolean
}
