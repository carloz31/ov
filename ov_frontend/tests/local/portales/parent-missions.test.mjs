import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'

const nativeRequire = createRequire(import.meta.url)
const clone = (value) => JSON.parse(JSON.stringify(value))
function fixture(saved = {}) {
  const disk = new Map(Object.entries(saved)),
    cache = new Map(),
    events = []
  let fail = false,
    requestedId = 'pad-01-rol',
    query = ''
  const context = vm.createContext({
    Date,
    Map,
    Set,
    crypto,
    localStorage: {
      getItem: (key) => disk.get(key) ?? null,
      setItem: (key, value) => {
        if (fail) throw Error('Quota exceeded')
        disk.set(key, value)
      },
    },
    window: {
      addEventListener: (name, handler) => {
        if (name === 'storage') events.push(handler)
      },
    },
  })
  function load(relative) {
    const file = path.resolve(relative)
    assert.ok(!file.includes(`${path.sep}features${path.sep}counselor${path.sep}`), 'This fixture never reads the protected portal')
    if (cache.has(file)) return cache.get(file)
    if (file.endsWith('.json')) {
      const value = JSON.parse(readFileSync(file, 'utf8'))
      cache.set(file, value)
      return value
    }
    const exports = {}
    cache.set(file, exports)
    const js = ts.transpileModule(readFileSync(file, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2023,
      },
    }).outputText
    const require = (specifier) => {
      if (specifier.endsWith('.css')) return {}
      if (specifier === 'react') return { ...React, useSyncExternalStore: (_, snapshot) => snapshot() }
      if (specifier === 'react-router')
        return {
          ...nativeRequire(specifier),
          useParams: () => ({ activityId: requestedId }),
          useSearchParams: () => [new URLSearchParams(query)],
          useOutletContext: () => {
            const { completedIds: completedActivityIds, ...source } =
              load('src/features/parent/hooks/useParentActivities.ts').useParentActivities()
            return { ...source, completedActivityIds }
          },
        }
      if (specifier.endsWith('data/parentPortal'))
        return {
          parentActivities: load('src/data/activities/content.ts').parentActivities,
          parentProfile: { name: 'Prueba local', relationship: 'Madre' },
        }
      if (specifier.endsWith('counselor/store/prioritySettings'))
        return { shareableQuestionnaireIds: [] }
      if (!specifier.startsWith('.') && !specifier.startsWith('@/')) return nativeRequire(specifier)
      const base = specifier.startsWith('@/')
        ? path.resolve('src', specifier.slice(2))
        : path.resolve(path.dirname(file), specifier)
      return load([base, `${base}.ts`, `${base}.tsx`].find(existsSync))
    }
    vm.runInContext(`(function(require,exports){${js}\n})`, context)(require, exports)
    return exports
  }
  const content = load('src/data/activities/content.ts'),
    logic = load('src/lib/activities/logic.ts')
  const parent = load('src/features/parent/lib/missionLogic.ts'),
    store = load('src/store/parentJourneyStore.ts')
  return {
    content,
    logic,
    parent,
    store,
    load,
    disk,
    fail: (value) => {
      fail = value
    },
    external(key, value) {
      disk.set(key, value)
      events.forEach((handler) => handler({ key }))
    },
    render(id = 'pad-01-rol', params = '') {
      requestedId = id
      query = params
      const { ParentActivityView } = load('src/pages/parent/ParentActivityView.tsx')
      return renderToStaticMarkup(
        React.createElement(MemoryRouter, {}, React.createElement(ParentActivityView)),
      )
    },
  }
}
function finish(app, activity, state = app.logic.initialJourney(), accountId = 'apo-prototipo') {
  state = app.parent.startParentActivity(activity, state, accountId)
  for (const node of activity.nodos) {
    if (node.tipo === 'pregunta')
      state = app.parent.answerParentQuestion(
        activity,
        node,
        node.opciones.filter((option) => option.correcta).map((option) => option.id),
        state,
        accountId,
      )
    state = app.parent.advanceParentActivity(
      activity,
      node.id,
      state,
      accountId,
      node.tipo === 'eleccion' ? node.opciones[0].id : undefined,
    )
  }
  return state
}

test('common content separates audiences, validates nodes and table widths, and has no parent submissions', () => {
  const app = fixture(),
    { activities, parentActivities, catalog } = app.content
  assert.ok(activities.some((activity) => activity.id === 'act-07'))
  assert.ok(activities.every((activity) => activity.audiencia !== 'apoderado'))
  assert.deepEqual(
    Array.from(parentActivities, (activity) => activity.id),
    ['pad-01-rol', 'pad-02-info'],
  )
  assert.ok(
    parentActivities.every(
      (activity) => activity.tipo === 'encuentro' && !activity.nodos.some((node) => node.tipo === 'consigna'),
    ),
  )
  assert.equal(catalog.personajes.find((person) => person.id === 'orientacion').rol, 'narrador')
  assert.ok(
    ['ficha-pad-rol', 'ficha-pad-info'].every((id) =>
      catalog.recursos.some((resource) => resource.id === id && resource.contenido),
    ),
  )
  const { validateActivity } = app.load('src/lib/activities/validation.ts'),
    activity = parentActivities[0]
  assert.throws(() => validateActivity({ ...activity, tipo: 'registro' }), /solo admite encuentros/)
  assert.throws(
    () => validateActivity({ ...activity, nodos: [{ id: 'bad', tipo: 'consigna' }] }),
    /Nodos incompatibles/,
  )
  assert.throws(
    () =>
      validateActivity({
        ...activity,
        nodos: [
          {
            id: 'bad',
            tipo: 'diapositiva',
            bloques: [{ tipo: 'tabla', columnas: ['a', 'b'], filas: [['only one']] }],
          },
        ],
      }),
    /Tabla incompatible/,
  )
})
test('parents answer exact sets, consume hints, reveal and cannot bypass a blocking question', () => {
  const app = fixture(),
    activity = app.content.parentActivities[0],
    node = activity.nodos.find((node) => node.formato === 'opcion_multiple')
  let state = app.parent.startParentActivity(activity, app.logic.initialJourney(), 'account-a')
  state.progress[activity.id].nodoActualId = node.id
  assert.equal(app.parent.advanceParentActivity(activity, node.id, state, 'account-a'), state)
  assert.equal(app.parent.answerParentQuestion(activity, node, [], state, 'account-a'), state)
  state = app.parent.answerParentQuestion(activity, node, ['a'], state, 'account-a')
  assert.equal(state.attempts[0].correcta, false)
  assert.equal(state.attempts[0].revelada, false)
  assert.equal(app.parent.advanceParentActivity(activity, node.id, state, 'account-a'), state)
  state = app.parent.answerParentQuestion(activity, node, ['b'], state, 'account-a')
  assert.equal(state.attempts[1].revelada, true)
  assert.equal(state.attempts[1].numeroIntento, 2)
  assert.notEqual(app.parent.advanceParentActivity(activity, node.id, state, 'account-a'), state)
  assert.equal(app.parent.answerParentQuestion(activity, node, ['c', 'a'], state, 'account-a'), state)
  assert.equal(state.attempts.length, 2)
  assert.ok(state.attempts.every((attempt) => attempt.estudianteId === 'account-a'))
})
test('new parent route ignores old completion IDs, gates ACT-P02 and completes without affinity or key pieces', () => {
  const app = fixture({
    'ov.student-adventure.v1': JSON.stringify({
      version: 1,
      parentCompletedActivityIds: ['role', 'lucia-support', 'mateo-support'],
    }),
  })
  const [first, second] = app.content.parentActivities
  assert.equal(app.parent.parentActivityAvailable(second, app.store.getParentJourney()), false)
  assert.deepEqual(
    clone(app.parent.completedParentActivities(app.content.parentActivities, app.store.getParentJourney())),
    [],
  )
  assert.equal(
    app.parent.startParentActivity(second, app.store.getParentJourney(), 'apo-prototipo'),
    app.store.getParentJourney(),
  )
  let state = finish(app, first)
  assert.equal(state.progress[first.id].estado, 'completada')
  assert.equal(state.progress[first.id].nodoActualId, '$fin')
  assert.equal(app.parent.parentActivityAvailable(second, state), true)
  assert.deepEqual(clone(state.choices), [])
  assert.deepEqual(clone(state.submissions), [])
  assert.deepEqual(clone(state.resources), ['ficha-pad-rol'])
  state = finish(app, second, state)
  assert.equal(app.parent.completedParentActivities(app.content.parentActivities, state).length, 2)
  assert.deepEqual(clone(state.rewards), [])
  assert.deepEqual(clone(state.pieces), [])
  assert.equal(app.logic.applyCompletion(first, state, 'apo-prototipo'), state)
  const withBadReward = {
    ...first,
    recompensa: { afinidad: 99, piezaLlave: 'bad', recursoIds: ['ficha-pad-rol'] },
  }
  const awarded = finish(app, withBadReward)
  assert.deepEqual(clone(awarded.rewards), [])
  assert.deepEqual(clone(awarded.pieces), [])
})

test('only explicitly registrable choices persist and review leaves completion and resources unchanged', () => {
  const app = fixture(),
    first = app.content.parentActivities[0]
  let state = app.parent.startParentActivity(first, app.logic.initialJourney(), 'apo-prototipo')
  state = app.parent.advanceParentActivity(first, first.nodos[0].id, state, 'apo-prototipo')
  const choice = first.nodos[1]
  assert.equal(app.parent.advanceParentActivity(first, choice.id, state, 'apo-prototipo', 'unknown'), state)
  const registrable = {
    ...first,
    nodos: first.nodos.map((node) => (node.id === choice.id ? { ...node, registrar: true } : node)),
  }
  state = app.parent.advanceParentActivity(
    registrable,
    choice.id,
    state,
    'apo-prototipo',
    choice.opciones[0].id,
  )
  assert.equal(state.choices.length, 1)
  assert.equal(state.choices[0].opcionId, choice.opciones[0].id)
  assert.equal(state.choices[0].estudianteId, 'apo-prototipo')
  const completed = finish(app, first)
  const reviewed = app.parent.advanceParentActivity(first, first.nodos[0].id, completed, 'apo-prototipo')
  assert.deepEqual(clone(reviewed.progress), clone(completed.progress))
  assert.deepEqual(clone(reviewed.resources), ['ficha-pad-rol'])
  assert.equal(reviewed.progress[first.id].nodoActualId, '$fin')
})

test('old encounter follow-up records stay intact without creating new submissions and the family letter uses its default', async () => {
  const app = fixture(),
    followups = app.load('src/features/activities/store/followUpStore.ts')
  const activity = app.content.activities.find((activity) => activity.id === 'enc-mitos')
  const submission = app.content.activities
    .find((activity) => activity.id === 'act-07')
    .nodos.find((node) => node.tipo === 'consigna')
  const node = { ...submission, id: 'e22' },
    key = `${activity.id}/${node.id}`
  const record = {
    textoInicial: 'Consejo anterior',
    versionInicial: 1,
    turnos: [
      {
        orden: 1,
        pregunta: '¿Por qué?',
        respuesta: 'Porque es importante conversar.',
        omitida: false,
        creadaEn: '2026-10-05T10:00:00Z',
      },
    ],
  }
  followups.setFollowUpRecord(key, record)
  const journey = app.load('src/store/journeyStore.ts')
  const before = clone(journey.useJourney())
  assert.equal((await followups.recoverFollowUp(activity, node)).saved, false)
  assert.equal((await followups.saveFollowUpResponse(activity, node)).saved, false)
  assert.deepEqual(clone(followups.getFollowUpRecord(key)), record)
  assert.deepEqual(clone(journey.useJourney()), before)
  const { getFamilyGiftLetter } = app.load('src/data/content/familyConversations.ts')
  const legacy = {
    familyGift: { parentCommitment: 'Texto guardado en la actividad antigua' },
    reflectionDrafts: {},
  }
  assert.match(getFamilyGiftLetter(legacy, 'student'), /^Me comprometo a escucharte/)
  assert.doesNotMatch(getFamilyGiftLetter(legacy, 'student'), /actividad antigua/)
  assert.equal(legacy.familyGift.parentCommitment, 'Texto guardado en la actividad antigua')
})
test('parent storage preserves resume and attempts across sessions, isolates accounts and does not touch student state', () => {
  const app = fixture({ 'ov.missions.v2': 'student-sentinel' }),
    first = app.content.parentActivities[0]
  let state = app.parent.startParentActivity(first, app.logic.initialJourney(), 'account-a')
  state = app.parent.advanceParentActivity(first, first.nodos[0].id, state, 'account-a')
  assert.equal(
    app.store.updateParentJourney(() => state, 'account-a'),
    true,
  )
  app.store.updateParentJourney((current) => ({ ...current, resources: ['other'] }), 'account-b')
  assert.equal(app.disk.get('ov.missions.v2'), 'student-sentinel')
  const again = fixture(Object.fromEntries(app.disk)),
    loaded = again.store.getParentJourney('account-a')
  assert.equal(loaded.progress[first.id].nodoActualId, 'p1-02')
  assert.deepEqual(clone(again.store.getParentJourney('account-b').resources), ['other'])
  assert.deepEqual(clone(again.store.getParentJourney('account-b').progress), {})
  assert.deepEqual(clone(again.store.getParentJourney('account-c').progress), {})
  const before = again.store.getParentJourney('account-a')
  again.fail(true)
  assert.equal(
    again.store.updateParentJourney(() => finish(again, first, before, 'account-a'), 'account-a'),
    false,
  )
  assert.equal(again.store.getParentJourney('account-a'), before)
  assert.match(again.store.useParentJourneyError(), /No se pudo guardar/)
  again.fail(false)
  assert.equal(
    again.store.updateParentJourney(() => finish(again, first, before, 'account-a'), 'account-a'),
    true,
  )
  assert.equal(again.store.useParentJourneyError(), '')
  assert.equal(again.store.getParentJourney('account-a').progress[first.id].estado, 'completada')
})
test('storage updates from other tabs merge accounts, handle corrupt data and reject another account identity', () => {
  const app = fixture(),
    completed = finish(app, app.content.parentActivities[0], undefined, 'account-a')
  app.external('ov.parent-missions.v1', JSON.stringify({ version: 1, accounts: { 'account-a': completed } }))
  assert.equal(app.store.getParentJourney('account-a').progress['pad-01-rol'].estado, 'completada')
  app.store.updateParentJourney((state) => ({ ...state, resources: ['b'] }), 'account-b')
  assert.equal(
    JSON.parse(app.disk.get('ov.parent-missions.v1')).accounts['account-a'].progress['pad-01-rol'].estado,
    'completada',
  )
  app.external('ov.parent-missions.v1', JSON.stringify({ version: 1, accounts: { 'account-b': completed } }))
  assert.deepEqual(clone(app.store.getParentJourney('account-b').progress), {})
  for (const data of ['bad json', '{}', '{"version":1,"accounts":[]}']) {
    app.external('ov.parent-missions.v1', data)
    assert.deepEqual(clone(app.store.getParentJourney().progress), {})
  }
})
test('sobriety, step count, direct-link lock, resume, completion resources and review remain correct', () => {
  const app = fixture(),
    first = app.content.parentActivities[0]
  assert.match(app.render(), /Paso 1 de 13/)
  assert.match(app.render(), /Continuar/)
  assert.match(app.render(), /aria-label="Salir de la actividad"/)
  assert.match(app.render(), /Anterior/)
  assert.doesNotMatch(app.render(), /GuideDialogue|sx-character|<textarea|Mostrar todo|<img|animate-in/)
  assert.match(app.render('pad-02-info'), /Actividad bloqueada/)
  assert.match(app.render('does-not-exist'), /Actividad no encontrada/)
  let state = app.parent.startParentActivity(first, app.logic.initialJourney(), 'apo-prototipo')
  const question = first.nodos.find((node) => node.tipo === 'pregunta')
  state.progress[first.id].nodoActualId = question.id
  state = app.parent.answerParentQuestion(first, question, ['a'], state, 'apo-prototipo')
  app.store.updateParentJourney(() => state)
  assert.match(app.render(), /Casi\. Piénselo una vez más\./)
  assert.match(app.render(), /Volver a intentarlo/)
  assert.doesNotMatch(app.render(), /Equipo de orientación|Para recordar/)
  app.store.updateParentJourney(() => finish(app, first))
  assert.match(app.render(), /material de consulta/i)
  assert.match(app.render(), /Abrir ficha/)
  const before = clone(app.store.getParentJourney())
  assert.match(app.render('pad-01-rol', 'repasar=1'), /Paso 1 de 13/)
  assert.deepEqual(clone(app.store.getParentJourney()), before)
})

test('backward navigation preserves attempts, resumes at the saved node and leaves completed reviews intact', () => {
  const app = fixture(),
    first = app.content.parentActivities[0]
  let state = app.parent.startParentActivity(first, app.logic.initialJourney(), 'apo-prototipo')
  assert.equal(app.parent.retreatParentActivity(first, first.nodos[0].id, state), state)
  const question = first.nodos.find((node) => node.tipo === 'pregunta')
  state.progress[first.id].nodoActualId = question.id
  state = app.parent.answerParentQuestion(
    first,
    question,
    question.opciones.filter((option) => option.correcta).map((option) => option.id),
    state,
    'apo-prototipo',
  )
  state = app.parent.advanceParentActivity(first, question.id, state, 'apo-prototipo')
  const currentId = state.progress[first.id].nodoActualId
  assert.equal(app.parent.retreatParentActivity(first, first.nodos[0].id, state), state)
  app.store.updateParentJourney(() => state)
  app.fail(true)
  assert.equal(
    app.store.updateParentJourney((current) => app.parent.retreatParentActivity(first, currentId, current)),
    false,
  )
  assert.equal(app.store.getParentJourney().progress[first.id].nodoActualId, currentId)
  app.fail(false)
  assert.equal(
    app.store.updateParentJourney((current) => app.parent.retreatParentActivity(first, currentId, current)),
    true,
  )
  const returned = app.store.getParentJourney()
  assert.equal(returned.progress[first.id].nodoActualId, question.id)
  assert.deepEqual(clone(returned.attempts), clone(state.attempts))
  const reloaded = fixture(Object.fromEntries(app.disk))
  assert.match(reloaded.render(), /Su respuesta · Correcta/)
  assert.equal(reloaded.store.getParentJourney().progress[first.id].nodoActualId, question.id)
  const complete = finish(app, first)
  assert.equal(app.parent.retreatParentActivity(first, '$fin', complete), complete)
  assert.equal(app.parent.retreatParentActivity(first, currentId, complete), complete)
  assert.equal(app.parent.retreatParentActivity(app.content.parentActivities[1], 'p2-02', returned), returned)
})

test('parent activity routes use the isolated player while the activity list retains its portal shell', () => {
  const app = fixture()
  const { ParentPortalModule } = app.load('src/pages/parent/ParentPortalModule.tsx')
  const render = (pathname) =>
    renderToStaticMarkup(
      React.createElement(
        MemoryRouter,
        { initialEntries: [pathname] },
        React.createElement(ParentPortalModule),
      ),
    )
  assert.doesNotMatch(
    render('/parent/activities/pad-01-rol'),
    /Toggle Sidebar|Mis actividades|Notificaciones/,
  )
  assert.match(render('/parent/activities/pad-01-rol'), /theme-staff/)
  assert.match(render('/parent/activities'), /Mis actividades/)
})
test('table blocks preserve headings and mobile labels, choices show their own prompt, narrators omit avatars', () => {
  const app = fixture(),
    table = {
      tipo: 'tabla',
      titulo: 'Rutas',
      columnas: ['Ruta', 'Tiempo'],
      filas: [['Técnica', '2 años']],
      nota: 'Referencial',
    }
  for (const [file, component] of [
    ['src/features/parent/components/ParentContent.tsx', 'ParentContent'],
    ['src/features/activities/components/ContentBlocks.tsx', 'ContentBlocks'],
  ]) {
    const html = renderToStaticMarkup(React.createElement(app.load(file)[component], { blocks: [table] }))
    assert.match(html, /scope="col"/)
    assert.match(html, /data-label="Ruta"/)
    assert.match(html, /Técnica/)
    assert.match(html, /Referencial/)
  }
  const { ChoiceNode } = app.load('src/features/activities/components/nodes/ChoiceNode.tsx')
  const html = renderToStaticMarkup(
    React.createElement(ChoiceNode, {
      node: {
        tipo: 'eleccion',
        id: 'c',
        enunciado: 'Una pregunta propia',
        nota: 'No se guarda',
        opciones: [],
        registrar: false,
      },
      onChoose() {},
    }),
  )
  assert.match(html, /Una pregunta propia/)
  assert.match(html, /No se guarda/)
  const { CharacterAvatar } = app.load('src/components/student/CharacterAvatar.tsx')
  assert.equal(renderToStaticMarkup(React.createElement(CharacterAvatar, { id: 'orientacion' })), '')
})

test('parent feedback uses the agreed two-attempt flow for unique, multiple and two-option questions', () => {
  const app = fixture(),
    first = app.content.parentActivities[0]
  const single = first.nodos.find((node) => node.formato === 'opcion_unica')
  const multiple = first.nodos.find((node) => node.formato === 'opcion_multiple')
  const binary = first.nodos.find((node) => node.formato === 'verdadero_falso')
  const evaluate = app.parent.evaluateParentQuestion
  const good = single.opciones.find((option) => option.correcta),
    bad = single.opciones.filter((option) => !option.correcta)
  assert.equal(evaluate(single, [good.id], 0).correct, true)
  const hint = evaluate(single, [bad[0].id], 0)
  assert.equal(hint.title, 'Casi. Piénselo una vez más.')
  assert.equal(hint.canContinue, false)
  assert.equal(hint.revealed, false)
  assert.deepEqual(clone(hint.explanations), [bad[0].retroalimentacion])
  assert.ok(!hint.title.includes(good.texto))
  const final = evaluate(single, [bad[1].id], 1)
  assert.equal(final.revealed, true)
  assert.equal(final.canContinue, true)
  assert.ok(final.title.includes(good.texto))
  assert.deepEqual(clone(final.explanations), [good.retroalimentacion])
  assert.equal(evaluate(single, [good.id], 1).correct, true)
  const binaryBad = binary.opciones.find((option) => !option.correcta)
  assert.equal(evaluate(binary, [binaryBad.id], 0).revealed, true)
  const correctSet = multiple.opciones.filter((option) => option.correcta),
    wrong = multiple.opciones.find((option) => !option.correcta)
  const mixed = evaluate(multiple, [correctSet[0].id, wrong.id], 0)
  assert.equal(
    mixed.title,
    'Va por buen camino. Algunas de sus opciones no corresponden y quedaron marcadas en naranja. Revise si falta alguna.',
  )
  assert.deepEqual(clone(mixed.wrongIds), [wrong.id])
  assert.deepEqual(clone(mixed.explanations), [wrong.retroalimentacion])
  const missing = evaluate(multiple, [correctSet[0].id], 0)
  assert.equal(missing.title, 'Va por buen camino, pero falta al menos una opción.')
  assert.deepEqual(clone(missing.explanations), [])
  assert.deepEqual(clone(missing.wrongIds), [])
  assert.equal(evaluate(multiple, [wrong.id], 0).title, 'Casi. Piénselo una vez más.')
  assert.equal(evaluate(multiple, [correctSet[0].id], 1).revealed, true)
  assert.equal(evaluate(multiple, [...correctSet.map((option) => option.id), wrong.id], 1).correct, false)
  assert.equal(evaluate(multiple, correctSet.map((option) => option.id).reverse(), 1).correct, true)
  const fallback = {
    ...single,
    opciones: single.opciones.map((option) => ({ ...option, retroalimentacion: '' })),
  }
  assert.deepEqual(clone(evaluate(fallback, [bad[0].id], 0).explanations), [single.explicacion])
})

test('disabled incorrect choices cannot be recorded again, partial answers do not count as first-attempt success', () => {
  const app = fixture(),
    activity = app.content.parentActivities[0]
  const node = activity.nodos.find((node) => node.formato === 'opcion_multiple')
  const correctIds = node.opciones.filter((option) => option.correcta).map((option) => option.id),
    wrongId = node.opciones.find((option) => !option.correcta).id
  let state = app.parent.startParentActivity(activity, app.logic.initialJourney(), 'apo-prototipo')
  state.progress[activity.id].nodoActualId = node.id
  state = app.parent.answerParentQuestion(activity, node, [correctIds[0], wrongId], state, 'apo-prototipo')
  assert.equal(state.attempts[0].correcta, false)
  const original = clone(state.attempts[0])
  assert.equal(
    app.parent.answerParentQuestion(activity, node, [...correctIds, wrongId], state, 'apo-prototipo'),
    state,
  )
  state = app.parent.answerParentQuestion(activity, node, correctIds, state, 'apo-prototipo')
  assert.equal(state.attempts[1].correcta, true)
  assert.equal(state.attempts[1].numeroIntento, 2)
  assert.deepEqual(clone(state.attempts[0]), original)
  assert.equal(app.parent.answerParentQuestion(activity, node, correctIds, state, 'apo-prototipo'), state)
  assert.equal(state.attempts.filter((attempt) => attempt.numeroIntento === 1 && attempt.correcta).length, 0)
})

test('two-option reveal resolves new and historical attempts without rewriting old records or changing student evaluation', () => {
  const app = fixture(),
    activity = app.content.parentActivities[0],
    node = activity.nodos.find((node) => node.formato === 'verdadero_falso')
  const wrongId = node.opciones.find((option) => !option.correcta).id
  let state = app.parent.startParentActivity(activity, app.logic.initialJourney(), 'apo-prototipo')
  state.progress[activity.id].nodoActualId = node.id
  state = app.parent.answerParentQuestion(activity, node, [wrongId], state, 'apo-prototipo')
  assert.equal(state.attempts[0].revelada, true)
  assert.equal(app.parent.answerParentQuestion(activity, node, [wrongId], state, 'apo-prototipo'), state)
  assert.equal(app.logic.evaluateQuestion(node, [wrongId], 0).revealed, false)
  const legacy = clone(state)
  legacy.attempts[0].revelada = false
  const oldRecords = clone(legacy.attempts)
  const advanced = app.parent.advanceParentActivity(activity, node.id, legacy, 'apo-prototipo')
  assert.notEqual(advanced, legacy)
  assert.deepEqual(clone(advanced.attempts), oldRecords)
  assert.equal(
    app.parent.nextParentPendingNode(activity, advanced).id,
    activity.nodos.find((candidate) => candidate.tipo === 'pregunta').id,
  )
  const previouslyFinished = finish(app, activity)
  previouslyFinished.attempts = previouslyFinished.attempts.map((attempt) =>
    attempt.nodoId === node.id ? { ...legacy.attempts[0] } : attempt,
  )
  previouslyFinished.progress[activity.id].estado = 'en_curso'
  previouslyFinished.progress[activity.id].nodoActualId = activity.nodos.at(-1).id
  const complete = app.parent.advanceParentActivity(
    activity,
    activity.nodos.at(-1).id,
    previouslyFinished,
    'apo-prototipo',
  )
  assert.equal(complete.progress[activity.id].estado, 'completada')
  assert.deepEqual(clone(complete.attempts), clone(previouslyFinished.attempts))
  assert.equal(app.parent.completedParentActivities(app.content.parentActivities, complete).length, 1)
})

test('feedback markup separates hints and final answers, summary uses the ficha card and repaso starts without saved answers', () => {
  const app = fixture(),
    first = app.content.parentActivities[0],
    node = first.nodos.find((node) => node.formato === 'opcion_multiple')
  const good = node.opciones.filter((option) => option.correcta),
    wrong = node.opciones.find((option) => !option.correcta)
  let state = app.parent.startParentActivity(first, app.logic.initialJourney(), 'apo-prototipo')
  for (const earlier of first.nodos.slice(0, first.nodos.indexOf(node)))
    if (earlier.tipo === 'pregunta')
      state = app.parent.answerParentQuestion(
        first,
        earlier,
        earlier.opciones.filter((option) => option.correcta).map((option) => option.id),
        state,
        'apo-prototipo',
      )
  state.progress[first.id].nodoActualId = node.id
  app.store.updateParentJourney(() => state)
  assert.match(app.render(), /Comprobar respuesta/)
  assert.match(app.render(), /aria-valuetext="Paso 8 de 13"/)
  state = app.parent.answerParentQuestion(first, node, [good[0].id, wrong.id], state, 'apo-prototipo')
  app.store.updateParentJourney(() => state)
  const hint = app.render()
  assert.match(hint, /data-tone="wrong"/)
  assert.match(hint, /aria-live="polite"/)
  assert.doesNotMatch(hint, /data-tone="correct"|Para recordar|Respuestas correctas|Revise la respuesta/)
  state = app.parent.answerParentQuestion(
    first,
    node,
    good.map((option) => option.id),
    state,
    'apo-prototipo',
  )
  app.store.updateParentJourney(() => state)
  assert.match(app.render(), /Su respuesta · Correcta/)
  assert.match(app.render(), /Para recordar/)
  state = finish(app, first)
  app.store.updateParentJourney(() => state)
  const before = clone(app.store.getParentJourney())
  app.fail(true)
  assert.equal(
    app.parent.answerParentQuestion(
      first,
      node,
      good.map((option) => option.id),
      state,
      'apo-prototipo',
    ),
    state,
  )
  app.render(first.id, 'repasar=1')
  assert.deepEqual(clone(app.store.getParentJourney()), before)
  app.fail(false)
  const summaryState = clone(state)
  summaryState.progress[first.id].estado = 'en_curso'
  summaryState.progress[first.id].nodoActualId = first.nodos.at(-1).id
  app.store.updateParentJourney(() => summaryState)
  const summary = app.render()
  assert.match(summary, /NUEVA FICHA EN SU MATERIAL DE CONSULTA/)
  assert.match(summary, /parent-summary-list/)
  assert.match(summary, /Terminar actividad/)
  assert.doesNotMatch(summary, /Este resumen queda guardado como ficha/)
})

test('completion counts all parent blocks and uses the same route completeness for diploma and next activity', () => {
  const app = fixture(),
    [first, second] = app.content.parentActivities
  const later = {
    ...first,
    id: 'pad-later',
    bloque: 8,
    orden: 99,
    titulo: 'Otro momento de la ruta',
    requisitos: [second.id],
  }
  app.content.parentActivities.push(later)
  let state = finish(app, second, finish(app, first))
  app.store.updateParentJourney(() => state)
  const html = app.render(second.id)
  assert.match(html, /2 de 3 actividades/)
  assert.match(html, /Otro momento de la ruta/)
  assert.match(html, /Empezar/)
  assert.doesNotMatch(html, /Obtuvo su diploma|Anterior/)
  state = finish(app, later, state)
  app.store.updateParentJourney(() => state)
  const complete = app.render(later.id)
  assert.match(complete, /3 de 3 actividades/)
  assert.match(complete, /Ver mi diploma en el inicio/)
  assert.doesNotMatch(complete, /Anterior/)
})

test('editorial transitions appear only at the eight approved moments and stay short', () => {
  const app = fixture(),
    expected = ['p1-03', 'p1-05', 'p1-11', 'p1-13', 'p2-03', 'p2-04', 'p2-08', 'p2-11']
  const nodes = app.content.parentActivities.flatMap((activity) =>
    activity.nodos.filter((node) => node.transicion),
  )
  assert.deepEqual(clone(nodes.map((node) => node.id)), expected)
  assert.ok(
    nodes.every(
      (node) =>
        node.transicion.split(/\s+/).length <= 20 && /^Listo, ya .+\. Ahora, .+\.$/.test(node.transicion),
    ),
  )
  assert.ok(app.content.parentActivities.every((activity) => !activity.nodos[0].transicion))
})
