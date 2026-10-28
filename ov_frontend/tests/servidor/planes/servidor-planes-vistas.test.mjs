import assert from 'node:assert/strict'
import test from 'node:test'
import { cargarAlmacen, copia, elementos, esperar, fixtureServidor, jsonServidor } from '../../soporte/servidor-ayudas.mjs'

// F07a (F07-pantallas §2, §3 y §5): Mis planes, crear desde favoritas, ordenar, eliminar, el bloque del detalle de
// carrera y el perfil, en api, con los fixtures ruta-*.
const texto = (n) =>
  Array.isArray(n)
    ? n.map(texto).join('')
    : typeof n === 'string' || typeof n === 'number'
      ? String(n)
      : n?.props
        ? texto(n.props.children)
        : ''
const accion = { eventos_registrados: [], nuevos_desbloqueos: [] }
const completos = jsonServidor('ruta/ruta-planes')
const familia = jsonServidor('ruta/ruta-planes-misma-familia')
const favoritos = jsonServidor('ruta/ruta-favoritos')
const SECCIONES = [
  { codigo: 'PLANES', nombre: 'Planes', estado: 'DISPONIBLE', bloqueo: [] },
  { codigo: 'CATALOGO', nombre: 'Catálogo', estado: 'DISPONIBLE', bloqueo: [] },
]

function misPlanes({ planes = familia, api = true, responder } = {}) {
  const app = fixtureServidor({ api, ruta: '/student/profile/decisions' })
  app.fetch((r) => {
    const respuesta = responder?.(r)
    if (respuesta) return respuesta
    if (r.url.endsWith('/planes')) return { body: planes }
    if (r.url.endsWith('/favoritos')) return { body: favoritos }
    if (r.url.includes('/acciones/')) return { body: accion }
    if (r.url.includes('/desbloqueos?')) return { body: [] }
    return { body: [] }
  })
  const almacen = cargarAlmacen(app)
  if (api) {
    almacen.publicar({ consultasHabilitadas: true })
    almacen.publicar({ secciones: { ...almacen.obtenerEstadoServidor().secciones, datos: SECCIONES, estado: 'listo' } })
  }
  return { app, almacen }
}
async function montar(app, ruta, props = {}) {
  const componente = Object.values(app.load(ruta))[0]
  const montado = app.mount(componente, props)
  montado.render()
  await esperar()
  return montado
}

test('Mis planes: cabecera, aviso de misma familia, tarjetas con estados homogéneos y un solo espacio con botones', async () => {
  const { app } = misPlanes()
  const vista = await montar(app, 'src/features/plans/components/MisPlanes.tsx')
  const arbol = vista.render()
  const marcado = texto(arbol)
  assert.match(marcado, /0 de 3 planes listos para comparar/)
  assert.match(marcado, /Tus planes A y B son de la misma familia, Psicología\..*Explorar otras áreas/)
  const tarjetas = elementos(arbol, (e) => e.type?.name === 'TarjetaPlan')
  assert.deepEqual(copia(tarjetas.map((t) => t.props.plan.prioridad)), ['A', 'B'])
  assert.match(marcado, /Espacio para tu plan C.*Desde mis favoritos.*Buscar en el catálogo/)
  const { TarjetaPlan } = app.load('src/features/plans/components/TarjetaPlan.tsx')
  const a = TarjetaPlan(tarjetas[0].props)
  const textoA = texto(a)
  assert.match(textoA, /Plan A/)
  assert.match(textoA, /Aún sin institución elegida/)
  assert.match(textoA, /Ayudar a otros.*«DATO DE PRUEBA: corto\.»/)
  const pildoras = elementos(a, (e) => e.type?.name === 'PildoraEstado').map((p) => p.props.estado)
  assert.deepEqual(pildoras, ['EN_PROCESO', 'BLOQUEADA', 'BLOQUEADA', 'BLOQUEADA'])
  // HU-099: cada sección bloqueada dice qué actividad la abre.
  assert.match(textoA, new RegExp(familia.planes[0].secciones[1].bloqueo[0].mensaje))
  assert.match(textoA, /Último cambio: /)
  assert.match(textoA, /Seguir con: Por qué la elijo/)
  // A no puede subir; B no puede bajar.
  assert.deepEqual(elementos(a, (e) => e.type === 'button' && /prioridad/.test(e.props['aria-label'])).map((b) => b.props['aria-label']), ['Bajar prioridad'])
  const b = TarjetaPlan(tarjetas[1].props)
  assert.match(texto(b), /Todavía no cuentas por qué la eliges\..*Empezar: Por qué la elijo/)
  assert.doesNotMatch(texto(a), /Tu primer interés/)
})

test('la tarjeta marca «Tu primer interés» y «Lista para comparar»; «Ver mi plan» con todo listo', async () => {
  const { app } = misPlanes({ planes: completos })
  const vista = await montar(app, 'src/features/plans/components/MisPlanes.tsx')
  const tarjetas = elementos(vista.render(), (e) => e.type?.name === 'TarjetaPlan')
  const { TarjetaPlan } = app.load('src/features/plans/components/TarjetaPlan.tsx')
  const a = texto(TarjetaPlan(tarjetas[0].props))
  assert.match(a, /Tu primer interés.*Lista para comparar/)
  assert.match(a, /Universidad Nacional Federico Villarreal · Pública/)
  assert.match(a, /4 de 4 secciones listas|Ver mi plan/)
  assert.match(texto(vista.render()), /2 de 3 planes listos para comparar/)
})

test('crear desde favoritas: las que ya son plan van deshabilitadas; crear navega al plan en POR_QUE', async () => {
  const { app } = misPlanes({ planes: completos })
  const vista = await montar(app, 'src/features/plans/components/MisPlanes.tsx')
  let arbol = vista.render()
  elementos(arbol, (e) => e.type === 'button' && texto(e) === 'Desde mis favoritos')[0].props.onClick()
  arbol = vista.render()
  await esperar()
  arbol = vista.render()
  const dialogo = elementos(arbol, (e) => e.type?.name === 'DialogoCrearPlan')[0]
  assert.equal(dialogo.props.abierto, true)
  assert.equal(dialogo.props.letra, 'C')
  const { DialogoCrearPlan } = app.load('src/features/plans/components/DialogoCrearPlan.tsx')
  const marcado = texto(DialogoCrearPlan(dialogo.props))
  assert.match(marcado, /Ya es tu plan A/)
  assert.match(marcado, /Ya es tu plan B/)
  const hacer = elementos(DialogoCrearPlan(dialogo.props), (e) => e.type === 'button')
  assert.deepEqual(hacer.map(texto), ['Hacer mi plan C'])
  hacer[0].props.onClick()
  await esperar()
  const crear = app.requests.find((r) => r.url.endsWith('/acciones/planes/crear'))
  assert.equal(crear.body.carrera, favoritos.carreras.find((c) => !completos.planes.some((p) => p.carrera.codigo === c.codigo)).codigo)
  assert.match(app.navigations.at(-1), /^\/student\/profile\/decisions\/.+\?seccion=POR_QUE$/)
})

test('sin favoritas, el diálogo invita al catálogo', async () => {
  const { app } = misPlanes()
  const { DialogoCrearPlan } = app.load('src/features/plans/components/DialogoCrearPlan.tsx')
  const props = { abierto: true, letra: 'C', carreras: [], planes: [], ocupado: null, onCrear() {}, onCerrar() {} }
  assert.match(texto(DialogoCrearPlan(props)), /Aún no guardas carreras\. Marca una como favorita.*Explorar carreras/)
})

test('un 409 al crear muestra el mensaje del servidor y no navega', async () => {
  const { app } = misPlanes({
    responder: (r) =>
      r.url.endsWith('/acciones/planes/crear') ? { status: 409, body: jsonServidor('ruta/ruta-crear-plan-no-favorita') } : null,
  })
  const vista = await montar(app, 'src/features/plans/components/MisPlanes.tsx')
  const dialogo = elementos(vista.render(), (e) => e.type?.name === 'DialogoCrearPlan')[0]
  dialogo.props.onCrear('mtpe-1')
  await esperar()
  const aviso = elementos(vista.render(), (e) => e.type?.name === 'AvisoPlan')[0].props.aviso
  assert.deepEqual([aviso.titulo, aviso.descripcion, aviso.error], ['No se pudo guardar', 'Primero guarda la carrera en tus favoritos', true])
  assert.equal(app.navigations.length, 0)
})

test('ordenar envía la permutación completa; eliminar confirma con el diálogo y avisa', async () => {
  const { app } = misPlanes()
  const vista = await montar(app, 'src/features/plans/components/MisPlanes.tsx')
  let arbol = vista.render()
  const [a] = elementos(arbol, (e) => e.type?.name === 'TarjetaPlan')
  a.props.onMover(1)
  await esperar()
  const ordenar = app.requests.find((r) => r.url.endsWith('/acciones/planes/ordenar'))
  assert.deepEqual(copia(ordenar.body.carreras), [familia.planes[1].carrera.codigo, familia.planes[0].carrera.codigo])
  a.props.onEliminar()
  arbol = vista.render()
  assert.match(texto(arbol), /¿Eliminar el plan A · Psicología\?.*Se borrará lo que escribiste en sus secciones\./)
  elementos(arbol, (e) => e.type === 'button' && texto(e) === 'Eliminar plan')[0].props.onClick()
  await esperar()
  const eliminar = app.requests.find((r) => r.url.endsWith('/acciones/planes/eliminar'))
  assert.equal(eliminar.body.carrera, familia.planes[0].carrera.codigo)
  assert.equal(elementos(vista.render(), (e) => e.type?.name === 'AvisoPlan')[0].props.aviso.titulo, 'Plan eliminado')
})

test('detalle de carrera: ya es plan > tres ocupados > no favorita > hay espacio', async () => {
  const { app } = misPlanes()
  const { BloquePlanCarrera } = app.load('src/features/discovery/components/BloquePlanCarrera.tsx')
  const base = { letra: null, libres: 1, ocupados: [], armar() {}, disponible: true, codigo: 'mtpe-1', esFavorita: false }
  const favorito = { type: 'span', props: { children: 'corazón' } }
  const noFavorita = BloquePlanCarrera({ planes: base, favorito })
  assert.match(texto(noFavorita), /Para armar un plan, primero guárdala en tus favoritos/)
  assert.equal(elementos(noFavorita, (e) => e.type === 'button').length, 0)
  assert.match(texto(BloquePlanCarrera({ planes: { ...base, esFavorita: true } })), /Armar un plan con esta carrera/)
  assert.match(texto(BloquePlanCarrera({ planes: { ...base, letra: 'A' } })), /Ya es tu Plan A/)
  assert.match(texto(BloquePlanCarrera({ planes: { ...base, libres: 0, ocupados: [{ letra: 'A', nombre: 'X' }] } })), /Tus tres planes ya tienen carrera/)
  assert.equal(BloquePlanCarrera({ planes: { ...base, disponible: false } }), null)
  // «Ver mi tarjeta» abre el plan de esa carrera.
  const link = elementos(BloquePlanCarrera({ planes: { ...base, letra: 'A' } }), (e) => e.props?.to)[0]
  assert.equal(link.props.to, '/student/profile/decisions/mtpe-1')
})

test('el bloque del detalle crea el plan con el servidor y navega a POR_QUE', async () => {
  const { app } = misPlanes()
  const { usePlanesCarrera } = app.load('src/features/discovery/hooks/usePlanesCarrera.ts')
  const hook = app.mount(() => usePlanesCarrera('mtpe-1', true), {})
  hook.render()
  await esperar()
  const planes = hook.render()
  assert.deepEqual([planes.disponible, planes.libres, planes.letra], [true, 1, null])
  planes.armar()
  await esperar()
  assert.equal(app.requests.filter((r) => r.url.endsWith('/acciones/planes/crear')).length, 1)
  assert.equal(app.navigations.at(-1), '/student/profile/decisions/mtpe-1?seccion=POR_QUE')
})

test('en local, Mis planes sigue con los planes del navegador', () => {
  const { app } = misPlanes({ api: false })
  const { StudentPlansView } = app.load('src/pages/student/StudentPlansView.tsx')
  const arbol = StudentPlansView()
  assert.equal(elementos(arbol, (e) => e.type?.name === 'MisPlanesLocales').length, 1)
  assert.equal(elementos(arbol, (e) => e.type?.name === 'MisPlanes').length, 0)
})

test('perfil en api: la píldora del plan en lugar de la barra y «Espacio libre» en los vacíos', () => {
  const { app } = misPlanes()
  const { ProfilePlans } = app.load('src/features/discovery/components/ProfilePlans.tsx')
  const props = {
    plans: [{ id: 'mtpe-369', name: 'Psicología', armado: 25, resumen: '1 de 4 secciones listas' }],
    espacioLibre: 'Espacio libre',
    favoritos: { carreras: 3, ocupaciones: 1, instituciones: 1 },
  }
  const marcado = texto(ProfilePlans(props))
  assert.match(marcado, /Psicología1 de 4 secciones listas/)
  assert.doesNotMatch(marcado, /% armado|Tu primer camino/)
  assert.equal((marcado.match(/Espacio libre/g) ?? []).length, 2)
})
