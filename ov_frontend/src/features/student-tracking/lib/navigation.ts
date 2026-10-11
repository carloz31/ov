import type { ProfileSection } from '@/types/studentProfile'

export const studentsPath = '/counselor/students'
export const prioritiesPath = '/counselor/priorities'
export const profileSections: { id: ProfileSection; label: string }[] = [
  { id: 'summary', label: 'Resumen' },
  { id: 'questionnaires', label: 'Cuestionarios' },
  { id: 'records', label: 'Registros' },
  { id: 'options', label: 'Opciones' },
  { id: 'security', label: 'Seguridad y diario' },
]
export function safeReturnTo(value: string | null) {
  if (!value || value.includes('\\') || /[\r\n]/.test(value)) return studentsPath
  try {
    const url = new URL(value, 'https://local.invalid')
    return value.startsWith('/') && url.origin === 'https://local.invalid' && url.pathname === studentsPath
      ? url.pathname + url.search
      : studentsPath
  } catch {
    return studentsPath
  }
}
export function profileUrl(
  studentId: string,
  returnTo: string,
  section: ProfileSection = 'summary',
  attention = false,
  anchor = '',
) {
  const params = new URLSearchParams({ section, returnTo: safeReturnTo(returnTo) })
  if (attention) params.set('review', 'attention')
  return `${studentsPath}/${encodeURIComponent(studentId)}?${params}${anchor ? `#${anchor}` : ''}`
}
export const questionnaireUrl = (studentId: string, questionnaireId: string, returnTo: string) =>
  `${studentsPath}/${encodeURIComponent(studentId)}/questionnaires/${encodeURIComponent(questionnaireId)}?${new URLSearchParams({ returnTo: safeReturnTo(returnTo) })}`
