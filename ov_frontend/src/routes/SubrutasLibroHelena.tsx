import { Route } from 'react-router'
import { SeccionProtegida } from '@/features/adventure/components/SeccionProtegida'
import { HelenaBookView } from '@/pages/student/HelenaBookView'
import { HelenaResultView } from '@/pages/student/HelenaResultView'

// Ajuste libro-helena-regreso: el libro y sus páginas, tras la sección LIBRO_HELENA (en local, siempre abierta).
export function rutasLibroHelena() {
  return [
    <Route
      key="profile/helena"
      element={
        <SeccionProtegida seccion="LIBRO_HELENA">
          <HelenaBookView />
        </SeccionProtegida>
      }
      path="profile/helena"
    />,
    <Route
      key="profile/helena/:pagina"
      element={
        <SeccionProtegida seccion="LIBRO_HELENA">
          <HelenaResultView />
        </SeccionProtegida>
      }
      path="profile/helena/:pagina"
    />,
  ]
}
