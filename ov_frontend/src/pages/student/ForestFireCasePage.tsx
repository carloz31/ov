import { Navigate, useNavigate, useParams } from 'react-router'
import { appPaths } from '@/routes/paths'
import { ForestFireCaseView } from '@/features/cases/components/ForestFireCaseView'
import { canAccessCity, useAdventure } from '@/store/adventureStore'
export function ForestFireCasePage() {
  const navigate = useNavigate()
  const { caseId } = useParams()
  const state = useAdventure()
  if (!canAccessCity(state)) return <Navigate replace to={appPaths.student.missions} />
  if (caseId !== 'forest-fire') return <Navigate replace to={appPaths.student.exploration} />

  return (
    <ForestFireCaseView
      onClose={() => navigate(appPaths.student.exploration)}
      onComplete={() => {
        navigate(appPaths.student.exploration)
      }}
    />
  )
}
