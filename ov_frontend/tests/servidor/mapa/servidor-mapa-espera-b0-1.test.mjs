import assert from 'node:assert/strict'
import test from 'node:test'
import { copia, esperar, fixtureServidor, jsonServidor } from '../../soporte/servidor-ayudas.mjs'

// Ajuste lumi-mensajes (§1.1): Lumi se presenta en el muelle de b0-1. Antes de resolverla, el mapa no muestra la
// presentación de Lumi y su botón de ayuda abre un aviso sin Lumi; al volver de b0-1 sale la presentación del mapa,
// una sola vez, y la ayuda vuelve a ser el diálogo de Lumi.
const listo = (datos) => ({ datos, estado: 'listo', error: null })

function preparar(estadoB01) {
  const app = fixtureServidor({ ruta: '/student/missions' })
  const bloques = copia(jsonServidor('contenido/contenido-actividades-inicial'))
  bloques[0].actividades[0].estado = estadoB01
  if (estadoB01 === 'COMPLETADA') bloques[0].actividades[1].estado = 'DISPONIBLE'
  const sesion = app.load('src/store/servidor/sesion.ts')
  sesion.publicar({
    actividades: listo(bloques),
    secciones: listo(jsonServidor('ruta/ruta-secciones-inicial')),
    presentaciones: listo({ vistas: [] }),
  })
  const ui = app.load('src/store/studentUiStore.ts')
  ui.updateStudentUi((s) => ({ ...s, introsSeen: {}, cityArrivalSeen: true }))
  app.fetch((r) => {
    if (r.url === '/api/acciones/presentacion-vista') return { body: { vistas: [r.body.codigo] } }
    throw Error(`Solicitud no configurada: ${r.url}`)
  })
  return { app, textos: app.load('src/data/content/guideTexts.ts') }
}

async function presentacion(app) {
  const { useNoveltyQueue } = app.load('src/features/adventure/hooks/useNoveltyQueue.ts')
  const q = app.mount((p) => useNoveltyQueue(p.view, p.activityOpen), { view: 'missions', activityOpen: false })
  q.render()
  await esperar()
  const estado = q.render()
  q.unmount()
  return estado
}

function pantalla(app) {
  const { useMapScreen } = app.load('src/features/adventure/hooks/useMapScreen.ts')
  const { getCaminoPointsMapa } = app.load('src/features/adventure/lib/caminoPoints.ts')
  const adventure = app.load('src/store/adventureStore.ts').useAdventure()
  const points = getCaminoPointsMapa(adventure, {})
  return app.mount(useMapScreen, { zone: 'missions', points, adventure, journey: {} }).render()
}

for (const estado of ['DISPONIBLE', 'EN_CURSO'])
  test(`con b0-1 ${estado.toLowerCase()} no sale Lumi y la ayuda es el aviso`, async () => {
    const { app, textos } = preparar(estado)
    assert.equal((await presentacion(app)).active, null)
    const mapa = pantalla(app)
    assert.equal(mapa.avisoAyuda, 'Empieza por la misión que brilla en el mapa.')
    assert.equal(mapa.avisoAyuda, textos.avisoAyudaMapa)
    assert.equal(app.requests.filter((r) => r.url === '/api/acciones/presentacion-vista').length, 0)
  })

test('al volver de b0-1 sale la presentación de cinco pasos y la ayuda es el diálogo de Lumi', async () => {
  const { app, textos } = preparar('COMPLETADA')
  const estado = await presentacion(app)
  assert.deepEqual(copia(estado.active), { kind: 'intro', view: 'missions' })
  assert.equal(textos.sectionIntros.missions.length, 5)
  assert.doesNotMatch(textos.sectionIntros.missions.join(' '), /Soy Lumi|señal|ciudad/)
  const mapa = pantalla(app)
  assert.equal(mapa.avisoAyuda, undefined)
  assert.deepEqual([...mapa.pasosAyuda], [...textos.guiaCaminoApi])
})
