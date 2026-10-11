import { useLocation } from 'react-router'
export function CatalogRevisitNotice() {
  const location = useLocation()
  return location.state?.revisitingCatalog ? (
    <p role="status" className="sx-d-warning">
      Ya recorriste todo el catálogo. Aquí tienes una que viste hace tiempo.
    </p>
  ) : null
}
