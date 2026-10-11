import { loadMapPoints } from '../../soporte/refactor-map.mjs'
import assert from 'node:assert/strict'
import test from 'node:test'
import { fixtureServidor, elementos, esperar } from '../../soporte/servidor-ayudas.mjs'

test('local mantiene claves, finalización y recomendaciones sin consultar al servidor ni usar adaptadores', async () => {
  const app = fixtureServidor({ api: false })
  const adaptadores = app.load('src/lib/servidor/adaptadores.ts')
  for (const key of Object.keys(adaptadores))
    adaptadores[key] = () => {
      throw Error('El modo local usó un adaptador del servidor')
    }
  const store = app.load('src/store/journeyStore.ts'),
    adventure = app.load('src/store/adventureStore.ts')
  const activity = app.load('src/data/activities/content.ts').activityById('mission-welcome')
  // DATO DE PRUEBA: comprobación aprobada del contenido real antes del último diálogo.
  store.updateJourney((s) => ({
    ...s,
    attempts: activity.nodos
      .filter((n) => n.tipo === 'pregunta')
      .map((n) => ({
        estudianteId: 'est-prototipo',
        actividadId: activity.id,
        nodoId: n.id,
        opcionIds: n.opciones.filter((o) => o.correcta).map((o) => o.id),
        correcta: true,
        revelada: false,
        numeroIntento: 1,
        respondidaEn: '2026-10-07T12:00:00Z',
      })),
  }))
  store.updateJourney((s) => ({
    ...s,
    progress: {
      [activity.id]: {
        estudianteId: 'est-prototipo',
        actividadId: activity.id,
        estado: 'en_curso',
        nodoActualId: activity.nodos.at(-1).id,
      },
    },
  }))
  const { StudentActivityPlayer } = app.load(
    'src/features/activities/components/StudentActivityPlayer.tsx',
  )
  const player = app.mount(StudentActivityPlayer, { activity, onClose() {} })
  const scene = elementos(player.render(), (e) => e.type?.name === 'DialogueBox')[0]
  scene.props.onContinue()
  await esperar()
  assert.equal(store.getJourneySnapshot().progress[activity.id].estado, 'completada')
  assert.equal(store.getJourneySnapshot().rewards.length, 1)
  assert.ok(elementos(player.render(), (e) => e.type?.name === 'FinishScreen').length)
  const mapa = loadMapPoints(app.load)
  const points = mapa.getCaminoPoints(adventure.useAdventure(), store.getJourneySnapshot())
  assert.equal(mapa.getRecommendedPoint(points).specActivityId, 'enc-mitos')
  assert.ok(app.local.has('ov.missions.v2'))
  assert.equal(app.local.has('ov.missions.v2.api'), false)
  assert.equal(app.requests.length, 0)
  player.unmount()
})
test('Mara, resultado, libro y afinidad locales conservan sus fuentes sin ejecutar adaptadores API', () => {
  const app = fixtureServidor({ api: false })
  const adaptadores = app.load('src/lib/servidor/adaptadores.ts')
  for (const key of Object.keys(adaptadores))
    adaptadores[key] = () => {
      throw Error('Se usó un adaptador API en local')
    }
  const content = app.load('src/data/activities/content.ts'),
    journey = app.load('src/store/journeyStore.ts'),
    d = app.load('src/store/discoveryStore.ts')
  assert.ok(content.activityById('act-tip-01').nodos.some((n) => n.itemId === 'tip-001'))
  app
    .load('src/features/activities/components/nodes/ResultNode.tsx')
    .ResultNode({ activity: content.finalActivity, instrumentId: 'tip' })
  const pages = app
    .load('src/features/discovery/lib/helenaPages.ts')
    .getHelenaPages(journey.getJourneySnapshot(), d.getDiscovery())
  assert.equal(pages[0].demo, true)
  // El catálogo local conserva su exclusión actual de contenido pendiente.
  assert.equal(
    app
      .load('src/features/discovery/lib/catalogSelectors.ts')
      .isAffine('psychologist', ['intereses']),
    undefined,
  )
  app.load('src/pages/student/HelenaBookView.tsx').HelenaBookView()
  assert.equal(app.requests.length, 0)
  assert.equal(d.getDiscovery().revealedPagesApi, undefined)
})

test('pasaporte, nivel y novedades locales no ejecutan adaptadores ni consultan el servidor', () => {
  const app = fixtureServidor({ api: false })
  const adaptadores = app.load('src/lib/servidor/adaptadores.ts')
  Object.keys(adaptadores).forEach((key) => {
    adaptadores[key] = () => {
      throw Error('Adaptador API en local')
    }
  })
  const store = app.load('src/store/adventureStore.ts')
  const anterior = store.getTravelerLevel(store.useAdventure())
  assert.ok(anterior.description)
  assert.ok(anterior.nextStep)
  app.load('src/features/discovery/components/StudentPassportView.tsx').StudentPassportView()
  app.load('src/features/adventure/components/overlays/NoveltiesMenu.tsx').NoveltiesMenu({})
  assert.equal(app.requests.length, 0)
  assert.equal(
    app.load('src/store/discoveryStore.ts').getDiscovery().profileBadgesApi,
    undefined,
  )
})
