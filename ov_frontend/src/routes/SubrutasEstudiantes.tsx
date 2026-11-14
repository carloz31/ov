import { Route } from 'react-router'
import { EstudiantesView } from '@/pages/counselor/EstudiantesView'
import { PerfilEstudianteView } from '@/pages/counselor/PerfilEstudianteView'
import { StudentDetailView } from '@/pages/counselor/StudentDetailView'
import { StudentsView } from '@/pages/counselor/StudentsView'
import { SegunModo } from './SegunModo'

// Ajuste panel-estudiantes: en api, la lista «Estudiantes» y el perfil del estudiante; en local, las vistas de
// siempre.
export function subrutasEstudiantes() {
  return [
    <Route
      key="lista"
      element={<SegunModo api={<EstudiantesView />} local={<StudentsView />} />}
      path="students"
    />,
    <Route
      key="perfil"
      element={<SegunModo api={<PerfilEstudianteView />} local={<StudentDetailView />} />}
      path="students/:studentId"
    />,
  ]
}
