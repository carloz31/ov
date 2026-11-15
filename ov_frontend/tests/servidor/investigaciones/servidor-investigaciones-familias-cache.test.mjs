// Auditoría plataforma (F5): el buscador de familias del guion no vuelve a pedir el catálogo en cada montaje.
import assert from 'node:assert/strict'
import test from 'node:test'
import { cargarAlmacen, fixtureServidor } from '../../soporte/servidor-ayudas.mjs'

test('las familias del guion se piden una vez por sesión y un error se reintenta', async () => {
  const app = fixtureServidor()
  let fallar = true
  app.fetch((r) => {
    if (r.url.endsWith('/catalogo/familias'))
      return fallar ? { status: 503, body: 'DATO DE PRUEBA: sin conexión' } : { body: [{ codigo: '524', nombre: 'DATO DE PRUEBA' }] }
    throw Error(r.url)
  })
  cargarAlmacen(app).publicar({ consultasHabilitadas: true })
  const store = app.load('src/store/servidor/investigaciones.ts')
  assert.notEqual((await store.consultarFamiliasInvestigar()).tipo, 'ok')
  fallar = false
  const [a, b] = await Promise.all([store.consultarFamiliasInvestigar(), store.consultarFamiliasInvestigar()])
  await store.consultarFamiliasInvestigar()
  assert.equal(a.tipo, 'ok')
  assert.equal(b, a)
  assert.equal(app.requests.filter((r) => r.url.endsWith('/catalogo/familias')).length, 2)
})
