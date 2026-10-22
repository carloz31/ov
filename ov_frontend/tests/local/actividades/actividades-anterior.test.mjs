import assert from 'node:assert/strict'
import test from 'node:test'
import { elementos, fixtureServidor } from '../../soporte/servidor-ayudas.mjs'

// F01 · ajuste: «Anterior» en el reproductor también en modo local (excepción al modo local congelado).
function abrir(id) {
  const app = fixtureServidor({ api: false })
  const activity = app.load('src/data/activities/content.ts').activities.find((a) => a.id === id)
  const Reproductor = app.load(
    'src/features/activities/components/StudentActivityPlayer.tsx',
  ).StudentActivityPlayer
  const player = app.mount(Reproductor, { activity, onClose() {} })
  return { app, activity, player }
}
const de = (tree, nombre) => elementos(tree, (e) => e.type?.name === nombre)[0]
const paso = (tree) => de(tree, 'PlayerTopBar').props.index

test('en un encuentro, «Anterior» vuelve al paso previo y el indicador de paso retrocede con él', () => {
  const { player } = abrir('enc-mitos')
  let tree = player.render()
  assert.equal(de(tree, 'DialogueBox').props.onAnterior, undefined, 'no aparece en el primer paso')
  de(tree, 'DialogueBox').props.onContinue()
  tree = player.render()
  assert.equal(paso(tree), 1)
  de(tree, 'DialogueBox').props.onAnterior()
  tree = player.render()
  assert.equal(paso(tree), 0)
  // Un diálogo al que se vuelve se muestra completo, sin máquina de escribir.
  assert.equal(de(tree, 'DialogueBox').props.typewriter, false)
  player.unmount()
})

test('elección, reacción y diapositivas retroceden; junto a una pregunta no hay «Anterior»', () => {
  const { activity, player } = abrir('enc-mitos')
  const ir = (n) => {
    for (let i = 0; i < n; i++) {
      const tree = player.render()
      const dialogo = de(tree, 'DialogueBox')
      const diapositiva = de(tree, 'SlideNode')
      if (diapositiva) diapositiva.props.onContinue()
      else dialogo.props.onContinue()
    }
  }
  ir(3)
  let tree = player.render()
  const eleccion = de(tree, 'ChoiceNode')
  assert.equal(eleccion.props.node.id, 'e04')
  assert.ok(eleccion.props.onAnterior)
  eleccion.props.onChoose(eleccion.props.node.opciones[0])
  tree = player.render()
  // Desde la reacción (o el paso siguiente) se vuelve a la elección.
  de(tree, 'DialogueBox').props.onAnterior()
  assert.equal(de(player.render(), 'ChoiceNode').props.node.id, 'e04')
  de(player.render(), 'ChoiceNode').props.onChoose(eleccion.props.node.opciones[0])
  while (!de(player.render(), 'SlideNode')) de(player.render(), 'DialogueBox').props.onContinue()
  tree = player.render()
  assert.equal(de(tree, 'SlideNode').props.node.id, 'e06')
  assert.ok(de(tree, 'SlideNode').props.onAnterior)
  de(tree, 'SlideNode').props.onContinue()
  de(player.render(), 'SlideNode').props.onContinue()
  tree = player.render()
  const pregunta = activity.nodos.find((n) => n.id === 'e08')
  assert.equal(pregunta.tipo, 'pregunta')
  assert.equal(de(tree, 'QuestionNode').props.node.id, 'e08')
  player.unmount()
})

test('el paso que sigue a una pregunta no tiene «Anterior»', () => {
  const app = fixtureServidor({ api: false })
  // DATO DE PRUEBA: actividad mínima con una pregunta no bloqueante entre dos diálogos, retomada después de ella.
  const activity = {
    id: 'prueba-anterior',
    tipo: 'encuentro',
    titulo: 'Prueba',
    bloque: 1,
    orden: 1,
    obligatoria: false,
    requisitos: [],
    personajeIds: ['companero'],
    nodos: [
      { id: 'p1', tipo: 'dialogo', hablanteId: 'companero', texto: 'Hola' },
      {
        id: 'p2',
        tipo: 'pregunta',
        bloqueante: false,
        enunciado: '¿Sí?',
        opciones: [],
        formato: 'opcion_unica',
      },
      { id: 'p3', tipo: 'dialogo', hablanteId: 'companero', texto: 'Seguimos' },
    ],
  }
  app.load('src/store/journeyStore.ts').updateJourney((s) => ({
    ...s,
    progress: { [activity.id]: { actividadId: activity.id, estado: 'en_curso', nodoActualId: 'p3' } },
  }))
  const Reproductor = app.load(
    'src/features/activities/components/StudentActivityPlayer.tsx',
  ).StudentActivityPlayer
  const player = app.mount(Reproductor, { activity, onClose() {} })
  const tree = player.render()
  assert.equal(de(tree, 'PlayerTopBar').props.index, 2)
  assert.equal(de(tree, 'DialogueBox').props.onAnterior, undefined)
  player.unmount()
})

test('en un registro local, «Anterior» vuelve a la consigna conservando lo escrito', () => {
  const { app, activity, player } = abrir('mission-story')
  de(player.render(), 'DialogueBox').props.onContinue()
  let tree = player.render()
  const consigna = de(tree, 'SubmissionNode')
  const clave = `${activity.id}/${consigna.props.node.id}`
  assert.equal(de(tree, 'PlayerTopBar').props.index, 1)
  assert.ok(consigna.props.onAnterior)
  // Lo escrito queda en los borradores del navegador al teclear, como hoy.
  app.load('src/store/journeyStore.ts').updateJourney((s) => ({
    ...s,
    drafts: { ...s.drafts, [clave]: 'DATO DE PRUEBA: a medias' },
  }))
  consigna.props.onAnterior()
  tree = player.render()
  assert.equal(de(tree, 'PlayerTopBar').props.index, 0)
  de(tree, 'DialogueBox').props.onContinue()
  assert.equal(de(player.render(), 'SubmissionNode').props.node.id, consigna.props.node.id)
  assert.equal(
    app.load('src/store/journeyStore.ts').getJourneySnapshot().drafts[clave],
    'DATO DE PRUEBA: a medias',
  )
  player.unmount()
})

test('en un cuestionario local, «Anterior» vuelve al ítem con su opción marcada', () => {
  const { player } = abrir('act-tip-01')
  while (!de(player.render(), 'ItemNode')) {
    const tree = player.render()
    const eleccion = de(tree, 'ChoiceNode')
    if (eleccion) eleccion.props.onChoose(eleccion.props.node.opciones[0])
    else de(tree, 'DialogueBox').props.onContinue()
  }
  let item = de(player.render(), 'ItemNode')
  assert.equal(item.props.node.id, 'm05')
  const valor = item.props.options[0].value
  item.props.onAnswer(valor)
  while (de(player.render(), 'DialogueBox') && !de(player.render(), 'ItemNode'))
    de(player.render(), 'DialogueBox').props.onContinue()
  item = de(player.render(), 'ItemNode')
  assert.equal(item.props.node.id, 'm07')
  item.props.onAnterior()
  de(player.render(), 'DialogueBox').props.onAnterior()
  item = de(player.render(), 'ItemNode')
  assert.equal(item.props.node.id, 'm05')
  assert.equal(item.props.existing.valor, valor)
  player.unmount()
})

test('en un registro local, los pasos posteriores a la entrega no tienen «Anterior»', () => {
  const app = fixtureServidor({ api: false })
  // DATO DE PRUEBA: registro mínimo ya entregado, retomado en el diálogo de cierre.
  const activity = {
    id: 'prueba-registro',
    tipo: 'registro',
    titulo: 'Prueba',
    bloque: 1,
    orden: 1,
    obligatoria: false,
    requisitos: [],
    personajeIds: ['companero'],
    nodos: [
      { id: 'r1', tipo: 'dialogo', hablanteId: 'companero', texto: 'Hola' },
      {
        id: 'r2',
        tipo: 'consigna',
        premisa: '¿Qué piensas?',
        entregable: { tipo: 'texto' },
        obligatoria: true,
        visibilidad: 'solo_estudiante',
      },
      { id: 'r3', tipo: 'dialogo', hablanteId: 'companero', texto: 'Gracias' },
    ],
  }
  app.load('src/store/journeyStore.ts').updateJourney((s) => ({
    ...s,
    progress: { [activity.id]: { actividadId: activity.id, estado: 'en_curso', nodoActualId: 'r3' } },
    submissions: [
      {
        id: 'e1',
        estudianteId: 'est',
        actividadId: activity.id,
        nodoId: 'r2',
        contenido: { tipo: 'texto', texto: 'Algo' },
        version: 1,
        enviadoEn: '2026-10-21T10:00:00',
      },
    ],
  }))
  const Reproductor = app.load(
    'src/features/activities/components/StudentActivityPlayer.tsx',
  ).StudentActivityPlayer
  const player = app.mount(Reproductor, { activity, onClose() {} })
  const tree = player.render()
  assert.equal(de(tree, 'PlayerTopBar').props.index, 2)
  assert.equal(de(tree, 'DialogueBox').props.onAnterior, undefined)
  player.unmount()
})

test('en un cuestionario local, cambiar una respuesta al volver deja solo la última para el resultado', () => {
  const { app, player } = abrir('act-tip-01')
  const items = () => app.load('src/store/journeyStore.ts').getJourneySnapshot().items
  while (!de(player.render(), 'ItemNode')) {
    const tree = player.render()
    const eleccion = de(tree, 'ChoiceNode')
    if (eleccion) eleccion.props.onChoose(eleccion.props.node.opciones[0])
    else de(tree, 'DialogueBox').props.onContinue()
  }
  let item = de(player.render(), 'ItemNode')
  const [primera, segunda] = item.props.options.map((o) => o.value)
  item.props.onAnswer(primera)
  de(player.render(), 'DialogueBox').props.onAnterior()
  item = de(player.render(), 'ItemNode')
  assert.equal(item.props.existing.valor, primera)
  item.props.onAnswer(segunda)
  const respuestas = items().filter((r) => r.itemId === item.props.node.itemId)
  assert.equal(respuestas.length, 1)
  assert.equal(respuestas[0].valor, segunda)
  player.unmount()
})

test('en un cuestionario local, la primera pregunta no tiene «Anterior»', () => {
  const { player } = abrir('act-tip-01')
  while (!de(player.render(), 'ItemNode')) {
    const tree = player.render()
    const eleccion = de(tree, 'ChoiceNode')
    if (eleccion) eleccion.props.onChoose(eleccion.props.node.opciones[0])
    else de(tree, 'DialogueBox').props.onContinue()
  }
  const primera = de(player.render(), 'ItemNode')
  assert.equal(primera.props.onAnterior, undefined)
  player.unmount()
})
