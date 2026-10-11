import assert from 'node:assert/strict'
import test from 'node:test'
import {
  fixtureServidor,
  servidorInicial,
  cargarAlmacen,
  escenarioServidor,
  esConsultaDominio,
  respuestaDominio,
  jsonServidor,
  copia,
  esperar,
} from '../../soporte/servidor-ayudas.mjs'

const rutas = (app) => app.requests.map((r) => r.url)
const cantidad = (app, seccion) => rutas(app).filter((r) => r.endsWith('/' + seccion)).length
const diferida = () => {
  let resolver
  const promesa = new Promise((r) => {
    resolver = r
  })
  return { promesa, resolver }
}
async function iniciar() {
  const app = fixtureServidor()
  servidorInicial(app)
  const acciones = app.load('src/store/servidor/operaciones.ts'),
    almacen = cargarAlmacen(app)
  assert.equal((await acciones.ingresar()).tipo, 'ok')
  return { app, acciones, almacen }
}
const desbloqueos = (...tipos) =>
  tipos.map((tipo_objetivo) => ({
    regla: 'DATO DE PRUEBA: ' + tipo_objetivo,
    tipo_objetivo,
    objetivo: { codigo: 'prueba', nombre: 'DATO DE PRUEBA' },
  }))
function servidorAccion(app, tipos = [], etapa = 'ciudad') {
  const escenario = escenarioServidor(etapa)
  app.fetch((r) => {
    if (r.url.endsWith('/completar-actividad'))
      return {
        body: {
          ...jsonServidor('completar-mission-welcome'),
          nuevos_desbloqueos: desbloqueos(...tipos),
        },
      }
    if (r.url.endsWith('/responder-items'))
      return {
        body: {
          cuenta: r.body.cuenta,
          actividad: r.body.actividad,
          respuestas_guardadas: r.body.respuestas,
          progreso: { estado: 'EN_CURSO', respondidos: 1, total: 4 },
        },
      }
    if (esConsultaDominio(r)) return respuestaDominio(r, escenario)
    if (r.url.includes('/desbloqueos?')) return { body: [] }
    throw Error('Consulta inesperada: ' + r.url)
  })
}

test('ingreso confirma el POST antes de cargar y pide las tres consultas en paralelo, sin fichas ni logros', async () => {
  const app = fixtureServidor(),
    almacen = cargarAlmacen(app)
  const post = diferida(),
    consultas = new Map(),
    escenario = escenarioServidor('inicial')
  app.fetch((r) => {
    if (r.url === '/api/cuentas') return { body: [escenario.cuenta] }
    if (r.method === 'POST') return post.promesa
    const pendiente = diferida()
    consultas.set(r.url, {
      pendiente,
      respuesta: esConsultaDominio(r) ? respuestaDominio(r, escenario) : { body: [] },
    })
    return pendiente.promesa
  })
  const view = app.mount(() => {
    almacen.useResumenServidor()
    almacen.useActividadesServidor()
    almacen.useFichasServidor(false)
    almacen.useLogrosServidor(false)
  }, {})
  view.render()
  assert.equal(app.requests.length, 0)
  const ingreso = app.load('src/store/servidor/operaciones.ts').ingresar()
  await esperar()
  view.render()
  assert.equal(app.requests.length, 2)
  assert.equal(almacen.obtenerEstadoServidor().consultasHabilitadas, false)
  post.resolver({ body: { eventos_registrados: [], nuevos_desbloqueos: [] } })
  await esperar()
  view.render()
  assert.deepEqual([...consultas.keys()].sort(), [
    '/api/cuentas/est-ana/actividades',
    '/api/cuentas/est-ana/desbloqueos?solo_no_vistos=true',
    '/api/cuentas/est-ana/resumen',
  ])
  for (const { pendiente, respuesta } of consultas.values()) pendiente.resolver(respuesta)
  assert.equal((await ingreso).tipo, 'ok')
  assert.equal(almacen.obtenerEstadoServidor().fichas.estado, 'sin_cargar')
  assert.equal(almacen.obtenerEstadoServidor().logros.estado, 'sin_cargar')
  view.unmount()
})

test('una sección reutiliza la misma promesa, incluso al publicar cargando, y conserva la caché', async () => {
  const { app, almacen } = await iniciar(),
    pendiente = diferida()
  app.fetch(() => pendiente.promesa)
  let reentrada
  const dejar = almacen.suscribirServidor(() => {
    if (almacen.obtenerEstadoServidor().fichas.estado === 'cargando')
      reentrada = almacen.asegurarSeccion('fichas')
  })
  const primera = almacen.asegurarSeccion('fichas'),
    segunda = almacen.asegurarSeccion('fichas')
  assert.equal(primera, segunda)
  assert.equal(reentrada, primera)
  await esperar()
  assert.equal(cantidad(app, 'fichas'), 1)
  pendiente.resolver({ body: jsonServidor('fichas-inicial') })
  assert.equal((await primera).tipo, 'ok')
  const datos = almacen.obtenerEstadoServidor().fichas.datos
  assert.equal((await almacen.asegurarSeccion('fichas')).datos, datos)
  assert.equal(cantidad(app, 'fichas'), 1)
  dejar()
})

test('los cuatro hooks comparten las secciones cargadas y solo abren fichas y logros cuando están activos', async () => {
  const { app, almacen } = await iniciar(),
    props = { abierto: false }
  const view = app.mount((p) => {
    almacen.useResumenServidor()
    almacen.useActividadesServidor()
    almacen.useFichasServidor(p.abierto)
    almacen.useLogrosServidor(p.abierto)
  }, props)
  view.render()
  await esperar()
  assert.equal(cantidad(app, 'resumen'), 1)
  assert.equal(cantidad(app, 'actividades'), 1)
  assert.equal(cantidad(app, 'fichas'), 0)
  assert.equal(cantidad(app, 'logros'), 0)
  props.abierto = true
  view.render()
  await esperar()
  view.render()
  await esperar()
  assert.equal(cantidad(app, 'fichas'), 1)
  assert.equal(cantidad(app, 'logros'), 1)
  props.abierto = false
  view.render()
  almacen.vencerSeccion('fichas')
  almacen.vencerSeccion('logros')
  await esperar()
  assert.equal(cantidad(app, 'fichas'), 1)
  assert.equal(cantidad(app, 'logros'), 1)
  props.abierto = true
  view.render()
  await esperar()
  assert.equal(cantidad(app, 'fichas'), 2)
  assert.equal(cantidad(app, 'logros'), 2)
  view.unmount()
})

for (const [tipo, vencidas] of [
  ['FICHA', ['fichas']],
  ['INSIGNIA', ['logros']],
  ['NIVEL', ['logros', 'resumen']],
]) {
  for (const montada of [false, true]) {
    test(`${tipo}: invalida únicamente sus dominios; vista ${montada ? 'montada recarga' : 'desmontada espera'}`, async () => {
      const { app, acciones, almacen } = await iniciar()
      await almacen.asegurarSeccion('fichas')
      await almacen.asegurarSeccion('logros')
      const desmontar = montada ? ['fichas', 'logros'].map((n) => almacen.montarSeccion(n)) : []
      const antes = app.requests.length
      servidorAccion(app, [tipo])
      assert.equal((await acciones.completarActividad('mission-welcome')).tipo, 'ok')
      await esperar()
      const pedidos = app.requests.slice(antes)
      assert.equal(pedidos.filter((r) => r.method === 'POST').length, 1)
      assert.equal(pedidos.filter((r) => r.url.endsWith('/actividades')).length, 1)
      assert.equal(pedidos.filter((r) => r.url.includes('/desbloqueos?')).length, 1)
      assert.equal(pedidos.filter((r) => r.url.endsWith('/resumen')).length, tipo === 'NIVEL' ? 1 : 0)
      for (const n of ['fichas', 'logros']) {
        assert.equal(
          pedidos.filter((r) => r.url.endsWith('/' + n)).length,
          montada && vencidas.includes(n) ? 1 : 0,
        )
        assert.equal(
          almacen.obtenerEstadoServidor()[n].estado,
          !montada && vencidas.includes(n) ? 'vencido' : 'listo',
        )
      }
      desmontar.forEach((fn) => fn())
      if (!montada) for (const n of vencidas) assert.equal((await almacen.asegurarSeccion(n)).tipo, 'ok')
    })
  }
}

test('responder actualiza actividades y avisos sin adelantar fichas, logros ni resumen', async () => {
  const { app, acciones } = await iniciar(),
    antes = app.requests.length
  servidorAccion(app)
  assert.equal((await acciones.responderItems('act-tip-01', [{ item: 'RIA-1', opcion: 4 }])).tipo, 'ok')
  assert.deepEqual(
    app.requests
      .slice(antes)
      .map((r) => [r.method, r.url])
      .sort(),
    [
      ['GET', '/api/cuentas/est-ana/actividades'],
      ['GET', '/api/cuentas/est-ana/desbloqueos?solo_no_vistos=true'],
      ['POST', '/api/acciones/responder-items'],
    ],
  )
})

test('invalidar durante una consulta descarta su respuesta y comparte la consulta vigente', async () => {
  const { app, almacen } = await iniciar(),
    antigua = diferida(),
    nueva = diferida()
  let numero = 0
  app.fetch(() => (++numero === 1 ? antigua.promesa : nueva.promesa))
  const primera = almacen.asegurarSeccion('fichas')
  await esperar()
  almacen.vencerSeccion('fichas')
  const segunda = almacen.asegurarSeccion('fichas')
  await esperar()
  antigua.resolver({ body: jsonServidor('fichas-inicial') })
  await esperar()
  assert.equal(almacen.obtenerEstadoServidor().fichas.datos, null)
  nueva.resolver({ body: jsonServidor('fichas-ciudad') })
  assert.equal((await primera).tipo, 'ok')
  assert.equal((await segunda).tipo, 'ok')
  assert.deepEqual(copia(almacen.obtenerEstadoServidor().fichas.datos), jsonServidor('fichas-ciudad'))
  assert.equal(numero, 2)
})

test('un error conserva los datos previos, no crea un bucle y solo se reintenta por solicitud', async () => {
  const { app, almacen } = await iniciar()
  await almacen.asegurarSeccion('fichas')
  const anteriores = almacen.obtenerEstadoServidor().fichas.datos
  app.fetch(() => {
    throw Error('DATO DE PRUEBA: sin red')
  })
  assert.equal((await almacen.reintentarSeccion('fichas')).tipo, 'sin_conexion')
  const antes = app.requests.length
  const view = app.mount(() => almacen.useFichasServidor(), {})
  for (let i = 0; i < 3; i++) {
    view.render()
    await esperar()
  }
  assert.equal(app.requests.length, antes)
  assert.equal(almacen.obtenerEstadoServidor().fichas.datos, anteriores)
  assert.equal(almacen.errorSeccionesActivas().tipo, 'sin_conexion')
  servidorInicial(app)
  assert.equal((await almacen.refrescar()).tipo, 'ok')
  assert.equal(almacen.obtenerEstadoServidor().fichas.estado, 'listo')
  assert.equal(almacen.errorSeccionesActivas(), null)
  view.unmount()
})

for (const mismaCuenta of [false, true])
  test(`una respuesta tardía se descarta tras ${mismaCuenta ? 'otro ingreso de la misma cuenta' : 'cambiar de cuenta'}`, async () => {
    const { app, acciones, almacen } = await iniciar(),
      antigua = diferida()
    app.fetch(() => antigua.promesa)
    const primera = almacen.asegurarSeccion('resumen') // Está en caché; se vence explícitamente.
    await primera
    const tardia = almacen.reintentarSeccion('resumen')
    await esperar()
    if (!mismaCuenta) app.load('src/store/servidor/cuenta.ts').guardarUsuarioIngreso('est-luis')
    acciones.prepararIngreso()
    servidorInicial(app)
    assert.equal((await acciones.ingresar()).tipo, 'ok')
    const actual = almacen.obtenerEstadoServidor().resumen.datos
    antigua.resolver({
      body: {
        cuenta: { codigo: 'antigua', nombre: 'DATO DE PRUEBA', rol: 'ESTUDIANTE' },
        nivel_actual: null,
      },
    })
    assert.equal((await tardia).tipo, 'http')
    assert.equal(almacen.obtenerEstadoServidor().resumen.datos, actual)
    assert.equal(actual.cuenta.codigo, mismaCuenta ? 'est-ana' : 'est-luis')
  })

test('reiniciar vacía las cuatro secciones y el nuevo ingreso no consulta fichas ni logros', async () => {
  const { app, acciones, almacen } = await iniciar()
  await almacen.asegurarSeccion('fichas')
  await almacen.asegurarSeccion('logros')
  app.fetch(() => ({ body: { mensaje: 'DATO DE PRUEBA: reinicio' } }))
  assert.equal((await acciones.reiniciarDatosDePrueba()).tipo, 'ok')
  for (const n of ['resumen', 'actividades', 'fichas', 'logros'])
    assert.deepEqual(copia(almacen.obtenerEstadoServidor()[n]), {
      datos: null,
      estado: 'sin_cargar',
      error: null,
    })
  const antes = app.requests.length
  servidorInicial(app)
  assert.equal((await acciones.ingresar()).tipo, 'ok')
  assert.equal(app.requests.slice(antes).filter((r) => r.method === 'POST').length, 1)
  assert.ok(app.requests.slice(antes).every((r) => !/\/(fichas|logros)$/.test(r.url)))
})

test('un recurso cerrado sigue montado sin mantener cargas activas de fichas', async () => {
  const { app, acciones, almacen } = await iniciar()
  const props = {
    activity: app.load('src/data/activities/content.ts').activityById('mission-welcome'),
    onClose() {},
  }
  const view = app.mount(
    app.load('src/features/activities/hooks/useActivityPlayer.ts').useActivityPlayer,
    props,
  )
  let player = view.render()
  await esperar()
  assert.equal(cantidad(app, 'fichas'), 0)
  player.openResources(['first-steps'])
  view.render()
  await esperar()
  assert.equal(cantidad(app, 'fichas'), 1)
  player = view.render()
  player.setResourceOpen(false)
  view.render()
  servidorAccion(app, ['FICHA'])
  await acciones.completarActividad('mission-welcome')
  await esperar()
  assert.equal(cantidad(app, 'fichas'), 1)
  assert.equal(almacen.obtenerEstadoServidor().fichas.estado, 'vencido')
  view.render().openResources(['first-steps'])
  view.render()
  await esperar()
  assert.equal(cantidad(app, 'fichas'), 2)
  view.unmount()
})

test('los hooks de secciones y sus reintentos no consultan ni alteran el modo local', async () => {
  const app = fixtureServidor({ api: false }),
    almacen = cargarAlmacen(app)
  const view = app.mount(() => {
    almacen.useResumenServidor()
    almacen.useActividadesServidor()
    almacen.useFichasServidor()
    almacen.useLogrosServidor()
  }, {})
  view.render()
  await esperar()
  assert.equal((await almacen.asegurarSeccion('fichas')).tipo, 'http')
  assert.equal((await almacen.refrescar()).tipo, 'http')
  assert.equal(app.requests.length, 0)
  assert.equal(app.local.size, 0)
  assert.equal(almacen.obtenerEstadoServidor().consultasHabilitadas, false)
  view.unmount()
})
