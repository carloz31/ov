import assert from 'node:assert/strict'
import test from 'node:test'
import { copia, fixtureServidor, jsonServidor } from '../../soporte/servidor-ayudas.mjs'

function mapa(fixture, desarrollo = true) {
  const app = fixtureServidor({ desarrollo })
  const sesion = app.load('src/store/servidor/sesion.ts')
  const bloques = jsonServidor(fixture)
  sesion.publicar({ actividades: { datos: bloques, estado: 'listo', error: null } })
  const camino = app.load('src/features/adventure/lib/caminoPoints.ts')
  const ciudad = app.load('src/features/adventure/lib/ciudadPoints.ts')
  const general = app.load('src/features/adventure/lib/mapPoints.ts')
  return {
    app,
    sesion,
    bloques,
    camino: () => camino.getCaminoPoints({}, {}),
    ciudad: () => ciudad.getCiudadPoints({}, {}),
    general,
    siguiente: camino.getNextCaminoActivity,
  }
}

const posiciones = (puntos) => copia(puntos.map((p) => [p.specActivityId ?? p.id, p.bloque, p.status]))

test('ruta dibuja T0, T1 y T2 en el orden del servidor, con su tramo y su estado', () => {
  const m = mapa('ruta/ruta-actividades-inicial')
  const camino = m.camino()
  assert.deepEqual(posiciones(camino), [
    ['t-inicio', 1, 'available'],
    ['t-partida', 1, 'available'],
    ['t-cierre-inicio', 1, 'locked'],
    ['t-expectativas', 2, 'locked'],
    ['t-valores', 2, 'locked'],
    ['t-eco', 2, 'locked'],
    ['t-lee-cuestionario', 2, 'locked'],
    ['t-batalla', 2, 'locked'],
    ['t-explorar', 2, 'locked'],
    ['t-llegada', 3, 'locked'],
    ['t-comparar', 3, 'locked'],
    ['t-proyecto', 3, 'locked'],
    ['city', null, 'locked'],
  ])
  const { contenidoPorClave } = m.app.load('src/data/activities/contenidos.ts')
  const inicio = camino[0]
  assert.deepEqual([inicio.title, inicio.x, inicio.y, inicio.subtitle], [
    'Inicio de prueba',
    contenidoPorClave('t_inicio').mapa.x,
    contenidoPorClave('t_inicio').mapa.y,
    'Informativa · 5 min',
  ])
  assert.ok(m.ciudad().filter((p) => p.specActivityId?.startsWith('t-')).every((p) => p.status === 'locked'))
  assert.equal(m.siguiente(camino).id, 't-inicio')
  assert.ok(m.siguiente(camino).nodos.length > 0)
})

test('lo que se abre al desbloquear aparece solo cuando el servidor lo hace visible', () => {
  const visibles = (etapa) => mapa(`ruta/ruta-actividades-${etapa}`).camino().map((p) => p.specActivityId)
  assert.equal(visibles('t1').includes('t-opcional'), false)
  assert.equal(visibles('ciudad').includes('t-opcional'), true)
  assert.equal(visibles('ciudad').includes('t-adicional'), true)
  const ciudad = mapa('ruta/ruta-actividades-ciudad').ciudad()
  assert.equal(ciudad.find((p) => p.specActivityId === 't-mision-intereses').status, 'available')
})

test('el avance del camino cuenta solo las actividades requeridas, como el servidor', () => {
  for (const [etapa, completadas] of [
    ['inicial', 0],
    ['t1', 3],
    ['ciudad', 4],
  ]) {
    const m = mapa(`ruta/ruta-actividades-${etapa}`)
    const progreso = m.app.load('src/lib/servidor/contenidos.ts').progresoBloque(m.bloques)
    assert.deepEqual([progreso.completadas, progreso.total], [completadas, 7])
    assert.equal(m.general.getZoneProgress('missions', {}, {}).value, progreso.porcentaje)
  }
  const m = mapa('ruta/ruta-actividades-t2')
  assert.equal(m.app.load('src/lib/servidor/contenidos.ts').progresoBloque(m.bloques, 'CIUDAD').completadas, 3)
})

test('un contenido sin nodos ubica el punto, pero no abre actividad', () => {
  const m = mapa('ruta/ruta-actividades-t1')
  const { getPointDetails } = m.app.load('src/features/adventure/lib/pointDetails.ts')
  const { actividadPorContenido } = m.app.load('src/lib/servidor/contenidos.ts')
  const expectativas = m.camino().find((p) => p.specActivityId === 't-expectativas')
  assert.equal(expectativas.status, 'available')
  const detalle = getPointDetails(expectativas, {}, {})
  assert.deepEqual(
    [detalle.badge, detalle.actionLabel, detalle.disabled, detalle.meta, detalle.type],
    ['Contenido pendiente', 'Contenido pendiente', true, '15 min', 'Registro'],
  )
  assert.equal(actividadPorContenido(m.bloques, 't-expectativas'), undefined)
  const inicio = getPointDetails(
    m.camino().find((p) => p.specActivityId === 't-inicio'),
    {},
    {},
  )
  assert.deepEqual(
    [inicio.badge, inicio.actionLabel, inicio.disabled, inicio.type],
    ['Completada', 'Volver a realizar esta misión', false, 'Informativa'],
  )
})

test('una actividad sin contenido avisa una vez por sesión en desarrollo y nunca en producción', () => {
  const original = console.warn,
    avisos = []
  console.warn = (texto) => avisos.push(texto)
  const sinContenido = (m) => {
    m.bloques[3].actividades[0].contenido = 'sin_contenido_prueba'
    m.sesion.publicar({ actividades: { datos: m.bloques, estado: 'listo', error: null } })
    return m
  }
  try {
    const m = sinContenido(mapa('ruta/ruta-actividades-ciudad'))
    m.ciudad()
    m.ciudad()
    assert.deepEqual(avisos, ['Actividad sin contenido: t-mision-intereses → sin_contenido_prueba'])
    assert.equal(
      m.ciudad().some((p) => p.specActivityId === 't-mision-intereses'),
      false,
    )
    m.sesion.limpiarEstadoServidor()
    m.sesion.publicar({ actividades: { datos: m.bloques, estado: 'listo', error: null } })
    m.ciudad()
    assert.equal(avisos.length, 2)
    sinContenido(mapa('ruta/ruta-actividades-ciudad', false)).ciudad()
    assert.equal(avisos.length, 2)
  } finally {
    console.warn = original
  }
})

// Hasta F03, la secuencia de Mara se prueba con los fixtures de plataforma.
test('orden remoto, códigos nuevos, visibilidad y secuencias dirigen puntos y siguiente actividad', () => {
  const m = mapa('actividades-ciudad')
  const camino = m.bloques[0]
  camino.actividades = [
    { ...camino.actividades[2], codigo: 'registro-nuevo', estado: 'DISPONIBLE' },
    { ...camino.actividades[0], visible: false },
    { ...camino.actividades[1], estado: 'DISPONIBLE', visibilidad: 'AL_DESBLOQUEAR' },
  ]
  const puntos = m.camino()
  assert.deepEqual(copia(puntos.map((a) => a.specActivityId).filter(Boolean)), [
    'registro-nuevo',
    'enc-mitos',
  ])
  const siguiente = m.siguiente(puntos)
  assert.equal(siguiente.id, 'registro-nuevo')
  assert.equal(siguiente.nodos.length > 0, true)
  assert.equal(m.general.getRecommendedPoint(puntos).specActivityId, 'registro-nuevo')
  assert.equal(m.app.load('src/lib/servidor/contenidos.ts').progresoBloque(m.bloques).total, 1)
  const secuencia = m.bloques[1].actividades.slice(0, 14)
  secuencia.slice(0, 3).forEach((a) => (a.estado = 'COMPLETADA'))
  assert.equal(m.ciudad().find((a) => a.id === 'mara-test').subtitle, 'Test · Interacción 4 de 14')
  secuencia.forEach((a) => (a.estado = 'COMPLETADA'))
  assert.equal(m.ciudad().find((a) => a.id === 'mara-test').specActivityId, 'act-tip-14')
  assert.equal(m.ciudad().find((a) => a.id === 'mara-test').status, 'completed')
})

test('contenido sin posición no se dibuja ni participa del progreso', () => {
  const m = mapa('ruta/ruta-actividades-inicial')
  m.bloques[0].actividades[0].contenido = 'pad_01_acompanar'
  assert.equal(m.camino().some((p) => p.specActivityId === 't-inicio'), false)
  assert.equal(m.app.load('src/lib/servidor/contenidos.ts').progresoBloque(m.bloques).total, 6)
})

test('resolver por contenido usa los nodos del JSON de la ruta con el código y el título del servidor', () => {
  const m = mapa('ruta/ruta-actividades-inicial')
  const { actividadPorContenido } = m.app.load('src/lib/servidor/contenidos.ts')
  const { contenidoPorClave } = m.app.load('src/data/activities/contenidos.ts')
  for (const codigo of ['t-inicio', 't-partida', 't-cierre-inicio']) {
    const resuelta = actividadPorContenido(m.bloques, codigo)
    assert.equal(resuelta.id, codigo)
    assert.equal(resuelta.titulo, m.bloques[0].actividades.find((a) => a.codigo === codigo).titulo)
    assert.deepEqual(copia(resuelta.nodos), contenidoPorClave(codigo.replaceAll('-', '_')).nodos)
  }
})
