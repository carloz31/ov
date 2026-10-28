import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'
import {
  cargarAlmacen,
  copia,
  escenarioRuta,
  esConsultaDominio,
  fixtureServidor,
  jsonServidor,
  respuestaDominio,
} from '../../soporte/servidor-ayudas.mjs'

// F08: contrato de Familia (adaptador, almacén del estudiante y del apoderado) con los fixtures ruta-*.
const code = ts.transpileModule(readFileSync('src/lib/servidor/adaptadoresConversaciones.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 },
}).outputText
const conv = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
const sinRespuestas = { eventos_registrados: [], nuevos_desbloqueos: [] }

test('estudiante: sin carta, la sección muestra la carta pendiente; con carta, la lista con «Por abrir»', () => {
  assert.equal(
    conv.pantallaSeccion(jsonServidor('ruta/ruta-conversaciones-estudiante-sin-carta')),
    'carta_pendiente',
  )
  const datos = jsonServidor('ruta/ruta-conversaciones-estudiante-carta')
  assert.equal(conv.pantallaSeccion(datos), 'lista')
  const pestanas = conv.pestanasConversaciones(datos.conversaciones, 'estudiante')
  assert.deepEqual(copia(pestanas), [
    { pestana: 'te_toca', cantidad: 1 },
    { pestana: 'esperando', cantidad: 0 },
    { pestana: 'listas', cantidad: 0 },
    { pestana: 'por_abrir', cantidad: 1 },
  ])
  assert.equal(conv.pestanaInicial(pestanas), 'te_toca')
  const [primera, segunda] = datos.conversaciones
  assert.equal(conv.lineaEstado(primera, 'Tu familia'), 'Nadie ha respondido aún')
  assert.equal(conv.lineaEstado(segunda, 'Tu familia'), segunda.bloqueo_mensaje)
  assert.equal(conv.etiquetaTramo(primera), 'Bloque 2 · Camino')
  assert.equal(conv.cartaEditable(datos), true)
})

test('apoderado: sin «Por abrir»; lo que el hijo no abrió se puede adelantar y «te toca» nombra al hijo', () => {
  const datos = jsonServidor('ruta/ruta-conversaciones-te-toca')
  const pestanas = conv.pestanasConversaciones(datos.conversaciones, 'apoderado')
  assert.deepEqual(
    pestanas.map((p) => p.pestana),
    ['te_toca', 'esperando', 'listas'],
  )
  assert.equal(pestanas[0].cantidad, 2)
  const [teToca, adelantar] = datos.conversaciones
  assert.equal(conv.lineaEstado(teToca, datos.otro.nombre), 'Ana ya respondió')
  assert.deepEqual(copia(conv.respondieron(teToca, 'apoderado')), { estudiante: true, familia: false })
  assert.equal(conv.puedeAdelantar(teToca), false)
  assert.equal(conv.puedeAdelantar(adelantar), true)
})

test('conversada: guía, algo que ya saben y entrada de diario; el regalo con los puntos y la carta entregada', () => {
  const conversada = jsonServidor('ruta/ruta-conversaciones-conversada')
  const [primera] = conversada.conversaciones
  assert.equal(conv.pestanaDe(primera, 'estudiante'), 'listas')
  assert.equal(conv.vistaTrasResponder(primera), 'lista')
  assert.ok(primera.preguntas_guia.length && primera.algo_que_saben && primera.pregunta_otro)
  assert.equal(primera.entrada_diario.codigo, 't-diario-tras-conversar')
  assert.deepEqual(copia(conv.puntosRegalo(conversada)), [
    { numero: 1, lleno: true },
    { numero: 2, lleno: false },
  ])
  assert.equal(conversada.carta_recibida, null)
  const final = jsonServidor('ruta/ruta-conversaciones-final')
  assert.equal(final.cartas_disponibles, true)
  assert.equal(conv.cartaEditable(final), false)
  assert.equal(final.carta_recibida, 'DATO DE PRUEBA: carta de apo-rosa.')
  assert.deepEqual(copia(final.otro), { codigo: 'apo-rosa', nombre: 'Rosa', parentesco: 'madre' })
  const apoderado = jsonServidor('ruta/ruta-conversaciones-apoderado-final')
  assert.equal(apoderado.carta_recibida, 'DATO DE PRUEBA: carta de est-ana.')
})

function almacenFamilia(datos = jsonServidor('ruta/ruta-conversaciones-estudiante-carta')) {
  const app = fixtureServidor(),
    estado = escenarioRuta('t1')
  app.fetch((req) => {
    if (esConsultaDominio(req)) return respuestaDominio(req, estado)
    if (req.url.includes('/desbloqueos?')) return { body: [] }
    if (req.url.endsWith('/conversaciones')) return { body: datos }
    if (req.url.endsWith('/acciones/escribir-carta')) return { body: sinRespuestas }
    if (req.url.endsWith('/acciones/responder-conversacion'))
      return { body: { por_cuenta: { 'est-ana': sinRespuestas, 'apo-rosa': sinRespuestas } } }
    throw Error(`Solicitud no configurada: ${req.url}`)
  })
  const almacen = cargarAlmacen(app)
  almacen.publicar({ consultasHabilitadas: true })
  return { app, almacen, store: app.load('src/store/servidor/conversaciones.ts') }
}

test('estudiante: el almacén pide las conversaciones y las acciones usan las rutas del backend y las vencen', async () => {
  const { app, almacen, store } = almacenFamilia()
  await almacen.refrescar()
  assert.equal((await almacen.asegurarSeccion('conversaciones')).tipo, 'ok')
  assert.equal(almacen.obtenerEstadoServidor().conversaciones.datos.total, 2)
  app.requests.length = 0
  assert.equal((await store.guardarCarta('DATO DE PRUEBA: hola')).tipo, 'ok')
  assert.equal(almacen.obtenerEstadoServidor().conversaciones.estado, 'vencido')
  assert.equal((await store.responderConversacion('t-conv-1', 'DATO DE PRUEBA: mi mirada')).tipo, 'ok')
  const acciones = app.requests.filter((r) => r.url.includes('/acciones/'))
  assert.deepEqual(copia(acciones.map((r) => [r.url, r.body])), [
    ['/api/acciones/escribir-carta', { cuenta: 'est-ana', texto: 'DATO DE PRUEBA: hola' }],
    [
      '/api/acciones/responder-conversacion',
      { cuenta: 'est-ana', conversacion: 't-conv-1', texto: 'DATO DE PRUEBA: mi mirada' },
    ],
  ])
})

test('estudiante: abrir la entrada del diario al conversar vence también las preguntas del diario', async () => {
  const { almacen } = almacenFamilia()
  const { nuevos_desbloqueos } = jsonServidor('ruta/ruta-responder-conversacion-segundo').por_cuenta[
    'est-ana'
  ]
  assert.ok(almacen.seccionesPorDesbloqueos(nuevos_desbloqueos).includes('diarioPreguntas'))
})

async function almacenApoderado() {
  const app = fixtureServidor({ cuenta: 'apo-rosa' })
  app.ingresarComo('apo-rosa')
  const porHijo = {
    'est-ana': jsonServidor('ruta/ruta-conversaciones-te-toca'),
    'est-luis': jsonServidor('ruta/ruta-apoderado-conversaciones-sin-carta'),
  }
  app.fetch((req) => {
    if (req.url === '/api/sesion') return { body: jsonServidor('ruta/ruta-sesion-apoderado') }
    if (req.url === '/api/acciones/ingresar') return { body: sinRespuestas }
    if (req.url.endsWith('/actividades'))
      return { body: jsonServidor('ruta/ruta-apoderado-actividades-final') }
    if (req.url.endsWith('/familia')) return { body: jsonServidor('ruta/ruta-familia') }
    if (req.url.includes('/conversaciones?estudiante='))
      return { body: porHijo[new URL(req.url, 'http://x').searchParams.get('estudiante')] }
    if (req.url.endsWith('/acciones/escribir-carta')) return { body: sinRespuestas }
    if (req.url.endsWith('/acciones/responder-conversacion'))
      return { body: { por_cuenta: { 'est-ana': sinRespuestas, 'apo-rosa': sinRespuestas } } }
    throw Error(`Solicitud no configurada: ${req.url}`)
  })
  await app.load('src/store/accesoStore.ts').validarSesionGuardada()
  const apoderado = app.load('src/store/servidor/apoderado.ts')
  assert.equal((await apoderado.ingresarApoderado()).tipo, 'ok')
  return { app, store: app.load('src/store/servidor/apoderadoConversaciones.ts') }
}

test('apoderado: el hijo activo es el primero de la sesión y elegir otro pide su propio vínculo', async () => {
  const { app, store } = await almacenApoderado()
  assert.deepEqual(
    store.hijosApoderado().map((h) => h.codigo),
    ['est-ana', 'est-luis'],
  )
  assert.equal(store.hijoActivo(), 'est-ana')
  assert.equal((await store.asegurarConversacionesApoderado()).datos.otro.codigo, 'est-ana')
  store.elegirHijo('est-luis')
  assert.equal(store.hijoActivo(), 'est-luis')
  const luis = await store.asegurarConversacionesApoderado()
  assert.equal(conv.pantallaSeccion(luis.datos), 'carta_pendiente')
  // Las acciones siempre envían el estudiante del vínculo activo.
  app.requests.length = 0
  assert.equal((await store.guardarCartaApoderado('DATO DE PRUEBA: para Luis')).tipo, 'ok')
  store.elegirHijo('est-ana')
  assert.equal(
    (await store.responderConversacionApoderado('t-conv-2', 'DATO DE PRUEBA: adelanto')).tipo,
    'ok',
  )
  const acciones = app.requests.filter((r) => r.url.includes('/acciones/'))
  assert.deepEqual(copia(acciones.map((r) => r.body)), [
    { cuenta: 'apo-rosa', texto: 'DATO DE PRUEBA: para Luis', estudiante: 'est-luis' },
    {
      cuenta: 'apo-rosa',
      conversacion: 't-conv-2',
      texto: 'DATO DE PRUEBA: adelanto',
      estudiante: 'est-ana',
    },
  ])
  // Cada acción confirmada vuelve a pedir las conversaciones de ese hijo.
  assert.ok(app.requests.some((r) => r.url === '/api/cuentas/apo-rosa/conversaciones?estudiante=est-luis'))
  // Un código que no es su hijo no cambia el activo.
  store.elegirHijo('est-beto')
  assert.equal(store.hijoActivo(), 'est-ana')
})
