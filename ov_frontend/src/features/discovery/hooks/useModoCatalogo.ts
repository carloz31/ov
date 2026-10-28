import { modoApi } from '@/config/env'
import { appPaths } from '@/routes/paths'
import { discoveryPaths } from '@/routes/discoveryPaths'
import { rolSesion } from '@/store/servidor/cuenta'

export type RutasCatalogo = {
  catalog: Record<'professions' | 'careers' | 'institutions', string>
  career: (id: string) => string
  occupation: (id: string) => string
  institution: (id: string) => string
}
const rutasEstudiante: RutasCatalogo = {
  catalog: appPaths.student.catalog,
  career: discoveryPaths.career,
  occupation: discoveryPaths.occupation,
  institution: discoveryPaths.institution,
}

// Ajuste catalogo-apoderado: el apoderado y la orientadora ven el mismo catálogo en modo lectura (sin favoritos,
// planes, íconos por revelar, lugar inesperado, afines, entrevistas ni vistas registradas) y con sus propias rutas.
// Solo en api (`catalogoEnPortal`).
export function useModoCatalogo() {
  const rol = rolSesion()
  const modoLectura = rol === 'APODERADO' || rol === 'ORIENTADORA'
  const rutas: RutasCatalogo =
    rol === 'APODERADO'
      ? appPaths.parent.explorar
      : rol === 'ORIENTADORA'
        ? appPaths.counselor.explorar
        : rutasEstudiante
  return { rol, modoLectura, rutas, catalogoEnPortal: modoApi }
}
