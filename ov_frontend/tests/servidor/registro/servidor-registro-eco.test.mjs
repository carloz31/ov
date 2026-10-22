import assert from 'node:assert/strict'
import test from 'node:test'
import { copia, elementos, esperar, fixtureServidor, jsonServidor } from '../../soporte/servidor-ayudas.mjs'
import { abrir, iniciar } from '../../soporte/servidor-registro-ayudas.mjs'

// F02 (HU-009): t-eco retoma lo respondido en t-expectativas: la cita (o el aviso «por desarrollar») sobre
// la consigna y, en la elección que retoma la anterior, la lista completa con lo elegido antes marcado.
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
    nodo.props.onGuardar(
      'DATO DE PRUEBA: la universidad, porque quiero investigar',
      nodo.props.item.eleccion ? [{ codigo: 'UNIVERSIDAD' }] : [],
    )
    await esperar()
  }
}

test('el adaptador da lo elegido la vez pasada, con el texto de la «otra»; sin dato, nada', () => {
  const { anterioresDe, necesitaReferencias } = fixtureServidor().load(
    'src/lib/servidor/adaptadoresRegistro.ts',
  )
  const [ruta, espera] = jsonServidor('ruta/ruta-items-registro-t-eco')
  assert.equal(ruta.eleccion.lista, 'RUTAS_DESPUES_COLEGIO')
  assert.deepEqual(copia(anterioresDe(ruta, REFERENCIAS.disponible.referencias)), [{ codigo: 'UNIVERSIDAD' }])
  // DATO DE PRUEBA: una «otra» elegida la vez pasada.
  const conOtra = [
    {
      codigo: 't-ref-rutas',
      tipo: 'ELECCION',
      estado: 'DISPONIBLE',
      opciones: [{ codigo: 'OTRA', texto: 'Viajar un año' }],
    },
  ]
  assert.deepEqual(copia(anterioresDe(ruta, conOtra)), [{ codigo: 'OTRA', texto: 'Viajar un año' }])
  assert.deepEqual(copia(anterioresDe(ruta, REFERENCIAS.sinDato.referencias)), [])
  assert.deepEqual(copia(anterioresDe(espera, REFERENCIAS.disponible.referencias)), [])
  assert.equal(necesitaReferencias([espera], [undefined]), false)
  assert.equal(necesitaReferencias([espera], ['t-ref-espera']), true)
  assert.equal(necesitaReferencias([ruta, espera], []), true)
})

test('t-eco responde la ruta con la elección guiada y la lista completa, con lo de la vez pasada marcado', async () => {
  const { app, player } = await abrirEco(REFERENCIAS.disponible)
  assert.ok(app.requests.some((r) => r.url.endsWith('/cuentas/est-ana/actividades/t-eco/referencias')))
  const ruta = await hasta(player, 't-eco-ruta')
  assert.equal(ruta.type.name, 'RegistroEleccionNode')
  assert.ok(ruta.props.item.eleccion.opciones.some((o) => o.codigo === 'AUN_NO_SE'))
  assert.deepEqual(copia(ruta.props.inicial), { texto: '', opciones: [{ codigo: 'UNIVERSIDAD' }] })
  assert.deepEqual(copia(ruta.props.anteriores), [{ codigo: 'UNIVERSIDAD' }])
  ruta.props.onGuardar('DATO DE PRUEBA: ahora prefiero un instituto', [{ codigo: 'INSTITUTO' }])
  await esperar()
  assert.deepEqual(copia(app.requests.find((r) => r.url.endsWith('/guardar-borrador')).body.opciones), [
    { codigo: 'INSTITUTO' },
  ])
  player.unmount()
})

test('«La vez pasada» marca lo elegido antes; mantenerlo o cambiarlo decide la pregunta y el saludo', async () => {
  const { app, player } = await abrirEco(REFERENCIAS.disponible)
  const ruta = await hasta(player, 't-eco-ruta')
  player.unmount()
  const form = app.mount(ruta.type, ruta.props)
  let tree = form.render()
  const guiado = elementos(tree, (e) => e.type?.name === 'RegistroGuiado')[0]
  assert.equal(guiado.props.mensaje, ruta.props.node.eleccion.mensajes.inicio)
  const tarjetas = elementos(tree, (e) => e.type?.name === 'ChoiceReveal')[0]
  assert.deepEqual(copia(tarjetas.props.anteriores), ['UNIVERSIDAD'])
  assert.equal(tarjetas.props.etiquetaAnterior, 'La vez pasada')
  const pregunta = () =>
    elementos(form.render(), (e) => e.type?.name === 'RegistroExplicacion')[0].props.pregunta
  assert.equal(pregunta(), 'Sigues con estudiar en una universidad. ¿Qué te hace mantenerla?')
  const vista = (t) => app.mount(t.type, t.props).render()
  const tarjeta = (codigo) => elementos(vista(tarjetas), (e) => e.key === codigo)[0]
  const insignia = (codigo) =>
    elementos(tarjeta(codigo), (e) => e.props?.className === 'sx-choice-badge')[0]?.props.children
  assert.equal(insignia('UNIVERSIDAD'), 'La vez pasada')
  tarjeta('INSTITUTO').props.onClick()
  tree = form.render()
  const despues = elementos(tree, (e) => e.type?.name === 'ChoiceReveal')[0]
  const conInstituto = (codigo) =>
    elementos(
      elementos(vista(despues), (e) => e.key === codigo)[0],
      (e) => e.props?.className === 'sx-choice-badge',
    )[0]?.props.children
  assert.equal(conInstituto('UNIVERSIDAD'), 'La vez pasada')
  assert.equal(conInstituto('INSTITUTO'), 'Tu ruta')
  assert.match(pregunta(), /^Ahora te atrae .*¿Qué te hizo cambiar de idea\?$/)
  elementos(vista(despues), (e) => e.key === 'AUN_NO_SE')[0].props.onClick()
  assert.equal(pregunta(), ruta.props.node.eleccion.preguntaExclusiva)
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
  // Con la burbuja de Lumi de los registros guiados, como la elección de t-expectativas.
  const tree = app.mount(RegistroEco, { eco: espera.props.eco, hablanteId: 'companero' }).render()
  assert.equal(tree.type.name, 'RegistroLumi')
  assert.equal(tree.props.hablanteId, 'companero')
  assert.equal(
    tree.props.texto,
    `Lumi recuerda lo que escribiste en «${titulo}»: «${REFERENCIAS.disponible.referencias[0].texto}»`,
  )
  // La consigna no supone que haya cita, y el rótulo de visibilidad va bajo la pregunta.
  assert.equal(espera.props.item.consigna, '¿Qué esperan de ti las personas cercanas hoy? ¿Ha cambiado algo?')
  const form = app.mount(espera.type, espera.props).render()
  const etiqueta = elementos(
    form,
    (e) => e.type === 'label' && e.props.className === 'sx-submission-label',
  )[0]
  const partes = elementos(etiqueta, (e) => typeof e.props?.className === 'string').map(
    (e) => e.props.className,
  )
  assert.ok(partes.indexOf('sx-submission-premise') < partes.indexOf('sx-submission-visibility'))
  assert.ok(partes.indexOf('sx-submission-visibility') < partes.indexOf('sx-submission-textarea'))
  assert.equal(elementos(form, (e) => e.type?.name === 'RegistroEco').length, 1)
  assert.equal(elementos(form, (e) => e.type?.name === 'CharacterAvatar').length, 0)
})

test('por desarrollar, la consigna muestra el aviso sin cita ni enlace; sin dato, no muestra nada', async () => {
  const { app, player } = await abrirEco(REFERENCIAS.porDesarrollar)
  const espera = await hasta(player, 't-eco-espera')
  assert.equal(espera.props.eco.estado, 'POR_DESARROLLAR')
  player.unmount()
  const { RegistroEco } = app.load('src/features/activities/components/nodes/RegistroEco.tsx')
  const aviso = app.mount(RegistroEco, { eco: espera.props.eco }).render()
  assert.equal(aviso.type.name, 'RegistroLumi')
  assert.equal(
    aviso.props.texto,
    'La vez pasada lo contaste en pocas palabras. Aquí puedes tomarte tu tiempo.',
  )
  assert.doesNotMatch(JSON.stringify(aviso), /Ver o modificar|POCO_DESARROLLADA|clasificacion/)

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
