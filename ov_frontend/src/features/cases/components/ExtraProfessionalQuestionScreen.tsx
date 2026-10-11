import { useExtraProfessionalQuestion } from '@/features/cases/hooks/useExtraProfessionalQuestion'
import { BookOpen, CheckCircle2, MessageCircle, Search } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/utils'
import { occupationCatalog } from '@/data/catalog/occupations'
import { OccupationDetailDialog } from '@/features/cases/components/OccupationDetailDialog'
import { ScreenHeading } from '@/features/cases/components/ScreenHeading'
const FOREST_FIRE_ROLE_OCCUPATION_IDS = new Set([
  'firefighter',
  'meteorologist',
  'municipal-police',
  'paramedic',
  'medical-specialist',
  'veterinarian',
  'biologist',
  'environmental-engineer',
  'civil-engineer',
  'machinery-operator',
  'social-worker',
  'journalist',
])
const forestFireReflectionOccupations = occupationCatalog.filter(
  (occupation) => !FOREST_FIRE_ROLE_OCCUPATION_IDS.has(occupation.id),
)
export function ExtraProfessionalQuestionScreen({
  onReasonChange,
  onSelectProfessional,
  onSubmit,
  reason,
  selectedProfessionalId,
}: {
  onReasonChange: (reason: string) => void
  onSelectProfessional: (professionalId: string) => void
  onSubmit: () => void
  reason: string
  selectedProfessionalId: string
}) {
  const {
    search,
    setSearch,
    detailOccupation,
    setDetailOccupation,
    filteredOccupations,
    selectedOccupation,
  } = useExtraProfessionalQuestion(selectedProfessionalId)
  return (
    <div className="mx-auto max-w-5xl">
      <ScreenHeading
        badge="Reflexión abierta"
        description="Busca en el catálogo general una profesión distinta de las que ya tuvieron una función correcta en el caso."
        inverse
        title="¿Qué otra profesión podría haber ayudado y por qué?"
      />
      <Card className="p-6 shadow-[0_26px_75px_rgb(0_0_0/28%)] md:p-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-black">1. Busca y elige una profesión</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {forestFireReflectionOccupations.length} profesiones disponibles del catálogo general.
            </p>
          </div>
          <label className="relative block w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <span className="sr-only">Buscar profesión</span>
            <input
              className="h-11 w-full rounded-xl border bg-white pl-10 pr-3 text-sm outline-none focus:border-primary focus:ring-3 focus:ring-ring/15"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nombre, sector o habilidad..."
              type="search"
              value={search}
            />
          </label>
        </div>

        <div className="case-scrollbar mt-5 max-h-[430px] overflow-y-auto rounded-2xl border bg-muted/25 p-3">
          {filteredOccupations.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {filteredOccupations.map((occupation) => {
                const selected = occupation.id === selectedProfessionalId
                return (
                  <article
                    className={cn(
                      'rounded-2xl border bg-white p-4 transition-colors',
                      selected ? 'border-primary ring-2 ring-primary/10' : 'hover:border-primary/30',
                    )}
                    key={occupation.id}
                  >
                    <button
                      aria-pressed={selected}
                      className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                      onClick={() => onSelectProfessional(occupation.id)}
                      type="button"
                    >
                      <span className="flex items-start gap-3">
                        <span
                          className="grid size-10 shrink-0 place-items-center rounded-xl text-sm font-black text-white"
                          style={{ background: occupation.color }}
                        >
                          {occupation.name.charAt(0)}
                        </span>
                        <span className="min-w-0">
                          <span className="block font-black">{occupation.name}</span>
                          <span className="block text-xs text-muted-foreground">{occupation.sector}</span>
                        </span>
                        {selected && <CheckCircle2 className="ml-auto size-5 shrink-0 text-primary" />}
                      </span>
                      <span className="mt-3 block text-xs leading-5 text-muted-foreground">
                        {occupation.shortDescription}
                      </span>
                      <span className="mt-3 flex flex-wrap gap-1">
                        {occupation.skills.slice(0, 3).map((skill) => (
                          <Badge key={skill} variant="secondary">
                            {skill}
                          </Badge>
                        ))}
                      </span>
                    </button>
                    <Button
                      className="mt-3 w-full"
                      onClick={() => setDetailOccupation(occupation)}
                      size="sm"
                      variant="outline"
                    >
                      <BookOpen /> Ver ficha completa
                    </Button>
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="p-8 text-center">
              <Search className="mx-auto size-7 text-muted-foreground" />
              <p className="mt-3 font-bold">No encontramos coincidencias</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Prueba con otra profesión, sector o habilidad.
              </p>
            </div>
          )}
        </div>

        {selectedOccupation && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-[var(--primary-soft)] p-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-primary">
                Profesión seleccionada
              </p>
              <p className="mt-1 font-black">{selectedOccupation.name}</p>
            </div>
            <Button onClick={() => setDetailOccupation(selectedOccupation)} size="sm" variant="outline">
              <BookOpen /> Revisar ficha
            </Button>
          </div>
        )}

        <label className="mt-6 block text-sm font-black" htmlFor="extra-professional-reason">
          2. Explica cómo habría ayudado
        </label>
        <textarea
          className="mt-2 min-h-36 w-full resize-y rounded-2xl border border-input bg-white p-4 text-sm leading-6 outline-none transition-shadow placeholder:text-muted-foreground focus:border-primary focus:ring-3 focus:ring-ring/15"
          id="extra-professional-reason"
          onChange={(event) => onReasonChange(event.target.value)}
          placeholder="Describe en qué momento habría intervenido y qué habría aportado a la comunidad..."
          value={reason}
        />
        <div className="mt-6 flex justify-end">
          <Button
            disabled={!selectedProfessionalId || reason.trim().length < 10}
            onClick={onSubmit}
            size="lg"
          >
            Comparar con otras respuestas <MessageCircle />
          </Button>
        </div>
      </Card>
      <OccupationDetailDialog occupation={detailOccupation} onClose={() => setDetailOccupation(undefined)} />
    </div>
  )
}
