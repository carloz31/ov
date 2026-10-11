import type { Interview } from '../types'
import type { AdventureState } from '@/types/adventure'
import { resourceDemoVideos, legendInterviews } from '@/data/content/adventure'

export type PublishedInterview = Interview & {
  reports: AdventureState['reports']
  reactions: AdventureState['reactions']
}

export function getPublishedInterviews(seeds: Interview[], adventure: AdventureState): PublishedInterview[] {
  const videos = new Map(
    [...resourceDemoVideos, ...legendInterviews, ...adventure.videos].map((video) => [video.id, video]),
  )
  const mapped = new Set(seeds.map((item) => item.videoId ?? item.id))
  const items = [
    ...seeds,
    ...[...videos.values()]
      .filter((video) => !mapped.has(video.id))
      .map((video): Interview => ({
        id: video.id,
        videoId: video.id,
        authors: [video.alias],
        classroomId: '',
        subject: video.title,
        date: video.createdAt,
        commentCount: 0,
        url: video.url,
        reflection: video.reflection,
        featured: false,
      })),
  ]
  return items
    .map((item) => {
      const id = item.videoId ?? item.id
      const moderation = adventure.interviewModeration[id]
      const hidden = Boolean(
        moderation?.hidden ||
        adventure.reports.some((report) => report.postId === id && report.status === 'hidden'),
      )
      const video = adventure.videos.find((video) => video.id === id)
      return {
        ...item,
        ...(video
          ? { subject: video.title, url: video.url, reflection: video.reflection, date: video.createdAt }
          : {}),
        hidden,
        reports: adventure.reports.filter((report) => report.postId === id),
        reactions: adventure.reactions.filter((reaction) => reaction.videoId === id),
        featured: !hidden && (moderation?.featured ?? item.featured),
      }
    })
    .sort((a, b) => b.date.localeCompare(a.date))
}

export function moderateInterview(
  adventure: AdventureState,
  id: string,
  action: 'hide' | 'feature',
  featured = false,
): AdventureState {
  const previous = adventure.interviewModeration[id]
  const hidden = Boolean(
    previous?.hidden ||
    adventure.reports.some((report) => report.postId === id && report.status === 'hidden'),
  )
  if (hidden && action === 'feature') return adventure
  return {
    ...adventure,
    interviewModeration: {
      ...adventure.interviewModeration,
      [id]: action === 'hide' ? { hidden: true, featured: false } : { hidden: false, featured },
    },
  }
}
