import type { CounselorAction, CounselorPortalState } from '../types'

export function counselorReducer(state: CounselorPortalState, action: CounselorAction): CounselorPortalState {
  if (action.type === 'TOGGLE_WATCHLIST') {
    const exists = state.watchlist.some((entry) => entry.studentId === action.studentId)
    return {
      ...state,
      watchlist: exists
        ? state.watchlist.filter((entry) => entry.studentId !== action.studentId)
        : [
            ...state.watchlist,
            { studentId: action.studentId, reason: action.reason, date: state.referenceDate },
          ],
    }
  }
  if (action.type === 'ADD_WATCHLIST_BULK') {
    const existing = new Set(state.watchlist.map((entry) => entry.studentId))
    return {
      ...state,
      watchlist: [
        ...state.watchlist,
        ...action.studentIds
          .filter((studentId) => !existing.has(studentId))
          .map((studentId) => ({ studentId, date: state.referenceDate })),
      ],
    }
  }
  if (action.type === 'SET_WATCHLIST_REASON')
    return {
      ...state,
      watchlist: state.watchlist.map((entry) =>
        entry.studentId === action.studentId ? { ...entry, reason: action.reason } : entry,
      ),
    }
  if (action.type === 'TOGGLE_PRIORITY') {
    const excluded = state.excludedActivityIds.includes(action.activityId)
    return {
      ...state,
      excludedActivityIds: excluded
        ? state.excludedActivityIds.filter((id) => id !== action.activityId)
        : [...state.excludedActivityIds, action.activityId],
    }
  }
  if (action.type === 'REVIEW_RECORD')
    return {
      ...state,
      students: state.students.map((student) =>
        student.id !== action.studentId
          ? student
          : {
              ...student,
              records: student.records.map((record) =>
                record.id === action.recordId
                  ? {
                      ...record,
                      reviewStatus: action.status,
                      counselorComment: action.comment,
                      preliminaryReview: action.status === 'REHACER_SUGERIDO' ? 'OBSERVADO' : 'ADECUADO',
                      reviewReason: action.status === 'REHACER_SUGERIDO' ? action.comment : undefined,
                    }
                  : record,
              ),
            },
      ),
    }
  if (action.type === 'ADD_RESOURCE') return { ...state, resources: [action.resource, ...state.resources] }
  if (action.type === 'UPDATE_RESOURCE')
    return {
      ...state,
      resources: state.resources.map((item) => (item.id === action.resource.id ? action.resource : item)),
    }
  if (action.type === 'TOGGLE_INTERVIEW_FEATURED')
    return {
      ...state,
      interviews: state.interviews.map((item) =>
        item.id === action.interviewId ? { ...item, featured: !item.featured } : item,
      ),
    }
  return state
}
