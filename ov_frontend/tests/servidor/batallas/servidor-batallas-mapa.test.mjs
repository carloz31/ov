import assert from 'node:assert/strict'
import test from 'node:test'
import { copia, fixtureServidor, jsonServidor } from '../../soporte/servidor-ayudas.mjs'

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

test('la batalla abre su desafío con sus fichas y el caso, la Central de Casos', () => {
  const m = mapa({ 't-batalla': 'DISPONIBLE', 't-caso': 'DISPONIBLE' })
  assert.deepEqual(copia(m.contenidos.reproductorPorTipo(m.bloques, 't-batalla')), {
    tipo: 'desafio',
    actividad: 't-batalla',
    desafio: 'desafio-rumor',
    fichas: ['t-ficha'],
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

test('las fichas para repasar de la batalla tienen contenido y el servidor las da', () => {
  const app = fixtureServidor()
  const { catalog } = app.load('src/data/activities/content.ts')
  const { contenidoPorClave } = app.load('src/data/activities/contenidos.ts')
  const { fichaDisponible } = app.load('src/lib/servidor/adaptadores.ts')
  const fichas = contenidoPorClave('t_batalla').fichas
  assert.deepEqual(copia(fichas), ['t-ficha'])
  for (const id of fichas) {
    const recurso = catalog.recursos.find((r) => r.id === id)
    assert.ok(recurso?.contenido, `${id} sin contenido en el catálogo`)
    assert.equal(recurso._dato_de_prueba, true)
    assert.equal(fichaDisponible(jsonServidor('ruta/ruta-fichas-final'), id), true)
  }
})
