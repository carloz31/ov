import { Navigate, Route } from 'react-router'
import type { ReactNode } from 'react'
import { SeccionProtegida } from '@/features/adventure/components/SeccionProtegida'
import { StudentEntrevistaView } from '@/pages/student/StudentEntrevistaView'
import { StudentGuionInvestigacionView } from '@/pages/student/StudentGuionInvestigacionView'
import { StudentInvestigacionesView } from '@/pages/student/StudentInvestigacionesView'
import { StudentPublicarEntrevistaView } from '@/pages/student/StudentPublicarEntrevistaView'
import { appPaths } from './paths'
import { SegunModo } from './SegunModo'

// F09: Investigaciones. En api, el listado, el asistente del guion, publicar y el detalle de una entrevista, tras la
// sección INVESTIGACIONES; en local, la vista de siempre, y las subrutas vuelven a ella.
export function rutasInvestigaciones(local: ReactNode) {
  const rutas: [string, ReactNode, ReactNode][] = [
    ['investigations', <StudentInvestigacionesView key="lista" />, local],
    ['investigations/guion', <StudentGuionInvestigacionView key="guion" />, null],
    ['investigations/publicar', <StudentPublicarEntrevistaView key="publicar" />, null],
    ['investigations/:entrevista', <StudentEntrevistaView key="entrevista" />, null],
  ]
  return rutas.map(([path, api, enLocal]) => (
    <Route
      key={path}
      element={
        <SegunModo
          api={<SeccionProtegida seccion="INVESTIGACIONES">{api}</SeccionProtegida>}
          local={enLocal ?? <Navigate replace to={appPaths.student.investigations} />}
        />
      }
      path={path}
    />
  ))
}
