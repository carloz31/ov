import { Building2, ChartNoAxesColumnIncreasing, GraduationCap, WalletCards } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { careerGuide } from '@/features/parent/data/parentPortal'

const icons = [Building2, GraduationCap, ChartNoAxesColumnIncreasing, WalletCards]

function ParentCareerGuideView() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        description="Información clara para investigar en familia, comparar alternativas y formular mejores preguntas."
        eyebrow="Explora para conversar mejor"
        title="Guía de carreras y formación"
      />
      <div className="grid gap-5 md:grid-cols-2">
        {careerGuide.map((item, index) => {
          const Icon = icons[index]
          return (
            <Card
              className="group p-6 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:border-primary/30"
              key={item.title}
            >
              <div className="flex items-start gap-4">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-primary">
                  <Icon />
                </div>
                <div>
                  <h2 className="font-bold">{item.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
                  <Badge className="mt-4" variant="outline">
                    {item.status}
                  </Badge>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
      <Card className="border-dashed bg-muted p-5 text-sm">
        <strong>Una recomendación:</strong> empieza por los intereses y experiencias que generan curiosidad.
        Los datos de empleabilidad ayudan a evaluar una opción, pero no reemplazan el autoconocimiento.
      </Card>
    </div>
  )
}

export { ParentCareerGuideView }
