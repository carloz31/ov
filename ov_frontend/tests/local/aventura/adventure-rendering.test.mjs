import { loadMapPoints } from '../../soporte/refactor-map.mjs'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'

const nativeRequire = createRequire(import.meta.url)
// A3: el código trasladado a hooks conserva el mismo entorno simulado de su vista.
function loadMovedHook(file, require) {
  const js = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
  const exports = {}
  const movedRequire = specifier => require(specifier.startsWith('.')
    ? `@/${path.relative(path.resolve('src'), path.resolve(path.dirname(file), specifier)).replaceAll('\\', '/')}`
    : specifier)
  vm.runInContext(`(function(require,exports){${js}\n})`, context, { filename: file })(movedRequire, exports)
  return exports
}
const cache = new Map()
const context = vm.createContext({
  console,
  Date,
  URL,
  URLSearchParams,
  Map,
  Set,
  crypto,
  AbortController,
  window: { addEventListener() {} },
  localStorage: { getItem: () => null, setItem() {} },
})
function load(file) {
  if (cache.has(file)) return cache.get(file)
  if (file.endsWith('.json')) return JSON.parse(readFileSync(file, 'utf8'))
  const exports = {}
  cache.set(file, exports)
  const source = readFileSync(file, 'utf8').replaceAll('import.meta.env.BASE_URL', "'/'")
  const js = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText
  const require = (specifier) => {
    if (specifier.endsWith('.css')) return {}
    // Supply a deterministic snapshot for static rendering, without mounting subscriptions.
    if (specifier === 'react') return { ...React, useSyncExternalStore: (_, snapshot) => snapshot() }
    if (!specifier.startsWith('.') && !specifier.startsWith('@/')) return nativeRequire(specifier)
    const base = specifier.startsWith('@/')
      ? path.resolve('src', specifier.slice(2))
      : path.resolve(path.dirname(file), specifier)
    const resolved = [base, `${base}.ts`, `${base}.tsx`].find((candidate) => existsSync(candidate))
    return load(resolved)
  }
  vm.runInContext(`(function(require, exports) { ${js}\n})`, context, { filename: file })(require, exports)
  return exports
}
const store = load(path.resolve('src/store/adventureStore.ts'))
const { fieldMissions } = load(path.resolve('src/data/content/adventure.ts'))
const { familyConversationDemoData, familyConversationTopics } = load(
  path.resolve('src/data/content/familyConversations.ts'),
)
const { AppRoutes } = load(path.resolve('src/routes/AppRoutes.tsx'))
const parentMissionStore = load(path.resolve('src/store/parentJourneyStore.ts'))
function completedParentJourney() {
  const { parentActivities } = load(path.resolve('src/data/activities/content.ts'))
  const { initialJourney } = load(path.resolve('src/lib/activities/logic.ts'))
  const journey = initialJourney()
  for (const activity of parentActivities) {
    journey.progress[activity.id] = {
      estudianteId: 'apo-prototipo',
      actividadId: activity.id,
      estado: 'completada',
      nodoActualId: '$fin',
    }
    journey.attempts.push(
      ...activity.nodos
        .filter((node) => node.tipo === 'pregunta')
        .map((node) => ({
          estudianteId: 'apo-prototipo',
          actividadId: activity.id,
          nodoId: node.id,
          correcta: true,
          revelada: false,
        })),
    )
    journey.resources.push(...(activity.recompensa?.recursoIds ?? []))
  }
  return journey
}
function render(route, patch = {}) {
  const { initialJourney } = load(path.resolve('src/lib/activities/logic.ts'))
  parentMissionStore.updateParentJourney(() => patch.parentJourney ?? initialJourney())
  store.updateAdventure(() => ({ ...store.createInitialAdventure(), ...patch }))
  return renderToStaticMarkup(
    React.createElement(MemoryRouter, { initialEntries: [route] }, React.createElement(AppRoutes)),
  )
}

test('students list shows priority progress and averages the selected classroom before rounding', () => {
  const { activities, questionnaires, studentProfiles } = load(path.resolve('src/data/demo/studentProfiles.ts'))
  const { priorityProgress } = load(path.resolve('src/features/student-tracking/lib/selectors.ts'))
  const { configuredCatalog, initialPrioritySettings } = load(path.resolve('src/features/counselor/store/prioritySettings.ts'))
  const catalog = configuredCatalog(initialPrioritySettings())
  const fabio = studentProfiles[5]
  const fabioPriority = priorityProgress(fabio, catalog.activities, catalog.questionnaires)
  const table = render('/counselor/students?q=Fabio')
  assert.match(table, /Avance prioritario promedio/)
  assert.match(table, /Avance prioritario de Fabio/)
  assert.ok(table.includes(`aria-valuenow="${fabioPriority.percent}"`))
  for (const salon of [undefined, ...new Set(studentProfiles.map(s => s.salon))]) {
    const students = studentProfiles.filter(s => !salon || s.salon === salon)
    const expected = Math.round(students.reduce((sum, s) => sum + priorityProgress(s, catalog.activities, catalog.questionnaires).rawPercent, 0) / students.length)
    const params = new URLSearchParams({ q: 'Fabio' })
    if (salon) params.set('salon', salon)
    const markup = render(`/counselor/students?${params}`)
    assert.ok(markup.includes(`Avance prioritario promedio</p><p class="text-xl font-bold leading-tight">${expected} %`))
  }
  assert.equal(priorityProgress(fabio, activities, questionnaires).percent, 75)
})

test('staff themes distinguish completion from scores and preserve student progress styling', () => {
  const { ThemeProvider } = load(path.resolve('src/components/common/ThemeScope.tsx'))
  const { Progress } = load(path.resolve('src/components/ui/Progress.tsx'))
  const { StatusBadge } = load(path.resolve('src/components/ui/Status.tsx'))
  const themed = (theme, component) =>
    renderToStaticMarkup(React.createElement(ThemeProvider, { theme }, component))
  for (const value of [0, 52, 100]) {
    const markup = themed('staff', React.createElement(Progress, { value }))
    assert.match(markup, new RegExp(`aria-valuenow="${value}"`))
    assert.ok(markup.includes('background-color:var(--primary)'))
    const score = themed('staff', React.createElement(Progress, { value, intent: 'data' }))
    assert.match(score, /background-color:var\(--data-primary\)/)
    assert.doesNotMatch(score, /background-color:var\(--success\)/)
    const student = themed('student', React.createElement(Progress, { value }))
    assert.doesNotMatch(student, /background-color:/)
  }
  for (const [status, label] of [
    ['completed', 'Completado'],
    ['in-progress', 'En progreso'],
    ['not-started', 'No iniciado'],
    ['unavailable', 'Aún no disponible'],
  ]) {
    const markup = themed('staff', React.createElement(StatusBadge, { status }))
    assert.ok(markup.includes(label))
    assert.match(markup, /<svg/)
  }
})

test('staff routes receive the calm theme and the student keeps its own theme', () => {
  for (const route of ['/counselor/students', '/parent/overview', '/parent/conversations'])
    assert.match(render(route), /class="[^"]*\btheme-staff /)
  assert.doesNotMatch(render('/student/conversations'), /class="[^"]*\btheme-staff /)
  const table = render('/counselor/students')
  assert.doesNotMatch(table, /y \d+ más/)
  const { exampleStudents } = load(path.resolve('src/features/counselor/data/exampleStudents.ts'))
  const { profileAlertLabels } = load(path.resolve('src/features/student-tracking/lib/selectors.ts'))
  for (const student of exampleStudents)
    for (const alert of student.alertas) assert.ok(table.includes(profileAlertLabels[alert]))
})

test('instrument series use emphasis and reference colors, including pending exits and flat profiles', () => {
  const { ThemeProvider } = load(path.resolve('src/components/common/ThemeScope.tsx'))
  const { QuestionnaireBars } = load(path.resolve('src/features/student-tracking/components/QuestionnaireBars.tsx'))
  const { questionnaires, studentProfiles } = load(
    path.resolve('src/data/demo/studentProfiles.ts'),
  )
  const renderResult = (student, id) =>
    renderToStaticMarkup(
      React.createElement(
        ThemeProvider,
        { theme: 'staff' },
        React.createElement(QuestionnaireBars, {
          definition: questionnaires.find((q) => q.id === id),
          result: student.questionnaires.find((q) => q.questionnaireId === id).result,
        }),
      ),
    )
  const interests = renderResult(studentProfiles[6], 'interests')
  assert.equal((interests.match(/background-color:var\(--data-primary\)/g) ?? []).length, 3)
  assert.equal((interests.match(/background-color:var\(--data-secondary\)/g) ?? []).length, 3)
  assert.doesNotMatch(interests, /background-color:var\(--success\)/)
  const flat = renderResult(studentProfiles[5], 'interests')
  assert.match(flat, /Perfil plano/)
  assert.doesNotMatch(flat, /aria-label="Código de interés"/)
  const complete = renderResult(studentProfiles[6], 'entry')
  assert.match(complete, /Comparación de resultados de entrada y salida/)
  assert.match(complete, /Subió/)
  assert.match(complete, /Bajó/)
  assert.match(complete, /Se mantuvo/)
  assert.doesNotMatch(complete, /role="progressbar"/)
  const pending = renderResult(studentProfiles[5], 'entry')
  assert.match(pending, /Cuestionario de salida pendiente/)
  assert.match(pending, /Pendiente/)
  assert.match(pending, /40.*%/)
  assert.doesNotMatch(pending, /role="progressbar"|Se mantuvo/)
})
test('highlight results share one prominent summary after bars, including ties and empty values', () => {
  const { ThemeProvider } = load(path.resolve('src/components/common/ThemeScope.tsx'))
  const { QuestionnaireBars } = load(path.resolve('src/features/student-tracking/components/QuestionnaireBars.tsx'))
  const { questionnaires } = load(path.resolve('src/data/demo/studentProfiles.ts'))
  const renderResult = (definition, values) => renderToStaticMarkup(
    React.createElement(ThemeProvider, { theme: 'staff' },
      React.createElement(QuestionnaireBars, { definition, result: { kind: 'highlights', values } })),
  )
  for (const definition of questionnaires.filter(q => q.kind === 'highlights')) {
    const values = definition.dimensions.map((d, i) => ({ dimensionId: d.id, percent: i === 0 ? 80 : 40 }))
    const single = renderResult(definition, values)
    assert.match(single, /aria-label="Dimensión destacada"/)
    assert.equal((single.match(/background-color:var\(--data-primary\)/g) ?? []).length, 1)
    assert.equal((single.match(/background-color:var\(--data-secondary\)/g) ?? []).length, values.length - 1)
    assert.ok(single.indexOf('aria-label="Dimensión destacada"') > single.lastIndexOf('role="progressbar"'))
    values[1].percent = 80
    const tied = renderResult(definition, [...values].reverse())
    assert.match(tied, /aria-label="Dimensiones destacadas"/)
    assert.match(tied, /Empate en el puntaje más alto/)
    assert.ok(tied.includes(`${definition.dimensions[0].name} · ${definition.dimensions[1].name}`))
    assert.equal((tied.match(/background-color:var\(--data-primary\)/g) ?? []).length, 2)
    const allTied = renderResult(definition, values.map(v => ({ ...v, percent: 50 })))
    assert.match(allTied, /Todas las dimensiones tienen el mismo puntaje/)
    const empty = renderResult(definition, [])
    assert.match(empty, /Sin resultados registrados/)
    assert.doesNotMatch(empty, /aria-label="Dimensió|role="progressbar"/)
    const detail = render(`/counselor/students/ejemplo-07/questionnaires/${definition.id}`)
    assert.doesNotMatch(detail, /Sus dimensiones destacadas|Las demás dimensiones/)
    const summaryIndex = detail.search(/aria-label="Dimensi(?:ón destacada|ones destacadas)"/)
    assert.ok(summaryIndex > detail.lastIndexOf('role="progressbar"'))
    assert.ok(summaryIndex < detail.indexOf('Qué significa cada dimensión'))
  }
})

test('comparisons render exact changes in a table and mobile facts without duplicate bars', () => {
  const { QuestionnaireComparison } = load(path.resolve('src/features/student-tracking/components/QuestionnaireComparison.tsx'))
  const { questionnaires } = load(path.resolve('src/data/demo/studentProfiles.ts'))
  const definition = questionnaires.find(q => q.id === 'entry')
  const result = {
    kind: 'comparison', entryDate: '2026-01-01',
    entry: definition.dimensions.map(d => ({ dimensionId: d.id, level: 2.5, percent: 50 })),
    exit: definition.dimensions.map((d, i) => ({ dimensionId: d.id, level: [2.6, 2.5, 2.4][i], percent: [52, 50, 48][i] })),
  }
  const renderComparison = () => renderToStaticMarkup(React.createElement(QuestionnaireComparison, { definition, result }))
  const complete = renderComparison()
  for (const label of ['Dimensión', 'Entrada', 'Salida', 'Cambio', 'Subió', 'Bajó', 'Se mantuvo']) assert.ok(complete.includes(label))
  assert.match(complete, /scope="col"/)
  assert.match(complete, /scope="row"/)
  assert.match(complete, /<dl/)
  assert.doesNotMatch(complete, /role="progressbar"/)
  result.exit = undefined
  const pending = renderComparison()
  assert.match(pending, /Cuestionario de salida pendiente/)
  assert.doesNotMatch(pending, /Subió|Bajó|Se mantuvo/)
  result.entry = []
  assert.match(renderComparison(), /Sin resultados registrados/)
})

test('all new student pages and related parent/counselor routes render', () => {
  for (const route of [
    '/student/missions',
    '/student/exploration',
    '/student/research',
    '/student/journal',
    '/student/journal/signal',
    '/student/community',
    '/student/resources',
    '/student/profile?section=passport',
    '/student/conversations',
    '/student/testimonials',
    '/student/profile',
    '/student/profile/decisions',
    '/parent/conversations',
    '/counselor/home',
    '/counselor/students',
    '/counselor/students/s1',
    '/counselor/students/s1?section=progress',
    '/counselor/students/s1?section=instruments',
    '/counselor/students/s1?section=interests',
    '/counselor/students/s1?section=records',
    '/counselor/students/s1?section=journal',
    '/counselor/students/s1?section=family',
    '/counselor/students/s1?section=data',
    '/counselor/students/s1/records/s1-act-02-v1',
    '/counselor/students/s1/family-records/act-p03-1',
    '/counselor/reviews',
    '/counselor/publications',
    '/counselor/priorities',
  ]) {
    assert.ok(render(route).length > 100, route)
  }
})
test('profiles open for every table student and keep read-only controls and return filters', () => {
  const { studentProfiles } = load(path.resolve('src/data/demo/studentProfiles.ts'))
  for (const student of studentProfiles) {
    const markup = render(`/counselor/students/${student.id}`)
    assert.match(markup, new RegExp(`${student.nombres} ${student.apellidos}`))
    assert.match(markup, /Avance en lo prioritario/)
    assert.match(markup, /Avance general/)
    assert.doesNotMatch(
      markup,
      /Identificador:|Agregar a observados|Quitar de observados|Registrar observaci/,
    )
  }
  const returnTo = '/counselor/students?q=Fabio&alertas=with'
  const markup = render(`/counselor/students/ejemplo-06?returnTo=${encodeURIComponent(returnTo)}`)
  assert.match(markup, /href="\/counselor\/students\?q=Fabio&amp;alertas=with"/)
  assert.match(markup, /Perfil plano/)
  assert.ok(markup.indexOf('Cuestionarios</h2>') < markup.indexOf('Detalle de avance</h2>'))
})

test('reorganized profile summarizes family before progress and exposes explicit record controls', () => {
  const summary = render('/counselor/students/ejemplo-06')
  assert.ok(summary.indexOf('Familia</h2>') < summary.indexOf('Detalle de avance</h2>'))
  assert.ok(summary.indexOf('Opciones</h2>') < summary.indexOf('Registros</h2>'))
  assert.match(summary, /Seguridad y check-in/)
  assert.match(summary, /11 de 21 actividades completadas/)
  assert.match(summary, /Actividades libres/)
  assert.doesNotMatch(summary, /Lo que descubro de mí|Mis alternativas/)
  assert.match(render('/counselor/students/ejemplo-06?section=records'), /Ver respuesta/)
  assert.match(render('/counselor/students/ejemplo-06?section=records&review=attention'), /Ocultar respuesta/)
})

test('questionnaire details present one code, dimension cards and visible catalog descriptions', () => {
  const { questionnaires, profileCatalog, studentProfiles } = load(
    path.resolve('src/data/demo/studentProfiles.ts'),
  )
  const interests = render('/counselor/students/ejemplo-07/questionnaires/interests')
  assert.equal((interests.match(/<h3[^>]*>Código de interés<\/h3>/g) ?? []).length, 1)
  assert.doesNotMatch(interests, /Su código de interés/)
  assert.match(interests, /Posibles intereses/)
  const result = studentProfiles[6].questionnaires.find((q) => q.questionnaireId === 'interests').result
  for (const match of result.matches) {
    const occupation = profileCatalog.occupations.find((o) => o.id === match.occupationId)
    assert.ok(interests.includes(occupation.description), occupation.name)
    for (const careerId of occupation.careerIds)
      assert.ok(interests.includes(profileCatalog.careers.find((c) => c.id === careerId).description))
  }
  for (const definition of questionnaires) {
    const markup = render(`/counselor/students/ejemplo-07/questionnaires/${definition.id}`)
    for (const dimension of definition.dimensions) {
      assert.ok(markup.includes(dimension.description), `${definition.id}/${dimension.id}`)
      assert.ok(!markup.includes(dimension.color), `No dimension-specific color: ${dimension.id}`)
    }
  }
  const pending = render('/counselor/students/ejemplo-06/questionnaires/entry')
  assert.match(pending, /Entrada:.*Bajo/)
  assert.match(pending, /Cuestionario de salida pendiente/)
})

test('new profile tabs, result routes, empty states and unknown IDs render', () => {
  const { studentProfiles } = load(path.resolve('src/data/demo/studentProfiles.ts'))
  const { studentQuestionnaire } = load(path.resolve('src/routes/paths.ts')).appPaths.counselor
  for (const section of ['summary', 'questionnaires', 'records', 'options', 'security']) {
    const markup = render(`/counselor/students/ejemplo-07?section=${section}`)
    assert.match(markup, /Gabriela García Muñoz/)
    assert.match(markup, /role="tabpanel"/)
  }
  assert.match(
    render('/counselor/students/ejemplo-06?section=records&review=attention'),
    /Me preocupa no poder continuar mis estudios/,
  )
  assert.doesNotMatch(
    render('/counselor/students/ejemplo-06?section=summary'),
    /Me preocupa no poder continuar mis estudios/,
  )
  const empty = render('/counselor/students/ejemplo-05?section=options')
  assert.match(empty, /Plan A sin registrar/)
  assert.match(empty, /Todavía no marca carreras como favoritas/)
  assert.match(render('/counselor/students/ejemplo-05?section=security'), /Aún no registra check-ins/)
  for (const questionnaire of ['interests', 'social', 'intelligences', 'entry', 'perception']) {
    assert.match(
      render(studentQuestionnaire(studentProfiles[6].id, questionnaire)),
      /Qué mide este cuestionario/,
    )
  }
  const pending = render('/counselor/students/ejemplo-06/questionnaires/entry')
  assert.match(pending, /Cuestionario de salida pendiente/)
  assert.match(pending, /scope="col"[^>]*>Entrada<\/th>/)
  assert.match(pending, /<span class="block">Bajo<\/span>/)
  const flat = render('/counselor/students/ejemplo-06/questionnaires/interests')
  assert.doesNotMatch(flat, /Ocupaciones afines<\/h2>|Carreras que conducen/)
  assert.match(
    render('/counselor/students/ejemplo-05/questionnaires/interests'),
    /Aún no completa este cuestionario/,
  )
  assert.match(render('/counselor/students/unknown'), /Estudiante no encontrado/)
  assert.match(render('/counselor/students/ejemplo-07/questionnaires/unknown'), /Cuestionario no encontrado/)
  assert.match(render('/counselor/students/priorities'), /Visible para el apoderado/)
})

test('profile explains missing priorities and directs to the full questionnaire filter', () => {
  const { prioritySettingsStore, initialPrioritySettings } = load(path.resolve('src/features/counselor/store/prioritySettings.ts'))
  const defaults = initialPrioritySettings()
  try {
    defaults.questionnaireIds.forEach(id => prioritySettingsStore.dispatch({ type: 'questionnaire', id, checked: false }))
    prioritySettingsStore.dispatch({ type: 'all-records', checked: false })
    const summary = render('/counselor/students/ejemplo-07')
    assert.match(summary, /Aún no defines prioritarios/)
    assert.match(summary, /Aún no marcas cuestionarios como prioritarios/)
    assert.doesNotMatch(summary, /Ver resultado<\/a>/)
    assert.match(render('/counselor/students/ejemplo-07?section=questionnaires'), /Aún no marcas cuestionarios como prioritarios/)
    assert.match(render('/counselor/students/ejemplo-07?section=records'), /Aún no marcas actividades de registro como prioritarias/)
  } finally {
    defaults.questionnaireIds.forEach(id => prioritySettingsStore.dispatch({ type: 'questionnaire', id, checked: true }))
    prioritySettingsStore.dispatch({ type: 'all-records', checked: true })
  }
})

test('counselor v2 screens expose the revised controls and terminology', () => {
  const home = render('/counselor/home')
  assert.match(home, /Avance prioritario promedio/)
  assert.match(home, /Avance prioritario promedio/)
  assert.doesNotMatch(home, /Atasco|Mejor/)

  const students = render('/counselor/students')
  assert.match(students, /Mis estudiantes/)
  assert.match(students, /Filtrar por sal.{1,3}n/)
  assert.match(students, /Filtrar alertas/)
  assert.match(students, /Acciones/)
  assert.match(students, />Alertas</)

  const publications = render('/counselor/publications')
  assert.match(publications, />Publicaciones</)
  assert.match(publications, /Ver entrevista/)
  assert.doesNotMatch(publications, /Nueva publicación|role="tab"/)
  assert.doesNotMatch(publications, />Disponibilidad</)
  assert.doesNotMatch(publications, /Borrador/)

  const priorities = render('/counselor/priorities')
  assert.match(priorities, />Prioritarios</)
  assert.match(priorities, /Visible para el apoderado/)
  assert.match(priorities, /role="checkbox"/)
  assert.doesNotMatch(priorities, /Editar actividades|Guardar cambios/)
  assert.doesNotMatch(priorities, />Prioritaria</)

  const instruments = render('/counselor/students/s1?section=instruments')
  assert.ok(instruments.indexOf('Tests de Me conozco') < instruments.indexOf('Cuestionario de entrada'))
  const journal = render('/counselor/students/s1?section=journal')
  assert.match(journal, /El contenido del diario es privado/)
  assert.match(journal, /Check-in de seguridad/)

  const interests = render('/counselor/students/s1?section=interests')
  assert.match(interests, /RIASEC/)
  assert.match(interests, /Ocupaciones de inter/)
  assert.match(interests, /Instituciones de inter/)
  assert.match(interests, /Acciones para Enfermer/)

  const family = render('/counselor/students/s1?section=family')
  assert.match(family, /Actividades del apoderado/)
  assert.match(family, /Registros/)
  assert.match(family, /Conversaciones/)
  assert.match(family, /Apoderado/)
  assert.match(render('/counselor/students/s3?section=family'), /No se ha registrado ning/)

  const familyRecord = render('/counselor/students/s1/family-records/act-p03-1')
  assert.match(familyRecord, /Pregunta para estudiante/)
  assert.match(familyRecord, /Pregunta para apoderado/)
  assert.match(familyRecord, /únicamente de consulta/)

  const progress = render('/counselor/students/s1?section=progress')
  assert.match(progress, /Por bloque/)
  assert.match(progress, /Por tipo/)
  assert.match(progress, /Registros prioritarios/)
  assert.match(progress, /Registros observados/)
  assert.match(progress, /ltimas 5 semanas/)
  assert.doesNotMatch(progress, />Registros<\/button>/)

  const record = render('/counselor/students/s1/records/s1-act-02-v1')
  assert.match(record, /tem 1/)
  assert.match(record, /Observar y sugerir rehacer/)
  assert.doesNotMatch(record, /Está bien/)

  const observedRecord = render('/counselor/students/s3/records/s3-act-06-v1')
  assert.match(observedRecord, /Quitar observación/)
  assert.doesNotMatch(observedRecord, /Observar y sugerir rehacer/)

  const data = render('/counselor/students/s1?section=data')
  assert.match(data, /Promoci/)
  assert.match(data, /Grado y secci/)
  assert.match(data, /Fecha de primer acceso/)
  assert.match(data, /Datos de apoderados/)
})
test('presentation locks pending path missions while prototype city and research stay accessible', () => {
  const html = render('/student/missions')
  assert.match(html, /El inicio del viaje/)
  assert.match(html, /Las huellas que traigo, bloqueado/)
  assert.doesNotMatch(html, /La llave de la ciudad, bloqueado/)
  assert.doesNotMatch(render('/student/exploration'), /Estación de investigación/)
  assert.match(render('/student/research', { solvedCaseIds: ['forest-fire'] }), /Iniciar investigación/)
})
test('the city and research station render after the actual mission requirement', () => {
  const patch = { completedMissionIds: fieldMissions.map((item) => item.id) }
  assert.doesNotMatch(render('/student/exploration', patch), /Estación de investigación/)
  assert.match(render('/student/research', { ...patch, solvedCaseIds: ['forest-fire'] }), /Iniciar investigación/)
})
test('guide stays collapsed until its help button is activated', () => {
  const html = render('/student/missions')
  assert.match(html, /aria-label="Abrir guía"/)
  assert.doesNotMatch(html, /role="dialog"/)
})
test('student routes have no sidebar and modules have a return button and header help', () => {
  const routes = [
    '/student/missions',
    '/student/exploration',
    '/student/research',
    '/student/journal',
    '/student/journal/signal',
    '/student/community',
    '/student/resources',
    '/student/profile?section=passport',
    '/student/conversations',
    '/student/testimonials',
    '/student/catalog/professions',
    '/student/catalog/careers',
    '/student/catalog/institutions',
    '/student/profile',
    '/student/profile/decisions',
  ]
  for (const route of routes) {
    const html = render(route)
    assert.match(html, /aria-label="Abrir guía"/, route)
    assert.doesNotMatch(html, /data-sidebar="sidebar"/, route)
    if (route !== '/student/missions' && route !== '/student/exploration') {
      assert.match(html, /Volver al mapa/, route)
      assert.match(html, /sx-module-header/, route)
      assert.doesNotMatch(html, /pointer-events-none fixed inset-0/, route)
    }
    assert.doesNotMatch(html, /aria-label="Abrir guía" class="[^"]*w-full/, route)
  }
})
test('student shell returns to the last visited zone and preserves module navigation', () => {
  const ui = load(path.resolve('src/store/studentUiStore.ts'))
  try {
    ui.updateStudentUi(current => ({ ...current, lastMap: 'central' }))
    const html = render('/student/catalog/careers')
    assert.match(html, /href="\/student\/exploration"[^>]*><[^>]*[\s\S]*?Volver al mapa/)
    assert.match(html, /Ingeniería Ambiental/)
    assert.match(html, /aria-label="Menú de Alex"/)
    assert.doesNotMatch(html, /role="dialog"/)
    ui.updateStudentUi(current => ({ ...current, lastMap: 'missions' }))
    assert.match(render('/student/research'), /href="\/student\/missions"/)
    assert.match(render('/student/profile/decisions'), /Mis planes/)
    assert.match(render('/student/profile/decisions'), /Lo que guardaste en el camino/)
    assert.doesNotMatch(render('/student/profile'), /class="sx-module-tabs"/)
  } finally {
    ui.updateStudentUi(() => ui.initialStudentUiState())
  }
})

test('completed v2 missions synchronize in field order without duplicates or mutations', () => {
  const { getMissionsToSync, specActivityByMission } = loadMapPoints(load)
  const adventure = store.createInitialAdventure()
  adventure.completedMissionIds = ['welcome', 'story']
  const journey = journeyLogic.initialJourney()
  for (const mission of [...fieldMissions].reverse()) {
    const activityId = specActivityByMission[mission.id]
    journey.progress[activityId] = { actividadId: activityId, estado: 'completada' }
  }
  journey.progress['unrelated-activity'] = { actividadId: 'unrelated-activity', estado: 'completada' }
  journey.progress['mission-future'].estado = 'en_curso'
  const before = JSON.stringify({ adventure, journey })
  const missing = getMissionsToSync(adventure, journey)
  assert.deepEqual(Array.from(missing), Array.from(fieldMissions).filter(mission => !['welcome', 'story', 'future'].includes(mission.id)).map(mission => mission.id))
  assert.equal(JSON.stringify({ adventure, journey }), before)
  adventure.completedMissionIds.push(...missing)
  assert.equal(getMissionsToSync(adventure, journey).length, 0)
  journey.progress['mission-future'].estado = 'completada'
  assert.deepEqual(Array.from(getMissionsToSync(adventure, journey)), ['future'])
})

test('student presentation preferences validate storage, survive failures and refresh across tabs', () => {
  const file = path.resolve('src/store/studentUiStore.ts')
  const js = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const { studentViews } = load(path.resolve('src/lib/studentViews.ts'))
  let raw = '{broken'
  let failRead = false
  let failWrite = false
  let lastKey
  let storageListener
  let notifications = 0
  const isolated = vm.createContext({
    window: { addEventListener: (name, listener) => { assert.equal(name, 'storage'); storageListener = listener } },
    localStorage: {
      getItem: key => { assert.equal(key, 'ov.student-ui.v1'); if (failRead) throw new Error('blocked'); return raw },
      setItem: (key, value) => { lastKey = key; if (failWrite) throw new Error('full'); raw = value },
    },
  })
  const exports = {}
  const require = name => {
    if (name === 'react') return { useSyncExternalStore: (subscribe, snapshot) => { subscribe(() => notifications++); return snapshot() } }
    if (name === '@/lib/studentViews') return { studentViews }
    throw new Error(`Unexpected import: ${name}`)
  }
  vm.runInContext(`(function(require,exports){${js}\n})`, isolated)(require, exports)
  assert.equal(exports.useStudentUi().lastMap, 'missions')
  exports.updateStudentUi(current => ({ ...current, lastMap: 'central', panelCollapsed: true, soundOn: false }))
  assert.equal(lastKey, 'ov.student-ui.v1')
  assert.equal(JSON.parse(raw).lastMap, 'central')
  assert.equal(notifications, 1)
  raw = JSON.stringify({ version: 1, lastMap: 'central', panelCollapsed: true, soundOn: false, introsSeen: { research: true, unknown: true, journal: 'true' }, seenUnlockIds: ['city', 'city', 123], announcedBadgeCodes: ['I1'], checkInPromptDismissedOn: '2026-10-03' })
  storageListener({ key: 'other-key' })
  assert.equal(notifications, 1)
  storageListener({ key: 'ov.student-ui.v1' })
  const hydrated = exports.useStudentUi()
  assert.equal(hydrated.lastMap, 'central')
  assert.equal(hydrated.panelCollapsed, true)
  assert.equal(hydrated.soundOn, false)
  assert.equal(JSON.stringify(hydrated.introsSeen), '{"research":true}')
  assert.equal(JSON.stringify(hydrated.seenUnlockIds), '["city"]')
  assert.equal(hydrated.checkInPromptDismissedOn, '2026-10-03')
  failWrite = true
  exports.updateStudentUi(current => ({ ...current, lastMap: 'missions' }))
  assert.equal(exports.useStudentUi().lastMap, 'missions')
  assert.equal(JSON.parse(raw).lastMap, 'central')
  raw = '{"version":2,"lastMap":"central"}'
  storageListener({ key: null })
  assert.equal(exports.useStudentUi().lastMap, 'missions')
  failRead = true
  storageListener({ key: 'ov.student-ui.v1' })
  assert.equal(exports.useStudentUi().soundOn, true)
})

test('adventure keeps the original mission route and switches between path and city', () => {
  const missions = render('/student/missions')
  assert.match(missions, /Nivel de recorrido/)
  assert.match(missions, /El inicio del viaje/)
  assert.match(missions, /Informativa · 4 min/)
  assert.match(missions, /Cambiar zona de la aventura/)
  for (const label of ['Alejar mapa', 'Acercar mapa', 'Centrar mapa']) assert.match(missions, new RegExp(`aria-label="${label}"`))
  assert.doesNotMatch(missions, /Arrastra .*para explorar/)
  const city = render('/student/exploration')
  assert.match(city, /Afinidad con la ciudad/)
  assert.match(city, /role="progressbar" aria-label="Afinidad con la ciudad"/)
  assert.match(city, /Una vuelta por el molino/)
  assert.match(city, /Test · Interacción 1 de 14/)
  assert.match(city, /Cambiar zona de la aventura/)
})
test('immersive maps expose the panel, recommendations and one block sign', () => {
  const missions = render('/student/missions')
  for (const label of ['Siguiente paso', 'Tu señal de hoy', 'Accesos rápidos', 'Tramo 1']) assert.match(missions, new RegExp(label))
  assert.equal((missions.match(/Tramo 1/g) ?? []).length, 1)
  assert.match(missions, /aria-label="Plegar panel"/)
  assert.match(missions, /aria-label="Abrir panel"/)
  assert.match(missions, /aria-label="Silenciar" aria-pressed="true"/)
  assert.match(missions, /data-recommended="true"/)
  assert.match(render('/student/exploration'), /Afinidad con la ciudad/)
})

test('new map canvases draw segments only on the path, with completion and frontier styles', () => {
  const { MapCanvas } = load(path.resolve('src/features/adventure/components/MapCanvas.tsx'))
  const { getCaminoPoints } = loadMapPoints(load)
  const journey = journeyLogic.initialJourney()
  journey.progress['mission-welcome'] = { estado: 'completada' }
  journey.progress['enc-mitos'] = { estado: 'completada' }
  const points = getCaminoPoints(store.createInitialAdventure(), journey)
  const props = { points, panelOpen: false, onSelect() {}, onScaleChange() {}, backgroundImage: '/images/adventure/journey-map.png', label: 'Mapa de prueba' }
  const route = renderToStaticMarkup(React.createElement(MapCanvas, { ...props, variant: 'route' }))
  const city = renderToStaticMarkup(React.createElement(MapCanvas, { ...props, variant: 'open' }))
  assert.equal((route.match(/data-map-segment=/g) ?? []).length, points.length - 1)
  assert.match(route, /data-map-segment="completed"[^>]*stroke="var\(--success\)"/)
  assert.match(route, /data-map-segment="frontier"[^>]*stroke="var\(--sx-lumi\)"[^>]*stroke-dasharray="18 22"/)
  assert.match(route, /stroke-dasharray="18 22"/)
  assert.doesNotMatch(city, /data-map-segment=|sx-map-path|sx-block-sign/)
  assert.match(route, /sx-node-completed[^>]*[\s\S]*?lucide-book-open/)
})

test('student point calculations preserve progress, recommendations and every drawer action', () => {
  const { getCaminoPoints, getCiudadPoints, getZoneProgress, getRecommendedPoint, getPointDetails } = loadMapPoints(load)
  const adventure = store.createInitialAdventure()
  const journey = journeyLogic.initialJourney()
  adventure.completedMissionIds = []
  adventure.solvedCaseIds = ['forest-fire', 'river-mystery']
  const points = getCaminoPoints(adventure, journey)
  assert.equal(getZoneProgress('missions', adventure, journey).value, 0)
  assert.equal(getZoneProgress('central', adventure, journey).value, 33)
  assert.equal(getRecommendedPoint(points).id, 'welcome')
  const welcome = points.find(point => point.id === 'welcome')
  assert.equal(getPointDetails(welcome, adventure, journey).actionLabel, 'Iniciar actividad')
  journey.progress['mission-welcome'] = { estado: 'en_curso' }
  assert.equal(getPointDetails(welcome, adventure, journey).actionLabel, 'Continuar actividad')
  assert.equal(getPointDetails(welcome, adventure, journey).badge, 'En progreso')
  journey.progress['mission-welcome'].estado = 'completada'
  const completed = getCaminoPoints(adventure, journey)
  const replay = getPointDetails(completed[0], adventure, journey)
  assert.equal(replay.actionLabel, 'Volver a realizar esta misión')
  assert.equal(replay.revision, true)
  assert.equal(replay.journal.completed, true)
  assert.equal(getZoneProgress('missions', adventure, journey).value, 100 / fieldMissions.length)
  assert.equal(getRecommendedPoint(completed).id, 'beliefs')
  const locked = getPointDetails({ ...completed[1], status: 'locked' }, adventure, journey)
  assert.equal(locked.actionLabel, 'Actividad bloqueada')
  assert.equal(locked.disabled, true)
  assert.match(locked.requirement, /El inicio del viaje/)
  const review = getPointDetails({ ...completed[2], status: 'completed' }, adventure, journey)
  assert.equal(review.actionLabel, 'Ver o modificar mis respuestas')
  assert.equal(getPointDetails(points.at(-1), adventure, journey).href, '/student/exploration')
  const city = getCiudadPoints(adventure, journey)
  assert.equal(getRecommendedPoint(city).id, 'mara-test')
  assert.equal(getPointDetails(city.find(point => point.id === 'mara-test'), adventure, journey).activityId, 'act-tip-01')
  const fire = getPointDetails(city.find(point => point.id === 'forest-fire'), adventure, journey)
  assert.equal(fire.href, '/student/cases/forest-fire')
  assert.equal(fire.disabled, false)
  assert.equal(getPointDetails(city.find(point => point.id === 'river-mystery'), adventure, journey).disabled, true)
  const mill = city.find(point => point.id === 'mara-test')
  assert.equal(getPointDetails(mill, adventure, journey).actionLabel, 'Iniciar test')
  assert.equal(getPointDetails({ ...mill, status: 'completed' }, adventure, journey).actionLabel, 'Ver resumen')
  assert.equal(getRecommendedPoint(completed.map(point => ({ ...point, status: point.id === 'city' ? 'available' : 'completed' }))).id, 'city')
})

test('map zoom preserves its cursor anchor, respects bounds and focuses beside the open panel', () => {
  const { getMinimumScale, canvasSize, maxScale, clampTransform, zoomTransform, focusTransform, visibleCenter, mapPosition } = load(path.resolve('src/features/adventure/lib/geometry.ts'))
  const bounds = { width: 1280, height: 752 }
  const current = { x: -400, y: -200, scale: .8 }
  const cursor = { x: 700, y: 320 }
  const zoomed = zoomTransform(current, .88, cursor, bounds)
  assert.ok(Math.abs((cursor.x - current.x) / current.scale - (cursor.x - zoomed.x) / zoomed.scale) < .00001)
  assert.ok(Math.abs((cursor.y - current.y) / current.scale - (cursor.y - zoomed.y) / zoomed.scale) < .00001)
  assert.equal(zoomTransform(current, 99, cursor, bounds).scale, maxScale)
  assert.equal(zoomTransform(current, .01, cursor, bounds).scale, getMinimumScale(bounds))
  const clamped = clampTransform({ x: 9999, y: -9999, scale: .8 }, bounds)
  assert.equal(clamped.x, 0)
  assert.equal(clamped.y, bounds.height - canvasSize.height * .8)
  const point = { x: 590, y: 290 }
  const position = mapPosition(point)
  const focused = focusTransform(current, point, bounds, true)
  assert.ok(Math.abs(focused.x + position.x * focused.scale - visibleCenter(bounds, true).x) < .00001)
  assert.ok(Math.abs(focused.y + position.y * focused.scale - bounds.height / 2) < .00001)
  const firstPoint = focusTransform({ x: 0, y: 0, scale: .55 }, { x: 130, y: 140 }, bounds, true)
  assert.ok(firstPoint.x + mapPosition({ x: 130, y: 140 }).x * firstPoint.scale > 304)
  assert.equal(firstPoint.scale, .55)
  const source = readFileSync(path.resolve('src/features/adventure/components/MapCanvas.tsx'), 'utf8')
  assert.match(source, /addEventListener\('wheel', wheel, \{ passive: false \}\)/)
  assert.match(source, /removeEventListener\('wheel', wheel\)/)
})

test('real access conditions lock successive missions and expose the city gate without changing review mode', () => {
  const exports = {}
  const require = name => {
    if (name === '@/store/adventureStore') return { ...store, prototypeAllUnlocked: false, canAccessCity: store.isCityUnlocked }
    if (!name.startsWith('@/')) return nativeRequire(name)
    return load(path.resolve('src', `${name.slice(2)}.ts`))
  }
  Object.assign(exports, loadMapPoints(file => loadMovedHook(path.resolve(file), require)))
  const adventure = store.createInitialAdventure()
  adventure.completedMissionIds = []
  const journey = journeyLogic.initialJourney()
  const locked = exports.getCaminoPoints(adventure, journey)
  assert.equal(locked[0].status, 'available')
  assert.ok(locked.slice(1).every(point => point.status === 'locked'))
  assert.match(exports.getPointDetails(locked[1], adventure, journey).requirement, /El inicio del viaje/)
  journey.progress['mission-welcome'] = { estado: 'completada' }
  const advanced = exports.getCaminoPoints(adventure, journey)
  assert.equal(advanced[0].status, 'completed')
  assert.equal(advanced[1].status, 'available')
  assert.equal(advanced[2].status, 'locked')
  assert.match(exports.getReturnGreeting({ ...adventure, visits: ['2026-09-29'] }, advanced[1], new Date('2026-10-03T17:00:00Z')), /La ciudad sigue esperándote al final del camino\./)
  const { CityLocked } = load(path.resolve('src/features/adventure/components/CityLocked.tsx'))
  const gate = renderToStaticMarkup(React.createElement(MemoryRouter, {}, React.createElement(CityLocked, { adventure })))
  assert.match(gate, /Capítulo 2 · La ciudad/)
  assert.match(gate, /Una llave, mil posibilidades/)
  assert.match(gate, /Continuar mi recorrido/)
  const { ZoneSwitch } = load(path.resolve('src/features/adventure/components/ZoneSwitch.tsx'))
  const switcher = renderToStaticMarkup(React.createElement(MemoryRouter, {}, React.createElement(ZoneSwitch, { zone: 'missions', cityOpen: false, onCityLocked() {} })))
  assert.match(switcher, /aria-disabled="true"/)
  assert.equal(store.prototypeAllUnlocked, true)
})

test('new activity drawer composes shared primitives without embedded case questions', () => {
  const source = readFileSync(path.resolve('src/features/adventure/components/ActivityDrawer.tsx'), 'utf8')
  assert.match(source, /from '@\/components\/ui\/Drawer'/)
  assert.match(source, /<DrawerClose asChild>/)
  assert.match(source, /aria-label="Cerrar ficha"/)
  assert.match(source, /overflow-x-hidden/)
  assert.doesNotMatch(source, /type="checkbox"|Confirmar equipo/)
})

test('return greeting uses the previous Lima visit and never reproaches absences', () => {
  const { getReturnGreeting, getCaminoPoints } = loadMapPoints(load)
  const adventure = store.createInitialAdventure()
  const point = getCaminoPoints(adventure, journeyLogic.initialJourney())[0]
  const now = new Date('2026-10-03T17:00:00Z')
  adventure.visits = ['2026-09-28', '2026-09-30', '2026-10-03']
  assert.match(getReturnGreeting(adventure, point, now), /¡Qué bueno verte de nuevo! Te espera El inicio del viaje\./)
  adventure.visits.push('2026-10-02')
  assert.equal(getReturnGreeting(adventure, point, now), undefined)
  assert.equal(getReturnGreeting(adventure, undefined, now), undefined)
})

test('student overlay queue prioritizes real city arrival, section introductions and the daily signal', () => {
  const { getNextOverlay } = load(path.resolve('src/features/adventure/context/overlayContext.ts'))
  const { initialStudentUiState } = load(path.resolve('src/store/studentUiStore.ts'))
  const { studentViews, isDiscoveryView } = load(path.resolve('src/lib/studentViews.ts'))
  const adventure = store.createInitialAdventure()
  adventure.completedMissionIds = []
  adventure.readinessCheckIns = []
  const ui = initialStudentUiState()
  const now = new Date('2026-10-04T04:30:00Z')
  const args = { adventure, ui, view: 'missions', activityOpen: false, now }
  assert.equal(getNextOverlay(args).kind, 'intro') // Review mode does not announce a real unlock.
  adventure.completedMissionIds = fieldMissions.map(mission => mission.id)
  assert.equal(getNextOverlay(args).kind, 'arrival')
  assert.equal(getNextOverlay({ ...args, activityOpen: true }), null)
  assert.equal(getNextOverlay({ ...args, arrivalDismissed: true }).kind, 'intro')
  ui.cityArrivalSeen = true
  for (const view of studentViews) {
    if (isDiscoveryView(view)) { assert.equal(getNextOverlay({ ...args, view }), null); continue }
    assert.equal(getNextOverlay({ ...args, view }).view, view)
    ui.introsSeen[view] = true
    assert.equal(getNextOverlay({ ...args, view }).kind, 'check-in')
  }
  assert.equal(getNextOverlay(args).day, '2026-10-03')
  ui.checkInPromptDismissedOn = '2026-10-03'
  assert.equal(getNextOverlay(args), null)
  assert.equal(getNextOverlay({ ...args, now: new Date('2026-10-04T05:30:00Z') }).kind, 'check-in')
  adventure.readinessCheckIns.push({ id: 'today', value: 7, createdAt: now.toISOString(), linkedActivityId: 'daily-check-in' })
  ui.checkInPromptDismissedOn = undefined
  assert.equal(getNextOverlay(args), null)
  assert.equal(getNextOverlay({ ...args, activityOpen: true }), null)
})

test('student daily signal uses Lima dates and replaces the original registration without changing private entries', () => {
  const { getTodayCheckIn, saveTodayCheckIn, localDateKey } = load(path.resolve('src/features/adventure/lib/checkIn.ts'))
  assert.equal(localDateKey(new Date('2026-10-04T04:59:00Z')), '2026-10-03')
  assert.equal(localDateKey(new Date('2026-10-04T05:00:00Z')), '2026-10-04')
  const now = new Date()
  const original = { id: 'daily-original', createdAt: now.toISOString(), linkedActivityId: 'daily-check-in', value: 3 }
  const related = { id: 'activity-signal', createdAt: now.toISOString(), linkedActivityId: 'mission-welcome', value: 5 }
  const yesterday = { id: 'yesterday', createdAt: new Date(now.getTime() - 86400000).toISOString(), linkedActivityId: 'daily-check-in', value: 4 }
  store.updateAdventure(current => ({ ...current, readinessCheckIns: [related, yesterday, original] }))
  const journalBefore = JSON.stringify(store.useAdventure().journalEntries)
  saveTodayCheckIn(8)
  saveTodayCheckIn(9)
  const current = store.useAdventure()
  const edited = getTodayCheckIn(current)
  assert.equal(edited.id, original.id)
  assert.equal(edited.createdAt, original.createdAt)
  assert.equal(edited.value, 9)
  assert.equal(current.readinessCheckIns.length, 3)
  assert.equal(JSON.stringify(current.journalEntries), journalBefore)
  assert.equal(current.readinessCheckIns.find(signal => signal.id === related.id).value, 5)
  assert.equal(current.readinessCheckIns.find(signal => signal.id === yesterday.id).value, 4)
  const beforeInvalid = JSON.stringify(current.readinessCheckIns)
  for (const invalid of [0, 11, 4.5, NaN]) saveTodayCheckIn(invalid)
  assert.equal(JSON.stringify(store.useAdventure().readinessCheckIns), beforeInvalid)
  store.updateAdventure(current => ({ ...current, readinessCheckIns: [related, yesterday] }))
  saveTodayCheckIn(6)
  const first = getTodayCheckIn(store.useAdventure())
  assert.ok(first.id)
  saveTodayCheckIn(7)
  assert.equal(getTodayCheckIn(store.useAdventure()).id, first.id)
  assert.equal(store.useAdventure().readinessCheckIns.length, 3)
})

test('student signal panel offers registration or editing and retains evolution navigation', () => {
  const empty = render('/student/missions', { readinessCheckIns: [] })
  assert.match(empty, /Registrar mi señal/)
  assert.doesNotMatch(empty, />Cambiar</)
  const today = { id: 'current', createdAt: new Date().toISOString(), linkedActivityId: 'daily-check-in', value: 8 }
  const answered = render('/student/missions', { readinessCheckIns: [today] })
  assert.match(answered, /class="sx-panel-signal" aria-label="8 de 10"/)
  assert.match(answered, /<strong>8<\/strong><span>\/10<\/span>/)
  assert.match(answered, />Cambiar</)
  assert.match(answered, /class="sx-signal-edit"[\s\S]*?>Cambiar<\/button>/)
  assert.match(answered, /class="sx-signal-history" href="\/student\/journal\/signal"[\s\S]*?>Ver evolución<\/a>/)
  assert.doesNotMatch(answered, /Registrar mi señal/)
  assert.doesNotMatch(answered, /role="dialog"/)
})

test('typewriter advances at its configured pace, completes immediately and honors reduced motion', () => {
  const file = path.resolve('src/hooks/useTypewriter.ts')
  const js = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const states = [], effects = [], pending = [], timers = new Map(), mediaListeners = new Set()
  let stateIndex = 0, effectIndex = 0, timerId = 0
  const query = { matches: false, addEventListener: (_, listener) => mediaListeners.add(listener), removeEventListener: (_, listener) => mediaListeners.delete(listener) }
  const fakeReact = {
    useState(initial) {
      const i = stateIndex++
      if (!(i in states)) states[i] = typeof initial === 'function' ? initial() : initial
      return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value }]
    },
    useEffect(callback, dependencies) {
      const i = effectIndex++
      const old = effects[i]
      if (!old || dependencies.some((value, j) => !Object.is(value, old.dependencies[j]))) pending.push(() => {
        old?.cleanup?.()
        effects[i] = { dependencies, cleanup: callback() }
      })
    },
  }
  const exports = {}
  const hookContext = vm.createContext({ window: {
    matchMedia: () => query,
    setInterval: (callback, delay) => { const id = ++timerId; timers.set(id, { callback, delay }); return id },
    clearInterval: id => timers.delete(id),
  } })
  vm.runInContext(`(function(require,exports){${js}\n})`, hookContext)(() => fakeReact, exports)
  const draw = (text, options) => {
    stateIndex = effectIndex = 0
    const result = exports.useTypewriter(text, options)
    pending.splice(0).forEach(effect => effect())
    return result
  }
  const tick = () => [...timers.values()].forEach(timer => timer.callback())
  assert.equal(draw('abcdef').visible, '')
  assert.equal([...timers.values()][0].delay, 24)
  tick()
  assert.equal(draw('abcdef').visible, 'ab')
  const partial = draw('abcdef')
  partial.complete()
  assert.equal(draw('abcdef').visible, 'abcdef')
  assert.equal(draw('abcdef').done, true)
  assert.equal(timers.size, 0)
  assert.equal(draw('nuevo').visible, '')
  tick()
  assert.equal(draw('nuevo').visible, 'nu')
  assert.equal(draw('nuevo', { enabled: false }).visible, 'nuevo')
  assert.equal(timers.size, 0)
  draw('corto', { charsPerTick: 1, tickMs: 10 })
  assert.equal([...timers.values()][0].delay, 10)
  tick()
  assert.equal(draw('corto', { charsPerTick: 1, tickMs: 10 }).visible, 'c')
  query.matches = true
  mediaListeners.forEach(listener => listener())
  assert.equal(draw('movimiento reducido').visible, 'movimiento reducido')
  assert.equal(draw('movimiento reducido').done, true)
  assert.equal(timers.size, 0)
  effects.forEach(effect => effect.cleanup?.())
  assert.equal(mediaListeners.size, 0)
})

test('mounted overlay queue opens from effects, remembers introductions and resumes after activity exit', () => {
  const file = path.resolve('src/features/adventure/components/overlays/OverlayQueue.tsx')
  const js = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
  const { initialStudentUiState } = load(path.resolve('src/store/studentUiStore.ts'))
  let ui = initialStudentUiState()
  let adventure = { ...store.createInitialAdventure(), completedMissionIds: [], readinessCheckIns: [] }
  const states = [], effects = [], pending = []
  const destinations = []
  let stateIndex = 0, effectIndex = 0
  const fakeReact = {
    ...React,
    useMemo: factory => factory(),
    useState(initial) {
      const i = stateIndex++
      if (!(i in states)) states[i] = typeof initial === 'function' ? initial() : initial
      return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value }]
    },
    useEffect(callback, dependencies) {
      const i = effectIndex++
      if (!effects[i] || dependencies.some((value, j) => !Object.is(value, effects[i][j]))) {
        pending.push(callback)
        effects[i] = dependencies
      }
    },
  }
  const queueRequire = specifier => {
    if (specifier === 'react') return fakeReact
    if (specifier === 'react-router') return { useNavigate: () => destination => destinations.push(destination) }
    if (specifier.endsWith('/adventureStore')) return { useAdventure: () => adventure }
    if (specifier === '@/store/studentUiStore') return { useStudentUi: () => ui, updateStudentUi: update => { ui = update(ui) } }
    if (specifier === '../../lib/checkIn' || specifier === '@/features/adventure/lib/checkIn') {
      const original = load(path.resolve('src/features/adventure/lib/checkIn.ts'))
      return { ...original, useCheckInDay: () => original.localDateKey(new Date()), saveTodayCheckIn: value => {
        adventure = { ...adventure, readinessCheckIns: [{ id: 'saved', value, createdAt: new Date().toISOString(), linkedActivityId: 'daily-check-in' }] }
      } }
    }
    if (!specifier.startsWith('.') && !specifier.startsWith('@/')) return nativeRequire(specifier)
    const base = specifier.startsWith('@/') ? path.resolve('src', specifier.slice(2)) : path.resolve(path.dirname(file), specifier)
    if (base === path.resolve('src/features/adventure/hooks/useNoveltyQueue')) return loadMovedHook(`${base}.ts`, queueRequire)
    return load([`${base}.tsx`, `${base}.ts`].find(existsSync))
  }
  const exports = {}
  vm.runInContext(`(function(require,exports){${js}\n})`, context)(queueRequire, exports)
  const draw = (view = 'missions', activityOpen = false) => {
    stateIndex = effectIndex = 0
    const tree = exports.OverlayQueue({ view, activityOpen, children: 'page' })
    const result = { context: tree.props.value, lumi: tree.props.children[1].props, signal: tree.props.children[2].props }
    pending.splice(0).forEach(effect => effect())
    return result
  }
  assert.equal(draw().lumi.open, false)
  assert.equal(draw().lumi.open, true)
  draw().lumi.onClose()
  assert.equal(ui.introsSeen.missions, true)
  draw()
  assert.equal(draw().signal.open, true)
  draw().signal.onDismiss()
  draw()
  assert.equal(draw().signal.open, false)
  draw().context.openGuide(['Ayuda manual'])
  assert.equal(draw().lumi.steps[0], 'Ayuda manual')
  draw().lumi.onClose()
  assert.equal(draw().lumi.open, false)
  draw('resources', true)
  assert.equal(draw('resources', true).lumi.open, false)
  assert.equal(ui.introsSeen.resources, undefined)
  draw('resources', false)
  assert.equal(draw('resources').lumi.open, false)
  draw('resources').lumi.onClose()
  draw('resources')
  assert.equal(draw('resources').lumi.open, false)
  adventure = { ...adventure, completedMissionIds: fieldMissions.map(mission => mission.id) }
  draw('missions', true)
  assert.equal(draw('missions', true).lumi.open, false)
  draw('missions')
  assert.equal(draw('missions').lumi.finalLabel, 'Entrar a la ciudad')
  draw('missions').lumi.onClose()
  draw('missions')
  assert.equal(draw('missions').lumi.open, false)
  assert.equal(ui.cityArrivalSeen, false)
  states.length = effects.length = pending.length = 0 // Remount after closing arrival for this visit.
  assert.equal(draw('missions').lumi.open, false)
  assert.equal(draw('missions').lumi.finalLabel, 'Entrar a la ciudad')
  draw('missions').lumi.onFinish()
  draw('missions').lumi.onClose()
  assert.equal(ui.cityArrivalSeen, true)
  assert.equal(destinations[0], '/student/exploration')
  draw('missions')
  assert.equal(draw('missions').lumi.open, false)
  draw('missions').context.openCheckIn()
  assert.equal(draw('missions').signal.open, true)
  draw('missions').signal.onSave(8)
  draw('missions')
  assert.equal(draw('missions').signal.open, false)
  draw('missions').context.openCheckIn()
  assert.equal(draw('missions').signal.value, 8)
})

test('Lumi exposes the complete accessible text while its visible text starts progressively', () => {
  const file = path.resolve('src/features/adventure/components/overlays/LumiOverlay.tsx')
  const js = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
  const pass = ({ children }) => children
  const primitives = {
    Root: pass, Portal: pass,
    Overlay: ({ className }) => React.createElement('div', { className }),
    Content: ({ children, className, 'aria-label': label }) => React.createElement('div', { className, 'aria-label': label }, children),
    Title: ({ children, className }) => React.createElement('h2', { className }, children),
    Description: pass,
  }
  const exports = {}
  const require = specifier => {
    if (specifier === '@/features/adventure/components/overlays/LumiDialogue') return loadMovedHook(path.resolve('src/features/adventure/components/overlays/LumiDialogue.tsx'), require)
    if (specifier === '@radix-ui/react-dialog') return primitives
    if (!specifier.startsWith('.') && !specifier.startsWith('@/')) return nativeRequire(specifier)
    const base = specifier.startsWith('@/') ? path.resolve('src', specifier.slice(2)) : path.resolve(path.dirname(file), specifier)
    return load([`${base}.tsx`, `${base}.ts`].find(existsSync))
  }
  vm.runInContext(`(function(require,exports){${js}\n})`, context)(require, exports)
  const text = 'Este texto completo debe llegar al lector de pantalla desde el primer instante.'
  const html = renderToStaticMarkup(React.createElement(exports.LumiOverlay, { open: true, steps: [text], onClose() {} }))
  assert.match(html, /<span aria-hidden="true"><\/span>/)
  assert.ok(html.includes(`<span class="sr-only">${text}</span>`))
  assert.match(html, /Mostrar todo/)
  assert.match(html, /disabled=""[^>]*>[\s\S]*?Anterior/)
  assert.match(html, /aria-label="Cerrar guía"/)
})

test('daily check-in clock refreshes on tab visibility and focus, then releases its listeners', () => {
  const file = path.resolve('src/features/adventure/lib/checkIn.ts')
  const js = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  let now = '2026-10-04T04:59:00Z', day, cleanup, interval
  const windowListeners = new Map(), documentListeners = new Map()
  class Clock extends Date { constructor(...args) { super(...(args.length ? args : [now])) } }
  const fakeDocument = { visibilityState: 'visible', addEventListener: (name, listener) => documentListeners.set(name, listener), removeEventListener: name => documentListeners.delete(name) }
  const exports = {}
  const clockContext = vm.createContext({ Date: Clock, document: fakeDocument, window: {
    setInterval: callback => { interval = callback; return 1 }, clearInterval: () => { interval = undefined },
    addEventListener: (name, listener) => windowListeners.set(name, listener), removeEventListener: name => windowListeners.delete(name),
  } })
  const require = specifier => {
    if (specifier === 'react') return { useState: initial => { day ??= initial(); return [day, value => { day = value }] }, useEffect: callback => { cleanup ??= callback() } }
    if (specifier.endsWith('/adventureStore')) return store
    if (specifier.endsWith('/lumiFriendship')) return load(path.resolve('src/lib/lumiFriendship.ts'))
    throw new Error(`Unexpected dependency: ${specifier}`)
  }
  vm.runInContext(`(function(require,exports){${js}\n})`, clockContext)(require, exports)
  assert.equal(exports.useCheckInDay(), '2026-10-03')
  now = '2026-10-04T05:01:00Z'
  windowListeners.get('focus')()
  assert.equal(day, '2026-10-04')
  now = '2026-10-05T05:01:00Z'
  fakeDocument.visibilityState = 'hidden'
  documentListeners.get('visibilitychange')()
  assert.equal(day, '2026-10-04')
  fakeDocument.visibilityState = 'visible'
  documentListeners.get('visibilitychange')()
  assert.equal(day, '2026-10-05')
  now = '2026-10-06T05:01:00Z'
  interval()
  assert.equal(day, '2026-10-06')
  cleanup()
  assert.equal(windowListeners.size, 0)
  assert.equal(documentListeners.size, 0)
  assert.equal(interval, undefined)
})

test('check-in dialog requires a choice and preselects the saved value when reopened', () => {
  const file = path.resolve('src/features/adventure/components/overlays/CheckInDialog.tsx')
  const js = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
  const pass = ({ children }) => children
  const exports = {}
  const require = specifier => {
    if (specifier === '@/features/adventure/components/overlays/CheckInContent') return loadMovedHook(path.resolve('src/features/adventure/components/overlays/CheckInContent.tsx'), require)
    if (specifier === '@/components/ui/Dialog') return {
      Dialog: pass, DialogContent: pass,
      DialogTitle: ({ children }) => React.createElement('h2', {}, children),
      DialogDescription: ({ children }) => React.createElement('p', {}, children),
    }
    if (specifier === '@/components/student/CharacterAvatar') return load(path.resolve('src/components/student/CharacterAvatar.tsx'))
    return nativeRequire(specifier)
  }
  vm.runInContext(`(function(require,exports){${js}\n})`, context)(require, exports)
  const draw = value => renderToStaticMarkup(React.createElement(exports.CheckInDialog, { open: true, value, onSave() {}, onDismiss() {} }))
  const empty = draw()
  assert.equal((empty.match(/class="sx-signal-value"/g) ?? []).length, 10)
  assert.equal((empty.match(/aria-pressed="false"/g) ?? []).length, 10)
  assert.match(empty, /disabled="">Guardar señal/)
  assert.match(empty, /Tu orientadora ve esta señal y su tendencia, nunca el texto de tu diario\./)
  const saved = draw(8)
  assert.match(saved, /aria-label="8 de 10" aria-pressed="true"/)
  assert.equal((saved.match(/aria-pressed="true"/g) ?? []).length, 1)
  assert.doesNotMatch(saved, /disabled="">Guardar señal/)
})

test('the passport lives inside the profile with five narrative levels and grouped badges', () => {
  const html = render('/student/profile?section=passport')
  assert.match(html, /Pasaporte vocacional/)
  assert.match(html, /Nivel 1 de 5/)
  assert.match(html, /Observador del horizonte/)
  assert.match(html, /I1/)
  assert.match(html, /I9/)
  assert.match(html, /Pulsa una insignia para descubrir la historia que guarda/)
  const menu = render('/student/missions')
  assert.doesNotMatch(menu, />Mi pasaporte<\/span>/)
})
test('family answer remains hidden until the student submits their own answer', () => {
  const patch = {
    conversations: [{ id: 'work-trends', parent: 'Respuesta reservada de familia' }],
  }
  assert.doesNotMatch(render('/student/conversations', patch), /Respuesta reservada de familia/)
  patch.conversations[0].student = 'Mi propia respuesta'
  const ready = render('/student/conversations', patch)
  assert.match(ready, /Listos para conversar/)
  assert.doesNotMatch(ready, /Respuesta reservada de familia/)
})
test('family dashboard has four personal states, progress and no streak or deadline mechanics', () => {
  const html = render('/parent/conversations')
  for (const label of ['Te toca responder', 'Esperando respuesta', 'Listos para conversar', 'Conversados']) {
    assert.match(html, new RegExp(label))
  }
  assert.match(html, /Un regalo para el final/)
  assert.match(html, /1 de 5 temas conversados/)
  assert.match(html, /Visualizar regalo/)
  assert.doesNotMatch(html, /racha|semanas en compañía|fecha límite|se vence/i)
})
test('student resources show only the backpack and retain the testimonials route', () => {
  const html = render('/student/resources')
  assert.match(html, /Tu mochila de viaje/)
  assert.match(html, /Mi mochila/)
  assert.match(html, /Testimonios/)
  assert.doesNotMatch(html, /Investigaciones|>Comunidad</)
  assert.match(html, /Lo que aprendiste en el camino/)
  assert.match(html, /Voces de la ciudad/)
  assert.match(html, /Bloqueado/)
  assert.match(html, /La plaza de los rumores/)
  assert.match(html, /Incendio forestal/)
  assert.doesNotMatch(html, /Recursos y novedades|Héroes de la ciudad|Investigaciones de los viajeros/)
  assert.doesNotMatch(html, /Ver ficha completa|Ver testimonio/)
  assert.match(render('/student/testimonials'), /Tu mochila de viaje/)
})

test('resource unlocks follow actual activities and specific cases rather than review mode', () => {
  const resources = load(path.resolve('src/features/backpack/lib/travelerResources.ts'))
  const entries = resources.getTravelResources()
  const blank = journeyLogic.initialJourney()
  const adventure = store.createInitialAdventure()
  assert.ok(entries.every((item) => !resources.isTravelResourceUnlocked(item, blank, adventure)))
  assert.equal(
    resources.isTravelResourceUnlocked(
      entries.find((item) => item.id === 'ficha-mitos'),
      { ...blank, resources: ['ficha-mitos'] },
      adventure,
    ),
    false,
  )
  const complete = { ...blank, progress: { 'enc-mitos': { estado: 'completada' } } }
  assert.equal(
    resources.isTravelResourceUnlocked(
      entries.find((item) => item.id === 'ficha-mitos'),
      complete,
      adventure,
    ),
    true,
  )
  assert.equal(
    resources.isTravelResourceUnlocked(
      entries.find((item) => item.id === 'first-steps'),
      complete,
      adventure,
    ),
    false,
  )
  const solved = { ...adventure, solvedCaseIds: ['forest-fire', 'unknown-case'] }
  assert.equal(
    resources.isTravelResourceUnlocked(
      entries.find((item) => item.id === 'health-response-paramedic'),
      blank,
      solved,
    ),
    true,
  )
  assert.equal(
    resources.isTravelResourceUnlocked(
      entries.find((item) => item.id === 'global-event-translator'),
      blank,
      solved,
    ),
    false,
  )
  const researchAccess = { requirement: { anyCase: true } }
  assert.equal(
    resources.isTravelResourceUnlocked(researchAccess, blank, { ...adventure, solvedCaseIds: ['unknown-case'] }),
    false,
  )
  assert.equal(resources.isTravelResourceUnlocked(researchAccess, blank, solved), true)
  for (const route of ['/student/research', '/student/investigations']) {
    const locked = render(route)
    assert.match(locked, /Las investigaciones se abren al resolver tu primer caso en la Central de Casos/)
    assert.doesNotMatch(locked, /Ver la entrevista/)
    assert.match(locked, /Completa una misión de Central de Casos para descubrir esta investigación/)
    assert.match(locked, /Ir a Central de Casos/)
    const unlocked = render(route, solved)
    assert.match(unlocked, /Ver la entrevista/)
    assert.match(unlocked, /Objetos que hacen más fácil la vida diaria/)
    assert.doesNotMatch(unlocked, /Las investigaciones se abren al resolver tu primer caso/)
  }
})

test('resource viewers normalize YouTube URLs and reject unsafe file or video URLs', () => {
  const resources = load(path.resolve('src/features/backpack/lib/travelerResources.ts'))
  assert.equal(
    resources.youtubeEmbedUrl('https://youtu.be/ysz5S6PUM-U?t=30'),
    'https://www.youtube-nocookie.com/embed/ysz5S6PUM-U',
  )
  assert.equal(
    resources.youtubeEmbedUrl('https://www.youtube.com/watch?v=ysz5S6PUM-U'),
    'https://www.youtube-nocookie.com/embed/ysz5S6PUM-U',
  )
  for (const url of [
    'javascript:alert(1)',
    'https://youtube.com.evil.test/watch?v=ysz5S6PUM-U',
    'https://example.com/video',
    'http://youtu.be/ysz5S6PUM-U',
  ])
    assert.equal(resources.youtubeEmbedUrl(url), null)
  assert.equal(resources.resourceFileUrl('/resources/guide.pdf'), '/resources/guide.pdf')
  for (const url of [
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    '//evil.test/file.pdf',
    '/\\evil.test/file.pdf',
  ])
    assert.equal(resources.resourceFileUrl(url), null)
})

test('an encounter without written submissions unlocks its resource only after reaching the end and answering', () => {
  const { activityById } = load(path.resolve('src/data/activities/content.ts'))
  const activity = activityById('mission-welcome')
  const blank = journeyLogic.initialJourney()
  assert.equal(journeyLogic.isActivityComplete(activity, blank), false)
  const atEnd = { ...blank, progress: { [activity.id]: { estado: 'en_curso', nodoActualId: '$fin' } } }
  assert.equal(journeyLogic.isActivityComplete(activity, atEnd), false)
  const answered = {
    ...atEnd,
    attempts: [{ actividadId: activity.id, nodoId: 'welcome-03', correcta: true }],
  }
  const completed = journeyLogic.applyCompletion(activity, answered)
  assert.equal(completed.progress[activity.id].estado, 'completada')
  const resources = load(path.resolve('src/features/backpack/lib/travelerResources.ts'))
  assert.equal(
    resources.isTravelResourceUnlocked(
      resources.getTravelResources().find((item) => item.id === 'first-steps'),
      completed,
      store.createInitialAdventure(),
    ),
    true,
  )
  assert.equal(journeyLogic.applyCompletion(activity, completed).rewards.length, 1)
})
test('family demo data covers shared and role-specific questions', () => {
  assert.ok(familyConversationTopics.some((topic) => topic.prompts.student === topic.prompts.parent))
  assert.ok(familyConversationTopics.some((topic) => topic.prompts.student !== topic.prompts.parent))
  assert.deepEqual(
    [...familyConversationDemoData.map((item) => item.id)].sort(),
    ['shared-future', 'strengths', 'support', 'uncertainty'].sort(),
  )
})
test('journal entries never enter the classroom or crew feed', () => {
  const journal = ['una', 'dos', 'tres'].map((id) => ({
    id,
    title: `Título ${id}`,
    body: `Contenido privado ${id}`,
    kind: 'open',
    createdAt: new Date().toISOString(),
    topicTags: [],
  }))
  const html = render('/student/community', { journal })
  assert.doesNotMatch(html, /Contenido privado/)
})
test('the counselor sees readiness trends without diary text', () => {
  const html = render('/counselor/students/s1?section=journal', {
    journal: [
      {
        id: 'secret',
        title: 'Entrada privada',
        body: 'Este texto jamás debe aparecer para la orientadora',
        kind: 'open',
        createdAt: new Date().toISOString(),
        topicTags: ['privado'],
      },
    ],
    readinessCheckIns: [
      { id: 'one', createdAt: '2026-08-01T10:00:00.000Z', value: 2 },
      { id: 'two', createdAt: '2026-09-01T10:00:00.000Z', value: 2 },
    ],
  })
  assert.match(html, /Seguridad vocacional/)
  assert.match(html, /El contenido del diario es privado del estudiante/)
  assert.doesNotMatch(html, /Este texto jamás debe aparecer/)
})
test('journal home supports topics and keeps readiness separate from entries', () => {
  const html = render('/student/journal', { journalOnboardingSeen: true })
  assert.match(html, /Línea de tiempo/)
  assert.match(html, /Por tema/)
  assert.match(html, /Buscar por tema/)
  assert.match(html, /Solo tú puedes leer este espacio/)
  assert.match(html, /Mi diario/)
  assert.doesNotMatch(html, /Tu señal de hoy|Qué tan seguro te sientes hoy de tu próximo paso/i)
  assert.match(html, /Cartas de Lumi por responder/)
  assert.match(html, /Amistad con Lumi/)
  assert.match(html, /Conversación libre/)
  assert.equal((html.match(/>Conversación libre /g) ?? []).length, 1)
  assert.doesNotMatch(html, /Contarle algo a Lumi|Pulsa aquí para registrarla|Ver historial/)
})
test('signal history keeps its ten-point chart and daily check-in separate from private entries', () => {
  const html = render('/student/journal/signal', { journalOnboardingSeen: true })
  assert.match(html, /Evolución de mi señal/)
  assert.match(html, /Tu señal de hoy/)
  assert.match(html, /Registrar mi señal/)
  assert.match(html, /Historial de señales/)
  assert.match(html, /Escala del 1 al 10/)
  assert.match(html, /polyline/)
  assert.match(html, /Señal seleccionada/)
  assert.doesNotMatch(html, /Entradas del|Solo tú puedes leerlas|Volver a Conversaciones con Lumi/)
  assert.ok((html.match(/de 10/g) ?? []).length >= 10)
  assert.doesNotMatch(html, /Todavía tengo dudas, pero decidí preparar tres preguntas para la feria/)
})
test('moderation hides reported content from the classroom feed', () => {
  const html = render('/student/community', {
    reports: [
      {
        id: 'r',
        postId: 'class-rio',
        body: 'report',
        reason: '',
        status: 'hidden',
        createdAt: new Date().toISOString(),
      },
    ],
  })
  assert.doesNotMatch(html, /Me gustaría conversar con alguien que trabaje cuidando la naturaleza/)
})

const journeyStore = load(path.resolve('src/store/journeyStore.ts'))
const journeyLogic = load(path.resolve('src/lib/activities/logic.ts'))
const journeyContent = load(path.resolve('src/data/activities/content.ts'))

test('Lumi suggestions appear only after real completions and disappear after answering', () => {
  const { getLumiSuggestions } = load(
    path.resolve('src/features/journal/lib/lumiSuggestions.ts'),
  )
  const empty = journeyLogic.initialJourney()
  const adventure = { ...store.createInitialAdventure(), journal: [] }
  assert.equal(getLumiSuggestions(adventure, empty).length, 0)
  const progress = {
    ...empty,
    progress: { 'mission-welcome': { estado: 'completada' }, 'enc-mitos': { estado: 'en_progreso' } },
  }
  const suggestions = getLumiSuggestions(adventure, progress)
  assert.equal(suggestions.length, 1)
  assert.equal(suggestions[0].activityId, 'mission-welcome')
  assert.ok(suggestions[0].prompt.length > 10)
  assert.ok(suggestions[0].tags.length >= 2)
  assert.equal(
    getLumiSuggestions({ ...adventure, journal: [{ linkedActivityId: 'mission-welcome' }] }, progress).length,
    0,
  )
  assert.equal(
    getLumiSuggestions({ ...adventure, journal: [{ linkedActivityId: 'welcome' }] }, progress).length,
    0,
  )
  assert.equal(
    getLumiSuggestions({ ...adventure, solvedCaseIds: ['forest-fire', 'unknown'] }, empty).length,
    1,
  )
  const { JournalEntryCard } = load(
    path.resolve('src/features/journal/components/JournalEntryCard.tsx'),
  )
  assert.equal(
    renderToStaticMarkup(React.createElement(JournalEntryCard, { completed: false, onOpen() {} })),
    '',
  )
})

test('Lumi suggested editor includes fixed tags but still allows personal tags', () => {
  const html = render('/student/journal?activity=act-06&title=Mi+mapa&prompt=Una+pregunta', {
    journalOnboardingSeen: true,
  })
  assert.match(html, /Cuéntale a Lumi/)
  assert.match(html, /mi futuro/)
  assert.match(html, /próximos pasos/)
  assert.match(html, /sugerida/)
  assert.doesNotMatch(html, /Quitar etiqueta mi futuro/)
  assert.match(html, /Agregar/)
})

function immersivePlayerHarness(name, overrides = {}) {
  const file = path.resolve(`${name}.tsx`)
  const js = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
  const slots = [], effects = [], pending = []
  let slot = 0, effect = 0
  const react = {
    ...React,
    useState(initial) {
      const i = slot++
      if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial
      return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value }]
    },
    useRef(initial) { const i = slot++; slots[i] ??= { current: initial }; return slots[i] },
    useMemo(factory, dependencies) {
      const i = slot++
      if (!slots[i] || dependencies.some((value, j) => !Object.is(value, slots[i].dependencies[j]))) slots[i] = { value: factory(), dependencies }
      return slots[i].value
    },
    useCallback(callback, dependencies) { return react.useMemo(() => callback, dependencies) },
    useImperativeHandle(ref, factory, dependencies) { const value = react.useMemo(factory, dependencies); if (ref) ref.current = value },
    useEffect(callback, dependencies) {
      const i = effect++
      if (!effects[i] || dependencies.some((value, j) => !Object.is(value, effects[i].dependencies[j]))) pending.push(() => {
        effects[i]?.cleanup?.()
        effects[i] = { dependencies, cleanup: callback() }
      })
    },
  }
  const require = specifier => {
    if (Object.hasOwn(overrides, specifier)) return overrides[specifier]
    if (specifier.endsWith('.css')) return {}
    if (specifier === 'react/jsx-runtime') {
      const runtime = nativeRequire(specifier)
      const render = (factory) => (type, props, key) =>
        [
          'NodeRenderer',
          'ForestFireWorkspace',
          'ChallengeStage',
          'ResearchHeader',
          'ResearchGuideSteps',
          'ResearchOccupationPicker',
          'ResearchReplacementDialog',
          'HelenaBookPages',
        ].includes(type?.name)
          ? type(props)
          : factory(type, props, key)
      return { ...runtime, jsx: render(runtime.jsx), jsxs: render(runtime.jsxs) }
    }
    if (specifier === 'react') return react
    if (!specifier.startsWith('.') && !specifier.startsWith('@/')) return nativeRequire(specifier)
    const base = specifier.startsWith('@/') ? path.resolve('src', specifier.slice(2)) : path.resolve(path.dirname(file), specifier)
    // F2: los hooks extraídos a secciones conservan el React simulado de la vista.
    if (base === path.resolve('src/store/servidor/secciones')) return loadMovedHook(`${base}.ts`, require)
    if (/[\\/]features[\\/](adventure|auth|activities|backpack|discovery|cases|journal|family-conversations)[\\/]hooks[\\/]use[^\\/]+$/.test(base))
      return loadMovedHook(`${base}.ts`, require)
    if (["NodeRenderer","ForestFireWorkspace","ChallengeStage","ResearchHeader","ResearchGuideSteps","ResearchOccupationPicker","ResearchReplacementDialog","HelenaBookPages"].includes(path.basename(base))) return loadMovedHook(`${base}.tsx`, require)
    return load([`${base}.tsx`, `${base}.ts`].find(existsSync))
  }
  const exports = {}
  vm.runInContext(`(function(require,exports){${js}\n})`, context)(require, exports)
  const component = exports[name.split('/').at(-1)]
  const all = tree => Array.isArray(tree) ? tree.flatMap(all) : React.isValidElement(tree) ? [tree, ...all(tree.props.children)] : []
  const text = tree => Array.isArray(tree) ? tree.map(text).join('') : React.isValidElement(tree) ? text(tree.props.children) : typeof tree === 'string' || typeof tree === 'number' ? String(tree) : ''
  return {
    draw(props, mount) { slot = effect = 0; const tree = typeof component === 'function' ? component(props) : component.render(props, props.ref); mount?.(tree); pending.splice(0).forEach(run => run()); return tree },
    find: (tree, predicate) => all(tree).find(predicate),
    button: (tree, label) => all(tree).find(element => element.type === 'button' && text(element).includes(label)),
    text,
    dispose: () => effects.forEach(entry => entry?.cleanup?.()),
  }
}

test('immersive submission preserves validation, drafts, versions and the keep action', () => {
  // DATO DE PRUEBA: formulario sin criterios; el seguimiento se prueba por separado.
  const source = journeyContent.activities.find(activity => activity.tipo === 'registro' && activity.plantilla?.tipo !== 'matriz')
  const activity = { ...source, id: 'registro-prueba' }
  const node = { ...source.nodos.find(node => node.tipo === 'consigna' && node.entregable.tipo === 'texto'), id: 'texto-prueba' }
  journeyStore.updateJourney(() => journeyLogic.initialJourney())
  let saved = 0, kept = 0, prevented = false
  const props = { activity, node, edit: true, onSaved: () => saved++, onKeep: () => kept++ }
  const form = immersivePlayerHarness('src/features/activities/components/nodes/SubmissionNode')
  let tree = form.draw(props)
  tree.props.onSubmit({ preventDefault() { prevented = true } })
  assert.equal(prevented, true)
  tree = form.draw(props)
  assert.match(form.text(tree), /Escribe al menos/)
  assert.equal(saved, 0)
  const answer = 'Una posibilidad que quiero explorar con calma. '.repeat(Math.ceil((node.entregable.minCaracteres ?? 1) / 45) + 1).trim()
  form.find(tree, element => element.type === 'textarea').props.onChange({ target: { value: answer } })
  assert.equal(journeyStore.useJourney().drafts[`${activity.id}/${node.id}`], answer)
  tree = form.draw(props)
  tree.props.onSubmit({ preventDefault() {} })
  const first = journeyLogic.latestSubmission(journeyStore.useJourney(), activity.id, node.id)
  assert.equal(first.contenido.texto, answer)
  assert.equal(first.version, 1)
  assert.equal(journeyStore.useJourney().drafts[`${activity.id}/${node.id}`], undefined)
  assert.equal(saved, 1)
  tree = form.draw(props)
  form.find(tree, element => element.type === 'textarea').props.onChange({ target: { value: `${answer} Una idea nueva.` } })
  tree = form.draw(props)
  tree.props.onSubmit({ preventDefault() {} })
  assert.equal(journeyLogic.latestSubmission(journeyStore.useJourney(), activity.id, node.id).version, 2)
  assert.equal(journeyStore.useJourney().submissions[0].contenido.texto, answer)
  tree = form.draw(props)
  form.button(tree, 'Mantener esta respuesta').props.onClick()
  assert.equal(kept, 1)
  assert.equal(journeyStore.useJourney().submissions.length, 2)
  form.dispose()
})

test('immersive option submissions keep multiple selection and omit optional files from an effect', () => {
  const activity = journeyContent.activities.find(activity => activity.tipo === 'registro')
  const original = activity.nodos.find(node => node.tipo === 'consigna')
  journeyStore.updateJourney(() => journeyLogic.initialJourney())
  let saved = 0
  const node = { ...original, id: 'options-test', entregable: { tipo: 'opcion', multiple: true, opciones: ['Una opción', 'Otra opción'] } }
  const props = { activity, node, onSaved: () => saved++ }
  const form = immersivePlayerHarness('src/features/activities/components/nodes/SubmissionNode')
  let tree = form.draw(props)
  form.find(tree, element => element.type === 'input').props.onChange()
  tree = form.draw(props)
  const second = form.find(tree, element => element.type === 'input' && !element.props.checked)
  second.props.onChange()
  tree = form.draw(props)
  tree.props.onSubmit({ preventDefault() {} })
  assert.equal(saved, 1)
  assert.equal(journeyLogic.latestSubmission(journeyStore.useJourney(), activity.id, node.id).contenido.seleccion.length, 2)
  form.dispose()
  const file = immersivePlayerHarness('src/features/activities/components/nodes/SubmissionNode')
  const before = saved
  const unavailable = file.draw({ ...props, node: { ...original, obligatoria: false, entregable: { tipo: 'archivo', formatos: ['pdf'], maxArchivos: 1, maxMB: 2 } } })
  assert.equal(file.text(unavailable), 'Esta entrega no está disponible en la plataforma.')
  assert.equal(saved, before + 1)
  assert.equal(file.find(unavailable, element => element.type === 'input'), undefined)
  file.dispose()
  const mandatory = immersivePlayerHarness('src/features/activities/components/nodes/SubmissionNode')
  mandatory.draw({ ...props, node: { ...original, obligatoria: true, entregable: { tipo: 'archivo', formatos: ['pdf'], maxArchivos: 1, maxMB: 2 } } })
  assert.equal(saved, before + 1)
  mandatory.dispose()
})

test('immersive questions require confirmation, preserve two attempts and allow fresh revision', () => {
  const activity = journeyContent.activities.find(activity => activity.id === 'enc-mitos')
  const node = activity.nodos.find(node => node.tipo === 'pregunta' && node.formato !== 'opcion_multiple' && node.opciones.filter(option => !option.correcta).length >= 2)
  journeyStore.updateJourney(() => journeyLogic.initialJourney())
  let continued = 0, resources
  const props = { activity, node, onContinue: () => continued++, onResources: ids => { resources = ids } }
  const question = immersivePlayerHarness('src/features/activities/components/nodes/QuestionNode')
  const wrong = node.opciones.filter(option => !option.correcta)
  let tree = question.draw(props)
  assert.equal(question.button(tree, 'Comprobar').props.disabled, true)
  for (let i = 0; i < 2; i++) {
    question.find(tree, element => element.type?.name === 'CheckOption' && element.props.text === wrong[i].texto).props.onClick()
    assert.equal(journeyStore.useJourney().attempts.length, i)
    tree = question.draw(props)
    question.button(tree, 'Comprobar').props.onClick()
    tree = question.draw(props)
    const attempt = journeyStore.useJourney().attempts.at(-1)
    assert.equal(attempt.numeroIntento, i + 1)
    assert.equal(attempt.correcta, false)
    assert.equal(attempt.revelada, i === 1)
    if (i === 0) {
      const blocked = question.find(tree, element => element.type?.name === 'CheckOption' && element.props.text === wrong[i].texto)
      assert.equal(blocked.props.disabled, true)
      question.button(tree, 'Ver ficha').props.onClick()
      assert.ok(resources.length > 0)
    } else {
      assert.ok(question.text(tree).includes(node.explicacion))
      question.button(tree, 'Continuar el camino').props.onClick()
    }
  }
  assert.equal(continued, 1)
  const fresh = immersivePlayerHarness('src/features/activities/components/nodes/QuestionNode')
  const option = fresh.find(fresh.draw({ ...props, fresh: true }), element => element.type?.name === 'CheckOption' && element.props.text === wrong[0].texto)
  assert.equal(option.props.disabled, false)
  fresh.dispose(); question.dispose()
})

test('immersive matrix requires all seven submissions even when a legacy alternative is saved', () => {
  const activity = journeyContent.activities.find(activity => activity.id === 'act-06')
  const { MatrixNode } = load(path.resolve('src/features/activities/components/nodes/MatrixNode.tsx'))
  const required = activity.nodos.filter(node => node.tipo === 'consigna' && node.obligatoria)
  const legacy = { id: 'old-file', actividadId: activity.id, nodoId: 'g-archivo', version: 1, contenido: { tipo: 'archivo', archivos: [{ id: 'file', nombre: 'old.pdf' }] } }
  const draw = submissions => {
    journeyStore.updateJourney(() => ({ ...journeyLogic.initialJourney(), submissions }))
    return renderToStaticMarkup(React.createElement(MatrixNode, { activity, onContinue() {} }))
  }
  assert.equal(required.length, 7)
  const empty = draw([legacy])
  assert.match(empty, /0 de 7 entregas necesarias guardadas/)
  assert.doesNotMatch(empty, /old\.pdf|Archivo guardado|type="file"/)
  const saved = required.map((node, i) => ({ id: `entry-${i}`, actividadId: activity.id, nodoId: node.id, version: 1, contenido: { tipo: 'texto', texto: 'Una posibilidad guardada para este horizonte.' } }))
  assert.match(draw([legacy, ...saved.slice(0, 6)]), /6 de 7 entregas necesarias guardadas/)
  assert.match(draw([legacy, ...saved.slice(0, 6)]), /disabled="">Guardar mi mapa y seguir/)
  const completed = draw([legacy, ...saved])
  assert.match(completed, /7 de 7 entregas necesarias guardadas/)
  assert.doesNotMatch(completed, /disabled="">Guardar mi mapa y seguir/)
  assert.match(completed, /Tu futuro se dibuja con lápiz/)
  journeyStore.updateJourney(() => journeyLogic.initialJourney())
})

test('immersive direct instrument resumes pending items and completes once without narrative reactions', () => {
  const activity = journeyContent.activities.find(activity => activity.id === 'act-tip-01')
  const node = activity.nodos.find(node => node.tipo === 'item')
  journeyStore.updateJourney(() => journeyLogic.initialJourney())
  const player = immersivePlayerHarness('src/features/activities/components/StudentActivityPlayer')
  const props = { activity, direct: true, onClose() {}, onNext() {} }
  let tree = player.draw(props)
  const item = player.find(tree, element => element.props.node?.tipo === 'item')
  assert.equal(item.props.direct, true)
  item.props.onAnswer('si')
  tree = player.draw(props)
  const saved = journeyStore.useJourney()
  assert.equal(saved.items.length, 1)
  assert.equal(saved.items[0].itemId, node.itemId)
  assert.equal(saved.progress[activity.id].estado, 'en_curso')
  assert.equal(saved.rewards.length, 0)
  assert.equal(player.find(tree, element => element.props.speakerId === 'mara'), undefined)
  const resumed = immersivePlayerHarness('src/features/activities/components/StudentActivityPlayer')
  const items = activity.nodos.filter(node => node.tipo === 'item')
  tree = resumed.draw(props)
  assert.equal(resumed.find(tree, element => element.props.node?.tipo === 'item').props.node.id, items[1].id)
  for (let i = 1; i < items.length; i++) {
    resumed.find(tree, element => element.props.node?.tipo === 'item').props.onAnswer('si')
    tree = resumed.draw(props)
  }
  assert.ok(resumed.find(tree, element => element.type.name === 'FinishScreen'))
  assert.equal(journeyStore.useJourney().items.length, items.length)
  assert.equal(journeyStore.useJourney().progress[activity.id].estado, 'completada')
  assert.equal(journeyStore.useJourney().progress[activity.id].nodoActualId, '$fin')
  assert.equal(journeyStore.useJourney().rewards.length, 1)
  resumed.dispose()
  player.dispose()
  journeyStore.updateJourney(() => journeyLogic.initialJourney())
})

test('immersive resources show their content, normalize YouTube and preserve saved backpack state', () => {
  const file = path.resolve('src/features/activities/components/ResourceSheet.tsx')
  const js = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
  const resources = [
    { id: 'sheet-test', titulo: 'Una ficha', tipo: 'ficha', contenido: '## Ideas\n\nUna **pista** para explorar.', fuente: 'Fuente de la ficha', guardableEnRecursos: true },
    { id: 'video-test', titulo: 'Un video', tipo: 'video', url: 'https://youtu.be/ysz5S6PUM-U?t=30', guardableEnRecursos: true },
    { id: 'link-test', titulo: 'Un enlace', tipo: 'enlace', url: 'https://example.com/resource', guardableEnRecursos: true },
    { id: 'pending-test', titulo: 'Material pendiente', tipo: 'ficha', guardableEnRecursos: true },
  ]
  const pass = ({ children }) => children
  const require = specifier => {
    if (specifier === '@/components/ui/Sheet') return { Sheet: pass, SheetContent: pass, SheetDescription: pass, SheetTitle: pass }
    if (specifier === '@/data/activities/content') return { catalog: { recursos: resources } }
    if (!specifier.startsWith('.') && !specifier.startsWith('@/')) return nativeRequire(specifier)
    const base = specifier.startsWith('@/') ? path.resolve('src', specifier.slice(2)) : path.resolve(path.dirname(file), specifier)
    if (base === path.resolve('src/features/activities/hooks/useActivityResources')) return loadMovedHook(`${base}.ts`, require)
    return load([`${base}.tsx`, `${base}.ts`].find(existsSync))
  }
  const exports = {}
  vm.runInContext(`(function(require,exports){${js}\n})`, context)(require, exports)
  const draw = id => renderToStaticMarkup(React.createElement(exports.ResourceSheet, { open: true, ids: [id], onClose() {} }))
  journeyStore.updateJourney(() => journeyLogic.initialJourney())
  assert.match(draw('sheet-test'), /Una <strong>pista<\/strong>/)
  assert.match(draw('sheet-test'), /Fuente de la ficha/)
  assert.match(draw('sheet-test'), /Guardar en Recursos/)
  assert.match(draw('sheet-test'), /aria-expanded="true"/)
  assert.match(draw('video-test'), /src="https:\/\/www.youtube-nocookie.com\/embed\/ysz5S6PUM-U"/)
  assert.match(draw('link-test'), /href="https:\/\/example.com\/resource"/)
  assert.match(draw('pending-test'), /Este material estará disponible cuando lo prepare orientación\./)
  assert.doesNotMatch(draw('pending-test'), /Guardar en Recursos/)
  journeyStore.updateJourney(current => ({ ...current, resources: ['sheet-test'] }))
  assert.match(draw('sheet-test'), /En tu mochila/)
  assert.doesNotMatch(draw('sheet-test'), /Guardar en Recursos/)
  journeyStore.updateJourney(() => journeyLogic.initialJourney())
})

test('immersive finish shows saved sheets, narrative rewards and the prompted journal action', () => {
  const activity = journeyContent.activities.find(activity => activity.id === 'enc-mitos')
  const { FinishScreen } = load(path.resolve('src/features/activities/components/FinishScreen.tsx'))
  journeyStore.updateJourney(() => ({ ...journeyLogic.initialJourney(), resources: ['ficha-mitos'], progress: { [activity.id]: { estado: 'completada' } } }))
  const html = renderToStaticMarkup(React.createElement(MemoryRouter, {}, React.createElement(FinishScreen, { activity, onClose() {} })))
  for (const text of ['Este hallazgo viaja contigo.', 'Nuevo en tu mochila', 'Una pregunta para tu diario', 'Escribir en mi diario', 'Volver al mapa']) assert.ok(html.includes(text))
  assert.match(html, /href="\/student\/resources\?ficha=ficha-mitos"/)
  if (!activity.recompensa.mensajeFin.startsWith('Obtuviste:')) assert.ok(html.includes(activity.recompensa.mensajeFin))
  assert.doesNotMatch(html, /Revisar mis propias creencias|Seguir hacia/)
  assert.doesNotMatch(html, /\bpuntos\b|\bpts\b|Nueva insignia/)
  const { ResultNode } = load(path.resolve('src/features/activities/components/nodes/ResultNode.tsx'))
  const result = renderToStaticMarkup(React.createElement(ResultNode, { activity: journeyContent.finalActivity, instrumentId: 'tip' }))
  assert.match(result, /Elena te espera al completar los 14 encuentros/)
  journeyStore.updateJourney(() => journeyLogic.initialJourney())
})

test('immersive choices preserve recorded responses and show reactions before the next node', () => {
  const original = journeyContent.activities.find(activity => activity.id === 'act-tip-01')
  const choice = original.nodos.find(node => node.tipo === 'eleccion')
  const reaction = { id: 'reaction-test', tipo: 'dialogo', hablanteId: 'companero', texto: 'Escucho tu respuesta.' }
  const node = { ...choice, registrar: true, opciones: [{ ...choice.opciones[0], reaccion: [reaction] }] }
  const activity = { ...original, nodos: original.nodos.map(current => current.id === node.id ? node : current) }
  journeyStore.updateJourney(() => ({ ...journeyLogic.initialJourney(), progress: { [activity.id]: { estado: 'en_curso', nodoActualId: node.id } } }))
  const player = immersivePlayerHarness('src/features/activities/components/StudentActivityPlayer')
  const props = { activity, onClose() {}, onNext() {} }
  let tree = player.draw(props)
  const panel = player.find(tree, element => element.props.node?.tipo === 'eleccion')
  assert.equal(panel.props.previous.tipo, 'dialogo')
  panel.props.onChoose(node.opciones[0])
  tree = player.draw(props)
  assert.equal(journeyStore.useJourney().choices[0].opcionId, node.opciones[0].id)
  const dialogue = player.find(tree, element => element.props.text === reaction.texto)
  assert.ok(dialogue)
  dialogue.props.onContinue()
  tree = player.draw(props)
  assert.equal(player.find(tree, element => element.props.text === reaction.texto), undefined)
  assert.equal(journeyStore.useJourney().choices.length, 1)
  player.dispose()
  journeyStore.updateJourney(() => journeyLogic.initialJourney())
})

const followUpService = load(path.resolve('src/features/activities/lib/followUpService.ts'))
const followUpStore = load(path.resolve('src/features/activities/store/followUpStore.ts'))
const responseCondenser = load(path.resolve('src/features/activities/lib/responseCondenser.ts'))
const reflectionStore = load(path.resolve('src/store/reflectionStore.ts'))
const reflectionProvider = load(path.resolve('src/features/activities/lib/reflection/provider.ts'))
const reflectionEvaluation = load(path.resolve('src/features/activities/lib/reflection/evaluation.ts'))
const reflectionPersonalization = load(path.resolve('src/features/activities/lib/reflection/personalization.ts'))
function followUpClock() {
  const previous = { setTimeout: context.setTimeout, clearTimeout: context.clearTimeout }
  const timers = new Map()
  let time = 0, id = 0
  context.setTimeout = (callback, delay) => { timers.set(++id, { callback, at: time + delay }); return id }
  context.clearTimeout = handle => timers.delete(handle)
  return {
    async tick(duration) {
      const target = time + duration
      for (;;) {
        const entry = [...timers].filter(([, timer]) => timer.at <= target).sort((a, b) => a[1].at - b[1].at)[0]
        if (!entry) break
        time = entry[1].at; timers.delete(entry[0]); entry[1].callback()
        for (let i = 0; i < 12; i++) await Promise.resolve()
      }
      time = target
      for (let i = 0; i < 12; i++) await Promise.resolve()
    },
    get pending() { return timers.size },
    restore() { Object.assign(context, previous) },
  }
}
function followUpFixture({ evaluated = true, evaluations = ['INSUFICIENTE', 'INSUFICIENTE', 'INSUFICIENTE'] } = {}) {
  const source = journeyContent.activities.find(activity => activity.id === 'mission-story')
  // DATO DE PRUEBA: variante sin criterios para recuperar registros anteriores.
  const activity = evaluated ? source : { ...source, id: 'registro-anterior' }
  const node = source.nodos.find(node => node.id === 'story-personas')
  const text = 'Quiero decidir por mí, con apoyo.'
  const entry = { id: crypto.randomUUID(), estudianteId: 'est-prototipo', actividadId: activity.id, nodoId: node.id, contenido: { tipo: 'texto', texto: text }, version: 1, enviadoEn: new Date().toISOString() }
  journeyStore.updateJourney(() => ({ ...journeyLogic.initialJourney(), submissions: [entry], progress: { [activity.id]: { estado: 'en_curso', nodoActualId: node.id } } }))
  followUpStore.updateFollowUps(() => followUpStore.initialFollowUpState())
  const key = activity.id + '/' + node.id
  reflectionStore.updateReflections(() => ({ ...reflectionStore.initialReflectionState(), escenarios: { [key]: { evaluaciones: evaluations } } }))
  reflectionEvaluation.beginResponse(activity, node, entry)
  followUpStore.setFollowUpRecord(key, { textoInicial: text, versionInicial: 1, turnos: [] })
  return { activity, node, text, key, entry }
}
const followUpTurn = (orden, pregunta, respuesta, omitida = false) => ({ orden, pregunta, respuesta, omitida, creadaEn: '2026-10-03T10:00:00.000Z', ...(respuesta !== undefined || omitida ? { respondidaEn: '2026-10-03T10:01:00.000Z' } : {}) })

test('follow-up service uses configured criteria and classification rather than text length', async () => {
  const fixture = followUpFixture({ evaluations: ['INSUFICIENTE', 'ADECUADA'] }), clock = followUpClock()
  try {
    const input = { activityId: fixture.activity.id, nodeId: fixture.node.id, premisa: fixture.node.premisa, texto: 'Una respuesta breve', turnosPrevios: [] }
    let finished = false
    const short = followUpService.mockFollowUpService.evaluate(input).then(value => { finished = true; return value })
    await clock.tick(249); assert.equal(finished, false)
    await clock.tick(1); assert.ok((await short).pregunta)
    const long = followUpService.mockFollowUpService.evaluate({ ...input, texto: 'a'.repeat(200) })
    await clock.tick(250); assert.ok((await long).pregunta)
    const adequate = followUpService.mockFollowUpService.evaluate({ ...input, turnosPrevios: [followUpTurn(1, 'Una pregunta', 'Sí')] })
    await clock.tick(250); assert.equal((await adequate).pregunta, undefined)
    assert.equal((await followUpService.mockFollowUpService.evaluate({ ...input, activityId: 'sin-criterios' })).pregunta, undefined)
    assert.equal(clock.pending, 0)
  } finally { clock.restore() }
})

test('follow-up evaluation silently resolves failures and a 10-second timeout without late questions', async () => {
  const clock = followUpClock()
  try {
    const input = { activityId: 'a', nodeId: 'n', premisa: 'Una premisa', texto: 'Texto', turnosPrevios: [] }
    assert.equal((await followUpService.evaluateFollowUp({ evaluate: async () => { throw new Error('Servicio caído') } }, input)).pregunta, undefined)
    let release, finished = false
    const promise = followUpService.evaluateFollowUp({ evaluate: () => new Promise(resolve => { release = resolve }) }, input).then(value => { finished = true; return value })
    await clock.tick(9999); assert.equal(finished, false)
    await clock.tick(1); assert.equal((await promise).pregunta, undefined)
    release({ pregunta: 'Demasiado tarde' }); await clock.tick(0)
    assert.equal((await promise).pregunta, undefined)
    assert.equal(clock.pending, 0)
  } finally { clock.restore() }
})

test('response condenser preserves exact labels and blank lines, excludes omitted turns and enforces capacity', async () => {
  const turns = [followUpTurn(1, '¿Por qué?', 'Porque quiero decidir.'), followUpTurn(2, '¿Algo más?', undefined, true)]
  const input = { textoInicial: 'autodeterminación', turnos: turns, premisa: 'Una premisa', maxCaracteres: 800 }
  const expected = 'autodeterminación\n\nPregunta de Lumi: ¿Por qué?\nRespuesta: Porque quiero decidir.'
  assert.equal(responseCondenser.buildCondensedResponse(input), expected)
  assert.equal(await responseCondenser.templateCondenser.condense(input), expected)
  const withBoth = { ...input, turnos: [...turns.slice(0, 1), followUpTurn(2, '¿Algo más?', 'Apoyo familiar.')] }
  assert.equal(await responseCondenser.templateCondenser.condense(withBoth), expected + '\n\nPregunta de Lumi: ¿Algo más?\nRespuesta: Apoyo familiar.')
  assert.equal(responseCondenser.responseCapacity({ ...input, maxCaracteres: undefined }, '¿Nueva?'), 400)
  const prefix = '\n\nPregunta de Lumi: ¿Nueva?\nRespuesta: '
  const limit = expected.length + prefix.length + 40
  assert.equal(responseCondenser.responseCapacity({ ...input, maxCaracteres: limit }, '¿Nueva?'), 40)
  assert.equal(responseCondenser.responseCapacity({ ...input, maxCaracteres: limit - 1 }, '¿Nueva?'), 39)
  const filled = { ...input, maxCaracteres: limit, turnos: [turns[0], followUpTurn(2, '¿Nueva?', 'a'.repeat(40))] }
  assert.equal((await responseCondenser.templateCondenser.condense(filled)).length, limit)
  await assert.rejects(responseCondenser.templateCondenser.condense({ ...filled, maxCaracteres: limit - 1 }), /supera el límite/)
})

test('follow-up store survives remounts and reload events and tolerates corrupt or unavailable storage', () => {
  const file = path.resolve('src/features/activities/store/followUpStore.ts')
  const js = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const memory = new Map(), events = []
  let unavailable = false
  const storage = { getItem: key => { if (unavailable) throw new Error('No storage'); return memory.get(key) ?? null }, setItem: (key, value) => { if (unavailable) throw new Error('No storage'); memory.set(key, value) } }
  const fresh = () => {
    const exports = {}
    const require = specifier => specifier === 'react' ? { ...React, useSyncExternalStore: (_, snapshot) => snapshot() } : specifier.includes('/activities/logic') ? journeyLogic : specifier.includes('/store/journeyStore') ? journeyStore : specifier === '../lib/responseCondenser' ? responseCondenser : {}
    vm.runInNewContext('(function(require,exports){' + js + '\n})', { localStorage: storage, window: { addEventListener: (_, callback) => events.push(callback) }, Date, crypto, Map, Set })(require, exports)
    return exports
  }
  const first = fresh(), record = { textoInicial: 'Texto', versionInicial: 1, turnos: [followUpTurn(1, '¿Por qué?', 'Mi respuesta')] }
  assert.equal(first.setFollowUpRecord('a/n', record), true)
  assert.ok(memory.has('ov.student-followups.v1'))
  const second = fresh()
  assert.equal(second.getFollowUpRecord('a/n').turnos[0].respuesta, 'Mi respuesta')
  memory.set('ov.student-followups.v1', JSON.stringify({ version: 1, records: { 'a/n': { ...record, textoInicial: 'Cambio en otra pestaña' }, invalid: { turnos: 'wrong' } } }))
  events.at(-1)({ key: 'ov.student-followups.v1' })
  assert.equal(second.getFollowUpRecord('a/n').textoInicial, 'Cambio en otra pestaña')
  memory.set('ov.student-followups.v1', '{broken'); assert.equal(Object.keys(fresh().useFollowUps().records).length, 0)
  unavailable = true; assert.equal(Object.keys(fresh().useFollowUps().records).length, 0)
  assert.equal(second.setFollowUpRecord('b/n', record), false)
  assert.equal(second.getFollowUpRecord('b/n'), undefined)
})

test('first and edited evaluated text start follow-up after saving; matrices use the normal form', async () => {
  const fixture = followUpFixture()
  for (const kind of ['first', 'edit', 'matrix']) {
    journeyStore.updateJourney(() => ({ ...journeyLogic.initialJourney(), submissions: kind === 'edit' ? [fixture.entry] : [] }))
    followUpStore.updateFollowUps(() => followUpStore.initialFollowUpState())
    reflectionStore.updateReflections(() => reflectionStore.initialReflectionState())
    await reflectionPersonalization.prepareQuestion(fixture.activity, fixture.node)
    let advanced = 0
    const activity = kind === 'matrix' ? { ...fixture.activity, plantilla: { tipo: 'matriz' } } : fixture.activity
    const props = { activity, node: fixture.node, edit: kind === 'edit', onSaved: () => advanced++ }
    const form = immersivePlayerHarness('src/features/activities/components/nodes/SubmissionNode')
    let tree = form.draw(props)
    form.find(tree, element => element.type === 'textarea').props.onChange({ target: { value: fixture.text } })
    tree = form.draw(props); tree.props.onSubmit({ preventDefault() {} })
    tree = form.draw(props)
    assert.equal(journeyLogic.latestSubmission(journeyStore.useJourney(), activity.id, fixture.node.id).version, kind === 'edit' ? 2 : 1)
    if (kind === 'edit') assert.deepEqual(journeyStore.useJourney().submissions[0], fixture.entry)
    if (kind !== 'matrix') {
      assert.equal(advanced, 0)
      assert.equal(tree.type.name, 'FollowUp')
      assert.equal(followUpStore.getFollowUpRecord(fixture.key).textoInicial, fixture.text)
    } else {
      assert.equal(advanced, 1)
      assert.equal(followUpStore.getFollowUpRecord(fixture.key), undefined)
    }
    form.dispose()
  }
})

test('follow-up accepts two replies, caps the field at available space and saves one condensed version', async () => {
  const fixture = followUpFixture(), clock = followUpClock()
  const ui = immersivePlayerHarness('src/features/activities/components/followup/FollowUp')
  let advanced = 0
  const props = { activity: fixture.activity, node: fixture.node, onContinue: () => advanced++ }
  try {
    let tree = ui.draw(props); assert.match(ui.text(tree), /Tu respuesta/)
    await clock.tick(700); tree = ui.draw(props); tree = ui.draw(props)
    let field = ui.find(tree, element => element.type === 'textarea')
    assert.equal(field.props.maxLength, 400)
    assert.equal(ui.button(tree, 'Responder').props.disabled, true)
    field.props.onChange({ target: { value: 'Porque quiero elegir.' } })
    tree = ui.draw(props); ui.find(tree, element => element.type === 'form').props.onSubmit({ preventDefault() {} })
    tree = ui.draw(props); tree = ui.draw(props); await clock.tick(700)
    tree = ui.draw(props); tree = ui.draw(props)
    field = ui.find(tree, element => element.type === 'textarea')
    assert.ok(field)
    field.props.onChange({ target: { value: 'Con el apoyo de mi familia.' } })
    tree = ui.draw(props); ui.find(tree, element => element.type === 'form').props.onSubmit({ preventDefault() {} })
    tree = ui.draw(props); await clock.tick(250); tree = ui.draw(props)
    assert.equal(advanced, 0)
    const entries = journeyStore.useJourney().submissions
    assert.equal(entries.length, 2); assert.equal(entries[0].contenido.texto, fixture.text)
    assert.equal(entries[1].version, 2)
    assert.equal(entries[1].contenido.texto, responseCondenser.buildCondensedResponse({ textoInicial: fixture.text, turnos: followUpStore.getFollowUpRecord(fixture.key).turnos, premisa: fixture.node.premisa }))
    assert.equal(journeyLogic.validateSubmission(fixture.node, entries[1].contenido), undefined)
    assert.equal(followUpStore.getFollowUpRecord(fixture.key).turnos.length, 2)
    assert.equal(followUpStore.getFollowUpRecord(fixture.key).versionCondensada, 2)
    const dialogue = ui.find(tree, element => element.type.name === 'InlineDialogue' && element.props.text?.startsWith('Lo guardé'))
    assert.ok(dialogue)
    ui.button(tree, 'Continuar').props.onClick(); assert.equal(advanced, 1)
  } finally { ui.dispose(); clock.restore() }
})

test('omitting preserves version one; adequate classification ends follow-up after one reply', async () => {
  for (const omit of [true, false]) {
    const fixture = followUpFixture({ evaluations: ['INSUFICIENTE', 'ADECUADA'] }), clock = followUpClock(), ui = immersivePlayerHarness('src/features/activities/components/followup/FollowUp')
    const props = { activity: fixture.activity, node: fixture.node, onContinue() {} }
    try {
      let tree = ui.draw(props); await clock.tick(700); tree = ui.draw(props); tree = ui.draw(props)
      if (omit) ui.button(tree, 'Omitir').props.onClick()
      else { ui.find(tree, element => element.type === 'textarea').props.onChange({ target: { value: 'Una respuesta de más de cuarenta caracteres que amplía lo que pienso.' } }); tree = ui.draw(props); ui.find(tree, element => element.type === 'form').props.onSubmit({ preventDefault() {} }) }
      tree = ui.draw(props); tree = ui.draw(props); await clock.tick(700); tree = ui.draw(props); await clock.tick(0); tree = ui.draw(props)
      assert.equal(followUpStore.getFollowUpRecord(fixture.key).turnos.length, 1)
      assert.equal(journeyStore.useJourney().submissions.length, omit ? 1 : 2)
      assert.ok(ui.button(tree, 'Continuar'))
      if (omit) assert.ok(ui.find(tree, element => element.props.text === 'Tu respuesta quedó guardada tal como la escribiste.'))
    } finally { ui.dispose(); clock.restore() }
  }
})

test('adequate classification, no space, failure and timeout preserve the original until explicit continuation', async () => {
  const original = reflectionProvider.getReflectionProvider()
  for (const kind of ['adequate', 'space', 'error', 'timeout']) {
    const fixture = followUpFixture(), clock = followUpClock(), ui = immersivePlayerHarness('src/features/activities/components/followup/FollowUp')
    let advanced = 0
    const node = kind === 'space' ? { ...fixture.node, entregable: { ...fixture.node.entregable, maxCaracteres: fixture.text.length } } : fixture.node
    reflectionProvider.setReflectionProvider({ ...original, evaluateResponse: async () => {
      if (kind === 'error') throw new Error('Servicio caído')
      if (kind === 'timeout') return new Promise(() => {})
      return { ...reflectionProvider.metadata(Date.now()), clasificacion: kind === 'space' ? 'INSUFICIENTE' : 'ADECUADA', criteriosFaltantes: [], preguntaSeguimiento: '¿Por qué?' }
    } })
    const props = { activity: fixture.activity, node, onContinue: () => advanced++ }
    try {
      ui.draw(props); await clock.tick(kind === 'timeout' ? 10_000 : 0)
      const tree = ui.draw(props)
      assert.equal(advanced, 0)
      assert.equal(journeyStore.useJourney().submissions.length, 1)
      assert.equal(followUpStore.getFollowUpRecord(fixture.key).turnos.length, 0)
      ui.button(tree, 'Continuar').props.onClick(); assert.equal(advanced, 1)
    } finally { reflectionProvider.setReflectionProvider(original); ui.dispose(); clock.restore() }
  }
})

test('interrupted follow-up recovers only answered turns and loads the condensed form without duplicate versions', async () => {
  const fixture = followUpFixture({ evaluated: false })
  followUpStore.setFollowUpRecord(fixture.key, { textoInicial: fixture.text, versionInicial: 1, turnos: [followUpTurn(1, '¿Por qué?', 'Porque es mi decisión.'), followUpTurn(2, '¿Algo más?', undefined)] })
  const form = immersivePlayerHarness('src/features/activities/components/nodes/SubmissionNode')
  const props = { activity: fixture.activity, node: fixture.node, edit: true, onSaved() {} }
  let tree = form.draw(props); assert.match(form.text(tree), /Recuperando/)
  await followUpStore.recoverFollowUp(fixture.activity, fixture.node)
  for (let i = 0; i < 12; i++) await Promise.resolve()
  tree = form.draw(props)
  assert.equal(journeyStore.useJourney().submissions.length, 2)
  assert.equal(followUpStore.getFollowUpRecord(fixture.key).turnos.length, 1)
  const field = form.find(tree, element => element.type === 'textarea')
  assert.match(field.props.value, /Pregunta de Lumi: ¿Por qué\?\nRespuesta: Porque es mi decisión\./)
  assert.doesNotMatch(field.props.value, /Algo más/)
  await followUpStore.recoverFollowUp(fixture.activity, fixture.node)
  assert.equal(journeyStore.useJourney().submissions.length, 2)
  field.props.onChange({ target: { value: field.props.value + ' Ahora agrego otra idea.' } })
  tree = form.draw(props); tree.props.onSubmit({ preventDefault() {} })
  assert.equal(journeyStore.useJourney().submissions.length, 3)
  assert.equal(journeyLogic.latestSubmission(journeyStore.useJourney(), fixture.activity.id, fixture.node.id).version, 3)
  assert.equal(form.draw(props).type, 'form')
  form.dispose()
})

test('recovery detects a saved version without its follow-up marker and keeps invalid condensation as history only', async () => {
  const fixture = followUpFixture(), turns = [followUpTurn(1, '¿Por qué?', 'Porque quiero elegir.')]
  const record = { textoInicial: fixture.text, versionInicial: 1, turnos: turns }
  followUpStore.setFollowUpRecord(fixture.key, record)
  await followUpStore.saveFollowUpResponse(fixture.activity, fixture.node)
  assert.equal(journeyStore.useJourney().submissions.length, 2)
  followUpStore.setFollowUpRecord(fixture.key, record)
  await followUpStore.recoverFollowUp(fixture.activity, fixture.node)
  assert.equal(journeyStore.useJourney().submissions.length, 2)
  assert.equal(followUpStore.getFollowUpRecord(fixture.key).versionCondensada, 2)
  const next = followUpFixture()
  followUpStore.setFollowUpRecord(next.key, record)
  const result = await followUpStore.saveFollowUpResponse(next.activity, { ...next.node, entregable: { ...next.node.entregable, maxCaracteres: 35 } })
  assert.equal(result.saved, false)
  assert.equal(journeyStore.useJourney().submissions.length, 1)
  assert.equal(followUpStore.getFollowUpRecord(next.key).versionCondensada, undefined)
  assert.equal(followUpStore.getFollowUpRecord(next.key).turnos[0].respuesta, 'Porque quiero elegir.')
  const invalid = await followUpStore.saveFollowUpResponse(next.activity, next.node, { condense: async () => '' })
  assert.equal(invalid.saved, false)
  assert.equal(journeyStore.useJourney().submissions.length, 1)
  journeyStore.updateJourney(() => journeyLogic.initialJourney())
  followUpStore.updateFollowUps(() => followUpStore.initialFollowUpState())
})


test('follow-up requires available capacity and stops before a second question that cannot fit', async () => {
  const original = reflectionProvider.getReflectionProvider()
  reflectionProvider.setReflectionProvider({ ...original, evaluateResponse: async () => ({ ...reflectionProvider.metadata(Date.now()), clasificacion: 'INSUFICIENTE', criteriosFaltantes: [], preguntaSeguimiento: '¿Por qué?' }) })
  try {
    for (const remaining of [0, 1, 40]) {
      const fixture = followUpFixture(), clock = followUpClock(), ui = immersivePlayerHarness('src/features/activities/components/followup/FollowUp')
      let advanced = 0
      const maximum = fixture.text.length + '\n\nPregunta de Lumi: ¿Por qué?\nRespuesta: '.length + remaining
      const node = { ...fixture.node, entregable: { ...fixture.node.entregable, maxCaracteres: maximum } }
      const props = { activity: fixture.activity, node, onContinue: () => advanced++ }
      try {
        let tree = ui.draw(props); await clock.tick(0); tree = ui.draw(props); tree = ui.draw(props)
        const field = ui.find(tree, element => element.type === 'textarea')
        assert.equal(advanced, 0)
        if (remaining === 0) {
          assert.equal(field, undefined)
          assert.equal(journeyStore.useJourney().submissions.length, 1)
        } else {
          assert.equal(field.props.maxLength, remaining)
          field.props.onChange({ target: { value: 'a'.repeat(remaining + 1) } }); tree = ui.draw(props)
          ui.find(tree, element => element.type === 'form').props.onSubmit({ preventDefault() {} })
          assert.equal(followUpStore.getFollowUpRecord(fixture.key).turnos[0].respuesta, undefined)
          field.props.onChange({ target: { value: 'a'.repeat(remaining) } }); tree = ui.draw(props)
          ui.find(tree, element => element.type === 'form').props.onSubmit({ preventDefault() {} })
          tree = ui.draw(props); await clock.tick(0); tree = ui.draw(props)
          assert.equal(followUpStore.getFollowUpRecord(fixture.key).turnos.length, 1)
          assert.equal(journeyStore.useJourney().submissions.length, 2)
          assert.equal(journeyLogic.validateSubmission(node, journeyStore.useJourney().submissions.at(-1).contenido), undefined)
        }
        ui.button(tree, 'Continuar').props.onClick(); assert.equal(advanced, 1)
      } finally { ui.dispose(); clock.restore() }
    }
  } finally { reflectionProvider.setReflectionProvider(original) }
})

test('leaving during evaluation never stores a late question and recovery preserves the replied turn', async () => {
  const fixture = followUpFixture(), clock = followUpClock(), ui = immersivePlayerHarness('src/features/activities/components/followup/FollowUp')
  const props = { activity: fixture.activity, node: fixture.node, onContinue() { assert.fail('An unmounted follow-up must not advance') } }
  try {
    let tree = ui.draw(props); await clock.tick(700); tree = ui.draw(props); tree = ui.draw(props)
    ui.find(tree, element => element.type === 'textarea').props.onChange({ target: { value: 'Quiero elegir.' } })
    tree = ui.draw(props); ui.find(tree, element => element.type === 'form').props.onSubmit({ preventDefault() {} })
    ui.draw(props); await clock.tick(249); ui.dispose(); await clock.tick(1)
    assert.equal(followUpStore.getFollowUpRecord(fixture.key).turnos.length, 1)
    assert.equal(journeyStore.useJourney().submissions.length, 1)
    await followUpStore.recoverFollowUp(fixture.activity, fixture.node)
    assert.equal(journeyStore.useJourney().submissions.length, 2)
    assert.match(journeyStore.useJourney().submissions.at(-1).contenido.texto, /Respuesta: Quiero elegir\./)
  } finally { ui.dispose(); clock.restore() }
})

test('failed delivery writes preserve version one and failed follow-up markers do not duplicate version two', async () => {
  const fixture = followUpFixture(), original = context.localStorage.setItem
  followUpStore.setFollowUpRecord(fixture.key, { textoInicial: fixture.text, versionInicial: 1, turnos: [followUpTurn(1, '¿Por qué?', 'Porque quiero decidir.')] })
  try {
    context.localStorage.setItem = key => { if (key === 'ov.missions.v2') throw new Error('Full storage') }
    assert.equal((await followUpStore.saveFollowUpResponse(fixture.activity, fixture.node)).saved, false)
    assert.equal(journeyStore.useJourney().submissions.length, 1)
    assert.equal(followUpStore.getFollowUpRecord(fixture.key).versionCondensada, undefined)
    context.localStorage.setItem = key => { if (key === 'ov.student-followups.v1') throw new Error('Full follow-up storage') }
    assert.equal((await followUpStore.saveFollowUpResponse(fixture.activity, fixture.node)).saved, true)
    assert.equal(journeyStore.useJourney().submissions.length, 2)
    assert.equal(followUpStore.getFollowUpRecord(fixture.key).versionCondensada, undefined)
    context.localStorage.setItem = original
    await followUpStore.recoverFollowUp(fixture.activity, fixture.node)
    assert.equal(journeyStore.useJourney().submissions.length, 2)
    assert.equal(followUpStore.getFollowUpRecord(fixture.key).versionCondensada, 2)
  } finally {
    context.localStorage.setItem = original
    journeyStore.updateJourney(() => journeyLogic.initialJourney())
    followUpStore.updateFollowUps(() => followUpStore.initialFollowUpState())
  }
})

const noveltyLogic = load(path.resolve('src/features/adventure/lib/unlocks.ts'))
const noveltyUi = load(path.resolve('src/store/studentUiStore.ts'))
const noveltyData = load(path.resolve('src/data/content/adventure.ts'))
function resetNoveltyUi(patch = {}) {
  const { studentViews } = load(path.resolve('src/lib/studentViews.ts'))
  const { localDateKey } = load(path.resolve('src/features/adventure/lib/checkIn.ts'))
  noveltyUi.updateStudentUi(() => ({ ...noveltyUi.initialStudentUiState(), initialized: true, cityArrivalSeen: true, introsSeen: Object.fromEntries(studentViews.map(view => [view, true])), checkInPromptDismissedOn: localDateKey(new Date()), ...patch }))
}

test('novelties use real achievement, resource, hero and zone unlocks with their existing destinations', () => {
  const { appPaths } = load(path.resolve('src/routes/paths.ts'))
  const empty = store.createInitialAdventure(), journey = journeyLogic.initialJourney()
  assert.equal(noveltyLogic.getUnlocks(empty, journey).length, 0)
  const adventure = { ...empty, completedMissionIds: noveltyData.fieldMissions.map(mission => mission.id), solvedCaseIds: ['forest-fire'] }
  journey.resources = ['ficha-mitos', 'ficha-mitos', 'unknown-resource']
  const items = noveltyLogic.getUnlocks(adventure, journey), byId = new Map(items.map(item => [item.id, item]))
  for (const [id, kind, href] of [
    ['badge:I1', 'badge', appPaths.student.passport], ['badge:I2', 'badge', appPaths.student.passport], ['badge:I3', 'badge', appPaths.student.passport], ['badge:I7', 'badge', appPaths.student.passport],
    ['ficha:ficha-mitos', 'ficha', appPaths.student.resources], ['heroe:health-response-paramedic', 'heroe', appPaths.student.testimonials], ['ciudad', 'ciudad', appPaths.student.exploration], ['familia', 'familia', appPaths.student.conversations],
  ]) { assert.equal(byId.get(id)?.kind, kind); assert.equal(byId.get(id)?.href, href) }
  assert.equal(byId.get('ficha:ficha-mitos').title, journeyContent.catalog.recursos.find(resource => resource.id === 'ficha-mitos').titulo)
  assert.equal(byId.get('heroe:health-response-paramedic').title, 'Calma y cuidado en una emergencia')
  assert.equal(byId.has('heroe:global-event-translator'), false)
  assert.equal(byId.has('ficha:unknown-resource'), false)
  assert.equal(items.length, byId.size)
  assert.equal(noveltyLogic.getUnlocks(empty, journey).some(item => item.kind === 'ciudad' || item.kind === 'familia' || item.kind === 'heroe'), false)
})

test('first initialization seeds all prior unlocks and earned badges once while preserving presentation preferences', () => {
  const adventure = { ...store.createInitialAdventure(), completedMissionIds: ['welcome'], solvedCaseIds: ['forest-fire'] }, journey = journeyLogic.initialJourney()
  journey.resources = ['ficha-mitos']
  const initial = { ...noveltyUi.initialStudentUiState(), panelCollapsed: true, soundOn: false, seenUnlockIds: ['previous'], announcedBadgeCodes: ['I8'] }
  assert.equal(noveltyLogic.getNextBadge(adventure, initial, false, false), undefined)
  const seeded = noveltyLogic.seedStudentUnlocks(initial, adventure, journey)
  assert.equal(seeded.initialized, true); assert.equal(seeded.panelCollapsed, true); assert.equal(seeded.soundOn, false)
  for (const item of noveltyLogic.getUnlocks(adventure, journey)) assert.ok(seeded.seenUnlockIds.includes(item.id))
  for (const badge of noveltyLogic.getEarnedBadges(adventure)) assert.ok(seeded.announcedBadgeCodes.includes(badge.code))
  assert.ok(seeded.seenUnlockIds.includes('previous')); assert.ok(seeded.announcedBadgeCodes.includes('I8'))
  assert.equal(noveltyLogic.getNextBadge(adventure, seeded, false, false), undefined)
  assert.equal(noveltyLogic.seedStudentUnlocks(seeded, adventure, journey), seeded)
  const next = { ...adventure, completedMissionIds: ['welcome', 'story', 'future', 'beliefs'] }
  assert.equal(noveltyLogic.getNextBadge(next, seeded, false, false).code, 'I2')
  assert.equal(seeded.announcedBadgeCodes.includes('I2'), false)
})

test('shell seeds after v2 synchronization so migrated completions do not create retroactive alerts', () => {
  journeyStore.updateJourney(() => ({ ...journeyLogic.initialJourney(), progress: { 'mission-welcome': { estado: 'completada' } } }))
  store.updateAdventure(() => store.createInitialAdventure())
  noveltyUi.updateStudentUi(() => noveltyUi.initialStudentUiState())
  const shell = immersivePlayerHarness('src/pages/student/StudentShell', {
    'react-router': { ...nativeRequire('react-router'), useLocation: () => ({ pathname: '/student/missions', search: '' }) },
    '@/context/occupationExplorationContext': { useOccupationExplorationContext: () => ({}) },
  })
  shell.draw({})
  assert.ok(store.useAdventure().completedMissionIds.includes('welcome'))
  assert.equal(noveltyUi.useStudentUi().initialized, false)
  shell.draw({})
  assert.equal(noveltyUi.useStudentUi().initialized, true)
  assert.ok(noveltyUi.useStudentUi().announcedBadgeCodes.includes('I1'))
  assert.equal(noveltyLogic.getNextBadge(store.useAdventure(), noveltyUi.useStudentUi(), false, false), undefined)
  shell.dispose()
  store.updateAdventure(() => store.createInitialAdventure()); journeyStore.updateJourney(() => journeyLogic.initialJourney()); noveltyUi.updateStudentUi(() => noveltyUi.initialStudentUiState())
})

test('novelties show only pending entries and close without reading; selection reads just one', () => {
  store.updateAdventure(() => ({ ...store.createInitialAdventure(), completedMissionIds: ['welcome'] }))
  journeyStore.updateJourney(() => ({ ...journeyLogic.initialJourney(), resources: ['ficha-mitos'] }))
  resetNoveltyUi({ seenUnlockIds: ['badge:I1'] })
  const menu = immersivePlayerHarness('src/features/adventure/components/overlays/NoveltiesMenu', { '@/store/adventureStore': { useAdventure: () => ({ ...store.useAdventure(), lumiRegistrations: [] }) } })
  let tree = menu.draw({})
  assert.equal(menu.text(menu.find(tree, element => element.props.className === 'sx-novelties-count')), '1')
  assert.match(menu.text(tree), /Nueva ficha disponible/)
  assert.match(menu.text(tree), /Se ha desbloqueado «Ficha: Mitos y realidades del futuro profesional»/)
  assert.doesNotMatch(menu.text(tree), /Nueva insignia disponible/)
  tree.props.onOpenChange(true); tree = menu.draw({}); tree.props.onOpenChange(false)
  assert.deepEqual(Array.from(noveltyUi.useStudentUi().seenUnlockIds), ['badge:I1'])
  const closeItem = menu.find(tree, element => typeof element.props.onSelect === 'function' && element.props.children?.props?.['aria-label'] === 'Cerrar novedades')
  closeItem.props.onSelect()
  assert.deepEqual(Array.from(noveltyUi.useStudentUi().seenUnlockIds), ['badge:I1'])
  resetNoveltyUi(); tree = menu.draw({})
  const item = menu.find(tree, element => element.props.children?.props?.className === 'sx-novelty' && element.props.children.props.to === '/student/resources')
  item.props.onSelect()
  assert.deepEqual(Array.from(noveltyUi.useStudentUi().seenUnlockIds), ['ficha:ficha-mitos'])
  tree = menu.draw({})
  assert.equal(menu.text(menu.find(tree, element => element.props.className === 'sx-novelties-count')), '1')
  assert.doesNotMatch(menu.text(tree), /Nueva ficha disponible/)
  const badge = menu.find(tree, element => element.props.children?.props?.className === 'sx-novelty')
  assert.equal(badge.props.children.props.to, '/student/profile?section=passport')
  badge.props.onSelect(); tree = menu.draw({})
  assert.match(menu.text(tree), /No tienes novedades pendientes/)
  assert.equal(menu.find(tree, element => element.props.className === 'sx-novelties-count'), undefined)
  menu.dispose()
  store.updateAdventure(() => store.createInitialAdventure()); journeyStore.updateJourney(() => journeyLogic.initialJourney()); resetNoveltyUi({ initialized: false })
  const empty = immersivePlayerHarness('src/features/adventure/components/overlays/NoveltiesMenu')
  tree = empty.draw({}); assert.match(empty.text(tree), /No tienes novedades pendientes/)
  empty.dispose(); noveltyUi.updateStudentUi(() => noveltyUi.initialStudentUiState())
})

test('bell appears in both maps and module headers but is absent inside the player', () => {
  for (const route of ['/student/missions', '/student/exploration', '/student/journal', '/student/resources', '/student/conversations']) assert.match(render(route), /aria-label="Novedades"/)
  journeyStore.updateJourney(() => journeyLogic.initialJourney())
  assert.doesNotMatch(render('/student/missions?actividad=mission-welcome'), /aria-label="Novedades"|Nueva insignia/)
})

test('badge queue waits behind arrival, introduction, check-in and manual help, and pauses during activities', () => {
  const adventure = { ...store.createInitialAdventure(), completedMissionIds: ['welcome', 'story', 'future', 'beliefs'] }
  const { getNextOverlay } = load(path.resolve('src/features/adventure/context/overlayContext.ts'))
  resetNoveltyUi()
  let ui = noveltyUi.useStudentUi()
  assert.equal(noveltyLogic.getNextBadge(adventure, ui, true, false), undefined)
  assert.equal(noveltyLogic.getNextBadge(adventure, ui, false, true), undefined)
  assert.equal(noveltyLogic.getNextBadge(adventure, ui, false, false).code, 'I1')
  ui = noveltyLogic.markBadgeAnnounced(ui, 'I1')
  assert.equal(noveltyLogic.getNextBadge(adventure, ui, false, false).code, 'I2')
  ui = noveltyLogic.markBadgeAnnounced(ui, 'I2')
  assert.equal(noveltyLogic.getNextBadge(adventure, ui, false, false), undefined)
  assert.equal(noveltyLogic.markBadgeAnnounced(ui, 'I2'), ui)
  for (const [patch, kind] of [[{ introsSeen: {} }, 'intro'], [{ checkInPromptDismissedOn: undefined }, 'check-in']]) {
    const current = { ...ui, ...patch }
    const overlay = getNextOverlay({ adventure, ui: current, view: 'missions', activityOpen: false })
    assert.equal(overlay.kind, kind)
    assert.equal(noveltyLogic.getNextBadge(adventure, current, false, !!overlay), undefined)
  }
  const arrivalAdventure = { ...adventure, completedMissionIds: noveltyData.fieldMissions.map(mission => mission.id) }
  const current = { ...ui, cityArrivalSeen: false }
  assert.equal(getNextOverlay({ adventure: arrivalAdventure, ui: current, view: 'missions', activityOpen: false }).kind, 'arrival')
  assert.equal(noveltyLogic.getNextBadge(arrivalAdventure, current, false, true), undefined)
  noveltyUi.updateStudentUi(() => noveltyUi.initialStudentUiState())
})

test('badge toast expires after seven seconds without reset on rerenders and cancels its timer when paused', async () => {
  const badge = noveltyLogic.getEarnedBadges({ ...store.createInitialAdventure(), completedMissionIds: ['welcome'] })[0]
  const clock = followUpClock(), toast = immersivePlayerHarness('src/features/adventure/components/overlays/BadgeToast')
  let dismissed = 0
  try {
    const tree = toast.draw({ badge, onDismiss: () => dismissed++ })
    assert.equal(tree.props.role, 'status'); assert.equal(tree.props['aria-live'], 'polite')
    assert.ok(toast.text(tree).includes('Nueva insignia')); assert.ok(toast.text(tree).includes(badge.title)); assert.ok(toast.text(tree).includes(badge.message))
    assert.equal(toast.find(tree, element => element.props.to).props.to, '/student/profile?section=passport')
    assert.ok(toast.find(tree, element => element.props['aria-label'] === 'Cerrar aviso'))
    await clock.tick(6999); assert.equal(dismissed, 0)
    toast.draw({ badge, onDismiss: () => dismissed++ }); await clock.tick(1); assert.equal(dismissed, 1)
    assert.equal(clock.pending, 0); toast.dispose()
    const interrupted = immersivePlayerHarness('src/features/adventure/components/overlays/BadgeToast')
    interrupted.draw({ badge, onDismiss: () => dismissed++ }); await clock.tick(3000); interrupted.dispose(); await clock.tick(4000)
    assert.equal(dismissed, 1); assert.equal(clock.pending, 0)
  } finally { toast.dispose(); clock.restore() }
})

test('overlay queue resumes earned badges after the player and presents them consecutively without duplication', async () => {
  store.updateAdventure(() => ({ ...store.createInitialAdventure(), completedMissionIds: ['welcome', 'story', 'future', 'beliefs'] }))
  resetNoveltyUi()
  const checkIn = load(path.resolve('src/features/adventure/lib/checkIn.ts'))
  const queue = immersivePlayerHarness('src/features/adventure/components/overlays/OverlayQueue', {
    'react-router': { ...nativeRequire('react-router'), useNavigate: () => () => {} },
    '@/features/adventure/lib/checkIn': { ...checkIn, useCheckInDay: () => checkIn.localDateKey(new Date()) },
  })
  const clock = followUpClock()
  const findBadge = tree => queue.find(tree, element => element.type.name === 'BadgeToast')
  const props = { view: 'missions', activityOpen: true, children: null }
  try {
    let tree = queue.draw(props); assert.equal(findBadge(tree), undefined)
    tree = queue.draw({ ...props, activityOpen: false }); assert.equal(findBadge(tree).props.badge.code, 'I1')
    const first = immersivePlayerHarness('src/features/adventure/components/overlays/BadgeToast')
    first.draw(findBadge(tree).props); await clock.tick(7000); first.dispose()
    tree = queue.draw({ ...props, activityOpen: false }); assert.equal(findBadge(tree).props.badge.code, 'I2')
    findBadge(tree).props.onDismiss()
    tree = queue.draw({ ...props, activityOpen: false }); assert.equal(findBadge(tree), undefined)
    assert.deepEqual(Array.from(noveltyUi.useStudentUi().announcedBadgeCodes), ['I1', 'I2'])
    resetNoveltyUi({ introsSeen: {} }); tree = queue.draw({ ...props, activityOpen: false }); assert.equal(findBadge(tree), undefined)
  } finally { queue.dispose(); clock.restore(); store.updateAdventure(() => store.createInitialAdventure()); noveltyUi.updateStudentUi(() => noveltyUi.initialStudentUiState()) }
})

test('student shell synchronizes v2 milestones into real levels and access without altering saved answers or private records', () => {
  const { specActivityByMission } = loadMapPoints(load)
  const fixture = followUpFixture()
  const saved = { ...journeyStore.useJourney(), drafts: { [fixture.key]: 'Borrador anterior conservado' } }
  const initial = store.createInitialAdventure()
  store.updateAdventure(() => ({ ...initial, journal: [{ ...initial.journal[0], id: 'private-entry', body: 'Texto privado conservado' }], readinessCheckIns: [{ id: 'saved-signal', value: 6, createdAt: new Date().toISOString(), linkedActivityId: 'daily-check-in' }] }))
  const privateBefore = JSON.stringify([store.useAdventure().journal, store.useAdventure().readinessCheckIns, store.useAdventure().conversations])
  resetNoveltyUi()
  const shell = immersivePlayerHarness('src/pages/student/StudentShell', {
    'react-router': { ...nativeRequire('react-router'), useLocation: () => ({ pathname: '/student/missions', search: '' }) },
    '@/context/occupationExplorationContext': { useOccupationExplorationContext: () => ({}) },
  })
  try {
    for (const [count, level, codes] of [[1, 1, ['I1']], [3, 1, ['I1']], [4, 2, ['I1', 'I2']], [fieldMissions.length, 3, ['I1', 'I2', 'I3']]]) {
      const completed = fieldMissions.slice(0, count)
      journeyStore.updateJourney(() => ({ ...saved, progress: Object.fromEntries(completed.map(mission => [specActivityByMission[mission.id], { estado: 'completada' }])) }))
      const journeyBefore = JSON.stringify(journeyStore.useJourney())
      shell.draw({}); shell.draw({})
      const adventure = store.useAdventure()
      assert.deepEqual(Array.from(adventure.completedMissionIds), Array.from(completed, mission => mission.id))
      assert.equal(store.getTravelerLevel(adventure).number, level)
      assert.deepEqual(Array.from(noveltyLogic.getEarnedBadges(adventure).map(badge => badge.code)), codes)
      assert.equal(store.isCityUnlocked(adventure), count === fieldMissions.length)
      assert.equal(store.isFamilyUnlocked(adventure), count === fieldMissions.length)
      assert.equal(JSON.stringify(journeyStore.useJourney()), journeyBefore)
      assert.equal(JSON.stringify([adventure.journal, adventure.readinessCheckIns, adventure.conversations]), privateBefore)
      assert.equal(journeyStore.useJourney().submissions[0].id, fixture.entry.id)
      const synced = JSON.stringify(adventure)
      shell.draw({}); assert.equal(JSON.stringify(store.useAdventure()), synced)
    }
  } finally {
    shell.dispose(); store.updateAdventure(() => store.createInitialAdventure()); journeyStore.updateJourney(() => journeyLogic.initialJourney()); followUpStore.updateFollowUps(() => followUpStore.initialFollowUpState()); noveltyUi.updateStudentUi(() => noveltyUi.initialStudentUiState())
  }
})

test('dialogue Enter completes text before advancing and never intercepts forms, controls or open dialogs', () => {
  const previous = { window: context.window, document: context.document, HTMLElement: context.HTMLElement }
  const listeners = new Set()
  let modal = false, done = false, completed = 0, advanced = 0
  class Target { constructor(blocked = false) { this.blocked = blocked } closest() { return this.blocked } }
  context.HTMLElement = Target
  context.document = { querySelector: () => modal }
  context.window = { addEventListener: (_, listener) => listeners.add(listener), removeEventListener: (_, listener) => listeners.delete(listener) }
  const dialogue = immersivePlayerHarness('src/features/activities/components/DialogueBox', {
    '@/hooks/useTypewriter': { useTypewriter: text => ({ visible: done ? text : '', done, complete: () => { done = true; completed++ } }) },
  })
  const props = { speakerId: 'companero', text: 'Texto completo accesible', onContinue: () => advanced++ }
  const enter = (patch = {}) => {
    let prevented = false
    const event = { key: 'Enter', target: new Target(), preventDefault() { prevented = true }, ...patch }
    for (const listener of listeners) listener(event)
    return prevented
  }
  try {
    const tree = dialogue.draw(props)
    assert.match(dialogue.text(tree), /Texto completo accesible/)
    assert.equal(enter(), true); assert.equal(completed, 1); assert.equal(advanced, 0)
    dialogue.draw(props)
    assert.equal(enter({ target: new Target(true) }), false)
    assert.equal(enter({ repeat: true }), false)
    assert.equal(enter({ defaultPrevented: true }), false)
    modal = true; assert.equal(enter(), false); assert.equal(advanced, 0)
    modal = false; assert.equal(enter(), true); assert.equal(advanced, 1)
  } finally { dialogue.dispose(); assert.equal(listeners.size, 0); Object.assign(context, previous) }
})

test('reduced-motion zone changes commit the destination immediately without scheduling a transition', () => {
  const previous = context.window
  const clock = followUpClock()
  context.window = { matchMedia: () => ({ matches: true }) }
  resetNoveltyUi({ lastMap: 'missions' })
  const transition = immersivePlayerHarness('src/features/adventure/components/ZoneTransition')
  try {
    transition.draw({ zone: 'central' })
    assert.equal(noveltyUi.useStudentUi().lastMap, 'central')
    assert.equal(clock.pending, 0)
    assert.equal(transition.draw({ zone: 'central' }), null)
    assert.equal(clock.pending, 0)
  } finally { transition.dispose(); clock.restore(); context.window = previous; noveltyUi.updateStudentUi(() => noveltyUi.initialStudentUiState()) }
})

test('every supplied mission node renders, including matrices, slides, questions and instrument items', () => {
  for (const activity of journeyContent.activities.filter(activity => activity.audiencia !== 'apoderado')) {
    for (const node of activity.nodos) {
      journeyStore.updateJourney(() => ({
        ...journeyLogic.initialJourney(),
        attempts: activity.nodos.slice(0, activity.nodos.indexOf(node)).filter(entry => entry.tipo === 'pregunta').map(entry => ({ actividadId: activity.id, nodoId: entry.id, correcta: true })),
        progress: {
          'act-06': { estudianteId: 'est-prototipo', actividadId: 'act-06', estado: 'completada' },
          [activity.id]: {
            estudianteId: 'est-prototipo',
            actividadId: activity.id,
            estado: 'en_curso',
            nodoActualId: node.id,
          },
        },
      }))
      const { StudentActivityPlayer } = load(path.resolve('src/features/activities/components/StudentActivityPlayer.tsx'))
      const html = renderToStaticMarkup(React.createElement(MemoryRouter, {}, React.createElement(StudentActivityPlayer, { activity, onClose() {}, onNext() {} })))
      assert.ok(html.includes(activity.titulo), `${activity.id}/${node.id}`)
      assert.match(html, /aria-label="Salir de la misión"/)
      assert.match(html, /fixed inset-0 z-40/)
      assert.match(html, /sx-root sx-player location-/)
      assert.doesNotMatch(html, /\bpts\b|\bpuntos\b|type="file"|Volver atrás/)
      if (['item', 'pregunta', 'eleccion'].includes(node.tipo)) {
        const previous = activity.nodos[activity.nodos.indexOf(node) - 1]
        const prompt = node.tipo === 'item'
          ? journeyContent.catalog.instrumentos.find(instrument => instrument.id === node.instrumentoId)?.items.find(item => item.id === node.itemId)?.texto
          : node.tipo === 'pregunta' ? node.enunciado
          : node.enunciado ?? (previous?.tipo === 'dialogo' ? previous.texto : '¿Qué le dirías?')
        assert.ok(prompt, `${activity.id}/${node.id}: missing response prompt`)
        const heading = renderToStaticMarkup(React.createElement('h2', {}, prompt))
        const headingIndex = html.indexOf(heading)
        assert.ok(headingIndex >= 0 && headingIndex < html.indexOf('sx-player-options'), `${activity.id}/${node.id}: prompt must precede response options`)
        assert.match(html, node.tipo === 'pregunta' && node.formato === 'opcion_multiple' ? /Marca todas las que correspondan\./ : /Selecciona una respuesta\./)
      }
      if (node.tipo === 'item') assert.match(html, /No hay respuestas correctas o incorrectas/)
      if (node.tipo === 'diapositiva') assert.match(html, /Entendido/)
      if (node.tipo === 'consigna' && activity.plantilla?.tipo === 'matriz') {
        assert.match(html, /1 año después del colegio/)
        assert.match(html, /Quién quiero ser/)
        assert.match(html, /0 de 7 entregas necesarias guardadas/)
      }
    }
  }
  journeyStore.updateJourney(() => journeyLogic.initialJourney())
})

test('direct instrument route starts on the official first item and omits Mara dialogue', () => {
  const html = render('/student/exploration?actividad=act-tip-01&modo=directa')
  assert.match(html, /Aceptarías trabajar escribiendo artículos/)
  assert.match(html, /Selecciona una respuesta\./)
  assert.doesNotMatch(html, /Soy Mara/)
  assert.doesNotMatch(html, /¿Qué le dirías/)
})

test('journal links open a prompted activity entry directly', () => {
  const html = render(
    '/student/journal?activity=act-06&title=Mi+mapa+de+ruta&prompt=%C2%BFQu%C3%A9+cambi%C3%B3%3F',
  )
  assert.match(html, /¿Qué cambió\?/)
  assert.match(html, /Texto privado de la entrada/)
})

test('saved resources and counselor submissions appear in their respective destinations', () => {
  journeyStore.updateJourney(() => ({
    ...journeyLogic.initialJourney(),
    resources: ['ficha-mitos'],
    progress: { 'enc-mitos': { estado: 'completada' } },
    submissions: [
      {
        id: 'submission-1',
        estudianteId: 'est-prototipo',
        actividadId: 'enc-mitos',
        nodoId: 'e22',
        contenido: { tipo: 'texto', texto: 'Consejo de ejemplo compartido con orientación.' },
        version: 1,
        enviadoEn: '2026-09-26T12:00:00Z',
      },
    ],
  }))
  const resources = render('/student/resources')
  assert.match(resources, /Ficha: Mitos y realidades del futuro profesional/)
  assert.match(resources, /Abrir ficha/)
  assert.match(resources, /Guardar en favoritos/)
  assert.doesNotMatch(resources, /No visto|Visto/)
  assert.match(render('/counselor/reviews'), /Registros observados/)
  assert.doesNotMatch(render('/parent/activities'), /Consejo de ejemplo compartido con orientación/)
  journeyStore.updateJourney(() => journeyLogic.initialJourney())
})


test('live priority configuration updates table, header, summary and profile filters consistently', () => {
  const { prioritySettingsStore, configuredCatalog, initialPrioritySettings } = load(path.resolve('src/features/counselor/store/prioritySettings.ts'))
  const { studentProfiles } = load(path.resolve('src/data/demo/studentProfiles.ts'))
  const { priorityProgress } = load(path.resolve('src/features/student-tracking/lib/selectors.ts'))
  const { projectStudents } = load(path.resolve('src/features/counselor/data/exampleStudents.ts'))
  const defaults = initialPrioritySettings()
  try {
    defaults.questionnaireIds.forEach(id => prioritySettingsStore.dispatch({ type: 'questionnaire', id, checked: id === 'entry' }))
    prioritySettingsStore.dispatch({ type: 'all-records', checked: false })
    const catalog = configuredCatalog(prioritySettingsStore.getSnapshot())
    const student = studentProfiles[5]
    const expected = priorityProgress(student, catalog.activities, catalog.questionnaires)
    assert.equal(expected.percent, 50)
    assert.equal(projectStudents(catalog.activities, catalog.questionnaires).find(s => s.id === student.id).avance, expected.percent)
    assert.match(render('/counselor/students?q=Fabio'), /aria-valuenow="50"/)
    const profile = render('/counselor/students/ejemplo-06')
    assert.ok(profile.includes('aria-label="Avance en lo prioritario"'))
    assert.match(profile, /aria-valuenow="50"/)
    assert.doesNotMatch(profile, /Ver resultado<\/a>.*Test de intereses/)
    const questionnaires = render('/counselor/students/ejemplo-06?section=questionnaires')
    assert.match(questionnaires, /Prioritarios.*1/)
    assert.doesNotMatch(questionnaires, /Test de intereses/)
    const records = render('/counselor/students/ejemplo-06?section=records')
    assert.match(records, /Aún no marcas actividades de registro como prioritarias/)
  } finally {
    defaults.questionnaireIds.forEach(id => prioritySettingsStore.dispatch({ type: 'questionnaire', id, checked: true }))
    prioritySettingsStore.dispatch({ type: 'all-records', checked: true })
  }
})

test('Prioritarios starts read-only and shows one list through the tools and records toggle', () => {
  const markup = render('/counselor/priorities')
  assert.match(markup, /role="tablist"/)
  assert.match(markup, /Herramientas/)
  assert.match(markup, /Actividades de registro/)
  assert.doesNotMatch(markup, /id="records-heading"/)
  assert.match(markup, />Editar</)
  assert.match(markup, /role="checkbox"[^>]*disabled=""/)
  assert.match(markup, /Esta configuración aplica a todos tus salones/)
  assert.match(markup, /aria-label="Prioritario: Test de intereses"/)
  assert.match(markup, /aria-label="Visible para el apoderado: Test de intereses"/)
  assert.doesNotMatch(markup, /aria-label="Visible para el apoderado: (Cuestionario de entrada|Autopercepción)"/)
  assert.match(markup, /No se comparte/)
  assert.doesNotMatch(markup, /Guardar cambios|id="records-heading"/)
  assert.match(markup, /filtro Prioritarios del perfil del estudiante para facilitar la revisión/)
})

test('family results require assigned route completion and honor sharing independently of priorities', () => {
  const { prioritySettingsStore } = load(path.resolve('src/features/counselor/store/prioritySettings.ts'))
  const completed = { parentJourney: completedParentJourney() }
  const route = '/parent/children/ejemplo-07/questionnaires/interests'
  const saved = prioritySettingsStore.getSnapshot()
  assert.match(render('/parent/overview'), /Podrás ver los resultados de Gabriela/)
  assert.match(render(route), /Completa tus actividades/)
  assert.doesNotMatch(render(route), /Código de interés|Ocupaciones afines/)
  assert.match(render(route,completed), /Código de interés|Ocupaciones afines/)
  try {
    prioritySettingsStore.dispatch({type:'questionnaire',id:'interests',checked:false})
    assert.match(render(route,completed), /Código de interés/)
    prioritySettingsStore.dispatch({type:'sharing',id:'interests',checked:false})
    assert.match(render(route,completed), /Resultado no disponible/)
    assert.doesNotMatch(render('/parent/overview',completed), />Test de intereses</)
    for (const id of ['social','intelligences']) prioritySettingsStore.dispatch({type:'sharing',id,checked:false})
    assert.match(render('/parent/overview',completed), /Por ahora no hay resultados compartidos con las familias/)
  } finally { prioritySettingsStore.dispatch({type:'replace',settings:saved}) }
})

test('family home unites own route and shared child summary with no private student fields', () => {
  const { parentChildren } = load(path.resolve('src/features/parent/data/parentPortal.ts'))
  const html = render('/parent/overview',{parentJourney: completedParentJourney()})
  assert.equal(parentChildren.length,1)
  assert.equal(parentChildren[0].id,'ejemplo-07')
  assert.match(html,/Hola, José|Hola, Jos/)
  assert.match(html,/Conozco mi rol|Completaste tu ruta/)
  assert.match(html,/Repasar mis actividades|Seguir con las conversaciones/)
  assert.match(html,/Gabriela García Muñoz|Avance de su recorrido|Resultados de sus cuestionarios/)
  assert.doesNotMatch(html,/Último avance|Hitos del proceso|Intereses destacados|Próximo hito|Conversación sugerida|Último acceso|Avance prioritario|Seguridad y diario|role="tab"/)
})

test('family detail reuses complete results but never reveals favorites or plans', () => {
  const complete = {parentJourney: completedParentJourney()}
  const interests = render('/parent/children/ejemplo-07/questionnaires/interests',complete)
  for (const title of ['Qué mide este cuestionario','Cómo leer este resultado','Resultado por dimensión','Qué significa cada dimensión','Ocupaciones afines','Carreras que llevan a estas ocupaciones','Cómo tomar estas recomendaciones']) assert.ok(interests.includes(title),title)
  assert.doesNotMatch(interests,/Favorita|En sus planes|Relacionada con sus planes|No ha marcado|Volver al perfil/)
  assert.match(interests,/parent\/overview\?child=ejemplo-07/)
  for (const id of ['entry','perception','unknown']) assert.match(render(`/parent/children/ejemplo-07/questionnaires/${id}`,complete),/Resultado no disponible/)
  assert.match(render('/parent/children/ejemplo-06/questionnaires/interests',complete),/Resultado no disponible/)
  for (const id of ['social','intelligences']) assert.match(render(`/parent/children/ejemplo-07/questionnaires/${id}`,complete),/Dimensi[oó]n destacada|Dimensiones destacadas/)
})


test('publications expose direct interview routes, reports and read-only reactions', () => {
  const report = { id: 'report-1', postId: 'demo-industrial-design', reason: 'Información sensible', body: 'Revisar el contenido del video.', status: 'pending', createdAt: '2026-10-03T12:00:00Z' }
  const patch = { reports: [report], reactions: [{ videoId: 'demo-industrial-design', kind: 'Muy completa', createdAt: report.createdAt }] }
  const list = render('/counselor/publications?salon=4b', patch)
  assert.match(list, /Reportado/)
  assert.match(list, /publications\/interviews\/i1\?salon=4b/)
  assert.doesNotMatch(list, /Quitar destaque|Nueva publicación|Consentimiento confirmado/)
  const detail = render('/counselor/publications/interviews/i1?salon=4b', patch)
  for (const text of ['Reacciones de estudiantes', 'Comentarios', 'Brisa', 'Reportes recibidos', 'Información sensible', 'Revisar el contenido', 'Más acciones de la entrevista', 'Quitar destaque']) assert.ok(detail.includes(text), text)
  assert.match(detail, /Entrevista destacada/)
  assert.doesNotMatch(detail, /Consentimiento confirmado|Publicar comentario|Reacciona como|>Ocultar entrevista</)
  const hidden = render('/counselor/publications/interviews/i1', { ...patch, interviewModeration: { 'demo-industrial-design': { hidden: true, featured: false } } })
  assert.match(hidden, /Entrevista ocultada/)
  assert.doesNotMatch(hidden, /Quitar destaque/)
  assert.match(render('/counselor/publications/interviews/unknown'), /Entrevista no encontrada/)
  assert.match(render('/counselor/publications/interviews/demo-industrial-design'), /Reacciones de estudiantes/)
  assert.match(render('/counselor/publications/interviews/i3'), /Aún no hay reacciones/)
  assert.match(render('/counselor/publications?salon=unknown'), /Todos los salones/)
})

test('moderation hides interviews in student investigations while retaining visible interviews', () => {
  const solved = { solvedCaseIds: ['forest-fire'] }
  const visible = render('/student/research', solved)
  assert.match(visible, /Objetos que hacen más fácil la vida diaria/)
  assert.match(visible, /Así se investiga la calidad del agua/)
  for (const route of ['/student/research', '/student/investigations']) {
    const markup = render(route, {
      ...solved,
      interviewModeration: { 'demo-industrial-design': { hidden: true, featured: false } },
    })
    assert.doesNotMatch(markup, /Objetos que hacen más fácil la vida diaria/)
    assert.match(markup, /Así se investiga la calidad del agua/)
    assert.match(markup, /Ver la entrevista/)
  }
})


test('classroom dashboard aggregates current profiles without student names or private content', () => {
  const { studentProfiles } = load(path.resolve('src/data/demo/studentProfiles.ts'))
  const html = render('/counselor/home?salon=5.%C2%B0%20A')
  const interests = render('/counselor/home?salon=5.%C2%B0%20A&section=interests')
  const headings = ['Alertas','Cuestionarios','Actividades de registro','Seguridad y diario']
  let previous = -1
  for (const title of headings) { const index = html.indexOf(`>${title}</h2>`); assert.ok(index > previous,title); previous = index }
  for (const title of ['Carreras de interés','Instituciones de interés']) {
    assert.ok(interests.includes(`>${title}</h2>`), title)
    assert.ok(!html.includes(`>${title}</h2>`), title)
  }
  for (const title of headings) assert.ok(!interests.includes(`>${title}</h2>`), title)
  assert.match(html,/Ver estudiantes del salón/)
  assert.match(html,/salon=5.%C2%B0\+A/)
  assert.match(interests,/salon=5.%C2%B0\+A/)
  assert.match(interests,/>12 estudiantes</)
  assert.match(html,/alertas=with/)
  assert.match(html,/>12 estudiantes</)
  assert.equal((html.match(/<h2/g) ?? []).length, 8)
  assert.equal((interests.match(/<h2/g) ?? []).length, 6)
  assert.equal((html.match(/role="tab"/g) ?? []).length, 2)
  assert.match(html,/aria-selected="true"[^>]*>Seguimiento</)
  assert.match(interests,/aria-selected="true"[^>]*>Intereses vocacionales</)
  assert.match(render('/counselor/home?section=unknown'),/aria-selected="true"[^>]*>Seguimiento</)
  assert.doesNotMatch(html,/Mostrar cuestionarios|Mostrar actividades de registro|Sobre 12 estudiantes/)
  assert.doesNotMatch(html,/Autopercepción de la cohorte|En observación|Activos \(7 días\)/)
  for (const student of studentProfiles) {
    assert.ok(!html.includes(`${student.nombres} ${student.apellidos}`))
    assert.ok(!interests.includes(`${student.nombres} ${student.apellidos}`))
  }
  assert.match(html,/de 10/)
  assert.match(html,/Guiadas/)
  assert.match(html,/Pregunta del día/)
  assert.match(html,/El contenido del diario es privado/)
  assert.match(render('/counselor/students/ejemplo-06?section=security'),/Entradas registradas/)
})


test('classroom makes an empty priority configuration explicit without claiming completion', () => {
  const { prioritySettingsStore } = load(path.resolve('src/features/counselor/store/prioritySettings.ts'))
  const saved = prioritySettingsStore.getSnapshot()
  try {
    prioritySettingsStore.dispatch({ type: 'replace', settings: { ...saved, questionnaireIds: [], recordIds: [] } })
    const html = render('/counselor/home?salon=5.%C2%B0%20A')
    assert.match(html, /Sin cuestionarios prioritarios configurados/)
    assert.match(html, /Sin actividades de registro prioritarias configuradas/)
    assert.match(html, /Configurar prioritarios/)
    assert.doesNotMatch(html, />Test de intereses<|>Mi FODA<|>12 de 12</)
  } finally {
    prioritySettingsStore.dispatch({ type: 'replace', settings: saved })
  }
})


test('family presentation adapts flat profiles without generating a code or exposing choices', () => {
  const { QuestionnaireBars } = load(path.resolve('src/features/student-tracking/components/QuestionnaireBars.tsx'))
  const { questionnaires, studentProfiles } = load(path.resolve('src/data/demo/studentProfiles.ts'))
  const student = studentProfiles.find(s=>s.id === 'ejemplo-06')
  const application = student.questionnaires.find(q=>q.questionnaireId === 'interests')
  const definition = questionnaires.find(q=>q.id === 'interests')
  const html = renderToStaticMarkup(React.createElement(QuestionnaireBars,{definition,result:application.result,audience:'parent',childName:student.nombres}))
  assert.match(html,/Sus respuestas fueron muy parejas entre áreas|conversar con Fabio/)
  assert.doesNotMatch(html,/Código de interés|Favorita|En sus planes/)
})

test('family child selection replaces the entire summary and pending results stay private', () => {
  const { parentChildren } = load(path.resolve('src/features/parent/data/parentPortal.ts'))
  parentChildren.push({id:'ejemplo-05',name:'Elena Espinoza León',initials:'EE',grade:'5.° de secundaria · A',school:'Colegio Nuevo Horizonte',progress:0})
  try {
    const html=render('/parent/overview?child=ejemplo-05',{parentJourney: completedParentJourney()})
    assert.match(html,/role="tab"/)
    assert.match(html,/>Elena Espinoza León<|Aún no lo completa/)
    assert.doesNotMatch(html,/>Gabriela García Muñoz<|Ver resultado completo|Código de interés/)
  } finally { parentChildren.pop() }
})

test('phase 8 path sequence respects completion records within the current demo scope', () => {
  const logic = loadMapPoints(load)
  const originalIds = fieldMissions.map(mission => mission.id)
  const adventure = store.createInitialAdventure(), journey = journeyLogic.initialJourney()
  let points = logic.getCaminoPoints(adventure, journey)
  assert.deepEqual(Array.from(points.slice(0, 4), point => point.id), ['welcome', 'beliefs', 'pregones', 'story'])
  points.slice(0, 4).forEach((point, index) => {
    assert.equal(point.x, fieldMissions[index].x); assert.equal(point.y, fieldMissions[index].y)
  })
  assert.equal(points[0].status, 'available')
  assert.ok(points.slice(1, -1).every(point => point.status === 'locked'))
  assert.equal(logic.getNextCaminoActivity(points).id, 'mission-welcome')
  adventure.completedMissionIds = ['welcome', 'future']
  points = logic.getCaminoPoints(adventure, journey)
  assert.equal(points[0].status, 'completed')
  assert.equal(points[1].status, 'available')
  assert.equal(points.find(point => point.id === 'future').status, 'locked')
  assert.equal(logic.getNextCaminoActivity(points).id, 'enc-mitos')
  journey.progress['enc-mitos'] = { estado: 'completada' }
  points = logic.getCaminoPoints(adventure, journey)
  assert.equal(points[2].status, 'available')
  assert.equal(logic.getNextCaminoActivity(points).id, 'act-07')
  journey.progress['act-07'] = { estado: 'completada' }
  points = logic.getCaminoPoints(adventure, journey)
  assert.equal(logic.getNextCaminoActivity(points).id, 'mission-story')
  journey.progress['mission-story'] = { estado: 'completada' }
  points = logic.getCaminoPoints(adventure, journey)
  assert.equal(logic.getNextCaminoActivity(points), null)
  assert.equal(logic.getRecommendedPoint(points.map(point => point.id === 'city' ? { ...point, status: 'locked' } : point)), undefined)
  assert.ok(points.slice(4, -1).filter(point => point.id !== 'future').every(point => point.status === 'locked'))
  assert.equal(logic.getPointDetails(points.find(point => point.id === 'future'), adventure, journey).revision, false)
  assert.deepEqual(Array.from(fieldMissions, mission => mission.id), Array.from(originalIds))
  assert.equal(store.prototypeAllUnlocked, true)
  assert.equal(store.isCityUnlocked({ ...adventure, completedMissionIds: ['welcome', 'beliefs', 'pregones', 'story'] }), false)
  assert.equal(logic.getZoneProgress('missions', { ...adventure, completedMissionIds: ['welcome'] }, journey).value, 400 / fieldMissions.length)
})

test('phase 8 direct links open blocked details instead of starting unavailable players', () => {
  journeyStore.updateJourney(() => journeyLogic.initialJourney())
  for (const id of ['enc-mitos', 'mission-story', 'mission-future', 'act-06']) {
    const html = render('/student/missions?actividad=' + id)
    assert.match(html, /sx-map-viewport/)
    assert.doesNotMatch(html, /aria-label="Salir de la misión"/)
  }
  assert.match(render('/student/missions?actividad=mission-welcome'), /aria-label="Salir de la misión"/)
  assert.match(render('/student/missions?actividad=enc-mitos', { completedMissionIds: ['welcome'] }), /aria-label="Salir de la misión"/)
  assert.doesNotMatch(render('/student/missions?actividad=mission-future&revision=1', { completedMissionIds: ['future'] }), /aria-label="Salir de la misión"/)
  let params = new URLSearchParams('actividad=enc-mitos&revision=1')
  const guard = immersivePlayerHarness('src/pages/student/CaminoScreen', {
    'react-router': { useSearchParams: () => [params, next => { params = next }] },
  })
  store.updateAdventure(() => store.createInitialAdventure())
  const tree = guard.draw({})
  assert.equal(tree.props.zone, 'missions')
  assert.equal(params.get('punto'), 'beliefs')
  assert.equal(params.has('actividad'), false); assert.equal(params.has('revision'), false)
  params = new URLSearchParams('actividad=unknown')
  guard.draw({})
  assert.equal(params.toString(), '')
  guard.dispose()
})

test('phase 8 finish returns to the map with one map action at every point of the path', () => {
  const logic = loadMapPoints(load)
  const { FinishScreen } = load(path.resolve('src/features/activities/components/FinishScreen.tsx'))
  const adventure = store.createInitialAdventure(), journey = journeyLogic.initialJourney()
  for (const [completed, expected] of [[['welcome'], 'enc-mitos'], [['welcome', 'beliefs'], 'act-07'], [['welcome', 'beliefs', 'pregones'], 'mission-story'], [['welcome', 'beliefs', 'pregones', 'story'], undefined]]) {
    adventure.completedMissionIds = completed
    const next = logic.getNextCaminoActivity(logic.getCaminoPoints(adventure, journey))
    assert.equal(next?.id, expected)
    const html = renderToStaticMarkup(React.createElement(MemoryRouter, {}, React.createElement(FinishScreen, {
      activity: journeyContent.activityById('enc-mitos'), onClose() {},
    })))
    assert.doesNotMatch(html, /Revisar mis propias creencias|Seguir hacia/)
    assert.equal((html.match(/Volver al mapa<\/button>/g) ?? []).length, 1)
  }
  const player = immersivePlayerHarness('src/features/activities/components/StudentActivityPlayer')
  const activity = journeyContent.activityById('mission-welcome')
  journeyStore.updateJourney(() => ({ ...journeyLogic.initialJourney(), progress: { [activity.id]: { estado: 'completada', nodoActualId: '$fin' } } }))
  const onClose = () => {}
  const tree = player.draw({ activity, onClose })
  const finish = player.find(tree, element => element.type?.name === 'FinishScreen')
  assert.equal(finish.props.onClose, undefined)
  assert.equal(finish.props.yaCompletada, true)
  assert.equal(finish.props.onNext, undefined)
  assert.equal(finish.props.nextActivity, undefined)
  player.dispose(); journeyStore.updateJourney(() => journeyLogic.initialJourney())
})

test('phase 8 toggling the overlaid panel preserves a zoomed and panned map transform', () => {
  const previous = { ResizeObserver: context.ResizeObserver, setTimeout: context.setTimeout, clearTimeout: context.clearTimeout }
  context.ResizeObserver = class { observe() {} disconnect() {} }
  context.setTimeout = setTimeout; context.clearTimeout = clearTimeout
  const canvas = immersivePlayerHarness('src/features/adventure/components/MapCanvas')
  const ref = { current: null }
  const logic = loadMapPoints(load)
  const props = { ref, points: logic.getCaminoPoints(store.createInitialAdventure(), journeyLogic.initialJourney()), panelOpen: true, variant: 'route', onSelect() {}, onScaleChange() {}, backgroundImage: '', label: 'Mapa' }
  const mount = tree => { tree.props.ref.current = { getBoundingClientRect: () => ({ width: 1280, height: 752 }), addEventListener() {}, removeEventListener() {} } }
  const transform = tree => canvas.find(tree, element => element.props.className === 'sx-map-canvas').props.style.transform
  try {
    canvas.draw(props, mount)
    ref.current.setScale(.9)
    let tree = canvas.draw(props, mount)
    tree.props.onPointerDown({ button: 0, target: { closest: () => null }, pointerId: 1, clientX: 500, clientY: 400, currentTarget: { setPointerCapture() {} } })
    tree.props.onPointerMove({ pointerId: 1, clientX: 450, clientY: 350 })
    tree = canvas.draw(props, mount)
    const before = transform(tree)
    tree = canvas.draw({ ...props, panelOpen: false }, mount)
    assert.equal(transform(tree), before)
    tree = canvas.draw(props, mount)
    assert.equal(transform(tree), before)
    ref.current.focusPoint('story')
    tree = canvas.draw(props, mount)
    assert.notEqual(transform(tree), before)
    assert.match(transform(tree), /scale\(0.9\)/)
  } finally { canvas.dispose(); Object.assign(context, previous) }
})

test('phase 8 point links focus a known drawer and closing removes only its parameter', () => {
  const previousWindow = context.window
  context.window = { ...previousWindow, matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) }
  let params = new URLSearchParams('punto=beliefs&keep=1'), focused
  const layout = immersivePlayerHarness('src/features/adventure/components/MapScreenLayout', {
    'react-router': { useNavigate: () => () => {}, useSearchParams: () => [params, next => { params = typeof next === 'function' ? next(params) : next }] },
    '@/features/adventure/context/overlayContext': { useStudentOverlays: () => ({ openGuide() {}, openCheckIn() {} }) },
  })
  const adventure = store.createInitialAdventure(), journey = journeyLogic.initialJourney()
  const logic = loadMapPoints(load)
  const props = { zone: 'missions', adventure, journey, points: logic.getCaminoPoints(adventure, journey) }
  const mount = tree => {
    layout.find(tree, element => element.props.label === 'Aventura · Camino de misiones').props.ref.current = { focusPoint: id => { focused = id } }
  }
  try {
    let tree = layout.draw(props, mount)
    let drawer = layout.find(tree, element => element.type?.name === 'ActivityDrawer')
    assert.equal(drawer.props.point.id, 'beliefs'); assert.equal(drawer.props.details.disabled, true)
    assert.equal(focused, 'beliefs')
    drawer.props.onClose(); assert.equal(params.toString(), 'keep=1')
    params = new URLSearchParams('punto=unknown'); focused = undefined
    tree = layout.draw(props, mount); drawer = layout.find(tree, element => element.type?.name === 'ActivityDrawer')
    assert.equal(drawer.props.point, undefined); assert.equal(focused, undefined)
  } finally { layout.dispose(); context.window = previousWindow }
})

test('phase 8 map labels contain names only and use activity icons or a question mark', () => {
  const { MapNode } = load(path.resolve('src/features/adventure/components/MapNode.tsx'))
  const logic = loadMapPoints(load)
  const adventure = store.createInitialAdventure(), journey = journeyLogic.initialJourney()
  const points = [...logic.getCaminoPoints(adventure, journey), ...logic.getCiudadPoints(adventure, journey)]
  for (const [id, icon] of [['welcome', 'book-open'], ['beliefs', 'book-open'], ['story', 'feather'], ['compass', 'clipboard-list'], ['forest-fire', 'building-2'], ['city', 'key-round']]) {
    const point = points.find(point => point.id === id)
    const html = renderToStaticMarkup(React.createElement(MapNode, { point: { ...point, status: 'available' }, onSelect() {}, onFocus() {} }))
    assert.match(html, new RegExp('lucide-' + icon)); assert.ok(!html.includes(point.subtitle))
    const locked = renderToStaticMarkup(React.createElement(MapNode, { point: { ...point, status: 'locked' }, onSelect() {}, onFocus() {} }))
    assert.match(locked, /lucide-circle-question-mark/); assert.doesNotMatch(locked, /lucide-lock-keyhole/)
  }
  assert.equal(logic.getPointDetails(points.find(point => point.id === 'forest-fire'), adventure, journey).type, 'Central de casos')
  const header = render('/student/missions').match(/<header class="sx-map-header">([\s\S]*?)<\/header>/)[1]
  assert.match(header, /Orientación[\s\S]*Explora[\s\S]*Novedades[\s\S]*Menú de Alex/); assert.doesNotMatch(header, /Niv\.|sx-user-details/)
  assert.doesNotMatch(render('/student/missions'), /Arrastra el mapa para explorar/)
})

test('phase 8 available panel caps four pending implemented actions and links to the full list', () => {
  const { AdventurePanel } = load(path.resolve('src/features/adventure/components/AdventurePanel.tsx'))
  const points = Array.from({ length: 7 }, (_, index) => ({ id: 'p' + index, title: 'Disponible ' + index, subtitle: 'En progreso', status: 'available', actionEnabled: true }))
  points.push({ ...points[0], id: 'city' }, { ...points[0], id: 'done', status: 'completed' }, { ...points[0], id: 'blocked', status: 'locked' }, { ...points[0], id: 'not-implemented', actionEnabled: false })
  const html = renderToStaticMarkup(React.createElement(MemoryRouter, {}, React.createElement(AdventurePanel, {
    points, adventure: store.createInitialAdventure(), progress: { label: 'Progreso', value: 0 }, onSelect() {}, onCheckIn() {},
  })))
  assert.equal((html.match(/sx-available-dot/g) ?? []).length, 4)
  assert.match(html, /href="\/student\/activities"[^>]*>Ver más/)
  assert.doesNotMatch(html, /sx-panel-pagination|Disponible 4|Disponible 5|Disponible 6/)
})

test('phase 8 activities combine zones, classify publications and return to the matching map', () => {
  store.updateAdventure(() => ({ ...store.createInitialAdventure(), completedMissionIds: ['welcome'], solvedCaseIds: ['river-mystery'] }))
  journeyStore.updateJourney(() => ({ ...journeyLogic.initialJourney(), progress: { 'enc-mitos': { estado: 'en_curso' } } }))
  const view = immersivePlayerHarness('src/pages/student/StudentActivitiesView')
  let tree = view.draw({})
  let entries = view.find(tree, element => element.props.className === 'sx-activities-list').props.children
  assert.deepEqual(Array.from(entries, element => element.key), ['beliefs', 'forest-fire', 'mara-test'])
  assert.match(view.text(tree), /Camino · InformativaEn progreso/)
  assert.match(view.text(tree), /Ciudad · Central de casosDisponible/)
  const href = entries[0].props.children.at(-1).props.to
  assert.equal(href, '/student/missions?punto=beliefs')
  view.button(tree, 'Realizadas').props.onClick(); tree = view.draw({})
  entries = view.find(tree, element => element.props.className === 'sx-activities-list').props.children
  assert.deepEqual(Array.from(entries, element => element.key), ['welcome', 'river-mystery'])
  assert.equal(entries[1].props.children.at(-1).props.to, '/student/exploration?punto=river-mystery')
  store.updateAdventure(current => ({ ...current, videos: [{ id: 'publication' }] }))
  tree = view.draw({})
  entries = view.find(tree, element => element.props.className === 'sx-activities-list').props.children
  assert.ok(!entries.some(element => element.key === 'research'))
  view.dispose(); journeyStore.updateJourney(() => journeyLogic.initialJourney())
  const html = render('/student/activities')
  assert.match(html, /Mis actividades/); assert.match(html, /Actividades disponibles/)
  const { getStudentView } = load(path.resolve('src/lib/studentViews.ts'))
  assert.equal(getStudentView('/student/activities'), 'activities')
  const { guideSteps } = load(path.resolve('src/data/content/guideTexts.ts'))
  assert.match(guideSteps.activities[0], /Ver en el mapa/)
})

test('phase 8 palette is local to the student route marker and covers inherited portal themes', () => {
  const css = readFileSync(path.resolve('src/styles/student/student-base.css'), 'utf8')
  assert.match(css, /body:has\(\[data-student-experience\]\)/)
  assert.match(css, /body:has\(\[data-student-experience\]\) \.theme-student/)
  assert.match(css, /--primary: #2457b8;/)
  assert.match(css, /--sx-module-bg: var\(--background\)/)
  assert.match(css, /prefers-reduced-motion: reduce[\s\S]*?sx-node-circle::before[\s\S]*?animation: none/)
  assert.match(render('/student/activities'), /data-student-experience="true"/)
  assert.match(render('/student/cases/forest-fire'), /data-student-experience="true"/)
})


test('phase 8 every novelty kind retains its existing destination and unread two-line copy', () => {
  store.updateAdventure(() => ({ ...store.createInitialAdventure(), completedMissionIds: fieldMissions.map(mission => mission.id), solvedCaseIds: ['forest-fire'] }))
  journeyStore.updateJourney(() => ({ ...journeyLogic.initialJourney(), resources: ['ficha-mitos'] }))
  resetNoveltyUi()
  const menu = immersivePlayerHarness('src/features/adventure/components/overlays/NoveltiesMenu'), tree = menu.draw({})
  for (const [title, href] of [
    ['Nueva ficha disponible', '/student/resources'],
    ['Nueva insignia disponible', '/student/profile?section=passport'],
    ['Nuevo héroe disponible', '/student/testimonials'],
    ['Nueva ciudad disponible', '/student/exploration'],
    ['Nueva conversación familiar disponible', '/student/conversations'],
  ]) {
    const row = menu.find(tree, element => element.props.className === 'sx-novelty' && menu.text(element).includes(title))
    assert.ok(row, title); assert.equal(row.props.to, href)
    assert.match(menu.text(row), /Se ha desbloqueado «.+»/)
    assert.ok(menu.find(row, element => element.props.className === 'sx-novelty-dot'))
  }
  menu.dispose(); store.updateAdventure(() => store.createInitialAdventure())
  journeyStore.updateJourney(() => journeyLogic.initialJourney()); noveltyUi.updateStudentUi(() => noveltyUi.initialStudentUiState())
})

test('PNG maps fill their triple-sized worlds and cover the entire viewport at minimum zoom', () => {
  const geometry = load(path.resolve('src/features/adventure/lib/geometry.ts'))
  const { canvasSize, imageSize, initialScale, getMinimumScale, zoomTransform, clampTransform, mapPosition } = geometry
  assert.equal(canvasSize.width, 5016); assert.equal(canvasSize.height, 2823)
  assert.equal(initialScale, .5)
  for (const name of ['journey-map', 'city-map']) {
    const png = readFileSync(path.resolve(`public/images/adventure/${name}.png`))
    assert.equal(png.subarray(1, 4).toString(), 'PNG')
    assert.equal(png.readUInt32BE(16), imageSize.width)
    assert.equal(png.readUInt32BE(20), imageSize.height)
    const markup = render(name === 'journey-map' ? '/student/missions' : '/student/exploration')
    assert.match(markup, new RegExp(`src="/images/adventure/${name}\\.png"`))
    assert.match(markup, /width:5016px;height:2823px/)
    assert.match(markup, /scale\(0.5\)/)
  }
  for (const bounds of [{ width: 1280, height: 752 }, { width: 1440, height: 852 }, { width: 360, height: 752 }, { width: 1907, height: 865 }]) {
    const minimum = getMinimumScale(bounds)
    const fitted = zoomTransform({ x: -999, y: -700, scale: .5 }, 0, { x: 0, y: bounds.height }, bounds)
    assert.equal(fitted.scale, minimum)
    const width = canvasSize.width * minimum, height = canvasSize.height * minimum
    assert.ok(width >= bounds.width - 1e-8); assert.ok(height >= bounds.height - 1e-8)
    assert.ok(Math.abs(width - bounds.width) < 1e-8 || Math.abs(height - bounds.height) < 1e-8)
    for (const x of [-9999, 9999]) for (const y of [-9999, 9999]) {
      const dragged = clampTransform({ ...fitted, x, y }, bounds)
      assert.ok(dragged.x <= 1e-8); assert.ok(dragged.y <= 1e-8)
      assert.ok(dragged.x + width >= bounds.width - 1e-8)
      assert.ok(dragged.y + height >= bounds.height - 1e-8)
      assert.ok(Math.abs(dragged.x - (x < 0 ? bounds.width - width : 0)) < 1e-8)
      assert.ok(Math.abs(dragged.y - (y < 0 ? bounds.height - height : 0)) < 1e-8)
    }
  }
  const customSize = { width: 6000, height: 3000 }
  const position = mapPosition({ x: 540, y: 330 }, customSize)
  assert.equal(position.x, 3000); assert.equal(position.y, 1500)
  assert.equal(getMinimumScale({ width: 1000, height: 600 }, customSize), .2)
})

test('phase 10 focusing boundary points never reveals background beside the overlaid panel', () => {
  const { focusTransform, canvasSize, getMinimumScale } = load(path.resolve('src/features/adventure/lib/geometry.ts'))
  for (const bounds of [{ width: 1280, height: 752 }, { width: 360, height: 752 }, { width: 1907, height: 865 }]) {
    for (const scale of [getMinimumScale(bounds), .5, 1.4]) {
      for (const panelOpen of [false, true]) {
        for (const point of [{ x: 0, y: 0 }, { x: 1080, y: 660 }]) {
          const focused = focusTransform({ x: -100, y: -100, scale }, point, bounds, panelOpen)
          assert.ok(focused.x <= 1e-8); assert.ok(focused.y <= 1e-8)
          assert.ok(focused.x + canvasSize.width * focused.scale >= bounds.width - 1e-8)
          assert.ok(focused.y + canvasSize.height * focused.scale >= bounds.height - 1e-8)
        }
      }
    }
  }
})

test('phase 9 initial view is centered at 50 percent and panel toggles preserve even the fitted view', () => {
  const previous = { ResizeObserver: context.ResizeObserver, setTimeout: context.setTimeout, clearTimeout: context.clearTimeout }
  context.ResizeObserver = class { observe() {} disconnect() {} }
  context.setTimeout = setTimeout; context.clearTimeout = clearTimeout
  const { getMinimumScale, canvasSize } = load(path.resolve('src/features/adventure/lib/geometry.ts'))
  try {
    for (const variant of ['route', 'open']) {
      const canvas = immersivePlayerHarness('src/features/adventure/components/MapCanvas'), ref = { current: null }
      const bounds = { width: 1280, height: 752 }
      let minimum
      const props = { ref, points: [], panelOpen: true, variant, onSelect() {}, onScaleChange() {}, onMinimumScaleChange: value => { minimum = value }, backgroundImage: '', label: 'Mapa' }
      const mount = tree => { tree.props.ref.current = { getBoundingClientRect: () => bounds, addEventListener() {}, removeEventListener() {} } }
      const transform = tree => canvas.find(tree, element => element.props.className === 'sx-map-canvas').props.style.transform
      canvas.draw(props, mount)
      let tree = canvas.draw(props, mount)
      assert.equal(transform(tree), `translate3d(${(bounds.width + 304 - canvasSize.width * .5) / 2}px, ${(bounds.height - canvasSize.height * .5) / 2}px, 0) scale(0.5)`)
      assert.equal(minimum, getMinimumScale(bounds))
      for (const scale of [.5, minimum, 1.4]) {
        ref.current.setScale(scale); tree = canvas.draw(props, mount)
        const before = transform(tree)
        assert.equal(transform(canvas.draw({ ...props, panelOpen: false }, mount)), before)
        assert.equal(transform(canvas.draw(props, mount)), before)
      }
      ref.current.centerMap(); tree = canvas.draw(props, mount)
      assert.match(transform(tree), /scale\(0.5\)/)
      canvas.dispose()
    }
  } finally { Object.assign(context, previous) }
})

test('phase 9 zoom controls use actual percentages and the viewport minimum', () => {
  const zoom = immersivePlayerHarness('src/features/adventure/components/ZoomControls')
  let requested
  const props = { scale: .5, minimumScale: .06, onScale: value => { requested = value }, onZoom() {}, onCenter() {} }
  let tree = zoom.draw(props)
  const input = zoom.find(tree, element => element.type === 'input')
  assert.equal(input.props.value, 50); assert.equal(input.props.min, 6); assert.equal(input.props.max, 140)
  assert.equal(input.props['aria-valuetext'], '50 %')
  input.props.onChange({ target: { value: '25' } }); assert.equal(requested, .25)
  tree = zoom.draw({ ...props, scale: .06 })
  const minus = zoom.find(tree, element => element.props['aria-label'] === 'Alejar mapa')
  assert.equal(minus.props.disabled, true)
  zoom.dispose()
})

test('phase 9 panel has five direct links, a compact next-step action and the real traveler rank', () => {
  const panel = immersivePlayerHarness('src/features/adventure/components/AdventurePanel', {
    '../lib/checkIn': { useCheckInDay() {}, getTodayCheckIn: () => undefined },
  })
  const logic = loadMapPoints(load)
  const adventure = store.createInitialAdventure(), journey = journeyLogic.initialJourney()
  const points = logic.getCaminoPoints(adventure, journey)
  let selected
  let tree = panel.draw({ adventure, points, recommended: points[0], progress: { label: 'Recorrido', value: 0 }, onSelect: id => { selected = id }, onCheckIn() {} })
  const links = panel.find(tree, element => element.props['aria-label'] === 'Accesos rápidos').props.children
  assert.deepEqual(Array.from(links, element => panel.text(element)), ['Mi perfil', 'Mi diario', 'En familia', 'Recursos', 'Investigaciones', 'Información'])
  assert.deepEqual(Array.from(links, element => element.props.to), ['/student/profile', '/student/journal', '/student/conversations', '/student/resources', '/student/investigations', '/student/catalog/professions'])
  assert.ok(links.every(element => element.type !== 'button'))
  const next = panel.button(tree, 'Siguiente paso')
  assert.ok(next); assert.match(panel.text(next), /El inicio del viaje/)
  assert.doesNotMatch(panel.text(next), /Ver misión|Informativa|4 min/)
  next.props.onClick(); assert.equal(selected, 'welcome')
  let rank = panel.find(tree, element => element.props.className === 'sx-panel-level')
  assert.equal(rank.props['aria-label'], `Nivel ${store.getTravelerLevel(adventure).number}: ${store.getTravelerLevel(adventure).label}`)
  assert.match(panel.text(rank), /NIVEL01/)
  adventure.completedMissionIds = fieldMissions.map(mission => mission.id)
  tree = panel.draw({ adventure, points: [], progress: { label: 'Recorrido', value: 100 }, onSelect() {}, onCheckIn() {} })
  rank = panel.find(tree, element => element.props.className === 'sx-panel-level')
  assert.match(panel.text(rank), /NIVEL03Cartógrafo de posibilidades/)
  assert.equal(panel.button(tree, 'Siguiente paso'), undefined)
  panel.dispose()
})

test('separate student diary preserves free-entry saving and editing without changing signals', () => {
  store.updateAdventure(() => ({ ...store.createInitialAdventure(), journalOnboardingSeen: true }))
  const before = store.useAdventure()
  const signalBefore = JSON.stringify(before.readinessCheckIns)
  const diary = immersivePlayerHarness('src/pages/student/StudentJournalView', {
    '@/hooks/useLumiNow': { useLumiNow: () => new Date() },
    '@/hooks/useReturnFocus': { useReturnFocus: () => ({}) },
    'react-router': { useSearchParams: () => [new URLSearchParams()] },
  })
  const part = (tree, name) => diary.find(tree, element => element.type?.name === name)
  let tree = diary.draw({})
  part(tree, 'JournalHome').props.onNew()
  tree = diary.draw({})
  part(tree, 'JournalEditor').props.onBodyChange('Una entrada privada de prueba.')
  tree = diary.draw({})
  part(tree, 'JournalEditor').props.onSave()
  let saved = store.useAdventure().journal.find(entry => entry.body === 'Una entrada privada de prueba.')
  assert.equal(store.useAdventure().journal.length, before.journal.length + 1)
  assert.equal(saved.kind, 'open')
  tree = diary.draw({})
  part(tree, 'JournalHome').props.onOpen(saved)
  tree = diary.draw({})
  part(tree, 'JournalDetail').props.onEdit()
  tree = diary.draw({})
  part(tree, 'JournalEditor').props.onBodyChange('Una entrada privada editada.')
  tree = diary.draw({})
  part(tree, 'JournalEditor').props.onSave()
  const edited = store.useAdventure().journal.find(entry => entry.id === saved.id)
  assert.equal(edited.body, 'Una entrada privada editada.')
  assert.equal(edited.createdAt, saved.createdAt)
  assert.equal(store.useAdventure().journal.length, before.journal.length + 1)
  assert.equal(JSON.stringify(store.useAdventure().readinessCheckIns), signalBefore)
  diary.dispose()
})

test('separate signal history reuses check-in editing and keyboard point selection without private entries', () => {
  const checkIn = load(path.resolve('src/features/adventure/lib/checkIn.ts'))
  store.updateAdventure(() => store.createInitialAdventure())
  checkIn.saveTodayCheckIn(7)
  const before = store.useAdventure()
  const today = checkIn.getTodayCheckIn(before)
  let opened = 0
  const history = immersivePlayerHarness('src/pages/student/StudentSignalsView', {
    '@/features/adventure/lib/checkIn': { ...checkIn, useCheckInDay() {} },
    '@/features/adventure/context/overlayContext': { useStudentOverlays: () => ({ openCheckIn: () => opened++ }) },
  })
  let tree = history.draw({})
  const edit = history.find(tree, element => history.text(element) === 'Cambiar mi señal' && element.props.onClick)
  edit.props.onClick()
  assert.equal(opened, 1)
  checkIn.saveTodayCheckIn(9)
  tree = history.draw({})
  assert.match(history.text(tree), /Señal seleccionada · 9\/10/)
  assert.equal(store.useAdventure().readinessCheckIns.length, before.readinessCheckIns.length)
  assert.equal(checkIn.getTodayCheckIn(store.useAdventure()).id, today.id)
  assert.equal(JSON.stringify(store.useAdventure().journal), JSON.stringify(before.journal))
  for (const entry of before.journal) assert.ok(!history.text(tree).includes(entry.body))
  const point = history.find(tree, element => element.props.role === 'button' && !element.props['aria-label'].endsWith('9 de 10'))
  point.props.onKeyDown({ key: 'Enter' })
  tree = history.draw({})
  const selectedValue = point.props['aria-label'].match(/: (\d+) de 10$/)[1]
  assert.match(history.text(tree), new RegExp(`Señal seleccionada · ${selectedValue}/10`))
  history.dispose()
})

test('discovery stores survive reload, validate nested data and report storage failures', () => {
  const file = path.resolve('src/lib/persistentStore.ts')
  const js = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  let raw = null, failWrite = false, listener
  const isolated = vm.createContext({ localStorage: { getItem: () => raw, setItem: (_key, value) => { if (failWrite) throw Error('full'); raw = value } }, window: { addEventListener: (_name, value) => { listener = value } } })
  const exported = {}
  vm.runInContext(`(function(require,exports){${js}\n})`, isolated)(name => { assert.equal(name, 'react'); return { useSyncExternalStore: (_, snapshot) => snapshot() } }, exported)
  const discovery = load(path.resolve('src/store/discoveryStore.ts'))
  const first = exported.persistentStore('test-discovery', discovery.initialDiscoveryState, discovery.validDiscoveryState)
  first.update(state => ({ ...state, revealedPages: ['intereses'], research: { occupationId: 'paramedic', before: 'Mi idea inicial sobre su trabajo', ownQuestions: ['Mi pregunta personal'] } }))
  const reloaded = exported.persistentStore('test-discovery', discovery.initialDiscoveryState, discovery.validDiscoveryState)
  assert.equal(reloaded.getSnapshot().research.before, 'Mi idea inicial sobre su trabajo')
  failWrite = true
  reloaded.update(state => ({ ...state, planOrder: ['sheet'] }))
  assert.equal(reloaded.useError(), true)
  assert.deepEqual(Array.from(reloaded.getSnapshot().planOrder), ['sheet'])
  raw = JSON.stringify({ ...discovery.initialDiscoveryState(), reactions: { video: { learned: { text: 4, createdAt: 'invalid' } } } })
  listener({ key: 'other-key' }); assert.equal(reloaded.useError(), true)
  listener({ key: 'test-discovery' }); assert.equal(reloaded.useError(), false)
  assert.deepEqual(Array.from(reloaded.getSnapshot().revealedPages), [])
  const e = load(path.resolve('src/store/explorationStore.ts'))
  const { createDecisionSheet } = load(path.resolve('src/types/decisions.ts'))
  failWrite = false
  const favorites = exported.persistentStore('test-exploration', e.initialExplorationState, e.validExplorationState)
  favorites.update(state => ({ ...state, careerInterestIds: ['psychology'], institutionInterestIds: ['legacy-category'], profiles: state.profiles.map(p => ({ ...p, interested: true })), decisionSheets: [createDecisionSheet('Psicología', 'psychology')] }))
  const restored = exported.persistentStore('test-exploration', e.initialExplorationState, e.validExplorationState)
  assert.equal(JSON.stringify(restored.getSnapshot()), JSON.stringify(favorites.getSnapshot()))
})

test('student favorites remain separate from explicit decision sheets', () => {
  const exploration = load(path.resolve('src/store/explorationStore.ts'))
  const saved = exploration.getExploration()
  try {
    exploration.updateExploration(() => exploration.initialExplorationState())
    exploration.toggleCareerInterest('psychology')
    exploration.toggleOccupationInterest('paramedic')
    exploration.toggleInstitutionInterest('demo-university')
    assert.equal(exploration.getExploration().decisionSheets.length, 0)
    assert.ok(exploration.getExploration().careerInterestIds.includes('psychology'))
    const { createDecisionSheet } = load(path.resolve('src/types/decisions.ts'))
    exploration.setDecisionSheets([createDecisionSheet('Psicología', 'psychology')])
    assert.equal(exploration.getExploration().decisionSheets[0].sourceId, 'psychology')
    assert.equal(exploration.validExplorationState({ ...exploration.getExploration(), decisionSheets: [{ id: 'broken' }] }), false)
    exploration.toggleCareerInterest('psychology')
    assert.equal(exploration.getExploration().decisionSheets.length, 1)
  } finally { exploration.updateExploration(() => saved) }
})


test('discovery profile exposes the three chapters and keeps its passport route', () => {
  const html = render('/student/profile')
  for (const text of ['Lo que he logrado', 'Lo que Helena descubre de mí', 'Hacia dónde voy', 'Recorrido', 'Logros recientes']) assert.ok(html.includes(text), text)
  assert.doesNotMatch(html, /Ver mi progreso|Mi punto de partida|Ver mis favoritos/)
  assert.match(render('/student/profile?section=passport'), /Pasaporte vocacional/)
  assert.doesNotMatch(html, /role="dialog"/)
})

test('Helena seals protect results and reveal a labeled example without changing real progress', () => {
  const d = load(path.resolve('src/store/discoveryStore.ts'))
  const pages = load(path.resolve('src/features/discovery/lib/helenaPages.ts'))
  const savedD = d.getDiscovery(), savedJ = journeyStore.useJourney()
  try {
    d.updateDiscovery(() => d.initialDiscoveryState())
    const empty = journeyLogic.initialJourney()
    assert.equal(pages.getHelenaPageState(false, true), 'sealed')
    assert.equal(pages.getHelenaPageState(true, false), 'ready')
    assert.equal(pages.getHelenaPageState(true, true), 'revealed')
    assert.equal(pages.getHelenaPages(empty, d.getDiscovery())[0].result, undefined)
    journeyStore.updateJourney(() => ({ ...empty, progress: { 'act-tip-01': { estado: 'completada' } } }))
    let p = pages.getHelenaPages(journeyStore.useJourney(), d.getDiscovery())[0]
    assert.equal(p.state, 'ready'); assert.equal(p.missions.done, 1); assert.equal(p.missions.total, 14)
    let html = render('/student/profile/helena')
    assert.match(html, /Romper el sello/); assert.doesNotMatch(html, /Social<|Investigador<|Artístico</)
    d.updateDiscovery(state => ({ ...state, revealedPages: ['intereses'] }))
    html = render('/student/profile/helena')
    // F4b: el libro anuncia contenidos y enlaza al detalle; no despliega ocupaciones.
    assert.match(html, /Página I · descifrada/); assert.match(html, /ocupaciones afines/); assert.match(html, /Este ejemplo no es tu resultado personal/)
    assert.match(html, /href="\/student\/profile\/helena\/intereses"/)
    assert.match(html, /href="\/student\/profile\/helena\/intereses\?guia=1"/)
    assert.equal(journeyStore.useJourney().results.length, 0)
    const unlocks = load(path.resolve('src/features/adventure/lib/unlocks.ts'))
    assert.equal(unlocks.getUnlocks(store.createInitialAdventure(), empty, d.getDiscovery()).filter(u => u.id === 'plans:intereses').length, 1)
  } finally { d.updateDiscovery(() => savedD); journeyStore.updateJourney(() => savedJ) }
})


test('discovery plans compute completeness, preserve archives and honor priority and the three-plan limit', () => {
  const plans = load(path.resolve('src/features/discovery/lib/plans.ts'))
  const { createDecisionSheet } = load(path.resolve('src/types/decisions.ts'))
  const first = createDecisionSheet('Psicología', 'psychology')
  assert.equal(plans.getPlanCompleteness(first), 0)
  const full = { ...first, motivation: 'Me interesa', strengths: 'Escuchar', challenges: 'Organizarme', budgets: [{ name: 'Universidad' }], preparation: ['Idiomas'] }
  assert.equal(plans.getPlanCompleteness(full), 4)
  const sheets = [first, ...[1,2,3].map(i => ({ ...createDecisionSheet(`Plan ${i}`, `career-${i}`), createdAt: `2026-10-0${i}T12:00:00Z` }))]
  const ordered = plans.getOrderedPlans(sheets, [sheets[2].id, first.id])
  assert.equal(ordered.length, 3); assert.equal(ordered[0].id, sheets[2].id)
  assert.equal(plans.addPlan(sheets, 'Otro', 'other'), sheets)
  const archived = plans.archivePlan([first], first.id)
  assert.equal(archived[0].timeline.at(-1).type, 'archived')
  assert.equal(archived[0].motivation, first.motivation)
  assert.equal(plans.addPlan(archived, 'Psicología', 'psychology').length, 2)
  assert.equal(plans.addPlan([first], 'Psicología', 'psychology').length, 1)
})


test('discovery research gates access, exposes guide states and retains classroom moderation', () => {
  const d = load(path.resolve('src/store/discoveryStore.ts'))
  const saved = d.getDiscovery()
  try {
    d.updateDiscovery(() => d.initialDiscoveryState())
    assert.match(render('/student/research'), /Las investigaciones se abren al resolver tu primer caso/)
    let html = render('/student/research', { solvedCaseIds: ['forest-fire'] })
    assert.match(html, /Iniciar investigación/); assert.doesNotMatch(html, /Aliados|aprendieron algo|[0-9] reacciones/)
    d.updateDiscovery(s => ({ ...s, research: { occupationId: 'paramedic', before: 'Pienso que ayuda en emergencias', ownQuestions: ['¿Qué te sorprendió de tu trabajo?'], guideStep: 2, guideReadyAt: '2026-10-04T14:00:00Z' } }))
    html = render('/student/research', { solvedCaseIds: ['forest-fire'] })
    assert.match(html, /Ver mi guion/); assert.match(html, /Aliados/); assert.match(html, /Publicar mi entrevista/); assert.doesNotMatch(html, /Iniciar investigación/)
    html = render('/student/research', { solvedCaseIds: ['forest-fire'], interviewModeration: { 'demo-industrial-design': { hidden: true, featured: false } } })
    assert.doesNotMatch(html, /Objetos que hacen más fácil la vida diaria/); assert.match(html, /Así se investiga la calidad del agua/)
    assert.doesNotMatch(html, /role="dialog"/)
    assert.match(render('/student/investigations', { solvedCaseIds: ['forest-fire'] }), /Publicar mi entrevista/)
    d.updateDiscovery(() => d.initialDiscoveryState())
    const guide = render('/student/research/guion', { solvedCaseIds: ['forest-fire'] })
    for (const question of ['¿Cómo es un día normal en tu trabajo?', '¿Qué estudiaste para llegar a donde estás?', '¿Qué consejo le darías a alguien de mi edad?']) assert.ok(guide.includes(question))
  } finally { d.updateDiscovery(() => saved) }
})

test('discovery publishing and positive reactions are validated, private and idempotent', () => {
  const d = load(path.resolve('src/store/discoveryStore.ts'))
  const r = load(path.resolve('src/features/discovery/lib/research.ts'))
  const saved = d.getDiscovery(), savedA = store.useAdventure()
  try {
    d.updateDiscovery(() => ({ ...d.initialDiscoveryState(), research: { occupationId: 'paramedic', before: 'Mi idea inicial', ownQuestions: ['¿Cómo te preparas?'], guideReadyAt: '2026-10-04T15:00:00Z' } }))
    store.updateAdventure(() => store.createInitialAdventure())
    const form = { interviewee: 'Profesional', summary: 'Aprendí cómo organiza su trabajo durante una emergencia.', videoUrl: 'https://youtu.be/ysz5S6PUM-U', coauthors: [], change: 'Mi reflexión privada de la entrevista' }
    assert.equal(r.publishResearch({ ...form, summary: 'Corto' }), undefined)
    assert.equal(r.publishResearch({ ...form, videoUrl: 'javascript:alert(1)' }), undefined)
    const id = r.publishResearch(form); assert.ok(id)
    assert.equal(r.publishResearch(form), id); assert.equal(store.useAdventure().videos.length, 1)
    assert.equal(store.useAdventure().videos[0].reflection, form.summary)
    assert.ok(!JSON.stringify(store.useAdventure().videos).includes(form.change))
    assert.equal(d.getDiscovery().publishedResearch[0].change, form.change)
    assert.equal(r.saveLearned('other-video', 'Breve'), false)
    assert.equal(r.saveLearned('other-video', 'Aprendí a comparar caminos de formación.'), true)
    r.toggleLiked('other-video'); assert.ok(d.getDiscovery().reactions['other-video'].liked)
    assert.ok(d.getDiscovery().reactions['other-video'].learned)
    r.toggleLiked('other-video'); assert.equal(d.getDiscovery().reactions['other-video'].liked, undefined)
    assert.ok(d.getDiscovery().reactions['other-video'].learned)
  } finally { d.updateDiscovery(() => saved); store.updateAdventure(() => savedA) }
})


test('discovery atlas covers existing IDs, symmetric relations and gated affinity', () => {
  const data = load(path.resolve('src/features/discovery/lib/catalogDetails.ts'))
  const selectors = load(path.resolve('src/features/discovery/lib/catalogSelectors.ts'))
  const catalog = load(path.resolve('src/data/catalog/occupations.ts'))
  assert.equal(data.occupationDetails.length, catalog.occupationCatalog.length)
  assert.equal(data.careerDetails.length, 6)
  assert.ok(data.institutionDetails.filter(i => i.type === 'UNIVERSITARIA').length >= 2)
  assert.ok(data.institutionDetails.some(i => i.type === 'TECNICA'))
  assert.ok(data.institutionDetails.some(i => i.type === 'FFAA_POLICIA'))
  for (const career of data.careerDetails) {
    assert.ok(selectors.getFamily(career.familyId))
    for (const id of career.occupationIds) {
      const occupation = selectors.getOccupation(id)
      assert.ok(occupation, `${career.id}:${id}`)
      // Una ficha pendiente conserva su identidad, sin inventar asociaciones de detalle.
      if (occupation.contentStatus === 'pending') {
        assert.deepEqual(Array.from(occupation.careerIds), [])
        assert.equal(selectors.isAffine(id, ['intereses']), undefined)
      } else assert.ok(occupation.careerIds.includes(career.id), `${career.id}:${id}`)
    }
    for (const id of career.institutionIds) assert.ok(selectors.getInstitution(id)?.careerIds.includes(career.id), `${career.id}:${id}`)
  }
  for (const institution of data.institutionDetails) for (const id of institution.careerIds) assert.ok(selectors.getCareer(id)?.institutionIds.includes(institution.id))
  for (const occupation of data.occupationDetails) for (const id of occupation.careerIds) assert.ok(selectors.getCareer(id)?.occupationIds.includes(occupation.id))
  assert.equal(selectors.isAffine('paramedic', []), undefined)
  assert.equal(selectors.isAffine('paramedic', ['intereses']), 'Gran ajuste')
  assert.equal(selectors.matchesName('Psicología', 'PSICOLOGIA'), true)
})

test('discovery atlas details are pages, retain favorites and handle missing IDs', () => {
  const career = render('/student/catalog/careers/psychology')
  for (const text of ['Cuánto se gana', 'Jóvenes', 'Adultos', 'Dónde estudiarla', 'Datos de demostración']) assert.ok(career.includes(text))
  const occupation = render('/student/catalog/professions/paramedic')
  assert.doesNotMatch(occupation, /grado|Formación que suele requerir|role="dialog"/)
  assert.match(occupation, /Qué hacen/); assert.match(occupation, /O\*NET por incorporar/)
  assert.match(render('/student/catalog/institutions/demo-horizonte-public'), /Institución ficticia/)
  assert.match(render('/student/catalog/careers/unknown'), /No encontramos esta página del atlas/)
  for (const route of ['/student/catalog/professions', '/student/catalog/careers', '/student/catalog/institutions', '/student/catalog/careers/psychology', '/student/catalog/professions/paramedic', '/student/catalog/institutions/demo-horizonte-public']) {
    const html = render(route); assert.doesNotMatch(html, /role="dialog"/); assert.match(html, /aria-label="Secciones del catálogo"/)
    const moduleHeader = html.match(/<header class="sx-module-header">[\s\S]*?<\/header>/)?.[0]
    assert.ok(moduleHeader); assert.doesNotMatch(moduleHeader, /Secciones del catálogo/)
    const navigation = html.match(/<nav class="sx-d-catalog-nav"[\s\S]*?<\/nav>/)?.[0]
    assert.ok(navigation); assert.equal((navigation.match(/<svg /g) ?? []).length, 3)
    assert.match(navigation, /aria-current="page"/)
  }
  const professions = render('/student/catalog/professions')
  assert.match(professions, /Tu exploración/); assert.match(professions, /ocupaciones descubiertas/)
  assert.doesNotMatch(professions, /ocupaciones con ícono|sx-d-collection-mini/)
})


test('discovery guide resumes its exact step and asks before replacing saved work', () => {
  const d = load(path.resolve('src/store/discoveryStore.ts'))
  const e = load(path.resolve('src/store/explorationStore.ts'))
  const saved = d.getDiscovery(), savedA = store.useAdventure()
  let params = new URLSearchParams()
  const overrides = {
    '@/hooks/useReturnFocus': { useReturnFocus: () => ({}) },
    '@/context/occupationExplorationContext': { useOccupationExplorationContext: () => e.getExploration() },
    'react-router': { Link: 'a', useSearchParams: () => [params, update => { params = update(params) }] },
  }
  let page = immersivePlayerHarness('src/pages/student/ResearchGuideView', overrides)
  try {
    store.updateAdventure(() => ({ ...store.createInitialAdventure(), solvedCaseIds: ['forest-fire'] }))
    d.updateDiscovery(() => ({ ...d.initialDiscoveryState(), research: { occupationId: 'paramedic', before: '', ownQuestions: [], guideStep: 0 } }))
    let tree = page.draw({})
    assert.equal(page.button(tree, 'Seguir con las preguntas').props.disabled, true)
    page.find(tree, el => el.type === 'textarea').props.onChange({ target: { value: 'Creo que atiende emergencias y quiero conocer su rutina.' } })
    tree = page.draw({}); page.button(tree, 'Seguir con las preguntas').props.onClick()
    page.dispose(); page = immersivePlayerHarness('src/pages/student/ResearchGuideView', overrides)
    tree = page.draw({}); assert.equal(page.find(tree, el => el.type?.name === 'Parchment').props.title, 'Mi lista de preguntas')
    assert.equal(page.button(tree, 'Terminar mi guion').props.disabled, true)
    page.find(tree, el => el.type === 'input' && el.props.onKeyDown).props.onChange({ target: { value: '¿Qué fue lo más difícil al empezar?' } })
    tree = page.draw({})
    page.find(tree, el => el.type === 'input' && el.props.onKeyDown).props.onKeyDown({ key: 'Enter', nativeEvent: { isComposing: false }, preventDefault() {} })
    tree = page.draw({}); page.button(tree, 'Terminar mi guion').props.onClick()
    assert.ok(d.getDiscovery().research.guideReadyAt)
    const draft = JSON.stringify(d.getDiscovery().research)
    params = new URLSearchParams('occupationId=graphic-designer&keep=1')
    page.draw({}); tree = page.draw({})
    assert.match(page.text(tree), /¿Cambiar de ocupación?/)
    page.button(tree, 'Conservar mi guion').props.onClick()
    assert.equal(JSON.stringify(d.getDiscovery().research), draft)
    assert.equal(params.get('keep'), '1'); assert.equal(params.has('occupationId'), false)
    params = new URLSearchParams('occupationId=graphic-designer')
    page.draw({}); tree = page.draw({}); page.button(tree, 'Reemplazar mi guion').props.onClick()
    assert.equal(d.getDiscovery().research.occupationId, 'graphic-designer')
    assert.equal(d.getDiscovery().research.before, '')
    assert.equal(d.getDiscovery().research.ownQuestions.length, 0)
    assert.equal(d.validDiscoveryState({ ...d.getDiscovery(), research: { ...d.getDiscovery().research, guideStep: '1' } }), false)
  } finally { page.dispose(); d.updateDiscovery(() => saved); store.updateAdventure(() => savedA) }
})

test('discovery plan actions create explicitly, reorder and archive only on confirmation', () => {
  const d = load(path.resolve('src/store/discoveryStore.ts'))
  const e = load(path.resolve('src/store/explorationStore.ts'))
  const savedD = d.getDiscovery(), savedE = e.getExploration()
  const page = immersivePlayerHarness('src/pages/student/StudentPlansView', {
    '@/hooks/useReturnFocus': { useReturnFocus: () => ({}) },
    '@/context/occupationExplorationContext': { useOccupationExplorationContext: () => ({ ...e.getExploration(), setDecisionSheets: e.setDecisionSheets }) },
    'react-router': { Link: 'a' },
  })
  try {
    d.updateDiscovery(() => d.initialDiscoveryState()); e.updateExploration(() => e.initialExplorationState())
    e.toggleCareerInterest('psychology'); e.toggleCareerInterest('nursing')
    let tree = page.draw({}); assert.equal(e.getExploration().decisionSheets.length, 0)
    page.button(tree, 'Hacer mi plan A').props.onClick()
    tree = page.draw({}); page.button(tree, 'Hacer mi plan B').props.onClick()
    tree = page.draw({}); const first = page.find(tree, el => el.type?.name === 'PlanCard' && el.props.index === 0)
    const originalId = first.props.sheet.id; first.props.onMove(1)
    tree = page.draw({}); assert.equal(page.find(tree, el => el.type?.name === 'PlanCard' && el.props.index === 1).props.sheet.id, originalId)
    page.find(tree, el => el.type?.name === 'PlanCard' && el.props.index === 1).props.onArchive()
    tree = page.draw({}); page.button(tree, 'Cancelar').props.onClick()
    assert.equal(e.getExploration().decisionSheets.find(s => s.id === originalId).status, 'active')
    tree = page.draw({}); page.find(tree, el => el.type?.name === 'PlanCard' && el.props.index === 1).props.onArchive()
    tree = page.draw({}); page.button(tree, 'Archivar plan').props.onClick()
    const archived = e.getExploration().decisionSheets.find(s => s.id === originalId)
    assert.equal(archived.status, 'archived'); assert.equal(archived.timeline.at(-1).type, 'archived')
    tree = page.draw({}); page.button(tree, 'Hacer mi plan B').props.onClick()
    assert.equal(e.getExploration().decisionSheets.length, 3)
    assert.ok(e.getExploration().decisionSheets.some(s => s.id !== originalId && s.sourceId === archived.sourceId && s.status !== 'archived'))
  } finally { page.dispose(); d.updateDiscovery(() => savedD); e.updateExploration(() => savedE) }
})

test('discovery research tabs accept boundary keys and detail navigation uses history', () => {
  const d = load(path.resolve('src/store/discoveryStore.ts'))
  const saved = d.getDiscovery(), savedA = store.useAdventure()
  let params = new URLSearchParams('keep=1'), focused
  const page = immersivePlayerHarness('src/pages/student/StudentResearchView', {
    'react-router': { Link: 'a', useNavigate: () => () => {}, useSearchParams: () => [params, update => { params = update(params) }] },
  })
  const event = key => ({ key, preventDefault() {}, currentTarget: { parentElement: { querySelectorAll: () => [0,1].map(i => ({ focus: () => { focused = i } })) } } })
  try {
    d.updateDiscovery(() => d.initialDiscoveryState())
    store.updateAdventure(() => ({ ...store.createInitialAdventure(), solvedCaseIds: ['forest-fire'] }))
    let tree = page.draw({})
    page.find(tree, el => el.props.id === 'sx-research-tab-classroom').props.onKeyDown(event('End'))
    tree = page.draw({}); assert.equal(focused, 1); assert.equal(page.find(tree, el => el.props.id === 'sx-research-tab-mine').props['aria-selected'], true)
    page.find(tree, el => el.props.id === 'sx-research-tab-mine').props.onKeyDown(event('ArrowRight'))
    tree = page.draw({}); assert.equal(focused, 0)
    const card = page.find(tree, el => el.type?.name === 'InterviewCard')
    card.props.onOpen(); page.draw({}); tree = page.draw({})
    assert.equal(params.get('entrevista'), card.props.video.id); assert.equal(params.get('keep'), '1')
    assert.ok(store.useAdventure().visits.includes(card.props.video.id))
    page.find(tree, el => el.type?.name === 'InterviewDetail').props.onBack()
    page.draw({}); tree = page.draw({}); assert.equal(page.find(tree, el => el.type?.name === 'InterviewDetail'), undefined)
    assert.equal(params.get('keep'), '1')
  } finally { page.dispose(); d.updateDiscovery(() => saved); store.updateAdventure(() => savedA) }
})


test('Helena prefers complete valid real results over examples and invalid older results', () => {
  const file = path.resolve('src/features/discovery/lib/helenaPages.ts')
  const js = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const ids = Array.from({ length: 14 }, (_, i) => `act-tip-${String(i + 1).padStart(2, '0')}`)
  const dimensions = ['Realista','Investigador','Artístico','Social','Emprendedor','Convencional'].map(name => ({ id: name[0], nombre: name }))
  const instrument = { id: 'tip', clave: { dimensiones: dimensions } }
  let calculated
  const exported = {}
  vm.runInContext(`(function(require,exports){${js}\n})`, context)(name => {
    if (name.endsWith('/content')) return { catalog: { instrumentos: [instrument] }, tipActivityIds: ids }
    if (name.endsWith('/logic')) return { calculateResult: () => calculated }
    if (name === '../data/dimensionExamples') return load(path.resolve('src/features/discovery/data/dimensionExamples.ts'))
    throw Error(name)
  }, exported)
  const d = load(path.resolve('src/store/discoveryStore.ts'))
  const discovery = { ...d.initialDiscoveryState(), revealedPages: ['intereses'] }
  const valid = { instrumentoId: 'tip', puntajes: dimensions.map((dimension, i) => ({ dimensionId: dimension.id, puntaje: i * 10 })) }
  const journey = { ...journeyLogic.initialJourney(), progress: Object.fromEntries(ids.map(id => [id, { estado: 'completada' }])), results: [{ instrumentoId: 'tip', puntajes: [] }, valid] }
  let page = exported.getHelenaPages(journey, discovery)[0]
  assert.equal(page.result.source, 'real'); assert.equal(page.demo, false); assert.equal(page.missions.done, 14)
  assert.equal(page.result.areas[0].name, 'Convencional')
  assert.equal(exported.getHelenaPages(journey, d.initialDiscoveryState())[0].result, undefined)
  calculated = valid
  page = exported.getHelenaPages({ ...journey, results: [journey.results[0]] }, discovery)[0]
  assert.equal(page.result.source, 'real')
  page = exported.getHelenaPages({ ...journey, progress: { 'act-tip-01': { estado: 'completada' } } }, discovery)[0]
  assert.equal(page.result.source, 'demo'); assert.equal(page.missions.done, 1)
  calculated = { ...valid, puntajes: [{ dimensionId: 'S', puntaje: NaN }] }
  page = exported.getHelenaPages({ ...journey, results: [] }, discovery)[0]
  assert.equal(page.result.source, 'demo')
})


test('collapsed student map reserves its strip and keeps the recommended point visible', () => {
 const g=load(path.resolve('src/features/adventure/lib/geometry.ts'))
 const bounds={width:1280,height:800},point={x:500,y:300},current={x:0,y:0,scale:.5}
 for(const inset of [304,72,0]){
  const center=g.visibleCenter(bounds,false,inset)
  assert.equal(center.x,(1280+inset)/2)
  const focused=g.focusTransform(current,point,bounds,false,g.canvasSize,inset)
  const position=g.mapPosition(point)
  assert.ok(Math.abs(focused.x+position.x*focused.scale-center.x)<.00001)
 }
 const html=render('/student/missions')
 assert.match(html, /class="sx-panel-traveler" href="\/student\/profile"/)
 for(const text of ['Nivel de recorrido','Tu título de viajero','Crece con cada misión del camino.','Tu señal de hoy','Actividades disponibles'])assert.ok(html.includes(text))
})


test('new backpack separates provisions, protects locked identities and navigates its resource tabs', () => {
 const html=render('/student/resources')
 for(const text of ['Tu mochila de viaje','Lo que aprendiste en el camino','Voces de la ciudad','Mis favoritos','Una voz por descubrir'])assert.ok(html.includes(text))
 assert.doesNotMatch(html,/resource-status|recursos desbloqueados|role="dialog"/)
 const resources=load(path.resolve('src/features/backpack/lib/travelerResources.ts')).getTravelResources()
 for(const voice of resources.filter(r=>r.kind==='testimonial'))assert.ok(!html.includes(voice.author))
 let params=new URLSearchParams('kind=sheet&keep=1'),navigated
 const page=immersivePlayerHarness('src/pages/student/StudentBackpackView',{'react-router':{useNavigate:()=>href=>{navigated=href},useSearchParams:()=>[params,update=>{params=update(params)}]}})
 try{
  let tree=page.draw({})
  const tab=(tree,id)=>page.find(tree,e=>e.props.id===`sx-backpack-tab-${id}`)
  tab(tree,'sheet').props.onKeyDown({key:'End',preventDefault(){}})
  assert.equal(params.get('kind'),'testimonial');assert.equal(params.get('keep'),'1')
  tree=page.draw({});tab(tree,'testimonial').props.onKeyDown({key:'ArrowRight',preventDefault(){}})
  assert.equal(params.get('kind'),'all')
  tree=page.draw({});tab(tree,'all').props.onKeyDown({key:'ArrowLeft',preventDefault(){}})
  assert.equal(params.get('kind'),'testimonial')
  tree=page.draw({});tab(tree,'testimonial').props.onKeyDown({key:'Home',preventDefault(){}})
  assert.equal(params.get('kind'),'all');assert.equal(params.get('keep'),'1')
  params=new URLSearchParams('kind=unknown&keep=1');tree=page.draw({});assert.equal(tab(tree,'all').props['aria-selected'],true)
  assert.equal(navigated,undefined)
 }finally{page.dispose()}
})


test('Lumi bond counts Lima days without loss and opens memories at exact boundaries', () => {
 const {getLumiBond}=load(path.resolve('src/features/journal/lib/lumiBond.ts'))
 const first={entryId:'first',createdAt:'2026-09-01T05:00:00Z'}
 const later={entryId:'later',createdAt:'2026-09-11T05:00:00Z'}
 assert.equal(getLumiBond([first,later],new Date('2026-10-01')).conversations,2)
 const day=[0,1,2,3,4].map(n=>({entryId:`same-${n}`,createdAt:'2026-10-04T05:01:00Z'}))
 const now=new Date('2026-10-04T06:00:00Z'),bond=getLumiBond(day,now)
 assert.equal(bond.conversations,3);assert.equal(bond.todayCounted,3);assert.equal(bond.remainingToday,0)
 assert.equal(getLumiBond([...day,{entryId:'yesterday',createdAt:'2026-10-04T04:59:00Z'}],now).conversations,4)
 assert.equal(getLumiBond([first,first,{entryId:'bad',createdAt:'bad'},{entryId:'future',createdAt:'2099-01-01'}],now).conversations,1)
 for(const [count,opened,next,progress] of [[0,0,1,0],[1,1,5,0],[3,1,5,50],[4,1,5,75],[5,2,10,0],[9,2,10,80],[10,3,15,0],[14,3,15,80],[15,4,undefined,100]]){
  const regs=Array.from({length:count},(_,i)=>({entryId:`r-${i}`,createdAt:`2026-09-${String(i+1).padStart(2,'0')}T12:00:00Z`}))
  const result=getLumiBond(regs,now);assert.equal(result.memoriesOpened,opened);assert.equal(result.nextMemoryAt,next);assert.equal(result.progress,progress)
 }
})

test('journal uses conversations, inline onboarding and private titled saving without automatic windows', () => {
 const html=render('/student/journal',{journalOnboardingSeen:true})
 for(const text of ['Amistad con Lumi','Recuerdos de Lumi','Lumi, hoy quiero contarte','Lo que le has contado a Lumi','La amistad nunca se pierde'])assert.ok(html.includes(text))
 assert.doesNotMatch(html,/puntos de amistad|baja 1 punto|role="dialog"/)
 const intro=render('/student/journal',{journalOnboardingSeen:false});assert.match(intro,/Un espacio para ti y Lumi/);assert.doesNotMatch(intro,/role="dialog"/)
 const page=immersivePlayerHarness('src/pages/student/StudentJournalView',{'react-router':{useSearchParams:()=>[new URLSearchParams()]},'@/hooks/useLumiNow':{useLumiNow:()=>new Date()},'@/hooks/useReturnFocus':{useReturnFocus:()=>({})}})
 const before=store.useAdventure()
 try{
  store.updateAdventure(()=>({...store.createInitialAdventure(),journalOnboardingSeen:true}))
  let tree=page.draw({});page.find(tree,e=>e.type?.name==='JournalHome').props.onNew();tree=page.draw({})
  let editor=page.find(tree,e=>e.type?.name==='JournalEditor');editor.props.onBodyChange('Una reflexión privada.');editor.props.onTitleChange('Mi título personal')
  tree=page.draw({});page.find(tree,e=>e.type?.name==='JournalEditor').props.onSave()
  const saved=store.useAdventure().journal.find(e=>e.title==='Mi título personal');assert.ok(saved);assert.equal(saved.body,'Una reflexión privada.')
  const regs=JSON.stringify(store.useAdventure().lumiRegistrations),checks=JSON.stringify(store.useAdventure().readinessCheckIns)
  tree=page.draw({});page.find(tree,e=>e.type?.name==='JournalHome').props.onOpen(saved);tree=page.draw({});page.find(tree,e=>e.type?.name==='JournalDetail').props.onEdit();tree=page.draw({})
  editor=page.find(tree,e=>e.type?.name==='JournalEditor');assert.equal(editor.props.title,'Mi título personal');editor.props.onTitleChange('Mi título editado')
  tree=page.draw({});page.find(tree,e=>e.type?.name==='JournalEditor').props.onSave();assert.equal(store.useAdventure().journal.find(e=>e.id===saved.id).title,'Mi título editado')
  assert.equal(JSON.stringify(store.useAdventure().lumiRegistrations),regs);assert.equal(JSON.stringify(store.useAdventure().readinessCheckIns),checks)
  tree=page.draw({});page.find(tree,e=>e.type?.name==='JournalDetail').props.onDelete();tree=page.draw({});page.button(tree,'Eliminar').props.onClick()
  assert.equal(JSON.stringify(store.useAdventure().lumiRegistrations),regs);assert.ok(!store.useAdventure().journal.some(e=>e.id===saved.id))
 }finally{page.dispose();store.updateAdventure(()=>before)}
})

test('passport selection respects explicit emptiness, earned badges, order and stable observed dates', () => {
 const d=load(path.resolve('src/store/discoveryStore.ts'))
 const p=load(path.resolve('src/features/discovery/lib/passport.ts'))
 const adventure={...store.createInitialAdventure(),completedMissionIds:fieldMissions.map(m=>m.id),solvedCaseIds:['forest-fire']}
 let state=d.initialDiscoveryState()
 assert.deepEqual(Array.from(p.getProfileBadges(adventure,state),b=>b.code),['I1','I2','I3'])
 assert.equal(p.toggleProfileBadge(state,adventure,'I7'),state)
 assert.equal(p.toggleProfileBadge(state,adventure,'I8'),state)
 for(const code of ['I1','I2','I3'])state=p.toggleProfileBadge(state,adventure,code)
 assert.equal(state.profileBadgesConfigured,true);assert.equal(p.getProfileBadges(adventure,state).length,0)
 for(const code of ['I7','I2','I1'])state=p.toggleProfileBadge(state,adventure,code)
 assert.deepEqual(Array.from(p.getProfileBadges(adventure,state),b=>b.code),['I7','I2','I1'])
 assert.equal(p.toggleProfileBadge(state,adventure,'I3'),state)
 state=p.recordBadgeFirstSeenAt(state,adventure,'2026-10-04T12:00:00Z')
 const dates=JSON.stringify(state.badgeFirstSeenAt)
 assert.equal(p.recordBadgeFirstSeenAt(state,adventure,'2026-10-05T12:00:00Z'),state)
 assert.equal(JSON.stringify(state.badgeFirstSeenAt),dates);assert.equal(state.badgeFirstSeenAt.I8,undefined)
 const old={...state,revealedPages:['intereses'],research:{occupationId:'paramedic',before:'Mi reflexión privada',ownQuestions:['Una pregunta']},reactions:{v:{liked:'2026-10-04T12:00:00Z'}},viewedCareerIds:['psychology']}
 delete old.profileBadges;delete old.profileBadgesConfigured;delete old.badgeFirstSeenAt
 const migrated=d.normalizeDiscoveryState(old)
 assert.equal(d.validDiscoveryState(migrated),true);assert.equal(migrated.research,old.research);assert.equal(migrated.reactions,old.reactions)
 assert.deepEqual(Array.from(migrated.revealedPages),['intereses']);assert.equal(migrated.profileBadgesConfigured,false)
 const repaired=d.normalizeDiscoveryState({...old,profileBadges:['I1','I1','bad','I2','I3','I7'],profileBadgesConfigured:true,badgeFirstSeenAt:{I1:'invalid',I2:'2026-10-04T12:00:00Z',bad:'2026-10-04'}})
 assert.equal(d.validDiscoveryState(repaired),true);assert.deepEqual(Array.from(repaired.profileBadges),['I1','I2','I3']);assert.equal(Object.keys(repaired.badgeFirstSeenAt).join(),'I2')
})

test('passport hides pending meanings, respects the profile limit and starts without a dialog', () => {
 const html=render('/student/profile?section=passport')
 assert.doesNotMatch(html,/role="dialog"/);assert.match(html,/Camino de los títulos/)
 const d=load(path.resolve('src/store/discoveryStore.ts'))
 const adventure={...store.createInitialAdventure(),completedMissionIds:fieldMissions.map(m=>m.id),solvedCaseIds:['forest-fire']}
 const groups=load(path.resolve('src/features/discovery/lib/achievements.ts')).getAchievementGroups(adventure)
 const page=immersivePlayerHarness('src/features/discovery/components/PassportBadgeDialog',{'@/store/adventureStore':{useAdventure:()=>adventure},'@/store/discoveryStore':{useDiscovery:()=>d.initialDiscoveryState()},'@/hooks/useReturnFocus':{useReturnFocus:()=>({})}})
 try{
  const pending=groups.flatMap(g=>g.items).find(b=>!b.done)
  let tree=page.draw({badge:pending,group:'Prueba',groupIndex:1,onClose(){}})
  assert.ok(!page.text(tree).includes(pending.metaphor));assert.ok(!page.text(tree).includes(pending.vocationalMeaning))
  assert.match(page.text(tree),/Se revela cuando obtengas/);assert.equal(page.button(tree,'Mostrar en mi perfil'),undefined)
  const earned=groups.flatMap(g=>g.items).find(b=>b.code==='I7')
  tree=page.draw({badge:earned,group:'Prueba',groupIndex:2,onClose(){}})
  assert.ok(page.text(tree).includes(earned.vocationalMeaning));assert.equal(page.button(tree,'Mostrar en mi perfil').props.disabled,true)
  tree=page.draw({badge:{...pending,hidden:true},group:'Prueba',groupIndex:1,onClose(){}})
  assert.ok(!page.text(tree).includes(pending.description));assert.ok(!page.text(tree).includes(pending.title))
 }finally{page.dispose()}
})

test('discovery badge migration survives reload, tab synchronization and failed saving without losing existing work', () => {
 const d=load(path.resolve('src/store/discoveryStore.ts'))
 const file=path.resolve('src/lib/persistentStore.ts')
 const js=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
 const old={...d.initialDiscoveryState(),revealedPages:['habilidades'],planOrder:['legacy-plan'],research:{occupationId:'paramedic',before:'Mi idea',ownQuestions:['Pregunta'],publication:{interviewee:'Persona',summary:'Resumen',change:'Cambio privado',videoUrl:'https://example.test/video',coauthors:['Ana']}},publishedResearch:[{videoId:'v',occupationId:'paramedic',coauthors:['Ana'],change:'Mi reflexión'}],reactions:{v:{liked:'2026-10-04T12:00:00Z'}},viewedCareerIds:['psychology']}
 delete old.profileBadges;delete old.profileBadgesConfigured;delete old.badgeFirstSeenAt
 let raw=JSON.stringify(old),fail=false,listeners=[]
 const sandbox=vm.createContext({localStorage:{getItem:()=>raw,setItem:(_key,value)=>{if(fail)throw Error('full');raw=value}},window:{addEventListener:(_name,listener)=>listeners.push(listener)}})
 const exp={};vm.runInContext(`(function(require,exports){${js}\n})`,sandbox)(()=>({useSyncExternalStore:(_,snapshot)=>snapshot()}),exp)
 const create=()=>exp.persistentStore('ov.student-discovery.v1',d.initialDiscoveryState,d.validDiscoveryState,d.normalizeDiscoveryState)
 const first=create();assert.equal(first.getSnapshot().research.before,'Mi idea');assert.equal(first.getSnapshot().profileBadgesConfigured,false)
 first.update(s=>({...s,profileBadgesConfigured:true,profileBadges:[],badgeFirstSeenAt:{I1:'2026-10-04T12:00:00Z'}}))
 const reload=create();assert.equal(reload.getSnapshot().profileBadgesConfigured,true);assert.equal(reload.getSnapshot().profileBadges.length,0)
 for(const field of Object.keys(old))assert.equal(JSON.stringify(reload.getSnapshot()[field]),JSON.stringify(old[field]),field)
 raw=JSON.stringify({...reload.getSnapshot(),profileBadges:['I1']});listeners.forEach(l=>l({key:'ov.student-discovery.v1'}));assert.equal(first.getSnapshot().profileBadges.join(),'I1')
 fail=true;reload.update(s=>({...s,profileBadges:[]}));assert.equal(reload.useError(),true);assert.equal(reload.getSnapshot().profileBadges.length,0)
})

test('reading a Lumi memory removes its new marker and novelty, preserves parameters and survives UI reload', () => {
 const ui=load(path.resolve('src/store/studentUiStore.ts'))
 let params=new URLSearchParams('memory=1&keep=1'),state=ui.initialStudentUiState()
 const {getLumiBond}=load(path.resolve('src/features/journal/lib/lumiBond.ts'))
 const bond=getLumiBond([{entryId:'conversation',createdAt:'2026-09-01T12:00:00Z'}],new Date('2026-10-04T12:00:00Z'))
 const page=immersivePlayerHarness('src/features/journal/components/LumiBondPanel',{'react-router':{useSearchParams:()=>[params,update=>{params=update(params)}]},'@/store/studentUiStore':{useStudentUi:()=>state,updateStudentUi:update=>{state=update(state)}}})
 try{
  page.draw({bond});let tree=page.draw({bond})
  assert.equal(state.seenLumiMemories.join(),'1');assert.ok(state.seenUnlockIds.includes('lumi-memory:1'))
  assert.doesNotMatch(page.text(tree),/Nuevo/);assert.match(page.text(tree),/Llegué aquí perdida/)
  page.button(tree,'Guardar en mi memoria').props.onClick();tree=page.draw({bond});assert.ok(!page.text(tree).includes('Llegué aquí perdida'))
  assert.equal(params.has('memory'),false);assert.equal(params.get('keep'),'1')
  params=new URLSearchParams('memory=4');page.draw({bond});tree=page.draw({bond});assert.ok(!page.text(tree).includes('[Texto del recuerdo 4'))
 }finally{page.dispose()}
 const source=readFileSync(path.resolve('src/store/studentUiStore.ts'),'utf8')
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
 let raw=JSON.stringify({...state,seenLumiMemories:[1,1,0,5,'2',2.5]}),listener
 const sandbox=vm.createContext({localStorage:{getItem:()=>raw,setItem:(_,value)=>{raw=value}},window:{addEventListener:(_,callback)=>{listener=callback}}})
 const exp={};vm.runInContext(`(function(require,exports){${js}\n})`,sandbox)(name=>name==='react'?{useSyncExternalStore:(_,snapshot)=>snapshot()}:load(path.resolve('src/lib/studentViews.ts')),exp)
 assert.equal(exp.useStudentUi().seenLumiMemories.join(),'1');assert.ok(exp.useStudentUi().seenUnlockIds.includes('lumi-memory:1'))
 raw=JSON.stringify({...state,seenLumiMemories:[1,2]});listener({key:'ov.student-ui.v1'});assert.equal(exp.useStudentUi().seenLumiMemories.join(),'1,2')
 const unlocks=load(path.resolve('src/features/adventure/lib/unlocks.ts')).getUnlocks({...store.createInitialAdventure(),lumiRegistrations:[{entryId:'conversation',createdAt:'2026-09-01T12:00:00Z'}]},journeyLogic.initialJourney())
 const memory=unlocks.find(u=>u.kind==='memory');assert.equal(memory.id,'lumi-memory:1');assert.equal(memory.href,'/student/journal?memory=1')
})

test('journal preserves incoming activity, family and event context while requiring title and text', () => {
 const before=store.useAdventure()
 const cases=[
  ['activity=act-tip-01&title=Mi%20actividad&prompt=Una%20pregunta','Mi actividad','act-tip-01',/Una pregunta/],
  ['conversation=work-trends','Conversación: Tendencias laborales de antes y ahora','family-work-trends',/conversación con tu familia/],
  ['event=Feria&outcome=attended','Evento: Feria','event-Feria',/Hoy fue Feria/],
  ['event=Feria&outcome=missed','Evento: Feria','event-Feria',/No asististe a Feria/],
 ]
 try{
  for(const [query,title,linked,prompt] of cases){
   store.updateAdventure(()=>({...store.createInitialAdventure(),journalOnboardingSeen:false}))
   const page=immersivePlayerHarness('src/pages/student/StudentJournalView',{'react-router':{useSearchParams:()=>[new URLSearchParams(query)]},'@/hooks/useLumiNow':{useLumiNow:()=>new Date()},'@/hooks/useReturnFocus':{useReturnFocus:()=>({})}})
   try{
    let tree=page.draw({}),editor=page.find(tree,e=>e.type?.name==='JournalEditor')
    assert.equal(editor.props.title,title);assert.match(editor.props.prompt,prompt)
    const count=store.useAdventure().journal.length,signals=JSON.stringify(store.useAdventure().readinessCheckIns)
    editor.props.onSave();assert.equal(store.useAdventure().journal.length,count)
    editor.props.onBodyChange('Una reflexión de este flujo.');editor.props.onTitleChange('   ')
    tree=page.draw({});page.find(tree,e=>e.type?.name==='JournalEditor').props.onSave();assert.equal(store.useAdventure().journal.length,count)
    const chosenTitle=`Título personal: ${query}`
    page.find(tree,e=>e.type?.name==='JournalEditor').props.onTitleChange(chosenTitle)
    tree=page.draw({});editor=page.find(tree,e=>e.type?.name==='JournalEditor');const tags=JSON.stringify(editor.props.tags),locked=JSON.stringify(editor.props.lockedTags)
    editor.props.onSave();const saved=store.useAdventure().journal.find(e=>e.title===chosenTitle)
    assert.equal(saved.linkedActivityId,linked);assert.match(saved.promptShown,prompt);assert.equal(JSON.stringify(saved.topicTags),tags);assert.equal(JSON.stringify(saved.lockedTopicTags),locked)
    assert.equal(JSON.stringify(store.useAdventure().readinessCheckIns),signals)
   }finally{page.dispose()}
  }
 }finally{store.updateAdventure(()=>before)}
})

test('memory navigation opens the journal home from its editor and does not consume unread memories early', () => {
 let params=new URLSearchParams()
 const fixture={...store.createInitialAdventure(),journalOnboardingSeen:true,lumiRegistrations:[{entryId:'conversation',createdAt:'2026-09-01T12:00:00Z'}]}
 const page=immersivePlayerHarness('src/pages/student/StudentJournalView',{'react-router':{useSearchParams:()=>[params]},'@/store/adventureStore':{useAdventure:()=>fixture},'@/hooks/useLumiNow':{useLumiNow:()=>new Date('2026-10-04T12:00:00Z')},'@/hooks/useReturnFocus':{useReturnFocus:()=>({})}})
 try{
  let tree=page.draw({});page.find(tree,e=>e.type?.name==='JournalHome').props.onNew();tree=page.draw({});assert.ok(page.find(tree,e=>e.type?.name==='JournalEditor'))
  params=new URLSearchParams('memory=4');page.draw({});tree=page.draw({});assert.ok(page.find(tree,e=>e.type?.name==='JournalEditor'))
  params=new URLSearchParams('memory=1');page.draw({});tree=page.draw({});assert.ok(page.find(tree,e=>e.type?.name==='JournalHome'))
 }finally{page.dispose()}
 const ui=load(path.resolve('src/store/studentUiStore.ts')),saved=ui.useStudentUi()
 const menu=immersivePlayerHarness('src/features/adventure/components/overlays/NoveltiesMenu',{'@/store/adventureStore':{useAdventure:()=>fixture}})
 try{
  ui.updateStudentUi(()=>({...ui.initialStudentUiState(),initialized:true}))
  const tree=menu.draw({}),link=menu.find(tree,e=>e.props.to==='/student/journal?memory=1')
  assert.ok(link)
  const item=menu.find(tree,e=>e.props.children===link);item.props.onSelect()
  assert.ok(!ui.useStudentUi().seenUnlockIds.includes('lumi-memory:1'));assert.equal(ui.useStudentUi().seenLumiMemories.length,0)
 }finally{menu.dispose();ui.updateStudentUi(()=>saved)}
})


test('shared login accepts arbitrary credentials, toggles visibility and waits before exposing profiles', () => {
  for (const route of ['/', '/login']) {
    const html = render(route)
    assert.match(html, /Ingresa a la plataforma/)
    assert.match(html, /Acceso de demostración/)
    assert.match(html, /autocomplete="username"/i)
    assert.match(html, /autocomplete="current-password"/i)
    assert.doesNotMatch(html, /¿Qué perfil quieres ver\?/)
  }
  let entered = 0
  const login = immersivePlayerHarness('src/features/auth/components/LoginScreen')
  const props = { onEnter() { entered++ } }
  try {
    let tree = login.draw(props)
    const input = (tree, name) => login.find(tree, element => element.type === 'input' && element.props.name === name)
    const form = tree => login.find(tree, element => element.type === 'form')
    const submit = () => form(tree).props.onSubmit({ preventDefault() {} })
    submit(); assert.equal(entered, 0)
    input(tree, 'username').props.onChange({ target: { value: 'cualquier usuario + 123' } })
    tree = login.draw(props); submit(); assert.equal(entered, 0)
    input(tree, 'password').props.onChange({ target: { value: 'x' } })
    tree = login.draw(props)
    assert.equal(input(tree, 'password').props.type, 'password')
    login.find(tree, element => element.props['aria-label'] === 'Mostrar contraseña').props.onClick()
    tree = login.draw(props)
    assert.equal(input(tree, 'password').props.type, 'text')
    assert.equal(input(tree, 'password').props.value, 'x')
    login.find(tree, element => element.props['aria-label'] === 'Ocultar contraseña').props.onClick()
    tree = login.draw(props); submit()
    assert.equal(entered, 1)
    assert.equal(input(tree, 'password').props.type, 'password')
  } finally { login.dispose() }
})

test('demo access persists only its session flag, reloads and signs out without storing credentials', () => {
  const source = readFileSync('src/features/auth/lib/demoAccess.ts', 'utf8')
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const values = new Map()
  let denied = false
  const storage = {
    getItem(key) { if (denied) throw Error('storage unavailable'); return values.get(key) ?? null },
    setItem(key, value) { if (denied) throw Error('storage unavailable'); values.set(key, value) },
    removeItem(key) { if (denied) throw Error('storage unavailable'); values.delete(key) },
  }
  const fresh = () => {
    const exported = {}
    const isolated = vm.createContext({ window: { sessionStorage: storage } })
    vm.runInContext(`(function(require,exports){${js}\n})`, isolated)(name => {
      assert.equal(name, 'react')
      return { useSyncExternalStore: (_subscribe, snapshot) => snapshot() }
    }, exported)
    return exported
  }
  const access = fresh()
  assert.equal(access.useDemoAccess(), false)
  access.startDemoAccess()
  assert.deepEqual([...values], [['ov.demo-access.v1', '1']])
  const reloaded = fresh()
  assert.equal(reloaded.useDemoAccess(), true)
  reloaded.endDemoAccess()
  assert.equal(reloaded.useDemoAccess(), false)
  assert.equal(fresh().useDemoAccess(), false)
  values.set('ov.demo-access.v1', 'invalid'); assert.equal(fresh().useDemoAccess(), false)
  denied = true
  const unavailable = fresh()
  unavailable.startDemoAccess(); assert.equal(unavailable.useDemoAccess(), true)
  unavailable.endDemoAccess(); assert.equal(unavailable.useDemoAccess(), false)
})

test('shared access gate requires login before profiles and all three portals', () => {
  let pathname = '/profiles', active = false
  const gate = immersivePlayerHarness('src/features/auth/components/DemoAccessGate', {
    'react-router': { ...nativeRequire('react-router'), useLocation: () => ({ pathname }) },
    '../lib/demoAccess': { useDemoAccess: () => active },
  })
  const children = React.createElement('span', {}, 'Contenido de la plataforma')
  try {
    for (const route of ['/profiles', '/student/missions', '/parent/overview', '/counselor/home']) {
      pathname = route
      const denied = gate.draw({ children })
      assert.equal(denied.props.to, '/login')
      assert.equal(denied.props.replace, true)
      active = true; assert.equal(gate.draw({ children }), children); active = false
    }
    for (const route of ['/', '/login']) {
      pathname = route; assert.equal(gate.draw({ children }), children)
    }
  } finally { gate.dispose() }
})

test('daily journal question hides its prompt until opened, recognizes today and labels legacy answers', () => {
  const ui = load(path.resolve('src/store/studentUiStore.ts'))
  const { getDailyJournalPrompt } = load(path.resolve('src/data/content/journalPrompts.ts'))
  const { lumiDayKey } = load(path.resolve('src/lib/lumiFriendship.ts'))
  const now = new Date(), day = lumiDayKey(now), daily = getDailyJournalPrompt(now)
  const beforeUi = ui.useStudentUi(), beforeAdventure = store.useAdventure()
  const card = html => html.match(/<section aria-label="La pregunta de hoy"[\s\S]*?<\/section>/)?.[0]
  try {
    ui.updateStudentUi(() => ui.initialStudentUiState())
    const closed = render('/student/journal', { journalOnboardingSeen: true, journal: [] })
    assert.match(card(closed), /Lumi dejó una pregunta nueva para ti/)
    assert.match(card(closed), /Abrir la pregunta/)
    assert.ok(!closed.includes(daily.prompt))
    assert.ok(closed.indexOf('Lumi, hoy quiero contarte') < closed.indexOf('La pregunta de hoy'))
    assert.ok(closed.indexOf('La pregunta de hoy') < closed.indexOf('Lumi recordó algo nuevo'))
    assert.doesNotMatch(card(closed).toLowerCase(), /racha|pierdes|se pierde/)
    ui.updateStudentUi(current => ({ ...current, dailyQuestionOpenedOn: day }))
    const opened = card(render('/student/journal', { journalOnboardingSeen: true, journal: [] }))
    assert.ok(opened.includes(daily.prompt))
    assert.match(opened, />Responder<\/button>/)
    for (const tag of daily.tags) assert.ok(opened.includes(`#${tag}`))
    const answer = { ...beforeAdventure.journal[0], id: 'answer-today', linkedActivityId: `daily-prompt-${day}` }
    const answered = card(render('/student/journal', { journalOnboardingSeen: true, journal: [answer] }))
    assert.match(answered, /Ya respondiste la pregunta de hoy/)
    assert.match(answered, /Ver mi respuesta/)
    assert.doesNotMatch(answered, /Responder/)
    assert.doesNotMatch(answered.toLowerCase(), /racha|pierdes|se pierde/)
    const yesterday = lumiDayKey(new Date(now.getTime() - 86400000))
    ui.updateStudentUi(current => ({ ...current, dailyQuestionOpenedOn: yesterday }))
    const newDay = card(render('/student/journal', {
      journalOnboardingSeen: true, journal: [{ ...answer, linkedActivityId: `daily-prompt-${yesterday}` }],
    }))
    assert.match(newDay, /Abrir la pregunta/)
    assert.ok(!newDay.includes(daily.prompt))
    assert.equal(card(render('/student/journal', { journalOnboardingSeen: false })), undefined)
    const legacy = render('/student/journal', { journalOnboardingSeen: true })
    assert.match(legacy, /<article class="sx-j-entry" data-kind="daily">[\s\S]*?Pregunta del día<\/span><h3>Tema del día/)
    assert.match(legacy, /data-kind="open"/)
    assert.match(legacy, /Carta de Lumi/)
  } finally {
    ui.updateStudentUi(() => beforeUi)
    store.updateAdventure(() => beforeAdventure)
  }
})

test('daily question opening persists the Lima date, focuses Respond and passes direct editor context', () => {
  const { initialStudentUiState } = load(path.resolve('src/store/studentUiStore.ts'))
  const { getDailyJournalPrompt } = load(path.resolve('src/data/content/journalPrompts.ts'))
  let ui = initialStudentUiState(), adventure = { journal: [] }, response, read, focused = 0
  const now = new Date('2026-10-08T04:59:00Z'), daily = getDailyJournalPrompt(now)
  const page = immersivePlayerHarness('src/features/journal/components/DailyQuestionCard', {
    '@/store/studentUiStore': { useStudentUi: () => ui, updateStudentUi: update => { ui = update(ui) } },
    '@/store/adventureStore': { useAdventure: () => adventure },
  })
  const props = { now, onRespond: context => { response = context }, onOpenAnswer: entry => { read = entry } }
  const mount = tree => {
    const button = page.button(tree, 'Responder')
    if (button) button.props.ref.current = { focus() { focused++ } }
  }
  try {
    let tree = page.draw(props, mount)
    assert.ok(!page.text(tree).includes(daily.prompt))
    page.button(tree, 'Abrir la pregunta').props.onClick()
    assert.equal(ui.dailyQuestionOpenedOn, '2026-10-07')
    tree = page.draw(props, mount)
    assert.equal(focused, 1)
    assert.ok(page.text(tree).includes(daily.prompt))
    page.draw(props, mount); assert.equal(focused, 1)
    page.button(tree, 'Responder').props.onClick()
    assert.equal(response.title, 'Tema del día')
    assert.equal(response.prompt, daily.prompt)
    assert.equal(response.linkedActivityId, 'daily-prompt-2026-10-07')
    assert.equal(JSON.stringify(response.lockedTags), JSON.stringify(daily.tags))
    tree = page.draw({ ...props, now: new Date('2026-10-08T05:00:00Z') }, mount)
    assert.ok(page.button(tree, 'Abrir la pregunta'))
    assert.equal(focused, 1)
    adventure = { journal: [{ id: 'today-answer', linkedActivityId: 'daily-prompt-2026-10-08' }] }
    tree = page.draw({ ...props, now: new Date('2026-10-08T05:00:00Z') }, mount)
    assert.equal(page.button(tree, 'Responder'), undefined)
    page.find(tree, element => element.type === 'a').props.onClick({ preventDefault() {} })
    assert.equal(read.id, 'today-answer')
  } finally { page.dispose() }
})

test('daily question answers use the current journal editor, fixed tags and ordinary conversation saving', () => {
  const { getDailyJournalPrompt } = load(path.resolve('src/data/content/journalPrompts.ts'))
  const { lumiDayKey } = load(path.resolve('src/lib/lumiFriendship.ts'))
  const { getLumiBond } = load(path.resolve('src/features/journal/lib/lumiBond.ts'))
  const now = new Date(), daily = getDailyJournalPrompt(now), linkedActivityId = `daily-prompt-${lumiDayKey(now)}`
  const before = store.useAdventure()
  const page = immersivePlayerHarness('src/pages/student/StudentJournalView', {
    'react-router': { useSearchParams: () => [new URLSearchParams()] },
    '@/hooks/useLumiNow': { useLumiNow: () => now },
    '@/hooks/useReturnFocus': { useReturnFocus: () => ({}) },
  })
  try {
    store.updateAdventure(() => ({ ...store.createInitialAdventure(), journalOnboardingSeen: true }))
    const signals = JSON.stringify(store.useAdventure().readinessCheckIns)
    const counted = getLumiBond(store.useAdventure().lumiRegistrations, now).todayCounted
    let tree = page.draw({})
    const start = () => page.find(tree, element => element.type?.name === 'JournalHome').props.onDailyQuestion({
      prompt: daily.prompt, linkedActivityId, title: 'Tema del día', lockedTags: daily.tags,
    })
    start(); tree = page.draw({})
    let editor = page.find(tree, element => element.type?.name === 'JournalEditor')
    assert.equal(editor.props.title, 'Tema del día')
    assert.equal(editor.props.prompt, daily.prompt)
    assert.equal(JSON.stringify(editor.props.tags), JSON.stringify(daily.tags))
    assert.equal(JSON.stringify(editor.props.lockedTags), JSON.stringify(daily.tags))
    editor.props.onRemoveTag(daily.tags[0]); tree = page.draw({})
    editor = page.find(tree, element => element.type?.name === 'JournalEditor')
    assert.equal(JSON.stringify(editor.props.tags), JSON.stringify(daily.tags))
    const size = store.useAdventure().journal.length
    editor.props.onBack(); tree = page.draw({})
    assert.ok(page.find(tree, element => element.type?.name === 'JournalHome'))
    assert.equal(store.useAdventure().journal.length, size)
    start(); tree = page.draw({})
    editor = page.find(tree, element => element.type?.name === 'JournalEditor')
    editor.props.onBodyChange('Una reflexión sobre la pregunta de hoy.')
    editor.props.onTitleChange('Mi tema de hoy')
    tree = page.draw({}); page.find(tree, element => element.type?.name === 'JournalEditor').props.onSave()
    const saved = store.useAdventure().journal.find(entry => entry.title === 'Mi tema de hoy')
    assert.equal(saved.linkedActivityId, linkedActivityId)
    assert.equal(saved.kind, 'prompted')
    assert.equal(saved.promptShown, daily.prompt)
    assert.equal(JSON.stringify(saved.topicTags), JSON.stringify(daily.tags))
    assert.equal(JSON.stringify(saved.lockedTopicTags), JSON.stringify(daily.tags))
    assert.ok(store.useAdventure().lumiRegistrations.some(entry => entry.entryId === saved.id))
    assert.equal(getLumiBond(store.useAdventure().lumiRegistrations).todayCounted, Math.min(3, counted + 1))
    assert.equal(JSON.stringify(store.useAdventure().readinessCheckIns), signals)
    tree = page.draw({}); page.find(tree, element => element.type?.name === 'JournalHome').props.onOpen(saved)
    tree = page.draw({}); assert.equal(page.find(tree, element => element.type?.name === 'JournalDetail').props.entry.id, saved.id)
  } finally { page.dispose(); store.updateAdventure(() => before) }
})

test('daily question is omitted when its source throws or returns an empty prompt', () => {
  for (const getDailyJournalPrompt of [() => { throw Error('unavailable') }, () => ({ prompt: '  ', tags: [] })]) {
    const page = immersivePlayerHarness('src/features/journal/components/DailyQuestionCard', {
      '@/data/content/journalPrompts': { getDailyJournalPrompt },
    })
    try { assert.equal(page.draw({ now: new Date(), onRespond() {}, onOpenAnswer() {} }), null) }
    finally { page.dispose() }
  }
})

test('daily question presentation state migrates, validates dates and survives reload and tab synchronization', () => {
  const file = path.resolve('src/store/studentUiStore.ts')
  const js = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const views = load(path.resolve('src/lib/studentViews.ts'))
  let raw = JSON.stringify({ version: 1, panelCollapsed: true }), listener
  const create = () => {
    const sandbox = vm.createContext({
      localStorage: { getItem: () => raw, setItem: (_, value) => { raw = value } },
      window: { addEventListener: (_, callback) => { listener = callback } },
    })
    const exports = {}
    vm.runInContext(`(function(require,exports){${js}\n})`, sandbox)(name => name === 'react' ? { useSyncExternalStore: (_, snapshot) => snapshot() } : views, exports)
    return exports
  }
  const ui = create()
  assert.equal(ui.initialStudentUiState().dailyQuestionOpenedOn, null)
  assert.equal(ui.useStudentUi().dailyQuestionOpenedOn, null)
  assert.equal(ui.useStudentUi().panelCollapsed, true)
  for (const invalid of [null, 'yesterday', '', '2026-10-7', '2026-10-07T12:00:00Z', 20261007, {}, true]) {
    raw = JSON.stringify({ version: 1, dailyQuestionOpenedOn: invalid, panelCollapsed: true })
    listener({ key: 'ov.student-ui.v1' })
    assert.equal(ui.useStudentUi().dailyQuestionOpenedOn, null)
    assert.equal(ui.useStudentUi().panelCollapsed, true)
  }
  ui.updateStudentUi(current => ({ ...current, dailyQuestionOpenedOn: '2026-10-07' }))
  assert.equal(create().useStudentUi().dailyQuestionOpenedOn, '2026-10-07')
})
