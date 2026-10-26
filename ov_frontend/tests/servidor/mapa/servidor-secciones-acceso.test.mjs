import assert from 'node:assert/strict'
import test from 'node:test'
import {
  cargarAlmacen,
  copia,
  elementos,
  escenarioRuta,
  esConsultaDominio,
  esperar,
  fixtureServidor,
  respuestaDominio,
} from '../../soporte/servidor-ayudas.mjs'

// F00: las secciones del perfil (GET /cuentas/{c}/secciones) cierran sus accesos con el mensaje del servidor.
async function iniciar(etapa = 'inicial') {
  const app = fixtureServidor()
  const escenario = escenarioRuta(etapa)
  app.fetch((r) => {
    if (r.url === '/api/acciones/ingresar')
      return { body: { eventos_registrados: [], nuevos_desbloqueos: [] } }
    if (esConsultaDominio(r)) return respuestaDominio(r, escenario)
    if (r.url.includes('/desbloqueos?')) return { body: [] }
    throw Error(`Solicitud no configurada: ${r.url}`)
  })
  assert.equal((await app.load('src/store/servidor/operaciones.ts').ingresar()).tipo, 'ok')
  return { app, escenario, guias: [] }
}
function montarPanel(app, guias) {
  const { AdventurePanel } = app.load('src/features/adventure/components/AdventurePanel.tsx')
  const adventure = app.load('src/store/adventureStore.ts').useAdventure()
  const checkIns = []
  const panel = app.mount(AdventurePanel, {
    adventure,
    points: [],
    progress: { label: 'Nivel de recorrido', value: 0 },
    onSelect() {},
    onCheckIn: () => checkIns.push(true),
    onGuide: (pasos) => guias.push(pasos),
  })
  return { panel, checkIns }
}
const accesos = (tree) =>
  Object.fromEntries(
    elementos(tree, (e) => e.type?.name === 'AccesoRapido').map((e) => [e.props.to, e.props.acceso]),
  )
function texto(nodo) {
  if (nodo == null || typeof nodo === 'boolean') return ''
  if (typeof nodo === 'string' || typeof nodo === 'number') return String(nodo)
  if (Array.isArray(nodo)) return nodo.map(texto).join('')
  return texto(nodo.props?.children)
}
// Ajuste del panel (F05): «Tu señal de hoy» es su propio componente; se pinta aparte.
const senal = (tree) => {
  const e = elementos(tree, (x) => x.type?.name === 'SenalHoy')[0]
  return e.type(e.props)
}

test('el ingreso trae las secciones y el panel cierra con candado y Lumi lo que el servidor bloquea', async () => {
  const { app, escenario, guias } = await iniciar()
  // Los accesos se ven siempre: las secciones llegan con el ingreso, una sola vez.
  assert.equal(app.requests.filter((r) => r.url.endsWith('/secciones')).length, 1)
  const { panel, checkIns } = montarPanel(app, guias)
  panel.render()
  await esperar()
  assert.equal(app.requests.filter((r) => r.url.endsWith('/secciones')).length, 1)
  const tree = panel.render()
  const lista = accesos(tree)
  const { appPaths } = app.load('src/routes/paths.ts')
  const diario = lista[appPaths.student.journal]
  const mensajeDiario = escenario.secciones.find((s) => s.codigo === 'DIARIO').bloqueo[0].mensaje
  assert.deepEqual([diario.bloqueada, diario.mensaje], [true, mensajeDiario])
  assert.equal(lista[appPaths.student.catalog.professions].bloqueada, true)
  assert.equal(lista[appPaths.student.conversations].bloqueada, true)
  const enlace = elementos(
    tree,
    (e) => e.type?.name === 'AccesoRapido' && e.props.to === appPaths.student.journal,
  )[0]
  const { textosBloqueo } = app.load('src/data/content/guideTexts.ts')
  let evitado = false
  // El acceso cerrado no navega: Lumi adelanta qué será la sección y el servidor dice qué falta.
  enlace.type(enlace.props).props.onClick({ preventDefault: () => (evitado = true) })
  assert.equal(evitado, true)
  assert.deepEqual(copia(guias.at(-1)), [
    textosBloqueo.DIARIO.adelanto,
    `${textosBloqueo.DIARIO.final} ${mensajeDiario}`,
  ])
  // El check-in cerrado tampoco abre el registro: toda la tarjeta es tocable y llama a Lumi, sin escala ni botones.
  const tarjeta = senal(tree)
  assert.deepEqual([tarjeta.type, tarjeta.props['data-estado']], ['button', 'bloqueada'])
  assert.equal(tarjeta.props.title, escenario.secciones.find((s) => s.codigo === 'CHECK_IN').bloqueo[0].mensaje)
  assert.equal(elementos(tarjeta, (e) => e.props?.className === 'sx-signal-segments').length, 0)
  assert.match(texto(tarjeta), /Aún no se abre\. Toca para saber cómo/)
  tarjeta.props.onClick()
  assert.equal(checkIns.length, 0)
  assert.match(guias.at(-1).at(-1), /^Todavía no puedes registrarla\. /)
  panel.unmount()
})

test('con las secciones abiertas los accesos navegan como siempre y solo Familia sigue cerrada', async () => {
  const { app, guias } = await iniciar('t1')
  const { panel, checkIns } = montarPanel(app, guias)
  panel.render()
  await esperar()
  const tree = panel.render()
  const { appPaths } = app.load('src/routes/paths.ts')
  const lista = accesos(tree)
  assert.equal(lista[appPaths.student.journal].bloqueada, false)
  assert.equal(lista[appPaths.student.journal].pasos, undefined)
  assert.equal(lista[appPaths.student.conversations].bloqueada, true)
  elementos(senal(tree), (e) => e.type === 'button' && e.props.className === 'sx-signal-edit')[0].props.onClick()
  assert.equal(checkIns.length, 1)
  assert.equal(guias.length, 0)
  panel.unmount()
})

test('la entrada por URL a una sección cerrada muestra su tarjeta de bloqueo con el mensaje del servidor', async () => {
  const { app, escenario } = await iniciar()
  await cargarAlmacen(app).asegurarSeccion('secciones')
  const { SeccionProtegida } = app.load('src/features/adventure/components/SeccionProtegida.tsx')
  const vista = { type: 'vista' }
  const familia = escenario.secciones.find((s) => s.codigo === 'FAMILIA')
  const tarjeta = app.mount(SeccionProtegida, {
    seccion: 'FAMILIA',
    titulo: 'Un espacio para conversar en familia',
    children: vista,
  })
  const tree = tarjeta.render()
  assert.equal(tree.type.name, 'SeccionBloqueada')
  assert.deepEqual(copia(tree.props), {
    titulo: 'Un espacio para conversar en familia',
    mensaje: familia.bloqueo[0].mensaje,
  })
  const diario = app.mount(SeccionProtegida, { seccion: 'DIARIO', children: vista }).render()
  assert.equal(diario.props.titulo, escenario.secciones.find((s) => s.codigo === 'DIARIO').nombre)
  // Con la sección abierta, la vista se muestra sin cambios.
  const abierto = await iniciar('t1')
  await cargarAlmacen(abierto.app).asegurarSeccion('secciones')
  const { SeccionProtegida: Protegida } = abierto.app.load(
    'src/features/adventure/components/SeccionProtegida.tsx',
  )
  assert.equal(abierto.app.mount(Protegida, { seccion: 'DIARIO', children: vista }).render(), vista)
})

test('un desbloqueo de sección vence la consulta de secciones', async () => {
  const { app } = await iniciar()
  const almacen = cargarAlmacen(app)
  await almacen.asegurarSeccion('secciones')
  assert.deepEqual(copia(almacen.seccionesPorDesbloqueos([{ tipo_objetivo: 'SECCION' }])), ['secciones'])
  assert.deepEqual(copia(almacen.seccionesPorDesbloqueos([{ tipo_objetivo: 'ACTIVIDAD' }])), [])
})

test('el modo se decide al llamar al hook, aunque se importe antes de configurar api', async () => {
  // Como en el navegador: el módulo se carga en modo local y main.tsx configura api después.
  const app = fixtureServidor({ api: false })
  const { useSeccionesAcceso } = app.load('src/features/adventure/hooks/useSeccionesAcceso.ts')
  const sesion = app.load('src/store/servidor/sesion.ts')
  const local = app.mount(useSeccionesAcceso, undefined).render()
  assert.equal(local('DIARIO').bloqueada, false)
  app.load('src/config/env.ts').configurarServidor({ VITE_DATOS: 'api', VITE_API_URL: '/api', DEV: true })
  const secciones = escenarioRuta('inicial').secciones
  sesion.publicar({ secciones: { datos: secciones, estado: 'listo', error: null } })
  const api = app.mount(useSeccionesAcceso, undefined).render()
  const diario = api('DIARIO')
  assert.deepEqual(
    [diario.bloqueada, diario.mensaje],
    [true, secciones.find((s) => s.codigo === 'DIARIO').bloqueo[0].mensaje],
  )
  assert.ok(diario.pasos.length === 2)
})

test('con el check-in cerrado, «Ver evolución» tampoco se abre: ni desde el panel ni por URL', async () => {
  const { app, escenario, guias } = await iniciar()
  const { panel } = montarPanel(app, guias)
  const tree = panel.render()
  const { appPaths } = app.load('src/routes/paths.ts')
  const mensaje = escenario.secciones.find((s) => s.codigo === 'CHECK_IN').bloqueo[0].mensaje
  // Ajuste del panel (F05): bloqueada, la tarjeta no muestra «Ver evolución»; solo Lumi explica qué falta.
  assert.equal(elementos(senal(tree), (e) => e.props?.to === appPaths.student.signals).length, 0)
  senal(tree).props.onClick()
  assert.match(guias.at(-1).at(-1), /^Todavía no puedes registrarla\. /)
  panel.unmount()
  // Entrada directa a /student/journal/signal: la tarjeta de bloqueo en lugar de la vista.
  const { SeccionProtegida } = app.load('src/features/adventure/components/SeccionProtegida.tsx')
  const vista = app.mount(SeccionProtegida, { seccion: 'CHECK_IN', children: 'vista de señales' }).render()
  assert.equal(vista.type?.name, 'SeccionBloqueada')
  assert.equal(vista.props.mensaje, mensaje)
})
