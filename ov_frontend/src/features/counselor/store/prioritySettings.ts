import { activities, questionnaires } from '@/data/demo/studentProfiles'
import type { ProfileActivity, QuestionnaireDefinition } from '@/types/studentProfile'

export type PrioritySettings = {
  questionnaireIds: string[]
  recordIds: string[]
  sharedQuestionnaireIds: string[]
}
export type PriorityAction =
  | { type: 'replace'; settings: PrioritySettings }
  | { type: 'questionnaire'; id: string; checked: boolean }
  | { type: 'record'; id: string; checked: boolean }
  | { type: 'sharing'; id: string; checked: boolean }
  | { type: 'all-records'; checked: boolean }

export const shareableQuestionnaireIds = ['interests', 'social', 'intelligences']
export const recordActivities = activities.filter((a) => a.kind === 'record')
export const initialPrioritySettings = (): PrioritySettings => ({
  questionnaireIds: questionnaires.map((q) => q.id),
  recordIds: recordActivities.map((a) => a.id),
  sharedQuestionnaireIds: [...shareableQuestionnaireIds],
})

export function prioritySettingsReducer(state: PrioritySettings, action: PriorityAction): PrioritySettings {
  if (action.type === 'replace')
    return {
      questionnaireIds: questionnaires
        .map((q) => q.id)
        .filter((id) => action.settings.questionnaireIds.includes(id)),
      recordIds: recordActivities.map((a) => a.id).filter((id) => action.settings.recordIds.includes(id)),
      sharedQuestionnaireIds: shareableQuestionnaireIds.filter((id) =>
        action.settings.sharedQuestionnaireIds.includes(id),
      ),
    }
  if (action.type === 'all-records')
    return { ...state, recordIds: action.checked ? recordActivities.map((a) => a.id) : [] }
  const key =
    action.type === 'questionnaire'
      ? 'questionnaireIds'
      : action.type === 'record'
        ? 'recordIds'
        : 'sharedQuestionnaireIds'
  const available =
    action.type === 'questionnaire'
      ? questionnaires.map((q) => q.id)
      : action.type === 'record'
        ? recordActivities.map((a) => a.id)
        : shareableQuestionnaireIds
  if (!available.includes(action.id)) return state
  const ids = new Set(state[key])
  if (action.checked) ids.add(action.id)
  else ids.delete(action.id)
  return { ...state, [key]: available.filter((id) => ids.has(id)) }
}

export function configuredCatalog(
  settings: PrioritySettings,
  sourceActivities: ProfileActivity[] = activities,
  sourceQuestionnaires: QuestionnaireDefinition[] = questionnaires,
) {
  return {
    activities: sourceActivities.map((a) => ({
      ...a,
      priority: a.kind === 'record' && settings.recordIds.includes(a.id),
    })),
    questionnaires: sourceQuestionnaires.map((q) => ({
      ...q,
      priority: settings.questionnaireIds.includes(q.id),
    })),
  }
}

export function canShareResult(settings: PrioritySettings, questionnaireId: string, routeCompleted: boolean) {
  return (
    routeCompleted &&
    shareableQuestionnaireIds.includes(questionnaireId) &&
    settings.sharedQuestionnaireIds.includes(questionnaireId)
  )
}

type Storage = { getItem(key: string): string | null; setItem(key: string, value: string): void }
const storageKey = 'ov.staff.priorities.v1'
export function createPrioritySettingsStore(storage: () => Storage | undefined = () => undefined) {
  let state = initialPrioritySettings()
  let initialized = false
  const listeners = new Set<() => void>()
  const getSnapshot = () => {
    if (!initialized) {
      initialized = true
      try {
        const raw = storage()?.getItem(storageKey)
        if (raw) {
          const saved = JSON.parse(raw)
          if (
            saved.version === 1 &&
            ['questionnaireIds', 'recordIds', 'sharedQuestionnaireIds'].every(
              (key) => Array.isArray(saved[key]) && saved[key].every((id: unknown) => typeof id === 'string'),
            )
          ) {
            state = {
              questionnaireIds: questionnaires
                .map((q) => q.id)
                .filter((id) => saved.questionnaireIds.includes(id)),
              recordIds: recordActivities.map((a) => a.id).filter((id) => saved.recordIds.includes(id)),
              sharedQuestionnaireIds: shareableQuestionnaireIds.filter((id) =>
                saved.sharedQuestionnaireIds.includes(id),
              ),
            }
          }
        }
      } catch {
        /* Keep the prototype usable when browser storage is unavailable. */
      }
    }
    return state
  }
  return {
    getSnapshot,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    dispatch(action: PriorityAction) {
      const next = prioritySettingsReducer(getSnapshot(), action)
      if (JSON.stringify(next) === JSON.stringify(state)) return false
      state = next
      try {
        storage()?.setItem(storageKey, JSON.stringify({ version: 1, ...state }))
      } catch {
        /* Session memory still retains changes during navigation. */
      }
      listeners.forEach((listener) => listener())
      return true
    },
  }
}
export const prioritySettingsStore = createPrioritySettingsStore(() =>
  typeof sessionStorage === 'undefined' ? undefined : sessionStorage,
)
