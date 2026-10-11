import type { InstrumentPageId, ResearchPublication, StudentDiscoveryState } from '@/types/discovery'
export type { InstrumentPageId, ResearchPublication, ResearchInProgress, InterviewReaction, CatalogVisit, StudentDiscoveryState } from '@/types/discovery'
import { isIso, isRecord, isStrings, persistentStore } from '@/lib/persistentStore'
export const initialDiscoveryState = (): StudentDiscoveryState => ({
  version: 1,
  revealedPages: [],
  planOrder: [],
  publishedResearch: [],
  reactions: {},
  profileBadges: [],
  profileBadgesConfigured: false,
  badgeFirstSeenAt: {},
  viewedCareerIds: [],
  catalogVisits: [],
})
const text = (v: unknown) => typeof v === 'string'
const optionalIso = (v: unknown) => v === undefined || isIso(v)
export function validPublication(v: unknown): v is ResearchPublication {
  return (
    isRecord(v) &&
    ['interviewee', 'summary', 'change', 'videoUrl'].every((key) => text(v[key])) &&
    isStrings(v.coauthors)
  )
}
export function validDiscoveryState(v: unknown): v is StudentDiscoveryState {
  if (
    isRecord(v) &&
    v.profileBadgesApi !== undefined &&
    (!isRecord(v.profileBadgesApi) ||
      !Object.values(v.profileBadgesApi).every(
        (p) =>
          isRecord(p) &&
          typeof p.profileBadgesConfigured === 'boolean' &&
          isStrings(p.profileBadges) &&
          p.profileBadges.length <= 3 &&
          new Set(p.profileBadges).size === p.profileBadges.length &&
          p.profileBadges.every((c) => /^I\d+$/.test(c)),
      ))
  )
    return false
  if (
    !isRecord(v) ||
    v.version !== 1 ||
    !isStrings(v.revealedPages) ||
    !v.revealedPages.every((id) => ['intereses', 'inteligencias', 'habilidades'].includes(id)) ||
    !isStrings(v.planOrder) ||
    !isStrings(v.viewedCareerIds) ||
    !Array.isArray(v.catalogVisits) ||
    !v.catalogVisits.every(
      (e) =>
        isRecord(e) &&
        ['VISTA_CARRERA', 'VISTA_OCUPACION'].includes(String(e.tipo)) &&
        text(e.referencia) &&
        isIso(e.fechaHora),
    ) ||
    !Array.isArray(v.publishedResearch) ||
    !isRecord(v.reactions) ||
    !isStrings(v.profileBadges) ||
    v.profileBadges.length > 3 ||
    new Set(v.profileBadges).size !== v.profileBadges.length ||
    !v.profileBadges.every((code) => /^I\d+$/.test(code)) ||
    typeof v.profileBadgesConfigured !== 'boolean' ||
    !isRecord(v.badgeFirstSeenAt) ||
    !Object.entries(v.badgeFirstSeenAt).every(([code, date]) => /^I\d+$/.test(code) && isIso(date))
  )
    return false
  if (
    v.revealedPagesApi !== undefined &&
    (!isRecord(v.revealedPagesApi) ||
      !Object.values(v.revealedPagesApi).every(
        (resultados) =>
          isRecord(resultados) &&
          Object.entries(resultados).every(
            ([fecha, paginas]) =>
              isIso(fecha) &&
              isStrings(paginas) &&
              paginas.every((id) => ['intereses', 'inteligencias', 'habilidades'].includes(id)),
          ),
      ))
  )
    return false
  if (v.research !== undefined) {
    const r = v.research
    if (
      !isRecord(r) ||
      !text(r.occupationId) ||
      !text(r.before) ||
      !isStrings(r.ownQuestions) ||
      (r.guideStep !== undefined && !(typeof r.guideStep === 'number' && [0, 1, 2].includes(r.guideStep))) ||
      !optionalIso(r.guideReadyAt) ||
      (r.publishedVideoId !== undefined && !text(r.publishedVideoId)) ||
      (r.publication !== undefined && !validPublication(r.publication))
    )
      return false
  }
  return (
    v.publishedResearch.every(
      (r) =>
        isRecord(r) &&
        text(r.videoId) &&
        text(r.occupationId) &&
        text(r.change) &&
        isStrings(r.coauthors) &&
        (r.interviewee === undefined || text(r.interviewee)),
    ) &&
    Object.values(v.reactions).every(
      (r) =>
        isRecord(r) &&
        optionalIso(r.liked) &&
        (r.learned === undefined ||
          (isRecord(r.learned) && text(r.learned.text) && isIso(r.learned.createdAt))),
    )
  )
}
// Additive migration: preserve every discovery field written by the first implementation.
export function normalizeDiscoveryState(value: unknown): unknown {
  if (!isRecord(value) || value.version !== 1) return value
  const profileBadges = isStrings(value.profileBadges)
    ? [...new Set(value.profileBadges.filter((code) => /^I\d+$/.test(code)))].slice(0, 3)
    : []
  return {
    ...value,
    catalogVisits:
      value.catalogVisits ??
      (isStrings(value.viewedCareerIds)
        ? value.viewedCareerIds.map((referencia) => ({
            tipo: 'VISTA_CARRERA',
            referencia,
            fechaHora: '1970-01-01T00:00:00.000Z',
          }))
        : []),
    profileBadges,
    profileBadgesConfigured:
      typeof value.profileBadgesConfigured === 'boolean'
        ? value.profileBadgesConfigured
        : profileBadges.length > 0,
    badgeFirstSeenAt: isRecord(value.badgeFirstSeenAt)
      ? Object.fromEntries(
          Object.entries(value.badgeFirstSeenAt).filter(([code, date]) => /^I\d+$/.test(code) && isIso(date)),
        )
      : {},
  }
}
const store = persistentStore(
  'ov.student-discovery.v1',
  initialDiscoveryState,
  validDiscoveryState,
  normalizeDiscoveryState,
)
export const useDiscovery = store.useState
export const useDiscoveryError = store.useError
export const updateDiscovery = store.update
export const getDiscovery = store.getSnapshot
export function paginasReveladasApi(
  discovery: StudentDiscoveryState,
  cuenta: string | undefined,
  calculadoEn: string | undefined,
): InstrumentPageId[] {
  return cuenta && calculadoEn ? (discovery.revealedPagesApi?.[cuenta]?.[calculadoEn] ?? []) : []
}
export function revelarPaginaApi(cuenta: string, calculadoEn: string, pagina: InstrumentPageId) {
  updateDiscovery((s) => {
    const paginas = paginasReveladasApi(s, cuenta, calculadoEn)
    return paginas.includes(pagina)
      ? s
      : {
          ...s,
          revealedPagesApi: {
            ...s.revealedPagesApi,
            [cuenta]: { ...s.revealedPagesApi?.[cuenta], [calculadoEn]: [...paginas, pagina] },
          },
        }
  })
}
