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

// F07b (§10; lienzos «Cómo me siento» y Mis planes v4.2): la entrada del menú, el panel que guarda al instante y
// las mini tarjetas del plan A. Con los fixtures ruta-*.
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
const SECCIONES = [{ codigo: 'PLANES', nombre: 'Planes', estado: 'DISPONIBLE', bloqueo: [] }]
const PSICOLOGIA = 'mtpe-369'
const [listo] = completos.planes

function planAbierto(seccion = null) {
  const app = fixtureServidor({ ruta: `/student/profile/decisions/${PSICOLOGIA}` })
  app.fetch((r) => {
    if (r.url.endsWith('/planes')) return { body: completos }
    if (r.url.includes('/instrumentos/TEST-RIASEC/resultado'))
      return { body: jsonServidor('ruta/ruta-resultado-riasec') }
    if (r.url.includes('/acciones/')) return { body: accion }
    return { body: [] }
  })
  const almacen = cargarAlmacen(app)
  almacen.publicar({ consultasHabilitadas: true })
  almacen.publicar({
    secciones: { ...almacen.obtenerEstadoServidor().secciones, datos: SECCIONES, estado: 'listo' },
  })
  const { PlanAbierto } = app.load('src/features/plans/components/PlanAbierto.tsx')
  return { app, vista: app.mount(PlanAbierto, { carrera: PSICOLOGIA, seccion }) }
}
async function dibujar(vista) {
  for (let i = 0; i < 3; i++) {
    vista.render()
    await esperar()
  }
  return vista.render()
}
const hijo = (arbol, nombre) => elementos(arbol, (e) => e.type?.name === nombre)[0]

test('el menú abre con «Cómo me siento» y su resumen; elegirlo muestra el panel', async () => {
  const { app, vista } = planAbierto()
  let arbol = await dibujar(vista)
  const { MenuSeccionesPlan } = app.load('src/features/plans/components/MenuSeccionesPlan.tsx')
  const menu = MenuSeccionesPlan(hijo(arbol, 'MenuSeccionesPlan').props)
  assert.match(texto(menu), /^.*Cómo me sientoMucho · Algo · Algo1 · Por qué la elijo/)
  hijo(arbol, 'MenuSeccionesPlan').props.onElegir('MEDIDORES')
  arbol = vista.render()
  assert.equal(hijo(arbol, 'MenuSeccionesPlan').props.seccion, 'MEDIDORES')
  assert.ok(hijo(arbol, 'ComoMeSiento'))
})

test('cada clic envía los tres medidores al instante y el botón queda ocupado hasta la respuesta', async () => {
  const { app, vista } = planAbierto('MEDIDORES')
  let arbol = await dibujar(vista)
  const panel = hijo(arbol, 'ComoMeSiento')
  const { ComoMeSiento } = app.load('src/features/plans/components/ComoMeSiento.tsx')
  const dibujo = ComoMeSiento(panel.props)
  assert.match(texto(dibujo), /Cómo me siento con este planSe guarda al instante/)
  assert.match(
    texto(dibujo),
    /No es una nota: te ayuda a ver qué plan te mueve más y cuál tienes más a la mano\./,
  )
  assert.match(texto(dibujo), /Me entusiasma¿Cuánto te atrae esta opción\?/)
  const controles = elementos(dibujo, (e) => e.type?.name === 'SegmentedControl')
  assert.deepEqual(
    controles.map((c) => c.props.valor),
    [3, 2, 2],
  )
  assert.deepEqual(
    copia(controles[0].props.opciones).map((o) => o.texto),
    ['Poco', 'Algo', 'Mucho'],
  )
  panel.props.onFijar('recursos', 3)
  arbol = vista.render()
  assert.deepEqual(copia(hijo(arbol, 'ComoMeSiento').props.ocupado), { codigo: 'recursos', valor: 3 })
  await esperar()
  const medidores = app.requests.find((r) => r.url.endsWith('/acciones/planes/medidores'))
  assert.deepEqual(copia(medidores.body), {
    cuenta: 'est-ana',
    carrera: PSICOLOGIA,
    entusiasmo: 3,
    capacidad: 2,
    recursos: 3,
  })
  assert.equal(hijo(vista.render(), 'ComoMeSiento').props.ocupado, null)
})

test('el control segmentado: grupo con nombre, el elegido presionado y el ocupado deshabilita', () => {
  const app = fixtureServidor({})
  const { SegmentedControl } = app.load('src/components/ui/SegmentedControl.tsx')
  const opciones = [
    { valor: 1, texto: 'Poco' },
    { valor: 2, texto: 'Algo' },
  ]
  const grupo = SegmentedControl({
    etiqueta: 'Me entusiasma',
    opciones,
    valor: 2,
    ocupado: 1,
    onCambiar() {},
  })
  assert.equal(grupo.props.role, 'group')
  assert.equal(grupo.props['aria-label'], 'Me entusiasma')
  const botones = grupo.props.children
  assert.deepEqual(
    botones.map((b) => [b.props['aria-pressed'], b.props['aria-busy'], b.props.disabled]),
    [
      [false, true, true],
      [true, false, true],
    ],
  )
})

test('frente: el plan A lleva tres mini tarjetas; sin valor, «Sin valorar · Valorar»; B y C, ninguna', () => {
  const app = fixtureServidor({ ruta: '/student/profile/decisions' })
  const { TarjetaPlan } = app.load('src/features/plans/components/TarjetaPlan.tsx')
  const { MedidoresTarjeta } = app.load('src/features/plans/components/MedidoresTarjeta.tsx')
  const props = { indice: 0, primerInteres: false, ocupado: false, onEliminar() {} }
  const a = TarjetaPlan({ ...props, principal: true, plan: listo })
  const mini = hijo(a, 'MedidoresTarjeta')
  assert.deepEqual(copia(mini.props.medidores), listo.medidores)
  assert.match(
    texto(MedidoresTarjeta(mini.props)),
    /Me entusiasmaMucho.*Me siento capazAlgo.*Tengo cómo lograrloAlgo/,
  )
  const llenos = elementos(MedidoresTarjeta(mini.props), (e) => e.props?.['data-lleno'] === true).length
  assert.equal(llenos, 3 + 2 + 2)
  const sinValorar = MedidoresTarjeta({ medidores: familia.planes[0].medidores, carrera: PSICOLOGIA })
  assert.match(texto(sinValorar), /Sin valorar · Valorar/)
  const enlace = elementos(sinValorar, (e) => e.props?.to)[0]
  assert.equal(enlace.props.to, `/student/profile/decisions/${PSICOLOGIA}?seccion=MEDIDORES`)
  assert.equal(hijo(TarjetaPlan({ ...props, principal: false, plan: listo }), 'MedidoresTarjeta'), undefined)
})
