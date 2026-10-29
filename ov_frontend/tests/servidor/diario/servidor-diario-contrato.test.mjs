import assert from 'node:assert/strict'
import test from 'node:test'
import {
  cargarAlmacen,
  copia,
  escenarioRuta,
  esConsultaDominio,
  fixtureServidor,
  jsonServidor,
  respuestaDominio,
  importarAislado,
} from '../../soporte/servidor-ayudas.mjs'

// F05: contrato del diario y del check-in (adaptadores y almacén).
const diario = await importarAislado('src/lib/servidor/adaptadoresDiario.ts')
const preguntas = jsonServidor('ruta/ruta-diario-preguntas')
const entradas = jsonServidor('ruta/ruta-diario-entradas')
const amistad = jsonServidor('ruta/ruta-diario-amistad')
const checkIns = jsonServidor('ruta/ruta-check-ins')
const sinRespuestas = { eventos_registrados: [], nuevos_desbloqueos: [] }

test('las entradas llevan el título mostrado, su origen, «editada» y ninguna etiqueta temática', () => {
  const vista = diario.entradasDiario(entradas)
  assert.deepEqual(
    vista.map((e) => [e.numero, e.title, e.origen, e.editada, e.topicTags.length]),
    entradas.map((e) => [e.numero, e.titulo_mostrado, e.origen, e.actualizada_en !== null, 0]),
  )
  assert.deepEqual([...new Set(vista.map((e) => diario.etiquetasOrigen[e.origen]))].sort(), [
    'Carta de Lumi',
    'Libre',
    'Pregunta del día',
  ])
  assert.ok(vista.some((e) => e.editada) && vista.some((e) => !e.editada))
})

test('amistad: nombre del nivel del servidor, un recuerdo por nivel y cuánto falta', () => {
  assert.deepEqual(copia(diario.amistadDiario(amistad)), {
    puntos: 3,
    nivel: 'Conociéndonos',
    indiceNivel: 0,
    recuerdosAbiertos: 1,
    siguienteEn: 5,
  })
  const ultimo = diario.amistadDiario({ puntos: 50, nivel: 5, siguiente_en: null })
  assert.equal(ultimo.nivel, 'Lumi te conoce de verdad')
  assert.equal(ultimo.siguienteEn, undefined)
  assert.equal(diario.amistadDiario({ puntos: 0, nivel: 0, siguiente_en: 1 }).nivel, 'Conociéndonos')
})

test('check-ins: serie 1–5 y la señal de hoy solo con registrado_hoy', () => {
  assert.deepEqual(
    diario.senalesServidor(checkIns).map((s) => s.value),
    checkIns.check_ins.map((c) => c.nivel_seguridad),
  )
  assert.equal(diario.senalDeHoy(checkIns).value, 3)
  assert.equal(diario.senalDeHoy({ ...checkIns, registrado_hoy: false }), undefined)
  assert.equal(diario.ESCALA_CHECK_IN, 5)
})

test('el almacén lee el diario y sus acciones usan las rutas del backend', async () => {
  const app = fixtureServidor(),
    estado = escenarioRuta('t1')
  app.fetch((req) => {
    if (esConsultaDominio(req)) return respuestaDominio(req, estado)
    if (req.url.includes('/desbloqueos?')) return { body: [] }
    if (req.url.endsWith('/diario/preguntas')) return { body: preguntas }
    if (req.url.endsWith('/diario/entradas')) return { body: entradas }
    if (req.url.endsWith('/diario/amistad')) return { body: amistad }
    if (req.url.endsWith('/check-ins')) return { body: checkIns }
    if (req.url.endsWith('/abrir-pregunta'))
      return { body: jsonServidor('ruta/ruta-abrir-pregunta-personal') }
    if (req.url.endsWith('/pregunta-del-dia')) return { body: jsonServidor('ruta/ruta-pregunta-del-dia') }
    if (/\/(escribir|editar|borrar)-entrada$|\/check-in$/.test(req.url)) return { body: sinRespuestas }
    if (req.url.endsWith('/archivar-pregunta')) return { body: jsonServidor('ruta/ruta-archivar-pregunta') }
    if (req.url.endsWith('/desarchivar-pregunta'))
      return { body: jsonServidor('ruta/ruta-desarchivar-pregunta') }
    throw Error(`Solicitud no configurada: ${req.url}`)
  })
  const almacen = cargarAlmacen(app)
  almacen.publicar({ consultasHabilitadas: true })
  await almacen.refrescar()
  for (const nombre of ['diarioPreguntas', 'diarioEntradas', 'amistad', 'checkIns'])
    assert.equal((await almacen.asegurarSeccion(nombre)).tipo, 'ok')
  assert.deepEqual(copia(almacen.obtenerEstadoServidor().checkIns.datos), checkIns)
  const store = app.load('src/store/servidor/diario.ts')
  app.requests.length = 0
  assert.equal((await store.escribirEntrada({ texto: 'Hoy', titulo: 'Mi día' })).tipo, 'ok')
  assert.equal((await store.escribirEntrada({ texto: 'Del día', delDia: true })).tipo, 'ok')
  assert.equal((await store.escribirEntrada({ texto: 'Fija', pregunta: 't-diario-fija' })).tipo, 'ok')
  assert.equal((await store.editarEntrada(4, 'Corregida', null)).tipo, 'ok')
  assert.equal((await store.borrarEntrada(4)).tipo, 'ok')
  assert.equal((await store.abrirPregunta('t-diario-personal')).tipo, 'ok')
  assert.equal((await store.pedirPreguntaDelDia()).tipo, 'ok')
  assert.equal((await store.registrarCheckIn(4)).tipo, 'ok')
  assert.equal((await store.archivarPregunta('t-diario-personal')).tipo, 'ok')
  assert.equal((await store.desarchivarPregunta('t-diario-personal')).tipo, 'ok')
  const acciones = app.requests.filter((r) => r.url.includes('/acciones/'))
  assert.deepEqual(copia(acciones.map((r) => [r.url, r.body])), [
    ['/api/acciones/escribir-entrada', { cuenta: 'est-ana', texto: 'Hoy', titulo: 'Mi día' }],
    ['/api/acciones/escribir-entrada', { cuenta: 'est-ana', texto: 'Del día', del_dia: true }],
    ['/api/acciones/escribir-entrada', { cuenta: 'est-ana', texto: 'Fija', pregunta: 't-diario-fija' }],
    ['/api/acciones/editar-entrada', { cuenta: 'est-ana', numero: 4, texto: 'Corregida', titulo: null }],
    ['/api/acciones/borrar-entrada', { cuenta: 'est-ana', numero: 4 }],
    ['/api/acciones/diario/abrir-pregunta', { cuenta: 'est-ana', codigo: 't-diario-personal' }],
    ['/api/acciones/diario/pregunta-del-dia', { cuenta: 'est-ana' }],
    ['/api/acciones/check-in', { cuenta: 'est-ana', nivel_seguridad: 4 }],
    ['/api/acciones/diario/archivar-pregunta', { cuenta: 'est-ana', codigo: 't-diario-personal' }],
    ['/api/acciones/diario/desarchivar-pregunta', { cuenta: 'est-ana', codigo: 't-diario-personal' }],
  ])
  assert.equal(almacen.obtenerEstadoServidor().checkIns.estado, 'listo')
})
