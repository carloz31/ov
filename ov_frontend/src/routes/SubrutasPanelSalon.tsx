import { Navigate, Route } from 'react-router'
import { CounselorDashboardView } from '@/pages/counselor/CounselorDashboardView'
import { PanelAreasView } from '@/pages/counselor/PanelAreasView'
import { PanelInstitucionesView } from '@/pages/counselor/PanelInstitucionesView'
import { PanelSalonView } from '@/pages/counselor/PanelSalonView'
import { appPaths } from './paths'
import { SegunModo } from './SegunModo'

// Ajuste panel-salon: en api, el Inicio de la orientadora es el panel del salón, con sus listas completas de áreas
// e instituciones; en local sigue el panel congelado y las listas vuelven al Inicio.
export function subrutasPanelSalon() {
  const alInicio = <Navigate replace to={appPaths.counselor.home} />
  return [
    <Route
      key="home"
      element={<SegunModo api={<PanelSalonView />} local={<CounselorDashboardView />} />}
      path="home"
    />,
    <Route key="areas" element={<SegunModo api={<PanelAreasView />} local={alInicio} />} path="home/areas" />,
    <Route
      key="instituciones"
      element={<SegunModo api={<PanelInstitucionesView />} local={alInicio} />}
      path="home/instituciones"
    />,
  ]
}
