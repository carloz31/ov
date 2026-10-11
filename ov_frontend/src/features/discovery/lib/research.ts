import { occupationCatalog } from '@/data/catalog/occupations'
import { resourceDemoVideos, legendInterviews } from '@/data/content/adventure'
import { safeVideoUrl, updateAdventure } from '@/store/adventureStore'
import { isTravelResourceUnlocked } from '@/features/backpack/lib/travelerResources'
import type { AdventureState } from '@/types/adventure'
import type { JourneyState } from '@/types/activities'
import { getDiscovery, updateDiscovery } from '@/store/discoveryStore'
import type { ResearchPublication } from '@/types/discovery'
import { getAllies, legendIds } from '@/data/content/research'
export type InterviewVideo = AdventureState['videos'][number]
export function researchUnlocked(adventure: AdventureState, journey: JourneyState) {
  return isTravelResourceUnlocked(
    {
      id: 'research-access',
      title: '',
      summary: '',
      description: '',
      kind: 'interview',
      icon: 'quote',
      requirement: { anyCase: true },
    },
    journey,
    adventure,
  )
}
export function interviewVisible(video: InterviewVideo, state: AdventureState) {
  return (
    !state.interviewModeration[video.id]?.hidden &&
    !state.reports.some((report) => report.postId === video.id && report.status === 'hidden')
  )
}
export function getClassroomInterviews(state: AdventureState) {
  const map = new Map<string, InterviewVideo>(resourceDemoVideos.map((item) => [item.id, { ...item }]))
  state.videos.forEach((item) => map.set(item.id, item))
  return [...map.values()]
    .filter((video) => interviewVisible(video, state))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
export function getLegendInterviews(state: AdventureState) {
  return [...getClassroomInterviews(state).filter((v) => legendIds.has(v.id)), ...legendInterviews].filter(
    (v) => interviewVisible(v, state),
  )
}
export function isPublicationValid(p: ResearchPublication) {
  return !!p.interviewee.trim() && p.summary.trim().length >= 30 && !!safeVideoUrl(p.videoUrl)
}
export function publishResearch(publication: ResearchPublication) {
  const research = getDiscovery().research
  if (!research?.guideReadyAt || research.publishedVideoId || !isPublicationValid(publication))
    return research?.publishedVideoId
  const occupation = occupationCatalog.find((o) => o.id === research.occupationId)
  if (!occupation) return undefined
  // Stable per prepared guide: a retry after a reload cannot add the same video twice.
  const id = `research-${Date.parse(research.guideReadyAt)}-${occupation.id}`
  updateAdventure((current) => ({
    ...current,
    videos: current.videos.some((v) => v.id === id)
      ? current.videos
      : [
          ...current.videos,
          {
            id,
            title: occupation.name,
            alias: 'Alex',
            url: safeVideoUrl(publication.videoUrl)!,
            reflection: publication.summary.trim(),
            createdAt: new Date().toISOString(),
          },
        ],
  }))
  updateDiscovery((s) => ({
    ...s,
    research: { ...research, publication, publishedVideoId: id },
    publishedResearch: s.publishedResearch.some((r) => r.videoId === id)
      ? s.publishedResearch
      : [
          ...s.publishedResearch,
          {
            videoId: id,
            occupationId: occupation.id,
            coauthors: publication.coauthors.filter((alias) => getAllies(occupation.id).includes(alias)),
            change: publication.change.trim(),
            interviewee: publication.interviewee.trim(),
          },
        ],
  }))
  return id
}
export function saveLearned(videoId: string, text: string) {
  if (text.trim().length < 15) return false
  updateDiscovery((s) =>
    s.reactions[videoId]?.learned
      ? s
      : {
          ...s,
          reactions: {
            ...s.reactions,
            [videoId]: {
              ...s.reactions[videoId],
              learned: { text: text.trim(), createdAt: new Date().toISOString() },
            },
          },
        },
  )
  return true
}
export function toggleLiked(videoId: string) {
  updateDiscovery((s) => ({
    ...s,
    reactions: {
      ...s.reactions,
      [videoId]: {
        ...s.reactions[videoId],
        liked: s.reactions[videoId]?.liked ? undefined : new Date().toISOString(),
      },
    },
  }))
}
