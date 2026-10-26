import assert from 'node:assert/strict'
import test from 'node:test'
import { copia, elementos, esperar, fixtureServidor, jsonServidor } from '../../soporte/servidor-ayudas.mjs'

// Ajuste diario-lumi: la bienvenida del diario es la presentación de Lumi de la sección (`sectionIntros.journal`),
// la misma cola de primera visita que las demás secciones; el «?» del topbar abre su guía (`guideSteps`).
const listo = (datos) => ({ datos, estado: 'listo', error: null })
const texto = (n) =>
  Array.isArray(n)
    ? n.map(texto).join('')
    : typeof n === 'string' || typeof n === 'number'
      ? String(n)
      : n?.props
        ? texto(n.props.children)
        : ''

function preparar(ruta, secciones = 'ruta/ruta-secciones-t1') {
  const app = fixtureServidor({ ruta })
  const sesion = app.load('src/store/servidor/sesion.ts')
  sesion.publicar({ secciones: listo(jsonServidor(secciones)) })
  const ui = app.load('src/store/studentUiStore.ts')
  ui.updateStudentUi((s) => ({ ...s, introsSeen: {}, cityArrivalSeen: true }))
  const textos = app.load('src/data/content/guideTexts.ts')
  return { app, sesion, ui, textos }
}
function cola(app, view) {
  const { useNoveltyQueue } = app.load('src/features/adventure/hooks/useNoveltyQueue.ts')
  return app.mount((p) => useNoveltyQueue(p.view, p.activityOpen), { view, activityOpen: false })
}

test('la portada del diario ya no tiene el cuadro de bienvenida', () => {
  const { app } = preparar('/student/journal')
  const { JournalHome } = app.load('src/features/journal/components/JournalHome.tsx')
  const portada = texto(
    app.mount(JournalHome, { hoy: 'HOY', buzon: 'BUZON', lumi: 'LUMI', cuaderno: 'CUADERNO' }).render(),
  )
  assert.ok(portada.includes('HOY') && portada.includes('Mi diario'))
  assert.ok(!/Un espacio para ti y Lumi|Entendido, empezar a escribir/.test(portada))
})

test('la presentación del diario lleva el contenido del antiguo cuadro', () => {
  const { textos } = preparar('/student/journal')
  const pasos = textos.sectionIntros.journal.join(' ')
  for (const frase of [
    'Un espacio para ti y para mí',
    'No hay respuestas automáticas: tú decides qué contar.',
    'privado para siempre',
    'Ni tu orientadora, ni nadie del programa. Nunca.',
    'a tu manera',
    'Puedes escribir una frase o una página.',
    'una señal separada',
    'Tu orientadora ve solo esa respuesta corta, nunca lo que escribes.',
  ])
    assert.ok(pasos.toLowerCase().includes(frase.toLowerCase()), frase)
})

test('el diario muestra su presentación la primera vez, al cerrarla queda vista y no vuelve', async () => {
  const { app, ui, textos } = preparar('/student/journal')
  const q = cola(app, 'journal')
  q.render()
  await esperar()
  const primera = q.render()
  assert.deepEqual(copia(primera.active), { kind: 'intro', view: 'journal' })
  assert.deepEqual(copia(primera.guide), copia(textos.sectionIntros.journal))
  assert.equal(ui.useStudentUi().introsSeen.journal, undefined)
  primera.closeGuide()
  await esperar()
  assert.equal(ui.useStudentUi().introsSeen.journal, true)
  assert.equal(q.render().active, null)
  q.unmount()
  // Otra visita: ya no aparece.
  const otra = cola(app, 'journal')
  otra.render()
  await esperar()
  assert.equal(otra.render().active, null)
  otra.unmount()
})

test('el «?» del diario abre su guía de Lumi y cerrarla no cambia lo visto', async () => {
  const { app, ui, textos } = preparar('/student/journal')
  ui.updateStudentUi((s) => ({ ...s, introsSeen: { journal: true } }))
  const overlays = app.load('src/features/adventure/context/overlayContext.ts')
  const pedidos = []
  const original = overlays.StudentOverlayContext._currentValue
  overlays.StudentOverlayContext._currentValue = { ...original, openGuide: (pasos) => pedidos.push(pasos) }
  try {
    const { StudentModuleLayout } = app.load('src/features/adventure/components/StudentModuleLayout.tsx')
    const barra = app.mount(StudentModuleLayout, { view: 'journal', children: null }).render()
    const [ayuda] = elementos(barra, (e) => e.props['aria-label'] === 'Abrir guía')
    ayuda.props.onClick()
  } finally {
    overlays.StudentOverlayContext._currentValue = original
  }
  assert.deepEqual(copia(pedidos), [copia(textos.guideSteps.journal)])
  const q = cola(app, 'journal')
  q.render()
  await esperar()
  q.render().context.openGuide(pedidos[0])
  const abierta = q.render()
  assert.deepEqual(copia(abierta.guide), copia(textos.guideSteps.journal))
  abierta.closeGuide()
  assert.equal(q.render().guide, null)
  assert.deepEqual(copia(ui.useStudentUi().introsSeen), { journal: true })
  q.unmount()
})

test('con la sección cerrada en el servidor, la presentación espera y no se marca como vista', async () => {
  const { app, sesion, ui, textos } = preparar('/student/journal', 'ruta/ruta-secciones-inicial')
  const q = cola(app, 'journal')
  q.render()
  await esperar()
  assert.equal(q.render().active, null)
  assert.equal(ui.useStudentUi().introsSeen.journal, undefined)
  // Al abrirse DIARIO, la primera visita sí la muestra.
  sesion.publicar({ secciones: listo(jsonServidor('ruta/ruta-secciones-t1')) })
  q.render()
  await esperar()
  assert.deepEqual(copia(q.render().guide), copia(textos.sectionIntros.journal))
  q.unmount()
})

test('cada sección del estudiante muestra su presentación en la primera visita', async () => {
  const { app, ui, textos } = preparar('/student/missions')
  const { studentViews } = app.load('src/lib/studentViews.ts')
  for (const view of studentViews) {
    const q = cola(app, view)
    q.render()
    await esperar()
    const estado = q.render()
    // En ruta-secciones-t1, FAMILIA sigue cerrada: «En familia» espera a que se abra.
    if (view === 'conversations') {
      assert.equal(estado.active, null, view)
      q.unmount()
      continue
    }
    assert.deepEqual(copia(estado.active), { kind: 'intro', view }, view)
    assert.deepEqual(copia(estado.guide), copia(textos.sectionIntros[view]), view)
    estado.closeGuide()
    await esperar()
    assert.equal(ui.useStudentUi().introsSeen[view], true, view)
    q.unmount()
  }
})
