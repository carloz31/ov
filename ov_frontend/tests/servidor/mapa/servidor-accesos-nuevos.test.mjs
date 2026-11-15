import assert from 'node:assert/strict'
import test from 'node:test'
import { copia, elementos, fixtureServidor, jsonServidor } from '../../soporte/servidor-ayudas.mjs'

// Ajuste desbloqueos (C): un punto en cada acceso rápido cuya sección está abierta y cuya presentación de primera
// visita aún no se cerró; Recursos espera a la primera misión. Solo lee el almacén: no hay peticiones.
const listo = (datos) => ({ datos, estado: 'listo', error: null })
const SECCIONES = ['PLANES', 'DIARIO', 'FAMILIA', 'INVESTIGACIONES', 'CATALOGO', 'CHECK_IN']

function preparar({ abiertas = SECCIONES, vistas = [], b01 = 'COMPLETADA', presentaciones } = {}) {
  const app = fixtureServidor({ ruta: '/student/missions' })
  const bloques = copia(jsonServidor('contenido/contenido-actividades-inicial'))
  bloques[0].actividades[0].estado = b01
  const secciones = SECCIONES.map((codigo) =>
    abiertas.includes(codigo)
      ? { codigo, nombre: codigo, estado: 'DISPONIBLE', bloqueo: null }
      : { codigo, nombre: codigo, estado: 'BLOQUEADA', bloqueo: [{ regla: `R-${codigo}`, mensaje: 'Falta algo.' }] },
  )
  app.load('src/store/servidor/sesion.ts').publicar({
    actividades: listo(bloques),
    secciones: listo(secciones),
    presentaciones: presentaciones ?? listo({ vistas }),
  })
  app.fetch((r) => {
    throw Error(`Solicitud no esperada: ${r.url}`)
  })
  return app
}

function nuevos(app) {
  const { AdventurePanel } = app.load('src/features/adventure/components/AdventurePanel.tsx')
  const { appPaths } = app.load('src/routes/paths.ts')
  const adventure = app.load('src/store/adventureStore.ts').useAdventure()
  const panel = app.mount(AdventurePanel, {
    adventure, points: [], progress: { label: '', value: 0 }, onSelect() {}, onCheckIn() {},
  })
  const tree = panel.render()
  panel.unmount()
  const porRuta = Object.fromEntries(
    elementos(tree, (e) => e.type?.name === 'AccesoRapido').map((e) => [e.props.to, e.props.nuevo]),
  )
  const s = appPaths.student
  return {
    planes: porRuta[s.decisions], diario: porRuta[s.journal], familia: porRuta[s.conversations],
    recursos: porRuta[s.resources], investigaciones: porRuta[s.investigations], catalogo: porRuta[s.catalog.professions],
    peticiones: app.requests.length,
  }
}

test('abierta y sin presentación vista, con punto; con candado, nunca', () => {
  const app = preparar({ abiertas: ['DIARIO', 'CATALOGO'] })
  assert.deepEqual(nuevos(app), {
    planes: false, diario: true, familia: false, recursos: true, investigaciones: false, catalogo: true, peticiones: 0,
  })
})

test('con la presentación de su vista ya cerrada, sin punto', () => {
  const app = preparar({ vistas: ['journal', 'resources', 'catalog-professions', 'profile-decisions'] })
  const estado = nuevos(app)
  assert.deepEqual([estado.diario, estado.recursos, estado.catalogo, estado.planes], [false, false, false, false])
  assert.deepEqual([estado.familia, estado.investigaciones], [true, true])
})

test('sin datos de presentaciones (cargando o con error), ningún punto', () => {
  for (const presentaciones of [{ datos: null, estado: 'cargando', error: null },
    { datos: null, estado: 'error', error: { tipo: 'sin_conexion' } }]) {
    const estado = nuevos(preparar({ presentaciones }))
    assert.ok(Object.entries(estado).every(([k, v]) => k === 'peticiones' || v === false), JSON.stringify(estado))
  }
})

test('Recursos no tiene punto antes de resolver la primera misión', () => {
  assert.equal(nuevos(preparar({ b01: 'DISPONIBLE' })).recursos, false)
  assert.equal(nuevos(preparar({ b01: 'COMPLETADA' })).recursos, true)
})

test('al cerrar la presentación, el almacén publica la vista y el punto se apaga sin recargar', async () => {
  const app = preparar({ abiertas: ['DIARIO'] })
  assert.equal(nuevos(app).diario, true)
  app.fetch((r) => {
    if (r.url === '/api/acciones/presentacion-vista') return { body: { vistas: [r.body.codigo] } }
    throw Error(`Solicitud no configurada: ${r.url}`)
  })
  await app.load('src/store/servidor/operaciones.ts').marcarPresentacionVista('journal')
  assert.equal(nuevos(app).diario, false)
})
