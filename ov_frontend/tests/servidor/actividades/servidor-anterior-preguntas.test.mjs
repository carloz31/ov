import assert from 'node:assert/strict'
import test from 'node:test'
import { elementos, fixtureServidor } from '../../soporte/servidor-ayudas.mjs'

// Ajuste coherencia-bloque0: «Anterior» también en una pregunta y en el paso que la sigue. Al volver a una pregunta
// ya resuelta se ve resuelta (opción correcta, explicación y «Continuar el camino»), sin intentos nuevos. Con b0-5,
// cuya pregunta b0-5-10 es de varias respuestas.
const de = (tree, nombre) => elementos(tree, (e) => e.type?.name === nombre)[0]
const opciones = (tree) => elementos(tree, (e) => e.type?.name === 'CheckOption')
const boton = (tree, texto) =>
  elementos(
    tree,
    (e) => e.type === 'button' && [].concat(e.props.children).some((c) => typeof c === 'string' && c.includes(texto)),
  )[0]
const b05 = (app) => app.load('src/data/activities/contenidos.ts').contenidoPorClave('b0_5')

test('en el reproductor, la pregunta y el paso que la sigue tienen «Anterior»', () => {
  const app = fixtureServidor()
  const activity = b05(app)
  const { StudentActivityPlayer } = app.load('src/features/activities/components/StudentActivityPlayer.tsx')
  const player = app.mount(StudentActivityPlayer, { activity, edit: true, onClose() {} })
  let pregunta
  for (let i = 0; i < 40 && pregunta?.props.node.id !== 'b0-5-10'; i++) {
    const tree = player.render()
    pregunta = de(tree, 'QuestionNode')
    if (pregunta?.props.node.id === 'b0-5-10') break
    const eleccion = de(tree, 'ChoiceNode')
    const diapositiva = de(tree, 'SlideNode')
    if (pregunta) pregunta.props.onContinue()
    else if (eleccion) eleccion.props.onChoose(eleccion.props.node.opciones[0])
    else if (diapositiva) diapositiva.props.onContinue()
    else de(tree, 'DialogueBox').props.onContinue()
  }
  assert.equal(pregunta.props.node.formato, 'opcion_multiple')
  assert.equal(typeof pregunta.props.onAnterior, 'function')
  const intentos = pregunta.props.intentosRevision
  pregunta.props.onContinue()
  de(player.render(), 'DialogueBox').props.onAnterior()
  const vuelta = de(player.render(), 'QuestionNode')
  assert.equal(vuelta.props.node.id, 'b0-5-10')
  // Los intentos de la visita siguen siendo los mismos al volver.
  assert.equal(vuelta.props.intentosRevision, intentos)
  vuelta.props.onAnterior()
  const previo = de(player.render(), 'DialogueBox')
  assert.equal(previo.props.text, activity.nodos.find((n) => n.id === 'b0-5-09').texto)
  player.unmount()
})

for (const fresh of [false, true]) {
  test(`${fresh ? 'al rehacer' : 'la primera vez'}, una pregunta resuelta se ve resuelta al volver, sin intentos nuevos`, () => {
    const app = fixtureServidor()
    const store = app.load('src/store/journeyStore.ts')
    const { QuestionNode } = app.load('src/features/activities/components/nodes/QuestionNode.tsx')
    const activity = b05(app)
    const node = activity.nodos.find((n) => n.id === 'b0-5-10')
    const intentosRevision = {}
    let anterior = 0
    const props = { activity, node, fresh, intentosRevision, onContinue() {}, onResources() {}, onAnterior: () => anterior++ }
    let vista = app.mount(QuestionNode, props)
    let tree = vista.render()
    assert.ok(de(tree, 'PasoAnterior'), 'antes de responder')
    for (const opcion of node.opciones.filter((o) => o.correcta)) {
      opciones(vista.render()).find((o) => o.props.text === opcion.texto).props.onClick()
    }
    boton(vista.render(), 'Comprobar').props.onClick()
    tree = vista.render()
    assert.ok(boton(tree, 'Continuar el camino'))
    assert.ok(de(tree, 'PasoAnterior'), 'después de responder')
    const guardados = store.getJourneySnapshot().attempts.length
    assert.equal(guardados, fresh ? 0 : 1)
    assert.equal(intentosRevision['b0-5-10']?.length ?? 0, fresh ? 1 : 0)
    vista.unmount()
    // Se vuelve a la pregunta: se ve resuelta, con su explicación, y no pide responder.
    vista = app.mount(QuestionNode, props)
    tree = vista.render()
    assert.ok(boton(tree, 'Continuar el camino'))
    assert.equal(boton(tree, 'Comprobar'), undefined)
    assert.deepEqual(
      opciones(tree).map((o) => o.props.state),
      ['correct', 'correct', 'correct', 'muted'],
    )
    assert.ok(opciones(tree).every((o) => o.props.explanation && o.props.disabled))
    de(tree, 'PasoAnterior').props.onClick()
    assert.equal(anterior, 1)
    assert.equal(store.getJourneySnapshot().attempts.length, guardados)
    vista.unmount()
  })
}
