// DATO DE PRUEBA: perfil, hijos y actividades del apoderado; se reemplazarán por los datos de su cuenta.
import type { ParentChild } from '../types'

import { studentProfiles } from '@/data/demo/studentProfiles'
import { fullName, generalProgress } from '@/features/student-tracking/lib/selectors'
import { activities } from '@/data/demo/studentProfiles'

const familyStudent = studentProfiles.find((student) => student.id === 'ejemplo-07')!
const conversationChildId = familyStudent.id
const guardian = familyStudent.guardian!
const parentProfile = {
  name: guardian.name,
  firstName: guardian.name.split(' ')[0],
  relationship: guardian.relationship,
}
const parentChildren: ParentChild[] = [
  {
    id: familyStudent.id,
    name: fullName(familyStudent),
    initials: `${familyStudent.nombres[0]}${familyStudent.apellidos[0]}`,
    grade: `5.° de secundaria · ${familyStudent.salon.split(' ').at(-1)}`,
    school: 'Colegio Nuevo Horizonte',
    progress: generalProgress(familyStudent, activities).percent,
  },
]

const careerGuide = [
  {
    title: 'Instituciones educativas',
    description: 'Compara universidades, institutos y rutas de formación por ubicación y modalidad.',
    status: '12 opciones guardadas',
  },
  {
    title: 'Carreras por área',
    description: 'Explora familias de carreras y descubre conexiones entre intereses y ocupaciones.',
    status: '8 áreas disponibles',
  },
  {
    title: 'Demanda y empleabilidad',
    description: 'Conversa con datos sobre oportunidades, sectores y habilidades con proyección.',
    status: 'Actualizado este mes',
  },
  {
    title: 'Becas y financiamiento',
    description: 'Revisa alternativas de apoyo económico y requisitos para planificar con tiempo.',
    status: '6 convocatorias abiertas',
  },
]

export { careerGuide, parentChildren, parentProfile, conversationChildId }
