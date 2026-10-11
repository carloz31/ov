import type { ActivityType, Student } from '../types'
export function activityTypeLabel(type: ActivityType) {
  return type === 'CASO'
    ? 'Casos'
    : type === 'TEST'
      ? 'Instrumentos'
      : type === 'REGISTRO'
        ? 'Registros'
        : 'Informativas'
}
export function institutionTypeLabel(type: Student['institutions'][number]['type']) {
  return type === 'UNIVERSIDAD'
    ? 'Universidad'
    : type === 'INSTITUTO'
      ? 'Instituto'
      : type === 'FUERZAS_ARMADAS'
        ? 'Fuerzas Armadas'
        : 'Policía'
}
