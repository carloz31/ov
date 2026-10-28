import assert from 'node:assert/strict'
import test from 'node:test'
import { copia, esperar, fixtureServidor, jsonServidor } from '../../soporte/servidor-ayudas.mjs'
import { fixtureApoderado } from '../../soporte/apoderado-ayudas.mjs'

// La familia de la ruta mínima en cada etapa del apoderado (la final trae el diploma).
const FAMILIA = {
  inicial: 'ruta/ruta-apoderado-familia-inicial',
  mitad: 'ruta/ruta-apoderado-familia-mitad',
  final: 'ruta/ruta-familia',
}
const familiaDe = (etapa) => jsonServidor(FAMILIA[etapa])
function conPreguntas(app, activity) {
  // F08: t_apo_1 trae su elección y sus preguntas; las pruebas del reproductor recorren sus nodos.
  const { contenidoPorClave } = app.load('src/data/activities/contenidos.ts')
  return { ...activity, nodos: contenidoPorClave('t_apo_1').nodos }
}
function fixture(usuario = 'apo-rosa', cuentas = jsonServidor('cuentas'), opciones = {}) {
  const app = opciones.portal ? fixtureApoderado(opciones) : fixtureServidor(opciones)
  app.ingresarComo(usuario || null)
  const alumno = app.load('src/store/servidor/sesion.ts')
  const estadoAlumno = alumno.obtenerEstadoServidor()
  const localAlumno = app.load('src/store/journeyStore.ts').getJourneySnapshot()
  const aventuraAlumno = app.load('src/store/adventureStore.ts').useAdventure()
  const store = app.load('src/store/servidor/apoderado.ts')
  const persistencia = app.load('src/store/parentJourneyStore.ts')
  const contenidos = app.load('src/lib/servidor/contenidos.ts')
  let etapa = 'inicial'
  // F00: el portal también pide la familia; responde con la etapa que dejó el último completar confirmado.
  const fetchBase = app.fetch
  const fetch = (handler) =>
    fetchBase(async (request) => {
      if (request.url.endsWith('/familia')) return { body: familiaDe(etapa) }
      const respuesta = await handler(request)
      if (request.url === '/api/acciones/completar-actividad' && !respuesta?.status)
        etapa = request.body.actividad === 't-apo-1' ? 'mitad' : 'final'
      return respuesta
    })
  fetch((request) => {
    if (request.url === '/api/cuentas') return { body: cuentas }
    if (request.url === '/api/acciones/ingresar')
      return { body: { eventos_registrados: [], nuevos_desbloqueos: [] } }
    if (request.url.endsWith('/actividades'))
      return { body: jsonServidor(`ruta/ruta-apoderado-actividades-${etapa}`) }
    if (request.url === '/api/acciones/completar-actividad') {
      etapa = request.body.actividad === 't-apo-1' ? 'mitad' : 'final'
      return { body: jsonServidor(`ruta/ruta-apoderado-completar-${request.body.actividad}`) }
    }
    if (request.url === '/api/desarrollo/reiniciar') return { body: { mensaje: 'Reiniciado' } }
    throw Error(`Petición inesperada: ${request.url}`)
  })
  return {
    ...app,
    fetch,
    fijarEtapa: (nueva) => {
      etapa = nueva
    },
    store,
    persistencia,
    contenidos,
    alumno,
    estadoAlumno,
    localAlumno,
    aventuraAlumno,
  }
}

test('el ingreso usa la cuenta de apoderado de la sesión sin tocar al estudiante', async () => {
  // B17: la cuenta sale de ov.acceso.v1; ya no se pide GET /cuentas.
  const app = fixture('apo-rosa')
  const primero = app.store.ingresarApoderado()
  assert.equal(app.store.ingresarApoderado(), primero)
  assert.equal((await primero).tipo, 'ok')
  assert.equal(app.store.obtenerEstadoApoderado().cuenta, 'apo-rosa')
  assert.equal((await app.store.ingresarApoderado()).tipo, 'ok')
  assert.deepEqual(
    app.requests.map((r) => [r.method, r.url]),
    [
      ['POST', '/api/acciones/ingresar'],
      ['GET', '/api/cuentas/apo-rosa/actividades'],
      // F00: la familia forma parte de la carga inicial del portal.
      ['GET', '/api/cuentas/apo-rosa/familia'],
    ],
  )
  assert.equal(app.requests[0].body.cuenta, 'apo-rosa')
  assert.equal(app.requests[0].headers.Authorization, 'Bearer TOKEN-DE-PRUEBA')
  assert.equal(app.alumno.obtenerEstadoServidor(), app.estadoAlumno)
  assert.equal(app.load('src/store/journeyStore.ts').getJourneySnapshot(), app.localAlumno)
  assert.equal(app.load('src/store/adventureStore.ts').useAdventure(), app.aventuraAlumno)
  assert.equal(app.load('src/store/servidor/cuenta.ts').cuentaActiva(), null)
  assert.deepEqual([...app.local.keys()].sort(), ['ov.acceso.v1', 'ov.parent-missions.v1'])
})

for (const usuario of ['est-ana', '']) {
  test(`sin sesión de apoderado (${usuario || 'sin sesión'}) se informa error sin ingresar ni pedir actividades`, async () => {
    const app = fixture(usuario)
    const respuesta = await app.store.ingresarApoderado()
    assert.equal(respuesta.tipo, 'http')
    assert.equal(respuesta.estado, 401)
    assert.equal(app.store.obtenerEstadoApoderado().error, respuesta)
    assert.equal(app.store.obtenerEstadoApoderado().cuenta, null)
    assert.deepEqual(app.requests, [])
    assert.equal(app.alumno.obtenerEstadoServidor(), app.estadoAlumno)
    assert.deepEqual([...app.local.keys()], usuario ? ['ov.acceso.v1'] : [])
  })
}

test('la lista toma estructura y disponibilidad del servidor y conserva exactamente los nodos JSON', () => {
  const app = fixture()
  const bloques = jsonServidor('ruta/ruta-apoderado-actividades-inicial')
  const lista = app.contenidos.actividadesApoderado(bloques)
  assert.deepEqual(copia(lista.actividades.map((a) => a.id)), ['t-apo-1', 't-apo-2'])
  assert.deepEqual(copia(lista.sinContenido), [])
  const { contenidoPorClave } = app.load('src/data/activities/contenidos.ts')
  for (const [indice, actividad] of lista.actividades.entries()) {
    const servidor = bloques[0].actividades[indice]
    assert.equal(actividad.titulo, servidor.titulo)
    assert.equal(actividad.orden, indice + 1)
    assert.deepEqual(copia(actividad.requisitos), [])
    assert.deepEqual(copia(actividad.nodos), copia(contenidoPorClave(servidor.contenido).nodos))
    assert.equal(Object.hasOwn(actividad, 'mapa'), false)
  }
  assert.deepEqual([...app.contenidos.disponiblesApoderado(bloques)], ['t-apo-1'])
  assert.deepEqual(copia(app.contenidos.completadasApoderado(bloques)), [])
  // DATO DE PRUEBA: cambia el código de bloque, el orden y los títulos, conservando su espacio.
  bloques[0].codigo = 'OTRA_FAMILIA'
  bloques[0].actividades.reverse()
  bloques[0].actividades[0].titulo = 'Título del servidor'
  const reordenadas = app.contenidos.actividadesApoderado(bloques).actividades
  assert.deepEqual(copia(reordenadas.map((a) => [a.id, a.orden])), [
    ['t-apo-2', 1],
    ['t-apo-1', 2],
  ])
  assert.equal(reordenadas[0].titulo, 'Título del servidor')
  assert.deepEqual(copia(app.contenidos.actividadesApoderado(jsonServidor('actividades-inicial'))), {
    actividades: [],
    sinContenido: [],
  })
})

test('el contenido ausente se informa aparte y ni este ni lo invisible cuentan como progreso', () => {
  const app = fixture()
  const bloques = jsonServidor('ruta/ruta-apoderado-actividades-final')
  // DATO DE PRUEBA: una actividad completa sin contenido y otra invisible para verificar DA12.
  bloques[0].actividades.push({
    ...bloques[0].actividades[0],
    codigo: 'sin-json',
    contenido: 'sin_contenido_prueba',
  })
  bloques[0].actividades[1].visible = false
  assert.deepEqual(copia(app.contenidos.actividadesApoderado(bloques).sinContenido), ['sin-json'])
  assert.deepEqual(copia(app.contenidos.actividadesApoderado(bloques).actividades.map((a) => a.id)), [
    't-apo-1',
  ])
  assert.deepEqual([...app.contenidos.disponiblesApoderado(bloques)], ['t-apo-1'])
  assert.deepEqual(copia(app.contenidos.completadasApoderado(bloques)), ['t-apo-1'])
})

test('completar refresca el servidor y conserva nodo, intentos, elecciones y la cuenta local', async () => {
  const app = fixture('apo-rosa')
  const { initialJourney } = app.load('src/lib/activities/logic.ts')
  const narrativa = conPreguntas(app, { id: 't-apo-1', nodos: [] })
  const pregunta = narrativa.nodos.find((n) => n.tipo === 'pregunta')
  // DATO DE PRUEBA: intento y elección históricos que deben sobrevivir a la hidratación del servidor.
  const eleccion = narrativa.nodos.find((n) => n.tipo === 'eleccion')
  const actual = initialJourney()
  actual.progress[narrativa.id] = {
    estudianteId: 'apo-rosa',
    actividadId: narrativa.id,
    estado: 'en_curso',
    nodoActualId: pregunta.id,
  }
  actual.attempts.push({
    estudianteId: 'apo-rosa',
    actividadId: narrativa.id,
    nodoId: pregunta.id,
    opcionIds: [pregunta.opciones[0].id],
    correcta: false,
    numeroIntento: 1,
    revelada: false,
    respondidaEn: '2026-10-07T10:00:00',
  })
  actual.choices.push({
    estudianteId: 'apo-rosa',
    actividadId: narrativa.id,
    nodoId: eleccion.id,
    opcionId: eleccion.opciones[0].id,
    respondidaEn: '2026-10-07T10:00:00',
  })
  app.persistencia.updateParentJourney(() => actual, 'apo-rosa')
  app.persistencia.updateParentJourney((j) => ({ ...j, resources: ['ficha-local'] }))
  const local = copia(app.persistencia.getParentJourney())
  await app.store.ingresarApoderado()
  const promesa = app.store.completarActividadApoderado('t-apo-1')
  assert.equal(app.store.completarActividadApoderado('t-apo-1'), promesa)
  assert.deepEqual(copia(await promesa), {
    tipo: 'ok',
    datos: jsonServidor('ruta/ruta-apoderado-completar-t-apo-1'),
  })
  // F08: el cierre conserva lo que abrió completar (la vista se vuelve a montar al refrescar).
  const { cierre } = app.store.obtenerEstadoApoderado()
  assert.equal(cierre.actividad, 't-apo-1')
  assert.deepEqual(
    cierre.desbloqueos.map((d) => [d.tipo_objetivo, d.objetivo.codigo]),
    [
      ['ACTIVIDAD', 't-apo-2'],
      ['FICHA', 't-ficha-apo'],
    ],
  )
  const guardado = app.persistencia.getParentJourney('apo-rosa')
  assert.equal(guardado.progress[narrativa.id].estado, 'completada')
  assert.equal(guardado.progress[narrativa.id].nodoActualId, pregunta.id)
  assert.deepEqual(copia(guardado.attempts), copia(actual.attempts))
  assert.deepEqual(copia(guardado.choices), copia(actual.choices))
  assert.deepEqual(copia(app.persistencia.getParentJourney()), local)
  const bloques = app.store.obtenerEstadoApoderado().actividades.datos
  assert.deepEqual(copia(bloques), jsonServidor('ruta/ruta-apoderado-actividades-mitad'))
  assert.deepEqual([...app.contenidos.disponiblesApoderado(bloques)], ['t-apo-1', 't-apo-2'])
  assert.deepEqual(copia(app.contenidos.completadasApoderado(bloques)), ['t-apo-1'])
  // F00: tras completar se refrescan las actividades y la familia.
  assert.deepEqual(
    app.requests.slice(-3).map((r) => r.url),
    [
      '/api/acciones/completar-actividad',
      '/api/cuentas/apo-rosa/actividades',
      '/api/cuentas/apo-rosa/familia',
    ],
  )
  assert.equal(app.store.obtenerEstadoApoderado().enviando, null)
  const recarga = fixtureServidor({ guardado: Object.fromEntries(app.local) }).load(
    'src/store/parentJourneyStore.ts',
  )
  assert.deepEqual(copia(recarga.getParentJourney('apo-rosa')), copia(guardado))
})

test('un 409 conserva progreso, comparte la promesa y permite reintentar después', async () => {
  const app = fixture()
  await app.store.ingresarApoderado()
  const antes = app.local.get('ov.parent-missions.v1')
  const seccion = app.store.obtenerEstadoApoderado().actividades
  let resolver
  app.fetch(
    () =>
      new Promise((resolve) => {
        resolver = resolve
      }),
  )
  const primero = app.store.completarActividadApoderado('t-apo-2')
  assert.equal(app.store.completarActividadApoderado('t-apo-2'), primero)
  const otro = await app.store.completarActividadApoderado('t-apo-1')
  assert.equal(otro.estado, 409)
  await esperar()
  resolver({ status: 409, body: { detail: { mensaje: 'Actividad bloqueada' } } })
  const respuesta = await primero
  assert.equal(respuesta.tipo, 'bloqueado')
  assert.equal(app.local.get('ov.parent-missions.v1'), antes)
  assert.equal(app.store.obtenerEstadoApoderado().actividades, seccion)
  assert.equal(app.store.obtenerEstadoApoderado().enviando, null)
  app.fetch(() => ({ status: 409, body: { detail: { mensaje: 'Actividad bloqueada' } } }))
  assert.equal((await app.store.completarActividadApoderado('t-apo-2')).tipo, 'bloqueado')
  assert.equal(app.requests.filter((r) => r.url.includes('completar-actividad')).length, 2)
})

for (const ruta of ['/api/acciones/ingresar', '/api/cuentas/apo-rosa/actividades']) {
  test(`se descarta la respuesta tardía de ${ruta} al limpiar la sesión`, async () => {
    const app = fixture()
    let resolver
    app.fetch((request) => {
      if (request.url === ruta)
        return new Promise((resolve) => {
          resolver = resolve
        })
      if (request.url === '/api/cuentas') return { body: jsonServidor('cuentas') }
      return { body: { eventos_registrados: [], nuevos_desbloqueos: [] } }
    })
    const pendiente = app.store.ingresarApoderado()
    await esperar()
    if (ruta.endsWith('/actividades')) {
      const consulta = app.store.asegurarActividadesApoderado()
      assert.equal(app.store.asegurarActividadesApoderado(), consulta)
      assert.equal(app.requests.filter((r) => r.url === ruta).length, 1)
    }
    app.store.limpiarEstadoApoderado()
    const limpio = app.store.obtenerEstadoApoderado()
    resolver({
      body: ruta.endsWith('/actividades')
        ? jsonServidor('ruta/ruta-apoderado-actividades-inicial')
        : { eventos_registrados: [], nuevos_desbloqueos: [] },
    })
    assert.equal((await pendiente).estado, 409)
    assert.equal(app.store.obtenerEstadoApoderado(), limpio)
    assert.deepEqual([...app.local.keys()], ['ov.acceso.v1'])
  })
}

test('una finalización tardía tras limpiar no publica ni sobrescribe el progreso guardado', async () => {
  const app = fixture()
  await app.store.ingresarApoderado()
  let resolver
  app.fetch(
    () =>
      new Promise((resolve) => {
        resolver = resolve
      }),
  )
  const pendiente = app.store.completarActividadApoderado('t-apo-1')
  await esperar()
  const disco = app.local.get('ov.parent-missions.v1')
  app.store.limpiarEstadoApoderado()
  const limpio = app.store.obtenerEstadoApoderado()
  resolver({ body: jsonServidor('ruta/ruta-apoderado-completar-t-apo-1') })
  assert.equal((await pendiente).estado, 409)
  assert.equal(app.store.obtenerEstadoApoderado(), limpio)
  assert.equal(app.local.get('ov.parent-missions.v1'), disco)
})

for (const reiniciar of [false, true]) {
  test(`${reiniciar ? 'reiniciar los datos' : 'preparar otro ingreso'} limpia también la sesión del apoderado`, async () => {
    const app = fixture()
    await app.store.ingresarApoderado()
    const operaciones = app.load('src/store/servidor/operaciones.ts')
    if (reiniciar) assert.equal((await operaciones.reiniciarDatosDePrueba()).tipo, 'ok')
    else operaciones.prepararIngreso()
    assert.equal(app.store.obtenerEstadoApoderado().cuenta, null)
    assert.equal(app.store.obtenerEstadoApoderado().actividades.estado, 'sin_cargar')
  })
}

function prepararUltimoPaso(app, activity) {
  const logic = app.load('src/features/parent/lib/missionLogic.ts')
  const opciones = { disponible: true, servidor: true }
  let state = app.persistencia.getParentJourney('apo-rosa')
  state = logic.startParentActivity(activity, state, 'apo-rosa', opciones)
  for (const node of activity.nodos.slice(0, -1)) {
    if (node.tipo === 'pregunta')
      state = logic.answerParentQuestion(
        activity,
        node,
        node.opciones.filter((o) => o.correcta).map((o) => o.id),
        state,
        'apo-rosa',
        opciones,
      )
    state = logic.advanceParentActivity(
      activity,
      node.id,
      state,
      'apo-rosa',
      node.tipo === 'eleccion' ? node.opciones[0].id : undefined,
      opciones,
    )
  }
  app.persistencia.updateParentJourney(() => state, 'apo-rosa')
  return state
}

test('avanzar en servidor llega a $fin sin completitud ni recompensas locales', async () => {
  const app = fixture('apo-rosa', undefined, { portal: true })
  await app.store.ingresarApoderado()
  const activity = conPreguntas(
    app,
    app.contenidos.actividadesApoderado(app.store.obtenerEstadoApoderado().actividades.datos).actividades[0],
  )
  const state = prepararUltimoPaso(app, activity)
  const logic = app.load('src/features/parent/lib/missionLogic.ts')
  assert.equal(logic.readyToCompleteOnServer(activity, state), true)
  const final = logic.advanceParentActivity(
    activity,
    activity.nodos.at(-1).id,
    state,
    'apo-rosa',
    undefined,
    { disponible: true, servidor: true },
  )
  assert.equal(final.progress[activity.id].nodoActualId, '$fin')
  assert.equal(final.progress[activity.id].estado, 'en_curso')
  assert.deepEqual(copia(final.resources), copia(state.resources))
  assert.equal(logic.readyToCompleteOnServer(activity, { ...state, attempts: [] }), false)
})

test('la disponibilidad recibida reemplaza los requisitos locales al iniciar, responder y navegar', () => {
  const app = fixture('', undefined, { portal: true })
  const logic = app.load('src/features/parent/lib/missionLogic.ts')
  const activity = app.load('src/data/activities/content.ts').parentActivities[1]
  const vacio = app.load('src/lib/activities/logic.ts').initialJourney()
  const permitir = { disponible: true, servidor: true },
    bloquear = { disponible: false, servidor: true }
  assert.equal(logic.startParentActivity(activity, vacio, 'apo-rosa', bloquear), vacio)
  const state = logic.startParentActivity(activity, vacio, 'apo-rosa', permitir)
  assert.equal(state.progress[activity.id].nodoActualId, activity.nodos[0].id)
  assert.equal(
    logic.advanceParentActivity(activity, activity.nodos[0].id, state, 'apo-rosa', undefined, bloquear),
    state,
  )
  const avanzado = logic.advanceParentActivity(
    activity,
    activity.nodos[0].id,
    state,
    'apo-rosa',
    undefined,
    permitir,
  )
  const nodo = avanzado.progress[activity.id].nodoActualId
  assert.equal(logic.retreatParentActivity(activity, nodo, avanzado, bloquear), avanzado)
  assert.equal(
    logic.retreatParentActivity(activity, nodo, avanzado, permitir).progress[activity.id].nodoActualId,
    activity.nodos[0].id,
  )
  const pregunta = activity.nodos.find((n) => n.tipo === 'pregunta')
  const seleccion = pregunta.opciones.filter((o) => o.correcta).map((o) => o.id)
  assert.equal(logic.answerParentQuestion(activity, pregunta, seleccion, state, 'apo-rosa', bloquear), state)
  assert.equal(
    logic.answerParentQuestion(activity, pregunta, seleccion, state, 'apo-rosa', permitir).attempts.length,
    1,
  )
})

test('el hook api carga la lista sin usar el progreso de apo-prototipo', async () => {
  const app = fixture('apo-rosa', undefined, { portal: true })
  app.persistencia.updateParentJourney((s) => ({
    ...s,
    progress: {
      't-apo-1': {
        estudianteId: 'apo-prototipo',
        actividadId: 't-apo-1',
        estado: 'completada',
        nodoActualId: '$fin',
      },
    },
  }))
  const { useParentActivities } = app.load('src/features/parent/hooks/useParentActivities.ts')
  const mounted = app.mount(useParentActivities)
  const inicial = mounted.render()
  assert.equal(inicial.loading, true)
  assert.equal(inicial.accountId, '')
  assert.deepEqual(copia(inicial.activities), [])
  await esperar()
  const cargado = mounted.render()
  assert.equal(cargado.loading, false)
  assert.equal(cargado.accountId, 'apo-rosa')
  assert.deepEqual(copia(cargado.completedIds), [])
  assert.equal(cargado.available(cargado.activities[0]), true)
  assert.equal(cargado.available(cargado.activities[1]), false)
  assert.equal(app.alumno.obtenerEstadoServidor(), app.estadoAlumno)
  // B17: ingreso y actividades (F00: y familia); la cuenta sale de la sesión, sin GET /cuentas.
  assert.equal(app.requests.length, 3)
  mounted.unmount()
})

test('el hook local conserva catálogo, cuenta y requisitos sin peticiones', () => {
  const app = fixture('', undefined, { portal: true, api: false })
  const { useParentActivities } = app.load('src/features/parent/hooks/useParentActivities.ts')
  const mounted = app.mount(useParentActivities)
  const source = mounted.render()
  assert.equal(source.accountId, 'apo-prototipo')
  assert.equal(source.loading, false)
  assert.equal(source.error, null)
  assert.equal(source.activities, app.load('src/data/activities/content.ts').parentActivities)
  assert.equal(source.available(source.activities[0]), true)
  assert.equal(source.available(source.activities[1]), false)
  assert.deepEqual(app.requests, [])
  assert.equal(app.local.size, 0)
})

test('las preguntas guardan los intentos en la cuenta del servidor y conservan la cuenta local', async () => {
  const app = fixture('apo-rosa', undefined, { portal: true })
  await app.store.ingresarApoderado()
  const activity = conPreguntas(
    app,
    app.contenidos.actividadesApoderado(app.store.obtenerEstadoApoderado().actividades.datos).actividades[0],
  )
  const node = activity.nodos.find((n) => n.tipo === 'pregunta')
  const { useParentQuestion } = app.load('src/features/parent/hooks/useParentQuestion.ts')
  const mounted = app.mount(useParentQuestion, {
    activity,
    node,
    review: false,
    practiceAttempts: [],
    onPracticeAnswer() {},
  })
  mounted.render().setSelected(node.opciones.filter((o) => o.correcta).map((o) => o.id))
  mounted.render().check()
  assert.equal(mounted.render().feedback.correct, true)
  const state = app.persistencia.getParentJourney('apo-rosa')
  assert.equal(state.attempts.length, 1)
  assert.equal(state.attempts[0].estudianteId, 'apo-rosa')
  assert.equal(state.progress[activity.id].nodoActualId, activity.nodos[0].id)
  assert.equal(app.persistencia.getParentJourney().attempts.length, 0)
})

test('el reproductor inicializa el nodo de un progreso proyectado sin nodo y avanza', async () => {
  const app = fixture('apo-rosa', undefined, { portal: true })
  await app.store.ingresarApoderado()
  const activity = conPreguntas(
    app,
    app.contenidos.actividadesApoderado(app.store.obtenerEstadoApoderado().actividades.datos).actividades[0],
  )
  const { useParentActivitySession } = app.load('src/features/parent/hooks/useParentActivitySession.ts')
  const mounted = app.mount(useParentActivitySession, activity, false)
  const inicial = mounted.render()
  assert.equal(inicial.node.id, activity.nodos[0].id)
  inicial.advance()
  assert.equal(mounted.render().node.id, activity.nodos[1].id)
  assert.equal(
    app.persistencia.getParentJourney('apo-rosa').progress[activity.id].nodoActualId,
    activity.nodos[1].id,
  )
})

test('la pantalla final espera el POST y la consulta; durante el envío no duplica ni retrocede', async () => {
  const app = fixture('apo-rosa', undefined, { portal: true })
  await app.store.ingresarApoderado()
  const activity = app.contenidos.actividadesApoderado(app.store.obtenerEstadoApoderado().actividades.datos)
    .actividades[0]
  prepararUltimoPaso(app, activity)
  const { useParentActivitySession } = app.load('src/features/parent/hooks/useParentActivitySession.ts')
  const mounted = app.mount(useParentActivitySession, activity, false)
  let resolverPost, resolverGet
  // F00: la familia se refresca aparte y responde de inmediato; la espera es la de las actividades.
  app.fetch((r) =>
    r.url.endsWith('/familia')
      ? { body: jsonServidor('ruta/ruta-familia') }
      : new Promise((resolve) => {
          if (r.method === 'POST') resolverPost = resolve
          else resolverGet = resolve
        }),
  )
  const pendiente = mounted.render().advance()
  mounted.render().advance()
  mounted.render().back()
  await esperar()
  assert.equal(app.requests.filter((r) => r.url.includes('completar-actividad')).length, 1)
  assert.equal(mounted.render().node.id, activity.nodos.at(-1).id)
  assert.equal(mounted.render().celebrate, false)
  resolverPost({ body: jsonServidor('ruta/ruta-apoderado-completar-t-apo-1') })
  await esperar()
  assert.equal(mounted.render().node.id, activity.nodos.at(-1).id)
  const { ParentActivityView } = app.load('src/pages/parent/ParentActivityView.tsx')
  assert.equal(ParentActivityView(), null, 'La vista espera mientras se refresca la sección (§7)')
  resolverGet({ body: jsonServidor('ruta/ruta-apoderado-actividades-mitad') })
  await pendiente
  const final = mounted.render()
  assert.equal(final.node, undefined)
  assert.equal(final.celebrate, true)
  assert.equal(final.route.completed, 1)
  assert.equal(final.route.next.id, 't-apo-2')
  assert.equal(app.persistencia.getParentJourney('apo-rosa').progress[activity.id].nodoActualId, '$fin')
})

test('un fallo de conexión conserva el último nodo y el botón existente reintenta el envío', async () => {
  const app = fixture('apo-rosa', undefined, { portal: true })
  await app.store.ingresarApoderado()
  const activity = app.contenidos.actividadesApoderado(app.store.obtenerEstadoApoderado().actividades.datos)
    .actividades[0]
  prepararUltimoPaso(app, activity)
  const { useParentActivitySession } = app.load('src/features/parent/hooks/useParentActivitySession.ts')
  const mounted = app.mount(useParentActivitySession, activity, false)
  let fallar = true
  app.fetch((r) => {
    if (r.method === 'POST') {
      if (fallar) throw Error('Sin conexión')
      return { body: jsonServidor('ruta/ruta-apoderado-completar-t-apo-1') }
    }
    return { body: jsonServidor('ruta/ruta-apoderado-actividades-mitad') }
  })
  await mounted.render().advance()
  const error = mounted.render()
  assert.match(error.error, /No se pudo conectar con el servidor/)
  assert.equal(error.node.id, activity.nodos.at(-1).id)
  assert.equal(error.celebrate, false)
  assert.notEqual(app.persistencia.getParentJourney('apo-rosa').progress[activity.id].estado, 'completada')
  fallar = false
  await error.retrySaving()
  assert.equal(mounted.render().node, undefined)
  assert.equal(mounted.render().error, '')
})

test('al remontar tras la carga se recupera el final confirmado y se celebra sin reenviar', async () => {
  const app = fixture('apo-rosa', undefined, { portal: true })
  await app.store.ingresarApoderado()
  const activity = app.contenidos.actividadesApoderado(app.store.obtenerEstadoApoderado().actividades.datos)
    .actividades[0]
  prepararUltimoPaso(app, activity)
  let resolverGet
  app.fetch((r) =>
    r.method === 'POST'
      ? { body: jsonServidor('ruta/ruta-apoderado-completar-t-apo-1') }
      : r.url.endsWith('/familia')
        ? { body: jsonServidor('ruta/ruta-familia') }
        : new Promise((resolve) => {
            resolverGet = resolve
          }),
  )
  const { useParentActivitySession } = app.load('src/features/parent/hooks/useParentActivitySession.ts')
  const anterior = app.mount(useParentActivitySession, activity, false)
  const pendiente = anterior.render().advance()
  await esperar()
  anterior.unmount()
  resolverGet({ body: jsonServidor('ruta/ruta-apoderado-actividades-mitad') })
  await pendiente
  const siguiente = app.mount(useParentActivitySession, activity, false)
  const final = siguiente.render()
  assert.equal(final.node, undefined)
  assert.equal(final.celebrate, true)
  assert.equal(app.persistencia.getParentJourney('apo-rosa').progress[activity.id].nodoActualId, '$fin')
  assert.equal(app.requests.filter((r) => r.url.includes('completar-actividad')).length, 1)
  siguiente.unmount()
  assert.equal(app.mount(useParentActivitySession, activity, false).render().celebrate, false)
})

test('un 409 se muestra en el error del reproductor sin llegar a la pantalla final', async () => {
  const app = fixture('apo-rosa', undefined, { portal: true })
  await app.store.ingresarApoderado()
  const activity = app.contenidos.actividadesApoderado(app.store.obtenerEstadoApoderado().actividades.datos)
    .actividades[0]
  prepararUltimoPaso(app, activity)
  app.fetch(() => ({ status: 409, body: { detail: { mensaje: 'Actividad bloqueada' } } }))
  const { useParentActivitySession } = app.load('src/features/parent/hooks/useParentActivitySession.ts')
  const mounted = app.mount(useParentActivitySession, activity, false)
  await mounted.render().advance()
  assert.equal(mounted.render().error, 'Actividad bloqueada')
  assert.equal(mounted.render().node.id, activity.nodos.at(-1).id)
  assert.equal(mounted.render().route.completed, 0)
})

test('el enlace directo espera la carga y después muestra el candado del servidor', async () => {
  const app = fixture('apo-rosa', undefined, { portal: true })
  app.setActivityId('t-apo-2')
  const { ParentActivityView } = app.load('src/pages/parent/ParentActivityView.tsx')
  const mounted = app.mount(ParentActivityView)
  assert.equal(mounted.render(), null)
  await esperar()
  assert.equal(mounted.render().props.locked, true)
  app.setActivityId('t-apo-1')
  assert.equal(mounted.render().props.activity.id, 't-apo-1')
})

test('el candado del apoderado lleva el mensaje de bloqueo del servidor', async () => {
  const app = fixture('apo-rosa', undefined, { portal: true })
  // El motivo de bloqueo de t-apo-2 viene en el fixture de la ruta.
  const mensaje = 'Completa la primera actividad.'
  app.fetch((request) => {
    if (request.url === '/api/acciones/ingresar')
      return { body: { eventos_registrados: [], nuevos_desbloqueos: [] } }
    if (request.url.endsWith('/familia')) return { body: jsonServidor('ruta/ruta-familia') }
    if (!request.url.endsWith('/actividades')) throw Error(`Petición inesperada: ${request.url}`)
    return { body: jsonServidor('ruta/ruta-apoderado-actividades-inicial') }
  })
  app.setActivityId('t-apo-2')
  const { ParentActivityView } = app.load('src/pages/parent/ParentActivityView.tsx')
  const mounted = app.mount(ParentActivityView)
  mounted.render()
  await esperar()
  assert.deepEqual([mounted.render().props.locked, mounted.render().props.mensaje], [true, mensaje])
  const { ActivityUnavailable } = app.load('src/features/parent/components/ActivityUnavailable.tsx')
  const tarjeta = JSON.stringify(copia(ActivityUnavailable({ locked: true, mensaje })))
  assert.match(tarjeta, new RegExp(mensaje))
  // Con mensaje del servidor no se repite el texto de respaldo.
  assert.doesNotMatch(tarjeta, /Complete la actividad anterior/)
  assert.match(JSON.stringify(copia(ActivityUnavailable({ locked: true }))), /Complete la actividad anterior/)
})

test('la ruta y el diploma se completan con el servidor aunque no haya nodos locales recorridos', async () => {
  const app = fixture('apo-rosa', undefined, { portal: true })
  app.fetch((r) => ({
    body:
      r.url === '/api/cuentas'
        ? jsonServidor('cuentas')
        : r.url.endsWith('/actividades')
          ? jsonServidor('ruta/ruta-apoderado-actividades-final')
          : // F03: con el diploma, el portal pide los resultados del hijo (con `?estudiante=`) y el catálogo.
            r.url.includes('/familia/resultados') || r.url === '/api/instrumentos'
            ? []
            : { eventos_registrados: [], nuevos_desbloqueos: [] },
  }))
  app.fijarEtapa('final')
  await app.store.ingresarApoderado()
  const { useParentActivities } = app.load('src/features/parent/hooks/useParentActivities.ts')
  const source = useParentActivities()
  const { parentRoute } = app.load('src/features/parent/lib/selectors.ts')
  const route = parentRoute(source.activities, [], source.completedIds, source.available)
  assert.equal(route.complete, true)
  assert.equal(route.percent, 100)
  assert.equal(source.journey.progress['t-apo-1'].nodoActualId, undefined)
  const { useParentOverview } = app.load('src/features/parent/hooks/useParentOverview.ts')
  assert.equal(app.mount(useParentOverview).render().route.complete, true)
  const { ParentPortalModule } = app.load('src/pages/parent/ParentPortalModule.tsx')
  const context = ParentPortalModule().props.children.props.children.props.context
  assert.equal(context.accountId, 'apo-rosa')
  assert.equal(context.activities.length, 2)
  assert.deepEqual(copia(context.completedActivityIds), ['t-apo-1', 't-apo-2'])
})

test('el repaso no envía completitud ni modifica el progreso del servidor', async () => {
  const app = fixture('apo-rosa', undefined, { portal: true })
  await app.store.ingresarApoderado()
  const activity = app.contenidos.actividadesApoderado(app.store.obtenerEstadoApoderado().actividades.datos)
    .actividades[0]
  const antes = app.local.get('ov.parent-missions.v1')
  const { useParentActivitySession } = app.load('src/features/parent/hooks/useParentActivitySession.ts')
  const mounted = app.mount(useParentActivitySession, activity, true)
  for (const _ of activity.nodos) mounted.render().advance()
  assert.equal(mounted.render().node, undefined)
  assert.equal(app.local.get('ov.parent-missions.v1'), antes)
  assert.equal(app.requests.filter((r) => r.url.includes('completar-actividad')).length, 0)
})

test('el contenido faltante se descarta y el hook avisa una sola vez en desarrollo', async () => {
  const app = fixture('apo-rosa', undefined, { portal: true })
  const bloques = jsonServidor('ruta/ruta-apoderado-actividades-final')
  // DATO DE PRUEBA: actividad deliberadamente ausente del registro de contenidos.
  bloques[0].actividades.push({
    ...bloques[0].actividades[0],
    codigo: 't-apo-sin-json',
    contenido: 'sin_contenido_prueba',
  })
  app.fetch((r) => ({
    body:
      r.url === '/api/cuentas'
        ? jsonServidor('cuentas')
        : r.url.endsWith('/actividades')
          ? bloques
          : { eventos_registrados: [], nuevos_desbloqueos: [] },
  }))
  await app.store.ingresarApoderado()
  const avisos = [],
    anterior = console.warn
  console.warn = (...values) => avisos.push(values.join(' '))
  try {
    const { useParentActivities } = app.load('src/features/parent/hooks/useParentActivities.ts')
    const mounted = app.mount(useParentActivities)
    mounted.render()
    const source = mounted.render()
    assert.equal(source.activities.length, 2)
    assert.equal(source.completedIds.length, 2)
    assert.equal(avisos.length, 1)
    assert.match(avisos[0], /t-apo-sin-json → sin_contenido_prueba/)
  } finally {
    console.warn = anterior
  }
})

test('si falla la consulta tras guardar, el reproductor conserva el paso y permite reintentar', async () => {
  const app = fixture('apo-rosa', undefined, { portal: true })
  await app.store.ingresarApoderado()
  const activity = app.contenidos.actividadesApoderado(app.store.obtenerEstadoApoderado().actividades.datos)
    .actividades[0]
  prepararUltimoPaso(app, activity)
  let fallar = true
  app.fetch((r) => {
    if (r.method === 'POST') return { body: jsonServidor('ruta/ruta-apoderado-completar-t-apo-1') }
    if (fallar) throw Error('Sin conexión')
    return { body: jsonServidor('ruta/ruta-apoderado-actividades-mitad') }
  })
  const { useParentActivitySession } = app.load('src/features/parent/hooks/useParentActivitySession.ts')
  const mounted = app.mount(useParentActivitySession, activity, false)
  await mounted.render().advance()
  assert.match(mounted.render().error, /No se pudo conectar/)
  assert.equal(mounted.render().node.id, activity.nodos.at(-1).id)
  assert.equal(mounted.render().celebrate, false)
  fallar = false
  await mounted.render().advance()
  assert.equal(mounted.render().node, undefined)
})

test('salir y limpiar durante el envío impide guardar $fin con la respuesta tardía', async () => {
  const app = fixture('apo-rosa', undefined, { portal: true })
  await app.store.ingresarApoderado()
  const activity = app.contenidos.actividadesApoderado(app.store.obtenerEstadoApoderado().actividades.datos)
    .actividades[0]
  prepararUltimoPaso(app, activity)
  let resolver
  app.fetch(
    () =>
      new Promise((resolve) => {
        resolver = resolve
      }),
  )
  const { useParentActivitySession } = app.load('src/features/parent/hooks/useParentActivitySession.ts')
  const mounted = app.mount(useParentActivitySession, activity, false)
  const pendiente = mounted.render().advance()
  await esperar()
  mounted.unmount()
  app.store.limpiarEstadoApoderado()
  const antes = app.local.get('ov.parent-missions.v1')
  resolver({ body: jsonServidor('ruta/ruta-apoderado-completar-t-apo-1') })
  await pendiente
  assert.equal(app.local.get('ov.parent-missions.v1'), antes)
  assert.equal(app.store.obtenerEstadoApoderado().cuenta, null)
})

test('sin conexión, el hook expone el error y una lista vacía sin usar el catálogo local', async () => {
  const app = fixture('apo-rosa', undefined, { portal: true })
  app.fetch(() => {
    throw Error('Sin conexión')
  })
  const { useParentActivities } = app.load('src/features/parent/hooks/useParentActivities.ts')
  const mounted = app.mount(useParentActivities)
  mounted.render()
  await esperar()
  const source = mounted.render()
  assert.equal(source.error.tipo, 'sin_conexion')
  assert.deepEqual(copia(source.activities), [])
  assert.deepEqual(copia(source.completedIds), [])
  assert.deepEqual([...app.local.keys()], ['ov.acceso.v1'])
})

// F00: la ruta mínima del apoderado. F08: t-apo-2 reemplaza a la carta y se juega al abrirse.
test('ruta lista las dos actividades del apoderado y la segunda se abre tras la primera', () => {
  const app = fixtureServidor({ cuenta: 'apo-rosa' })
  const contenidos = app.load('src/lib/servidor/contenidos.ts')
  const { mensajeBloqueo } = app.load('src/lib/servidor/adaptadores.ts')
  const inicial = jsonServidor('ruta/ruta-apoderado-actividades-inicial')
  const lista = contenidos.actividadesApoderado(inicial)
  assert.deepEqual(copia(lista.actividades.map((a) => a.id)), ['t-apo-1', 't-apo-2'])
  assert.deepEqual(copia(lista.sinContenido), [])
  // La presentación de cada tarjeta es la descripción del servidor.
  assert.deepEqual(
    copia(lista.actividades.map((a) => a.subtitulo)),
    inicial[0].actividades.map((a) => a.descripcion),
  )
  assert.ok(lista.actividades.every((a) => a.subtitulo))
  assert.deepEqual([...contenidos.disponiblesApoderado(inicial)], ['t-apo-1'])
  assert.equal(mensajeBloqueo(inicial, 't-apo-2'), 'Completa la primera actividad.')
  // La segunda, ya abierta por el servidor tras completar t-apo-1.
  const abierta = jsonServidor('ruta/ruta-apoderado-actividades-mitad')
  // t-apo-1 completada sigue disponible para repasar; la segunda, abierta, se puede iniciar.
  assert.deepEqual([...contenidos.disponiblesApoderado(abierta)], ['t-apo-1', 't-apo-2'])
  assert.deepEqual(copia(contenidos.completadasApoderado(abierta)), ['t-apo-1'])
})

// F08: un `$fin` guardado en el navegador para una actividad que el servidor no tiene completada (la base se
// reinició o se volvió a cargar) dejaba el reproductor en el último paso sin poder terminar.
test('una finalización local que el servidor no conoce vuelve a empezar la actividad', () => {
  const app = fixtureServidor({ cuenta: 'apo-rosa' })
  const { proyectarJourneyApoderado } = app.load('src/lib/servidor/adaptadores.ts')
  const local = {
    progress: {
      't-apo-1': {
        estudianteId: 'apo-rosa',
        actividadId: 't-apo-1',
        estado: 'completada',
        nodoActualId: '$fin',
      },
    },
    attempts: [],
    choices: [],
  }
  const inicial = proyectarJourneyApoderado(
    jsonServidor('ruta/ruta-apoderado-actividades-inicial'),
    local,
    'apo-rosa',
  )
  assert.equal(inicial.progress['t-apo-1'].estado, 'no_iniciada')
  assert.equal('nodoActualId' in inicial.progress['t-apo-1'], false)
  // Completada en el servidor, el `$fin` se conserva (el cierre y el repaso lo usan).
  const final = proyectarJourneyApoderado(
    jsonServidor('ruta/ruta-apoderado-actividades-final'),
    local,
    'apo-rosa',
  )
  assert.deepEqual(
    [final.progress['t-apo-1'].estado, final.progress['t-apo-1'].nodoActualId],
    ['completada', '$fin'],
  )
})
