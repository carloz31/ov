import { Navigate, useLocation, useNavigate, useParams } from 'react-router'
import { appPaths } from '@/routes/paths'
import { ExplorationCaseIntroView } from '@/features/cases/components/ExplorationCaseIntroView'
import { useCasoJugable } from '@/features/cases/hooks/useCasoJugable'
import { useRetornoCaso } from '@/features/cases/hooks/useRetornoCaso'
import { PantallaCarga } from '@/components/student/PantallaCarga'
export function ExplorationCaseIntroPage() {
  const navigate = useNavigate()
  const { caseId = 'forest-fire' } = useParams()
  const location = useLocation()
  const { acceso, actividad, intentos, existe, caso, estado, error, reintentar } = useCasoJugable(caseId)
  const retorno = useRetornoCaso(actividad)
  if (acceso === 'cargando') return null
  if (acceso === 'denegado') return <Navigate replace to={appPaths.student.missions} />
  if (!existe) return <Navigate replace to={appPaths.student.exploration} />
  if (estado !== 'listo')
    return (
      <PantallaCarga
        estado={estado}
        titulo="Preparando el caso"
        frase="Lumi está reuniendo a los profesionales…"
        mensaje={error}
        onReintentar={reintentar}
        volver={{ texto: retorno.etiqueta, onClick: () => navigate(retorno.ruta) }}
      />
    )

  return (
    <ExplorationCaseIntroView
      caso={caso}
      intentos={intentos}
      onClose={() => navigate(retorno.ruta)}
      onStart={() => navigate(appPaths.student.casePlay(caseId), { state: location.state })}
    />
  )
}
