import assert from 'node:assert/strict'
import test from 'node:test'
import {
  cargarAlmacen,
  copia,
  escenarioRuta,
  esConsultaDominio,
  esperar,
  fixtureServidor,
  jsonServidor,
  respuestaDominio,
  importarAislado,
} from '../../soporte/servidor-ayudas.mjs'

// F07a: contrato de los planes de carrera (adaptador, almacén y acciones) con los fixtures ruta-*.
const planes = await importarAislado('src/lib/servidor/adaptadoresPlanes.ts')
const completos = jsonServidor('ruta/ruta-planes')
const familia = jsonServidor('ruta/ruta-planes-misma-familia')
const sinRespuestas = { eventos_registrados: [], nuevos_desbloqueos: [] }
const nombres = {
  R: 'Realista',
  I: 'Investigador',
  A: 'Artístico',
  S: 'Social',
  E: 'Emprendedor',
  C: 'Convencional',
}

test('estados, botón y sección siguiente salen de las secciones del servidor', () => {
  const [corto, nuevo] = familia.planes
  assert.deepEqual(
    corto.secciones.map((s) => planes.ESTADOS_SECCION[s.estado]),
    ['En proceso', 'Bloqueada', 'Bloqueada', 'Bloqueada'],
  )
  assert.equal(planes.textoBotonPlan(nuevo), 'Empezar: Por qué la elijo')
  assert.equal(planes.textoBotonPlan(corto), 'Seguir con: Por qué la elijo')
  assert.equal(planes.seccionSiguiente(corto), 'POR_QUE')
  const listo = completos.planes[0]
  assert.equal(planes.textoBotonPlan(listo), 'Ver mi plan')
  assert.equal(planes.seccionSiguiente(listo), 'POR_QUE')
  assert.equal(planes.seccionesListas(listo), 4)
  // HU-099: la bloqueada dice qué actividad la abre, con el mensaje del servidor.
  const bloqueada = corto.secciones[1]
  assert.equal(planes.resumenSeccion(corto, bloqueada, familia.opciones), bloqueada.bloqueo[0].mensaje)
  assert.equal(planes.resumenSeccion(nuevo, nuevo.secciones[0], familia.opciones), 'Todavía nada')
})

test('resúmenes del menú: POR_QUE con idea, motivo principal y relato; CONOCIMIENTO con conteos', () => {
  const plan = completos.planes[0]
  const [porQue, conocimiento] = plan.secciones
  assert.match(
    planes.resumenSeccion(plan, porQue, completos.opciones),
    /^Mía · Ayudar a otros · «DATO DE PRUEBA/,
  )
  assert.match(
    planes.resumenSeccion(plan, conocimiento, completos.opciones),
    /^5 de 5 respondidas · \d+ dudas? abiertas? · \d+ resueltas?$/,
  )
})

test('CONOCIMIENTO: vista previa de dudas, «Sí · averiguado» y cuerpo de guardado', () => {
  const plan = completos.planes[0]
  const borrador = planes.borradorConocimiento(plan)
  assert.ok(borrador.dudas.every((d) => 'numero' in d))
  // Una pregunta con «No» y sin duda previa se creará; una duda abierta que pasa a «Sí» se resolverá.
  const abierta = plan.dudas.find((d) => d.origen === 'PREGUNTA' && d.estado === 'ABIERTA')
  const cambiado = { ...borrador, respuestas: { ...borrador.respuestas, [abierta.pregunta]: 'SI' } }
  const previa = planes.dudasDePregunta(plan, cambiado, completos.opciones)
  assert.ok(previa.some((d) => d.pregunta === abierta.pregunta && d.efecto === 'resolver'))
  const sinDudas = { ...plan, dudas: [] }
  const nuevas = planes.dudasDePregunta(
    sinDudas,
    { respuestas: { CURSOS: 'NO' }, dudas: [] },
    completos.opciones,
  )
  assert.deepEqual(copia(nuevas.map((d) => [d.efecto, d.texto])), [
    ['crear', `¿Qué cursos se llevan en ${plan.carrera.nombre}?`],
  ])
  const cerrada = plan.dudas.find((d) => d.estado === 'CERRADA' && d.hallazgo)
  if (cerrada) assert.equal(planes.respuestaLeida(plan, cerrada.pregunta), 'Sí · averiguado')
  const datos = planes.datosConocimiento({
    respuestas: { CURSOS: 'NO' },
    dudas: [
      { numero: 3, origen: 'SUGERIDA', texto: 'x' },
      { origen: 'SUGERIDA', opcion: 'SUELDO_INICIAL', texto: 'y' },
      { origen: 'PROPIA', texto: '  ¿Hay trabajo?  ', clave: 1 },
      { origen: 'PROPIA', texto: '  ', clave: 2 },
    ],
  })
  assert.deepEqual(copia(datos), {
    respuestas: { CURSOS: 'NO' },
    dudas: [
      { numero: 3 },
      { origen: 'SUGERIDA', opcion: 'SUELDO_INICIAL' },
      { origen: 'PROPIA', texto: '¿Hay trabajo?' },
    ],
  })
})

test('POR_QUE: borrador, cuerpo, repregunta y «Cómo encaja contigo»', () => {
  const plan = completos.planes[0]
  const borrador = planes.borradorPorQue(plan)
  assert.equal(borrador.idea, 'MIA')
  assert.deepEqual(
    copia(planes.datosPorQue({ ...borrador, motivos: [{ opcion: 'AYUDAR' }, { otro: ' ' }], relato: ' ' })),
    {
      idea_origen: 'MIA',
      motivos: [{ opcion: 'AYUDAR' }],
      relato: null,
    },
  )
  assert.equal(planes.pideMasRelato(familia.planes[0]), true)
  assert.equal(planes.pideMasRelato(plan), false)
  const resultado = { perfil_plano: false, codigo_interes: { codigo: 'SIA', hay_empate: false } }
  assert.deepEqual(copia(planes.encajeRiasec(['I', 'S'], resultado, nombres)), {
    carrera: 'Investigador',
    principal: 'Social',
    segundo: 'Investigador',
  })
  assert.equal(planes.encajeRiasec([], resultado, nombres), null)
  assert.equal(planes.encajeRiasec(['I'], { ...resultado, perfil_plano: true }, nombres), null)
  assert.equal(planes.encajeRiasec(['I'], null, nombres), null)
})

function almacenPlanes() {
  const app = fixtureServidor(),
    estado = escenarioRuta('t1')
  app.fetch((req) => {
    if (esConsultaDominio(req)) return respuestaDominio(req, estado)
    if (req.url.includes('/desbloqueos?')) return { body: [] }
    if (req.url.endsWith('/planes')) return { body: completos }
    if (req.url.includes('/acciones/planes/')) return { body: sinRespuestas }
    throw Error(`Solicitud no configurada: ${req.url}`)
  })
  const almacen = cargarAlmacen(app)
  almacen.publicar({ consultasHabilitadas: true })
  return { app, almacen, store: app.load('src/store/servidor/planes.ts') }
}

test('el almacén pide los planes y las acciones usan las rutas del backend y vencen la sección', async () => {
  const { app, almacen, store } = almacenPlanes()
  await almacen.refrescar()
  assert.equal((await almacen.asegurarSeccion('planes')).tipo, 'ok')
  assert.equal(almacen.obtenerEstadoServidor().planes.datos.maximo_planes, 3)
  app.requests.length = 0
  assert.equal((await store.crearPlan('mtpe-1')).tipo, 'ok')
  assert.equal(almacen.obtenerEstadoServidor().planes.estado, 'vencido')
  const porQue = { idea_origen: 'MIA', motivos: [{ opcion: 'AYUDAR' }], relato: 'r' }
  assert.equal((await store.guardarSeccionPlan('mtpe-1', { seccion: 'POR_QUE', datos: porQue })).tipo, 'ok')
  assert.equal((await store.ordenarPlanes(['mtpe-2', 'mtpe-1'])).tipo, 'ok')
  assert.equal((await store.eliminarPlan('mtpe-2')).tipo, 'ok')
  const acciones = app.requests.filter((r) => r.url.includes('/acciones/'))
  assert.deepEqual(copia(acciones.map((r) => [r.url, r.body])), [
    ['/api/acciones/planes/crear', { cuenta: 'est-ana', carrera: 'mtpe-1' }],
    [
      '/api/acciones/planes/guardar-seccion',
      { cuenta: 'est-ana', carrera: 'mtpe-1', seccion: 'POR_QUE', datos: porQue },
    ],
    ['/api/acciones/planes/ordenar', { cuenta: 'est-ana', carreras: ['mtpe-2', 'mtpe-1'] }],
    ['/api/acciones/planes/eliminar', { cuenta: 'est-ana', carrera: 'mtpe-2' }],
  ])
})

test('un desbloqueo SECCION_PLAN (completar t-valores) vence los planes y la vista montada los vuelve a pedir', async () => {
  const { app, almacen } = almacenPlanes()
  await almacen.refrescar()
  const desmontar = almacen.montarSeccion('planes')
  await esperar()
  assert.equal(almacen.obtenerEstadoServidor().planes.estado, 'listo')
  const pedidos = () => app.requests.filter((r) => r.url.endsWith('/planes')).length
  const antes = pedidos()
  const { nuevos_desbloqueos } = jsonServidor('ruta/ruta-continuar-sin-responder-t-valores')
  assert.ok(nuevos_desbloqueos.some((d) => d.tipo_objetivo === 'SECCION_PLAN'))
  assert.ok(almacen.seccionesPorDesbloqueos(nuevos_desbloqueos).includes('planes'))
  await almacen.refrescar(nuevos_desbloqueos)
  await esperar()
  assert.equal(pedidos(), antes + 1)
  assert.equal(almacen.obtenerEstadoServidor().planes.estado, 'listo')
  desmontar()
})

test('un 409 de crear (carrera no favorita) llega con el mensaje del servidor y no vence nada', async () => {
  const { app, almacen, store } = almacenPlanes()
  app.fetch((req) =>
    req.url.endsWith('/acciones/planes/crear')
      ? { status: 409, body: jsonServidor('ruta/ruta-crear-plan-no-favorita') }
      : req.url.endsWith('/planes')
        ? { body: completos }
        : esConsultaDominio(req)
          ? respuestaDominio(req, escenarioRuta('t1'))
          : { body: [] },
  )
  await almacen.asegurarSeccion('planes')
  const respuesta = await store.crearPlan('mtpe-1')
  assert.equal(respuesta.tipo, 'bloqueado')
  assert.equal(almacen.mensajeErrorServidor(respuesta), 'Primero guarda la carrera en tus favoritos')
  assert.equal(almacen.obtenerEstadoServidor().planes.estado, 'listo')
})

// F07b: los totales en vivo usan `ciclos_por_anio` y la duración de la carrera en la institución elegida.
test('el contrato trae los ciclos por año y la duración de la carrera en cada institución', () => {
  assert.equal(completos.opciones.ciclos_por_anio, 2)
  const conInstitucion = completos.planes.find((p) => p.institucion)
  assert.ok(conInstitucion && 'duracion_ciclos' in conInstitucion.institucion)
  const detalle = jsonServidor('ruta/ruta-catalogo-carrera-psychology')
  assert.ok(
    detalle.instituciones.every((i) => i.duracion_ciclos === null || Number.isInteger(i.duracion_ciclos)),
  )
})
