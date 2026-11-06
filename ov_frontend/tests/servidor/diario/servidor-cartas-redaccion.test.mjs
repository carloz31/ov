import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
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

// Ajuste del diario (F05): una carta personalizada se redacta solo con «Abrir» (abrir-pregunta), sin abrir el editor.
const preguntas = jsonServidor('ruta/ruta-diario-preguntas')
const redactada = preguntas.map((p) =>
  p.codigo === 't-diario-personal' ? { ...p, redactada: true, texto: 'Carta de prueba ya escrita' } : p,
)

async function preparar(abrir) {
  const app = fixtureServidor()
  let lecturas = 0
  app.fetch((req) => {
    if (esConsultaDominio(req)) return respuestaDominio(req, escenarioRuta('t1'))
    if (req.url.includes('/notificaciones')) return { body: { total: 0, no_vistas: 0, items: [] } }
    if (req.url.endsWith('/check-ins')) return { body: jsonServidor('ruta/ruta-check-ins') }
    if (req.url.endsWith('/diario/preguntas')) return { body: lecturas++ ? redactada : preguntas }
    if (req.url.endsWith('/abrir-pregunta')) return abrir
    throw Error(`Solicitud no configurada: ${req.url}`)
  })
  const almacen = cargarAlmacen(app)
  almacen.publicar({ consultasHabilitadas: true })
  await almacen.refrescar()
  await almacen.asegurarSeccion('diarioPreguntas')
  return { app, almacen }
}

test('«Abrir» pide la redacción y la carta queda lista al volver a leer las cartas, sin navegar', async () => {
  const { app, almacen } = await preparar({ body: jsonServidor('ruta/ruta-abrir-pregunta-personal') })
  const store = app.load('src/store/servidor/diario.ts')
  assert.equal((await store.abrirPregunta('t-diario-personal')).tipo, 'ok')
  assert.equal(app.navigations.length, 0)
  assert.deepEqual(copia(app.requests.filter((r) => r.url.endsWith('/abrir-pregunta')).map((r) => r.body)), [
    { cuenta: 'est-ana', codigo: 't-diario-personal' },
  ])
  // abrir-pregunta vence las cartas: «Actualizar» (o la vista montada) relee y la carta deja de estar sellada.
  await almacen.reintentarSeccion('diarioPreguntas')
  const { cartasDiario } = app.load('src/lib/servidor/adaptadoresDiario.ts')
  const personal = cartasDiario(almacen.obtenerEstadoServidor().diarioPreguntas.datos).find(
    (c) => c.codigo === 't-diario-personal',
  )
  assert.equal(personal.estado, 'lista')
  assert.equal(personal.texto, 'Carta de prueba ya escrita')
})

test('si abrir-pregunta falla, la carta sigue sellada y el buzón avisa que Lumi no pudo escribir', async () => {
  const { app, almacen } = await preparar({ status: 503, body: { detail: { mensaje: 'Sin LLM' } } })
  const store = app.load('src/store/servidor/diario.ts')
  assert.notEqual((await store.abrirPregunta('t-diario-personal')).tipo, 'ok')
  const { cartasDiario } = app.load('src/lib/servidor/adaptadoresDiario.ts')
  const personal = cartasDiario(almacen.obtenerEstadoServidor().diarioPreguntas.datos).find(
    (c) => c.codigo === 't-diario-personal',
  )
  assert.equal(personal.estado, 'sellada')
  const hook = readFileSync('src/features/journal/hooks/useBuzonLumi.ts', 'utf8')
  assert.match(
    hook,
    /setEnRedaccion\(\(actual\) => actual\.filter\(\(codigo\) => codigo !== carta\.codigo\)\)/,
  )
  assert.match(hook, /Lumi no pudo escribir ahora, inténtalo en un momento/)
})

test('una carta sin redactar no se responde ni se archiva, y el cierre nunca redacta', () => {
  const fila = readFileSync('src/features/journal/components/FilaCarta.tsx', 'utf8')
  // Sellada: solo «Abrir»; en redacción: sin acciones; «Responder» y «Archivar» solo en la lista.
  assert.match(fila, /estado === 'redaccion' \?/)
  const pagina = readFileSync('src/features/journal/hooks/useJournalPage.ts', 'utf8')
  assert.match(pagina, /if \(carta\.estado !== 'lista' \|\| !carta\.texto\) return/)
  const cierre = readFileSync('src/features/activities/hooks/useActivityFinish.ts', 'utf8')
  assert.doesNotMatch(cierre, /abrirPregunta|abrir-pregunta/)
})
