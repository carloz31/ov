import assert from 'node:assert/strict'
import test from 'node:test'
import {
  cargarAlmacen,
  copia,
  escenarioRuta,
  esperar,
  esConsultaDominio,
  fixtureServidor,
  jsonServidor,
  respuestaDominio,
} from '../../soporte/servidor-ayudas.mjs'

// F04: cada intento de batalla se envía y refresca el camino, como completar. F04b: las preguntas de cada
// intento vienen del servidor y el intento se envía con sus respuestas.
const batallas = jsonServidor('ruta/ruta-batallas')
const preguntas = jsonServidor('ruta/ruta-preguntas-batalla')
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
    if (req.url.endsWith('/batallas/t-batalla/preguntas')) return { body: preguntas }
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

test('la consulta de batallas trae intentos, preguntas por intento y fichas', async () => {
  const { app, store } = await preparar()
  const consulta = await store.consultarBatallas()
  assert.deepEqual(copia(consulta), { tipo: 'ok', datos: batallas })
  assert.equal(app.requests.at(-1).url, '/api/cuentas/est-ana/batallas')
  const [batalla] = consulta.datos
  assert.equal(batalla.superada, true)
  assert.equal(batalla.primer_intento.victoria, false)
  assert.equal(batalla.preguntas_por_intento, 7)
  assert.deepEqual([batalla.vidas_enemigo, batalla.destellos], [5, 3])
  assert.deepEqual(copia(batalla.fichas.map((f) => f.codigo)), ['t-ficha', 't-ficha-2'])
})

test('cada intento pide preguntas nuevas, sin caché', async () => {
  const { app, store } = await preparar()
  const antes = app.requests.length
  const primera = await store.consultarPreguntasBatalla('t-batalla')
  await store.consultarPreguntasBatalla('t-batalla')
  assert.deepEqual(copia(primera), { tipo: 'ok', datos: preguntas })
  assert.deepEqual(copia(app.requests.slice(antes).map((r) => r.url)), [
    '/api/cuentas/est-ana/batallas/t-batalla/preguntas',
    '/api/cuentas/est-ana/batallas/t-batalla/preguntas',
  ])
  assert.equal(preguntas.length, 7)
  assert.ok(preguntas.every((p) => p.opciones.some((o) => o.indice === p.correcta) && p.ficha.codigo))
})

test('perder y ganar envían cada intento con sus respuestas; el servidor decide el resultado', async () => {
  const { app, store, ganar } = await preparar()
  const fallidas = preguntas.slice(0, 3).map((p) => ({
    pregunta: p.codigo,
    opcion: p.opciones.find((o) => o.indice !== p.correcta).indice,
  }))
  const perdida = await store.resolverBatalla('t-batalla', fallidas)
  assert.equal(perdida.tipo, 'ok')
  assert.deepEqual(copia(perdida.datos.eventos_registrados), [])
  assert.deepEqual([perdida.datos.victoria, perdida.datos.destellos_restantes], [false, 0])
  ganar()
  const antes = app.requests.length
  const acertadas = preguntas.slice(0, 5).map((p) => ({ pregunta: p.codigo, opcion: p.correcta }))
  const ganada = await store.resolverBatalla('t-batalla', acertadas)
  assert.equal(ganada.tipo, 'ok')
  const envio = app.requests.slice(antes).find((r) => r.url.endsWith('/resolver-batalla'))
  // F04c: el cuerpo lleva solo las respuestas; la victoria la decide el servidor.
  assert.deepEqual(copia(envio.body), { cuenta: 'est-ana', actividad: 't-batalla', respuestas: acertadas })
  assert.deepEqual([ganada.datos.victoria, ganada.datos.practica], [true, false])
  assert.ok(ganada.datos.eventos_registrados.some((e) => e.tipo === 'SUPERA_BATALLA'))
  assert.ok(app.requests.slice(antes).some((r) => r.url.endsWith('/actividades')))
})

test('las preguntas del servidor se convierten en la batalla, con sus vidas y destellos', () => {
  const app = fixtureServidor()
  const { batallaDesdePreguntas, respuestaBatalla } = app.load('src/features/activities/lib/batallaServidor.ts')
  const [config] = batallas
  const configuracion = { vidasEnemigo: config.vidas_enemigo, destellos: config.destellos }
  const batalla = batallaDesdePreguntas(configuracion, preguntas)
  assert.equal(batalla.questions.length, 7)
  assert.deepEqual([batalla.enemyLife, batalla.sparks, batalla.answered], [5, 3, 0])
  const [primera] = batalla.questions
  assert.equal(primera.id, preguntas[0].codigo)
  assert.equal(primera.correcta, String(preguntas[0].correcta))
  assert.deepEqual(copia(primera.ficha), preguntas[0].ficha)
  assert.deepEqual(copia(respuestaBatalla(primera.id, primera.correcta)), {
    pregunta: preguntas[0].codigo,
    opcion: preguntas[0].correcta,
  })
  // Sin preguntas suficientes para que un intento termine, no hay batalla.
  assert.equal(batallaDesdePreguntas(configuracion, preguntas.slice(0, 6)), undefined)
})

test('la primera victoria no convierte en práctica su propio intento; el siguiente sí (F04d)', async () => {
  const app = fixtureServidor()
  const [batalla] = batallas
  app.fetch((req) => {
    if (esConsultaDominio(req)) return respuestaDominio(req, escenarioRuta('t1'))
    if (req.url.includes('/desbloqueos?')) return { body: [] }
    if (req.url.endsWith('/batallas')) return { body: [{ ...batalla, superada: false, intentos: 0 }] }
    if (req.url.endsWith('/batallas/t-batalla/preguntas')) return { body: preguntas }
    if (req.url.endsWith('/resolver-batalla')) return { body: victoria }
    throw Error(`Solicitud no configurada: ${req.url}`)
  })
  const almacen = cargarAlmacen(app)
  almacen.publicar({ consultasHabilitadas: true })
  await almacen.refrescar()
  const { challenges } = app.load('src/data/content/challenges.ts')
  const { useChallengePlayer } = app.load('src/features/activities/hooks/useChallengePlayer.ts')
  const challenge = challenges.find((c) => c.id === 'desafio-rumor')
  const vista = app.mount(useChallengePlayer, { challenge, servidor: { actividad: 't-batalla' } })
  vista.render()
  await esperar()
  await vista.render().start()
  let m = vista.render()
  for (let n = 0; !m.battle.finished; n++) {
    await m.answer(m.question.correcta)
    m = vista.render()
    if (!m.battle.finished) m.setBattle({ ...m.battle, index: m.battle.index + 1, selected: undefined })
    m = vista.render()
    assert.ok(n < 7)
  }
  await esperar()
  m = vista.render()
  assert.deepEqual([m.resultado.victoria, m.resultado.practica], [true, false])
  // El encabezado de este intento sigue sin «Práctica».
  assert.equal(m.practice.current, false)
  await m.start()
  assert.equal(vista.render().practice.current, true)
  vista.unmount()
})
