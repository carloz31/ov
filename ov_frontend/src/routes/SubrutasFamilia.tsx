import { Navigate, Route } from 'react-router'
import { SeccionProtegida } from '@/features/adventure/components/SeccionProtegida'
import { ParentFamiliaCartaView } from '@/pages/parent/ParentFamiliaCartaView'
import { ParentFamiliaRegaloView } from '@/pages/parent/ParentFamiliaRegaloView'
import { ParentFamiliaTemaView } from '@/pages/parent/ParentFamiliaTemaView'
import { StudentFamiliaCartaView } from '@/pages/student/StudentFamiliaCartaView'
import { StudentFamiliaRegaloView } from '@/pages/student/StudentFamiliaRegaloView'
import { StudentFamiliaTemaView } from '@/pages/student/StudentFamiliaTemaView'
import { appPaths } from './paths'
import { SegunModo } from './SegunModo'

// F08: carta, regalo y una conversación de Familia (estudiante, tras la sección FAMILIA) y de Conversaciones
// (apoderado); solo en api. En local vuelven a la vista de siempre.
export function subrutasFamilia(rol: 'estudiante' | 'apoderado') {
  const estudiante = rol === 'estudiante'
  const vistas = estudiante
    ? [
        <StudentFamiliaCartaView key="carta" />,
        <StudentFamiliaRegaloView key="regalo" />,
        <StudentFamiliaTemaView key="tema" />,
      ]
    : [
        <ParentFamiliaCartaView key="carta" />,
        <ParentFamiliaRegaloView key="regalo" />,
        <ParentFamiliaTemaView key="tema" />,
      ]
  const rutas = ['conversations/carta', 'conversations/regalo', 'conversations/tema/:conversacion']
  const lista = estudiante ? appPaths.student.conversations : appPaths.parent.conversations
  return rutas.map((path, i) => {
    const vista = <SegunModo api={vistas[i]} local={<Navigate replace to={lista} />} />
    return (
      <Route
        key={path}
        element={
          estudiante ? (
            <SeccionProtegida seccion="FAMILIA" titulo="Un espacio para conversar en familia">
              {vista}
            </SeccionProtegida>
          ) : (
            vista
          )
        }
        path={path}
      />
    )
  })
}
