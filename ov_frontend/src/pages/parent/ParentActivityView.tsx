import { useParams, useSearchParams } from 'react-router'

import { useParentPortalContext } from '@/features/parent/context/parentPortalContext'
import { FichaModal } from '@/features/backpack/components/FichaModal'
import { fichaServidor } from '@/features/backpack/lib/travelerResources'
import { useFichaApoderadoAbierta } from '@/features/parent/hooks/useFichaApoderadoAbierta'

function ParentActivityView() {
  const { activityId } = useParams()
  const [params] = useSearchParams()
  const {
    activities,
    available,
    motivoBloqueo,
    journey: state,
    loading,
    serverCompletion,
  } = useParentPortalContext()
  // F08: en api, la ficha obtenida se abre desde el cierre en el modal compartido, sin favorito.
  const ficha = useFichaApoderadoAbierta(serverCompletion)
  const activity = activities.find((item) => item.id === activityId)
  if (loading) return null
  if (!activity || !available(activity))
    return <ActivityUnavailable locked={!!activity} mensaje={activity && motivoBloqueo(activity)} />
  return (
    <ParentActivitySession
      key={`${activity.id}/${params.get('repasar') ?? ''}`}
      activity={activity}
      review={params.get('repasar') === '1' && state.progress[activity.id]?.estado === 'completada'}
      onAbrirFicha={ficha.abrirFicha}
      modalFicha={
        <FichaModal
          abierto={!!ficha.fichaAbierta}
          contenido={ficha.contenidoFicha}
          puedeMarcarFavorito={false}
          resource={ficha.fichaAbierta ? fichaServidor(ficha.fichaAbierta) : undefined}
          onClose={ficha.cerrarFicha}
        />
      }
    />
  )
}
import { ParentActivitySession } from '@/features/parent/components/ParentActivitySession'

import { ActivityUnavailable } from '@/features/parent/components/ActivityUnavailable'
export { ParentActivityView }
