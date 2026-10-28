import assert from 'node:assert/strict'
import test from 'node:test'
import {
  cargarAlmacen,
  copia,
  elementos,
  esperar,
  fixtureServidor,
  jsonServidor,
} from '../../soporte/servidor-ayudas.mjs'

// F07a (F07b-pantallas §2, §3 y §5): Mis planes, crear desde favoritas, ordenar, eliminar, el bloque del detalle de
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
    almacen.publicar({
      secciones: { ...almacen.obtenerEstadoServidor().secciones, datos: SECCIONES, estado: 'listo' },
    })
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

test('Mis planes v4.2: A como ruta principal, B y C como rutas alternas compactas, sin contador', async () => {
  const { app } = misPlanes()
  const vista = await montar(app, 'src/features/plans/components/MisPlanes.tsx')
  const arbol = vista.render()
  const marcado = texto(arbol)
  assert.doesNotMatch(marcado, /planes listos para comparar/)
  assert.match(marcado, /Tus planes A y B son de la misma familia, Psicología\..*Explorar otras áreas/)
  assert.match(marcado, /Ruta principal.*Rutas alternas/)
  const tarjetas = elementos(arbol, (e) => e.type?.name === 'TarjetaPlan')
  assert.deepEqual(copia(tarjetas.map((t) => [t.props.plan.prioridad, t.props.principal])), [
    ['A', true],
    ['B', false],
  ])
  const espacios = elementos(arbol, (e) => e.type?.name === 'EspacioPlan')
  assert.deepEqual(copia(espacios.map((e) => [e.props.letra, e.props.conAcciones])), [['C', true]])
  const { TarjetaPlan } = app.load('src/features/plans/components/TarjetaPlan.tsx')
  const a = TarjetaPlan(tarjetas[0].props)
  const textoA = texto(a)
  assert.match(textoA, /Plan A · tu ruta principal/)
  assert.match(textoA, /Aún sin institución elegida/)
  assert.doesNotMatch(textoA, /Por qué la elijo«|secciones listas|Lista para comparar|prioridad/)
  // Cuatro casillas independientes; el mensaje de bloqueo va solo en el tooltip.
  const casillas = elementos(a, (e) => e.type?.name === 'CasillaSeccion')
  assert.deepEqual(
    casillas.map((c) => [c.props.seccion.estado, c.props.conTexto]),
    [
      ['EN_PROCESO', true],
      ['BLOQUEADA', true],
      ['BLOQUEADA', true],
      ['BLOQUEADA', true],
    ],
  )
  const planes = app.load('src/lib/servidor/adaptadoresPlanes.ts')
  const bloqueada = familia.planes[0].secciones[1]
  assert.equal(
    planes.tooltipSeccion(bloqueada),
    `2 · Qué tanto la conozco · Bloqueada. ${bloqueada.bloqueo[0].mensaje}`,
  )
  assert.doesNotMatch(textoA, new RegExp(bloqueada.bloqueo[0].mensaje))
  assert.match(textoA, /Seguir con: Por qué la elijo/)
  assert.match(textoA, /Último cambio: /)
  assert.equal(elementos(a, (e) => e.type === 'button' && texto(e).includes('Subir prioridad')).length, 0)
  const b = TarjetaPlan(tarjetas[1].props)
  assert.match(texto(b), /Empezar: Por qué la elijo.*Subir prioridad/)
  assert.ok(elementos(b, (e) => e.type?.name === 'CasillaSeccion').every((c) => c.props.conTexto === false))
  assert.doesNotMatch(texto(b), /tu ruta principal/)
})

test('«Tu primer interés» y el sello «Plan completo» con las cuatro secciones listas; «Ver mi plan»', async () => {
  const { app } = misPlanes({ planes: completos })
  const vista = await montar(app, 'src/features/plans/components/MisPlanes.tsx')
  const tarjetas = elementos(vista.render(), (e) => e.type?.name === 'TarjetaPlan')
  const { TarjetaPlan } = app.load('src/features/plans/components/TarjetaPlan.tsx')
  const a = texto(TarjetaPlan(tarjetas[0].props))
  assert.match(a, /Tu primer interés.*Plan completo/)
  assert.match(a, /Universidad Nacional Federico Villarreal · Pública/)
  assert.match(a, /Ver mi plan/)
  assert.doesNotMatch(a, /Lista para comparar/)
})

test('crear desde favoritas: las que ya son plan van deshabilitadas; crear navega al plan en POR_QUE', async () => {
  const { app } = misPlanes({ planes: completos })
  const vista = await montar(app, 'src/features/plans/components/MisPlanes.tsx')
  let arbol = vista.render()
  elementos(arbol, (e) => e.type?.name === 'EspacioPlan' && e.props.conAcciones)[0].props.onCrear()
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
  assert.equal(
    crear.body.carrera,
    favoritos.carreras.find((c) => !completos.planes.some((p) => p.carrera.codigo === c.codigo)).codigo,
  )
  assert.match(app.navigations.at(-1), /^\/student\/profile\/decisions\/.+\?seccion=POR_QUE$/)
})

test('ajuste F07b: crear una carrera con un plan eliminado lo recupera y abre donde iba', async () => {
  const libre = favoritos.carreras.find((c) => !completos.planes.some((p) => p.carrera.codigo === c.codigo))
  // Tras crear, el servidor devuelve el plan recuperado: con lo que tenía (secciones guardadas).
  const recuperado = {
    ...completos.planes[1],
    prioridad: 'C',
    carrera: { ...completos.planes[1].carrera, codigo: libre.codigo },
  }
  let creado = false
  const { app } = misPlanes({
    planes: completos,
    responder: (r) => {
      if (r.url.endsWith('/acciones/planes/crear')) creado = true
      return creado && r.url.endsWith('/planes')
        ? { body: { ...completos, planes: [...completos.planes, recuperado] } }
        : null
    },
  })
  const vista = await montar(app, 'src/features/plans/components/MisPlanes.tsx')
  elementos(vista.render(), (e) => e.type?.name === 'EspacioPlan' && e.props.conAcciones)[0].props.onCrear()
  vista.render()
  await esperar()
  const dialogo = elementos(vista.render(), (e) => e.type?.name === 'DialogoCrearPlan')[0]
  dialogo.props.onCrear(libre.codigo)
  await esperar()
  await esperar()
  const seccion = recuperado.secciones.find(
    (s) => s.estado === 'POR_EMPEZAR' || s.estado === 'EN_PROCESO',
  ).codigo
  assert.equal(app.navigations.at(-1), `/student/profile/decisions/${libre.codigo}?seccion=${seccion}`)
})

test('sin favoritas, el diálogo invita al catálogo', async () => {
  const { app } = misPlanes()
  const { DialogoCrearPlan } = app.load('src/features/plans/components/DialogoCrearPlan.tsx')
  const props = {
    abierto: true,
    letra: 'C',
    carreras: [],
    planes: [],
    ocupado: null,
    onCrear() {},
    onCerrar() {},
  }
  assert.match(
    texto(DialogoCrearPlan(props)),
    /Aún no guardas carreras\. Marca una como favorita.*Explorar carreras/,
  )
})

test('un 409 al crear muestra el mensaje del servidor y no navega', async () => {
  const { app } = misPlanes({
    responder: (r) =>
      r.url.endsWith('/acciones/planes/crear')
        ? { status: 409, body: jsonServidor('ruta/ruta-crear-plan-no-favorita') }
        : null,
  })
  const vista = await montar(app, 'src/features/plans/components/MisPlanes.tsx')
  const dialogo = elementos(vista.render(), (e) => e.type?.name === 'DialogoCrearPlan')[0]
  dialogo.props.onCrear('mtpe-1')
  await esperar()
  const aviso = elementos(vista.render(), (e) => e.type?.name === 'AvisoPlan')[0].props.aviso
  assert.deepEqual(
    [aviso.titulo, aviso.descripcion, aviso.error],
    ['No se pudo guardar', 'Primero guarda la carrera en tus favoritos', true],
  )
  assert.equal(app.navigations.length, 0)
})

test('«Subir prioridad» confirma, ocupa el botón y cambia el plan con el de arriba; eliminar confirma y avisa', async () => {
  const { app } = misPlanes()
  const vista = await montar(app, 'src/features/plans/components/MisPlanes.tsx')
  let arbol = vista.render()
  const [a, b] = elementos(arbol, (e) => e.type?.name === 'TarjetaPlan')
  b.props.onSubir()
  arbol = vista.render()
  assert.equal(app.requests.filter((r) => r.url.endsWith('/acciones/planes/ordenar')).length, 0)
  const [primero, segundo] = familia.planes.map((p) => p.carrera.nombre)
  assert.ok(
    texto(arbol).includes(
      `¿Subir ${segundo} al plan A?${segundo} pasa a ser tu plan A y ${primero} baja al plan B.`,
    ),
  )
  const confirmar = () =>
    elementos(vista.render(), (e) => e.type === 'button' && /Subir prioridad|Guardando…/.test(texto(e))).at(
      -1,
    )
  confirmar().props.onClick()
  assert.equal(texto(confirmar()), 'Guardando…')
  assert.equal(confirmar().props.disabled, true)
  await esperar()
  const ordenar = app.requests.find((r) => r.url.endsWith('/acciones/planes/ordenar'))
  assert.deepEqual(copia(ordenar.body.carreras), [
    familia.planes[1].carrera.codigo,
    familia.planes[0].carrera.codigo,
  ])
  assert.equal(
    elementos(vista.render(), (e) => e.type?.name === 'AvisoPlan')[0].props.aviso.titulo,
    `${familia.planes[1].carrera.nombre} ahora es tu plan A`,
  )
  a.props.onEliminar()
  arbol = vista.render()
  assert.match(
    texto(arbol),
    /¿Eliminar el plan A · Psicología\?.*Lo que escribiste queda guardado: si vuelves a crearlo desde tus favoritos, lo recuperas tal como estaba\./,
  )
  elementos(arbol, (e) => e.type === 'button' && texto(e) === 'Eliminar plan')[0].props.onClick()
  await esperar()
  const eliminar = app.requests.find((r) => r.url.endsWith('/acciones/planes/eliminar'))
  assert.equal(eliminar.body.carrera, familia.planes[0].carrera.codigo)
  assert.equal(
    elementos(vista.render(), (e) => e.type?.name === 'AvisoPlan')[0].props.aviso.titulo,
    'Plan eliminado',
  )
})

test('detalle de carrera: ya es plan > tres ocupados > no favorita > hay espacio', async () => {
  const { app } = misPlanes()
  const { BloquePlanCarrera } = app.load('src/features/discovery/components/BloquePlanCarrera.tsx')
  const base = {
    letra: null,
    libres: 1,
    ocupados: [],
    armar() {},
    disponible: true,
    codigo: 'mtpe-1',
    esFavorita: false,
  }
  const favorito = { type: 'span', props: { children: 'corazón' } }
  const noFavorita = BloquePlanCarrera({ planes: base, favorito })
  assert.match(texto(noFavorita), /Para armar un plan, primero guárdala en tus favoritos/)
  assert.equal(elementos(noFavorita, (e) => e.type === 'button').length, 0)
  assert.match(
    texto(BloquePlanCarrera({ planes: { ...base, esFavorita: true } })),
    /Armar un plan con esta carrera/,
  )
  assert.match(texto(BloquePlanCarrera({ planes: { ...base, letra: 'A' } })), /Ya es tu Plan A/)
  assert.match(
    texto(BloquePlanCarrera({ planes: { ...base, libres: 0, ocupados: [{ letra: 'A', nombre: 'X' }] } })),
    /Tus tres planes ya tienen carrera/,
  )
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
    plans: [
      { id: 'mtpe-369', name: 'Psicología', armado: 25, resumen: '1 de 4 secciones listas' },
      { id: 'mtpe-87', name: 'Otra', armado: 100, resumen: 'Plan completo' },
    ],
    espacioLibre: 'Espacio libre',
    favoritos: { carreras: 3, ocupaciones: 1, instituciones: 1 },
  }
  const marcado = texto(ProfilePlans(props))
  assert.match(marcado, /Psicología1 de 4 secciones listas/)
  assert.doesNotMatch(marcado, /% armado|Tu primer camino/)
  assert.match(marcado, /OtraPlan completo/)
  assert.equal((marcado.match(/Espacio libre/g) ?? []).length, 1)
})
