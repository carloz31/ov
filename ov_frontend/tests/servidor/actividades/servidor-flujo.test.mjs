import { esConsultaDominio, respuestaDominio } from '../../soporte/servidor-ayudas.mjs'
import { cargarAlmacen, escenarioServidor } from '../../soporte/servidor-ayudas.mjs'
import { loadMapPoints } from '../../soporte/refactor-map.mjs'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  fixtureServidor,
  servidorInicial,
  jsonServidor,
  esperar,
  elementos,
} from '../../soporte/servidor-ayudas.mjs'

async function iniciar(options) {
  const app = fixtureServidor(options)
  servidorInicial(app)
  const acciones = app.load('src/store/servidor/operaciones.ts')
  assert.equal((await acciones.ingresar()).tipo, 'ok')
  return { app, acciones }
}
function ultimoDialogo(app) {
  const store = app.load('src/store/journeyStore.ts')
  const activity = app.load('src/data/activities/content.ts').activityById('mission-welcome')
  // DATO DE PRUEBA: comprobación aprobada del contenido real antes del último diálogo.
  store.updateJourney((s) => ({
    ...s,
    attempts: activity.nodos
      .filter((n) => n.tipo === 'pregunta')
      .map((n) => ({
        estudianteId: 'est-prototipo',
        actividadId: activity.id,
        nodoId: n.id,
        opcionIds: n.opciones.filter((o) => o.correcta).map((o) => o.id),
        correcta: true,
        revelada: false,
        numeroIntento: 1,
        respondidaEn: '2026-10-07T12:00:00Z',
      })),
  }))
  store.updateJourney((s) => ({
    ...s,
    progress: {
      ...s.progress,
      [activity.id]: { ...s.progress[activity.id], nodoActualId: activity.nodos.at(-1).id },
    },
  }))
  const { StudentActivityPlayer } = app.load('src/features/activities/components/StudentActivityPlayer.tsx')
  const player = app.mount(StudentActivityPlayer, { activity, onClose() {} })
  const tree = player.render()
  const escena = elementos(tree, (e) => e.type?.name === 'DialogueBox' || e.type?.name === 'SlideNode')[0]
  assert.ok(escena)
  return { player, continuar: escena.props.onContinue, store }
}
test('el cliente distingue 409, red y errores HTTP sin perder el detalle', async () => {
  const app = fixtureServidor(),
    { enviar, obtener } = app.load('src/services/api/cliente.ts')
  app.fetch(() => ({
    status: 409,
    body: { detail: { mensaje: 'Faltan ítems', items_faltantes: ['RIA-1'] } },
  }))
  const conflicto = await enviar('/acciones/completar-actividad', {
    cuenta: 'est-ana',
    actividad: 'act-tip-01',
  })
  assert.equal(conflicto.tipo, 'bloqueado')
  assert.equal(conflicto.detalle.items_faltantes[0], 'RIA-1')
  assert.equal(app.requests[0].body.cuenta, 'est-ana')
  app.fetch(() => {
    throw Error('Sin red')
  })
  assert.equal((await obtener('/cuentas')).tipo, 'sin_conexion')
  app.fetch(() => ({ status: 404, body: { detail: 'No existe' } }))
  assert.equal((await obtener('/cuentas')).estado, 404)
})
test('el ingreso deduplica el montaje, elige solo estudiantes y no marca avisos vistos', async () => {
  for (const [usuario, esperado] of [
    ['est-luis', 'est-luis'],
    ['apo-rosa', 'est-ana'],
    ['cualquier-usuario', 'est-ana'],
  ]) {
    const app = fixtureServidor()
    servidorInicial(app)
    app.load('src/store/servidor/cuenta.ts').guardarUsuarioIngreso(usuario)
    const acciones = app.load('src/store/servidor/operaciones.ts')
    await Promise.all([acciones.ingresar(), acciones.ingresar()])
    assert.equal(app.requests.filter((r) => r.url === '/api/acciones/ingresar').length, 1)
    assert.equal(app.load('src/store/servidor/cuenta.ts').cuentaActiva(), esperado)
    assert.equal(JSON.parse(app.sesion.get('ov.cuenta-servidor.v1')).codigo, esperado)
    assert.equal(
      app.requests.some((r) => r.url.includes('marcar-vistos')),
      false,
    )
  }
})

test('el ingreso confirmado conserva sus avisos si falla la consulta y reintenta sin otro POST', async () => {
  const app = fixtureServidor()
  const recibo = jsonServidor('completar-mission-welcome')
  // DATO DE PRUEBA: desbloqueos durante el ingreso y desconexión posterior.
  const inicial = escenarioServidor('inicial')
  let falla = true
  app.fetch((r) => {
    if (r.url === '/api/cuentas') return { body: [inicial.cuenta] }
    if (r.url === '/api/acciones/ingresar') return { body: recibo }
    if (esConsultaDominio(r))
      return falla
        ? { status: 503, body: 'DATO DE PRUEBA: conexión interrumpida' }
        : respuestaDominio(r, inicial)
    if (r.url.includes('/desbloqueos?')) return { body: [] }
    throw Error(r.url)
  })
  const acciones = app.load('src/store/servidor/operaciones.ts')
  const almacen = cargarAlmacen(app)
  assert.equal((await acciones.ingresar()).tipo, 'http')
  assert.ok(almacen.avisosPendientes().some((a) => a.title === 'La primera chispa'))
  falla = false
  assert.equal((await acciones.ingresar()).tipo, 'ok')
  assert.equal(app.requests.filter((r) => r.url === '/api/acciones/ingresar').length, 1)
  assert.equal(
    app.requests.some((r) => r.url.includes('marcar-vistos')),
    false,
  )
})
test('un ingreso anterior no cambia la cuenta nueva cuando llega tarde', async () => {
  const app = fixtureServidor()
  let liberar
  app.fetch(
    () =>
      new Promise((resolve) => {
        liberar = () => resolve({ body: [escenarioServidor('inicial').cuenta] })
      }),
  )
  const acciones = app.load('src/store/servidor/operaciones.ts'),
    cuenta = app.load('src/store/servidor/cuenta.ts')
  const anterior = acciones.ingresar()
  cuenta.guardarUsuarioIngreso('est-luis')
  acciones.prepararIngreso()
  servidorInicial(app)
  assert.equal((await acciones.ingresar()).tipo, 'ok')
  liberar()
  assert.equal((await anterior).tipo, 'http')
  assert.equal(cuenta.cuentaActiva(), 'est-luis')
  assert.equal(cargarAlmacen(app).obtenerEstadoServidor().resumen.datos.cuenta.codigo, 'est-luis')
  assert.equal(app.requests.filter((r) => r.url === '/api/acciones/ingresar').length, 1)
})

test('un ingreso sin servidor expone error y reintenta sin crear estado ficticio', async () => {
  const app = fixtureServidor(),
    acciones = app.load('src/store/servidor/operaciones.ts'),
    estado = cargarAlmacen(app)
  assert.equal((await acciones.ingresar()).tipo, 'sin_conexion')
  assert.equal(estado.obtenerEstadoServidor().resumen.datos, null)
  assert.equal(estado.obtenerEstadoServidor().error.tipo, 'sin_conexion')
  servidorInicial(app)
  assert.equal((await acciones.ingresar()).tipo, 'ok')
})
test('las copias API separan cuentas, conservan borradores y nunca mezclan claves locales', async () => {
  const { app, acciones } = await iniciar({
    guardado: { 'ov.missions.v2': 'contenido local', 'ov.student-adventure.v1': 'aventura local' },
  })
  const journey = app.load('src/store/journeyStore.ts'),
    adventure = app.load('src/store/adventureStore.ts')
  journey.updateJourney((s) => ({ ...s, drafts: { texto: 'Borrador de Ana' } }))
  const cuenta = app.load('src/store/servidor/cuenta.ts')
  cuenta.guardarUsuarioIngreso('est-luis')
  acciones.prepararIngreso()
  await acciones.ingresar()
  assert.equal(journey.getJourneySnapshot().drafts.texto, undefined)
  journey.updateJourney((s) => ({ ...s, drafts: { texto: 'Borrador de Luis' } }))
  cuenta.guardarUsuarioIngreso('est-ana')
  acciones.prepararIngreso()
  await acciones.ingresar()
  assert.equal(journey.getJourneySnapshot().drafts.texto, 'Borrador de Ana')
  adventure.completeMission('welcome')
  assert.equal(adventure.useAdventure().completedMissionIds.length, 0)
  assert.equal(adventure.canAccessCity(adventure.useAdventure()), false)
  assert.equal(app.local.get('ov.missions.v2'), 'contenido local')
  assert.equal(app.local.get('ov.student-adventure.v1'), 'aventura local')
  assert.ok(JSON.parse(app.local.get('ov.student-adventure.v1.api')).por_cuenta['est-ana'])
})
test('move informa $fin una sola vez ante doble clic, espera el refresco y muestra el cierre recibido', async () => {
  const { app } = await iniciar()
  let liberar
  const bloqueo = new Promise((resolve) => {
    liberar = resolve
  })
  app.fetch(async (r) => {
    if (r.url === '/api/acciones/completar-actividad') {
      await bloqueo
      return { body: jsonServidor('completar-mission-welcome') }
    }
    if (esConsultaDominio(r)) return respuestaDominio(r, escenarioServidor('ciudad'))
    if (r.url.includes('/desbloqueos?')) return { body: jsonServidor('desbloqueos-no-vistos') }
    throw Error('Solicitud inesperada')
  })
  const { player, continuar, store } = ultimoDialogo(app)
  continuar()
  continuar()
  assert.equal(app.requests.filter((r) => r.url === '/api/acciones/completar-actividad').length, 1)
  assert.notEqual(store.getJourneySnapshot().progress['mission-welcome'].estado, 'completada')
  assert.equal(elementos(player.render(), (e) => e.type?.name === 'FinishScreen').length, 0)
  liberar()
  await esperar()
  const cierre = elementos(player.render(), (e) => e.type?.name === 'FinishScreen')[0]
  assert.ok(cierre)
  assert.equal(cierre.props.desbloqueosServidor.length, 3)
  assert.equal(store.getJourneySnapshot().progress['mission-welcome'].estado, 'completada')
  player.unmount()
})
test('un POST confirmado con refresco fallido reintenta solo la consulta', async () => {
  const { app } = await iniciar()
  let conConexion = false
  app.fetch((r) => {
    if (r.url === '/api/acciones/completar-actividad')
      return { body: jsonServidor('completar-mission-welcome') }
    if (esConsultaDominio(r) && conConexion) return respuestaDominio(r, escenarioServidor('ciudad'))
    if (r.url.includes('/desbloqueos?')) return { body: [] }
    throw Error('Sin conexión')
  })
  const { player, continuar } = ultimoDialogo(app)
  continuar()
  await esperar()
  let tree = player.render()
  assert.equal(elementos(tree, (e) => e.type?.name === 'FinishScreen').length, 0)
  const retry = elementos(
    tree,
    (e) => e.type === 'button' && String(e.props.children).includes('Reintentar'),
  )[0]
  assert.ok(retry)
  conConexion = true
  retry.props.onClick()
  await esperar()
  tree = player.render()
  assert.ok(elementos(tree, (e) => e.type?.name === 'FinishScreen').length)
  assert.equal(app.requests.filter((r) => r.url === '/api/acciones/completar-actividad').length, 1)
  player.unmount()
})
test('409 y desconexión no completan ni muestran FinishScreen y permiten reintentar', async () => {
  for (const bloqueado of [true, false]) {
    const { app } = await iniciar()
    app.fetch(() => {
      if (bloqueado)
        return {
          status: 409,
          body: { detail: { mensaje: 'Requisito pendiente', items_faltantes: ['RIA-1'] } },
        }
      throw Error('Desconexión')
    })
    const { player, continuar, store } = ultimoDialogo(app)
    continuar()
    await esperar()
    const tree = player.render()
    assert.equal(elementos(tree, (e) => e.type?.name === 'FinishScreen').length, 0)
    assert.notEqual(store.getJourneySnapshot().progress['mission-welcome'].estado, 'completada')
    assert.ok(elementos(tree, (e) => e.props.role === 'alert').length)
    assert.ok(
      elementos(tree, (e) => e.type === 'button' && String(e.props.children).includes('Reintentar')).length,
    )
    player.unmount()
  }
})
test('repetir una informativa llega nuevamente al servidor sin fabricar logros', async () => {
  const { app, acciones } = await iniciar()
  let completadas = 0
  app.fetch((r) => {
    if (r.url === '/api/acciones/completar-actividad')
      return {
        body: {
          ...jsonServidor('completar-mission-welcome'),
          nuevos_desbloqueos: completadas++
            ? []
            : jsonServidor('completar-mission-welcome').nuevos_desbloqueos,
        },
      }
    if (esConsultaDominio(r)) return respuestaDominio(r, escenarioServidor('ciudad'))
    if (r.url.includes('/desbloqueos?')) return { body: [] }
  })
  assert.equal((await acciones.completarActividad('mission-welcome')).datos.nuevos_desbloqueos.length, 3)
  assert.equal((await acciones.completarActividad('mission-welcome')).datos.nuevos_desbloqueos.length, 0)
  assert.equal(completadas, 2)
  const store = app.load('src/store/journeyStore.ts')
  assert.equal(store.getJourneySnapshot().resources.length, 0)
  assert.equal(store.getJourneySnapshot().rewards.length, 0)
})
test('el mapa y los enlaces directos no usan límites de demo ni abren TIP o desafíos', async () => {
  const { app } = await iniciar({ ruta: '/student/exploration?actividad=el-rumor' })
  const journey = app.load('src/store/journeyStore.ts'),
    adventure = app.load('src/store/adventureStore.ts'),
    mapa = loadMapPoints(app.load)
  const puntos = mapa.getCaminoPoints(adventure.useAdventure(), journey.getJourneySnapshot())
  assert.equal(puntos.length, 10)
  assert.equal(
    puntos.find((p) => p.specActivityId === 'mission-expectations').subtitle.includes('pendiente'),
    false,
  )
  assert.equal(mapa.getRecommendedPoint(puntos).specActivityId, 'mission-welcome')
  const city = mapa.getCiudadPoints(adventure.useAdventure(), journey.getJourneySnapshot())
  assert.ok(city.filter((p) => p.id !== 'mara-test').every((p) => p.status === 'locked' && !p.actionEnabled))
  const { CiudadScreen } = app.load('src/pages/student/CiudadScreen.tsx')
  const mounted = app.mount(CiudadScreen, {}),
    tree = mounted.render()
  assert.equal(
    elementos(tree, (e) => e.type?.name === 'ChallengePlayer' || e.type?.name === 'StudentActivityPlayer')
      .length,
    0,
  )
  assert.equal(app.query.has('actividad'), false)
  mounted.unmount()
  const source = readFileSync('src/features/activities/hooks/useActivityCompletion.ts', 'utf8')
  assert.equal((source.match(/await completarActividad\(/g) ?? []).length, 1)
})
test('hidratar sin espacio corrige el estado obsoleto y conserva el borrador y el nodo local', async () => {
  const { app } = await iniciar()
  const store = app.load('src/store/journeyStore.ts')
  store.updateJourney((s) => ({
    ...s,
    drafts: { prueba: 'DATO DE PRUEBA: texto pendiente' },
    progress: {
      ...s.progress,
      'mission-welcome': {
        ...s.progress['mission-welcome'],
        estado: 'completada',
        nodoActualId: 'welcome-02',
      },
    },
  }))
  app.failWrites(true)
  await cargarAlmacen(app).refrescar()
  assert.equal(store.getJourneySnapshot().progress['mission-welcome'].estado, 'no_iniciada')
  assert.equal(store.getJourneySnapshot().progress['mission-welcome'].nodoActualId, 'welcome-02')
  assert.equal(store.getJourneySnapshot().drafts.prueba, 'DATO DE PRUEBA: texto pendiente')
})

test('leer una ficha y pasar una diapositiva no las obtiene ni finaliza en API', async () => {
  const { app } = await iniciar()
  const store = app.load('src/store/journeyStore.ts')
  const activity = app.load('src/data/activities/content.ts').activityById('mission-welcome')
  store.updateJourney((s) => ({
    ...s,
    progress: { ...s.progress, [activity.id]: { ...s.progress[activity.id], nodoActualId: 'welcome-02' } },
  }))
  const player = app.mount(
    app.load('src/features/activities/components/StudentActivityPlayer.tsx').StudentActivityPlayer,
    { activity, onClose() {} },
  )
  elementos(player.render(), (e) => e.type?.name === 'SlideNode')[0].props.onContinue()
  assert.equal(store.getJourneySnapshot().resources.length, 0)
  assert.equal(store.getJourneySnapshot().rewards.length, 0)
  assert.equal(
    app.requests.some((r) => r.url === '/api/acciones/completar-actividad'),
    false,
  )
  player.unmount()
  const { ResourceSheet } = app.load('src/features/activities/components/ResourceSheet.tsx')
  const sheet = app.mount(ResourceSheet, { open: true, ids: ['ficha-mitos'], onClose() {} })
  const leer = elementos(
    sheet.render(),
    (e) => e.type === 'button' && String(e.props.children).includes('Leí la ficha'),
  )[0]
  assert.ok(leer)
  leer.props.onClick()
  assert.ok(store.getJourneySnapshot().readResourceIds.includes('ficha-mitos'))
  assert.equal(store.getJourneySnapshot().resources.length, 0)
  sheet.unmount()
})

test('recuperar un cierre confirmado no crea otro evento y una URL bloqueada no abre el reproductor', async () => {
  const { app } = await iniciar({ ruta: '/student/missions?actividad=mission-story' })
  const screen = app.mount(app.load('src/pages/student/CaminoScreen.tsx').CaminoScreen, {})
  assert.equal(elementos(screen.render(), (e) => e.type?.name === 'StudentActivityPlayer').length, 0)
  assert.equal(app.query.has('actividad'), false)
  screen.unmount()
  app.fetch((r) => (esConsultaDominio(r) ? respuestaDominio(r, escenarioServidor('ciudad')) : { body: [] }))
  await cargarAlmacen(app).refrescar()
  const activity = app.load('src/data/activities/content.ts').activityById('mission-welcome')
  const player = app.mount(
    app.load('src/features/activities/components/StudentActivityPlayer.tsx').StudentActivityPlayer,
    { activity, onClose() {} },
  )
  assert.ok(elementos(player.render(), (e) => e.type?.name === 'FinishScreen').length)
  assert.equal(
    app.requests.some((r) => r.url === '/api/acciones/completar-actividad'),
    false,
  )
  player.unmount()
})

test('el reinicio solo opera en API y desarrollo y borra únicamente las dos claves API', async () => {
  for (const opciones of [{ api: false }, { desarrollo: false }]) {
    const app = fixtureServidor(opciones)
    assert.equal((await app.load('src/store/servidor/operaciones.ts').reiniciarDatosDePrueba()).tipo, 'http')
    assert.equal(app.requests.length, 0)
  }
  const app = fixtureServidor({
    guardado: {
      'ov.missions.v2': 'local',
      'ov.missions.v2.api': 'api',
      'ov.student-adventure.v1': 'local',
      'ov.student-adventure.v1.api': 'api',
    },
  })
  app.fetch(() => ({ body: { mensaje: 'Datos reiniciados' } }))
  assert.equal((await app.load('src/store/servidor/operaciones.ts').reiniciarDatosDePrueba()).tipo, 'ok')
  assert.equal(app.local.has('ov.missions.v2.api'), false)
  assert.equal(app.local.has('ov.student-adventure.v1.api'), false)
  assert.equal(app.local.get('ov.missions.v2'), 'local')
  assert.equal(app.local.get('ov.student-adventure.v1'), 'local')
})
