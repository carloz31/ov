import { loadMapPoints } from '../../soporte/refactor-map.mjs'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import vm from 'node:vm'
import { randomUUID } from 'node:crypto'
import test from 'node:test'
import ts from 'typescript'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
const nativeRequire = createRequire(import.meta.url)
const copy = (value) => JSON.parse(JSON.stringify(value))
function fixture(saved = {}, demo = false, mocks = {}) {
  const cache = new Map(),
    storage = new Map(Object.entries(saved)),
    timeouts = []
  let fail = false
  let reducedMotion = false
  let managed = false,
    hookCursor = 0,
    hooks = [],
    effects = []
  const reactHooks = {
    ...React,
    useEffect(callback, deps) {
      if (!managed) return
      const i = hookCursor++,
        previous = hooks[i]
      if (!previous || deps.some((d, index) => d !== previous.deps[index])) {
        effects.push(() => {
          previous?.cleanup?.()
          hooks[i] = { deps, cleanup: callback() }
        })
      }
    },
    useRef(value) {
      if (!managed) return { current: value }
      const i = hookCursor++
      return (hooks[i] ??= { current: value })
    },
    useMemo: (fn) => fn(),
    useState(value) {
      if (!managed) return [typeof value === 'function' ? value() : value, () => {}]
      const i = hookCursor++
      if (!(i in hooks)) hooks[i] = typeof value === 'function' ? value() : value
      return [
        hooks[i],
        (next) => {
          hooks[i] = typeof next === 'function' ? next(hooks[i]) : next
        },
      ]
    },
    useSyncExternalStore: (_, snapshot) => snapshot(),
  }
  const context = vm.createContext({
    console,
    Date,
    Math,
    Map,
    Set,
    AbortController,
    crypto: { randomUUID },
    setTimeout(fn, ms) {
      timeouts.push(ms)
      return setTimeout(fn, Math.max(1, ms * 0.01))
    },
    clearTimeout,
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem(key, value) {
        if (fail) throw Error('full')
        storage.set(key, value)
      },
    },
    window: { addEventListener() {}, matchMedia: () => ({ matches: reducedMotion }) },
  })
  function load(file) {
    const full = path.resolve(file)
    assert.ok(
      !/[\\/]features[\\/](parent|counselor)[\\/]/.test(full),
      'Protected portals must never be loaded',
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
          target: ts.ScriptTarget.ES2023,
        },
      },
    ).outputText
    function require(id) {
      if (id in mocks) return mocks[id]
      if (id.endsWith('.css')) return {}
      if (id === 'react') return reactHooks
      if (!id.startsWith('.') && !id.startsWith('@/')) return nativeRequire(id)
      const target = id.startsWith('@/')
        ? path.resolve('src', id.slice(2))
        : path.resolve(path.dirname(full), id)
      return load([target, `${target}.ts`, `${target}.tsx`].find((f) => existsSync(f)))
    }
    vm.runInContext(`(function(require,exports){${source}\n})`, context, { filename: full })(require, exports)
    return exports
  }
  const app = {
    load,
    storage,
    timeouts,
    reduced(value) {
      reducedMotion = value
    },
    mount(component, props) {
      managed = true
      hooks = []
      const draw = () => {
        hookCursor = 0
        const tree = component(props)
        const pending = effects
        effects = []
        pending.forEach((run) => run())
        return tree
      }
      return {
        draw,
        async settle() {
          draw()
          await new Promise((resolve) => setTimeout(resolve, 20))
          return draw()
        },
        unmount() {
          hooks.forEach((hook) => hook?.cleanup?.())
          hooks = []
          managed = false
        },
      }
    },
    fail(v) {
      fail = v
    },
  }
  load('src/config/studentDemoScope.ts').studentDemoEnabled = demo
  app.config = load('src/data/activities/reflectionConfig.ts')
  app.content = load('src/data/activities/content.ts')
  app.journey = load('src/store/journeyStore.ts')
  app.store = load('src/store/reflectionStore.ts')
  app.evaluation = load('src/features/activities/lib/reflection/evaluation.ts')
  app.provider = load('src/features/activities/lib/reflection/provider.ts')
  app.questions = load('src/features/activities/lib/reflection/personalization.ts')
  app.scenario = (key, values, missing, generacion = 'VALIDA') =>
    app.store.updateReflections((s) => ({
      ...s,
      escenarios: {
        ...s.escenarios,
        [key]: { evaluaciones: values, criteriosFaltantes: missing, generacion },
      },
    }))
  app.submit = (
    activityId = 'act-07',
    nodeId = 'r07-frase',
    text = 'Mi abuela dice que para avanzar debo aprender con paciencia.',
  ) => {
    const activity = app.content.activityById(activityId),
      node = activity.nodos.find((n) => n.id === nodeId)
    const before = app.journey
      .getJourneySnapshot()
      .submissions.filter((e) => e.actividadId === activityId && e.nodoId === nodeId)
      .at(-1)
    const entry = {
      id: randomUUID(),
      estudianteId: 'est-prototipo',
      actividadId: activityId,
      nodoId: nodeId,
      version: (before?.version ?? 0) + 1,
      enviadoEn: new Date().toISOString(),
      contenido: { tipo: 'texto', texto: text },
    }
    app.journey.updateJourney((s) => ({ ...s, submissions: [...s.submissions, entry] }))
    app.evaluation.beginResponse(activity, node, entry)
    return { activity, node, entry, key: `${activityId}/${nodeId}`, text }
  }
  app.develop = async (activityId, nodeId) => {
    const item = app.submit(activityId, nodeId)
    app.scenario(item.key, ['ADECUADA'])
    await app.evaluation.evaluateResponse(item.activity, item.node, item.text, 0)
    app.evaluation.finalizeResponse(item.activity, item.node)
    return item
  }
  return app
}
function findElement(tree, predicate) {
  if (Array.isArray(tree)) return tree.map((n) => findElement(n, predicate)).find(Boolean)
  if (!tree || typeof tree !== 'object') return undefined
  return predicate(tree) ? tree : findElement(tree.props?.children, predicate)
}

test('base map is the source of order, predecessor requirements, nine mandatory nodes and seven enabled nodes', () => {
  const app = fixture(),
    activities = app.content.activities
  app.config.baseRoute.forEach(([, id], i) => {
    const activity = activities.find((a) => a.id === id)
    assert.equal(activity.orden, i + 1)
    assert.deepEqual(copy(activity.requisitos), i ? [app.config.baseRoute[i - 1][1]] : [])
  })
  assert.equal(app.content.activityById('act-06').siguienteSugerida, undefined)
  const map = loadMapPoints(app.load)
  const adventure = app
    .load('src/store/adventureStore.ts')
    .createInitialAdventure()
  const journey = copy(app.journey.getJourneySnapshot())
  for (let i = 0; i < 7; i++) {
    const points = map.getCaminoPoints(adventure, journey)
    assert.equal(points[i].status, 'available')
    assert.equal(points[i + 1].status, 'locked')
    journey.progress[app.config.baseRoute[i][1]] = { estado: 'completada' }
  }
  const points = map.getCaminoPoints(adventure, journey)
  assert.equal(points[7].status, 'locked')
  assert.equal(points[8].status, 'locked')
  assert.equal(map.getPointDetails(points[7], adventure, journey).badge, 'Contenido pendiente')
  assert.equal(map.getZoneProgress('missions', adventure, journey).value, (7 / 9) * 100)
  journey.progress['mission-expectations'] = { estado: 'completada' }
  assert.equal(
    map.getCaminoPoints(adventure, journey)[7].status,
    'completed',
    'Historical completions remain accessible',
  )
})

test('demo stops at Huellas even with historical completions and unlocks; restoring full scope preserves them', async () => {
  const app = fixture({}, true)
  const scope = app.load('src/config/studentDemoScope.ts')
  const adventureStore = app.load('src/store/adventureStore.ts')
  const adventure = adventureStore.createInitialAdventure()
  adventure.completedMissionIds = app.config.baseRoute.map(([id]) => id)
  adventure.legacyCaminoCompleted = true
  await app.develop('act-07', 'r07-frase')
  const journey = copy(app.journey.getJourneySnapshot())
  for (const [, id] of app.config.baseRoute) journey.progress[id] = { estado: 'completada' }
  const storedBefore = copy([...app.storage.entries()])
  const map = loadMapPoints(app.load)
  const points = map.getCaminoPoints(adventure, journey)
  assert.deepEqual(copy(points.slice(0, 4).map((p) => p.status)), [
    'completed',
    'completed',
    'completed',
    'completed',
  ])
  assert.ok(
    points
      .slice(4)
      .filter((p) => p.id !== 'city' && !p.additional)
      .every((p) => p.status === 'locked'),
  )
  assert.deepEqual(copy(points.filter((p) => p.additional).map((p) => p.id)), ['extra-ecos'])
  assert.equal(map.getNextCaminoActivity(points), null)
  assert.equal(map.getPointDetails(points[4], adventure, journey).disabled, true)
  assert.equal(map.getPointDetails(points[4], adventure, journey).badge, 'Bloqueada')
  const city = points.find((p) => p.id === 'city')
  assert.equal(city.status, 'available')
  assert.equal(map.getPointDetails(city, adventure, journey).disabled, false)
  assert.ok(map.getCiudadPoints(adventure, journey).some((p) => p.status === 'available' && p.actionEnabled))
  assert.equal(adventureStore.canAccessCity(adventure), true)
  assert.equal(adventureStore.canAccessFamilyConversations(adventure), true)
  assert.doesNotMatch(
    JSON.stringify(points.map((p) => map.getPointDetails(p, adventure, journey))),
    /demostraci[oó]n/i,
  )
  assert.equal(app.questions.questionInfluencesLater('act-07', 'r07-frase'), true)
  assert.deepEqual(copy([...app.storage.entries()]), storedBefore)
  scope.studentDemoEnabled = false
  const restored = map.getCaminoPoints(adventure, journey)
  assert.equal(restored[4].status, 'completed')
  assert.ok(restored.some((p) => p.additional))
  assert.equal(adventureStore.canAccessCity(adventure), true)
  assert.deepEqual(copy([...app.storage.entries()]), storedBefore)
})

test('presentation Pregones is adequate without manual scenarios, unlocks Ecos and personalizes Huellas with its saved response', async () => {
  const app = fixture({}, true)
  for (const id of ['r07-frase', 'r07-revision', 'r07-postura']) {
    const item = app.submit('act-07', id)
    const result = await app.evaluation.evaluateResponse(item.activity, item.node, item.text, 0)
    assert.equal(result.clasificacion, 'ADECUADA')
    assert.equal(result.modelo, 'simulado')
    assert.equal(result.preguntaSeguimiento, undefined)
    assert.equal(app.evaluation.finalizeResponse(item.activity, item.node), true)
  }
  assert.equal(Object.keys(app.store.getReflections().escenarios).length, 0)
  assert.deepEqual(copy(app.store.getReflections().desbloqueos.map((d) => d.actividadId)), ['extra-ecos'])
  const story = app.content.activityById('mission-story')
  const question = await app.questions.prepareQuestion(
    story,
    story.nodos.find((n) => n.id === 'story-personas'),
  )
  assert.equal(question.tipo, 'PERSONALIZADA')
  assert.equal(question.respuestaOrigen.actividadId, 'act-07')
  assert.ok(question.texto.includes(`«${question.cita}»`))
  assert.ok(question.respuestaOrigen.texto.includes(question.cita))
  const Submission = app.load('src/features/activities/components/nodes/SubmissionNode.tsx').SubmissionNode
  const phrase = app.content.activityById('act-07')
  await app.questions.prepareQuestion(
    phrase,
    phrase.nodos.find((n) => n.id === 'r07-frase'),
  )
  const html = renderToStaticMarkup(
    React.createElement(Submission, {
      activity: phrase,
      node: phrase.nodos.find((n) => n.id === 'r07-frase'),
      onSaved() {},
    }),
  )
  assert.match(html, /Esta pregunta puede influir más adelante en tu camino\./)
  const notice = html.match(/class="sx-use-notice"[\s\S]*?<\/span><\/span>/)?.[0]
  assert.ok(notice)
  assert.doesNotMatch(notice, /Huellas|huellas|Horizonte|horizonte|camino propio|recordará/)
  assert.equal(app.questions.questionInfluencesLater('mission-story', 'story-logros'), true)
  assert.equal(app.questions.questionInfluencesLater('act-07', 'r07-postura'), false)
})

test('new sequential content preserves private synthesis, retires future entry, and leaves test and matrix cells intact', () => {
  const app = fixture()
  const story = app.content.activityById('mission-story').nodos.filter((n) => n.tipo === 'consigna')
  assert.deepEqual(copy(story.map((n) => n.id)), ['story-personas', 'story-logros', 'mission-story-entry'])
  assert.equal(story.at(-1).visibilidad, 'solo_estudiante')
  const future = app.content.activityById('mission-future').nodos.filter((n) => n.tipo === 'consigna')
  assert.equal(future.length, 3)
  assert.ok(!future.some((n) => n.id === 'mission-future-entry'))
  for (const node of [...story.slice(0, 2), ...future]) {
    assert.equal(node.entregable.minCaracteres, 30)
    assert.equal(node.entregable.maxCaracteres, 800)
    assert.equal(node.visibilidad, 'estudiante_orientadora')
  }
  const raw = JSON.parse(readFileSync('src/data/activities/contenidos/registro_linea_tiempo.json', 'utf8'))
  assert.deepEqual(copy(app.content.activityById('act-06').nodos), raw.nodos)
  assert.ok(
    !Object.keys(app.config.criteria).some(
      (key) => key.startsWith('act-06/') || key.startsWith('mission-compass/'),
    ),
  )
})

test('without scenario there is no evaluation inference; adequate initial response closes and emits once', async () => {
  const app = fixture(),
    item = app.submit()
  const unknown = await app.evaluation.evaluateResponse(item.activity, item.node, item.text.repeat(3), 0)
  assert.equal(unknown.clasificacion, 'NO_EVALUADA')
  assert.deepEqual(copy(unknown.criteriosFaltantes), [])
  app.evaluation.finalizeResponse(item.activity, item.node)
  assert.equal(app.store.getReflections().eventos.length, 0)
  const second = app.submit()
  app.scenario(second.key, ['ADECUADA'])
  const result = await app.evaluation.evaluateResponse(second.activity, second.node, 'Texto breve', 0)
  assert.equal(result.clasificacion, 'ADECUADA')
  assert.equal(result.modelo, 'simulado')
  app.evaluation.finalizeResponse(second.activity, second.node)
  app.evaluation.finalizeResponse(second.activity, second.node)
  assert.equal(app.store.getReflections().eventos.length, 1)
  assert.equal(app.store.getReflections().desbloqueos.length, 1)
  assert.equal(app.store.getReflections().respuestas[second.key].estado, 'FINAL')
})

test('successive scenarios evaluate initial text and augmentations, retain immutable evaluations, and stop at adequacy', async () => {
  const app = fixture(),
    item = app.submit()
  app.scenario(item.key, ['INSUFICIENTE', 'ADECUADA'], ['persona'])
  const first = await app.evaluation.evaluateResponse(item.activity, item.node, item.text, 0)
  assert.deepEqual(copy(first.criteriosFaltantes), ['persona'])
  assert.match(first.preguntaSeguimiento, /quién la dice/)
  assert.equal(app.store.isDeveloped(app.store.getReflections().respuestas[item.key]), false)
  const expanded = `${item.text}\n\nFue mi abuela quien me enseñó a insistir.`
  const second = await app.evaluation.evaluateResponse(item.activity, item.node, expanded, 1)
  assert.equal(second.clasificacion, 'ADECUADA')
  app.evaluation.finalizeResponse(item.activity, item.node)
  assert.equal(app.store.isDeveloped(app.store.getReflections().respuestas[item.key]), true)
  assert.equal(app.store.getReflections().evaluaciones.length, 2)
  assert.equal(first.clasificacion, 'INSUFICIENTE')
  assert.equal(second.texto, expanded)
  const code = readFileSync('src/features/activities/components/followup/FollowUp.tsx', 'utf8')
  assert.match(code, /record.turnos.length >= 2/)
  assert.ok(!code.includes('mockFollowUpService'))
})

test('omission and exhausted insufficient response close with valid classification and no reflexive event', async () => {
  const app = fixture(),
    item = app.submit()
  app.scenario(item.key, ['INSUFICIENTE'], ['frase'])
  for (let i = 0; i <= 2; i++)
    await app.evaluation.evaluateResponse(item.activity, item.node, `${item.text} ${i}`, i)
  app.evaluation.finalizeResponse(item.activity, item.node)
  const state = app.store.getReflections()
  assert.equal(state.respuestas[item.key].estado, 'FINAL')
  assert.equal(app.store.currentEvaluation(state.respuestas[item.key]).clasificacion, 'INSUFICIENTE')
  assert.equal(state.eventos.length, 0)
  assert.equal(state.desbloqueos.length, 0)
})

test('provider failures and ten-second timeout save NO_EVALUADA without invented criteria', async () => {
  for (const scenario of ['FALLO', 'TIMEOUT']) {
    const app = fixture(),
      item = app.submit()
    app.scenario(item.key, [scenario])
    const result = await app.evaluation.evaluateResponse(item.activity, item.node, item.text, 0)
    assert.equal(result.clasificacion, 'NO_EVALUADA')
    assert.deepEqual(copy(result.criteriosFaltantes), [])
    assert.ok(result.error)
    app.evaluation.finalizeResponse(item.activity, item.node)
    assert.equal(app.store.getReflections().respuestas[item.key].estado, 'FINAL')
    assert.ok(app.timeouts.includes(10_000))
  }
})

test('deduplication, reload and condensed-version recovery do not repeat evaluations or events', async () => {
  const app = fixture(),
    item = app.submit()
  app.scenario(item.key, ['ADECUADA'])
  await Promise.all([
    app.evaluation.evaluateResponse(item.activity, item.node, item.text, 0),
    app.evaluation.evaluateResponse(item.activity, item.node, item.text, 0),
  ])
  assert.equal(app.store.getReflections().evaluaciones.length, 1)
  const condensed = {
    ...item.entry,
    id: randomUUID(),
    version: 2,
    contenido: { tipo: 'texto', texto: `${item.text}\nAmpliación guardada` },
  }
  app.journey.updateJourney((s) => ({ ...s, submissions: [...s.submissions, condensed] }))
  const restored = fixture(Object.fromEntries(app.storage))
  restored.evaluation.finalizeResponse(item.activity, item.node)
  restored.evaluation.finalizeResponse(item.activity, item.node)
  const state = restored.store.getReflections()
  assert.equal(state.eventos.length, 1)
  assert.equal(state.respuestas[item.key].version, 2)
  assert.equal(state.respuestas[item.key].entregaIds.length, 2)
  assert.equal(restored.store.currentEvaluation(state.respuestas[item.key]).version, 2)
})

test('results for replaced versions or revisions are ignored', async () => {
  const app = fixture(),
    item = app.submit()
  let resolve
  app.provider.setReflectionProvider({
    evaluateResponse: () =>
      new Promise((done) => {
        resolve = done
      }),
  })
  const pending = app.evaluation.evaluateResponse(item.activity, item.node, item.text, 0)
  app.submit()
  resolve({
    modelo: 'simulado',
    versionPrompt: 'test',
    latenciaMs: 0,
    fechaHora: new Date().toISOString(),
    clasificacion: 'ADECUADA',
    criteriosFaltantes: [],
  })
  assert.equal(await pending, undefined)
  assert.equal(app.store.getReflections().evaluaciones.length, 0)
})

test('all five personalizations use approved prior sources, freeze question and source snapshot, and evaluate shown prompt', async () => {
  const app = fixture()
  await app.develop('act-07', 'r07-frase')
  await app.develop('mission-story', 'story-logros')
  await app.develop('mission-future', 'future-aspiracion')
  for (const key of Object.keys(app.config.personalizations)) {
    const [id, nodeId] = key.split('/'),
      activity = app.content.activityById(id),
      node = activity.nodos.find((n) => n.id === nodeId)
    const question = await app.questions.prepareQuestion(activity, node)
    assert.equal(question.tipo, 'PERSONALIZADA', key)
    assert.ok(
      app.questions.validPersonalizedQuestion(question.texto, question.cita, question.respuestaOrigen.texto),
    )
    const again = await app.questions.prepareQuestion(activity, node)
    assert.equal(again, question)
  }
  const source = app.store.getReflections().preguntas['mission-story/story-personas'].respuestaOrigen
  app.submit('act-07', 'r07-frase', 'Una respuesta completamente distinta y con otra persona.')
  const item = app.submit('mission-story', 'story-personas')
  let prompt
  app.provider.setReflectionProvider({
    evaluateResponse: async (input) => {
      prompt = input.enunciado
      return {
        modelo: 'simulado',
        versionPrompt: 'test',
        latenciaMs: 0,
        fechaHora: new Date().toISOString(),
        clasificacion: 'ADECUADA',
        criteriosFaltantes: [],
      }
    },
  })
  await app.evaluation.evaluateResponse(item.activity, item.node, item.text, 0)
  assert.equal(prompt, app.store.getReflections().preguntas[item.key].texto)
  assert.equal(app.store.getReflections().preguntas[item.key].respuestaOrigen, source)
})

test('quote validation, retry once, generation failure and total six-second budget fall back quietly', async () => {
  const app = fixture(),
    validate = app.questions.validPersonalizedQuestion
  assert.equal(
    validate('¿Recuerdas «Tres palabras exactas»?', 'Tres palabras exactas', 'tres  palabras exactas'),
    true,
  )
  assert.equal(validate('¿Otra cita?', 'Tres palabras exactas', 'Tres palabras exactas'), false)
  assert.equal(validate('¿Recuerdas «dos palabras»?', 'dos palabras', 'dos palabras'), false)
  assert.equal(
    validate('¿Una? ¿Dos? ¿Tres «palabras del texto»?', 'palabras del texto', 'palabras del texto'),
    false,
  )
  for (const generation of ['CITA_INVALIDA', 'FALLO', 'TIMEOUT']) {
    const f = fixture()
    await f.develop('act-07', 'r07-frase')
    const activity = f.content.activityById('mission-story'),
      node = activity.nodos.find((n) => n.id === 'story-personas')
    f.scenario('mission-story/story-personas', ['ADECUADA'], [], generation)
    const question = await f.questions.prepareQuestion(activity, node)
    assert.equal(question.tipo, 'GENERICA_RESPALDO')
    assert.equal(question.texto, node.premisa)
    assert.ok(question.error)
    assert.equal(f.questions.missingNotice(question), undefined)
    assert.ok(f.timeouts.includes(6000))
    if (generation === 'CITA_INVALIDA')
      assert.equal(
        f.timeouts.filter((ms) => ms === 250).length,
        3,
        'One evaluation and exactly two generation attempts',
      )
  }
})

test('insufficient sources explain missing criteria in content order; absent, private and unevaluated sources stay quiet', async () => {
  for (const classification of ['INSUFICIENTE', 'NO_EVALUADA']) {
    const app = fixture(),
      item = app.submit()
    app.scenario(item.key, [classification], ['persona', 'frase'])
    await app.evaluation.evaluateResponse(item.activity, item.node, item.text, 0)
    app.evaluation.finalizeResponse(item.activity, item.node)
    const activity = app.content.activityById('mission-story'),
      node = activity.nodos.find((n) => n.id === 'story-personas')
    const question = await app.questions.prepareQuestion(activity, node)
    if (classification === 'INSUFICIENTE')
      assert.match(app.questions.missingNotice(question), /qué frase has escuchado ni quién la dice/)
    else assert.equal(app.questions.missingNotice(question), undefined)
  }
  const app = fixture(),
    activity = app.content.activityById('mission-story'),
    node = activity.nodos.find((n) => n.id === 'story-personas')
  app.config.personalizations['mission-story/story-personas'].itemsOrigen = [
    { actividadId: 'mission-story', nodoId: 'mission-story-entry' },
  ]
  await app.develop('mission-story', 'mission-story-entry')
  const question = await app.questions.prepareQuestion(activity, node)
  assert.equal(question.tipo, 'GENERICA_RESPALDO')
  assert.equal(question.respuestaOrigen, undefined)
})

test('historical private future submissions, completed activities and old versions survive additive storage', async () => {
  const app = fixture(),
    entry = {
      id: 'private',
      actividadId: 'mission-future',
      nodoId: 'mission-future-entry',
      version: 1,
      contenido: { tipo: 'texto', texto: 'Mi antiguo deseo privado queda solo en mi historia.' },
    }
  app.journey.updateJourney((s) => ({
    ...s,
    submissions: [entry],
    progress: { 'mission-future': { estado: 'completada', completadaEn: '2026-10-01' } },
  }))
  const restored = fixture(Object.fromEntries(app.storage))
  assert.deepEqual(copy(restored.journey.getJourneySnapshot().submissions), [entry])
  assert.equal(restored.journey.getJourneySnapshot().progress['mission-future'].estado, 'completada')
  assert.equal(restored.store.getReflections().evaluaciones.length, 0)
  const node = restored.content.activityById('act-06').nodos.find((n) => n.id === 'g-anio1-meta')
  const question = await restored.questions.prepareQuestion(restored.content.activityById('act-06'), node)
  assert.equal(question.tipo, 'GENERICA_RESPALDO')
  assert.equal(question.respuestaOrigen, undefined)
})

test('alternative unlocks are hidden until developed, never affect mandatory progress or levels; badges and notices are unique', async () => {
  const app = fixture(),
    map = loadMapPoints(app.load),
    adventure = app.load('src/store/adventureStore.ts').createInitialAdventure()
  assert.equal(
    map.getCaminoPoints(adventure, app.journey.getJourneySnapshot()).filter((p) => p.additional).length,
    0,
  )
  await app.develop('act-07', 'r07-postura')
  await app.develop('mission-story', 'story-personas')
  await app.develop('mission-future', 'future-entorno')
  let state = app.journey.getJourneySnapshot()
  assert.equal(app.store.getReflections().desbloqueos.length, 3)
  const extras = map.getCaminoPoints(adventure, state).filter((p) => p.additional)
  assert.equal(extras.length, 3)
  assert.equal(extras.filter((p) => p.revealQueued).length, 2)
  const before = map.getZoneProgress('missions', adventure, state).value
  app.journey.updateJourney((s) => ({
    ...s,
    progress: {
      ...s.progress,
      ...Object.fromEntries(app.config.additionalMissions.map((m) => [m.id, { estado: 'completada' }])),
    },
  }))
  state = app.journey.getJourneySnapshot()
  assert.equal(map.getZoneProgress('missions', adventure, state).value, before)
  assert.deepEqual(copy(map.getMissionsToSync(adventure, state)), [])
  const passport = app.load('src/features/discovery/lib/passport.ts').getStudentAchievementGroups(adventure, state)
  assert.equal(
    passport.flatMap((g) => g.items).filter((b) => ['I11', 'I12', 'I13'].includes(b.code)).length,
    3,
  )
  const unlocks = app.load('src/features/adventure/lib/unlocks.ts').getUnlocks(adventure, state)
  assert.equal(unlocks.filter((u) => /^badge:I1[123]$/.test(u.id)).length, 3)
  assert.deepEqual(copy(app.load('src/features/activities/lib/reflection/additional.ts').additionalThematicProgress(state)), {
    creencias: 1,
    historia: 1,
    futuro: 1,
  })
})

test('visibility precedes the answer field, quoted memory is accessible, and ACT-06 remains outside evaluation', async () => {
  const app = fixture(),
    activity = app.content.activityById('mission-story'),
    node = activity.nodos.find((n) => n.id === 'story-personas')
  await app.questions.prepareQuestion(activity, node)
  const Submission = app.load('src/features/activities/components/nodes/SubmissionNode.tsx').SubmissionNode
  const html = renderToStaticMarkup(React.createElement(Submission, { activity, node, onSaved() {} }))
  assert.ok(html.indexOf('Visible para ti y tu orientadora') < html.indexOf('<textarea'))
  const future = app.content.activityById('mission-future')
  app.journey.updateJourney((s) => ({
    ...s,
    submissions: [
      ...s.submissions,
      {
        id: 'private',
        actividadId: future.id,
        nodoId: 'mission-future-entry',
        version: 1,
        contenido: { tipo: 'texto', texto: 'Privado en el historial' },
      },
    ],
  }))
  const aspiration = future.nodos.find((n) => n.id === 'future-aspiracion')
  await app.questions.prepareQuestion(future, aspiration)
  const history = renderToStaticMarkup(
    React.createElement(Submission, { activity: future, node: aspiration, onSaved() {} }),
  )
  assert.match(history, /Tu historial privado/)
  assert.match(history, /Privado en el historial/)
  const source = readFileSync('src/features/activities/components/nodes/SubmissionNode.tsx', 'utf8')
  assert.match(source, /evaluated = !!criteria\[draftKey\] && activity.plantilla\?\.tipo !== 'matriz'/)
})

test('reveal interruption retains unseen unlock, queue advances sequentially and reduced motion disables every reveal', async () => {
  const app = fixture()
  await app.develop('act-07', 'r07-frase')
  await app.develop('mission-story', 'story-logros')
  const restored = fixture(Object.fromEntries(app.storage))
  assert.equal(restored.store.getReflections().desbloqueos.filter((d) => !d.visto).length, 2)
  restored.store.updateReflections((s) => ({
    ...s,
    desbloqueos: s.desbloqueos.map((d, i) => (i ? d : { ...d, visto: true })),
  }))
  assert.equal(restored.store.getReflections().desbloqueos.filter((d) => !d.visto).length, 1)
  const reveal = readFileSync('src/features/activities/components/reflection/AdditionalReveal.tsx', 'utf8')
  assert.match(reveal, /2700/)
  assert.match(reveal, /return \(\) => clearTimeout\(timer\)/)
  assert.match(reveal, /prefers-reduced-motion/)
  const styles = readFileSync('src/styles/student/reflection.css', 'utf8')
  for (const time of ['.5s', '.9s', '1.15s', '1.4s']) assert.ok(styles.includes(time))
  assert.match(styles, /@media\s*\(prefers-reduced-motion:\s*reduce\)/)
})

test('failed student sidecar writes never publish events, classifications or unlocks', async () => {
  const app = fixture(),
    item = app.submit()
  const before = app.store.getReflections()
  app.fail(true)
  assert.equal(app.store.closeResponse(item.key), false)
  assert.equal(app.store.getReflections(), before)
  assert.equal(await app.evaluation.evaluateResponse(item.activity, item.node, item.text, 0), undefined)
})

test('follow-up UI closes immediately for adequacy, supports omission, and evaluates each of two answered turns', async () => {
  for (const scenario of [['ADECUADA'], ['INSUFICIENTE'], ['INSUFICIENTE', 'INSUFICIENTE', 'ADECUADA']]) {
    const app = fixture(),
      item = app.submit()
    app.scenario(item.key, scenario, ['persona'])
    const followups = app.load('src/features/activities/store/followUpStore.ts')
    followups.setFollowUpRecord(item.key, { textoInicial: item.text, versionInicial: 1, turnos: [] })
    const Component = app.load('src/features/activities/components/followup/FollowUp.tsx').FollowUp
    const view = app.mount(Component, { activity: item.activity, node: item.node, onContinue() {} })
    let tree = await view.settle()
    if (scenario[0] === 'ADECUADA') {
      assert.equal(followups.getFollowUpRecord(item.key).turnos.length, 0)
    } else {
      assert.equal(followups.getFollowUpRecord(item.key).turnos.length, 1)
      tree = await view.settle()
      if (scenario.length === 1) {
        findElement(tree, (n) => n.type === 'button' && n.props.children === 'Omitir').props.onClick()
        tree = await view.settle()
      } else {
        for (let i = 0; i < 2; i++) {
          const input = findElement(tree, (n) => n.type === 'textarea')
          input.props.onChange({ target: { value: `Mi abuela me enseñó algo concreto ${i}.` } })
          tree = view.draw()
          findElement(tree, (n) => n.type === 'form').props.onSubmit({ preventDefault() {} })
          tree = await view.settle()
          tree = await view.settle()
        }
        assert.equal(followups.getFollowUpRecord(item.key).turnos.length, 2)
        assert.equal(app.journey.getJourneySnapshot().submissions.length, 2)
        assert.match(
          app.journey.getJourneySnapshot().submissions.at(-1).contenido.texto,
          /Mi abuela me enseñó algo concreto 1/,
        )
      }
    }
    tree = await view.settle()
    assert.equal(app.store.getReflections().respuestas[item.key].estado, 'FINAL')
    assert.ok(
      findElement(
        tree,
        (n) =>
          n.type === 'button' && n.props.onClick && JSON.stringify(n.props.children).includes('Continuar'),
      ),
    )
    assert.equal(
      app.store.getReflections().eventos.length,
      scenario.length === 1 && scenario[0] === 'INSUFICIENTE' ? 0 : 1,
    )
    view.unmount()
  }
})

test('actual reveal lifecycle repeats interrupted sequences, queues origins, presents a dismissible toast, and honors reduced motion', async () => {
  const app = fixture()
  await app.develop('act-07', 'r07-frase')
  await app.develop('mission-story', 'story-logros')
  const Component = app.load('src/features/activities/components/reflection/AdditionalReveal.tsx').AdditionalReveal
  const framed = [],
    props = {
      onFrame(ids) {
        framed.push(copy(ids))
      },
      onSelect() {},
    }
  const interrupted = app.mount(Component, props)
  interrupted.draw()
  interrupted.unmount()
  await new Promise((resolve) => setTimeout(resolve, 40))
  assert.equal(app.store.getReflections().desbloqueos.filter((d) => !d.visto).length, 2)
  const resumed = app.mount(Component, props)
  resumed.draw()
  await new Promise((resolve) => setTimeout(resolve, 40))
  assert.equal(app.store.getReflections().desbloqueos.filter((d) => !d.visto).length, 1)
  resumed.draw()
  await new Promise((resolve) => setTimeout(resolve, 40))
  const tree = resumed.draw()
  assert.equal(app.store.getReflections().desbloqueos.filter((d) => !d.visto).length, 0)
  assert.deepEqual(framed, [
    ['pregones', 'extra-ecos'],
    ['pregones', 'extra-ecos'],
    ['story', 'extra-objeto'],
  ])
  assert.ok(
    findElement(tree, (n) => n.type === 'aside' && n.props['aria-label'] === 'Nueva misión adicional'),
  )
  assert.equal(tree.props.role, 'status')
  assert.equal(tree.props['aria-live'], 'polite')
  assert.match(tree.props.className, /sx-badge-toast/)
  assert.ok(findElement(tree, (n) => n.type === 'h2' && n.props.children === 'El objeto que guardo'))
  assert.equal(
    findElement(tree, (n) => n.props?.children === 'Seguir con el camino'),
    undefined,
  )
  assert.deepEqual(copy(app.store.getReflections().anuncioAdicional), {
    actividadId: 'extra-objeto',
    primero: true,
  })
  resumed.unmount()
  const recovered = app.mount(Component, props)
  const recoveredTree = recovered.draw()
  assert.ok(findElement(recoveredTree, (n) => n.type === 'aside'))
  assert.equal(framed.length, 3, 'recovering the final card does not replay finished sequences')
  findElement(
    recoveredTree,
    (n) => n.type === 'button' && n.props['aria-label'] === 'Cerrar aviso',
  ).props.onClick()
  assert.equal(app.store.getReflections().primeraAdicionalVista, true)
  assert.equal(app.store.getReflections().anuncioAdicional, undefined)
  recovered.unmount()
  const reduced = fixture()
  await reduced.develop('act-07', 'r07-frase')
  reduced.reduced(true)
  const instant = reduced.mount(
    reduced.load('src/features/activities/components/reflection/AdditionalReveal.tsx').AdditionalReveal,
    props,
  )
  const final = await instant.settle()
  assert.ok(reduced.timeouts.includes(0))
  assert.equal(reduced.store.getReflections().desbloqueos[0].visto, true)
  assert.ok(findElement(final, (n) => n.type === 'aside'))
  assert.ok(reduced.timeouts.includes(7000))
  await new Promise((resolve) => setTimeout(resolve, 90))
  assert.equal(reduced.store.getReflections().anuncioAdicional, undefined)
  assert.equal(instant.draw(), null)
  instant.unmount()
})

test('mission announcements hold badge notifications until dismissed and ignore unlocks outside the active scope', () => {
  const app = fixture({}, true, {
    'react-router': { ...nativeRequire('react-router'), useNavigate: () => () => {} },
  })
  const adventure = app.load('src/store/adventureStore.ts')
  adventure.updateAdventure((s) => ({ ...s, completedMissionIds: ['welcome'] }))
  const ui = app.load('src/store/studentUiStore.ts')
  const { localDateKey } = app.load('src/features/adventure/lib/checkIn.ts')
  ui.updateStudentUi((s) => ({
    ...s,
    initialized: true,
    cityArrivalSeen: true,
    introsSeen: { missions: true },
    checkInPromptDismissedOn: localDateKey(new Date()),
    announcedBadgeCodes: [],
  }))
  const { OverlayQueue } = app.load('src/features/adventure/components/overlays/OverlayQueue.tsx')
  const badge = () =>
    findElement(
      OverlayQueue({ view: 'missions', activityOpen: false, children: null }),
      (n) => n.type?.name === 'BadgeToast',
    )
  assert.ok(badge())
  const unlock = {
    actividadId: 'extra-ecos',
    actividadOrigen: 'act-07',
    fechaHora: new Date().toISOString(),
    visto: false,
  }
  app.store.updateReflections((s) => ({ ...s, desbloqueos: [unlock] }))
  assert.equal(badge(), undefined)
  app.store.updateReflections((s) => ({
    ...s,
    desbloqueos: [{ ...unlock, visto: true }],
    anuncioAdicional: { actividadId: 'extra-ecos', primero: true },
  }))
  assert.equal(badge(), undefined)
  app.store.updateReflections((s) => ({ ...s, anuncioAdicional: undefined }))
  assert.ok(badge())
  app.store.updateReflections((s) => ({ ...s, desbloqueos: [{ ...unlock, actividadId: 'extra-objeto' }] }))
  assert.ok(badge())
})

test('response-specific scenarios override student defaults and older revision results cannot replace a newer evaluation', async () => {
  const app = fixture(),
    item = app.submit()
  app.scenario('est-prototipo', ['ADECUADA'])
  app.scenario(app.store.getReflections().respuestas[item.key].id, ['INSUFICIENTE'], ['persona'])
  assert.equal(
    (await app.evaluation.evaluateResponse(item.activity, item.node, item.text, 0)).clasificacion,
    'INSUFICIENTE',
  )
  const revised = app.submit(),
    resolvers = []
  app.provider.setReflectionProvider({
    evaluateResponse: () => new Promise((resolve) => resolvers.push(resolve)),
  })
  const initial = app.evaluation.evaluateResponse(revised.activity, revised.node, revised.text, 0)
  const augmentation = app.evaluation.evaluateResponse(
    revised.activity,
    revised.node,
    `${revised.text} Una ampliación`,
    1,
  )
  const result = {
    modelo: 'simulado',
    versionPrompt: 'test',
    latenciaMs: 0,
    fechaHora: new Date().toISOString(),
    clasificacion: 'ADECUADA',
    criteriosFaltantes: [],
  }
  resolvers[0](result)
  assert.equal(await initial, undefined)
  resolvers[1](result)
  assert.equal((await augmentation).revision, 1)
  app.evaluation.finalizeResponse(revised.activity, revised.node)
  assert.equal(app.store.getReflections().eventos.length, 1)
})
