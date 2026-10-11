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
function fixture(saved = {}) {
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
    window: { addEventListener: (_, callback) => listeners.push(callback) },
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
          useRef: (value) => ({ current: value }),
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
  load('src/config/studentDemoScope.ts').studentDemoEnabled = false
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
const componentOptions = (tree) =>
  elements(tree, (n) => n.props?.state && n.props?.onClick && typeof n.type === 'function')
const setup = () => {
  const f = fixture()
  return {
    f,
    logic: f.load('src/lib/challenges.ts'),
    c: f.load('src/data/content/challenges.ts').challenges[0],
    journey: f.load('src/lib/activities/logic.ts'),
  }
}

test('enemy publication rejects insufficient banks, invalid lives/options/correct keys and unsafe guessing odds', () => {
  const { logic, c } = setup()
  assert.deepEqual(copy(logic.validateChallenge(c)), [])
  assert.ok(Math.abs(logic.randomWinProbability(5, 3, 4) - 0.01287841796875) < 1e-10)
  assert.ok(logic.randomWinProbability(3, 3, 3) > 0.2)
  for (const patch of [
    { banco: c.banco.slice(0, 6) },
    { vidasEnemigo: 0 },
    { vidasEstudiante: 1.2 },
    { opcionesPorPregunta: 2 },
    { requisitos: [] },
    { vidasEnemigo: 3, vidasEstudiante: 3, opcionesPorPregunta: 4 },
  ])
    assert.ok(logic.validateChallenge({ ...c, ...patch }).length)
  const bad = copy(c)
  bad.banco[0].opciones.pop()
  assert.ok(logic.validateChallenge(bad).length)
  const missing = copy(c)
  missing.banco[0].correcta = 'no'
  assert.ok(logic.validateChallenge(missing).length)
  const duplicate = copy(c)
  duplicate.banco[0].opciones[1].id = duplicate.banco[0].opciones[0].id
  assert.ok(logic.validateChallenge(duplicate).length)
})

test('all required sheets and activities must be completed; map keeps the enemy visible while locked', () => {
  const { f, logic, c, journey } = setup(),
    state = journey.initialJourney()
  const multi = {
    ...c,
    requisitos: [
      ...c.requisitos,
      { tipo: 'ficha', id: 'second', titulo: 'Segunda' },
      { tipo: 'actividad', id: 'task', titulo: 'Actividad' },
    ],
  }
  state.readResourceIds = []
  state.resources = ['ficha-mitos']
  assert.equal(logic.canStartChallenge(multi, state), false)
  assert.equal(logic.canStartChallenge(c, state), false, 'Saving a sheet does not count as reading it')
  state.readResourceIds = ['ficha-mitos', 'second']
  assert.equal(logic.canStartChallenge(multi, state), false)
  state.progress.task = { estado: 'completada' }
  assert.equal(logic.canStartChallenge(multi, state), true)
  const adventure = f
    .load('src/store/adventureStore.ts')
    .createInitialAdventure()
  const map = loadMapPoints(f.load)
  const locked = map.getCiudadPoints(adventure, journey.initialJourney()).find((p) => p.id === c.id)
  assert.equal(locked.status, 'locked')
  assert.match(map.getPointDetails(locked, adventure, journey.initialJourney()).requirement, /Pendiente/)
  assert.equal(map.getCiudadPoints(adventure, state).find((p) => p.id === c.id).status, 'available')
})

test('battle shuffles without repeats and prioritizes unused questions on retry', () => {
  const { logic, c } = setup(),
    first = logic.startBattle(c, [], () => 0.5)
  assert.equal(new Set(first.questions.map((q) => q.id)).size, c.banco.length)
  const previous = first.questions.slice(0, 3).map((q) => q.id),
    next = logic.startBattle(c, previous, () => 0.3)
  assert.ok(next.questions.slice(0, c.banco.length - 3).every((q) => !previous.includes(q.id)))
  assert.equal(logic.answerBattle(first, 'unknown'), first)
  const hit = logic.answerBattle(first, first.questions[0].correcta)
  assert.equal(hit.enemyLife, 4)
  assert.equal(hit.sparks, 3)
  assert.equal(logic.answerBattle(hit, hit.questions[0].correcta), hit)
})

test('abandonment records nothing, defeat changes only results, first victory grants completion and reward once', () => {
  const { logic, c, journey } = setup()
  let state = journey.initialJourney(),
    b = logic.startBattle(c, [], () => 0.2)
  state.drafts.original = 'Keep'
  state.pieces.push('old')
  assert.equal(logic.recordBattle(c, b, state), state)
  for (let i = 0; i < 3; i++) {
    b = logic.answerBattle(
      b,
      b.questions[b.index].opciones.find((o) => o.id !== b.questions[b.index].correcta).id,
    )
    if (!b.finished) b = { ...b, selected: undefined, index: b.index + 1 }
  }
  const lost = logic.recordBattle(c, b, state)
  assert.equal(lost.challengeResults.length, 1)
  for (const k of Object.keys(state).filter((k) => k !== 'challengeResults'))
    assert.deepEqual(copy(lost[k]), copy(state[k]))
  b = logic.startBattle(c)
  for (let i = 0; i < 5; i++) {
    b = logic.answerBattle(b, b.questions[b.index].correcta)
    if (!b.finished) b = { ...b, selected: undefined, index: b.index + 1 }
  }
  state = logic.recordBattle(c, b, lost)
  assert.equal(state.progress[c.id].estado, 'completada')
  assert.ok(state.resources.includes('ficha-luz-rumor'))
  assert.equal(state.challengeResults.at(-1).evento, 'COMPLETA_ACTIVIDAD')
  assert.equal(state.challengeResults.at(-1).logroOculto, 'I10')
  assert.equal(logic.recordBattle(c, b, state), state)
})

test('challenge results, rewards and hidden badge survive reload and storage failure is retryable', () => {
  const { f, logic, c } = setup(),
    store = f.load('src/store/journeyStore.ts')
  let b = logic.startBattle(c)
  for (let i = 0; i < 5; i++) {
    b = logic.answerBattle(b, b.questions[b.index].correcta)
    if (!b.finished) b = { ...b, selected: undefined, index: b.index + 1 }
  }
  f.fail(true)
  assert.equal(
    store.updateJourney((s) => logic.recordBattle(c, b, s)),
    false,
  )
  assert.equal(store.useJourney().progress[c.id], undefined)
  f.fail(false)
  assert.equal(
    store.updateJourney((s) => logic.recordBattle(c, b, s)),
    true,
  )
  const reload = fixture(Object.fromEntries(f.storage)),
    loaded = reload.load('src/store/journeyStore.ts').useJourney()
  assert.equal(loaded.challengeResults[0].vidasRestantes, 3)
  assert.ok(
    reload
      .load('src/features/backpack/lib/challengeResources.ts')
      .getStudentTravelResources()
      .some((r) => r.id === 'ficha-luz-rumor'),
  )
  const adventure = reload
    .load('src/store/adventureStore.ts')
    .createInitialAdventure()
  assert.equal(
    reload
      .load('src/features/discovery/lib/passport.ts')
      .getStudentAchievementGroups(adventure, loaded)
      .flatMap((g) => g.items)
      .find((b) => b.code === 'I10').done,
    true,
  )
})

test('first-attempt metric counts one first result per student in timestamp order', () => {
  const { logic, c } = setup()
  const results = [
    { estudianteId: 'a', actividadId: c.id, fechaHora: '2026-10-02', victoria: true },
    { estudianteId: 'a', actividadId: c.id, fechaHora: '2026-10-01', victoria: false },
    { estudianteId: 'b', actividadId: c.id, fechaHora: '2026-10-01', victoria: true },
  ]
  assert.deepEqual(copy(logic.firstAttemptVictoryRate(results, c.id)), { students: 2, percent: 50 })
})

test('student checks resolve binary questions immediately and reveal other questions on attempt two', () => {
  const f = fixture(),
    { evaluateStudentCheck: check } = f.load('src/features/activities/lib/checks.ts')
  const myths = JSON.parse(readFileSync('src/data/activities/contenidos/encuentro_mitos.json', 'utf8'))
  const single = myths.nodos.find((n) => n.id === 'e08'),
    binary = myths.nodos.find((n) => n.id === 'e11')
  const hint = check(single, ['a'], 0)
  assert.equal(hint.final, false)
  assert.equal(hint.title, 'Casi. Piénsalo una vez más.')
  assert.equal(hint.explanation, single.opciones[0].retroalimentacion)
  assert.equal(check(single, ['c'], 1).final, true)
  assert.equal(check(binary, ['v'], 0).final, true)
  assert.equal(check(single, ['b'], 0).correct, true)
})

test('single check UI blocks the first error, keeps the correct answer hidden and completed reviews record nothing', () => {
  const f = fixture(),
    store = f.load('src/store/journeyStore.ts'),
    { QuestionNode } = f.load('src/features/activities/components/nodes/QuestionNode.tsx')
  const activity = f.load('src/data/activities/content.ts').activities.find((a) => a.id === 'enc-mitos'),
    node = activity.nodos.find((n) => n.id === 'e08')
  const props = { activity, node, onContinue() {}, onResources() {} }
  let tree = f.draw(QuestionNode, props)
  assert.equal(button(tree, 'Comprobar').props.disabled, true)
  componentOptions(tree)
    .find((o) => o.props.text === node.opciones[0].texto)
    .props.onClick()
  tree = f.draw(QuestionNode, props)
  button(tree, 'Comprobar').props.onClick()
  tree = f.draw(QuestionNode, props)
  assert.equal(componentOptions(tree)[0].props.state, 'incorrect')
  assert.equal(componentOptions(tree)[0].props.disabled, true)
  assert.ok(componentOptions(tree).every((o) => !['correct', 'missing'].includes(o.props.state)))
  componentOptions(tree)[1].props.onClick()
  tree = f.draw(QuestionNode, props)
  button(tree, 'Comprobar de nuevo').props.onClick()
  tree = f.draw(QuestionNode, props)
  assert.ok(button(tree, 'Continuar el camino'))
  assert.equal(store.useJourney().attempts[0].correcta, false)
  assert.equal(store.useJourney().attempts[1].correcta, true)
  store.updateJourney((s) => ({ ...s, progress: { [activity.id]: { estado: 'completada' } } }))
  f.reset()
  tree = f.draw(QuestionNode, props)
  assert.ok(componentOptions(tree).every((o) => o.props.state === 'idle'))
  const count = store.useJourney().attempts.length
  componentOptions(tree)[1].props.onClick()
  tree = f.draw(QuestionNode, props)
  button(tree, 'Comprobar').props.onClick()
  assert.equal(store.useJourney().attempts.length, count)
})

test('multiple checks keep valid picks editable and reveal unmarked correct answers with explanations only at the end', () => {
  const f = fixture(),
    { QuestionNode } = f.load('src/features/activities/components/nodes/QuestionNode.tsx')
  const activity = f.load('src/data/activities/content.ts').activities.find((a) => a.id === 'enc-mitos'),
    node = activity.nodos.find((n) => n.formato === 'opcion_multiple')
  const props = { activity, node, onContinue() {}, onResources() {} }
  let tree = f.draw(QuestionNode, props)
  componentOptions(tree)
    .find((o) => o.props.text === node.opciones.find((o) => o.correcta).texto)
    .props.onClick()
  tree = f.draw(QuestionNode, props)
  componentOptions(tree)
    .find((o) => o.props.text === node.opciones.find((o) => !o.correcta).texto)
    .props.onClick()
  tree = f.draw(QuestionNode, props)
  button(tree, 'Comprobar').props.onClick()
  tree = f.draw(QuestionNode, props)
  assert.ok(
    componentOptions(tree)
      .filter((o) => o.props.state === 'incorrect')
      .every((o) => o.props.explanation && o.props.disabled),
  )
  assert.ok(componentOptions(tree).some((o) => o.props.state === 'selected' && !o.props.disabled))
  assert.ok(componentOptions(tree).every((o) => o.props.state !== 'correct'))
  button(tree, 'Comprobar de nuevo').props.onClick()
  tree = f.draw(QuestionNode, props)
  const missing = componentOptions(tree).filter((o) => o.props.state === 'missing')
  assert.ok(missing.length)
  assert.ok(missing.every((o) => o.props.label.startsWith('También era') && o.props.explanation))
})

test('unexpected destinations prioritize new families, exclude plans/favorites/current, use last visit for fallback', () => {
  const f = fixture(),
    { chooseUnexpected: choose } = f.load('src/features/discovery/lib/unexpected.ts')
  const careers = [
    { id: 'a', familyId: 'one' },
    { id: 'b', familyId: 'one' },
    { id: 'c', familyId: 'two' },
    { id: 'd', familyId: 'three' },
  ]
  const occupations = [
    { id: 'oa', careerIds: ['a'] },
    { id: 'ob', careerIds: ['b'] },
    { id: 'oc', careerIds: ['c'] },
  ]
  const visits = [{ tipo: 'VISTA_CARRERA', referencia: 'a', fechaHora: '2026-01-01' }]
  const args = {
    kind: 'career',
    currentId: 'a',
    careers,
    occupations,
    visits,
    excluded: ['d'],
    random: () => 0,
  }
  assert.equal(choose(args).id, 'c')
  assert.equal(choose({ ...args, kind: 'occupation', currentId: 'oa' }).id, 'oc')
  const all = [
    ...visits,
    { tipo: 'VISTA_CARRERA', referencia: 'b', fechaHora: '2026-01-02' },
    { tipo: 'VISTA_CARRERA', referencia: 'c', fechaHora: '2026-01-03' },
    { tipo: 'VISTA_CARRERA', referencia: 'b', fechaHora: '2026-01-04' },
    { tipo: 'VISTA_CARRERA', referencia: 'd', fechaHora: '2026-01-04' },
  ]
  assert.deepEqual(copy(choose({ ...args, visits: all })), { id: 'c', revisiting: true })
  assert.equal(choose({ ...args, excluded: ['b', 'c', 'd'] }), undefined)
})

test('catalog visit migration preserves older visited families, favorites and badge selections', () => {
  const f = fixture(),
    d = f.load('src/store/discoveryStore.ts'),
    old = copy(d.initialDiscoveryState())
  delete old.catalogVisits
  old.viewedCareerIds = ['psychology']
  old.profileBadges = ['I1']
  old.profileBadgesConfigured = true
  const normalized = d.normalizeDiscoveryState(old)
  assert.equal(d.validDiscoveryState(normalized), true)
  assert.equal(normalized.catalogVisits[0].tipo, 'VISTA_CARRERA')
  assert.deepEqual(copy(normalized.profileBadges), ['I1'])
})

test('progress has step narration and star spark; finish removes duplicate reward text and exposes sheet action', () => {
  const f = fixture(),
    { PlayerTopBar } = f.load('src/features/activities/components/PlayerTopBar.tsx'),
    { FinishScreen } = f.load('src/features/activities/components/FinishScreen.tsx')
  const activity = f.load('src/data/activities/content.ts').activities.find((a) => a.id === 'enc-mitos')
  const render = (element) => renderToStaticMarkup(React.createElement(MemoryRouter, {}, element))
  const normal = render(
    React.createElement(PlayerTopBar, {
      activity,
      finished: false,
      index: 2,
      total: 10,
      progress: 30,
      onClose() {},
    }),
  )
  assert.match(normal, /aria-valuetext="Paso 3 de 10"/)
  assert.match(normal, /width:70%/)
  assert.doesNotMatch(normal, /anim-spark/)
  const moment = render(
    React.createElement(PlayerTopBar, {
      activity,
      finished: false,
      index: 2,
      total: 10,
      progress: 30,
      nuevoMomento: true,
      onClose() {},
    }),
  )
  assert.match(moment, /anim-spark/)
  const store = f.load('src/store/journeyStore.ts')
  store.updateJourney((s) => ({
    ...s,
    resources: ['ficha-mitos'],
    pieces: ['pieza-plaza'],
    progress: { [activity.id]: { estado: 'completada' } },
  }))
  const finish = render(React.createElement(FinishScreen, { activity, onClose() {}, onResources() {} }))
  assert.doesNotMatch(finish, /Obtuviste:/)
  assert.match(finish, /Nuevo en tu mochila/)
  assert.match(finish, /href="\/student\/resources\?ficha=ficha-mitos"/)
  assert.match(finish, /Una pregunta para tu diario/)
  assert.equal((finish.match(/Volver al mapa<\/button>/g) ?? []).length, 1)
  assert.doesNotMatch(finish, /Seguir hacia|Revisar mis propias creencias|Lo que viene/)
})

test('battle UI prevents sheet access, confirms abandonment and resets after remount without writing a result', () => {
  const { f, c } = setup(),
    store = f.load('src/store/journeyStore.ts'),
    { ChallengePlayer } = f.load('src/features/activities/components/challenges/ChallengePlayer.tsx')
  store.updateJourney((s) => ({ ...s, resources: ['ficha-mitos'], readResourceIds: ['ficha-mitos'] }))
  let closed = 0,
    props = {
      challenge: c,
      onClose() {
        closed++
      },
    },
    tree = f.draw(ChallengePlayer, props)
  button(tree, 'Enfrentar a').props.onClick()
  tree = f.draw(ChallengePlayer, props)
  assert.equal(elements(tree, (n) => typeof n.type === 'function' && 'ids' in (n.props ?? {})).length, 0)
  assert.ok(JSON.stringify(tree).includes('Las fichas se abren al terminar el desafío'))
  elements(
    tree,
    (n) => n.type === 'button' && n.props['aria-label'] === 'Salir del desafío',
  )[0].props.onClick()
  tree = f.draw(ChallengePlayer, props)
  assert.ok(elements(tree, (n) => n.props?.open === true).length)
  assert.ok(JSON.stringify(tree).includes('¿Quieres volver a la ciudad?'))
  assert.ok(JSON.stringify(tree).includes('Este intento no se guardará.'))
  button(tree, 'Volver a la ciudad').props.onClick()
  assert.equal(closed, 1)
  assert.equal(store.useJourney().challengeResults.length, 0)
  f.reset()
  tree = f.draw(ChallengePlayer, props)
  assert.ok(button(tree, 'Enfrentar a'))
})

test('practice UI finishes without results or reward writes and reveals final feedback immediately on a tap', () => {
  const { f, c } = setup(),
    store = f.load('src/store/journeyStore.ts'),
    { ChallengePlayer } = f.load('src/features/activities/components/challenges/ChallengePlayer.tsx')
  store.updateJourney((s) => ({
    ...s,
    resources: ['ficha-mitos'],
    readResourceIds: ['ficha-mitos'],
    progress: { [c.id]: { estado: 'completada' } },
  }))
  const before = JSON.stringify(store.useJourney()),
    props = { challenge: c, onClose() {} }
  let tree = f.draw(ChallengePlayer, props)
  button(tree, 'Enfrentar a').props.onClick()
  tree = f.draw(ChallengePlayer, props)
  for (let i = 0; i < 5; i++) {
    const options = componentOptions(tree),
      q = c.banco.find((q) => q.opciones[0].texto === options[0].props.text)
    options.find((o) => o.props.text === q.opciones.find((o) => o.id === q.correcta).texto).props.onClick()
    tree = f.draw(ChallengePlayer, props)
    assert.ok(componentOptions(tree).some((o) => o.props.state === 'correct'))
    assert.ok(componentOptions(tree).every((o) => o.props.disabled))
    button(tree, i === 4 ? 'Ver resultado' : 'Siguiente pregunta').props.onClick()
    tree = f.draw(ChallengePlayer, props)
  }
  assert.ok(JSON.stringify(tree).includes('Completaste una práctica'))
  const actions = elements(tree, (n) => n.props?.className === 'sx-player-actions')
  assert.equal(elements(actions[0], (n) => n.type === 'button').length, 1)
  assert.equal(button(tree, 'Continuar').props.onClick, props.onClose)
  assert.equal(button(actions[0], 'Volver a la ciudad'), undefined)
  assert.equal(button(actions[0], 'Seguir hacia'), undefined)
  assert.equal(JSON.stringify(store.useJourney()), before)
})

test('old journey records migrate additively without dropping responses, drafts, resources or completed missions', () => {
  const { journey } = setup(),
    old = journey.initialJourney()
  delete old.readResourceIds
  delete old.challengeResults
  old.resources = ['ficha-mitos']
  old.drafts.note = 'Preserve'
  old.progress.original = { estado: 'completada' }
  const f = fixture({ 'ov.missions.v2': JSON.stringify(old) }),
    migrated = f.load('src/store/journeyStore.ts').useJourney()
  assert.deepEqual(copy(migrated.readResourceIds), ['ficha-mitos'])
  assert.equal(migrated.drafts.note, 'Preserve')
  assert.equal(migrated.progress.original.estado, 'completada')
  assert.deepEqual(copy(migrated.challengeResults), [])
})
