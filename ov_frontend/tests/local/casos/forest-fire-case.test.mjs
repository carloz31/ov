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
const nativeRequire = createRequire(import.meta.url)
function fixture(saved = {}, mockRouter = false, desktop = false) {
  const cache = new Map(),
    storage = new Map(Object.entries(saved)),
    listeners = []
  let hooks = [],
    cursor = 0,
    fail = false
  const context = vm.createContext({
    console,
    Date,
    Math,
    Map,
    Set,
    URL,
    URLSearchParams,
    localStorage: {
      getItem: (k) => storage.get(k) ?? null,
      setItem(k, v) {
        if (fail) throw Error('full')
        storage.set(k, v)
      },
    },
    document: { elementFromPoint: () => ({ closest: () => ({}) }) },
    window: {
      addEventListener: (_, callback) => listeners.push(callback),
      matchMedia: () => ({ matches: desktop, addEventListener() {}, removeEventListener() {} }),
    },
  })
  function load(file) {
    const full = path.resolve(file)
    assert.ok(
      !/[\\/]features[\\/](parent|counselor)[\\/]/.test(full),
      'Protected portals are never loaded by this suite',
    )
    if (cache.has(full)) return cache.get(full)
    if (full.endsWith('.json')) return JSON.parse(readFileSync(full, 'utf8'))
    const exports = {}
    cache.set(full, exports)
    const source = ts.transpileModule(
      readFileSync(full, 'utf8').replaceAll('import.meta.env.BASE_URL', "'/'"),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          jsx: ts.JsxEmit.ReactJSX,
          target: ts.ScriptTarget.ES2022,
        },
      },
    ).outputText
    const require = (id) => {
      if (id.endsWith('.css')) return {}
      if (id === 'react-router' && mockRouter)
        return {
          ...nativeRequire(id),
          useNavigate: () => () => {},
          useSearchParams: () => [new URLSearchParams(), () => {}],
        }
      if (id === 'react/jsx-runtime') {
        const runtime = nativeRequire(id)
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
      if (id === 'react')
        return {
          ...React,
          useEffect() {},
          useMemo: (fn) => fn(),
          useRef(value) {
            const i = cursor++
            if (!(i in hooks)) hooks[i] = { current: value }
            return hooks[i]
          },
          useState(initial) {
            const i = cursor++
            if (!(i in hooks)) hooks[i] = typeof initial === 'function' ? initial() : initial
            return [
              hooks[i],
              (v) => {
                hooks[i] = typeof v === 'function' ? v(hooks[i]) : v
              },
            ]
          },
          useSyncExternalStore: (_, snapshot) => snapshot(),
        }
      if (!id.startsWith('.') && !id.startsWith('@/')) return nativeRequire(id)
      const base = id.startsWith('@/')
        ? path.resolve('src', id.slice(2))
        : path.resolve(path.dirname(full), id)
      return load([base, `${base}.ts`, `${base}.tsx`].find((f) => existsSync(f)))
    }
    vm.runInContext(`(function(require,exports){${source}\n})`, context, { filename: full })(require, exports)
    return exports
  }
  return {
    load,
    storage,
    fail(v) {
      fail = v
    },
    draw(component, props) {
      cursor = 0
      return component(props)
    },
    reset() {
      hooks = []
    },
  }
}
const copy = (v) => JSON.parse(JSON.stringify(v))
function elements(tree, predicate) {
  const result = []
  function visit(n) {
    if (Array.isArray(n)) return n.forEach(visit)
    if (!n || typeof n !== 'object') return
    if (predicate(n)) result.push(n)
    visit(n.props?.children)
  }
  visit(tree)
  return result
}
const button = (tree, text) =>
  elements(tree, (n) => n.type === 'button' && JSON.stringify(n.props.children).includes(text))[0]

function setup(saved = {}) {
  const f = fixture(saved)
  const logic = f.load('src/features/cases/lib/forestFireCaseLogic.ts')
  const data = f.load('src/data/content/forestFireCase.ts')
  const store = f.load('src/store/adventureStore.ts')
  const exploration = f.load('src/store/explorationStore.ts')
  const outcome = f.load('src/features/cases/lib/forestFireCaseOutcome.ts')
  return { f, logic, data, store, exploration, outcome }
}
function team(data, target = 14) {
  let count = 0
  return Object.fromEntries(
    data.forestFirePhases.map((phase) => [
      phase.id,
      Object.fromEntries(
        phase.problems.map((problem) => [
          problem.id,
          problem.expectedProfessionalIds.filter(() => count++ < target),
        ]),
      ),
    ]),
  )
}
function named(tree, name) {
  return elements(tree, (n) => typeof n.type === 'function' && n.type.name === name)[0]
}

test('all 15 contacts resolve to unique catalog entries and 13 pending details contain no invented profiles', () => {
  const { f, data } = setup()
  const catalog = f.load('src/data/catalog/occupations.ts').occupationCatalog
  const { occupationDetails } = f.load('src/features/discovery/lib/catalogDetails.ts')
  assert.equal(new Set(catalog.map((o) => o.id)).size, catalog.length)
  assert.equal(data.forestFireProfessionals.length, 15)
  const details = data.forestFireProfessionals.map((p) =>
    occupationDetails.find((o) => o.id === p.occupationId),
  )
  assert.ok(details.every(Boolean))
  assert.equal(details.filter((o) => o.contentStatus === 'pending').length, 13)
  for (const o of details.filter((o) => o.contentStatus === 'pending')) {
    assert.match(o.whatTheyDo, /por completar desde O\*NET/)
    assert.equal(o.onetCode, '')
    assert.deepEqual(copy(o.highPoints), [])
    assert.deepEqual(copy(o.careerIds), [])
    assert.ok(Object.values(o.interestScores).every((v) => v === 0))
  }
  const selectors = f.load('src/features/discovery/lib/catalogSelectors.ts')
  assert.equal(selectors.isAffine('psychologist', ['intereses']), undefined)
})

test('scene clues have valid positions, short summaries and configurable phase prompts', () => {
  const { data } = setup()
  for (const phase of data.forestFirePhases) {
    assert.ok(phase.listenPrompt && phase.listenPromptMobile)
    for (const message of phase.messages) {
      assert.ok(
        message.position.x >= 0 &&
          message.position.x <= 100 &&
          message.position.y >= 0 &&
          message.position.y <= 100,
      )
      assert.ok(message.summary.split(/\s+/).length <= 8)
    }
    assert.equal(
      new Set(phase.messages.map((m) => `${m.position.x},${m.position.y}`)).size,
      phase.messages.length,
    )
  }
})

test('step gates require every clue and a contact for each preceding problem', () => {
  const { logic, data } = setup()
  const phase = data.forestFirePhases[0],
    assignment = logic.createInitialAssignments()[phase.id],
    heard = phase.messages.map((m) => m.id)
  assert.equal(logic.canOpenPhaseStep(phase, assignment, [], 0), true)
  assert.equal(logic.canOpenPhaseStep(phase, assignment, heard.slice(1), 1), false)
  assert.equal(logic.canOpenPhaseStep(phase, assignment, heard, 1), true)
  assert.equal(logic.canOpenPhaseStep(phase, assignment, heard, 2), false)
  assignment[phase.problems[0].id] = ['journalist']
  assert.equal(logic.canOpenPhaseStep(phase, assignment, heard, 2), true)
  assert.equal(logic.canOpenPhaseStep(phase, assignment, heard, 3), false)
  assignment[phase.problems[1].id] = ['firefighter']
  assert.equal(logic.canOpenPhaseStep(phase, assignment, heard, 3), true)
})

test('scene cover, bounds, pointer threshold and keyboard reveal work in both viewport orientations', () => {
  const geometry = fixture().load('src/features/cases/lib/forestFireSceneGeometry.ts')
  const image = { width: 1536, height: 1024 }
  for (const viewport of [
    { width: 1280, height: 648 },
    { width: 360, height: 482 },
  ]) {
    const scene = geometry.coverScene(viewport, image)
    assert.ok(scene.width >= viewport.width && scene.height >= viewport.height)
    assert.equal(scene.width / scene.height, 1.5)
    assert.deepEqual(copy(geometry.clampSceneOffset({ x: 10000, y: 10000 }, viewport, scene)), { x: 0, y: 0 })
    assert.deepEqual(copy(geometry.clampSceneOffset({ x: -10000, y: -10000 }, viewport, scene)), {
      x: viewport.width - scene.width,
      y: viewport.height - scene.height,
    })
    const centered = geometry.centerScene(viewport, scene)
    const point = { x: 82, y: 79 }
    const focused = geometry.revealScenePoint(centered, point, viewport, scene)
    assert.ok(focused.x + scene.width * 0.82 <= viewport.width - 26)
    assert.ok(focused.y + scene.height * 0.79 <= viewport.height - 26)
    assert.ok(focused.x >= viewport.width - scene.width && focused.x <= 0)
    if (viewport.width === 360) assert.ok(centered.x + scene.width * 0.82 > viewport.width)
  }
  assert.equal(geometry.isSceneDrag({ x: 0, y: 0 }, { x: 6, y: 0 }), false)
  assert.equal(geometry.isSceneDrag({ x: 0, y: 0 }, { x: 5, y: 5 }), true)
})

test('listen opens individual clues, suppresses clicks after dragging, and retains dismissed phase help', () => {
  const f = fixture(),
    { ListenScreen } = f.load('src/features/cases/components/ForestFireScene.tsx')
  const phase = f.load('src/data/content/forestFireCase.ts').forestFirePhases[0]
  const heard = []
  const props = {
    phase,
    heard: [],
    helpSeen: false,
    onHelpSeen() {},
    onHear: (ids) => heard.push(...ids),
    onNext() {},
  }
  let tree = f.draw(ListenScreen, props)
  assert.ok(button(tree, 'Entendido'))
  assert.equal(elements(tree, (n) => typeof n.type === 'function' && n.type.name === 'ClueList').length, 0)
  const windowNode = elements(tree, (n) => n.props?.className === 'ff-scene-window')[0]
  const event = {
    button: 0,
    pointerId: 1,
    clientX: 0,
    clientY: 0,
    target: { closest: () => ({ dataset: { clueId: phase.messages[0].id } }) },
    currentTarget: { setPointerCapture() {}, hasPointerCapture: () => true, releasePointerCapture() {} },
  }
  windowNode.props.onPointerDown(event)
  windowNode.props.onPointerMove({ ...event, clientX: 20 })
  windowNode.props.onPointerUp({ ...event, clientX: 20 })
  assert.deepEqual(heard, [])
  windowNode.props.onPointerDown(event)
  windowNode.props.onPointerUp(event)
  assert.deepEqual(heard, [phase.messages[0].id])
  tree = f.draw(ListenScreen, { ...props, heard })
  assert.equal(button(tree, 'Escucha a las').props.disabled, true)
  elements(
    tree,
    (n) => n.type === 'button' && n.props['data-clue-id'] === phase.messages[1].id,
  )[0].props.onClick({ detail: 0 })
  assert.equal(new Set(heard).size, 2)
  f.reset()
  tree = f.draw(ListenScreen, { ...props, helpSeen: true })
  assert.equal(button(tree, 'Entendido'), undefined)
  const help = elements(tree, (n) => n.props?.['aria-label'] === '¿Qué hago aquí?')[0]
  help.props.onClick()
  tree = f.draw(ListenScreen, { ...props, helpSeen: true })
  assert.ok(button(tree, 'Entendido'))
})

test('contact drag and plus share assignment, desktop resume replaces the list, mobile has no drag, and zero disables adding', () => {
  for (const desktop of [true, false]) {
    const f = fixture({}, false, desktop),
      { ProfessionalDirectory } = f.load('src/features/cases/components/ProfessionalDirectory.tsx')
    const added = [],
      dragging = []
    const props = {
      selectedIds: [],
      budgetRemaining: 16,
      problemTitle: 'Control del fuego',
      onCall: (id) => added.push(id),
      onDragContact: (id, over) => dragging.push([id, over]),
    }
    let tree = f.draw(ProfessionalDirectory, props)
    const card = elements(tree, (n) => n.type === 'article' && n.props.className.startsWith('ff-contact'))[0]
    assert.equal(!!card.props['data-draggable'], desktop)
    const event = {
      button: 0,
      pointerId: 1,
      clientX: 0,
      clientY: 0,
      preventDefault() {},
      target: { closest: () => null },
      currentTarget: { setPointerCapture() {}, hasPointerCapture: () => true, releasePointerCapture() {} },
    }
    card.props.onPointerDown(event)
    card.props.onPointerMove({ ...event, clientX: 20 })
    card.props.onPointerUp({ ...event, clientX: 20 })
    assert.deepEqual(added, desktop ? ['firefighter'] : [])
    if (desktop) assert.deepEqual(dragging[0], ['firefighter', true])
    elements(tree, (n) => n.props?.['aria-label'] === 'Agregar a Mateo Salazar al equipo')[0].props.onClick()
    assert.equal(added.at(-1), 'firefighter')
    button(tree, 'Hoja de vida').props.onClick({ currentTarget: {} })
    tree = f.draw(ProfessionalDirectory, props)
    const list = elements(tree, (n) => n.props?.className === 'ff-directory-list')[0]
    assert.equal(list.props.hidden, desktop)
    assert.equal(!!named(tree, 'Dialog').props.open, !desktop)
    assert.ok(button(tree, 'Agregar al equipo de'))
    tree = f.draw(ProfessionalDirectory, { ...props, selectedIds: ['firefighter'], budgetRemaining: 0 })
    assert.equal(button(tree, 'Ya está en tu equipo').props.disabled, true)
    assert.ok(elements(tree, (n) => n.props?.className === 'ff-contact-add').every((n) => n.props.disabled))
  }
})

test('case exit follows the activity form and distinguishes discarded attempts from saved results', () => {
  const f = fixture(),
    { ForestFireCaseHeader } = f.load('src/features/cases/components/ForestFireCaseHeader.tsx')
  let exited = false
  const props = {
    label: 'Emergencia',
    progress: 33,
    budgetRemaining: 16,
    onClose() {
      exited = true
    },
  }
  let tree = f.draw(ForestFireCaseHeader, props)
  elements(tree, (n) => n.props?.['aria-label'] === 'Salir del caso')[0].props.onClick()
  tree = f.draw(ForestFireCaseHeader, props)
  const content = named(tree, 'DialogContent')
  assert.equal(content.props.className, 'sx-root sx-glass-dark sx-player-exit')
  assert.equal(content.props.showCloseButton, false)
  assert.match(JSON.stringify(content.props.children), /Este intento no se guardará/)
  assert.equal(exited, false)
  button(tree, 'Seguir en la actividad').props.onClick()
  tree = f.draw(ForestFireCaseHeader, props)
  assert.equal(named(tree, 'Dialog').props.open, false)
  tree = f.draw(ForestFireCaseHeader, { ...props, finished: true })
  assert.match(JSON.stringify(named(tree, 'DialogContent').props.children), /Tu resultado ya está guardado/)
  button(tree, 'Volver al mapa').props.onClick()
  assert.equal(exited, true)
})

test('assignments charge separately across problems, stop at 16, and removal returns budget at zero', () => {
  const { logic, data } = setup()
  let a = logic.createInitialAssignments()
  a = logic.toggleAssignment(a, 'emergency', 'fire-control', 'firefighter')
  a = logic.toggleAssignment(a, 'emergency', 'people-evacuation', 'firefighter')
  assert.equal(logic.getBudgetSpent(a), 2)
  for (const p of data.forestFireProfessionals)
    a = logic.toggleAssignment(a, 'recovery', 'ecosystem-follow-up', p.id)
  assert.equal(logic.getBudgetSpent(a), 16)
  assert.equal(logic.toggleAssignment(a, 'stabilization', 'animal-protection', 'veterinarian'), a)
  a = logic.toggleAssignment(a, 'emergency', 'fire-control', 'firefighter')
  assert.equal(logic.getBudgetSpent(a), 15)
  a = logic.toggleAssignment(a, 'stabilization', 'animal-protection', 'veterinarian')
  assert.equal(logic.getBudgetSpent(a), 16)
})

for (const score of [9, 10, 14])
  test(`report records ${score} points and rewards only at the pass threshold`, () => {
    const { logic, data, store, exploration, outcome } = setup()
    const a = team(data, score),
      r = outcome.finishForestFireAttempt(a)
    assert.equal(logic.FOREST_FIRE_MAX_SATISFACTION, 14)
    assert.equal(logic.FOREST_FIRE_PASS_SCORE, 10)
    assert.equal(logic.getTotalSatisfaction(a), score)
    assert.equal(r.score, score)
    assert.equal(store.useAdventure().caseBestScores['forest-fire'], score)
    assert.equal(store.useAdventure().solvedCaseIds.includes('forest-fire'), score >= 10)
    assert.equal(r.newIconIds.length > 0, score >= 10)
    assert.equal(new Set(r.newIconIds).size, r.newIconIds.length)
    if (score < 10)
      assert.ok(
        exploration
          .getExploration()
          .profiles.filter((p) => data.forestFireProfessionals.some((f) => f.occupationId === p.occupationId))
          .every((p) => p.discoveryState === 'unused'),
      )
  })

test('retries preserve rewards and explored profiles, improve best score, and never duplicate icons', () => {
  const { data, store, exploration, outcome } = setup()
  outcome.finishForestFireAttempt(team(data, 10))
  exploration.updateExploration((s) => ({
    ...s,
    profiles: s.profiles.map((p) =>
      p.occupationId === 'firefighter' ? { ...p, interested: true, discoveryState: 'explored' } : p,
    ),
  }))
  const lower = outcome.finishForestFireAttempt(team(data, 9))
  assert.deepEqual(copy(lower.newIconIds), [])
  assert.equal(store.useAdventure().caseBestScores['forest-fire'], 10)
  assert.ok(store.useAdventure().solvedCaseIds.includes('forest-fire'))
  const higher = outcome.finishForestFireAttempt(team(data, 14))
  assert.equal(store.useAdventure().caseBestScores['forest-fire'], 14)
  assert.ok(higher.newIconIds.length > 0)
  assert.deepEqual(copy(outcome.finishForestFireAttempt(team(data, 14)).newIconIds), [])
  const fire = exploration.getExploration().profiles.find((p) => p.occupationId === 'firefighter')
  assert.equal(fire.discoveryState, 'explored')
  assert.equal(fire.interested, true)
})

test('legacy migration resets only this case and its icons once, preserving favorites, visits and other progress', () => {
  const old = setup()
  const adventure = {
    ...copy(old.store.createInitialAdventure()),
    solvedCaseIds: ['forest-fire', 'city-festival'],
    visits: ['paramedic'],
    bookmarks: ['favorite'],
  }
  delete adventure.forestFireScoringVersion
  delete adventure.caseBestScores
  const exploration = copy(old.exploration.getExploration())
  delete exploration.forestFireIconsVersion
  exploration.profiles.push({ occupationId: 'firefighter', discoveryState: 'explored', interested: true })
  const migrated = setup({
    'ov.student-adventure.v1': JSON.stringify(adventure),
    'ov.student-exploration.v1': JSON.stringify(exploration),
  })
  assert.deepEqual(copy(migrated.store.useAdventure().solvedCaseIds), ['city-festival'])
  assert.deepEqual(copy(migrated.store.useAdventure().visits), ['paramedic'])
  assert.deepEqual(copy(migrated.store.useAdventure().bookmarks), ['favorite'])
  const fire = migrated.exploration.getExploration().profiles.find((p) => p.occupationId === 'firefighter')
  assert.equal(fire.discoveryState, 'unused')
  assert.equal(fire.interested, true)
  assert.ok(
    migrated.exploration
      .getExploration()
      .profiles.some((p) => p.occupationId === 'sound-technician' && p.discoveryState === 'explored'),
  )
  migrated.outcome.finishForestFireAttempt(team(migrated.data, 14))
  const reloaded = setup(Object.fromEntries(migrated.f.storage))
  assert.ok(reloaded.store.useAdventure().solvedCaseIds.includes('forest-fire'))
  assert.equal(reloaded.store.useAdventure().caseBestScores['forest-fire'], 14)
  assert.equal(
    reloaded.exploration.getExploration().profiles.find((p) => p.occupationId === 'firefighter')
      .discoveryState,
    'unlocked',
  )
})

test('drawer distinguishes unattempted, zero-score, incomplete and passed attempts', () => {
  const { logic, f } = setup()
  const state = { solvedCaseIds: [], caseBestScores: {} }
  assert.equal(logic.getForestFireCaseStatus(state).badge, 'Disponible')
  state.caseBestScores['forest-fire'] = 0
  assert.equal(logic.getForestFireCaseStatus(state).badge, 'En progreso')
  const { ForestFireCaseProgress } = f.load('src/features/cases/components/ForestFireCaseProgress.tsx')
  assert.match(
    renderToStaticMarkup(React.createElement(ForestFireCaseProgress, { adventure: state })),
    /Te faltan 10 puntos/,
  )
  state.caseBestScores['forest-fire'] = 14
  state.solvedCaseIds.push('forest-fire')
  assert.equal(logic.getForestFireCaseStatus(state).actionLabel, 'Jugar de nuevo')
  assert.match(
    renderToStaticMarkup(React.createElement(ForestFireCaseProgress, { adventure: state })),
    /Respuesta completa/,
  )
})

test('both map drawers expose the same status, score and action for every case state', () => {
  for (const [score, passed, badge, action] of [
    [undefined, false, 'Disponible', 'Iniciar'],
    [0, false, 'En progreso', 'Intentar de nuevo'],
    [9, false, 'En progreso', 'Intentar de nuevo'],
    [10, true, 'Superado', 'Jugar de nuevo'],
  ]) {
    const f = fixture({}, true)
    const store = f.load('src/store/adventureStore.ts')
    if (score !== undefined) store.recordCaseScore('forest-fire', score)
    if (passed) store.completeCase('forest-fire')
    const state = store.useAdventure(),
      journey = f.load('src/store/journeyStore.ts').useJourney()
    const map = loadMapPoints(f.load)
    const point = map.getCiudadPoints(state, journey).find((p) => p.id === 'forest-fire')
    const details = map.getPointDetails(point, state, journey)
    assert.equal(details.badge, badge)
    assert.equal(details.actionLabel, action)
    assert.equal(details.caseProgress, true)
  }
})

test('resume uses catalog fields and separate tab links, with a safe missing-entry fallback', () => {
  const { f, data } = setup()
  const { ProfessionalResume } = f.load('src/features/cases/components/ProfessionalResume.tsx')
  let html = renderToStaticMarkup(
    React.createElement(ProfessionalResume, { professional: data.forestFireProfessionals[0] }),
  )
  assert.match(html, /por completar desde O\*NET/)
  assert.match(html, /target="_blank"/)
  assert.ok(!html.includes(data.forestFireProfessionals[0].description))
  html = renderToStaticMarkup(
    React.createElement(ProfessionalResume, {
      professional: { ...data.forestFireProfessionals[0], occupationId: 'missing' },
    }),
  )
  assert.match(html, /Ficha en preparación/)
  assert.match(html, /Mateo Salazar/)
})

test('phase feedback uses neutral participation and missing narratives without naming the absent role', () => {
  const { f, data } = setup()
  const { PhaseResultScreen } = f.load('src/features/cases/components/PhaseResultScreen.tsx')
  const phase = data.forestFirePhases[0]
  const html = renderToStaticMarkup(
    React.createElement(PhaseResultScreen, {
      phase,
      assignments: { 'fire-control': ['journalist'], 'people-evacuation': ['photographer'] },
      remaining: 14,
      onContinue() {},
    }),
  )
  assert.match(html, /No era su función aquí/)
  assert.match(html, /Quedó sin atender/)
  assert.match(html, /is-neutral/)
  assert.ok(!html.includes('Meteorólogo'))
})

test('final report hides extra screens and budget evaluation and switches buttons and rewards by score', () => {
  const { f, data } = setup(),
    { FinalReportScreen } = f.load('src/features/cases/components/FinalReportScreen.tsx')
  for (const score of [9, 10, 14]) {
    const html = renderToStaticMarkup(
      React.createElement(FinalReportScreen, {
        assignments: team(data, score),
        bestScore: score,
        newIconIds: ['firefighter'],
        onRestart() {},
        onFinish() {},
        extraReason: 'hidden',
        extraProfessionalId: 'journalist',
      }),
    )
    assert.ok(!/presupuesto óptimo|punto adicional|Tu aporte profesional adicional/.test(html))
    assert.equal(html.includes('Testimonio desbloqueado'), score >= 10)
    assert.equal(html.includes('Intentar de nuevo'), score < 10)
    assert.equal(html.includes('Intentar llegar a 14'), score >= 10 && score < 14)
  }
})

test('actual case flow enforces gates, allows review changes, records once on report and starts a clean retry', () => {
  const { f, data, store } = setup(),
    { ForestFireCaseView } = f.load('src/features/cases/components/ForestFireCaseView.tsx')
  let closes = 0,
    tree
  const draw = () =>
    (tree = f.draw(ForestFireCaseView, {
      onClose() {
        closes++
      },
    }))
  draw()
  assert.equal(button(tree, 'Problema 1').props.disabled, true)
  const heard = () =>
    named(tree, 'ListenScreen').props.onHear(
      data.forestFirePhases
        .find((p) => p.id === named(tree, 'ListenScreen').props.phase.id)
        .messages.map((m) => m.id),
    )
  for (const phase of data.forestFirePhases) {
    if (phase.number > 1) {
      button(tree, 'Comenzar fase').props.onClick()
      draw()
    }
    heard()
    draw()
    named(tree, 'ListenScreen').props.onNext()
    draw()
    for (const problem of phase.problems) {
      assert.equal(named(tree, 'StepActions').props.disabled, true)
      for (const id of problem.expectedProfessionalIds) {
        named(tree, 'ProfessionalDirectory').props.onCall(id)
        draw()
      }
      named(tree, 'StepActions').props.onNext()
      draw()
    }
    assert.equal(named(tree, 'StepActions').props.label, 'Confirmar equipo')
    named(tree, 'StepActions').props.onNext()
    draw()
    named(tree, 'PhaseResultScreen').props.onContinue()
    draw()
  }
  assert.equal(named(tree, 'FinalReportScreen').props.bestScore, 14)
  assert.ok(store.useAdventure().solvedCaseIds.includes('forest-fire'))
  draw()
  assert.equal(named(tree, 'FinalReportScreen').props.newIconIds.length > 0, true)
  named(tree, 'FinalReportScreen').props.onRestart()
  draw()
  assert.equal(button(tree, 'Comenzar fase').props.children[0], 'Comenzar fase')
  button(tree, 'Comenzar fase').props.onClick()
  draw()
  assert.equal(named(tree, 'ListenScreen').props.heard.length, 0)
  assert.equal(store.useAdventure().caseBestScores['forest-fire'], 14)
  assert.equal(closes, 0)
})

test('abandonment and budget game-over do not record a score or reward', () => {
  const { f, data, store } = setup(),
    { ForestFireCaseView } = f.load('src/features/cases/components/ForestFireCaseView.tsx')
  let tree,
    closed = false
  const draw = () =>
    (tree = f.draw(ForestFireCaseView, {
      onClose() {
        closed = true
      },
    }))
  draw()
  named(tree, 'ForestFireCaseHeader').props.onClose()
  assert.equal(closed, true)
  assert.deepEqual(copy(store.useAdventure().caseBestScores), {})
  f.reset()
  draw()
  named(tree, 'ListenScreen').props.onHear(data.forestFirePhases[0].messages.map((m) => m.id))
  draw()
  named(tree, 'ListenScreen').props.onNext()
  draw()
  for (const p of data.forestFireProfessionals) {
    named(tree, 'ProfessionalDirectory').props.onCall(p.id)
    draw()
  }
  named(tree, 'StepActions').props.onNext()
  draw()
  named(tree, 'ProfessionalDirectory').props.onCall('firefighter')
  draw()
  named(tree, 'StepActions').props.onNext()
  draw()
  named(tree, 'StepActions').props.onNext()
  draw()
  named(tree, 'PhaseResultScreen').props.onContinue()
  draw()
  assert.ok(button(tree, 'Intentar de nuevo'))
  assert.deepEqual(copy(store.useAdventure().caseBestScores), {})
})

test('storage failure keeps the result and rewards in memory and exposes existing store errors', () => {
  const { f, data, store, exploration, outcome } = setup()
  f.fail(true)
  outcome.finishForestFireAttempt(team(data, 14))
  assert.equal(store.useAdventure().caseBestScores['forest-fire'], 14)
  assert.equal(store.useAdventureStorageError(), true)
  assert.equal(exploration.useExplorationError(), true)
})
