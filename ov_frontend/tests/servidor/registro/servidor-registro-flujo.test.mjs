import assert from 'node:assert/strict'
import test from 'node:test'
import { cargarAlmacen, copia, elementos, esperar, jsonServidor } from '../../soporte/servidor-ayudas.mjs'
import { abrir, contenido, iniciar, itemEnPantalla, peticiones } from '../../soporte/servidor-registro-ayudas.mjs'

// Ajuste front de registros (lote 1): el flujo ítem por ítem con la pantalla de Lumi (§3), el ítem respondido, la
// edición y el reenvío (§4) y la entrada a la actividad (§6), con los fixtures de b1-1 (`contenido`) y de
// t-expectativas (`ruta`, sin LLM).
const CONFIRMACIONES = [
  'Listo, quedó en tu registro.',
  'Anotado en tu registro.',
  'Ya está guardado. Sigamos.',
  'Queda en tu registro, tal como lo dijiste.',
  'Guardado. Vamos con lo que sigue.',
]
const CON_PISTA = 'Quedó guardado. Aún tengo algo que preguntarte sobre esto; puedes volver más adelante.'
const TEXTO = 'DATO DE PRUEBA: organicé la feria del salón.'

async function aMedias(acciones = {}) {
  const { app } = await iniciar({ actividad: 'b1-1', registro: contenido('registro-b1-1-a-medias'), acciones })
  return { app, player: await abrir(app, 'b1-1') }
}
// Escribe en el ítem por responder y lo envía, como lo haría su formulario.
function enviar(player, opciones, texto = TEXTO) {
  const { registro, node } = itemEnPantalla(player)
  registro.guardarBorrador(node.item, { opciones, texto })
  player.render()
  itemEnPantalla(player).registro.enviar(node)
}
// Avanza por los diálogos, elecciones y diapositivas de la apertura hasta el primer ítem.
function recorrerApertura(player) {
  for (let i = 0; i < 20 && !itemEnPantalla(player); i++) {
    const tree = player.render()
    const [dialogo] = elementos(tree, (e) => e.type?.name === 'DialogueBox')
    const [eleccion] = elementos(tree, (e) => e.type?.name === 'ChoiceNode')
    const [diapositiva] = elementos(tree, (e) => e.type?.name === 'SlideNode')
    // Ajuste coherencia-bloque1: b1-1 trae una pregunta antes de los ítems.
    const [pregunta] = elementos(tree, (e) => e.type?.name === 'QuestionNode')
    if (dialogo) dialogo.props.onContinue()
    else if (eleccion) eleccion.props.onChoose(eleccion.props.node.opciones[0])
    else if (diapositiva) diapositiva.props.onContinue()
    else if (pregunta) pregunta.props.onContinue()
  }
  assert.ok(itemEnPantalla(player), 'llega al primer ítem')
}
// Ajuste coherencia-bloque1: tras el último ítem, los pasos de cierre de b1-1 (sus diálogos, en orden). Devuelve sus
// textos; el último «Continuar» entrega.
const dialogo = (player) => elementos(player.render(), (e) => e.type?.name === 'DialogueBox')[0]
async function recorrerCierre(player, pasos = 10) {
  const cierre = []
  for (let paso = dialogo(player); paso && cierre.length < pasos; paso = dialogo(player)) {
    cierre.push(paso.props.text)
    paso.props.onContinue()
    await esperar()
  }
  return cierre
}
// Los textos de los pasos de cierre de b1-1, del contenido.
const pasosCierre = (app) => {
  const nodos = app.load('src/data/activities/contenidos.ts').contenidoPorClave('b1_1').nodos
  return nodos.slice(nodos.findLastIndex((n) => n.tipo === 'consigna') + 1).map((n) => n.texto)
}
const lumi = (player) => {
  const actual = itemEnPantalla(player)
  assert.equal(actual.vista, 'lumi')
  assert.equal(actual.hijo.type.name, 'PantallaLumi')
  return actual.hijo.props
}

test('primera vez: empieza por la apertura; a medias, en `item_actual`', async () => {
  const { app } = await iniciar({ actividad: 'b1-1', registro: contenido('registro-b1-1-inicial') })
  const inicio = await abrir(app, 'b1-1')
  assert.equal(itemEnPantalla(inicio), undefined)
  assert.ok(elementos(inicio.render(), (e) => e.type?.name === 'DialogueBox').length)
  inicio.unmount()
  const { player } = await aMedias()
  const actual = itemEnPantalla(player)
  assert.equal(actual.node.item, 'b1-1-logro')
  assert.equal(actual.vista, 'por_responder')
  assert.equal(actual.hijo.type.name, 'RegistroItemNode')
  player.unmount()
})

test('enviar abre la pantalla de Lumi con los puntos y luego la repregunta; el cuerpo es el del contrato', async () => {
  const { app, player } = await aMedias({ responder: contenido('responder-b1-1-repregunta') })
  enviar(player, [{ codigo: 'ORGANIZAR' }])
  const esperando = lumi(player)
  assert.deepEqual(copia(esperando.estado), { tipo: 'esperando' })
  assert.equal(esperando.texto, TEXTO)
  await esperar()
  const [req] = peticiones(app, 'responder')
  assert.deepEqual(copia(req.body), {
    cuenta: 'est-ana', actividad: 'b1-1', item: 'b1-1-logro', opciones: [{ codigo: 'ORGANIZAR' }], texto: TEXTO,
  })
  const repregunta = contenido('responder-b1-1-repregunta').repregunta
  assert.deepEqual(copia(lumi(player).estado), { tipo: 'repregunta', texto: repregunta })
  // La pantalla de Lumi no tiene «Anterior».
  assert.equal(itemEnPantalla(player).elemento.props.onAnterior, undefined)
  player.unmount()
})

test('tras la repregunta: con pista, «aún tengo algo que preguntarte»; sin pista, confirmación; o el mensaje', async () => {
  for (const [fixture, esperado] of [
    ['seguimiento-b1-1-con-pista', CON_PISTA],
    ['seguimiento-b1-1-sin-pista', undefined],
    ['seguimiento-b1-1-mensaje', contenido('seguimiento-b1-1-mensaje').mensaje],
  ]) {
    const { app, player } = await aMedias({
      responder: contenido('responder-b1-1-repregunta'),
      'responder-seguimiento': contenido(fixture),
    })
    enviar(player, [{ codigo: 'ORGANIZAR' }])
    await esperar()
    lumi(player).onResponder('DATO DE PRUEBA: con mis amigos.')
    assert.deepEqual(copia(lumi(player).estado), { tipo: 'esperando' })
    await esperar()
    assert.deepEqual(copia(peticiones(app, 'responder-seguimiento')[0].body), {
      cuenta: 'est-ana', actividad: 'b1-1', item: 'b1-1-logro', texto: 'DATO DE PRUEBA: con mis amigos.',
    })
    const { estado } = lumi(player)
    assert.equal(estado.tipo, 'desenlace')
    if (esperado) assert.equal(estado.texto, esperado)
    else assert.ok(CONFIRMACIONES.includes(estado.texto))
    player.unmount()
  }
})

test('en la primera respuesta, MENSAJE muestra el texto del servidor y SIGUIENTE, una confirmación', async () => {
  const { player } = await aMedias({ responder: contenido('responder-b1-1-mensaje') })
  enviar(player, [{ codigo: 'ORGANIZAR' }])
  await esperar()
  assert.deepEqual(copia(lumi(player).estado), { tipo: 'desenlace', texto: contenido('responder-b1-1-mensaje').mensaje })
  player.unmount()
  const ruta = await iniciar({ acciones: { responder: jsonServidor('ruta/ruta-responder-t-exp-ruta') } })
  const otro = await abrir(ruta.app, 't-expectativas')
  recorrerApertura(otro)
  enviar(otro, [{ codigo: 'INSTITUTO' }])
  // Ítem sin LLM: la misma pantalla, sin espera, con la frase de confirmación.
  const sinEspera = lumi(otro).estado
  assert.equal(sinEspera.tipo, 'desenlace')
  assert.ok(CONFIRMACIONES.includes(sinEspera.texto))
  await esperar()
  assert.equal(lumi(otro).estado.texto, sinEspera.texto)
  otro.unmount()
})

test('«Seguir sin responder» no llama a ningún servicio y lleva al nodo siguiente', async () => {
  const { app, player } = await aMedias({ responder: contenido('responder-b1-1-repregunta') })
  enviar(player, [{ codigo: 'ORGANIZAR' }])
  await esperar()
  const antes = app.requests.length
  lumi(player).onSeguir()
  await esperar()
  assert.equal(app.requests.filter((r) => r.url.includes('/acciones/')).length,
    app.requests.slice(0, antes).filter((r) => r.url.includes('/acciones/')).length)
  assert.equal(itemEnPantalla(player).node.item, 'b1-1-dificultad')
  player.unmount()
})

// Ajuste coherencia-bloque1: el panel del mapa lee el estado de las actividades cargadas; una respuesta confirmada
// las deja con el estado del registro, sin volver a pedirlas.
test('una respuesta confirmada deja el registro EN_CURSO en las actividades cargadas', async () => {
  const { app, player } = await aMedias({ responder: contenido('responder-b1-1-mensaje') })
  const estado = () =>
    cargarAlmacen(app).obtenerEstadoServidor().actividades.datos.flatMap((b) => b.actividades)
      .find((a) => a.codigo === 'b1-1').estado
  assert.equal(estado(), 'DISPONIBLE')
  const pedidas = app.requests.filter((r) => r.url.endsWith('/actividades')).length
  enviar(player, [{ codigo: 'ORGANIZAR' }])
  await esperar()
  assert.equal(estado(), 'EN_CURSO')
  assert.equal(app.requests.filter((r) => r.url.endsWith('/actividades')).length, pedidas)
  player.unmount()
})

test('un error del servidor vuelve al ítem con su mensaje y se puede reintentar', async () => {
  const { app, player } = await aMedias({
    responder: [{ status: 409, body: { detail: { mensaje: 'Este ítem ya tiene 10 intentos' } } },
      contenido('responder-b1-1-mensaje')],
  })
  enviar(player, [{ codigo: 'ORGANIZAR' }])
  await esperar()
  let actual = itemEnPantalla(player)
  assert.equal(actual.vista, 'por_responder')
  assert.equal(actual.registro.error, 'Este ítem ya tiene 10 intentos')
  // Lo escrito se conserva.
  assert.equal(actual.registro.borradorDe('b1-1-logro').texto, TEXTO)
  actual.registro.enviar(actual.node)
  await esperar()
  assert.equal(lumi(player).estado.tipo, 'desenlace')
  assert.equal(peticiones(app, 'responder').length, 2)
  player.unmount()
})

test('«Anterior» conserva lo escrito: el ítem respondido se ve en lectura y al volver sigue el borrador', async () => {
  const { player } = await aMedias()
  const actual = itemEnPantalla(player)
  actual.registro.guardarBorrador('b1-1-logro', { opciones: [{ codigo: 'ORGANIZAR' }], texto: 'a medias' })
  player.render()
  itemEnPantalla(player).elemento.props.onAnterior()
  const previo = itemEnPantalla(player)
  assert.equal(previo.node.item, 'b1-1-gustos')
  assert.equal(previo.vista, 'lectura')
  previo.registro.continuar(previo.node)
  await esperar()
  const vuelta = itemEnPantalla(player)
  assert.equal(vuelta.node.item, 'b1-1-logro')
  assert.deepEqual(copia(vuelta.hijo.props.borrador), { opciones: [{ codigo: 'ORGANIZAR' }], texto: 'a medias' })
  player.unmount()
})

// Ajuste coherencia-bloque1 (adaptada): tras el último ítem vienen los pasos de cierre y se entrega al continuar el
// último. Es también lo que ve quien salió durante los pasos de cierre: entra al último ítem, en lectura.
test('con todo respondido y sin terminar cae en el último ítem en lectura; sigue por los pasos de cierre y entrega', async () => {
  const { app } = await iniciar({
    actividad: 'b1-1',
    registro: contenido('registro-b1-1-sin-terminar'),
    acciones: { entregar: contenido('entregar-b1-1') },
  })
  const player = await abrir(app, 'b1-1')
  const actual = itemEnPantalla(player)
  assert.equal(actual.node.item, 'b1-1-dificultad')
  assert.equal(actual.vista, 'lectura')
  actual.registro.continuar(actual.node)
  await esperar()
  assert.equal(peticiones(app, 'entregar').length, 0)
  assert.equal(itemEnPantalla(player), undefined)
  const cierre = pasosCierre(app)
  assert.equal(cierre.length, 5)
  assert.deepEqual(await recorrerCierre(player), cierre)
  assert.equal(peticiones(app, 'entregar').length, 1)
  assert.ok(elementos(player.render(), (e) => e.type?.name === 'FinishScreen').length)
  player.unmount()
})

test('«Anterior» desde el primer paso de cierre vuelve al último ítem en lectura, sin entregar', async () => {
  const { app } = await iniciar({ actividad: 'b1-1', registro: contenido('registro-b1-1-sin-terminar') })
  const player = await abrir(app, 'b1-1')
  const actual = itemEnPantalla(player)
  actual.registro.continuar(actual.node)
  await esperar()
  const primero = dialogo(player)
  assert.equal(primero.props.text, pasosCierre(app)[0])
  primero.props.onAnterior()
  const vuelta = itemEnPantalla(player)
  assert.equal(vuelta.node.item, 'b1-1-dificultad')
  assert.equal(vuelta.vista, 'lectura')
  assert.equal(peticiones(app, 'entregar').length, 0)
  player.unmount()
})

test('si `entregar` falla tras los pasos de cierre, el aviso del reproductor la reintenta', async () => {
  const { app } = await iniciar({
    actividad: 'b1-1',
    registro: contenido('registro-b1-1-sin-terminar'),
    acciones: { entregar: [{ status: 500, body: { detail: { mensaje: 'Falló el servidor' } } }, contenido('entregar-b1-1')] },
  })
  const player = await abrir(app, 'b1-1')
  const actual = itemEnPantalla(player)
  actual.registro.continuar(actual.node)
  await esperar()
  await recorrerCierre(player, pasosCierre(app).length)
  assert.equal(peticiones(app, 'entregar').length, 1)
  const aviso = elementos(player.render(), (e) => e.props?.className === 'sx-player-error')[0]
  assert.ok(aviso, 'muestra el aviso del reproductor')
  assert.ok(!elementos(player.render(), (e) => e.type?.name === 'FinishScreen').length)
  elementos(aviso, (e) => e.type === 'button')[0].props.onClick()
  await esperar()
  assert.equal(peticiones(app, 'entregar').length, 2)
  assert.ok(elementos(player.render(), (e) => e.type?.name === 'FinishScreen').length)
  player.unmount()
})

// Ajuste coherencia-bloque2 (adaptada): el completado ya no empieza desde el inicio, sino en el último ítem, en
// lectura; «Anterior» lleva a los demás ítems y, al continuar, siguen los pasos de cierre y vuelve a entregar.
test('rehacer: entra en el último ítem en lectura, «Anterior» llega a los demás y al final vuelve a entregar', async () => {
  const { app } = await iniciar({
    actividad: 'b1-1',
    registro: contenido('registro-b1-1-completado'),
    acciones: { entregar: contenido('entregar-b1-1') },
  })
  const player = await abrir(app, 'b1-1')
  const ultimo = itemEnPantalla(player)
  assert.deepEqual([ultimo.node.item, ultimo.vista], ['b1-1-dificultad', 'lectura'])
  ultimo.elemento.props.onAnterior()
  const previo = itemEnPantalla(player)
  assert.deepEqual([previo.node.item, previo.vista], ['b1-1-logro', 'lectura'])
  previo.registro.continuar(previo.node)
  await esperar()
  const otraVez = itemEnPantalla(player)
  assert.equal(otraVez.node.item, 'b1-1-dificultad')
  otraVez.registro.continuar(otraVez.node)
  await esperar()
  assert.equal(peticiones(app, 'entregar').length, 0)
  assert.deepEqual(await recorrerCierre(player), pasosCierre(app))
  assert.equal(peticiones(app, 'entregar').length, 1)
  player.unmount()
})

test('reenviar llama a `reenviar` y abre la pantalla de Lumi con cada paso posible', async () => {
  for (const [fixture, tipo] of [
    ['reenviar-b1-1', 'desenlace'],
    ['responder-b1-1-repregunta', 'repregunta'],
    ['responder-b1-1-mensaje', 'desenlace'],
  ]) {
    const { app } = await iniciar({
      actividad: 'b1-1',
      registro: contenido('registro-b1-1-sin-terminar'),
      acciones: { reenviar: contenido(fixture) },
    })
    const player = await abrir(app, 'b1-1')
    const actual = itemEnPantalla(player)
    assert.equal(actual.hijo.type.name, 'RegistroLecturaNode')
    actual.hijo.props.onReenviar()
    assert.deepEqual(copia(lumi(player).estado), { tipo: 'esperando' })
    await esperar()
    assert.deepEqual(copia(peticiones(app, 'reenviar')[0].body), {
      cuenta: 'est-ana', actividad: 'b1-1', item: 'b1-1-dificultad',
    })
    assert.equal(lumi(player).estado.tipo, tipo)
    player.unmount()
  }
})

test('«Modificar» prellena la elección y la caja con las dos líneas; «Cancelar» vuelve sin cambios', async () => {
  const { app } = await iniciar({ actividad: 'b1-1', registro: contenido('registro-b1-1-completado') })
  const player = await abrir(app, 'b1-1')
  // Ajuste coherencia-bloque2 (adaptada): el completado entra en el último ítem, en lectura.
  const lectura = itemEnPantalla(player)
  assert.equal(lectura.node.item, 'b1-1-dificultad')
  const vigente = contenido('registro-b1-1-completado').items.find((i) => i.codigo === 'b1-1-dificultad').respuesta
  lectura.hijo.props.onModificar()
  const edicion = itemEnPantalla(player)
  assert.equal(edicion.vista, 'edicion')
  assert.equal(edicion.hijo.props.edicion.pista, vigente.pista)
  assert.equal(
    edicion.hijo.props.borrador.texto,
    vigente.linea_seguimiento ? `${vigente.primera_respuesta}
${vigente.linea_seguimiento}` : vigente.primera_respuesta,
  )
  assert.deepEqual(copia(edicion.hijo.props.borrador.opciones), vigente.opciones_elegidas.map((o) => ({ codigo: o.codigo })))
  // En edición no hay «Anterior»: el formulario solo recibe «Cancelar».
  edicion.hijo.props.onCancelar()
  assert.equal(itemEnPantalla(player).vista, 'lectura')
  assert.equal(app.requests.filter((r) => r.url.includes('/acciones/registro/')).length, 0)
  player.unmount()
})
