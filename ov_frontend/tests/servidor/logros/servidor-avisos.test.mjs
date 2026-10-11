import { esConsultaDominio, respuestaDominio } from '../../soporte/servidor-ayudas.mjs'
import { cargarAlmacen, escenarioServidor } from '../../soporte/servidor-ayudas.mjs'
import assert from 'node:assert/strict'
import test from 'node:test'
import { fixtureServidor, jsonServidor, esperar, elementos } from '../../soporte/servidor-ayudas.mjs'

async function iniciar() {
  const app = fixtureServidor(),
    estado = escenarioServidor('inicial')
  let pendientes = jsonServidor('desbloqueos-no-vistos')
  const servidor = (r) => {
    if (esConsultaDominio(r)) return respuestaDominio(r, estado)
    if (r.url.includes('/desbloqueos?')) return { body: pendientes }
    if (r.url.endsWith('/marcar-vistos')) {
      const n = pendientes.length
      pendientes = []
      return { body: { marcados: n } }
    }
    throw Error(r.url)
  }
  app.fetch(servidor)
  app.load('src/store/servidor/cuenta.ts').seleccionarCuenta([estado.cuenta])
  const store = cargarAlmacen(app),
    acciones = app.load('src/store/servidor/operaciones.ts')
  // DATO DE PRUEBA: ingreso confirmado antes de las pruebas de avisos.
  store.publicar({ consultasHabilitadas: true })
  await store.refrescar()
  return {
    app,
    store,
    acciones,
    servidor,
    agregar(d) {
      pendientes.push(d)
    },
  }
}
function mostrarTodo(f) {
  f.store.avisosPendientes().forEach((a) => f.store.mostrarAviso(a.id))
}

test('mapea solo los cuatro tipos del servidor y deduplica por regla, tipo y código', async () => {
  const f = await iniciar(),
    adaptadores = f.app.load('src/lib/servidor/adaptadores.ts')
  const noVistos = jsonServidor('desbloqueos-no-vistos')
  const avisos = adaptadores.avisosServidor([...noVistos, ...noVistos])
  assert.ok(avisos.some((a) => a.kind === 'ciudad'))
  assert.ok(avisos.some((a) => a.kind === 'nivel'))
  assert.ok(avisos.some((a) => a.kind === 'badge'))
  assert.ok(avisos.some((a) => a.kind === 'ficha'))
  assert.equal(
    avisos.some((a) => a.id.includes('ACTIVIDAD')),
    false,
  )
  assert.equal(new Set(avisos.map((a) => a.id)).size, avisos.length)
})

test('no marca mientras queda un aviso; releer no vistos no repite los ya mostrados', async () => {
  const f = await iniciar(),
    primero = f.store.avisosPendientes()[0]
  f.store.mostrarAviso(primero.id)
  await f.store.consultarNoVistos()
  assert.equal(
    f.store.avisosPendientes().some((a) => a.id === primero.id),
    false,
  )
  assert.equal((await f.acciones.marcarVistos()).datos, 'nuevos')
  assert.equal(
    f.app.requests.some((r) => r.method === 'POST'),
    false,
  )
})

test('la consulta previa incorpora un aviso nuevo y solo marca al terminarlo', async () => {
  const f = await iniciar()
  mostrarTodo(f)
  // DATO DE PRUEBA: otro desbloqueo ocurrido durante la presentación del lote.
  f.agregar({
    regla: 'R-NIV-4',
    tipo_objetivo: 'NIVEL',
    objetivo: { codigo: 'N4', nombre: 'Explorador de la ciudad' },
    fecha_hora: '2026-10-07T11:00:00',
    visto: false,
  })
  assert.equal((await f.acciones.marcarVistos()).datos, 'nuevos')
  assert.equal(f.app.requests.filter((r) => r.method === 'POST').length, 0)
  mostrarTodo(f)
  const [a, b] = await Promise.all([f.acciones.marcarVistos(), f.acciones.marcarVistos()])
  assert.equal(a.datos, 'terminado')
  assert.equal(b.datos, 'terminado')
  assert.equal(f.app.requests.filter((r) => r.method === 'POST').length, 1)
  assert.equal(f.store.avisosPendientes().length, 0)
})

test('fallo de consulta o POST conserva el lote mostrado y permite reintentar sin volver a presentarlo', async () => {
  const f = await iniciar()
  mostrarTodo(f)
  f.app.fetch(() => {
    throw Error('DATO DE PRUEBA: sin conexión')
  })
  assert.equal((await f.acciones.marcarVistos()).tipo, 'sin_conexion')
  assert.equal(f.store.avisosPendientes().length, 0)
  assert.ok(f.store.obtenerEstadoServidor().avisosMostrados.length)
  f.app.fetch((r) => (r.method === 'POST' ? { status: 500, body: 'DATO DE PRUEBA: error' } : f.servidor(r)))
  assert.equal((await f.acciones.marcarVistos()).tipo, 'http')
  f.app.fetch(f.servidor)
  assert.equal((await f.acciones.marcarVistos()).datos, 'terminado')
})

test('POST confirmado y GET fallido se recuperan con consultas sin repetir el marcado', async () => {
  const f = await iniciar()
  mostrarTodo(f)
  let confirmado = false,
    falla = true
  f.app.fetch((r) => {
    if (r.method === 'POST') {
      confirmado = true
      return f.servidor(r)
    }
    if (confirmado && falla) throw Error('DATO DE PRUEBA: fallo después de marcar')
    return f.servidor(r)
  })
  assert.equal((await f.acciones.marcarVistos()).tipo, 'sin_conexion')
  falla = false
  assert.equal((await f.acciones.marcarVistos()).datos, 'terminado')
  assert.equal(f.app.requests.filter((r) => r.method === 'POST').length, 1)
})

test('los nuevos desbloqueos confirmados sobreviven a un refresco fallido', async () => {
  const f = await iniciar(),
    recibo = jsonServidor('completar-mission-welcome')
  f.app.fetch((r) =>
    r.url.endsWith('/completar-actividad')
      ? { body: recibo }
      : { status: 500, body: 'DATO DE PRUEBA: consulta fallida' },
  )
  const respuesta = await f.acciones.completarActividad('mission-welcome')
  assert.equal(respuesta.tipo, 'guardado_sin_refrescar')
  assert.ok(f.store.obtenerEstadoServidor().desbloqueosAccion.length)
  assert.ok(f.store.avisosPendientes().some((a) => a.title === 'La primera chispa'))
})

test('recargar antes del marcado vuelve a presentar el lote; cambiar de cuenta descarta respuestas tardías', async () => {
  const f = await iniciar()
  f.store.mostrarAviso(f.store.avisosPendientes()[0].id)
  const nueva = await iniciar()
  assert.equal(nueva.store.obtenerEstadoServidor().avisosMostrados.length, 0)
  let resolver
  f.app.fetch(
    () =>
      new Promise((r) => {
        resolver = r
      }),
  )
  const consulta = f.store.consultarNoVistos()
  f.store.limpiarEstadoServidor()
  resolver({ body: jsonServidor('desbloqueos-no-vistos') })
  assert.equal((await consulta).tipo, 'http')
  assert.equal(f.store.avisosPendientes().length, 0)
})

test('el marcado tardío de la cuenta anterior no deja recibos ni borra el nuevo lote', async () => {
  const f = await iniciar()
  mostrarTodo(f)
  let resolver
  f.app.fetch((r) =>
    r.method === 'POST'
      ? new Promise((resolve) => {
          resolver = resolve
        })
      : f.servidor(r),
  )
  const marcado = f.acciones.marcarVistos()
  await esperar()
  f.store.limpiarEstadoServidor()
  // DATO DE PRUEBA: cambio de cuenta durante el POST en curso.
  f.app
    .load('src/store/servidor/cuenta.ts')
    .seleccionarCuenta([{ codigo: 'est-luis', nombre: 'Luis', rol: 'ESTUDIANTE' }])
  resolver({ body: { marcados: 12 } })
  assert.equal((await marcado).tipo, 'http')
  assert.equal(f.store.obtenerEstadoServidor().marcadoAvisos, null)
  assert.equal(f.store.obtenerEstadoServidor().errorAvisos, null)
  assert.equal(f.store.avisosPendientes().length, 0)
})

test('cola automática solo en mapas, pausada por actividad y guía; la campana solicita la misma cola', async () => {
  const f = await iniciar()
  const ui = f.app.load('src/store/studentUiStore.ts')
  ui.updateStudentUi((s) => ({
    ...s,
    introsSeen: { ...s.introsSeen, missions: true, central: true },
    cityArrivalSeen: true,
    checkInPromptDismissedOn: f.app.load('src/features/adventure/lib/checkIn.ts').localDateKey(new Date()),
  }))
  const props = { view: 'profile-general', activityOpen: false, children: null }
  const queue = f.app.mount(
    f.app.load('src/features/adventure/components/overlays/OverlayQueue.tsx').OverlayQueue,
    props,
  )
  let tree = queue.render()
  assert.equal(elementos(tree, (e) => e.type?.name === 'UnlockToast').length, 0)
  props.view = 'missions'
  assert.equal(elementos(queue.render(), (e) => e.type?.name === 'UnlockToast').length, 1)
  props.view = 'profile-general'
  tree = queue.render()
  assert.equal(elementos(tree, (e) => e.type?.name === 'UnlockToast').length, 0)
  tree.props.value.openServerNotices()
  tree = queue.render()
  assert.equal(elementos(tree, (e) => e.type?.name === 'UnlockToast').length, 1)
  props.activityOpen = true
  assert.equal(elementos(queue.render(), (e) => e.type?.name === 'UnlockToast').length, 0)
  props.activityOpen = false
  props.view = 'missions'
  tree = queue.render()
  const aviso = elementos(tree, (e) => e.type?.name === 'UnlockToast')[0].props.aviso.id
  // DATO DE PRUEBA: detalle/drawer montado en un portal mientras hay un aviso.
  f.app.overlayOpen(true)
  tree = queue.render()
  assert.equal(tree.props.value.announcementBlocked, true)
  assert.equal(elementos(tree, (e) => e.type?.name === 'UnlockToast').length, 0)
  assert.equal(f.store.obtenerEstadoServidor().avisosMostrados.length, 0)
  f.app.overlayOpen(false)
  tree = queue.render()
  assert.equal(elementos(tree, (e) => e.type?.name === 'UnlockToast')[0].props.aviso.id, aviso)
  tree = queue.render()
  tree.props.value.openGuide(['DATO DE PRUEBA: guía'])
  assert.equal(elementos(queue.render(), (e) => e.type?.name === 'UnlockToast').length, 0)
  queue.unmount()
  await esperar()
  assert.equal(f.app.requests.filter((r) => r.method === 'POST').length, 0)
})

test('un overlay pausa también el cierre del lote y solo se marca después de cerrarlo', async () => {
  const f = await iniciar()
  const ui = f.app.load('src/store/studentUiStore.ts')
  ui.updateStudentUi((s) => ({
    ...s,
    introsSeen: { ...s.introsSeen, missions: true },
    cityArrivalSeen: true,
    checkInPromptDismissedOn: f.app.load('src/features/adventure/lib/checkIn.ts').localDateKey(new Date()),
  }))
  const queue = f.app.mount(
    f.app.load('src/features/adventure/components/overlays/OverlayQueue.tsx').OverlayQueue,
    { view: 'missions', activityOpen: false, children: null },
  )
  queue.render()
  f.app.overlayOpen(true)
  mostrarTodo(f)
  assert.equal(elementos(queue.render(), (e) => e.type?.name === 'UnlockToast').length, 0)
  await esperar()
  assert.equal(f.app.requests.filter((r) => r.method === 'POST').length, 0)
  f.app.overlayOpen(false)
  queue.render()
  await esperar()
  assert.equal(f.app.requests.filter((r) => r.method === 'POST').length, 1)
  assert.equal(f.store.obtenerEstadoServidor().noVistos.length, 0)
  queue.unmount()
})

test('la campana puede solicitar el lote desde su menú, pero espera a que el menú se cierre', async () => {
  const f = await iniciar()
  const queue = f.app.mount(
    f.app.load('src/features/adventure/components/overlays/OverlayQueue.tsx').OverlayQueue,
    { view: 'profile-general', activityOpen: false, children: null },
  )
  queue.render()
  f.app.overlayOpen(true)
  const tree = queue.render()
  f.app.load('src/features/adventure/context/overlayContext.ts').StudentOverlayContext._currentValue =
    tree.props.value
  const { NoveltiesMenu } = f.app.load('src/features/adventure/components/overlays/NoveltiesMenu.tsx')
  const servidorMenu = NoveltiesMenu({})
  const menu = servidorMenu.type(servidorMenu.props)
  const solicitud = elementos(menu, (e) => typeof e.props.onSelect === 'function')[0]
  assert.ok(solicitud)
  assert.notEqual(solicitud.props.disabled, true)
  solicitud.props.onSelect()
  assert.equal(elementos(queue.render(), (e) => e.type?.name === 'UnlockToast').length, 0)
  f.app.overlayOpen(false)
  assert.equal(elementos(queue.render(), (e) => e.type?.name === 'UnlockToast').length, 1)
  assert.equal(f.app.requests.filter((r) => r.method === 'POST').length, 0)
  queue.unmount()
})
