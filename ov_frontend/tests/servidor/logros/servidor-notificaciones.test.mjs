// Ajuste notificaciones: adaptador, almacén de la campana, cola de toasts con visto individual y cierres sin toast.
import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import {
  cargarAlmacen,
  copia,
  elementos,
  esConsultaDominio,
  escenarioRuta,
  esperar,
  fixtureServidor,
  jsonServidor,
  respuestaDominio,
} from '../../soporte/servidor-ayudas.mjs'

const logros = jsonServidor('ruta/ruta-notificaciones')
const autora = jsonServidor('ruta/ruta-notificaciones-autora')
const rosa = jsonServidor('ruta/ruta-notificaciones-apoderado')
const sinNotificaciones = { total: 0, no_vistas: 0, items: [] }

async function iniciar({ pagina = sinNotificaciones, fallarMarcado = () => false } = {}) {
  const app = fixtureServidor(),
    estado = escenarioRuta('inicial')
  const servidor = (r) => {
    if (esConsultaDominio(r)) return respuestaDominio(r, estado)
    if (r.url.endsWith('/notificaciones/marcar-vistas'))
      return fallarMarcado(r)
        ? { status: 503, body: 'DATO DE PRUEBA: sin conexión' }
        : { body: { marcadas: r.body.codigos.length } }
    if (r.url.includes('/notificaciones?')) return { body: pagina }
    throw Error(r.url)
  }
  app.fetch(servidor)
  app.ingresarComo(estado.cuenta.codigo)
  const store = cargarAlmacen(app)
  store.publicar({ consultasHabilitadas: true })
  await store.refrescar()
  return { app, store }
}
const accion = (nuevas) => async () => ({
  tipo: 'ok',
  datos: { eventos_registrados: [], nuevos_desbloqueos: [], nuevas_notificaciones: nuevas },
})
const marcados = (app) =>
  app.requests
    .filter((r) => r.url.endsWith('/notificaciones/marcar-vistas'))
    .map((r) => copia(r.body.codigos))

test('el adaptador anuncia solo los logros y las asíncronas, con destino y acento por tipo', () => {
  const app = fixtureServidor()
  const { notificacionLegible, ordenCampana } = app.load('src/lib/servidor/adaptadoresNotificaciones.ts')
  const avisos = logros.items.map((n) => notificacionLegible(n))
  assert.deepEqual(avisos.map((a) => a.kind).sort(), ['badge', 'ciudad', 'ficha', 'ficha', 'nivel'])
  assert.ok(avisos.every((a) => !a.asincrona))
  const ficha = avisos.find((a) => a.kind === 'ficha')
  assert.match(ficha.href, /^\/student\/resources\?ficha=t-ficha/)
  assert.equal(avisos.find((a) => a.kind === 'ciudad').title, 'La ciudad te espera')
  const asincronas = autora.items.map((n) => notificacionLegible(n)).filter((a) => a.asincrona)
  assert.deepEqual(asincronas.map((a) => a.kind).slice(0, 2), ['destacada', 'reaccion'])
  assert.ok(asincronas.every((a) => a.href.startsWith('/student/')))
  assert.match(asincronas[1].description, /Aprendí algo/)
  const delApoderado = rosa.items.map((n) => notificacionLegible(n, 'apoderado'))
  const conversacion = delApoderado.find((a) => a.kind === 'conversacion')
  assert.equal(conversacion.hijo, 'est-ana')
  assert.match(conversacion.href, /^\/parent\/conversations\/tema\/t-conv-/)
  assert.equal(delApoderado.find((a) => a.kind === 'ficha').href, '/parent/activities')
  // Lo que se revela en su propia vista (una actividad) no tiene aviso.
  assert.equal(notificacionLegible({ ...logros.items[0], detalle: 'ACTIVIDAD' }), null)
  // La campana pone primero las asíncronas sin ver y al final las vistas.
  const orden = ordenCampana(autora.items.map((n) => notificacionLegible(n)))
  const peso = (a) => (a.vista ? 2 : a.asincrona ? 0 : 1)
  assert.deepEqual(
    orden.map(peso),
    orden.map(peso).sort((x, y) => x - y),
  )
})

test('el ingreso pide la campana; sin cierre van a la cola de toasts y una repetida no se duplica', async () => {
  const { app, store } = await iniciar({ pagina: logros })
  await store.cargarNotificaciones()
  assert.equal(store.obtenerNotificaciones().noVistas, logros.no_vistas)
  assert.deepEqual(copia(store.obtenerNotificaciones().colaToast), [])
  const nueva = { ...logros.items[0], codigo: 'NOT-nueva' }
  await store.accionConRefresco(accion([nueva]))
  await store.accionConRefresco(accion([nueva]))
  const estado = store.obtenerNotificaciones()
  assert.deepEqual(copia(estado.colaToast.map((n) => n.codigo)), ['NOT-nueva'])
  assert.equal(estado.lista[0].codigo, 'NOT-nueva')
  assert.equal(estado.noVistas, logros.no_vistas + 1)
  assert.deepEqual(marcados(app), [])
})

test('con cierre no hay toast: se marcan vistas al recibir la respuesta que arma el cierre', async () => {
  const { app, store } = await iniciar()
  const nuevas = logros.items.slice(0, 2)
  await store.accionConRefresco(accion(nuevas), undefined, true)
  await esperar()
  assert.deepEqual(copia(store.obtenerNotificaciones().colaToast), [])
  assert.deepEqual(marcados(app), [nuevas.map((n) => n.codigo)])
  assert.ok(store.obtenerNotificaciones().lista.every((n) => n.vista))
  assert.equal(store.obtenerNotificaciones().noVistas, 0)
})

test('un marcado fallido no bloquea la cola y se reintenta con el siguiente', async () => {
  let fallar = true
  const { app, store } = await iniciar({ fallarMarcado: () => fallar })
  const [a, b] = logros.items
  await store.accionConRefresco(accion([a, b]))
  await store.marcarNotificacionesVistas([a.codigo])
  assert.deepEqual(copia(store.obtenerNotificaciones().colaToast.map((n) => n.codigo)), [b.codigo])
  fallar = false
  await store.marcarNotificacionesVistas([b.codigo])
  assert.deepEqual(marcados(app), [[a.codigo], [a.codigo, b.codigo]])
  await store.marcarNotificacionesVistas([b.codigo])
  assert.deepEqual(marcados(app).at(-1), [b.codigo])
})

test('una respuesta tardía de otra cuenta se descarta', async () => {
  const { app, store } = await iniciar()
  let resolver
  app.fetch((r) =>
    r.url.includes('/notificaciones?')
      ? new Promise((resolve) => {
          resolver = resolve
        })
      : { body: {} },
  )
  store.limpiarNotificaciones()
  const pedido = store.cargarNotificaciones()
  await esperar()
  app.ingresarComo('est-luis')
  store.limpiarNotificaciones()
  resolver({ body: logros })
  await pedido
  assert.deepEqual(copia(store.obtenerNotificaciones().lista), [])
})

test('cola de toasts solo en mapa y Central, pausada por actividad y overlays; cerrar marca solo esa', async () => {
  const { app, store } = await iniciar()
  const ui = app.load('src/store/studentUiStore.ts')
  store.publicar({
    presentaciones: {
      datos: { vistas: ['central', 'missions', 'profile-general'] },
      estado: 'listo',
      error: null,
    },
  })
  ui.updateStudentUi((s) => ({
    ...s,
    cityArrivalSeen: true,
    checkInPromptDismissedOn: app.load('src/features/adventure/lib/checkIn.ts').localDateKey(new Date()),
  }))
  const [a, b] = logros.items
  await store.accionConRefresco(accion([a, b]))
  const props = { view: 'profile-general', activityOpen: false, children: null }
  const queue = app.mount(
    app.load('src/features/adventure/components/overlays/OverlayQueue.tsx').OverlayQueue,
    props,
  )
  const toasts = () => elementos(queue.render(), (e) => e.type?.name === 'UnlockToast')
  assert.equal(toasts().length, 0)
  props.view = 'missions'
  assert.equal(toasts()[0].props.aviso.id, a.codigo)
  props.activityOpen = true
  assert.equal(toasts().length, 0)
  props.activityOpen = false
  app.overlayOpen(true)
  assert.equal(toasts().length, 0)
  app.overlayOpen(false)
  toasts()[0].props.onDismiss()
  await esperar()
  assert.deepEqual(marcados(app), [[a.codigo]])
  assert.equal(toasts()[0].props.aviso.id, b.codigo)
  props.view = 'central'
  assert.equal(toasts()[0].props.aviso.id, b.codigo)
  queue.unmount()
})

// F2: la campana y «Ver todas».
const muchas = {
  total: 7,
  no_vistas: 6,
  items: [...autora.items.slice(0, 2), ...logros.items].map((n, i) => ({ ...n, vista: i === 6 })),
}

test('la campana muestra las 5 primeras con las asíncronas sin ver arriba y su acento', async () => {
  const { app, store } = await iniciar({ pagina: muchas })
  await store.cargarNotificaciones()
  const { useCampanaNotificaciones } = app.load('src/hooks/useCampanaNotificaciones.ts')
  const modelo = useCampanaNotificaciones('estudiante')
  assert.equal(modelo.noVistas, 6)
  assert.equal(modelo.recientes.length, 5)
  assert.deepEqual(copia(modelo.recientes.slice(0, 2).map((a) => a.kind)), ['destacada', 'reaccion'])
  assert.equal(modelo.todas.at(-1).vista, true)
  const { CampanaNotificaciones } = app.load('src/components/common/CampanaNotificaciones.tsx')
  const campana = app.mount(CampanaNotificaciones, { modelo, variante: 'estudiante' })
  const tree = campana.render()
  const filas = elementos(tree, (e) => e.type?.name === 'FilaNotificacion')
  assert.equal(filas.length, 5)
  const { FilaNotificacion } = app.load('src/components/common/FilaNotificacion.tsx')
  const primera = FilaNotificacion(filas[0].props)
  assert.match(primera.props.className, /is-asincrona/)
  assert.ok(elementos(tree, (e) => e.props?.children === 'Ver todas').length)
  assert.ok(
    elementos(tree, (e) => e.props?.children === '6').length +
      elementos(tree, (e) => e.props?.children === 6).length,
  )
  campana.unmount()
  // Pulsar una la marca vista (y navega con su enlace).
  primera.props.onClick()
  await esperar()
  assert.deepEqual(marcados(app), [[modelo.recientes[0].id]])
  assert.equal(store.obtenerNotificaciones().noVistas, 5)
})

test('sin notificaciones, la campana dice que no hay novedades y no ofrece «Ver todas»', async () => {
  const { app } = await iniciar()
  const { useCampanaNotificaciones } = app.load('src/hooks/useCampanaNotificaciones.ts')
  const { CampanaNotificaciones } = app.load('src/components/common/CampanaNotificaciones.tsx')
  const campana = app.mount(CampanaNotificaciones, {
    modelo: useCampanaNotificaciones('estudiante'),
    variante: 'estudiante',
  })
  const tree = campana.render()
  assert.ok(elementos(tree, (e) => e.props?.children === 'No tienes novedades pendientes').length)
  assert.equal(elementos(tree, (e) => e.props?.children === 'Ver todas').length, 0)
  campana.unmount()
})

test('«Ver todas» pagina con «Mostrar más» y «Marcar todas como vistas» deja la campana en cero', async () => {
  const paginas = {
    0: { ...muchas, total: 9, items: muchas.items },
    7: { total: 9, no_vistas: 6, items: rosa.items.slice(0, 2) },
  }
  const { app, store } = await iniciar()
  app.fetch((r) => {
    if (r.url.endsWith('/notificaciones/marcar-vistas')) return { body: { marcadas: 6 } }
    const desde = Number(new URL('http://x' + r.url).searchParams.get('desde'))
    return { body: paginas[desde] }
  })
  await store.cargarNotificaciones()
  const { useCampanaNotificaciones } = app.load('src/hooks/useCampanaNotificaciones.ts')
  const { NotificacionesModal } = app.load('src/components/common/NotificacionesModal.tsx')
  const modal = (modelo) =>
    NotificacionesModal({ abierto: true, onAbiertoChange() {}, modelo, variante: 'estudiante' })
  let modelo = useCampanaNotificaciones('estudiante')
  assert.equal(modelo.hayMas, true)
  const mas = elementos(modal(modelo), (e) => e.type === 'button' && e.props.children === 'Mostrar más')[0]
  mas.props.onClick()
  await esperar()
  modelo = useCampanaNotificaciones('estudiante')
  assert.equal(modelo.todas.length, 9)
  assert.equal(modelo.hayMas, false)
  assert.equal(elementos(modal(modelo), (e) => e.props?.children === 'Mostrar más').length, 0)
  const todas = elementos(
    modal(modelo),
    (e) => e.type === 'button' && e.props.children === 'Marcar todas como vistas',
  )[0]
  todas.props.onClick()
  await esperar()
  assert.deepEqual(marcados(app), [[]])
  modelo = useCampanaNotificaciones('estudiante')
  assert.equal(modelo.noVistas, 0)
  assert.ok(modelo.todas.every((a) => a.vista))
  assert.equal(elementos(modal(modelo), (e) => e.props?.children === 'Marcar todas como vistas').length, 0)
})

test('la barra del portal: campana inerte sin prop, ninguna con null y la del apoderado si se le pasa', () => {
  const app = fixtureServidor()
  const { AppTopBar } = app.load('src/components/layout/AppTopBar.tsx')
  const botones = (tree) => elementos(tree, (e) => e.props?.['aria-label'] === 'Notificaciones')
  assert.equal(botones(AppTopBar({ title: 'Inicio' })).length, 1)
  assert.equal(botones(AppTopBar({ title: 'Inicio', campana: null })).length, 0)
  const propia = createElement('span', { 'aria-label': 'Notificaciones' }, 'DATO DE PRUEBA')
  const conPropia = botones(AppTopBar({ title: 'Inicio', campana: propia }))
  assert.equal(conPropia.length, 1)
  assert.equal(conPropia[0].props.children, 'DATO DE PRUEBA')
  const { useCampanaPortal } = app.load('src/hooks/useCampanaNotificaciones.ts')
  assert.equal(useCampanaPortal().activa, true)
})
