import {
  createDecisionSheet,
  type DecisionSheet,
} from '@/types/decisions'
import { getExploration, setDecisionSheets } from '@/store/explorationStore'
import { updateDiscovery } from '@/store/discoveryStore'
export const planSections = ['Motivación', 'Fortalezas y obstáculos', 'Presupuesto', 'Cómo me preparo']
export function getPlanSections(sheet: DecisionSheet) {
  return [
    !!sheet.motivation.trim(),
    !!sheet.strengths.trim() && !!sheet.challenges.trim(),
    sheet.budgets.length > 0,
    sheet.preparation.length + sheet.customPreparation.length > 0,
  ]
}
export function getPlanCompleteness(sheet: DecisionSheet) {
  return getPlanSections(sheet).filter(Boolean).length
}
export function getOrderedPlans(sheets: DecisionSheet[], order: string[]) {
  const active = sheets
    .filter((s) => s.status !== 'archived')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
  const ranks = new Map(order.map((id, i) => [id, i]))
  return active.sort((a, b) => (ranks.get(a.id) ?? Infinity) - (ranks.get(b.id) ?? Infinity)).slice(0, 3)
}
export function addPlan(sheets: DecisionSheet[], name: string, sourceId: string) {
  if (
    sheets.filter((s) => s.status !== 'archived').length >= 3 ||
    sheets.some((s) => s.status !== 'archived' && s.sourceId === sourceId)
  )
    return sheets
  return [...sheets, createDecisionSheet(name, sourceId)]
}
export function archivePlan(sheets: DecisionSheet[], id: string): DecisionSheet[] {
  return sheets.map((sheet) =>
    sheet.id === id && sheet.status !== 'archived'
      ? {
          ...sheet,
          status: 'archived',
          timeline: [
            ...sheet.timeline,
            { id: crypto.randomUUID(), type: 'archived', detail: undefined, date: new Date().toISOString() },
          ],
        }
      : sheet,
  )
}
export function createPlanFromCareer(name: string, id: string) {
  const current = getExploration().decisionSheets
  const next = addPlan(current, name, id)
  if (next === current) return false
  const created = next[next.length - 1]
  setDecisionSheets(next)
  updateDiscovery((s) => ({
    ...s,
    planOrder: [
      ...s.planOrder.filter((value) =>
        next.some((sheet) => sheet.id === value && sheet.status !== 'archived'),
      ),
      created.id,
    ],
  }))
  return true
}
