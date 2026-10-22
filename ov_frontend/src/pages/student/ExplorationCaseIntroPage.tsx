import { Navigate, useNavigate, useParams } from 'react-router'
import { appPaths } from '@/routes/paths'
import { ExplorationCaseIntroView } from '@/features/cases/components/ExplorationCaseIntroView'
import { useCasoServidor } from '@/features/cases/hooks/useCasoServidor'
export function ExplorationCaseIntroPage() {
  const navigate = useNavigate()
  const { caseId = 'forest-fire' } = useParams()
  const { acceso, intentos } = useCasoServidor(caseId)
  if (acceso === 'cargando') return null
  if (acceso === 'denegado') return <Navigate replace to={appPaths.student.missions} />
  if (caseId !== 'forest-fire') return <Navigate replace to={appPaths.student.exploration} />

  return (
    <ExplorationCaseIntroView
      intentos={intentos}
      onClose={() => navigate(appPaths.student.exploration)}
      onStart={() => navigate(appPaths.student.casePlay(caseId))}
    />
  )
}
