import { Sparkles } from 'lucide-react'
import { useJourney } from '@/store/journeyStore'
import { ResourceCards } from '@/features/activities/components/journey/ResourceCards'
export function JourneyResources() {
  const state = useJourney()
  if (!state.resources.length) return null
  return (
    <section className="journey-saved">
      <p className="journey-eyebrow">
        <Sparkles size={16} /> HALLAZGOS DE TU TRAVESÍA
      </p>
      <h2 className="mb-4 text-xl font-bold">Lo que llevas en la mochila</h2>
      <ResourceCards ids={state.resources} />
    </section>
  )
}
