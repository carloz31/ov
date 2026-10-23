import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { appPaths } from '@/routes/paths'
import { ForestFireCaseView } from '@/features/cases/components/ForestFireCaseView'
import { useCasoServidor } from '@/features/cases/hooks/useCasoServidor'
import { useRetornoCaso } from '@/features/cases/hooks/useRetornoCaso'
import { LumiOverlay } from '@/features/adventure/components/overlays/LumiOverlay'
import { DesbloqueosCierre } from '@/features/activities/components/DesbloqueosCierre'
export function ForestFireCasePage() {
  const navigate = useNavigate()
  const { caseId = '' } = useParams()
  const { acceso, actividad } = useCasoServidor(caseId)
  const [ayuda, setAyuda] = useState<string[]>()
  const retorno = useRetornoCaso(actividad)
  if (acceso === 'cargando') return null
  if (acceso === 'denegado') return <Navigate replace to={appPaths.student.missions} />
  if (caseId !== 'forest-fire') return <Navigate replace to={appPaths.student.exploration} />

  return (
    <>
      <ForestFireCaseView
        actividad={actividad}
        onAyuda={setAyuda}
        etiquetaVolver={retorno.etiqueta}
        renderDesbloqueos={(desbloqueos) => <DesbloqueosCierre desbloqueos={desbloqueos} />}
        onClose={() => navigate(retorno.ruta)}
        onComplete={() => navigate(retorno.ruta)}
      />
      <LumiOverlay open={!!ayuda} steps={ayuda ?? []} onClose={() => setAyuda(undefined)} />
    </>
  )
}
