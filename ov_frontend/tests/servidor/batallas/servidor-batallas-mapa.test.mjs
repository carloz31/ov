import assert from 'node:assert/strict'
import test from 'node:test'
import { copia, elementos, esperar, fixtureServidor, jsonServidor } from '../../soporte/servidor-ayudas.mjs'

// F04: batallas y casos se abren según su tipo, no según su bloque.
function mapa(estados = {}) {
  const app = fixtureServidor()
  const sesion = app.load('src/store/servidor/sesion.ts')
  const bloques = jsonServidor('ruta/ruta-actividades-ciudad')
  for (const actividad of bloques.flatMap((b) => b.actividades))
    if (estados[actividad.codigo]) Object.assign(actividad, { visible: true, estado: estados[actividad.codigo] })
  sesion.publicar({ actividades: { datos: bloques, estado: 'listo', error: null } })
  return {
    app,
    bloques,
    contenidos: app.load('src/lib/servidor/contenidos.ts'),
    camino: () => app.load('src/features/adventure/lib/caminoPoints.ts').getCaminoPoints({}, {}),
    ciudad: () => app.load('src/features/adventure/lib/ciudadPoints.ts').getCiudadPoints({}, {}),
    detalles: app.load('src/features/adventure/lib/pointDetails.ts').getPointDetails,
  }
}

test('la batalla abre su desafío y el caso, la Central de Casos', () => {
  const m = mapa({ 't-batalla': 'DISPONIBLE', 't-caso': 'DISPONIBLE' })
  assert.deepEqual(copia(m.contenidos.reproductorPorTipo(m.bloques, 't-batalla')), {
    tipo: 'desafio',
    actividad: 't-batalla',
    desafio: 'desafio-rumor',
  })
  assert.deepEqual(copia(m.contenidos.reproductorPorTipo(m.bloques, 't-caso')), {
    tipo: 'caso',
    actividad: 't-caso',
    caso: 'forest-fire',
  })
  assert.equal(m.contenidos.reproductorPorTipo(m.bloques, 't-inicio'), undefined)
  const bloqueada = mapa({ 't-batalla': 'BLOQUEADA' })
  assert.equal(bloqueada.contenidos.reproductorPorTipo(bloqueada.bloques, 't-batalla'), undefined)
})

test('en el mapa la batalla lleva la espada y no queda como contenido pendiente', () => {
  const m = mapa({ 't-batalla': 'DISPONIBLE', 't-caso': 'DISPONIBLE' })
  const batalla = m.camino().find((p) => p.specActivityId === 't-batalla')
  assert.equal(batalla.icon.displayName ?? batalla.icon.name, 'Swords')
  const detalle = m.detalles(batalla, {}, {})
  assert.deepEqual([detalle.badge, detalle.disabled, detalle.activityId], ['Disponible', false, 't-batalla'])
  const caso = m.ciudad().find((p) => p.specActivityId === 't-caso')
  const detalleCaso = m.detalles(caso, {}, {})
  assert.deepEqual([detalleCaso.disabled, detalleCaso.href], [false, '/student/cases/forest-fire'])
})

test('la Ciudad no repite el marcador fijo del desafío ni del caso que representa el servidor', () => {
  const ids = mapa().ciudad().map((p) => p.id)
  assert.equal(ids.includes('forest-fire'), false)
  assert.equal(ids.includes('desafio-rumor'), false)
  assert.ok(ids.includes('neighborhood-radio'))
})

test('las fichas de la batalla salen del servidor y tienen contenido de prueba en el catálogo', () => {
  const app = fixtureServidor()
  const { catalog } = app.load('src/data/activities/content.ts')
  const { contenidoPorClave } = app.load('src/data/activities/contenidos.ts')
  // F04b: el contenido ya no lista fichas; las trae la batalla del servidor, derivadas de sus preguntas.
  assert.equal(contenidoPorClave('t_batalla').fichas, undefined)
  const [batalla] = jsonServidor('ruta/ruta-batallas')
  assert.deepEqual(copia(batalla.fichas.map((f) => [f.codigo, f.estado])), [
    ['t-ficha', 'DISPONIBLE'],
    ['t-ficha-2', 'DISPONIBLE'],
  ])
  for (const { codigo } of batalla.fichas) {
    const recurso = catalog.recursos.find((r) => r.id === codigo)
    assert.ok(recurso?.contenido, `${codigo} sin contenido en el catálogo`)
    assert.equal(recurso._dato_de_prueba, true)
  }
})

test('«Se alimenta de» lista todas las fichas y cada una lleva a la mochila (F04d)', async () => {
  const app = fixtureServidor()
  const sesion = app.load('src/store/servidor/sesion.ts')
  const bloques = jsonServidor('ruta/ruta-actividades-ciudad')
  sesion.publicar({ actividades: { datos: bloques, estado: 'listo', error: null }, consultasHabilitadas: true })
  const [batalla] = jsonServidor('ruta/ruta-batallas')
  const fichas = [{ ...batalla.fichas[0], estado: 'BLOQUEADA' }, batalla.fichas[1]]
  app.fetch((r) => (r.url.endsWith('/batallas') ? { body: [{ ...batalla, fichas }] } : { body: [] }))
  const vista = app.mount(app.load('src/features/activities/components/FichasBatalla.tsx').FichasBatalla, {
    codigo: 't-batalla',
  })
  vista.render()
  await esperar()
  const enlaces = elementos(vista.render(), (e) => e.type?.displayName === 'Link' || e.type?.name === 'Link' || 'to' in (e.props ?? {}))
  assert.deepEqual(copia(enlaces.map((e) => e.props.to)), [
    '/student/resources?kind=sheet&ficha=t-ficha',
    '/student/resources?kind=sheet&ficha=t-ficha-2',
  ])
  // La bloqueada lleva candado; la mochila mostrará cómo obtenerla.
  assert.equal(elementos(enlaces[0], (e) => e.props?.['aria-label'] === 'Bloqueada').length, 1)
  assert.equal(elementos(enlaces[1], (e) => e.props?.['aria-label'] === 'Bloqueada').length, 0)
})
