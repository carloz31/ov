import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'

const cache = new Map()
const context = vm.createContext({ console, Date, Map, Set, Math, crypto })
function load(file) {
  if (cache.has(file)) return cache.get(file)
  const exports = {}
  cache.set(file, exports)
  const source = readFileSync(file, 'utf8')
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const require = (specifier) => {
    const base = specifier.startsWith('@/')
      ? path.resolve('src', specifier.slice(2))
      : path.resolve(path.dirname(file), specifier)
    const resolved = [base, `${base}.ts`, `${base}.tsx`].find((candidate) => existsSync(candidate))
    return load(resolved)
  }
  vm.runInContext(`(function(require, exports) { ${js}\n})`, context, { filename: file })(require, exports)
  return exports
}

const data = load(path.resolve('src/features/counselor/data/counselorPortal.ts'))
const selectors = load(path.resolve('src/features/counselor/lib/counselorPortalSelectors.ts'))
const { counselorReducer } = load(path.resolve('src/features/counselor/store/counselorPortalReducer.ts'))
const now = new Date('2026-09-27T12:00:00.000Z')
const fresh = () => data.createCounselorPortalState(now)

test('A1-A6 are derived from facts and exact day thresholds', () => {
  const state = fresh()
  const diego = state.students.find((student) => student.id === 's3')
  const alerts = selectors.getAlerts(state, diego)
  for (const code of ['A1', 'A2', 'A3', 'A4', 'A6']) assert.ok(alerts.includes(code), code)
  const boundary = { ...state.students[0], lastAccess: '2026-09-20T12:00:00.000Z' }
  assert.ok(selectors.getAlerts(state, boundary).includes('A1'))
  assert.equal(selectors.getTrafficLight(['A3']), 'priority')
  assert.equal(selectors.getTrafficLight(['A1']), 'attention')
  assert.equal(selectors.getTrafficLight([]), 'on-track')
})

test('priority exclusions recalculate progress and the reducer stores only exclusions', () => {
  const state = fresh()
  const student = state.students.find((item) => item.id === 's5')
  const before = selectors.getPriorityProgress(state, student)
  const next = counselorReducer(state, { type: 'TOGGLE_PRIORITY', activityId: 'act-19' })
  const after = selectors.getPriorityProgress(next, student)
  assert.equal(next.excludedActivityIds.length, 1)
  assert.equal(next.excludedActivityIds[0], 'act-19')
  assert.equal(after.total, before.total - 1)
  assert.ok(after.percent >= before.percent)
  assert.equal(counselorReducer(next, { type: 'TOGGLE_PRIORITY', activityId: 'act-19' }).excludedActivityIds.length, 0)
})

test('reviewing a record removes A4 immediately', () => {
  const state = fresh()
  const student = state.students.find((item) => item.id === 's3')
  const pending = selectors.getPendingReviewRecords(state, student)[0]
  assert.ok(selectors.getAlerts(state, student).includes('A4'))
  const next = counselorReducer(state, { type: 'REVIEW_RECORD', studentId: student.id, recordId: pending.record.id, status: 'ACEPTADO' })
  const updated = next.students.find((item) => item.id === student.id)
  assert.ok(!selectors.getAlerts(next, updated).includes('A4'))
})

test('tag indicators normalize inverse items and ignore neutral items', () => {
  const state = fresh()
  const student = state.students.find((item) => item.id === 's1')
  const entry = student.perceptions.find((item) => item.moment === 'ENTRADA')
  const expectedT4 = 6 - entry.answers.pi8
  assert.equal(selectors.getTagIndicator(state, student, 't4', 'ENTRADA'), expectedT4)
  const rows = selectors.getStudentTagRows(state, student)
  assert.ok(rows.every((row) => row.entry >= 1 && row.entry <= 5))
  assert.ok(rows.some((row) => row.delta !== undefined))
})

test('career cards and interest history are calculated rather than stored', () => {
  const state = fresh()
  const complete = state.students[0].interests.find((item) => item.type === 'CARRERA')
  const incomplete = state.students[1].interests.find((item) => item.type === 'CARRERA')
  assert.equal(selectors.isCardComplete(complete), true)
  assert.equal(selectors.isCardComplete(incomplete), false)
  const timeline = selectors.getInterestTimeline(state.students[0])
  assert.ok(timeline.length >= state.students[0].interests.length)
  assert.ok(timeline.every((item) => item.careers >= 0 && item.occupations >= 0 && item.institutions >= 0))
  assert.ok(state.students[0].institutions.length > 0)
  assert.ok(state.students[0].checkIns.every((item) => !Object.hasOwn(item, 'activityId')))
})

test('family activity activation is derived from the student trigger', () => {
  const state = fresh()
  const early = state.students.find((item) => item.id === 's4')
  const advanced = state.students.find((item) => item.id === 's6')
  const earlyP02 = selectors.getFamilyActivityRows(state, early).find((item) => item.activityId === 'act-p02')
  const advancedP02 = selectors.getFamilyActivityRows(state, advanced).find((item) => item.activityId === 'act-p02')
  assert.equal(earlyP02.activatedAt, undefined)
  assert.ok(advancedP02.activatedAt)
  assert.equal(Object.hasOwn(advanced.familyActivities.find((item) => item.activityId === 'act-p02'), 'activatedAt'), false)
})

test('watchlist, publications and interview moderation share one session reducer', () => {
  let state = fresh()
  state = counselorReducer(state, { type: 'ADD_WATCHLIST_BULK', studentIds: ['s1', 's2', 's3'] })
  assert.ok(state.watchlist.some((item) => item.studentId === 's1'))
  assert.equal(state.watchlist.filter((item) => item.studentId === 's3').length, 1)
  const resource = { id: 'new', type: 'PUBLICACION', title: 'Horario', description: 'Atención', tagIds: ['t8'], audience: 'AMBOS', publicationDate: state.referenceDate, viewCount: 0, favoriteCount: 0 }
  state = counselorReducer(state, { type: 'ADD_RESOURCE', resource })
  assert.equal(state.resources[0].id, 'new')
  state = counselorReducer(state, { type: 'UPDATE_RESOURCE', resource: { ...resource, title: 'Horario actualizado' } })
  assert.equal(state.resources[0].title, 'Horario actualizado')
  state = counselorReducer(state, { type: 'TOGGLE_INTERVIEW_FEATURED', interviewId: 'i2' })
  const interview = state.interviews.find((item) => item.id === 'i2')
  assert.equal(interview.featured, true)
})


test('interview moderation preserves reports, prevents featuring hidden content and includes uploaded videos', () => {
  const { getPublishedInterviews, moderateInterview } = load(path.resolve('src/features/counselor/lib/interviewSelectors.ts'))
  const state = fresh()
  const adventure = { videos: [], reactions: [], reports: [], interviewModeration: {} }
  const initial = getPublishedInterviews(state.interviews, adventure)
  assert.equal(initial.filter(item => item.videoId === 'demo-industrial-design').length, 1)
  assert.equal(initial.find(item => item.id === 'i1').featured, true)
  const highlighted = moderateInterview(adventure, 'demo-electrical-tech', 'feature', true)
  assert.equal(getPublishedInterviews(state.interviews, highlighted).find(item => item.id === 'i2').featured, true)
  const hidden = moderateInterview(highlighted, 'demo-electrical-tech', 'hide')
  assert.equal(hidden.interviewModeration['demo-electrical-tech'].hidden, true)
  assert.equal(hidden.interviewModeration['demo-electrical-tech'].featured, false)
  assert.equal(moderateInterview(hidden, 'demo-electrical-tech', 'feature', true), hidden)
  assert.equal(highlighted.interviewModeration['demo-electrical-tech'].hidden, false)
  const reported = { ...adventure, reports: [{ id: 'r1', postId: 'demo-industrial-design', status: 'hidden' }] }
  assert.equal(getPublishedInterviews(state.interviews, reported).find(item => item.id === 'i1').hidden, true)
  assert.equal(moderateInterview(reported, 'demo-industrial-design', 'feature', true), reported)
  const uploaded = { ...adventure, videos: [{ id: 'upload-1', alias: 'Alex', title: 'Nueva entrevista', createdAt: '2026-10-03', url: '', reflection: '' }] }
  assert.equal(getPublishedInterviews(state.interviews, uploaded).find(item => item.id === 'upload-1').subject, 'Nueva entrevista')
})
