import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Flame, Radio } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { ForestFireCaseHeader } from './ForestFireCaseHeader'
import '../styles/forest-fire.css'
import { getExplorationImagePath } from '@/lib/explorationAssets'

const situationNarrative =
  'Durante la madrugada, un incendio forestal se originó en las colinas cercanas a una pequeña localidad rural. Impulsado por el viento y la vegetación seca de la temporada, el fuego avanza sin control, amenazando viviendas, caminos y a las familias que viven en la zona. La comunidad ha dado la voz de alerta y ha solicitado apoyo urgente.'
const roleNarrative = 'Tú has sido designado como coordinador de respuesta ante la emergencia.'
const fullNarrative = `${situationNarrative}\n\n${roleNarrative}`

function ExplorationCaseIntroView({ onClose, onStart }: { onClose: () => void; onStart: () => void }) {
  const [phase, setPhase] = useState<'briefing' | 'active-emergency'>('briefing')
  const [imageVisible, setImageVisible] = useState(false)
  const [panelVisible, setPanelVisible] = useState(false)
  const [typingStarted, setTypingStarted] = useState(false)
  const [visibleCharacterCount, setVisibleCharacterCount] = useState(0)
  const phaseTransitionTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setImageVisible(true)
      setPanelVisible(true)
      setVisibleCharacterCount(fullNarrative.length)
      return
    }
    const imageFrame = requestAnimationFrame(() => setImageVisible(true))
    const panelTimer = setTimeout(() => setPanelVisible(true), 650)
    const typingTimer = setTimeout(() => setTypingStarted(true), 1050)

    return () => {
      cancelAnimationFrame(imageFrame)
      clearTimeout(panelTimer)
      clearTimeout(typingTimer)
    }
  }, [])

  useEffect(() => {
    if (!typingStarted) return

    const typingInterval = setInterval(() => {
      setVisibleCharacterCount((current) => {
        if (current >= fullNarrative.length) {
          clearInterval(typingInterval)
          return current
        }

        return Math.min(current + 2, fullNarrative.length)
      })
    }, 18)

    return () => clearInterval(typingInterval)
  }, [typingStarted])

  useEffect(
    () => () => {
      if (phaseTransitionTimer.current) clearTimeout(phaseTransitionTimer.current)
    },
    [],
  )

  function startEmergencyPhase() {
    if (!narrativeComplete || phase !== 'briefing') return

    setPanelVisible(false)
    phaseTransitionTimer.current = setTimeout(
      () => {
        setPhase('active-emergency')
        setPanelVisible(true)
      },
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 500,
    )
  }

  const visibleSituation = fullNarrative.slice(0, Math.min(visibleCharacterCount, situationNarrative.length))
  const roleStartIndex = situationNarrative.length + 2
  const visibleRole =
    visibleCharacterCount > roleStartIndex ? fullNarrative.slice(roleStartIndex, visibleCharacterCount) : ''
  const narrativeComplete = visibleCharacterCount >= fullNarrative.length

  return (
    <div className="sx-root ff-case ff-case-briefing min-h-screen overflow-hidden">
      <ForestFireCaseHeader
        label="Fase 1 de 3 · Emergencia"
        onClose={onClose}
        progress={100 / 3}
        budgetRemaining={16}
      />

      <main className="relative h-[calc(100vh-5rem)] min-h-[620px] overflow-hidden">
        <img
          alt=""
          aria-hidden="true"
          className={cn(
            'absolute inset-0 size-full object-cover object-[62%_50%] transition-[opacity,transform] duration-1000 ease-out',
            imageVisible ? 'scale-100 opacity-100' : 'scale-[1.04] opacity-0',
          )}
          src={getExplorationImagePath('forest-fire-case-background.png')}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-[#111522]/75 via-[#171622]/22 to-transparent"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-[#11121d]/86 via-transparent to-[#10121c]/20"
        />

        <section
          aria-label={phase === 'briefing' ? fullNarrative : 'Fase 1: Emergencia activa'}
          className={cn(
            'absolute left-1/2 top-1/2 z-10 w-[calc(100%_-_2.5rem)] max-w-[760px] -translate-x-1/2 -translate-y-1/2 rounded-[24px] border border-white/25 bg-[#191725]/82 p-5 text-center text-white shadow-[0_24px_70px_rgb(0_0_0/35%)] backdrop-blur-xl transition-opacity duration-700 md:w-[calc(100%_-_8rem)] md:p-8',
            panelVisible ? 'opacity-100' : 'opacity-0',
          )}
        >
          {phase === 'briefing' ? (
            <>
              <div className="mb-5 flex flex-col items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#ff855f] text-white shadow-lg shadow-orange-950/20">
                  <Radio className="size-5" />
                </span>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/55">
                    Reporte inicial
                  </p>
                  <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Incendio forestal</h1>
                </div>
              </div>

              <div
                aria-hidden="true"
                className="min-h-[132px] text-[15px] leading-7 text-white/82 sm:min-h-[116px] sm:text-base"
              >
                <p>{visibleSituation}</p>
                {visibleRole && (
                  <p className="mt-4 font-bold text-white">
                    {visibleRole}
                    <span
                      className={cn(
                        'ml-0.5 inline-block h-5 w-0.5 translate-y-1 bg-[#ff9b72]',
                        narrativeComplete && 'hidden',
                      )}
                    />
                  </p>
                )}
                {!visibleRole && typingStarted && (
                  <span className="ml-0.5 inline-block h-5 w-0.5 translate-y-1 animate-pulse bg-[#ff9b72]" />
                )}
              </div>

              <div
                className={cn(
                  'mt-6 flex min-h-12 justify-center transition-[opacity,transform] duration-500',
                  narrativeComplete
                    ? 'translate-y-0 opacity-100'
                    : 'pointer-events-none translate-y-2 opacity-0',
                )}
              >
                <Button
                  aria-hidden={!narrativeComplete}
                  className="bg-[#ff855f] px-7 text-white shadow-lg shadow-orange-950/25 hover:bg-[#ed744f]"
                  disabled={!narrativeComplete}
                  onClick={startEmergencyPhase}
                  size="lg"
                  tabIndex={narrativeComplete ? 0 : -1}
                >
                  Comenzar <ArrowRight />
                </Button>
              </div>
            </>
          ) : (
            <div className="flex min-h-52 flex-col items-center justify-center py-4">
              <span className="mb-5 grid size-14 place-items-center rounded-2xl bg-[#ff855f] text-white shadow-lg shadow-orange-950/25">
                <Flame className="size-7" />
              </span>
              <h1 className="text-2xl font-black uppercase tracking-[0.06em] text-white sm:text-4xl">
                Fase 1: Emergencia activa
              </h1>
              <Button className="mt-7 bg-white text-[#3a355f] hover:bg-white/90" onClick={onStart} size="lg">
                Comenzar fase <ArrowRight />
              </Button>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export { ExplorationCaseIntroView }
