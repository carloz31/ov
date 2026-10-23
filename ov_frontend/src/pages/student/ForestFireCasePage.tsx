import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { appPaths } from '@/routes/paths'
import { ForestFireCaseView } from '@/features/cases/components/ForestFireCaseView'
import { useCasoServidor } from '@/features/cases/hooks/useCasoServidor'
import { LumiOverlay } from '@/features/adventure/components/overlays/LumiOverlay'
export function ForestFireCasePage() {
  const navigate = useNavigate()
  const { caseId = '' } = useParams()
  const { acceso, actividad } = useCasoServidor(caseId)
  const [ayuda, setAyuda] = useState<string[]>()
  if (acceso === 'cargando') return null
  if (acceso === 'denegado') return <Navigate replace to={appPaths.student.missions} />
  if (caseId !== 'forest-fire') return <Navigate replace to={appPaths.student.exploration} />

  return (
    <>
      <ForestFireCaseView
        actividad={actividad}
        onAyuda={setAyuda}
        onClose={() => navigate(appPaths.student.exploration)}
        onComplete={() => {
          navigate(appPaths.student.exploration)
        }}
      />
      <LumiOverlay open={!!ayuda} steps={ayuda ?? []} onClose={() => setAyuda(undefined)} />
    </>
  )
}
