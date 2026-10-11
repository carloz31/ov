import { useReturnFocus } from '@/hooks/useReturnFocus'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { occupationCatalog } from '@/data/catalog/occupations'
import { useOccupationExplorationContext } from '@/context/occupationExplorationContext'
import { useAdventure } from '@/store/adventureStore'
import { useJourney } from '@/store/journeyStore'
import { useDiscovery, updateDiscovery } from '@/store/discoveryStore'
import type { ResearchInProgress } from '@/types/discovery'
import { researchUnlocked } from '@/features/discovery/lib/research'
export function useResearchGuide() {
  const focus = useReturnFocus()
  const replacementFocus = useReturnFocus()
  const discovery = useDiscovery(),
    context = useOccupationExplorationContext()
  const [params, setParams] = useSearchParams()
  const [picker, setPicker] = useState(false),
    [query, setQuery] = useState(''),
    [question, setQuestion] = useState(''),
    [guide, setGuide] = useState(false),
    [replacement, setReplacement] = useState<string>()
  const unlocked = researchUnlocked(useAdventure(), useJourney())
  const research: ResearchInProgress = discovery.research ?? {
    occupationId: '',
    before: '',
    ownQuestions: [],
    guideStep: 0,
  }
  const step = research.guideReadyAt ? 2 : (research.guideStep ?? 0)
  const guidePage = useRef<HTMLDivElement>(null)
  const previousStep = useRef(step)
  useEffect(() => {
    if (previousStep.current === step) return
    previousStep.current = step
    guidePage.current?.closest('.sx-module-content')?.scrollTo({ top: 0, behavior: 'instant' })
    const heading = guidePage.current?.querySelector<HTMLElement>('h1,h2')
    heading?.setAttribute('tabindex', '-1')
    heading?.focus({ preventScroll: true })
  }, [step])
  const occupation = occupationCatalog.find((o) => o.id === research.occupationId)
  function patch(value: Partial<ResearchInProgress>) {
    updateDiscovery((s) => ({
      ...s,
      research: { ...(s.research ?? { occupationId: '', before: '', ownQuestions: [] }), ...value },
    }))
  }
  function choose(id: string) {
    if (id === research.occupationId) return
    if (
      research.occupationId &&
      (research.before.trim() || research.ownQuestions.length || research.guideReadyAt)
    )
      setReplacement(id)
    else patch({ occupationId: id })
    setPicker(false)
  }
  useEffect(() => {
    const id = params.get('occupationId')
    if (!unlocked || !id || !occupationCatalog.some((o) => o.id === id)) return
    if (
      discovery.research?.occupationId &&
      discovery.research.occupationId !== id &&
      (discovery.research.before.trim() ||
        discovery.research.ownQuestions.length ||
        discovery.research.guideReadyAt)
    )
      setReplacement(id)
    else
      updateDiscovery((s) => ({
        ...s,
        research: { ...(s.research ?? { before: '', ownQuestions: [] }), occupationId: id },
      }))
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        next.delete('occupationId')
        return next
      },
      { replace: true },
    )
  }, [params, setParams, unlocked, discovery.research])
  const favoriteIds = context.profiles.filter((p) => p.interested).map((p) => p.occupationId)
  const choices = occupationCatalog
    .filter((o) =>
      o.name
        .toLocaleLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .includes(
          query
            .toLocaleLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim(),
        ),
    )
    .sort((a, b) => Number(favoriteIds.includes(b.id)) - Number(favoriteIds.includes(a.id)))
  function addQuestion() {
    const text = question.trim()
    if (text.length < 5) return
    patch({ ownQuestions: [...research.ownQuestions, text] })
    setQuestion('')
  }
  return {
    focus,
    replacementFocus,
    picker,
    setPicker,
    query,
    setQuery,
    question,
    setQuestion,
    guide,
    setGuide,
    replacement,
    setReplacement,
    unlocked,
    research,
    step,
    guidePage,
    occupation,
    patch,
    choose,
    favoriteIds,
    choices,
    addQuestion,
  }
}
