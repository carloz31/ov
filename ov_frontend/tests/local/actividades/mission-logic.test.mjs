import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'

const code = ts.transpileModule(readFileSync('src/lib/activities/logic.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 },
}).outputText
const logic = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
const json = (name) => JSON.parse(readFileSync(`src/data/activities/${name}.json`, 'utf8'))
const map = json('contenidos/registro_linea_tiempo')
const myths = json('contenidos/encuentro_mitos')
const mara = json('contenidos/instrumento_mara')
const catalog = json('catalogo')
const pregones = json('contenidos/registro_mis_pregones')

test('ACT-07 requires three valid submissions and keeps versions, affinity and journal prompt', () => {
  let state = logic.initialJourney()
  const nodes = pregones.nodos.filter((node) => node.tipo === 'consigna')
  assert.equal(nodes.length, 3)
  assert.deepEqual(pregones.requisitos, ['enc-mitos'])
  assert.ok(pregones.promptDiario)
  for (const node of nodes) {
    assert.ok(
      logic.validateSubmission(node, { tipo: 'texto', texto: 'x'.repeat(node.entregable.minCaracteres - 1) }),
    )
    assert.ok(
      logic.validateSubmission(node, { tipo: 'texto', texto: 'x'.repeat(node.entregable.maxCaracteres + 1) }),
    )
    const content = { tipo: 'texto', texto: 'x'.repeat(node.entregable.minCaracteres) }
    assert.equal(logic.validateSubmission(node, content), undefined)
    assert.equal(logic.isActivityComplete(pregones, state), false)
    state.submissions.push({
      id: node.id,
      estudianteId: 'est-prototipo',
      actividadId: pregones.id,
      nodoId: node.id,
      contenido: content,
      version: 1,
    })
  }
  assert.equal(logic.isActivityComplete(pregones, state), true)
  state = logic.applyCompletion(pregones, state)
  assert.equal(state.progress[pregones.id].estado, 'completada')
  assert.equal(state.rewards[0].cantidad, 1)
  state.submissions.push({ ...state.submissions[0], version: 2 })
  assert.equal(logic.applyCompletion(pregones, state).rewards.length, 1)
  assert.equal(state.submissions.length, 4)
})

test('pending legacy myths resume at new e22 without deleting history or reopening completed runs', () => {
  const state = logic.initialJourney()
  state.attempts = myths.nodos
    .filter((node) => node.tipo === 'pregunta' && node.id !== 'e22')
    .map((node) => ({ actividadId: myths.id, nodoId: node.id, correcta: true }))
  state.submissions = [
    {
      actividadId: myths.id,
      nodoId: 'e22',
      contenido: { tipo: 'texto', texto: 'Consejo anterior' },
      version: 1,
    },
  ]
  state.drafts['enc-mitos/e22'] = 'Borrador anterior'
  for (const saved of ['e23', 'e24', '$fin']) {
    state.progress[myths.id] = { estado: 'en_curso', nodoActualId: saved }
    assert.equal(logic.nextPendingNode(myths, state, false).id, 'e22')
  }
  assert.equal(state.submissions[0].contenido.texto, 'Consejo anterior')
  assert.equal(state.drafts['enc-mitos/e22'], 'Borrador anterior')
  state.progress[myths.id] = { estado: 'completada', nodoActualId: '$fin' }
  assert.equal(logic.nextPendingNode(myths, state, false), undefined)
  state.progress[myths.id] = { estado: 'en_curso', nodoActualId: 'e23' }
  state.attempts.push({ actividadId: myths.id, nodoId: 'e22', revelada: true })
  assert.equal(logic.nextPendingNode(myths, state, false).id, 'e23')
})
const submission = (node, content, version = 1) => ({
  id: `${node.id}/${version}`,
  estudianteId: 'est-prototipo',
  actividadId: map.id,
  nodoId: node.id,
  contenido: content ?? {
    tipo: 'texto',
    texto: 'Una meta que me gustaría explorar y sostener con ayuda de mi familia.',
  },
  version,
  enviadoEn: '2026-09-26T12:00:00Z',
})

test('multiple answers require the exact set, regardless of order', () => {
  const question = myths.nodos.find((node) => node.id === 'e19')
  assert.equal(logic.evaluateQuestion(question, ['d', 'a', 'c'], 0).correct, true)
  for (const selected of [['a'], ['a', 'c'], ['a', 'b', 'c', 'd'], []]) {
    assert.equal(logic.evaluateQuestion(question, selected, 0).correct, false)
  }
})
test('failed attempts consume hints before revealing and never assign student scores', () => {
  const question = myths.nodos.find((node) => node.id === 'e08')
  const first = logic.evaluateQuestion(question, ['a'], 0)
  assert.equal(first.hint.id, 'e08p1')
  assert.equal(first.canContinue, false)
  assert.equal(first.revealed, false)
  const second = logic.evaluateQuestion(question, ['a'], 1)
  assert.equal(second.revealed, true)
  assert.equal(second.canContinue, true)
  assert.equal(
    logic.evaluateQuestion({ ...question, alAgotarPistas: 'reintentar' }, ['a'], 10).canContinue,
    false,
  )
  assert.equal(logic.evaluateQuestion({ ...question, bloqueante: false }, ['a'], 0).canContinue, true)
})
test('encounter requires its blocking questions and ending; rewards apply only once', () => {
  assert.equal(myths.nodos.find((node) => node.id === 'e22').tipo, 'pregunta')
  assert.equal(
    myths.nodos.some((node) => node.tipo === 'consigna'),
    false,
  )
  let state = logic.initialJourney()
  state.progress[myths.id] = {
    estudianteId: 'est-prototipo',
    actividadId: myths.id,
    estado: 'en_curso',
    nodoActualId: '$fin',
  }
  assert.equal(logic.isActivityComplete(myths, state), false)
  state.attempts = myths.nodos
    .filter((node) => node.tipo === 'pregunta' && node.bloqueante)
    .map((node) => ({ actividadId: myths.id, nodoId: node.id, correcta: true, revelada: false }))
  assert.equal(logic.isActivityComplete(myths, state), true)
  state = logic.applyCompletion(myths, state)
  assert.equal(state.progress[myths.id].estado, 'completada')
  assert.deepEqual(state.pieces, ['pieza-plaza'])
  assert.deepEqual(state.resources, ['ficha-mitos'])
  assert.equal(logic.applyCompletion(myths, state).rewards.length, 1)
})

test('timeline completes with seven required entries while five cells remain optional', () => {
  const state = logic.initialJourney()
  const required = map.nodos.filter((node) => node.tipo === 'consigna' && node.obligatoria)
  assert.equal(required.length, 7)
  state.submissions = required.slice(1).map((node) => submission(node))
  assert.equal(logic.isActivityComplete(map, state), false)
  state.submissions.push(submission(required[0]))
  assert.equal(logic.isActivityComplete(map, state), true)
})
test('handmade file replaces only the slots, never the identity reflection', () => {
  const state = logic.initialJourney()
  const upload = map.nodos.find((node) => node.id === 'g-archivo')
  const identity = map.nodos.find((node) => node.id === 'g-identidad')
  state.submissions = [
    submission(upload, {
      tipo: 'archivo',
      archivos: [{ id: '1', nombre: 'mapa.png', mime: 'image/png', tamanoBytes: 200, url: 'indexeddb:1' }],
    }),
  ]
  assert.equal(logic.isActivityComplete(map, state), false)
  state.submissions.push(submission(identity))
  assert.equal(logic.isActivityComplete(map, state), true)
})
test('file limits reject invalid extensions, oversized files and empty uploads', () => {
  const node = map.nodos.find((node) => node.id === 'g-archivo')
  const file = { id: '1', nombre: 'mapa.PNG', mime: 'image/png', tamanoBytes: 100, url: 'indexeddb:1' }
  assert.equal(logic.validateSubmission(node, { tipo: 'archivo', archivos: [file] }), undefined)
  for (const files of [
    [],
    [{ ...file, nombre: 'mapa.exe' }],
    [{ ...file, tamanoBytes: 11 * 1024 * 1024 }],
    [file, file, file, file],
  ]) {
    assert.ok(logic.validateSubmission(node, { tipo: 'archivo', archivos: files }))
  }
})
test('editing preserves previous versions and does not repeat affinity', () => {
  let state = logic.initialJourney()
  state.submissions = map.nodos
    .filter((node) => node.tipo === 'consigna' && node.obligatoria)
    .map((node) => submission(node))
  state = logic.applyCompletion(map, state)
  const node = map.nodos.find((node) => node.id === 'g-identidad')
  const before = logic.latestSubmission(state, map.id, node.id)
  state.submissions.push(
    submission(
      node,
      { tipo: 'texto', texto: 'Mi nueva meta ahora incorpora lo que descubrí durante el recorrido.' },
      2,
    ),
  )
  state = logic.applyCompletion(map, state)
  assert.equal(logic.latestSubmission(state, map.id, node.id).version, 2)
  assert.ok(state.submissions.includes(before))
  assert.equal(state.rewards.length, 1)
})
test('instrument resumes without repeating answered items and direct mode has no dialogue', () => {
  const state = logic.initialJourney()
  state.items = [{ instrumentoId: 'tip', itemId: 'tip-001', aplicacion: 'unica', valor: 'no' }]
  state.progress[mara.id] = { nodoActualId: 'm05' }
  assert.equal(logic.nextPendingNode(mara, state, true).itemId, 'tip-002')
  assert.equal(logic.nextPendingNode(mara, state, false).id, 'm06')
  assert.ok(logic.visibleNodes(mara, true).every((node) => node.tipo === 'item'))
  assert.equal(logic.visibleNodes(mara, true).length, 7)
  assert.equal(logic.isActivityComplete(mara, state), false)
  state.items = catalog.instrumentos[0].items.map((item) => ({
    instrumentoId: 'tip',
    itemId: item.id,
    aplicacion: 'unica',
    valor: 'no',
  }))
  assert.equal(logic.isActivityComplete(mara, state), true)
  assert.equal(logic.applyCompletion(mara, state).rewards[0].cantidad, 1)
  state.progress[mara.id] = { nodoActualId: '$fin' }
  assert.equal(logic.nextPendingNode(mara, state, false), undefined)
})
test('profile cannot be invented from sample key or incomplete fourteen-part instrument', () => {
  const state = logic.initialJourney()
  const ids = Array.from({ length: 14 }, (_, i) => `act-tip-${String(i + 1).padStart(2, '0')}`)
  const instrument = catalog.instrumentos[0]
  assert.equal(logic.calculateResult(instrument, state, ids), undefined)
  ids.forEach((id) => {
    state.progress[id] = { estado: 'completada' }
  })
  state.items = instrument.items.map((item) => ({
    instrumentoId: 'tip',
    itemId: item.id,
    aplicacion: 'unica',
    valor: 'si',
  }))
  assert.equal(logic.calculateResult(instrument, state, ids), undefined)
  const official = {
    ...instrument,
    items: instrument.items.map((item, i) => ({ ...item, codigo: String(i + 1) })),
    clave: {
      dimensiones: [{ id: 'dimension', nombre: 'Dimensión de prueba' }],
      asignacion: [{ itemId: 'tip-001', dimensionId: 'dimension', valorQueSuma: 'si' }],
    },
  }
  assert.deepEqual(logic.calculateResult(official, state, ids).puntajes, [
    { dimensionId: 'dimension', puntaje: 1 },
  ])
  delete state.progress[ids[13]]
  assert.equal(logic.calculateResult(official, state, ids), undefined)
})
