import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'

import { occupationCatalog } from '@/data/catalog/occupations'
import { updateAdventure, useAdventure } from '@/store/adventureStore'
import { useJourney } from '@/store/journeyStore'

import { useDiscovery } from '@/store/discoveryStore'

import {
  getClassroomInterviews,
  getLegendInterviews,
  interviewVisible,
  researchUnlocked,
} from '@/features/discovery/lib/research'

export function useStudentResearch() {
  const state = useAdventure(),
    discovery = useDiscovery(),
    navigate = useNavigate(),
    [params, setParams] = useSearchParams()
  const unlocked = researchUnlocked(state, useJourney()),
    research = discovery.research
  const [tab, setTab] = useState<'classroom' | 'mine'>('classroom'),
    [legends, setLegends] = useState(false),
    [guide, setGuide] = useState(false),
    [allies, setAllies] = useState(false),
    [publish, setPublish] = useState(false),
    [reporting, setReporting] = useState<string>(),
    [query, setQuery] = useState(''),
    [favoritesOnly, setFavoritesOnly] = useState(false)
  const videos = legends ? getLegendInterviews(state) : getClassroomInterviews(state)
  const isOwn = (id: string, alias: string) =>
    discovery.publishedResearch.some((p) => p.videoId === id) || alias.split(/ y |, /).includes('Alex')
  const selectedId = params.get('entrevista')
  const selected = [...getClassroomInterviews(state), ...getLegendInterviews(state)].find(
    (v) => v.id === selectedId && interviewVisible(v, state),
  )
  const visibleSelectedId = selected?.id
  useEffect(() => {
    if (unlocked && visibleSelectedId)
      updateAdventure((current) =>
        current.visits.includes(visibleSelectedId)
          ? current
          : { ...current, visits: [...current.visits, visibleSelectedId] },
      )
  }, [unlocked, visibleSelectedId])
  const visible = videos.filter(
    (v) =>
      (legends || tab === 'classroom' || isOwn(v.id, v.alias)) &&
      (!favoritesOnly || state.bookmarks.includes(v.id)) &&
      v.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  )
  const occupation = occupationCatalog.find((o) => o.id === research?.occupationId)
  const toggleBookmark = (id: string) =>
    updateAdventure((current) => ({
      ...current,
      bookmarks: current.bookmarks.includes(id)
        ? current.bookmarks.filter((value) => value !== id)
        : [...current.bookmarks, id],
    }))
  const markSeen = (id: string) =>
    updateAdventure((current) =>
      current.visits.includes(id) ? current : { ...current, visits: [...current.visits, id] },
    )
  return {
    state,
    navigate,
    setParams,
    unlocked,
    research,
    tab,
    setTab,
    legends,
    setLegends,
    guide,
    setGuide,
    allies,
    setAllies,
    publish,
    setPublish,
    reporting,
    setReporting,
    query,
    setQuery,
    favoritesOnly,
    setFavoritesOnly,
    isOwn,
    selected,
    visible,
    occupation,
    toggleBookmark,
    markSeen,
  }
}
