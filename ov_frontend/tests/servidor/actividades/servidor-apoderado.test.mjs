import assert from 'node:assert/strict'
import test from 'node:test'
import { copia, esperar, fixtureServidor, jsonServidor } from '../../soporte/servidor-ayudas.mjs'
import { fixtureApoderado } from '../../soporte/apoderado-ayudas.mjs'

function fixture(usuario = '', cuentas = jsonServidor('cuentas'), opciones = {}) {
  const app = opciones.portal ? fixtureApoderado(opciones) : fixtureServidor(opciones)
  const cuenta = app.load('src/store/servidor/cuenta.ts')
  cuenta.guardarUsuarioIngreso(usuario)
  const alumno = app.load('src/store/servidor/sesion.ts')
  const estadoAlumno = alumno.obtenerEstadoServidor()
  const localAlumno = app.load('src/store/journeyStore.ts').getJourneySnapshot()
  const aventuraAlumno = app.load('src/store/adventureStore.ts').useAdventure()
  const store = app.load('src/store/servidor/apoderado.ts')
  const persistencia = app.load('src/store/parentJourneyStore.ts')
  const contenidos = app.load('src/lib/servidor/contenidos.ts')
  let etapa = 'inicial'
  app.fetch((request) => {
    if (request.url === '/api/cuentas') return { body: cuentas }
    if (request.url === '/api/acciones/ingresar')
      return { body: { eventos_registrados: [], nuevos_desbloqueos: [] } }
    if (request.url.endsWith('/actividades')) return { body: jsonServidor(`apoderado-actividades-${etapa}`) }
    if (request.url === '/api/acciones/completar-actividad') {
      etapa = request.body.actividad === 'pad-01-rol' ? 'pad-01' : 'final'
      return { body: jsonServidor(`apoderado-completar-${request.body.actividad}`) }
    }
    if (request.url === '/api/desarrollo/reiniciar') return { body: { mensaje: 'Reiniciado' } }
    throw Error(`Petición inesperada: ${request.url}`)
  })
  return { ...app, store, persistencia, contenidos, alumno, estadoAlumno, localAlumno, aventuraAlumno }
}

for (const usuario of ['apo-rosa', 'est-ana', '']) {
  test(`el ingreso con usuario ${usuario || 'vacío'} selecciona al apoderado sin tocar al estudiante`, async () => {
    const app = fixture(usuario)
    const primero = app.store.ingresarApoderado()
    assert.equal(app.store.ingresarApoderado(), primero)
    assert.equal((await primero).tipo, 'ok')
    assert.equal(app.store.obtenerEstadoApoderado().cuenta, 'apo-rosa')
    assert.equal((await app.store.ingresarApoderado()).tipo, 'ok')
    assert.deepEqual(
      app.requests.map((r) => [r.method, r.url]),
      [
        ['GET', '/api/cuentas'],
        ['POST', '/api/acciones/ingresar'],
        ['GET', '/api/cuentas/apo-rosa/actividades'],
      ],
    )
    assert.equal(app.requests[1].body.cuenta, 'apo-rosa')
    assert.equal(app.alumno.obtenerEstadoServidor(), app.estadoAlumno)
    assert.equal(app.load('src/store/journeyStore.ts').getJourneySnapshot(), app.localAlumno)
    assert.equal(app.load('src/store/adventureStore.ts').useAdventure(), app.aventuraAlumno)
    assert.equal(app.load('src/store/servidor/cuenta.ts').cuentaActiva(), null)
    assert.deepEqual([...app.local.keys()], ['ov.parent-missions.v1'])
    assert.deepEqual(JSON.parse(app.sesion.get('ov.cuenta-servidor.v1')), { usuario, codigo: null })
  })
}

test('la selección usa primero el usuario y, en su ausencia, el menor código de apoderado', async () => {
  // DATO DE PRUEBA: otra cuenta para verificar orden y coincidencia sin depender de plataforma.
  const cuentas = [{ codigo: 'apo-zeta', nombre: 'Zeta', rol: 'APODERADO' }, ...jsonServidor('cuentas')]
  for (const [usuario, esperado] of [
    ['apo-zeta', 'apo-zeta'],
    ['otro', 'apo-rosa'],
  ]) {
    const app = fixture(usuario, cuentas)
    await app.store.ingresarApoderado()
    assert.equal(app.store.obtenerEstadoApoderado().cuenta, esperado)
  }
})

test('sin cuentas de apoderado se informa error sin ingresar ni pedir actividades', async () => {
  const app = fixture(
    '',
    jsonServidor('cuentas').filter((c) => c.rol === 'ESTUDIANTE'),
  )
  const respuesta = await app.store.ingresarApoderado()
  assert.equal(respuesta.tipo, 'http')
  assert.equal(respuesta.estado, 404)
  assert.equal(app.store.obtenerEstadoApoderado().error, respuesta)
  assert.equal(app.store.obtenerEstadoApoderado().cuenta, null)
  assert.deepEqual(
    app.requests.map((r) => r.url),
    ['/api/cuentas'],
  )
  assert.equal(app.alumno.obtenerEstadoServidor(), app.estadoAlumno)
  assert.equal(app.local.size, 0)
})

test('la lista toma estructura y disponibilidad del servidor y conserva exactamente los nodos JSON', () => {
  const app = fixture()
  const bloques = jsonServidor('apoderado-actividades-inicial')
  const lista = app.contenidos.actividadesApoderado(bloques)
  assert.deepEqual(copia(lista.actividades.map((a) => a.id)), ['pad-01-rol', 'pad-02-info'])
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
  assert.deepEqual([...app.contenidos.disponiblesApoderado(bloques)], ['pad-01-rol'])
  assert.deepEqual(copia(app.contenidos.completadasApoderado(bloques)), [])
  // DATO DE PRUEBA: cambia el código de bloque, el orden y los títulos, conservando su espacio.
  bloques[0].codigo = 'OTRA_FAMILIA'
  bloques[0].actividades.reverse()
  bloques[0].actividades[0].titulo = 'Título del servidor'
  const reordenadas = app.contenidos.actividadesApoderado(bloques).actividades
  assert.deepEqual(copia(reordenadas.map((a) => [a.id, a.orden])), [
    ['pad-02-info', 1],
    ['pad-01-rol', 2],
  ])
  assert.equal(reordenadas[0].titulo, 'Título del servidor')
  assert.deepEqual(copia(app.contenidos.actividadesApoderado(jsonServidor('actividades-inicial'))), {
    actividades: [],
    sinContenido: [],
  })
})

test('el contenido ausente se informa aparte y ni este ni lo invisible cuentan como progreso', () => {
  const app = fixture()
  const bloques = jsonServidor('apoderado-actividades-final')
  // DATO DE PRUEBA: una actividad completa sin contenido y otra invisible para verificar DA12.
  bloques[0].actividades.push({
    ...bloques[0].actividades[0],
    codigo: 'sin-json',
    contenido: 'sin_contenido_prueba',
  })
  bloques[0].actividades[1].visible = false
  assert.deepEqual(copia(app.contenidos.actividadesApoderado(bloques).sinContenido), ['sin-json'])
  assert.deepEqual(copia(app.contenidos.actividadesApoderado(bloques).actividades.map((a) => a.id)), [
    'pad-01-rol',
  ])
  assert.deepEqual([...app.contenidos.disponiblesApoderado(bloques)], ['pad-01-rol'])
  assert.deepEqual(copia(app.contenidos.completadasApoderado(bloques)), ['pad-01-rol'])
})

test('completar refresca el servidor y conserva nodo, intentos, elecciones y la cuenta local', async () => {
  const app = fixture('apo-rosa')
  const { initialJourney } = app.load('src/lib/activities/logic.ts')
  const narrativa = app.load('src/data/activities/contenidos.ts').contenidoPorClave('pad_01_acompanar')
  const pregunta = narrativa.nodos.find((n) => n.tipo === 'pregunta')
  // DATO DE PRUEBA: elección histórica que debe sobrevivir a la hidratación del servidor.
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
  const promesa = app.store.completarActividadApoderado('pad-01-rol')
  assert.equal(app.store.completarActividadApoderado('pad-01-rol'), promesa)
  assert.deepEqual(copia(await promesa), {
    tipo: 'ok',
    datos: jsonServidor('apoderado-completar-pad-01-rol'),
  })
  const guardado = app.persistencia.getParentJourney('apo-rosa')
  assert.equal(guardado.progress[narrativa.id].estado, 'completada')
  assert.equal(guardado.progress[narrativa.id].nodoActualId, pregunta.id)
  assert.deepEqual(copia(guardado.attempts), copia(actual.attempts))
  assert.deepEqual(copia(guardado.choices), copia(actual.choices))
  assert.deepEqual(copia(app.persistencia.getParentJourney()), local)
  const bloques = app.store.obtenerEstadoApoderado().actividades.datos
  assert.deepEqual(copia(bloques), jsonServidor('apoderado-actividades-pad-01'))
  assert.deepEqual([...app.contenidos.disponiblesApoderado(bloques)], ['pad-01-rol', 'pad-02-info'])
  assert.deepEqual(copia(app.contenidos.completadasApoderado(bloques)), ['pad-01-rol'])
  assert.deepEqual(
    app.requests.slice(-2).map((r) => r.url),
    ['/api/acciones/completar-actividad', '/api/cuentas/apo-rosa/actividades'],
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
  const primero = app.store.completarActividadApoderado('pad-02-info')
  assert.equal(app.store.completarActividadApoderado('pad-02-info'), primero)
  const otro = await app.store.completarActividadApoderado('pad-01-rol')
  assert.equal(otro.estado, 409)
  await esperar()
  resolver({ status: 409, body: { detail: { mensaje: 'Actividad bloqueada' } } })
  const respuesta = await primero
  assert.equal(respuesta.tipo, 'bloqueado')
  assert.equal(app.local.get('ov.parent-missions.v1'), antes)
  assert.equal(app.store.obtenerEstadoApoderado().actividades, seccion)
  assert.equal(app.store.obtenerEstadoApoderado().enviando, null)
  app.fetch(() => ({ status: 409, body: { detail: { mensaje: 'Actividad bloqueada' } } }))
  assert.equal((await app.store.completarActividadApoderado('pad-02-info')).tipo, 'bloqueado')
  assert.equal(app.requests.filter((r) => r.url.includes('completar-actividad')).length, 2)
})

for (const ruta of ['/api/cuentas', '/api/acciones/ingresar', '/api/cuentas/apo-rosa/actividades']) {
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
      body:
        ruta === '/api/cuentas'
          ? jsonServidor('cuentas')
          : ruta.endsWith('/actividades')
            ? jsonServidor('apoderado-actividades-inicial')
            : { eventos_registrados: [], nuevos_desbloqueos: [] },
    })
    assert.equal((await pendiente).estado, 409)
    assert.equal(app.store.obtenerEstadoApoderado(), limpio)
    assert.equal(app.local.size, 0)
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
  const pendiente = app.store.completarActividadApoderado('pad-01-rol')
  await esperar()
  const disco = app.local.get('ov.parent-missions.v1')
  app.store.limpiarEstadoApoderado()
  const limpio = app.store.obtenerEstadoApoderado()
  resolver({ body: jsonServidor('apoderado-completar-pad-01-rol') })
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
  const activity = app.contenidos.actividadesApoderado(app.store.obtenerEstadoApoderado().actividades.datos)
    .actividades[0]
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
      'pad-01-rol': {
        estudianteId: 'apo-prototipo',
        actividadId: 'pad-01-rol',
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
  const activity = app.contenidos.actividadesApoderado(app.store.obtenerEstadoApoderado().actividades.datos)
    .actividades[0]
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
  const activity = app.contenidos.actividadesApoderado(app.store.obtenerEstadoApoderado().actividades.datos)
    .actividades[0]
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
  app.fetch(
    (r) =>
      new Promise((resolve) => {
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
  resolverPost({ body: jsonServidor('apoderado-completar-pad-01-rol') })
  await esperar()
  assert.equal(mounted.render().node.id, activity.nodos.at(-1).id)
  const { ParentActivityView } = app.load('src/pages/parent/ParentActivityView.tsx')
  assert.equal(ParentActivityView(), null, 'La vista espera mientras se refresca la sección (§7)')
  resolverGet({ body: jsonServidor('apoderado-actividades-pad-01') })
  await pendiente
  const final = mounted.render()
  assert.equal(final.node, undefined)
  assert.equal(final.celebrate, true)
  assert.equal(final.route.completed, 1)
  assert.equal(final.route.next.id, 'pad-02-info')
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
      return { body: jsonServidor('apoderado-completar-pad-01-rol') }
    }
    return { body: jsonServidor('apoderado-actividades-pad-01') }
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
      ? { body: jsonServidor('apoderado-completar-pad-01-rol') }
      : new Promise((resolve) => {
          resolverGet = resolve
        }),
  )
  const { useParentActivitySession } = app.load('src/features/parent/hooks/useParentActivitySession.ts')
  const anterior = app.mount(useParentActivitySession, activity, false)
  const pendiente = anterior.render().advance()
  await esperar()
  anterior.unmount()
  resolverGet({ body: jsonServidor('apoderado-actividades-pad-01') })
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
  app.setActivityId('pad-02-info')
  const { ParentActivityView } = app.load('src/pages/parent/ParentActivityView.tsx')
  const mounted = app.mount(ParentActivityView)
  assert.equal(mounted.render(), null)
  await esperar()
  assert.equal(mounted.render().props.locked, true)
  app.setActivityId('pad-01-rol')
  assert.equal(mounted.render().props.activity.id, 'pad-01-rol')
})

test('la ruta y el diploma se completan con el servidor aunque no haya nodos locales recorridos', async () => {
  const app = fixture('apo-rosa', undefined, { portal: true })
  app.fetch((r) => ({
    body:
      r.url === '/api/cuentas'
        ? jsonServidor('cuentas')
        : r.url.endsWith('/actividades')
          ? jsonServidor('apoderado-actividades-final')
          : { eventos_registrados: [], nuevos_desbloqueos: [] },
  }))
  await app.store.ingresarApoderado()
  const { useParentActivities } = app.load('src/features/parent/hooks/useParentActivities.ts')
  const source = useParentActivities()
  const { parentRoute } = app.load('src/features/parent/lib/selectors.ts')
  const route = parentRoute(source.activities, [], source.completedIds, source.available)
  assert.equal(route.complete, true)
  assert.equal(route.percent, 100)
  assert.equal(source.journey.progress['pad-01-rol'].nodoActualId, undefined)
  const { useParentOverview } = app.load('src/features/parent/hooks/useParentOverview.ts')
  assert.equal(app.mount(useParentOverview).render().route.complete, true)
  const { ParentPortalModule } = app.load('src/pages/parent/ParentPortalModule.tsx')
  const context = ParentPortalModule().props.children.props.children.props.context
  assert.equal(context.accountId, 'apo-rosa')
  assert.equal(context.activities.length, 2)
  assert.deepEqual(copia(context.completedActivityIds), ['pad-01-rol', 'pad-02-info'])
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
  const bloques = jsonServidor('apoderado-actividades-final')
  // DATO DE PRUEBA: actividad deliberadamente ausente del registro de contenidos.
  bloques[0].actividades.push({
    ...bloques[0].actividades[0],
    codigo: 'pad-sin-json',
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
    assert.match(avisos[0], /pad-sin-json → sin_contenido_prueba/)
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
    if (r.method === 'POST') return { body: jsonServidor('apoderado-completar-pad-01-rol') }
    if (fallar) throw Error('Sin conexión')
    return { body: jsonServidor('apoderado-actividades-pad-01') }
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
  resolver({ body: jsonServidor('apoderado-completar-pad-01-rol') })
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
  assert.equal(app.local.size, 0)
})
