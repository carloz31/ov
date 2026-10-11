import { ArrowRight, Heart, MessageCircle, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useJourney } from '@/store/journeyStore'
import { useAdventure } from '@/store/adventureStore'
import { getLumiFriendship, lumiFriendshipRules } from '@/lib/lumiFriendship'
import { getLumiSuggestions, type LumiSuggestion } from '@/features/journal/lib/lumiSuggestions'
import { useLumiNow } from '@/hooks/useLumiNow'
import { LumiPortrait } from '@/features/journal/components/LumiPortrait'
import { LumiQuestion } from '@/features/journal/components/LumiQuestion'
export function LumiJournalPanel({
  onNew,
  onSuggested,
}: {
  onNew: () => void
  onSuggested: (suggestion: LumiSuggestion) => void
}) {
  const state = useAdventure()
  const journey = useJourney()
  const now = useLumiNow()
  const friendship = getLumiFriendship(state.lumiRegistrations, now)
  const suggestions = getLumiSuggestions(state, journey)
  return (
    <>
      <section
        aria-label="Amistad con Lumi"
        className="mt-7 overflow-hidden rounded-3xl border border-[#c7a65a]/40 bg-gradient-to-br from-[#fff8e5] via-[#fbf8f0] to-[#eee8f4] shadow-[0_12px_36px_rgb(75_64_102/7%)]"
      >
        <div className="grid gap-6 p-6 sm:p-8 md:grid-cols-[1fr_0.9fr]">
          <div className="flex items-center gap-5">
            <span className="size-24 shrink-0 sm:size-28">
              <LumiPortrait />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#8c6b2c]">
                Tu compañera de viaje
              </p>
              <h2 className="mt-2 text-2xl font-bold text-[#4b4066]">Amistad con Lumi</h2>
              <p className="mt-1 text-sm text-[#5c5a54]">{friendship.level}</p>
              <p className="mt-3 flex items-center gap-2 text-[#4b4066]">
                <Heart className="size-5 fill-[#c7a65a] text-[#a28240]" />
                <strong className="text-2xl">{friendship.points}</strong> puntos de amistad
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-white/80 bg-white/60 p-5">
            <div className="flex items-center justify-between gap-3 text-sm font-semibold text-[#4b4066]">
              <span>
                Hoy: {friendship.todayEarned} de {lumiFriendshipRules.dailyPointLimit} puntos
              </span>
              <span className="flex gap-1" aria-hidden="true">
                {Array.from({ length: lumiFriendshipRules.dailyPointLimit }, (_, i) => (
                  <Heart
                    key={i}
                    className={`size-4 ${i < friendship.todayEarned ? 'fill-[#c7a65a] text-[#a28240]' : 'text-[#bdb5c8]'}`}
                  />
                ))}
              </span>
            </div>
            <p className="mt-3 text-xs leading-6 text-[#5c5a54]">
              Cada conversación nueva suma 1 punto, hasta {lumiFriendshipRules.dailyPointLimit} al día.{' '}
              {friendship.remainingToday
                ? 'Puedes contarme algo pequeño de tu día.'
                : 'Puedes seguir escribiendo; mañana volverás a sumar.'}
            </p>
            <div
              role="progressbar"
              aria-label="Progreso del nivel de amistad"
              aria-valuenow={Math.round(friendship.progress)}
              aria-valuemin={0}
              aria-valuemax={100}
              className="mt-3 h-2 overflow-hidden rounded-full bg-[#4b4066]/10"
            >
              <div
                className="h-full rounded-full bg-[#c7a65a] transition-all"
                style={{ width: `${friendship.progress}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] text-[#5c5a54]">
              {friendship.nextLevelAt
                ? `Siguiente nivel: ${friendship.nextLevelAt} puntos`
                : '¡Una gran amistad de viaje!'}
            </p>
          </div>
        </div>
        <p className="border-t border-[#c7a65a]/20 px-6 py-3 text-xs leading-5 text-[#5c5a54] sm:px-8">
          Por cada {lumiFriendshipRules.inactiveDaysPerLoss} días sin un registro, la amistad baja{' '}
          {lumiFriendshipRules.pointsPerLoss} punto. Puedes retomarla a tu ritmo; tus conversaciones siempre
          permanecen.
        </p>
      </section>
      <section className="mt-5 flex flex-col justify-between gap-4 rounded-3xl border border-[#4b4066]/15 bg-white/75 p-6 sm:flex-row sm:items-center">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-[#4b4066]">
            <MessageCircle className="size-5" /> Lumi, hoy quiero contarte…
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#5c5a54]">
            Algo que te pasó, una duda o una idea. No necesitas completar una actividad para empezar.
          </p>
        </div>
        <Button className="shrink-0 bg-[#4b4066] text-white hover:bg-[#3f3656]" onClick={onNew}>
          Conversación libre <ArrowRight />
        </Button>
      </section>
      <section className="mt-8" aria-label="Entradas sugeridas">
        <h2 className="flex items-center gap-2 text-xl font-bold text-[#4b4066]">
          <Sparkles className="size-5 text-[#a28240]" /> Entradas sugeridas{' '}
          <span className="rounded-full bg-[#4b4066]/10 px-2.5 py-1 text-xs">{suggestions.length}</span>
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#5c5a54]">
          Después de cada actividad aparece una nueva invitación de Lumi, con sus etiquetas listas para ti.
        </p>
        {suggestions.length ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {suggestions.map((item) => (
              <article
                key={item.activityId}
                className="flex flex-col rounded-2xl border border-[#dad6c9] bg-white/65 p-5"
              >
                <p className="mb-3 text-xs font-semibold text-[#5c5a54]">Después de: {item.title}</p>
                <LumiQuestion prompt={item.prompt} />
                <div className="mt-4 flex flex-wrap gap-2">
                  {item.tags.map((tag) => (
                    <Badge variant="secondary" key={tag} className="bg-[#4b4066]/8 text-[#4b4066]">
                      #{tag}
                    </Badge>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  className="mt-4 self-end text-[#4b4066]"
                  onClick={() => onSuggested(item)}
                >
                  Contarle a Lumi <ArrowRight />
                </Button>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-2xl border border-dashed border-[#dad6c9] bg-white/40 p-5 text-sm leading-6 text-[#5c5a54]">
            No tienes invitaciones pendientes. Mientras sigues tu camino, puedes iniciar una conversación
            libre.
          </p>
        )}
      </section>
    </>
  )
}
