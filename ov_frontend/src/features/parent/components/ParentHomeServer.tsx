import type { useParentOverview } from '../hooks/useParentOverview'
import { ParentActivitiesCard } from './ParentActivitiesCard'
import { ParentChildServerSummary } from './ParentChildServerSummary'
import { ParentConversationsCard } from './ParentConversationsCard'

// Ajuste inicio-apoderado: el Inicio del apoderado en api (bocetos A–D). La tarjeta del hijo elegido y, debajo,
// una grilla con «Tus actividades» y «Conversaciones con {hijo}» (una columna en el teléfono).
export function ParentHomeServer({
  model,
  inicio,
}: {
  model: ReturnType<typeof useParentOverview>
  inicio: NonNullable<ReturnType<typeof useParentOverview>['inicio']>
}) {
  return (
    <>
      <ParentChildServerSummary
        familia={inicio.familia}
        hijo={inicio.hijo}
        onElegir={inicio.elegir}
        resultados={model.resultadosHijo}
      />
      <div className="parent-home-grid">
        <ParentActivitiesCard
          ruta={model.route}
          diplomaRef={model.diplomaRef}
          resaltarDiploma={model.highlightDiploma}
        />
        {inicio.hijo && (
          <ParentConversationsCard
            nombre={inicio.hijo.nombre}
            estado={inicio.conversaciones}
            onReintentar={inicio.reintentarConversaciones}
          />
        )}
      </div>
    </>
  )
}
