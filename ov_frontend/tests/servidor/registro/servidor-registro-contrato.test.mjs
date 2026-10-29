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

// F01: contrato de registros con los fixtures ruta-* de t-valores (elección ordenada y seguimiento).
const itemsValores = jsonServidor('ruta/ruta-items-registro-t-valores')
const entrega = jsonServidor('ruta/ruta-entregar-t-valores-seguimiento')
const cierre = jsonServidor('ruta/ruta-continuar-sin-responder-t-valores')

async function preparar({ fallarRefresco = false } = {}) {
  const app = fixtureServidor(),
    estado = escenarioRuta('t1')
  let refrescos = 0
  app.fetch((req) => {
    if (esConsultaDominio(req)) {
      if (req.url.endsWith('/actividades') && refrescos++ && fallarRefresco) return { status: 500, body: {} }
      return respuestaDominio(req, estado)
    }
    if (req.url.includes('/notificaciones')) return { body: { total: 0, no_vistas: 0, items: [] } }
    if (req.url.endsWith('/items-registro')) return { body: itemsValores }
    if (req.url.endsWith('/registro')) return { body: jsonServidor('ruta/ruta-registro-t-valores-pendiente') }
    if (req.url.endsWith('/guardar-borrador')) return { body: { item: req.body.item, estado: 'BORRADOR' } }
    if (req.url.endsWith('/entregar')) return { body: entrega }
    if (req.url.endsWith('/responder-seguimiento'))
      return { body: jsonServidor('ruta/ruta-responder-seguimiento-t-valores') }
    if (req.url.endsWith('/continuar-sin-responder')) return { body: cierre }
    throw Error(`Solicitud no configurada: ${req.url}`)
  })
  const almacen = cargarAlmacen(app)
  almacen.publicar({ consultasHabilitadas: true })
  await almacen.refrescar()
  return { app, registro: app.load('src/store/servidor/registro.ts') }
}

test('las consultas de registro usan las rutas del backend y la cuenta activa', async () => {
  const { app, registro } = await preparar()
  const items = await registro.consultarItemsRegistro('t-valores')
  const consultado = await registro.consultarRegistro('t-valores')
  assert.deepEqual(copia(items), { tipo: 'ok', datos: itemsValores })
  assert.equal(consultado.datos.respuestas[0].estado, 'PENDIENTE_SEGUIMIENTO')
  assert.deepEqual(copia(app.requests.slice(-2).map((r) => r.url)), [
    '/api/actividades/t-valores/items-registro',
    '/api/cuentas/est-ana/actividades/t-valores/registro',
  ])
})

test('el borrador envía texto, opciones en el orden elegido y la posición', async () => {
  const { app, registro } = await preparar()
  const opciones = [{ codigo: 'CREAR' }, { codigo: 'LIBERTAD' }, { codigo: 'ESTABILIDAD' }]
  const respuesta = await registro.guardarBorradorRegistro(
    't-valores',
    't-val-orden',
    'Texto',
    opciones,
    't-val-libre',
  )
  assert.deepEqual(copia(respuesta), { tipo: 'ok', datos: { item: 't-val-orden', estado: 'BORRADOR' } })
  const req = app.requests.at(-1)
  assert.equal(req.url, '/api/acciones/registro/guardar-borrador')
  assert.deepEqual(copia(req.body), {
    cuenta: 'est-ana',
    actividad: 't-valores',
    item: 't-val-orden',
    texto: 'Texto',
    opciones,
    posicion: 't-val-libre',
  })
})

test('entregar, responder y continuar sin responder refrescan el camino tras la acción', async () => {
  const { app, registro } = await preparar()
  const entregada = await registro.entregarRegistro('t-valores')
  assert.equal(entregada.tipo, 'ok')
  assert.equal(app.requests.find((r) => r.url.endsWith('/entregar')).body.actividad, 't-valores')
  const respondida = await registro.responderSeguimiento('t-valores', 't-val-orden', 'Porque sí')
  assert.equal(respondida.tipo, 'ok')
  assert.deepEqual(copia(app.requests.find((r) => r.url.endsWith('/responder-seguimiento')).body), {
    cuenta: 'est-ana',
    actividad: 't-valores',
    item: 't-val-orden',
    texto: 'Porque sí',
  })
  const cerrada = await registro.continuarSinResponder('t-valores', 't-val-orden')
  assert.deepEqual(copia(cerrada.datos.items_por_ampliar), cierre.items_por_ampliar)
  const ultima = app.requests.findLastIndex((r) => r.url.endsWith('/continuar-sin-responder'))
  assert.ok(app.requests.slice(ultima + 1).some((r) => r.url.endsWith('/actividades')))
})

test('si la acción se guardó pero el refresco falla, el reintento no repite la acción', async () => {
  const { app, registro } = await preparar({ fallarRefresco: true })
  const fallida = await registro.continuarSinResponder('t-valores', 't-val-orden')
  assert.equal(fallida.tipo, 'guardado_sin_refrescar')
  const acciones = app.requests.filter((r) => r.url.endsWith('/continuar-sin-responder')).length
  await registro.continuarSinResponder('t-valores', 't-val-orden', fallida.datos)
  assert.equal(app.requests.filter((r) => r.url.endsWith('/continuar-sin-responder')).length, acciones)
})

test('registroServidor une cada consigna con su ítem y rechaza contenidos incompletos', () => {
  const { registroServidor } = fixtureServidor().load('src/lib/servidor/contenidos.ts')
  // DATO DE PRUEBA: contenido mínimo con una consigna por ítem de t-valores.
  const consigna = (item) => ({
    id: item,
    tipo: 'consigna',
    item,
    premisa: '',
    entregable: { tipo: 'texto' },
    obligatoria: false,
    visibilidad: 'estudiante_orientadora',
  })
  const contenido = {
    id: 't-valores',
    tipo: 'registro',
    nodos: [
      { id: 'hola', tipo: 'dialogo', hablanteId: 'companero', texto: 'Hola' },
      ...itemsValores.map((i) => consigna(i.codigo)),
    ],
  }
  const actividad = registroServidor(contenido, itemsValores)
  const nodo = actividad.nodos.find((n) => n.item === 't-val-orden')
  assert.equal(nodo.premisa, itemsValores[0].consigna)
  assert.equal(nodo.obligatoria, itemsValores[0].obligatorio)
  assert.equal(actividad.nodos[0].tipo, 'dialogo')
  assert.equal(
    registroServidor({ ...contenido, nodos: contenido.nodos.slice(0, 2) }, itemsValores),
    undefined,
  )
  assert.equal(
    registroServidor({ ...contenido, nodos: [...contenido.nodos, consigna('t-otro')] }, itemsValores),
    undefined,
  )
})
