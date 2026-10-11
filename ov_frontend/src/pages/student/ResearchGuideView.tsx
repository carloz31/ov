import { ResearchReplacementDialog } from '@/features/discovery/components/research/ResearchReplacementDialog'
import { ResearchOccupationPicker } from '@/features/discovery/components/research/ResearchOccupationPicker'
import { ResearchGuideSteps } from '@/features/discovery/components/research/ResearchGuideSteps'
import { useResearchGuide } from '@/features/discovery/hooks/useResearchGuide'
import { Link } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import { appPaths } from '@/routes/paths'
import { DiscoveryStage } from '@/features/discovery/components/DiscoveryStage'
import { Parchment } from '@/components/student/Parchment'
import { GuideSheet } from '@/features/discovery/components/research/GuideSheet'
export function ResearchGuideView() {
  const model = useResearchGuide()
  const { guide, setGuide, unlocked, research, step } = model
  if (!unlocked)
    return (
      <DiscoveryStage ambient="research">
        <Parchment title="Las investigaciones se abren al resolver tu primer caso en la Central de Casos.">
          <Link className="sx-d-action" to={appPaths.student.exploration}>
            Ir a la ciudad
          </Link>
        </Parchment>
      </DiscoveryStage>
    )
  return (
    <DiscoveryStage ambient="research">
      <Link className="sx-d-back" to={appPaths.student.research}>
        <ArrowLeft />
        Volver a investigaciones
      </Link>
      <ol className="sx-d-guide-steps">
        {['Lo que pienso', 'Mis preguntas', 'Lista'].map((label, i) => (
          <li key={label} aria-current={step === i ? 'step' : undefined} data-done={step > i}>
            {label}
          </li>
        ))}
      </ol>
      <ResearchGuideSteps model={model} />
      <ResearchOccupationPicker model={model} />
      <GuideSheet research={research} open={guide} onOpenChange={setGuide} />
      <ResearchReplacementDialog model={model} />
    </DiscoveryStage>
  )
}
