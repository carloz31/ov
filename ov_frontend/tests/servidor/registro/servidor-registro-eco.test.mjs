import assert from 'node:assert/strict'
import test from 'node:test'
import { copia, elementos, esperar, fixtureServidor, jsonServidor } from '../../soporte/servidor-ayudas.mjs'
import { abrir, iniciar } from '../../soporte/servidor-registro-ayudas.mjs'

// F02 (HU-009): t-eco retoma lo respondido en t-expectativas: la cita (o el aviso «por desarrollar») sobre
// la consigna y, en la elección por referencia, lo elegido antes como opciones.
const NODOS = ['RegistroConsignaNode', 'RegistroPodioNode', 'RegistroEleccionNode']
const consigna = (tree) => elementos(tree, (e) => NODOS.includes(e.type?.name))[0]
const REFERENCIAS = {
  disponible: jsonServidor('ruta/ruta-referencias-t-eco-disponible'),
  porDesarrollar: jsonServidor('ruta/ruta-referencias-t-eco'),
  sinDato: jsonServidor('ruta/ruta-referencias-t-eco-sin-dato'),
}

async function abrirEco(referencias) {
  const { app } = await iniciar({ actividad: 't-eco', referencias })
  return { app, player: await abrir(app, 't-eco') }
}

// Avanza del diálogo de entrada a la consigna pedida, guardando lo que haga falta.
async function hasta(player, id) {
  elementos(player.render(), (e) => e.type?.name === 'DialogueBox')[0]?.props.onContinue()
  for (;;) {
    const nodo = consigna(player.render())
    if (nodo.props.node.id === id) return nodo
    // Sin dato (t-expectativas sin entregar), la elección por referencia no tiene opciones.
    const primera = nodo.props.item.eleccion?.opciones[0]
    nodo.props.onGuardar(
      'DATO DE PRUEBA: la universidad, porque quiero investigar',
      primera ? [{ codigo: primera.codigo }] : [],
    )
    await esperar()
  }
}

test('el adaptador llena la elección por referencia con lo elegido antes; sin dato, sin opciones', () => {
  const { itemConReferencia, necesitaReferencias } = fixtureServidor().load(
    'src/lib/servidor/adaptadoresRegistro.ts',
  )
  const [ruta, espera] = jsonServidor('ruta/ruta-items-registro-t-eco')
  const lleno = itemConReferencia(ruta, REFERENCIAS.disponible.referencias)
  assert.deepEqual(copia(lleno.eleccion.opciones), [
    { codigo: 'UNIVERSIDAD', texto: 'Estudiar en una universidad' },
  ])
  assert.equal(lleno.eleccion.permite_otra, false)
  assert.deepEqual(copia(itemConReferencia(ruta, REFERENCIAS.sinDato.referencias).eleccion.opciones), [])
  assert.equal(itemConReferencia(espera, REFERENCIAS.disponible.referencias), espera)
  assert.equal(necesitaReferencias([espera], [undefined]), false)
  assert.equal(necesitaReferencias([espera], ['t-ref-espera']), true)
  assert.equal(necesitaReferencias([ruta, espera], []), true)
})

test('t-eco pide sus referencias y responde la elección con las casillas de lo elegido antes', async () => {
  const { app, player } = await abrirEco(REFERENCIAS.disponible)
  assert.ok(app.requests.some((r) => r.url.endsWith('/cuentas/est-ana/actividades/t-eco/referencias')))
  const ruta = await hasta(player, 't-eco-ruta')
  assert.equal(ruta.type.name, 'RegistroConsignaNode')
  assert.deepEqual(copia(ruta.props.item.eleccion.opciones), [
    { codigo: 'UNIVERSIDAD', texto: 'Estudiar en una universidad' },
  ])
  assert.equal(ruta.props.eco, undefined)
  ruta.props.onGuardar('DATO DE PRUEBA: la universidad, porque quiero investigar', [
    { codigo: 'UNIVERSIDAD' },
  ])
  await esperar()
  assert.deepEqual(copia(app.requests.find((r) => r.url.endsWith('/guardar-borrador')).body.opciones), [
    { codigo: 'UNIVERSIDAD' },
  ])
  player.unmount()
})

test('con la respuesta disponible, la consigna cita el texto y nombra la actividad de origen', async () => {
  const { app, player } = await abrirEco(REFERENCIAS.disponible)
  const espera = await hasta(player, 't-eco-espera')
  const titulo = app
    .load('src/store/servidor/sesion.ts')
    .obtenerEstadoServidor()
    .actividades.datos.flatMap((b) => b.actividades)
    .find((a) => a.codigo === 't-expectativas').titulo
  assert.deepEqual(copia(espera.props.eco), {
    estado: 'DISPONIBLE',
    texto: REFERENCIAS.disponible.referencias[0].texto,
    titulo,
  })
  player.unmount()
  const { RegistroEco } = app.load('src/features/activities/components/nodes/RegistroEco.tsx')
  const tree = app.mount(RegistroEco, { eco: espera.props.eco }).render()
  assert.equal(tree.props.className, 'sx-question-memory')
  const texto = JSON.stringify(tree)
  assert.match(texto, new RegExp(`Lumi recuerda lo que escribiste en «${titulo}»`))
  assert.ok(texto.includes('DATO DE PRUEBA: esperan que estudie, porque confían en mí'))
})

test('por desarrollar, la consigna muestra el aviso sin cita ni enlace; sin dato, no muestra nada', async () => {
  const { app, player } = await abrirEco(REFERENCIAS.porDesarrollar)
  const espera = await hasta(player, 't-eco-espera')
  assert.equal(espera.props.eco.estado, 'POR_DESARROLLAR')
  player.unmount()
  const { RegistroEco } = app.load('src/features/activities/components/nodes/RegistroEco.tsx')
  const aviso = app.mount(RegistroEco, { eco: espera.props.eco }).render()
  assert.equal(aviso.props.className, 'sx-question-memory is-neutral')
  const texto = JSON.stringify(aviso)
  assert.match(texto, /aún está por desarrollar/)
  assert.equal(elementos(aviso, (e) => ['a', 'button', 'blockquote'].includes(e.type)).length, 0)
  assert.doesNotMatch(texto, /POCO_DESARROLLADA|clasificacion/)

  const sinDato = await abrirEco(REFERENCIAS.sinDato)
  const nodo = await hasta(sinDato.player, 't-eco-espera')
  assert.equal(nodo.props.eco, undefined)
  sinDato.player.unmount()
})

test('un registro sin elecciones por referencia ni ecos no pide referencias', async () => {
  const { app } = await iniciar()
  const player = await abrir(app, 't-expectativas')
  assert.equal(
    app.requests.some((r) => r.url.endsWith('/referencias')),
    false,
  )
  player.unmount()
})

test('una consigna con eco y sin ítem no pasa la validación del contenido', () => {
  const { validateActivity } = fixtureServidor().load('src/lib/activities/validation.ts')
  const contenido = copia(jsonServidor('../../../src/data/activities/contenidos/t_eco'))
  validateActivity(contenido)
  delete contenido.nodos.find((n) => n.eco).item
  assert.throws(() => validateActivity(contenido), /cita una referencia sin ítem/)
})
