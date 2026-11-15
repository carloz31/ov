import assert from 'node:assert/strict'
import test from 'node:test'
import { escenarioRuta, esConsultaDominio, fixtureServidor, respuestaDominio } from '../../soporte/servidor-ayudas.mjs'

// Ajuste desbloqueos (precisión 4): escribir la carta, superar un caso y terminar el guion ahora abren una misión del
// camino (b1-4, b1-7, b3-2). Con ese desbloqueo en la respuesta, el camino se vuelve a pedir; sin desbloqueos, la
// carta y el guion no lo piden (criterio F2b).
const desbloqueo = (codigo) => ({
  regla: `R-${codigo}`, tipo_objetivo: 'ACTIVIDAD', objetivo: { codigo, nombre: codigo }, condiciones: [],
  evaluador_especial: null,
})
const respuesta = (desbloqueos) => ({ eventos_registrados: [], nuevos_desbloqueos: desbloqueos, nuevas_notificaciones: [] })

async function iniciar(acciones) {
  const app = fixtureServidor()
  const escenario = escenarioRuta('inicial')
  app.fetch((r) => {
    if (r.url === '/api/acciones/ingresar') return { body: respuesta([]) }
    if (r.url in acciones) return { body: acciones[r.url] }
    if (esConsultaDominio(r)) return respuestaDominio(r, escenario)
    if (r.url.includes('/notificaciones')) return { body: { total: 0, no_vistas: 0, items: [] } }
    return { body: {} }
  })
  assert.equal((await app.load('src/store/servidor/operaciones.ts').ingresar()).tipo, 'ok')
  app.requests.length = 0
  return app
}
const pideCamino = (app) => app.requests.some((r) => r.method !== 'POST' && r.url.endsWith('/est-ana/actividades'))

test('la carta que abre b1-4 vuelve a pedir el camino; sin desbloqueos, no', async () => {
  for (const [desbloqueos, esperado] of [[[desbloqueo('b1-4')], true], [[], false]]) {
    const app = await iniciar({ '/api/acciones/escribir-carta': respuesta(desbloqueos) })
    const { guardarCarta } = app.load('src/store/servidor/conversaciones.ts')
    assert.notEqual((await guardarCarta('DATO DE PRUEBA: carta')).tipo, 'http')
    assert.equal(pideCamino(app), esperado)
  }
})

test('el guion listo que abre b3-2 vuelve a pedir el camino; sin desbloqueos, no', async () => {
  for (const [desbloqueos, esperado] of [[[desbloqueo('b3-2')], true], [[], false]]) {
    const app = await iniciar({ '/api/acciones/guardar-guion': respuesta(desbloqueos) })
    const { guardarGuion } = app.load('src/store/servidor/investigaciones.ts')
    await guardarGuion([{ origen: 'PROPIA', texto: 'DATO DE PRUEBA' }], [], true)
    assert.equal(pideCamino(app), esperado)
  }
})

test('el caso superado que abre b1-7 vuelve a pedir el camino', async () => {
  const app = await iniciar({ '/api/acciones/resolver-caso': { ...respuesta([desbloqueo('b1-7')]), ocupaciones_nuevas: [] } })
  const { resolverCaso } = app.load('src/store/servidor/casos.ts')
  await resolverCaso('c1', 8, [])
  assert.ok(pideCamino(app))
})
