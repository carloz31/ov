import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'

const cache = new Map()
const context = vm.createContext({ Date, Map, Set, Math, Intl, URL, URLSearchParams })
function load(file) {
  if (cache.has(file)) return cache.get(file)
  const exports = {}
  cache.set(file, exports)
  const source = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const require = (specifier) => {
    const base = specifier.startsWith('@/')
      ? path.resolve('src', specifier.slice(2))
      : path.resolve(path.dirname(file), specifier)
    const resolved = [base, `${base}.ts`, `${base}.tsx`].find((candidate) => existsSync(candidate))
    return load(resolved)
  }
  vm.runInContext(`(function(require, exports) { ${source}\n})`, context, { filename: file })(
    require,
    exports,
  )
  return exports
}
const selectors = load(path.resolve('src/features/student-tracking/lib/selectors.ts'))
const data = load(path.resolve('src/data/demo/studentProfiles.ts'))
const navigation = load(path.resolve('src/features/student-tracking/lib/navigation.ts'))
const table = load(path.resolve('src/features/counselor/data/exampleStudents.ts'))
const priorities = load(path.resolve('src/features/counselor/store/prioritySettings.ts'))
const initialCatalog = priorities.configuredCatalog(priorities.initialPrioritySettings())
const copy = (value) => JSON.parse(JSON.stringify(value))
const initial = data.studentProfiles[4]
const intermediate = data.studentProfiles[5]
const advanced = data.studentProfiles[6]

test('all 24 table identities and values are projections of the profile', () => {
  assert.equal(table.exampleStudents.length, 24)
  for (const row of table.exampleStudents) {
    const student = data.studentProfiles.find((s) => s.id === row.id)
    assert.equal(row.avance, selectors.priorityProgress(student, initialCatalog.activities, initialCatalog.questionnaires).percent)
    assert.deepEqual(
      copy(row.alertas),
      copy(selectors.profileAlerts(student, data.studentProfiles, data.activities)),
    )
    assert.equal(row.ultimoIngreso, student.ultimoIngreso)
    assert.equal(row.nombres, student.nombres)
    assert.equal(row.salon, student.salon)
  }
})
test('general progress counts finite free and locked activities once, ignoring unknown and pending completions', () => {
  const student = {
    ...copy(initial),
    activities: [
      { activityId: 'one', state: 'completed' },
      { activityId: 'one', state: 'completed' },
      { activityId: 'optional', state: 'completed' },
      { activityId: 'pending', state: 'in-progress' },
      { activityId: 'unknown', state: 'completed' },
    ],
  }
  const activities = [
    { id: 'one', required: true },
    { id: 'locked', required: true },
    { id: 'optional', required: false },
    { id: 'pending', required: false },
    { id: 'one', required: true },
  ]
  assert.equal(selectors.generalProgress(student, activities).percent, 50)
  assert.equal(selectors.generalProgress(student, activities).completed, 2)
  assert.equal(selectors.generalProgress(student, activities).total, 4)
  assert.equal(selectors.progress(student, [activities[0], activities[0]]).total, 1)
  assert.equal(selectors.generalProgress(student, []).total, 0)
  assert.equal(selectors.generalProgress(student, []).percent, 0)
  student.activities = activities.map((a) => ({ activityId: a.id, state: 'completed' }))
  assert.equal(selectors.generalProgress(student, activities).percent, 100)
})

test('both progress groupings partition the catalog and reconcile with the general total', () => {
  for (const student of data.studentProfiles) {
    const overall = selectors.generalProgress(student, data.activities)
    for (const group of ['blocks', 'types']) {
      const rows = selectors.progressGroups(student, [...data.activities, data.activities[0]], data.blocks, group)
      assert.equal(rows.reduce((sum, row) => sum + row.total, 0), overall.total)
      assert.equal(rows.reduce((sum, row) => sum + row.completed, 0), overall.completed)
      assert.equal(rows.filter((row) => row.id === 'free').length, 1)
      assert.equal(rows.find((row) => row.id === 'free').total, 3)
    }
  }
  const overall = selectors.generalProgress(intermediate, data.activities)
  assert.equal(overall.completed, 11)
  assert.equal(overall.total, 21)
  assert.equal(overall.percent, 52)
  const unknownBlock = { ...data.activities[0], id: 'unassigned', blockId: 'unknown-block' }
  const rows = selectors.progressGroups(initial, [unknownBlock], data.blocks, 'blocks')
  assert.equal(rows.reduce((sum, row) => sum + row.total, 0), 1)
})
test('priority union includes questionnaire parts and records once, and supports no priorities', () => {
  const activities = [
    { id: 'a', kind: 'record', priority: true },
    { id: 'b', kind: 'questionnaire', priority: false },
    { id: 'c', kind: 'information', priority: true },
  ]
  const questionnaires = [{ priority: true, activityIds: ['a', 'b', 'b'] }]
  assert.deepEqual(copy(selectors.priorityActivities(activities, questionnaires).map((a) => a.id)), [
    'a',
    'b',
  ])
  assert.equal(
    selectors.priorityActivities(
      activities.map((a) => ({ ...a, priority: false })),
      [],
    ).length,
    0,
  )
})
test('classroom alert uses raw percentages, the whole classroom and arithmetic mean', () => {
  const activities = [
    { id: 'a', required: true },
    { id: 'b', required: true },
    { id: 'c', required: true },
  ]
  const first = {
    ...copy(initial),
    guardian: {},
    activities: [{ activityId: 'a', state: 'completed', answers: [] }],
    plans: [{}],
  }
  const second = {
    ...copy(first),
    activities: [...first.activities, { activityId: 'b', state: 'completed', answers: [] }],
  }
  assert.ok(Math.abs(selectors.classroomAverage(first, [first, second], activities) - 50) < 1e-10)
  assert.ok(selectors.profileAlerts(first, [first, second], activities).includes('AVANCE_BAJO_PROMEDIO'))
  assert.ok(!selectors.profileAlerts(second, [first, second], activities).includes('AVANCE_BAJO_PROMEDIO'))
})
test('representative profiles cover flat interests, pending exit, attention, empty and advanced states', () => {
  assert.equal(selectors.generalProgress(initial, data.activities).percent, 0)
  assert.equal(initial.guardian, undefined)
  assert.equal(initial.plans.length, 0)
  assert.equal(initial.signals.length, 0)
  const interests = intermediate.questionnaires.find((q) => q.result?.kind === 'interests').result
  assert.equal(selectors.isFlatProfile(interests.values), true)
  assert.equal(selectors.affinities(intermediate, data.profileCatalog).occupations.length, 0)
  assert.ok(selectors.observationCounts(intermediate).attention > 0)
  assert.ok(selectors.observationCounts(intermediate).underdeveloped > 0)
  const comparison = intermediate.questionnaires.find((q) => q.result?.kind === 'comparison').result
  assert.equal(selectors.changeSummary(comparison), 'Salida pendiente')
  assert.ok(selectors.changes(comparison).every((r) => r.label === 'Salida pendiente'))
  assert.equal(advanced.plans.length, 3)
  assert.equal(selectors.signalSummary(advanced).securityTrend, 'En aumento')
  assert.equal(selectors.signalSummary(intermediate).securityTrend, 'En descenso')
})
test('dimension highlights include all ties and flat results never get a code', () => {
  const values = [
    { dimensionId: 'A', percent: 80 },
    { dimensionId: 'B', percent: 80 },
    { dimensionId: 'C', percent: 40 },
  ]
  assert.deepEqual(copy(selectors.highlightedDimensions(values)), ['A', 'B'])
  const flat = values.map((v) => ({ ...v, percent: 50 }))
  assert.equal(selectors.interestCode(flat, data.questionnaires[0].dimensions).length, 0)
})
test('comparison supports per-dimension aggregates and changes without depending on individual items', () => {
  const result = {
    kind: 'comparison',
    entry: [{ dimensionId: 'group', level: 2.5, percent: 50 }],
    exit: [{ dimensionId: 'group', level: 3.5, percent: 70 }],
  }
  assert.equal(selectors.changes(result)[0].label, 'Subió')
  result.exit[0].level = 2.5
  assert.equal(selectors.changes(result)[0].label, 'Se mantuvo')
  result.exit[0].level = 1.5
  assert.equal(selectors.changes(result)[0].label, 'Bajó')
})
test('trend window boundaries and adjustable threshold are respected', () => {
  for (const length of [0, 6, 7])
    assert.equal(selectors.trend(Array(length).fill(4), 0.5), 'Sin datos suficientes')
  for (const length of [8, 13, 14]) {
    assert.equal(selectors.trend(Array(length).fill(4), 0.5), 'Estable')
    assert.equal(selectors.trend([...Array(length - 7).fill(3), ...Array(7).fill(5)], 0.5), 'En aumento')
    assert.equal(selectors.trend([...Array(length - 7).fill(5), ...Array(7).fill(3)], 0.5), 'En descenso')
  }
  assert.equal(selectors.trend([3, ...Array(7).fill(3.4)], 0.5), 'Estable')
  assert.equal(selectors.trend([3, ...Array(7).fill(3.5)], 0.5), 'En aumento')
})
test('diary average includes zero-entry sessions and excludes days without sessions', () => {
  const student = {
    ...copy(initial),
    signals: [
      { date: '2026-10-01', session: true, security: null, diaryEntries: 0 },
      { date: '2026-10-02', session: true, security: 4, diaryEntries: 4 },
      { date: '2026-10-03', session: false, security: null, diaryEntries: 0 },
    ],
  }
  assert.equal(selectors.signalSummary(student).diaryAverage, 2)
  assert.equal(selectors.signalSummary(student).checkInDays, 1)
  assert.equal(selectors.signalSummary(initial).diaryAverage, null)
})
test('plan completeness counts four sections and accepts explicit zero costs and no scholarship', () => {
  const plan = copy(advanced.plans[0])
  assert.equal(selectors.planCompleteness(plan), 100)
  plan.motivation = ''
  assert.equal(selectors.planCompleteness(plan), 75)
  plan.swot.obstacles = ''
  assert.equal(selectors.planCompleteness(plan), 50)
  plan.budget.tuition = null
  assert.equal(selectors.planCompleteness(plan), 25)
  plan.actions = []
  assert.equal(selectors.planCompleteness(plan), 0)
})
test('catalog references, questionnaire results and activity completion stay coherent', () => {
  for (const student of data.studentProfiles) {
    assert.ok(student.plans.length <= 3)
    for (const app of student.questionnaires) {
      const def = data.questionnaires.find((q) => q.id === app.questionnaireId)
      const completed = student.activities.filter(
        (a) => def.activityIds.includes(a.activityId) && a.state === 'completed',
      ).length
      assert.equal(completed, app.completedParts)
      if (app.result) assert.equal(app.result.kind, def.kind)
    }
    for (const plan of student.plans)
      assert.ok(data.profileCatalog.careers.some((c) => c.id === plan.careerId))
    for (const id of student.favorites.occupations)
      assert.ok(data.profileCatalog.occupations.some((o) => o.id === id))
    for (const day of student.signals) {
      assert.deepEqual(Object.keys(day).sort(), ['date', 'diaryEntries', 'diaryEntriesByType', 'security', 'session'])
      assert.equal(Object.values(day.diaryEntriesByType).reduce((sum, count) => sum + count, 0), day.diaryEntries)
    }
  }
})
test('return links preserve filters and reject external or unrelated destinations', () => {
  const destination = '/counselor/students?salon=5.%C2%B0+A&q=Ana&alertas=with'
  assert.equal(navigation.safeReturnTo(destination), destination)
  for (const value of [
    null,
    'https://example.com/counselor/students',
    '//example.com/counselor/students',
    '/student',
    '/counselor/students/ejemplo-01',
    '/\\evil.com/counselor/students',
  ])
    assert.equal(navigation.safeReturnTo(value), '/counselor/students')
  const profile = new URL(
    navigation.profileUrl('ejemplo-01', destination, 'records', true),
    'https://local.invalid',
  )
  assert.equal(profile.searchParams.get('returnTo'), destination)
  assert.equal(profile.searchParams.get('section'), 'records')
  assert.equal(profile.searchParams.get('review'), 'attention')
})
test('relative access uses Lima calendar days including null and midnight boundaries', () => {
  assert.equal(selectors.relativeAccess(null), 'Nunca ingresó')
  assert.equal(selectors.relativeAccess('2026-10-03T03:00:00Z', '2026-10-03T04:00:00Z'), 'hoy')
  assert.equal(selectors.relativeAccess('2026-10-03T03:00:00Z', '2026-10-03T06:00:00Z'), 'ayer')
})


test('priority settings default to every questionnaire and record, independently of sharing', () => {
  const settings = priorities.initialPrioritySettings()
  assert.deepEqual(copy(settings.questionnaireIds), copy(data.questionnaires.map(q => q.id)))
  assert.deepEqual(copy(settings.recordIds), copy(data.activities.filter(a => a.kind === 'record').map(a => a.id)))
  assert.deepEqual(copy(settings.sharedQuestionnaireIds), ['interests', 'social', 'intelligences'])
  const original = copy(data.activities)
  const catalog = priorities.configuredCatalog(settings)
  assert.equal(selectors.priorityActivities(catalog.activities, catalog.questionnaires).length, 14)
  assert.deepEqual(copy(data.activities), original)
  assert.equal(selectors.generalProgress(intermediate, catalog.activities).total, 21)
  let changed = priorities.prioritySettingsReducer(settings, { type: 'all-records', checked: false })
  assert.equal(changed.recordIds.length, 0)
  assert.deepEqual(copy(changed.questionnaireIds), copy(settings.questionnaireIds))
  changed = priorities.prioritySettingsReducer(changed, { type: 'questionnaire', id: 'entry', checked: false })
  const changedCatalog = priorities.configuredCatalog(changed)
  assert.equal(selectors.priorityActivities(changedCatalog.activities, changedCatalog.questionnaires).length, 8)
  assert.equal(priorities.canShareResult(changed, 'interests', true), true)
  assert.equal(priorities.canShareResult(changed, 'interests', false), false)
  for (const id of ['entry', 'perception', 'unknown']) {
    assert.equal(priorities.canShareResult(changed, id, true), false)
    assert.deepEqual(copy(priorities.prioritySettingsReducer(changed, { type: 'sharing', id, checked: true })), copy(changed))
  }
})

test('priority store preserves changes through remounts and reloads and tolerates unavailable or corrupt storage', () => {
  const values = new Map()
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }
  const first = priorities.createPrioritySettingsStore(() => storage)
  let notifications = 0
  const stop = first.subscribe(() => notifications++)
  first.dispatch({ type: 'questionnaire', id: 'interests', checked: false })
  first.dispatch({ type: 'record', id: 'swot', checked: false })
  first.dispatch({ type: 'sharing', id: 'social', checked: false })
  assert.equal(notifications, 3)
  assert.equal(first.dispatch({ type: 'sharing', id: 'entry', checked: true }), false)
  assert.equal(first.dispatch({ type: 'sharing', id: 'social', checked: false }), false)
  assert.equal(notifications, 3)
  stop()
  const second = priorities.createPrioritySettingsStore(() => storage)
  assert.deepEqual(copy(second.getSnapshot()), copy(first.getSnapshot()))
  assert.equal(priorities.canShareResult(second.getSnapshot(), 'interests', true), true)
  for (const raw of ['invalid', '{}', '{"version":1,"recordIds":null}', '{"version":2}']) {
    const recovered = priorities.createPrioritySettingsStore(() => ({ getItem: () => raw, setItem() {} }))
    assert.deepEqual(copy(recovered.getSnapshot()), copy(priorities.initialPrioritySettings()))
  }
  const unavailable = priorities.createPrioritySettingsStore(() => { throw Error('unavailable') })
  unavailable.dispatch({ type: 'all-records', checked: false })
  assert.equal(unavailable.getSnapshot().recordIds.length, 0)
})


test('draft priority changes remain isolated until one atomic save', () => {
  const store = priorities.createPrioritySettingsStore()
  const original = copy(store.getSnapshot())
  let draft = priorities.prioritySettingsReducer(store.getSnapshot(), { type: 'questionnaire', id: 'entry', checked: false })
  draft = priorities.prioritySettingsReducer(draft, { type: 'record', id: 'swot', checked: false })
  draft = priorities.prioritySettingsReducer(draft, { type: 'sharing', id: 'interests', checked: false })
  assert.deepEqual(copy(store.getSnapshot()), original)
  let notifications = 0
  store.subscribe(() => notifications++)
  store.dispatch({ type: 'replace', settings: draft })
  assert.equal(notifications, 1)
  assert.deepEqual(copy(store.getSnapshot()), copy(draft))
  store.dispatch({ type: 'replace', settings: { questionnaireIds: ['entry', 'unknown', 'entry'], recordIds: ['story', 'unknown'], sharedQuestionnaireIds: ['entry', 'social', 'social'] } })
  assert.deepEqual(copy(store.getSnapshot()), { questionnaireIds: ['entry'], recordIds: ['story'], sharedQuestionnaireIds: ['social'] })
})


const classroom = load(path.resolve('src/features/counselor/lib/classroomSelectors.ts'))
const groupSummary = (students, activities = data.activities, questionnaires = data.questionnaires) => classroom.classroomSummary(students, data.studentProfiles, activities, questionnaires, data.blocks, data.profileCatalog)
test('classroom counts match every profile and each top counts distinct students', () => {
  for (const salon of ['all', '5.° A', '5.° B']) {
    const students = data.studentProfiles.filter(s => salon === 'all' || s.salon === salon)
    const summary = groupSummary(students)
    assert.equal(summary.total, students.length)
    assert.equal(summary.withAlerts, students.filter(s => selectors.profileAlerts(s, data.studentProfiles, data.activities).length).length)
    assert.equal(summary.average, students.reduce((sum,s) => sum + selectors.priorityProgress(s, data.activities, data.questionnaires).rawPercent,0) / students.length)
    for (const row of summary.questionnaires) assert.equal(row.completed + row.progress + row.pending, students.length)
    for (const row of summary.records) {
      assert.equal(row.completed + row.progress + row.pending, students.length)
      assert.equal(row.attention, students.filter(s => selectors.observationCounts(s,row.activity.id).attention > 0).length)
    }
    assert.equal(summary.plans.three + summary.plans.partial + summary.plans.none, students.length)
    assert.equal(summary.security.trends.reduce((sum,r) => sum + r.count,0), students.length)
    assert.equal(summary.diary.guided + summary.diary.dailyPrompt + summary.diary.free + summary.diary.unclassified, summary.diary.total)
    assert.equal(summary.family.possible, students.reduce((sum,s) => sum + s.conversations.length,0))
    for (const rows of Object.values(summary.tops)) assert.ok(rows.length <= 5)
  }
  const active = groupSummary(data.studentProfiles.filter(s => s.salon === '5.° A'))
  for (const [name,rows] of Object.entries(active.tops)) assert.equal(rows.length,5,name)
  const quiet = groupSummary(data.studentProfiles.filter(s => s.salon === '5.° B'))
  assert.ok(quiet.average < active.average)
  assert.ok(data.studentProfiles.filter(s => s.salon === '5.° B' && !s.signals.length).length >= 10)
})
test('classroom selectors handle missing priorities, empty catalogs and missing applications', () => {
  const empty = groupSummary([], [], [])
  assert.equal(empty.average,null)
  assert.equal(empty.security.average,null)
  assert.equal(empty.diary.average,null)
  assert.equal(empty.questionnaireComplete,null)
  assert.equal(empty.withAlerts,0)
  const noPriority = groupSummary(data.studentProfiles, data.activities, data.questionnaires.map(q => ({...q,priority:false})))
  assert.equal(noPriority.questionnaireComplete,null)
  assert.equal(classroom.applicationState(undefined),'not-started')
  const result = intermediate.questionnaires.find(q => q.result?.kind === 'comparison')
  assert.equal(classroom.applicationState(result),'in-progress')
  assert.equal(classroom.applicationState(advanced.questionnaires.find(q => q.result?.kind === 'comparison')),'completed')
  assert.equal(classroom.resolveSalon(null,'5.° B',['5.° A','5.° B']),'5.° B')
  assert.equal(classroom.resolveSalon('5.° A','5.° B',['5.° A','5.° B']),'5.° A')
  assert.equal(classroom.resolveSalon('invalid','5.° B',['5.° A','5.° B']),'all')
  assert.equal(classroom.resolveSalon('all','5.° B',['5.° A','5.° B']),'all')
})
test('classroom option counts deduplicate IDs, ignore unknown IDs and sort tied options alphabetically', () => {
  const students = [{...copy(initial), favorites: { careers: ['b','b','a','unknown'], occupations: [], institutions: [] }}]
  const rows = classroom.optionTop(students, [{id:'b',name:'Beta'},{id:'a',name:'Alfa'}], s => s.favorites.careers)
  assert.deepEqual(copy(rows),[{id:'a',name:'Alfa',count:1},{id:'b',name:'Beta',count:1}])
})
test('classroom diary averages include zero sessions and preserve unclassified legacy counts', () => {
  const student = {...copy(initial),signals:[{date:'2026-10-01',session:true,security:0,diaryEntries:0},{date:'2026-10-02',session:true,security:8,diaryEntries:4}]}
  const second = {...copy(initial),id:'other',signals:[{date:'2026-10-01',session:true,security:null,diaryEntries:0}]}
  const summary = groupSummary([student,second])
  assert.equal(summary.diary.average,2)
  assert.equal(summary.diary.base,2)
  assert.equal(summary.diary.unclassified,4)
  assert.equal(summary.security.average,8)
  assert.equal(summary.security.base,1)
  assert.equal(classroom.diaryCounts(student).total,4)
})
test('classroom questionnaire frequencies preserve ties, flat profiles and pending exits', () => {
  const summary = groupSummary([initial,intermediate,advanced])
  const interests = summary.questionnaires.find(q => q.definition.kind === 'interests')
  assert.equal(interests.flat,1)
  const comparison = summary.questionnaires.find(q => q.definition.kind === 'comparison')
  assert.equal(comparison.entry,2)
  assert.equal(comparison.exit,1)
  assert.equal(comparison.progress,1)
  const intelligence = summary.questionnaires.find(q => q.definition.id === 'intelligences')
  const result = advanced.questionnaires.find(q => q.questionnaireId === 'intelligences').result
  for (const id of selectors.highlightedDimensions(result.values)) assert.ok(intelligence.frequent.some(d => d.id === id))
})


test('combined interests count students once and sort plans before favorites before names', () => {
  const catalog = ['z','b','a','c','d','e','f'].map(id => ({ id, name: id.toUpperCase() }))
  const students = [
    { plans: ['z','z','unknown'], favorites: ['a','b','b','c','d','e','f','unknown'] },
    { plans: ['b'], favorites: ['b','a','c','d','e','f'] },
  ]
  const rows = classroom.interestTop(students, catalog, s => s.plans, s => s.favorites)
  assert.deepEqual(copy(rows.map(r => [r.id,r.plans,r.favorites])), [['b',1,2],['z',1,0],['a',0,2],['c',0,2],['d',0,2]])
  assert.deepEqual(copy(classroom.interestTop([],catalog,s=>s.plans,s=>s.favorites)), [])
})

test('comparative increases count a student once even with several increases and a decrease', () => {
  const definition = data.questionnaires.find(q => q.kind === 'comparison')
  const original = advanced.questionnaires.find(q => q.questionnaireId === definition.id)
  const application = copy(original)
  const result = application.result
  result.entry = result.entry.map(v => ({...v, percent: 40, level: 2}))
  result.exit = result.entry.map((v,i) => ({...v, percent: i === 0 ? 20 : 60, level: i === 0 ? 1 : 3}))
  const student = {...copy(advanced),questionnaires:[application]}
  const row = groupSummary([student],data.activities,[definition]).questionnaires[0]
  const expected = selectors.changes(result).some(r=>r.label === 'Subió') ? 1 : 0
  assert.equal(expected,1)
  assert.equal(row.increased,1)
  assert.equal(row.exit,1)
  for (const level of [1,2]) {
    const unchangedOrLower = {...application,result:{...result,exit:result.entry.map(v=>({...v,level,percent:level*20}))}}
    assert.equal(groupSummary([{...student,questionnaires:[unchangedOrLower]}],data.activities,[definition]).questionnaires[0].increased,0)
  }
  assert.equal(groupSummary([intermediate]).questionnaires.find(r=>r.definition.id === definition.id).increased,0)
})

test('record footer observations cover every priority record and deduplicate attention students', () => {
  const students = data.studentProfiles
  const summary = groupSummary(students)
  const records = data.activities.filter(a => a.kind === 'record' && a.priority)
  assert.equal(summary.recordObservations.attention, students.filter(s => records.some(a => selectors.observationCounts(s,a.id).attention > 0)).length)
  assert.equal(summary.recordObservations.underdeveloped, students.reduce((sum,s)=> sum + records.reduce((count,a)=> count + selectors.observationCounts(s,a.id).underdeveloped,0),0))
  const duplicateAttention = {...copy(initial),activities:records.slice(0,2).map(a=>({activityId:a.id,state:'completed',answers:[{itemId:'test',text:'Respuesta final',date:'2026-10-01',underdeveloped:true,attention:true}]}))}
  const countedOnce = groupSummary([duplicateAttention])
  assert.equal(countedOnce.recordObservations.attention,1)
  assert.equal(countedOnce.recordObservations.underdeveloped,2)
  const none = groupSummary(students,data.activities.map(a=>({...a,priority:false})))
  assert.deepEqual(copy(none.recordObservations),{underdeveloped:0,attention:0})
})

test('concrete institutions keep budget and favorite references valid', () => {
  const ids = new Set(data.profileCatalog.institutions.map(i=>i.id))
  assert.deepEqual([...ids],['unmsm','pucp','utec','tecsup','senati'])
  for (const student of data.studentProfiles) {
    for (const id of student.favorites.institutions) assert.ok(ids.has(id))
    for (const plan of student.plans) if (plan.budget?.institutionId) assert.ok(ids.has(plan.budget.institutionId))
  }
})


test('classroom priority average follows current settings and ignores nonpriority activities', () => {
  const activities = data.activities.map(a=>({...a,priority:false}))
  const questionnaires = data.questionnaires.map(q=>({...q,priority:false}))
  assert.equal(groupSummary(data.studentProfiles,activities,questionnaires).average,null)
  const selected = [{...activities.find(a=>a.kind === 'record'),priority:true}]
  const students = [initial,intermediate,advanced]
  const summary = groupSummary(students,selected,questionnaires)
  assert.equal(summary.priorityActivityCount,1)
  assert.equal(summary.average,students.reduce((sum,s)=>sum+selectors.priorityProgress(s,selected,questionnaires).rawPercent,0)/students.length)
})


const family = load(path.resolve('src/features/parent/lib/selectors.ts'))
test('family route ignores unknown or unassigned completions and handles empty and complete routes', () => {
  const activities=[{id:'a',audiencia:'apoderado',orden:1,requisitos:[]},{id:'b',audiencia:'apoderado',orden:2,requisitos:['a']},{id:'c',audiencia:'estudiante',orden:1,requisitos:[]}]
  const children=[{id:'child'}]
  const partial=family.parentRoute(activities,children,['a','a','c','unknown'])
  assert.equal(partial.completed,1);assert.equal(partial.total,2);assert.equal(partial.next.id,'b');assert.equal(partial.complete,false)
  assert.equal(family.parentRoute(activities,children,['a','b']).complete,true)
  assert.equal(family.parentRoute([],children,[]).complete,false)
  assert.equal(family.selectedFamilyChild(children,'unknown').id,'child')
  assert.equal(family.selectedFamilyChild([...children,{id:'other'}],'other').id,'other')
})
test('family conversation summaries use the same two-sided completion and availability rules', () => {
  const topics=[{id:'a'},{id:'b'},{id:'c'}]
  const demo=[{id:'a',parent:'yes',student:'yes',parentMarkedAt:'date',studentMarkedAt:'date'},{id:'b',parent:'yes',student:'yes'}]
  assert.deepEqual(copy(family.conversationSummary(topics,demo,[],true)),{available:3,completed:1,pending:2})
  assert.deepEqual(copy(family.conversationSummary(topics,demo,[],false)),{available:0,completed:0,pending:0})
  assert.equal(family.conversationSummary(topics,demo,[{id:'a',parent:'yes'}],true).completed,0)
})
test('family sharing excludes internal instruments and incomplete results', () => {
  assert.deepEqual(copy(family.familySharedIds({sharedQuestionnaireIds:['interests','entry','perception','unknown']})),['interests'])
  assert.equal(family.completeFamilyResult(undefined),false)
  assert.equal(family.completeFamilyResult({state:'in-progress',result:{kind:'highlights',values:[{dimensionId:'x',percent:40}]}}),false)
  assert.equal(family.completeFamilyResult({state:'completed',result:{kind:'highlights',values:[]}}),false)
  assert.equal(family.completeFamilyResult({state:'completed',result:{kind:'highlights',values:[{dimensionId:'x',percent:40}]}}),true)
})
