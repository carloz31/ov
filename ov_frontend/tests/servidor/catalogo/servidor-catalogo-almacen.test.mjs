import assert from 'node:assert/strict'
import test from 'node:test'
import { cargarAlmacen, copia, esperar, fixtureServidor, jsonServidor } from '../../soporte/servidor-ayudas.mjs'

// F06: el almacén del catálogo con los fixtures ruta-*: listas paginadas por clase y filtros, detalle en caché,
// opciones de filtro, vistas y favoritos aplicados a lo cargado.
const carreras = jsonServidor('ruta/ruta-catalogo-carreras')
const psicologia = jsonServidor('ruta/ruta-catalogo-carrera-psychology')
const accion = { eventos_registrados: [], nuevos_desbloqueos: [] }

function catalogo({ pagina = () => carreras } = {}) {
  const app = fixtureServidor({ ruta: '/student/catalog/careers' })
  app.fetch((r) => {
    if (/\/catalogo\/carreras\?/.test(r.url)) return { body: pagina(new URL(r.url, 'http://x').searchParams) }
    if (r.url.endsWith('/catalogo/carreras/psychology')) return { body: psicologia }
    if (r.url.endsWith('/catalogo/familias')) return { body: jsonServidor('ruta/ruta-catalogo-familias') }
    if (r.url.endsWith('/catalogo/ubicaciones')) return { body: jsonServidor('ruta/ruta-catalogo-ubicaciones') }
    if (r.url.includes('/inesperada?')) return { body: jsonServidor('ruta/ruta-catalogo-inesperada') }
    if (r.url.endsWith('-favorito') || r.url.includes('/acciones/ver-')) return { body: accion }
    return { body: [] }
  })
  const almacen = cargarAlmacen(app)
  almacen.publicar({ consultasHabilitadas: true })
  const store = app.load('src/store/servidor/catalogo.ts')
  return { app, almacen, store, favoritos: app.load('src/store/servidor/favoritos.ts') }
}
const listas = (app) => app.requests.filter((r) => /\/catalogo\/carreras\?/.test(r.url)).map((r) => r.url)

test('la lista se pide al mostrarse, con filtros y página, y «Mostrar más» acumula', async () => {
  const { app, store } = catalogo({
    pagina: (p) => (p.get('desde') === '0' ? carreras : { total: 6, items: ['zz', 'zy'].map((codigo) => ({ ...carreras.items[0], codigo })) }),
  })
  const oculta = app.mount(() => store.useListaCatalogo('carreras', { buscar: ' psi ' }, false), {})
  assert.equal(oculta.render(), undefined)
  assert.equal(listas(app).length, 0)
  const hook = app.mount(() => store.useListaCatalogo('carreras', { buscar: ' psi ', familia: '' }, true), {})
  hook.render()
  await esperar()
  let lista = hook.render()
  assert.deepEqual([lista.estado, lista.total, lista.items.length], ['listo', 6, 4])
  assert.deepEqual(listas(app), ['/api/cuentas/est-ana/catalogo/carreras?buscar=psi&limite=20&desde=0'])
  await store.cargarLista('carreras', { buscar: 'psi' }, true)
  lista = hook.render()
  assert.deepEqual(copia(lista.items.map((c) => c.codigo)), [...carreras.items.map((c) => c.codigo), 'zz', 'zy'])
  assert.match(listas(app)[1], /desde=4$/)
  // Con todo cargado, «Mostrar más» no pide nada.
  await store.cargarLista('carreras', { buscar: 'psi' }, true)
  assert.equal(listas(app).length, 2)
})

test('cada búsqueda tiene su entrada: una respuesta vieja no pisa la nueva', async () => {
  let soltar
  const { app, store } = catalogo({ pagina: () => carreras })
  const lenta = new Promise((resolve) => (soltar = resolve))
  app.fetch((r) => (r.url.includes('buscar=psi&') ? lenta.then(() => ({ body: { total: 0, items: [] } })) : { body: carreras }))
  void store.cargarLista('carreras', { buscar: 'psi' })
  await store.cargarLista('carreras', { buscar: 'psico' })
  soltar()
  await esperar()
  const hook = app.mount(() => store.useListaCatalogo('carreras', { buscar: 'psico' }, true), {})
  assert.equal(hook.render().total, 6)
})

test('el detalle se pide una vez por código y las opciones de filtro una vez por sesión', async () => {
  const { app, store } = catalogo()
  const detalle = app.mount(() => store.useDetalleCatalogo('carreras', 'psychology'), {})
  detalle.render()
  await esperar()
  assert.equal(detalle.render().datos.ingreso.promedio_mensual, 3200)
  app.mount(() => store.useDetalleCatalogo('carreras', 'psychology'), {}).render()
  const opciones = app.mount(() => store.useOpcionesCatalogo(true), {})
  opciones.render()
  await esperar()
  app.mount(() => store.useOpcionesCatalogo(true), {}).render()
  await esperar()
  assert.equal(opciones.render().ubicaciones.length, 3)
  const pedidas = app.requests.map((r) => r.url)
  assert.equal(pedidas.filter((u) => u.endsWith('/carreras/psychology')).length, 1)
  assert.equal(pedidas.filter((u) => u.endsWith('/familias')).length, 1)
})

test('un favorito confirmado se aplica a listas, detalles y resultado, y descarta la lista de favoritos', async () => {
  const { app, almacen, store, favoritos } = catalogo()
  await store.cargarLista('carreras', {})
  await store.cargarLista('carreras', { favoritos: true })
  store.cargarDetalle('carreras', 'psychology')
  await esperar()
  almacen.publicar({ resultadoRiasec: jsonServidor('ruta/ruta-resultado-riasec') })
  const objetivo = carreras.items[0].codigo
  const respuesta = await favoritos.alternarFavorito('CARRERA', objetivo, !carreras.items[0].es_favorita)
  assert.equal(respuesta.tipo, 'ok')
  const lista = app.mount(() => store.useListaCatalogo('carreras', {}, false), {}).render()
  assert.equal(lista.items[0].es_favorita, !carreras.items[0].es_favorita)
  assert.equal(app.mount(() => store.useListaCatalogo('carreras', { favoritos: true }, false), {}).render(), undefined)
  const recomendada = almacen
    .obtenerEstadoServidor()
    .resultadoRiasec.carreras_recomendadas.find((c) => c.codigo === objetivo)
  if (recomendada) assert.equal(recomendada.es_favorita, !carreras.items[0].es_favorita)
  // La ocupación favorita se marca en el detalle que la lista y en las vías del resultado.
  await favoritos.alternarFavorito('OCUPACION', 'psychologist', true)
  const detalle = app.mount(() => store.useDetalleCatalogo('carreras', 'psychology'), {}).render()
  assert.equal(detalle.datos.ocupaciones.find((o) => o.codigo === 'psychologist').es_favorita, true)
  assert.deepEqual(
    copia(app.requests.filter((r) => r.url.endsWith('-favorito')).map((r) => r.body.tipo)),
    ['CARRERA', 'OCUPACION'],
  )
})

test('ver un detalle registra la vista y refresca; el lugar inesperado es una lectura', async () => {
  const { app, store } = catalogo()
  app.fetch((r) => {
    if (r.url.includes('/acciones/ver-carrera')) return { body: jsonServidor('ruta/ruta-ver-carrera') }
    if (r.url.includes('/inesperada?')) return { body: jsonServidor('ruta/ruta-catalogo-inesperada') }
    if (r.url.includes('/desbloqueos?')) return { body: [] }
    return { body: [] }
  })
  await store.verEnCatalogo('carreras', 'civil-engineering')
  const vista = app.requests.find((r) => r.url.endsWith('/acciones/ver-carrera'))
  assert.deepEqual(copia(vista.body), { cuenta: 'est-ana', carrera: 'civil-engineering' })
  const inesperada = await store.pedirInesperada('carreras', 'psychology')
  assert.deepEqual(copia(inesperada.datos), { codigo: 'veterinary-medicine', revisitando: false })
  assert.ok(app.requests.some((r) => r.url.endsWith('/catalogo/carreras/inesperada?excluir=psychology')))
})
