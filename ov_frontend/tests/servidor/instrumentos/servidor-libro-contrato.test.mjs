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

// F03: estado de las páginas del libro por avance, carga por aplicación, revelar y reiniciar.
const code = ts.transpileModule(readFileSync('src/lib/servidor/adaptadoresInstrumentos.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 },
}).outputText
const instrumentos = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
const avance = (momento) => jsonServidor(`ruta/ruta-avance-instrumentos-${momento}`)
const accionVacia = { eventos_registrados: [], nuevos_desbloqueos: [] }

test('el avance decide si la página está sellada, lista o revelada', () => {
  const { estadoAplicacion } = instrumentos
  const partida = jsonServidor('ruta/ruta-resultado-partida')
  assert.equal(estadoAplicacion(avance('inicial'), {}, 'APL-PARTIDA'), 'sealed')
  assert.equal(estadoAplicacion(avance('partida-lista'), {}, 'APL-PARTIDA'), 'ready')
  assert.equal(estadoAplicacion(avance('riasec-listo'), {}, 'APL-RIASEC'), 'ready')
  assert.equal(estadoAplicacion(avance('riasec-listo'), { 'APL-PARTIDA': partida }, 'APL-PARTIDA'), 'revealed')
  // Revelada en el servidor pero sin el resultado leído: todavía no se muestra como descifrada.
  assert.equal(estadoAplicacion(avance('riasec-listo'), {}, 'APL-PARTIDA'), 'sealed')
  assert.equal(estadoAplicacion(avance('reiniciado'), {}, 'APL-RIASEC'), 'sealed')
  assert.deepEqual(
    copia(instrumentos.aplicacionesReveladas(avance('final'))).map((a) => a.aplicacion).sort(),
    ['APL-LLEGADA', 'APL-PARTIDA', 'APL-RIASEC'],
  )
})

test('el reinicio cuenta como usado con un resultado anulado de perfil plano', () => {
  assert.equal(instrumentos.reinicioUsado(jsonServidor('ruta/ruta-historial-riasec-plano')), false)
  assert.equal(instrumentos.reinicioUsado(jsonServidor('ruta/ruta-historial-riasec')), true)
  assert.equal(instrumentos.reinicioUsado(null), false)
  assert.equal(instrumentos.zonaEnPalabras('EN_CAMINO'), 'En camino')
})

function servidorLibro(app, { momento = 'final', plano = false } = {}) {
  const estado = escenarioRuta('t2')
  const resultados = {
    'APL-PARTIDA': jsonServidor('ruta/ruta-resultado-partida'),
    'APL-LLEGADA': jsonServidor('ruta/ruta-resultado-llegada'),
    'APL-RIASEC': jsonServidor(plano ? 'ruta/ruta-resultado-riasec-plano' : 'ruta/ruta-resultado-riasec'),
  }
  let fase = momento
  app.fetch((req) => {
    if (esConsultaDominio(req)) return respuestaDominio(req, estado)
    if (req.url.includes('/notificaciones')) return { body: { total: 0, no_vistas: 0, items: [] } }
    if (req.url.endsWith('/instrumentos')) return { body: avance(fase) }
    const aplicacion = req.url.match(/resultado\?aplicacion=([A-Z-]+)/)?.[1]
    if (aplicacion) return { body: resultados[aplicacion] }
    if (req.url.endsWith('/comparacion')) return { body: jsonServidor('ruta/ruta-comparacion-partida-llegada') }
    if (req.url.endsWith('/historial'))
      return { body: jsonServidor(fase === 'reiniciado' ? 'ruta/ruta-historial-riasec' : 'ruta/ruta-historial-riasec-plano') }
    if (req.url.endsWith('/revelar-resultado')) {
      fase = 'final'
      return { body: { ...jsonServidor('ruta/ruta-revelar-llegada'), ...accionVacia } }
    }
    if (req.url.endsWith('/reiniciar-instrumento')) {
      fase = 'reiniciado'
      return { body: { ...jsonServidor('ruta/ruta-reiniciar-riasec'), cuenta: 'est-ana' } }
    }
    throw Error(`Solicitud no configurada: ${req.url}`)
  })
}

test('cargar el libro pide el avance, los resultados revelados por aplicación y la comparación', async () => {
  const app = fixtureServidor()
  servidorLibro(app)
  const almacen = cargarAlmacen(app)
  almacen.publicar({ consultasHabilitadas: true })
  const store = app.load('src/store/servidor/instrumentos.ts')
  assert.equal((await store.cargarInstrumentos()).tipo, 'ok')
  const estado = almacen.obtenerEstadoServidor()
  assert.equal(estado.instrumentos.estado, 'listo')
  assert.deepEqual(Object.keys(estado.instrumentos.resultados).sort(), ['APL-LLEGADA', 'APL-PARTIDA', 'APL-RIASEC'])
  assert.equal(estado.instrumentos.comparacion.instrumento, 'TEST-PARTIDA-LLEGADA')
  assert.equal(estado.instrumentos.historialRiasec, null)
  assert.equal(estado.resultadoRiasec.aplicacion, 'APL-RIASEC')
  const urls = app.requests.map((r) => r.url)
  assert.ok(urls.includes('/api/cuentas/est-ana/instrumentos/TEST-PARTIDA-LLEGADA/resultado?aplicacion=APL-LLEGADA'))
  assert.ok(urls.includes('/api/cuentas/est-ana/instrumentos/TEST-PARTIDA-LLEGADA/comparacion'))
  assert.ok(!urls.some((u) => u.endsWith('/historial')))
})

test('sin las dos aplicaciones de partida y llegada no se pide la comparación', async () => {
  const app = fixtureServidor()
  servidorLibro(app, { momento: 'riasec-listo' })
  const almacen = cargarAlmacen(app)
  almacen.publicar({ consultasHabilitadas: true })
  await app.load('src/store/servidor/instrumentos.ts').cargarInstrumentos()
  const estado = almacen.obtenerEstadoServidor()
  assert.deepEqual(Object.keys(estado.instrumentos.resultados), ['APL-PARTIDA'])
  assert.equal(estado.instrumentos.comparacion, null)
  assert.equal(estado.resultadoRiasec, null)
  assert.ok(!app.requests.some((r) => r.url.endsWith('/comparacion')))
})

test('revelar envía la aplicación, refresca el camino y vuelve a leer el libro', async () => {
  const app = fixtureServidor()
  servidorLibro(app, { momento: 'llegada-lista' })
  const almacen = cargarAlmacen(app)
  almacen.publicar({ consultasHabilitadas: true })
  const store = app.load('src/store/servidor/instrumentos.ts')
  await store.cargarInstrumentos()
  assert.equal(almacen.obtenerEstadoServidor().instrumentos.comparacion, null)
  const respuesta = await store.revelarResultado('TEST-PARTIDA-LLEGADA', 'APL-LLEGADA')
  assert.equal(respuesta.tipo, 'ok')
  const revelar = app.requests.find((r) => r.url === '/api/acciones/revelar-resultado')
  assert.deepEqual(copia(revelar.body), {
    cuenta: 'est-ana',
    instrumento: 'TEST-PARTIDA-LLEGADA',
    aplicacion: 'APL-LLEGADA',
  })
  const despues = app.requests.slice(app.requests.indexOf(revelar)).map((r) => r.url)
  assert.ok(despues.includes('/api/cuentas/est-ana/actividades'))
  assert.ok(despues.includes('/api/cuentas/est-ana/instrumentos/TEST-PARTIDA-LLEGADA/comparacion'))
  assert.ok(almacen.obtenerEstadoServidor().instrumentos.comparacion)
})

test('con perfil plano se lee el historial; reiniciar lo vuelve a leer y deja el reinicio usado', async () => {
  const app = fixtureServidor()
  servidorLibro(app, { plano: true })
  const almacen = cargarAlmacen(app)
  almacen.publicar({ consultasHabilitadas: true })
  const store = app.load('src/store/servidor/instrumentos.ts')
  await store.cargarInstrumentos()
  const antes = almacen.obtenerEstadoServidor().instrumentos
  assert.equal(antes.resultados['APL-RIASEC'].perfil_plano, true)
  assert.equal(instrumentos.reinicioUsado(antes.historialRiasec), false)
  assert.equal((await store.reiniciarInstrumento('TEST-RIASEC', 'APL-RIASEC')).tipo, 'ok')
  const reinicio = app.requests.find((r) => r.url === '/api/acciones/reiniciar-instrumento')
  assert.deepEqual(copia(reinicio.body), { cuenta: 'est-ana', instrumento: 'TEST-RIASEC', aplicacion: 'APL-RIASEC' })
  const despues = almacen.obtenerEstadoServidor()
  assert.equal(despues.instrumentos.resultados['APL-RIASEC'], undefined)
  assert.equal(despues.resultadoRiasec, null)
  assert.equal(despues.estadoResultado, 'pendiente')
})

test('un error del servidor queda en el estado del libro', async () => {
  const app = fixtureServidor()
  app.fetch((req) => {
    if (req.url.endsWith('/instrumentos')) return { status: 500, body: { detail: { mensaje: 'Falla' } } }
    throw Error(`Solicitud no configurada: ${req.url}`)
  })
  const almacen = cargarAlmacen(app)
  almacen.publicar({ consultasHabilitadas: true })
  assert.notEqual((await app.load('src/store/servidor/instrumentos.ts').cargarInstrumentos()).tipo, 'ok')
  assert.equal(almacen.obtenerEstadoServidor().instrumentos.estado, 'error')
})

test('el apoderado consulta los resultados del hijo con su propia cuenta', async () => {
  const app = fixtureServidor({ cuenta: 'apo-rosa' })
  app.fetch(() => ({ body: jsonServidor('ruta/ruta-familia-resultados') }))
  const api = app.load('src/services/api/familia.ts')
  const respuesta = await api.obtenerResultadosHijo('apo-rosa')
  assert.equal(respuesta.tipo, 'ok')
  assert.equal(app.requests.at(-1).url, '/api/cuentas/apo-rosa/familia/resultados')
})

test('una lectura superada por otra forzada responde con la más reciente, no con un cambio de cuenta', async () => {
  const app = fixtureServidor()
  servidorLibro(app)
  const almacen = cargarAlmacen(app)
  almacen.publicar({ consultasHabilitadas: true })
  const store = app.load('src/store/servidor/instrumentos.ts')
  // Como al revelar: el refresco del camino vuelve a pedir el libro mientras la acción lo fuerza.
  const [primera, segunda] = await Promise.all([store.cargarInstrumentos(), store.cargarInstrumentos(true)])
  assert.deepEqual(copia([primera.tipo, segunda.tipo]), ['ok', 'ok'])
  assert.equal(almacen.obtenerEstadoServidor().instrumentos.estado, 'listo')
})
