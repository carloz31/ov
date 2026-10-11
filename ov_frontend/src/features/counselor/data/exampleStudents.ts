// DATO DE PRUEBA: estudiantes de ejemplo; se reemplazarán por los estudiantes vinculados a la orientadora.
import { activities, studentProfiles } from '@/data/demo/studentProfiles'
import { priorityProgress, profileAlerts } from '@/features/student-tracking/lib/selectors'
import type { ProfileActivity, ProfileAlertCode, QuestionnaireDefinition } from '@/types/studentProfile'
import { configuredCatalog, initialPrioritySettings } from '../store/prioritySettings'

export type AlertCode = ProfileAlertCode
export type ExampleStudent = {
  id: string
  nombres: string
  apellidos: string
  salon: '5.° A' | '5.° B'
  avance: number
  ultimoIngreso: string | null
  alertas: AlertCode[]
}
export const projectStudents = (
  configuredActivities: ProfileActivity[],
  configuredQuestionnaires: QuestionnaireDefinition[],
): ExampleStudent[] =>
  studentProfiles.map((student) => ({
    id: student.id,
    nombres: student.nombres,
    apellidos: student.apellidos,
    salon: student.salon,
    avance: priorityProgress(student, configuredActivities, configuredQuestionnaires).percent,
    ultimoIngreso: student.ultimoIngreso,
    alertas: profileAlerts(student, studentProfiles, activities),
  }))

const initial = configuredCatalog(initialPrioritySettings())
export const exampleStudents = projectStudents(initial.activities, initial.questionnaires)
