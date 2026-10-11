import { useState } from 'react'
import { useNavigate } from 'react-router'

import { getPriorityProgress, latestRecords } from '@/features/counselor/lib/counselorPortalSelectors'
import { useCounselorPortal } from '@/features/counselor/context/counselorPortalContext'
import type { Student } from '@/features/counselor/types'

import { activityTypeLabel } from '@/features/counselor/lib/labels'

export function useStudentProgress(student: Student) {
  const { state } = useCounselorPortal()
  const navigate = useNavigate()
  const [groupBy, setGroupBy] = useState<'block' | 'type'>('type')
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const progress = getPriorityProgress(state, student)
  const activities = state.activities
    .filter((item) => item.participant === 'ESTUDIANTE')
    .sort((a, b) => a.order - b.order)
  const records = latestRecords(student)
  const observedCount = records.filter((record) => record.preliminaryReview === 'OBSERVADO').length
  const completions = [
    ...student.progress.flatMap((item) => (item.completedAt ? [item.completedAt] : [])),
    ...Object.values(student.completedCaseDates),
  ]
  const weeks = completions.reduce<Record<number, number>>((acc, completedAt) => {
    const days = Math.max(
      0,
      Math.floor((new Date(state.referenceDate).getTime() - new Date(completedAt).getTime()) / 86_400_000),
    )
    const week = Math.floor(days / 7)
    if (week < 5) acc[week] = (acc[week] ?? 0) + 1
    return acc
  }, {})
  const groups = activities.reduce<Record<string, typeof activities>>((acc, activity) => {
    const key = groupBy === 'block' ? activity.block : activityTypeLabel(activity.type)
    ;(acc[key] ??= []).push(activity)
    return acc
  }, {})
  const orderedGroups = Object.entries(groups).sort(([groupA], [groupB]) => {
    if (groupBy === 'block') return (groups[groupA][0]?.order ?? 0) - (groups[groupB][0]?.order ?? 0)
    const typeOrder = ['Registros', 'Instrumentos', 'Informativas', 'Casos']
    return typeOrder.indexOf(groupA) - typeOrder.indexOf(groupB)
  })
  const completedCount = activities.filter((activity) =>
    activity.type === 'CASO'
      ? student.completedCaseIds.includes(activity.id)
      : student.progress.some((item) => item.activityId === activity.id && item.status === 'COMPLETADA'),
  ).length
  return {
    navigate,
    groupBy,
    setGroupBy,
    collapsedGroups,
    setCollapsedGroups,
    progress,
    activities,
    records,
    observedCount,
    weeks,
    orderedGroups,
    completedCount,
  }
}
