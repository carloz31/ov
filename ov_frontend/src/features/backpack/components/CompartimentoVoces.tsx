import { Parchment } from '@/components/student/Parchment'
import { useBackpack } from '@/features/backpack/hooks/useBackpack'
import { BackpackCard } from './BackpackCard'
import { SinResultados } from './SinResultados'

// El compartimento de testimonios («Voces de la ciudad»).
export function CompartimentoVoces({ model }: { model: ReturnType<typeof useBackpack> }) {
  const { adventure, vocesVisibles, isUnlocked, cityPoints, sinResultados } = model
  const { openResource, toggleFavorite, consultarRequisito, clear } = model
  return (
    <Parchment className="sx-b-compartment sx-d-dark" label="Compartimento de testimonios" title="Voces de la ciudad">
      <div className="sx-b-compartment-heading">
        <p>
          Personas reales que cuentan cómo llegaron a lo que hacen. Cada llamado que atiendes en la Central de
          Casos te acerca a una.
        </p>
        <strong>{vocesVisibles.length} voces</strong>
      </div>
      <div className="sx-b-grid sx-b-grid-testimonial">
        {vocesVisibles.map((resource) => (
          <BackpackCard
            key={resource.id}
            resource={resource}
            unlocked={isUnlocked(resource)}
            saved={adventure.bookmarks.includes(resource.id)}
            visited={adventure.visits.includes(resource.id)}
            playable={
              'caseId' in resource.requirement &&
              !!cityPoints.find(
                (p) => p.id === ('caseId' in resource.requirement ? resource.requirement.caseId : undefined),
              )?.actionEnabled
            }
            onOpen={() => openResource(resource)}
            onFavorite={() => toggleFavorite(resource.id)}
            onRequirement={() => consultarRequisito(resource)}
          />
        ))}
      </div>
      {sinResultados && <SinResultados texto="Ninguna voz coincide con tu búsqueda" onLimpiar={clear} />}
    </Parchment>
  )
}
