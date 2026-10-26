import { BackpackHeader } from '@/features/backpack/components/BackpackHeader'
import { useBackpack } from '@/features/backpack/hooks/useBackpack'
import { appPaths } from '@/routes/paths'
import { Star } from 'lucide-react'
import { DiscoveryStage } from '@/features/discovery/components/DiscoveryStage'

import '@/styles/student/journey.css'
import '@/styles/student/resources.css'
import '@/features/backpack/styles/backpack.css'
import '@/features/backpack/styles/mochila.css'
import { BarraMochila } from '@/features/backpack/components/BarraMochila'
import { CompartimentoFichas } from '@/features/backpack/components/CompartimentoFichas'
import { CompartimentoVoces } from '@/features/backpack/components/CompartimentoVoces'
import { VisorRecurso } from '@/features/backpack/components/VisorRecurso'
import { FichaModal } from '@/features/backpack/components/FichaModal'
import { RequisitoRecurso } from '@/features/backpack/components/RequisitoRecurso'

function StudentBackpackView() {
  const model = useBackpack()
  const { navigate, kind, selected, setSelectedId, requisitoId, setRequisitoId, isUnlocked } = model
  const { requisito, requisitoPendiente, errorRequisito, reintentarRequisito, mostrarRequisito, tituloRequisito } =
    model

  return (
    <DiscoveryStage ambient="backpack">
      <BackpackHeader model={model} />
      <section aria-label="Mi mochila">
        <BarraMochila model={model} />
        <div
          id="sx-backpack-compartments"
          role="tabpanel"
          aria-labelledby={`sx-backpack-tab-${kind}`}
          className="sx-d-stack"
        >
          {kind === 'sheet' ? <CompartimentoFichas model={model} /> : <CompartimentoVoces model={model} />}
        </div>
      </section>
      <p className="sx-b-footer">
        <Star aria-hidden="true" size={18} />
        Las estrellas son tuyas: marca lo que quieras encontrar rápido cuando armes tus planes.
      </p>
      <VisorRecurso
        resource={selected?.kind !== 'sheet' && selected && isUnlocked(selected) ? selected : undefined}
        onClose={() => setSelectedId(null)}
      />
      <FichaModal
        abierto={selected?.kind === 'sheet' && isUnlocked(selected)}
        resource={selected}
        enlazarActividad
        onClose={() => setSelectedId(null)}
      />
      {mostrarRequisito && (
        <RequisitoRecurso
          abierto={!!requisitoId}
          titulo={tituloRequisito}
          texto={requisito}
          pendiente={requisitoPendiente}
          error={errorRequisito}
          onReintentar={reintentarRequisito}
          onClose={() => setRequisitoId(null)}
          onVolver={() => {
            setRequisitoId(null)
            navigate(appPaths.student.missions)
          }}
        />
      )}
    </DiscoveryStage>
  )
}

export { StudentBackpackView }
