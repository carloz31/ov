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

for (const etapa of ['inicial', 'ciudad'])
  test(`plataforma conserva los puntos actuales: ${etapa}`, () => {
    const m = mapa(`actividades-${etapa}`)
    const { fieldMissions, cityCases } = m.app.load('src/data/content/adventure.ts')
    const { baseRoute } = m.app.load('src/data/activities/reflectionConfig.ts')
    const { getActivityType, getMissionMeta, getMissionIcon } = m.app.load(
      'src/features/adventure/lib/caminoPoints.ts',
    )
    const { estadoPunto } = m.app.load('src/lib/servidor/adaptadores.ts')
    const camino = m.camino()
    assert.equal(camino.length, 10)
    const actividades = m.bloques[0].actividades
    for (const [i, [id, codigo]] of baseRoute.entries()) {
      const mission = fieldMissions.find((a) => a.id === id)
      assert.deepEqual(copia({ ...camino[i], icon: undefined }), {
        id,
        title: mission.title,
        x: mission.x,
        y: mission.y,
        subtitle: `${getActivityType(mission)} · ${getMissionMeta(mission)}`,
        zone: 'camino',
        bloque: 1,
        specActivityId: codigo,
        status: estadoPunto(actividades.find((a) => a.codigo === codigo)),
        actionEnabled: true,
      })
      assert.equal(camino[i].icon, getMissionIcon(mission))
    }
    assert.equal(camino.at(-1).status, etapa === 'ciudad' ? 'available' : 'locked')
    const ciudad = m.ciudad()
    const mara = ciudad.find((a) => a.id === 'mara-test'),
      elena = ciudad.find((a) => a.id === 'elena-result')
    assert.deepEqual(
      [mara.title, mara.x, mara.y, mara.subtitle, mara.status, mara.specActivityId],
      [
        'Una vuelta por el molino',
        875,
        530,
        'Test · Interacción 1 de 14',
        etapa === 'ciudad' ? 'available' : 'locked',
        'act-tip-01',
      ],
    )
    assert.deepEqual(
      [elena.title, elena.x, elena.y, elena.subtitle, elena.status, elena.actionEnabled],
      ['Las pistas que hablan de ti', 1030, 610, 'Encuentro con Elena', 'locked', false],
    )
    const iconos = m.app.load('src/features/adventure/lib/iconosMapa.ts').iconosMapa
    assert.equal(mara.icon, iconos.test)
    assert.equal(elena.icon, iconos.informativa)
    assert.ok(
      ciudad
        .filter((a) => cityCases.some((c) => c.id === a.id))
        .every((a) => !a.actionEnabled && a.status === 'locked'),
    )
  })

test('piloto dibuja cinco actividades, abre Ciudad al segundo paso y revela Elena al final', () => {
  for (const etapa of ['inicial', 'ciudad', 'final']) {
    const m = mapa(`piloto-actividades-${etapa}`, false)
    const camino = m.camino(),
      ciudad = m.ciudad()
    assert.equal(camino.length, 6)
    assert.equal(camino.at(-1).status, etapa === 'inicial' ? 'locked' : 'available')
    assert.equal(
      ciudad.some((a) => a.id === 'elena-result'),
      etapa === 'final',
    )
    assert.equal(
      ciudad.some((a) => a.specActivityId === 'cdd-sin-contenido'),
      false,
    )
    assert.ok(ciudad.every((a) => !a.additional && !a.revealing && !a.revealQueued))
    const progreso = m.app.load('src/lib/servidor/contenidos.ts').progresoBloque(m.bloques)
    assert.equal(progreso.total, 5)
    assert.equal(progreso.completadas, etapa === 'inicial' ? 0 : 2)
    assert.equal(m.general.getZoneProgress('missions', {}, {}).value, progreso.porcentaje)
  }
})

test('una actividad sin contenido avisa una vez por sesión en desarrollo y nunca en producción', () => {
  const original = console.warn,
    avisos = []
  console.warn = (texto) => avisos.push(texto)
  try {
    const m = mapa('piloto-actividades-ciudad')
    m.ciudad()
    m.ciudad()
    assert.deepEqual(avisos, ['Actividad sin contenido: cdd-sin-contenido → sin_contenido_prueba'])
    m.sesion.limpiarEstadoServidor()
    m.sesion.publicar({ actividades: { datos: m.bloques, estado: 'listo', error: null } })
    m.ciudad()
    assert.equal(avisos.length, 2)
    mapa('piloto-actividades-ciudad', false).ciudad()
    assert.equal(avisos.length, 2)
  } finally {
    console.warn = original
  }
})

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
  const m = mapa('actividades-inicial')
  m.bloques[0].actividades[0].contenido = 'pad_01_acompanar'
  assert.equal(m.camino().length, 9)
  assert.equal(m.app.load('src/lib/servidor/contenidos.ts').progresoBloque(m.bloques).total, 8)
})

test('resolver por contenido conserva los nodos y textos que ya reproduce plataforma', () => {
  const m = mapa('actividades-inicial')
  const { activityById } = m.app.load('src/data/activities/content.ts')
  const { actividadPorContenido } = m.app.load('src/lib/servidor/contenidos.ts')
  for (const actividad of m.bloques[0].actividades) {
    const resuelta = actividadPorContenido(m.bloques, actividad.codigo)
    assert.equal(resuelta.id, actividad.codigo)
    assert.deepEqual(copia(resuelta.nodos), copia(activityById(actividad.codigo).nodos))
  }
})
