import type { Actividad } from '@/types/activities'
import type { ParentChild } from '../types'
import type { FamilyConversation } from '@/types/adventure'
import type { QuestionnaireApplication } from '@/types/studentProfile'
import { shareableQuestionnaireIds, type PrioritySettings } from '@/features/counselor/store/prioritySettings'

export function parentRoute(
  activities: Actividad[],
  _children: ParentChild[],
  completedIds: string[],
  available?: (activity: Actividad) => boolean,
) {
  const assigned = activities
    .filter((activity) => activity.audiencia === 'apoderado')
    .sort((a, b) => a.orden - b.orden)
  const completed = assigned.filter((activity) => completedIds.includes(activity.id)).length
  return {
    assigned,
    completed,
    total: assigned.length,
    complete: assigned.length > 0 && completed === assigned.length,
    percent: assigned.length ? (completed / assigned.length) * 100 : 0,
    next: assigned.find(
      (activity) =>
        !completedIds.includes(activity.id) &&
        (available ? available(activity) : activity.requisitos.every((id) => completedIds.includes(id))),
    ),
  }
}
export function familySharedIds(settings: PrioritySettings) {
  return shareableQuestionnaireIds.filter((id) => settings.sharedQuestionnaireIds.includes(id))
}
export function completeFamilyResult(application?: QuestionnaireApplication) {
  return (
    application?.state === 'completed' &&
    application.result &&
    application.result.kind !== 'comparison' &&
    application.result.values.length > 0
  )
}
export function conversationSummary(
  topics: { id: string }[],
  demo: FamilyConversation[],
  saved: FamilyConversation[],
  available: boolean,
) {
  const values = new Map(demo.map((conversation) => [conversation.id, conversation]))
  saved.forEach((conversation) => values.set(conversation.id, conversation))
  const completed = available
    ? topics.filter((topic) => {
        const conversation = values.get(topic.id)
        return !!(
          conversation?.parent &&
          conversation.student &&
          conversation.studentMarkedAt &&
          conversation.parentMarkedAt
        )
      }).length
    : 0
  return {
    available: available ? topics.length : 0,
    completed,
    pending: available ? topics.length - completed : 0,
  }
}
export function selectedFamilyChild(children: ParentChild[], requested: string | null) {
  return children.find((child) => child.id === requested) ?? children[0]
}
export const parentHomeUrl = (childId: string) =>
  `/parent/overview?${new URLSearchParams({ child: childId })}`
export const parentResultUrl = (childId: string, questionnaireId: string) =>
  `/parent/children/${encodeURIComponent(childId)}/questionnaires/${encodeURIComponent(questionnaireId)}`
