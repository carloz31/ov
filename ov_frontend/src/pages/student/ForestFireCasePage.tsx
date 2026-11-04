import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { appPaths } from '@/routes/paths'
import { ForestFireCaseView } from '@/features/cases/components/ForestFireCaseView'
import { useCasoJugable } from '@/features/cases/hooks/useCasoJugable'
import { useRetornoCaso } from '@/features/cases/hooks/useRetornoCaso'
import { LumiOverlay } from '@/features/adventure/components/overlays/LumiOverlay'
import { DesbloqueosCierre } from '@/features/activities/components/DesbloqueosCierre'
import { PantallaCarga } from '@/components/student/PantallaCarga'
export function ForestFireCasePage() {
  const navigate = useNavigate()
  const { caseId = '' } = useParams()
  const { acceso, actividad, existe, caso, estado, error, reintentar } = useCasoJugable(caseId)
  const [ayuda, setAyuda] = useState<string[]>()
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
    <>
      <ForestFireCaseView
        actividad={actividad}
        caso={caso}
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
