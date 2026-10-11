import { useEffect, useRef, useState } from 'react'
import { useJourney, updateJourney, useJourneyError } from '@/store/journeyStore'
import {
  answerBattle,
  canStartChallenge,
  challengeRequirements,
  recordBattle,
  startBattle,
} from '@/lib/challenges'
import type { Battle, Challenge } from '@/types/challenges'
export function useChallengePlayer({ challenge: c }: { challenge: Challenge }) {
  const state = useJourney()
  const error = useJourneyError()
  const practice = useRef(state.progress[c.id]?.estado === 'completada')
  const [stage, setStage] = useState<'intro' | 'battle' | 'result'>('intro')
  const [battle, setBattle] = useState<Battle>()
  const [resourcesOpen, setResourcesOpen] = useState(false)
  const [exitOpen, setExitOpen] = useState(false)
  const title = useRef<HTMLHeadingElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const requirements = challengeRequirements(c, state)
  const sheets = c.requisitos.filter((r) => r.tipo === 'ficha').map((r) => r.id)
  const question = battle?.questions[battle.index]
  const hit = !!battle?.selected && battle.selected === question?.correcta
  const victory = battle?.enemyLife === 0
  useEffect(() => {
    title.current?.focus()
  }, [stage, battle?.answered])
  function start() {
    if (!canStartChallenge(c, state)) return
    setResourcesOpen(false)
    setBattle(
      startBattle(
        c,
        battle?.questions.slice(0, battle.answered).map((q) => q.id),
      ),
    )
    setStage('battle')
  }
  function answer(id: string) {
    if (!battle || battle.selected) return
    const next = answerBattle(battle, id)
    if (next.finished && !practice.current && !updateJourney((s) => recordBattle(c, next, s))) return
    setBattle(next)
  }
  const responseTitle = hit
    ? `¡Golpe de luz! ${c.nombre} pierde fuerza.`
    : `${c.nombre} resiste. Pierdes un destello.`
  return {
    c,
    state,
    error,
    practice,
    stage,
    setStage,
    battle,
    setBattle,
    resourcesOpen,
    setResourcesOpen,
    exitOpen,
    setExitOpen,
    title,
    closeButton,
    requirements,
    sheets,
    question,
    hit,
    victory,
    start,
    answer,
    responseTitle,
  }
}
