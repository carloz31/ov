import assert from 'node:assert/strict'
import test from 'node:test'
import { copia, elementos, esperar, fixtureServidor, jsonServidor, libroServidor } from '../../soporte/servidor-ayudas.mjs'
import { iniciarMara } from '../../soporte/servidor-mara-ayudas.mjs'

// Ajuste pasaporte-perfil: la página lista para romper va destacada; aquí se vuelven a juntar en su orden.
const paginas = (p) => [p.destacada, ...p.pages].filter(Boolean).sort((a, b) => a.numeral.localeCompare(b.numeral))
// Los capítulos son componentes sin hooks: se expanden para leer su marcado (Parchment queda sin expandir).
const PROPIOS = new Set(['ProfileHeader', 'ProfileAchievements', 'ProfileHelena', 'ProfilePlans', 'RouteLine'])
const expandir = (n) =>
  Array.isArray(n)
    ? n.map(expandir)
    : typeof n?.type === 'function' && PROPIOS.has(n.type.name)
      ? expandir(n.type(n.props))
      : n?.props?.children !== undefined
        ? { ...n, props: { ...n.props, children: expandir(n.props.children) } }
        : n

function prepararPerfil(app) {
  const contexto = { decisionSheets: [], careerInterestIds: [], institutionInterestIds: [], profiles: [] }
  app.load('src/context/occupationExplorationContext.ts').useOccupationExplorationContext = () => contexto
  const perfil = app.load('src/features/discovery/hooks/useStudentProfile.ts').useStudentProfile
  return { contexto, perfil }
}

test('perfil API lee las páginas del libro del servidor: partida y llegada primero, intereses revelada allí', async () => {
  const resultado = jsonServidor('resultado-riasec')
  const f = await iniciarMara({ resultado })
  await f.almacen.asegurarSeccion('logros')
  const { perfil } = prepararPerfil(f.app)
  // F03: el revelado local ya no cuenta; sin el libro leído, todo queda sellado.
  f.app.load('src/store/discoveryStore.ts').revelarPaginaApi('est-ana', resultado.calculado_en, 'intereses')
  assert.deepEqual(copia(paginas(perfil()).map((p) => [p.id, p.numeral, p.state])), [
    ['partida-llegada', 'I', 'sealed'],
    ['intereses', 'II', 'sealed'],
    ['inteligencias', 'III', 'ready'],
    ['habilidades', 'IV', 'sealed'],
  ])
  libroServidor(f.app, { 'APL-RIASEC': resultado })
  const p = perfil()
  const todas = paginas(p)
  assert.equal(todas[1].state, 'revealed')
  assert.equal(todas[0].state, 'ready')
  assert.equal(p.destacada.id, 'partida-llegada')
  assert.deepEqual(
    Array.from(todas[1].result.areas, (a) => a.code),
    ['I', 'R', 'A'],
  )
  assert.deepEqual(
    Array.from(todas[1].result.areas, (a) => a.score),
    [100, 75, 50],
  )
  assert.equal(p.nombre, 'Ana')
  assert.equal(p.iniciales, 'A')
  // Ajuste pasaporte-perfil: la ruta del perfil son los tramos de `/avance`; la afinidad ya no se muestra aquí.
  assert.deepEqual(copia(p.requeridas), copia(f.almacen.obtenerEstadoServidor().avance.datos.requeridas))
  assert.equal('afinidadCiudad' in p, false)
  assert.equal(p.level.number, 3)
  assert.equal('ficha' in p, false)
  const pendiente = await iniciarMara()
  assert.equal(paginas(prepararPerfil(pendiente.app).perfil())[1].state, 'sealed')
})

test('insignias del perfil API proceden de logros remotos y la vitrina es la del servidor', async () => {
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
    // DATO DE PRUEBA: preferencias locales que el modo api ya no lee (ajuste pasaporte-perfil).
    profileBadgesConfigured: true,
    profileBadges: ['I9'],
    profileBadgesApi: { 'est-ana': { profileBadgesConfigured: true, profileBadges: [] } },
  }))
  assert.deepEqual(
    Array.from(perfil().visibleBadges, (b) => b.code),
    ['t-ins-1'],
  )
  f.estado.insignias.find((b) => b.codigo === 't-ins-1').estado = 'BLOQUEADA'
  await f.almacen.reintentarSeccion('logros')
  assert.equal(
    perfil().badges.some((b) => b.code === 't-ins-1'),
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
  const tree = expandir(View())
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
  assert.equal(paginas(p)[0].state, 'sealed')
})

// F06: en api, los favoritos del catálogo ya no son los del navegador: se piden al servidor (prueba aparte).
// F07a: en api, tampoco los planes (sin la sección PLANES abierta no hay ninguno); en local, los del navegador.
test('los planes y los favoritos son locales solo en local, y local conserva Alex y sus cálculos', async () => {
  for (const api of [true, false]) {
    const app = api ? (await iniciarMara()).app : fixtureServidor({ api: false })
    const { contexto, perfil } = prepararPerfil(app)
    const { createDecisionSheet } = app.load('src/types/decisions.ts')
    // DATO DE PRUEBA: un plan y dos favoritos guardados en el navegador.
    const plan = createDecisionSheet('Psicología', 'psychology')
    contexto.decisionSheets = [plan]
    contexto.careerInterestIds = ['psychology', 'nursing']
    const p = perfil()
    // Ajuste pasaporte-perfil: cada plan lleva su «% armado» y los favoritos van en chips con su conteo.
    assert.deepEqual(copia(p.plans), api ? [] : copia([{ ...plan, armado: 0 }]))
    assert.equal(p.espacioLibre, api ? 'Espacio libre' : undefined)
    assert.equal(p.favoritos.carreras, api ? 0 : 2)
    if (!api) {
      assert.equal(p.nombre, 'Alex')
      assert.equal(p.iniciales, 'AL')
      assert.deepEqual(
        copia(p.level),
        copia(
          app
            .load('src/store/adventureStore.ts')
            .getTravelerLevel(app.load('src/store/adventureStore.ts').useAdventure()),
        ),
      )
      assert.deepEqual(
        copia(
          paginas(p).map((pagina) =>
            Object.fromEntries(Object.entries(pagina).filter(([clave]) => clave !== 'llegadaPendiente')),
          ),
        ),
        copia(
          app
            .load('src/features/discovery/lib/helenaPages.ts')
            .getHelenaPages(
              app.load('src/store/journeyStore.ts').getJourneySnapshot(),
              app.load('src/store/discoveryStore.ts').getDiscovery(),
            ),
        ),
      )
      assert.equal(app.requests.length, 0)
    }
  }
})

test('la línea de ruta: un punto al inicio de cada tramo y el último, «Fin del viaje»', () => {
  const app = fixtureServidor()
  const { RouteLine } = app.load('src/components/student/RouteLine.tsx')
  // Con T1 abierto: Inicio completo, Camino actual, Decisión pendiente.
  const avance = jsonServidor('ruta/ruta-avance-t1')
  const tree = RouteLine({ tramos: avance.tramos, ...avance.requeridas })
  const puntos = elementos(tree, (e) => e.type === 'li')
  const nombre = (li) => elementos(li, (e) => e.props?.className === 'sx-route-name')[0]
  const textoDe = (n) => [n.props.children].flat().filter((c) => typeof c === 'string').join('')
  assert.deepEqual(
    puntos.map((li) => textoDe(nombre(li))),
    ['Inicio', 'Camino', 'Decisión', 'Fin del viaje'],
  )
  assert.deepEqual(
    puntos.map((li) => elementos(li, (e) => e.props?.className === 'sx-route-milestone')[0].props['data-reached']),
    [true, true, false, false],
  )
  assert.equal(elementos(puntos[1], (e) => e.props?.className === 'sx-route-marker').length, 1)
})

test('en api, los conteos de favoritos del perfil salen del servidor con el catálogo abierto', async () => {
  const f = await iniciarMara()
  f.app.fetch((r) => (r.url.endsWith('/favoritos') ? { body: jsonServidor('ruta/ruta-favoritos') } : f.servidor(r)))
  const secciones = f.almacen.obtenerEstadoServidor().secciones
  f.almacen.publicar({
    secciones: { ...secciones, datos: [{ codigo: 'CATALOGO', nombre: 'Catálogo', estado: 'DISPONIBLE', bloqueo: [] }] },
  })
  const { perfil } = prepararPerfil(f.app)
  const montado = f.app.mount(perfil, {})
  montado.render()
  await esperar()
  // F07a: las dos carreras de los planes también son favoritas en ruta-favoritos.
  const { carreras, ocupaciones, instituciones } = jsonServidor('ruta/ruta-favoritos')
  assert.deepEqual(copia(montado.render().favoritos), {
    carreras: carreras.length,
    ocupaciones: ocupaciones.length,
    instituciones: instituciones.length,
  })
  assert.equal(carreras.length, 3)
  assert.equal(f.app.requests.filter((r) => r.url.endsWith('/favoritos')).length, 1)
  montado.unmount()
})
