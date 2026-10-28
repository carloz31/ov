import { Navigate, Route } from 'react-router'
import { CounselorExplorarView } from '@/pages/counselor/CounselorExplorarView'
import { ParentExplorarView } from '@/pages/parent/ParentExplorarView'
import { appPaths } from './paths'
import { SegunModo } from './SegunModo'

const secciones = ['professions', 'careers', 'institutions'] as const

// Ajuste catalogo-apoderado: «Explorar opciones» del apoderado y de la orientadora, cada pestaña y su detalle;
// solo en api. En local, el apoderado vuelve a su guía de carreras y la orientadora a su inicio.
export function subrutasExplorar(rol: 'apoderado' | 'orientadora') {
  const apoderado = rol === 'apoderado'
  const fuera = apoderado ? appPaths.parent.careers : appPaths.counselor.home
  return secciones.flatMap((seccion) =>
    [`explorar/${seccion}`, `explorar/${seccion}/:codigo`].map((path) => (
      <Route
        key={path}
        element={
          <SegunModo
            api={
              apoderado ? (
                <ParentExplorarView section={seccion} />
              ) : (
                <CounselorExplorarView section={seccion} />
              )
            }
            local={<Navigate replace to={fuera} />}
          />
        }
        path={path}
      />
    )),
  )
}
