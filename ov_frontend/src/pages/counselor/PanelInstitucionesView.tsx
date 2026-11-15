import { ListaInteresCompleta } from '@/features/counselor/components/panel/ListaInteresCompleta'

// Ajuste panel-salon §5.4 (api): todas las instituciones de interés del salón.
function PanelInstitucionesView() {
  return <ListaInteresCompleta tabla="instituciones" />
}
export { PanelInstitucionesView }
