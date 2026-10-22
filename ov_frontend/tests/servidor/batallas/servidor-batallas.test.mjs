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
} from '../../soporte/servidor-ayudas.mjs'

// F04: cada intento de batalla se envía y refresca el camino, como completar.
const batallas = jsonServidor('ruta/ruta-batallas')
const derrota = jsonServidor('ruta/ruta-resolver-batalla-derrota')
const victoria = jsonServidor('ruta/ruta-resolver-batalla-victoria')

async function preparar() {
  const app = fixtureServidor(),
    estado = escenarioRuta('t1')
  let respuesta = derrota
  app.fetch((req) => {
    if (esConsultaDominio(req)) return respuestaDominio(req, estado)
    if (req.url.includes('/desbloqueos?')) return { body: [] }
    if (req.url.endsWith('/batallas')) return { body: batallas }
    if (req.url.endsWith('/resolver-batalla')) return { body: respuesta }
    throw Error(`Solicitud no configurada: ${req.url}`)
  })
  const almacen = cargarAlmacen(app)
  almacen.publicar({ consultasHabilitadas: true })
  await almacen.refrescar()
  return {
    app,
    store: app.load('src/store/servidor/batallas.ts'),
    ganar() {
      respuesta = victoria
    },
  }
}

test('la consulta de batallas trae intentos y si se superó', async () => {
  const { app, store } = await preparar()
  const consulta = await store.consultarBatallas()
  assert.deepEqual(copia(consulta), { tipo: 'ok', datos: batallas })
  assert.equal(app.requests.at(-1).url, '/api/cuentas/est-ana/batallas')
  assert.equal(consulta.datos[0].superada, true)
  assert.equal(consulta.datos[0].primer_intento.victoria, false)
})

test('perder y ganar envían cada intento y refrescan el camino', async () => {
  const { app, store, ganar } = await preparar()
  const perdida = await store.resolverBatalla('t-batalla', { victoria: false, aciertos: 1, preguntas: 4 })
  assert.equal(perdida.tipo, 'ok')
  assert.deepEqual(copia(perdida.datos.eventos_registrados), [])
  ganar()
  const antes = app.requests.length
  const ganada = await store.resolverBatalla('t-batalla', { victoria: true, aciertos: 4, preguntas: 4 })
  assert.equal(ganada.tipo, 'ok')
  const envio = app.requests.slice(antes).find((r) => r.url.endsWith('/resolver-batalla'))
  assert.deepEqual(copia(envio.body), {
    cuenta: 'est-ana',
    actividad: 't-batalla',
    victoria: true,
    aciertos: 4,
    preguntas: 4,
  })
  assert.ok(ganada.datos.eventos_registrados.some((e) => e.tipo === 'SUPERA_BATALLA'))
  assert.ok(app.requests.slice(antes).some((r) => r.url.endsWith('/actividades')))
})
