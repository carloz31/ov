// Auditoría plataforma (F11): la caché de detalles de fichas y la de favoritos conservan solo la sesión actual; la
// respuesta tardía de una sesión anterior no se guarda en la nueva.
import assert from 'node:assert/strict'
import test from 'node:test'
import { cargarAlmacen, fixtureServidor } from '../../soporte/servidor-ayudas.mjs'

test('el detalle de una ficha de la sesión anterior no se conserva ni se cuela en la nueva', async () => {
  const app = fixtureServidor()
  const pendientes = []
  app.fetch((r) => {
    if (r.url.endsWith('/fichas/t-ficha'))
      return new Promise((resolver) => pendientes.push((titulo) => resolver({ body: { codigo: 't-ficha', titulo } })))
    throw Error(r.url)
  })
  const almacen = cargarAlmacen(app)
  almacen.publicar({ consultasHabilitadas: true })
  const fichas = app.load('src/store/servidor/fichas.ts')
  const leer = () => app.mount(() => fichas.useFichaDetalle('t-ficha'), {}).render()
  fichas.cargarFicha('t-ficha')
  almacen.limpiarEstadoServidor()
  fichas.cargarFicha('t-ficha')
  assert.equal(pendientes.length, 2)
  pendientes[0]('DATO DE PRUEBA: sesión anterior')
  await new Promise((r) => setTimeout(r, 0))
  assert.equal(leer()?.estado, 'cargando')
  pendientes[1]('DATO DE PRUEBA: sesión actual')
  await new Promise((r) => setTimeout(r, 0))
  assert.equal(leer()?.datos?.titulo, 'DATO DE PRUEBA: sesión actual')
})
