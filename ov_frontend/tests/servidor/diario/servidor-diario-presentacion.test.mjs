import assert from 'node:assert/strict'
import test from 'node:test'
import { copia, elementos, esperar, fixtureServidor, jsonServidor } from '../../soporte/servidor-ayudas.mjs'

// Ajuste diario-lumi: la bienvenida del diario es la presentación de Lumi de la sección (`sectionIntros.journal`),
// la misma cola de primera visita que las demás secciones; el «?» del topbar abre su guía (`guideSteps`).
// Ajuste presentaciones-vistas: en api, las presentaciones ya cerradas las guarda el servidor.
const listo = (datos) => ({ datos, estado: 'listo', error: null })
const texto = (n) =>
  Array.isArray(n)
    ? n.map(texto).join('')
    : typeof n === 'string' || typeof n === 'number'
      ? String(n)
      : n?.props
        ? texto(n.props.children)
        : ''

function preparar(
  ruta,
  secciones = 'ruta/ruta-secciones-t1',
  presentaciones = listo(jsonServidor('ruta/ruta-presentaciones-inicial')),
) {
  const app = fixtureServidor({ ruta })
  const sesion = app.load('src/store/servidor/sesion.ts')
  sesion.publicar({ secciones: listo(jsonServidor(secciones)), presentaciones })
  const ui = app.load('src/store/studentUiStore.ts')
  ui.updateStudentUi((s) => ({ ...s, introsSeen: {}, cityArrivalSeen: true }))
  const textos = app.load('src/data/content/guideTexts.ts')
  // El servidor responde con todas las vistas ya cerradas.
  const vistas = new Set(presentaciones.datos?.vistas ?? [])
  app.fetch((r) => {
    if (r.url === '/api/acciones/presentacion-vista') {
      vistas.add(r.body.codigo)
      return { body: { vistas: [...vistas].sort() } }
    }
    throw Error(`Solicitud no configurada: ${r.url}`)
  })
  const enviadas = () =>
    app.requests.filter((r) => r.url === '/api/acciones/presentacion-vista').map((r) => r.body.codigo)
  const vistasServidor = () => copia(sesion.obtenerEstadoServidor().presentaciones.datos?.vistas)
  return { app, sesion, ui, textos, enviadas, vistasServidor }
}
function cola(app, view) {
  const { useNoveltyQueue } = app.load('src/features/adventure/hooks/useNoveltyQueue.ts')
  return app.mount((p) => useNoveltyQueue(p.view, p.activityOpen), { view, activityOpen: false })
}
async function activa(app, view) {
  const q = cola(app, view)
  q.render()
  await esperar()
  return { q, estado: q.render() }
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

test('el diario muestra su presentación la primera vez; al cerrarla se marca en el servidor y no vuelve', async () => {
  const { app, ui, textos, enviadas, vistasServidor } = preparar('/student/journal')
  const { q, estado } = await activa(app, 'journal')
  assert.deepEqual(copia(estado.active), { kind: 'intro', view: 'journal' })
  assert.deepEqual(copia(estado.guide), copia(textos.sectionIntros.journal))
  estado.closeGuide()
  // Se oculta al instante, antes de que responda el servidor.
  assert.equal(q.render().active, null)
  await esperar()
  assert.deepEqual(enviadas(), ['journal'])
  assert.deepEqual(vistasServidor(), ['journal'])
  // En api no se escribe la marca local.
  assert.equal(ui.useStudentUi().introsSeen.journal, undefined)
  q.unmount()
  const otra = await activa(app, 'journal')
  assert.equal(otra.estado.active, null)
  otra.q.unmount()
})

test('en api la marca local no cuenta: otra cuenta en el mismo navegador ve sus presentaciones', async () => {
  const { app, ui } = preparar('/student/journal')
  ui.updateStudentUi((s) => ({ ...s, introsSeen: { journal: true } }))
  const { q, estado } = await activa(app, 'journal')
  assert.deepEqual(copia(estado.active), { kind: 'intro', view: 'journal' })
  q.unmount()
})

test('si el servidor no guarda la marca, la presentación vuelve a salir en otra visita', async () => {
  const { app, enviadas, vistasServidor } = preparar('/student/journal')
  app.fetch(() => ({ status: 500, body: 'DATO DE PRUEBA: error' }))
  const { q, estado } = await activa(app, 'journal')
  estado.closeGuide()
  await esperar()
  assert.equal(q.render().active, null)
  assert.deepEqual(enviadas(), ['journal'])
  assert.deepEqual(vistasServidor(), [])
  q.unmount()
  const otra = await activa(app, 'journal')
  assert.deepEqual(copia(otra.estado.active), { kind: 'intro', view: 'journal' })
  otra.q.unmount()
})

test('sin las presentaciones del servidor (cargando o con error), la cola no muestra nada', async () => {
  for (const presentaciones of [
    { datos: null, estado: 'cargando', error: null },
    { datos: null, estado: 'error', error: { tipo: 'sin_conexion' } },
  ]) {
    const { app } = preparar('/student/missions', 'ruta/ruta-secciones-t1', presentaciones)
    const { q, estado } = await activa(app, 'missions')
    assert.equal(estado.active, null, presentaciones.estado)
    q.unmount()
  }
})

test('el «?» del diario abre su guía de Lumi y cerrarla no marca nada', async () => {
  const { app, textos, enviadas } = preparar(
    '/student/journal',
    'ruta/ruta-secciones-t1',
    listo({ vistas: ['journal'] }),
  )
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
  const { q } = await activa(app, 'journal')
  q.render().context.openGuide(pedidos[0])
  const abierta = q.render()
  assert.deepEqual(copia(abierta.guide), copia(textos.guideSteps.journal))
  abierta.closeGuide()
  await esperar()
  assert.equal(q.render().guide, null)
  assert.deepEqual(enviadas(), [])
  q.unmount()
})

test('con la sección cerrada en el servidor, la presentación espera y no se marca como vista', async () => {
  const { app, sesion, textos, enviadas } = preparar('/student/journal', 'ruta/ruta-secciones-inicial')
  const { q, estado } = await activa(app, 'journal')
  assert.equal(estado.active, null)
  assert.deepEqual(enviadas(), [])
  // Al abrirse DIARIO, la primera visita sí la muestra.
  sesion.publicar({ secciones: listo(jsonServidor('ruta/ruta-secciones-t1')) })
  q.render()
  await esperar()
  assert.deepEqual(copia(q.render().guide), copia(textos.sectionIntros.journal))
  q.unmount()
})

test('cada sección del estudiante muestra su presentación en la primera visita y la marca al cerrarla', async () => {
  const { app, textos, enviadas } = preparar('/student/missions')
  const { studentViews } = app.load('src/lib/studentViews.ts')
  const marcadas = []
  for (const view of studentViews) {
    const { q, estado } = await activa(app, view)
    // En ruta-secciones-t1, FAMILIA e INVESTIGACIONES (F09) siguen cerradas: sus presentaciones esperan.
    if (view === 'conversations' || view === 'investigations') {
      assert.equal(estado.active, null, view)
      q.unmount()
      continue
    }
    assert.deepEqual(copia(estado.active), { kind: 'intro', view }, view)
    assert.deepEqual(copia(estado.guide), copia(textos.sectionIntros[view]), view)
    estado.closeGuide()
    await esperar()
    marcadas.push(view)
    assert.deepEqual(enviadas(), marcadas, view)
    q.unmount()
  }
})
