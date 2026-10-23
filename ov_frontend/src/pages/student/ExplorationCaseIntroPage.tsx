import { Navigate, useLocation, useNavigate, useParams } from 'react-router'
import { appPaths } from '@/routes/paths'
import { ExplorationCaseIntroView } from '@/features/cases/components/ExplorationCaseIntroView'
import { useCasoServidor } from '@/features/cases/hooks/useCasoServidor'
import { useRetornoCaso } from '@/features/cases/hooks/useRetornoCaso'
export function ExplorationCaseIntroPage() {
  const navigate = useNavigate()
  const { caseId = 'forest-fire' } = useParams()
  const location = useLocation()
  const { acceso, actividad, intentos } = useCasoServidor(caseId)
  const retorno = useRetornoCaso(actividad)
  if (acceso === 'cargando') return null
  if (acceso === 'denegado') return <Navigate replace to={appPaths.student.missions} />
  if (caseId !== 'forest-fire') return <Navigate replace to={appPaths.student.exploration} />

  return (
    <ExplorationCaseIntroView
      intentos={intentos}
      onClose={() => navigate(retorno.ruta)}
      onStart={() => navigate(appPaths.student.casePlay(caseId), { state: location.state })}
    />
  )
}
