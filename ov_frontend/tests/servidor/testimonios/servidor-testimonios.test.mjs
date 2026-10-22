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

// F04: testimonios bloqueados con pista y disponibles con enlace.
const code = ts.transpileModule(readFileSync('src/lib/servidor/adaptadoresCasos.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 },
}).outputText
const casos = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
const inicial = jsonServidor('ruta/ruta-testimonios-inicial')
const final = jsonServidor('ruta/ruta-testimonios-final')

test('bloqueado: solo la pista, si la tiene; disponible: descripción y enlace', () => {
  const conPista = inicial.find((t) => t.codigo === 't-testimonio-1'),
    sinPista = inicial.find((t) => t.codigo === 't-testimonio-2')
  assert.equal(conPista.estado, 'BLOQUEADA')
  assert.equal(conPista.enlace, null)
  assert.equal(casos.pistaTestimonio(conPista), conPista.pista)
  assert.ok(conPista.pista)
  assert.equal(casos.pistaTestimonio(sinPista), null)
  assert.ok(final.every((t) => t.estado === 'DISPONIBLE' && t.enlace && casos.pistaTestimonio(t) === null))
})

test('consultar y ver un testimonio usan las rutas del backend', async () => {
  const app = fixtureServidor(),
    estado = escenarioRuta('ciudad')
  app.fetch((req) => {
    if (esConsultaDominio(req)) return respuestaDominio(req, estado)
    if (req.url.includes('/desbloqueos?')) return { body: [] }
    if (req.url.endsWith('/testimonios')) return { body: final }
    if (req.url.endsWith('/ver-testimonio')) return { body: { eventos_registrados: [], nuevos_desbloqueos: [] } }
    throw Error(`Solicitud no configurada: ${req.url}`)
  })
  const almacen = cargarAlmacen(app)
  almacen.publicar({ consultasHabilitadas: true })
  await almacen.refrescar()
  const store = app.load('src/store/servidor/testimonios.ts')
  assert.deepEqual(copia(await store.consultarTestimonios()), { tipo: 'ok', datos: final })
  assert.equal((await store.verTestimonio('t-testimonio-2')).tipo, 'ok')
  assert.deepEqual(copia(app.requests.slice(-2).map((r) => [r.url, r.body ?? null])), [
    ['/api/cuentas/est-ana/testimonios', null],
    ['/api/acciones/ver-testimonio', { cuenta: 'est-ana', testimonio: 't-testimonio-2' }],
  ])
})
