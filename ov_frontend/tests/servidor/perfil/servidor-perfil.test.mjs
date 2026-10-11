import assert from 'node:assert/strict'
import test from 'node:test'
import { copia, elementos, fixtureServidor, jsonServidor } from '../../soporte/servidor-ayudas.mjs'
import { iniciarMara } from '../../soporte/servidor-mara-ayudas.mjs'

function prepararPerfil(app) {
  const contexto = { decisionSheets: [], careerInterestIds: [], institutionInterestIds: [], profiles: [] }
  app.load('src/context/occupationExplorationContext.ts').useOccupationExplorationContext = () => contexto
  const perfil = app.load('src/features/discovery/hooks/useStudentProfile.ts').useStudentProfile
  return { contexto, perfil }
}

test('perfil API usa la página de intereses del servidor y su revelación por cuenta y resultado', async () => {
  const resultado = jsonServidor('resultado-riasec')
  const f = await iniciarMara({ resultado })
  await f.almacen.asegurarSeccion('logros')
  const { perfil } = prepararPerfil(f.app)
  assert.equal(perfil().pages.length, 3)
  assert.equal(perfil().pages[0].state, 'ready')
  const discovery = f.app.load('src/store/discoveryStore.ts')
  discovery.revelarPaginaApi('est-luis', resultado.calculado_en, 'intereses')
  assert.equal(perfil().pages[0].state, 'ready')
  discovery.revelarPaginaApi('est-ana', resultado.calculado_en, 'intereses')
  const p = perfil()
  assert.equal(p.pages[0].state, 'revealed')
  assert.deepEqual(
    Array.from(p.pages[0].result.areas, (a) => a.code),
    ['I', 'R', 'A'],
  )
  assert.deepEqual(
    Array.from(p.pages[0].result.areas, (a) => a.score),
    [100, 75, 50],
  )
  assert.equal(p.nombre, 'Ana')
  assert.equal(p.iniciales, 'A')
  assert.equal(p.recorrido, 100)
  assert.equal(p.ciudad, true)
  assert.equal(p.afinidadCiudad, 0)
  assert.equal(p.level.number, 3)
  assert.equal('ficha' in p, false)
  const pendiente = await iniciarMara()
  assert.equal(prepararPerfil(pendiente.app).perfil().pages[0].state, 'sealed')
})

test('insignias del perfil API proceden de logros remotos y respetan la selección de la cuenta', async () => {
  const f = await iniciarMara()
  await f.almacen.asegurarSeccion('logros')
  const { perfil } = prepararPerfil(f.app)
  const obtenidas = f.estado.insignias.filter((b) => b.estado === 'OBTENIDA').map((b) => b.codigo)
  assert.deepEqual(
    Array.from(perfil().badges, (b) => b.code),
    obtenidas,
  )
  assert.ok(perfil().badges.every((b) => Number.isInteger(b.group)))
  const discovery = f.app.load('src/store/discoveryStore.ts')
  discovery.updateDiscovery((s) => ({
    ...s,
    // DATO DE PRUEBA: preferencias locales contradictorias y selección API independiente.
    profileBadgesConfigured: true,
    profileBadges: ['I9'],
    profileBadgesApi: { 'est-ana': { profileBadgesConfigured: true, profileBadges: ['I3', 'I9'] } },
  }))
  assert.deepEqual(
    Array.from(perfil().visibleBadges, (b) => b.code),
    ['I3'],
  )
  f.estado.insignias.find((b) => b.codigo === 'I3').estado = 'BLOQUEADA'
  await f.almacen.reintentarSeccion('logros')
  assert.equal(
    perfil().badges.some((b) => b.code === 'I3'),
    false,
  )
  assert.equal(perfil().visibleBadges.length, 0)
})

test('sin nivel remoto el perfil completo muestra el aviso y omite el medallón y el siguiente nivel', async () => {
  const f = await iniciarMara()
  f.estado.nivel_actual = null
  await f.almacen.refrescar()
  const { perfil } = prepararPerfil(f.app)
  assert.equal(perfil().level, null)
  const View = f.app.load('src/pages/student/StudentProfileView.tsx').StudentProfileView
  const tree = View()
  assert.equal(
    elementos(
      tree,
      (e) => e.type === 'p' && e.props.children === 'No hay un nivel disponible en el servidor.',
    ).length,
    1,
  )
  assert.equal(elementos(tree, (e) => e.props.className === 'sx-level-medallion').length, 0)
  assert.equal(elementos(tree, (e) => e.props.className === 'sx-d-quote').length, 0)
  assert.deepEqual(
    elementos(tree, (e) => e.props.label?.startsWith('Capítulo')).map((e) => e.props.label),
    ['Capítulo I', 'Capítulo II', 'Capítulo III'],
  )
})

test('antes de recibir resumen el perfil API no sustituye el nivel ni los logros por datos locales', () => {
  const app = fixtureServidor()
  const { perfil } = prepararPerfil(app)
  const p = perfil()
  assert.equal(p.nombre, 'Mi perfil')
  assert.equal(p.level, null)
  assert.equal(p.badges.length, 0)
  assert.equal(p.visibleBadges.length, 0)
  assert.equal(p.ciudad, false)
  assert.equal(p.pages[0].state, 'sealed')
})

test('planes y favoritos siguen locales en ambos modos y local conserva Alex y sus cálculos', async () => {
  for (const api of [true, false]) {
    const app = api ? (await iniciarMara()).app : fixtureServidor({ api: false })
    const { contexto, perfil } = prepararPerfil(app)
    const { createDecisionSheet } = app.load('src/types/decisions.ts')
    // DATO DE PRUEBA: un plan y dos favoritos guardados en el navegador.
    const plan = createDecisionSheet('Psicología', 'psychology')
    contexto.decisionSheets = [plan]
    contexto.careerInterestIds = ['psychology', 'nursing']
    const p = perfil()
    assert.deepEqual(copia(p.plans), copia([plan]))
    assert.equal(p.extraFavorites, 1)
    if (!api) {
      assert.equal(p.nombre, 'Alex')
      assert.equal(p.iniciales, 'AL')
      assert.deepEqual(
        copia(p.level),
        copia(app.load('src/store/adventureStore.ts').getTravelerLevel(p.adventure)),
      )
      assert.deepEqual(
        copia(p.pages),
        copia(
          app
            .load('src/features/discovery/lib/helenaPages.ts')
            .getHelenaPages(p.journey, app.load('src/store/discoveryStore.ts').getDiscovery()),
        ),
      )
      assert.equal(app.requests.length, 0)
    }
  }
})
