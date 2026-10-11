import { useSyncExternalStore } from 'react'
import type { Actividad, Entregable, NodoConsigna } from '@/types/activities'
import { applyCompletion, latestSubmission, studentId, validateSubmission } from '@/lib/activities/logic'
import { journeyEnServidor, updateJourney } from '@/store/journeyStore'
import type { FollowUpTurn } from '../lib/followUpService'
import { answeredTurns, templateCondenser, type ResponseCondenser } from '../lib/responseCondenser'

export type FollowUpRecord = {
  textoInicial: string
  versionInicial: number
  turnos: FollowUpTurn[]
  versionCondensada?: number
  condensadaEn?: string
}
export type FollowUpState = { version: 1; records: Record<string, FollowUpRecord> }
const storageKey = 'ov.student-followups.v1'
export const initialFollowUpState = (): FollowUpState => ({ version: 1, records: {} })

function validTurn(turn: FollowUpTurn): boolean {
  return (
    !!turn &&
    (turn.orden === 1 || turn.orden === 2) &&
    typeof turn.pregunta === 'string' &&
    typeof turn.omitida === 'boolean' &&
    typeof turn.creadaEn === 'string' &&
    (turn.respuesta === undefined || typeof turn.respuesta === 'string') &&
    (turn.respondidaEn === undefined || typeof turn.respondidaEn === 'string')
  )
}
function read(): FollowUpState {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) ?? 'null')
    if (
      value?.version !== 1 ||
      !value.records ||
      typeof value.records !== 'object' ||
      Array.isArray(value.records)
    )
      return initialFollowUpState()
    const records = Object.fromEntries(
      Object.entries(value.records).filter(([key, record]) => {
        const entry = record as FollowUpRecord
        return (
          key.includes('/') &&
          !!entry &&
          typeof entry.textoInicial === 'string' &&
          Number.isInteger(entry.versionInicial) &&
          entry.versionInicial > 0 &&
          Array.isArray(entry.turnos) &&
          entry.turnos.length <= 2 &&
          entry.turnos.every(validTurn) &&
          entry.turnos.every((turn, index) => turn.orden === index + 1) &&
          (entry.versionCondensada === undefined ||
            (Number.isInteger(entry.versionCondensada) && entry.versionCondensada > entry.versionInicial)) &&
          (entry.condensadaEn === undefined || typeof entry.condensadaEn === 'string')
        )
      }),
    ) as Record<string, FollowUpRecord>
    return { version: 1, records }
  } catch {
    return initialFollowUpState()
  }
}
let state = read()
const listeners = new Set<() => void>()
function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
export function updateFollowUps(update: (current: FollowUpState) => FollowUpState): boolean {
  const next = update(state)
  if (next === state) return true
  try {
    localStorage.setItem(storageKey, JSON.stringify(next))
    state = next
  } catch {
    return false
  }
  listeners.forEach((listener) => listener())
  return true
}
export const useFollowUps = () => useSyncExternalStore(subscribe, () => state)
export const getFollowUpRecord = (key: string) => state.records[key]
export function setFollowUpRecord(key: string, record: FollowUpRecord) {
  return updateFollowUps((current) => ({ ...current, records: { ...current.records, [key]: record } }))
}
if (typeof window !== 'undefined')
  window.addEventListener('storage', (event) => {
    if (event.key === storageKey || event.key === null) {
      state = read()
      listeners.forEach((listener) => listener())
    }
  })

// Deduplicate recovery effects and the gap between saving the delivery and recording its version.
const saving = new Map<string, Promise<{ saved: boolean; text?: string }>>()
export function saveFollowUpResponse(
  activity: Actividad,
  node: NodoConsigna,
  condenser: ResponseCondenser = templateCondenser,
) {
  if (activity.tipo !== 'registro') return { saved: false, text: undefined }
  const key = `${activity.id}/${node.id}`
  const pending = saving.get(key)
  if (pending) return pending
  const operation = (async () => {
    const record = getFollowUpRecord(key)
    if (!record || record.versionCondensada || !answeredTurns(record.turnos).length) return { saved: false }
    try {
      const text = await condenser.condense({
        textoInicial: record.textoInicial,
        turnos: record.turnos,
        premisa: node.premisa,
        maxCaracteres: node.entregable.tipo === 'texto' ? node.entregable.maxCaracteres : undefined,
      })
      const content: Entregable['contenido'] = { tipo: 'texto', texto: text }
      if (validateSubmission(node, content)) return { saved: false }
      let version: number | undefined
      let savedText = text
      const saved = updateJourney((current) => {
        const existing = latestSubmission(current, activity.id, node.id)
        if (!existing) return current
        if (existing.version > record.versionInicial) {
          version = existing.version
          if (existing.contenido.tipo === 'texto') savedText = existing.contenido.texto
          return current
        }
        const entry: Entregable = {
          id: crypto.randomUUID(),
          estudianteId: studentId,
          actividadId: activity.id,
          nodoId: node.id,
          contenido: content,
          version: (existing?.version ?? 0) + 1,
          enviadoEn: new Date().toISOString(),
        }
        version = entry.version
        const drafts = { ...current.drafts }
        delete drafts[key]
        const next = { ...current, submissions: [...current.submissions, entry], drafts }
        return journeyEnServidor() ? next : applyCompletion(activity, next)
      })
      if (!saved || version === undefined) return { saved: false }
      setFollowUpRecord(key, {
        ...record,
        versionCondensada: version,
        condensadaEn: new Date().toISOString(),
      })
      return { saved: true, text: savedText }
    } catch {
      return { saved: false }
    }
  })()
  saving.set(key, operation)
  void operation.finally(() => {
    if (saving.get(key) === operation) saving.delete(key)
  })
  return operation
}

export async function recoverFollowUp(activity: Actividad, node: NodoConsigna) {
  if (activity.tipo !== 'registro') return { saved: false, text: undefined }
  const key = `${activity.id}/${node.id}`
  const record = getFollowUpRecord(key)
  if (!record || record.versionCondensada) return { saved: false }
  const turns = answeredTurns(record.turnos)
  // The form resumes normally; unresolved questions are never asked again.
  setFollowUpRecord(key, { ...record, turnos: turns })
  return turns.length ? saveFollowUpResponse(activity, node) : { saved: false }
}
