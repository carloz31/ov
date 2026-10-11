import { Navigate, useSearchParams } from 'react-router'
import { StudentBackpackView } from './StudentBackpackView'

export function StudentResourcesView() {
  const [params] = useSearchParams()
  // Preserve the destination of existing published interview links.
  if (['community', 'research'].includes(params.get('tab') ?? '')) {
    return <Navigate replace to="/student/investigations" />
  }
  return <StudentBackpackView />
}
