import { Navigate, useNavigate, useParams } from 'react-router'
import { appPaths } from '@/routes/paths'
import { ExplorationCaseIntroView } from '@/features/cases/components/ExplorationCaseIntroView'
import { canAccessCity, useAdventure } from '@/store/adventureStore'
export function ExplorationCaseIntroPage() {
  const navigate = useNavigate()
  const { caseId = 'forest-fire' } = useParams()
  const state = useAdventure()
  if (!canAccessCity(state)) return <Navigate replace to={appPaths.student.missions} />
  if (caseId !== 'forest-fire') return <Navigate replace to={appPaths.student.exploration} />

  return (
    <ExplorationCaseIntroView
      onClose={() => navigate(appPaths.student.exploration)}
      onStart={() => navigate(appPaths.student.casePlay(caseId))}
    />
  )
}
