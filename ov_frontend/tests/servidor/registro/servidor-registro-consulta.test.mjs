import assert from 'node:assert/strict'
import test from 'node:test'
import { copia, elementos, esperar, fixtureServidor, jsonServidor } from '../../soporte/servidor-ayudas.mjs'
import { abrir, iniciar } from '../../soporte/servidor-registro-ayudas.mjs'

// F02 (HU-008): un registro cerrado se consulta en el mismo reproductor, precargado con la consolidada y en
// modo lectura; «Modificar» abre el componente de siempre. Cambiar el texto o la elección es editarlo y sigue
// el flujo de la entrega; la pista la dice Lumi en su burbuja.
const porAmpliar = jsonServidor('ruta/ruta-registro-t-valores-por-ampliar')
const consolidadaDe = (item) => porAmpliar.respuestas.find((r) => r.item === item).texto_consolidado
const NODOS = ['RegistroConsignaNode', 'RegistroPodioNode', 'RegistroEleccionNode']
const consigna = (tree) => elementos(tree, (e) => NODOS.includes(e.type?.name))[0]
// DATO DE PRUEBA: la respuesta de editar cuando la edición queda adecuada y cierra el intento.
const edicionCerrada = {
  ...porAmpliar,
  items_por_ampliar: [],
  eventos_registrados: [],
  nuevos_desbloqueos: [],
}

async function consultaValores(opciones = {}) {
  const { app, items } = await iniciar({ actividad: 't-valores', registro: porAmpliar, ...opciones })
  return { app, items, player: await abrir(app, 't-valores') }
}

// Recorre las consignas guardando cada texto (o el mismo de la consolidada) y devuelve la última.
async function recorrer(player, textos = {}) {
  for (;;) {
    const nodo = consigna(player.render())
    if (nodo.props.ultimo) return nodo
    nodo.props.onGuardar(
      textos[nodo.props.item.codigo] ?? nodo.props.inicial.texto,
      nodo.props.inicial.opciones,
    )
    await esperar()
  }
}

test('abre en la primera consigna, sin diálogos, con la consolidada y la pista del ítem por ampliar', async () => {
  const { player } = await consultaValores()
  const tree = player.render()
  assert.equal(elementos(tree, (e) => e.type?.name === 'DialogueBox').length, 0)
  const podio = consigna(tree)
  assert.equal(podio.type.name, 'RegistroPodioNode')
  assert.equal(podio.props.node.id, 't-val-orden')
  assert.deepEqual(copia(podio.props.inicial), {
    texto: consolidadaDe('t-val-orden'),
    opciones: [{ codigo: 'CREAR' }, { codigo: 'LIBERTAD' }, { codigo: 'ESTABILIDAD' }],
  })
  assert.deepEqual(copia(podio.props.consulta), {
    pista: porAmpliar.items_por_ampliar[0].pista,
    original: consolidadaDe('t-val-orden'),
    opcionesOriginales: [{ codigo: 'CREAR' }, { codigo: 'LIBERTAD' }, { codigo: 'ESTABILIDAD' }],
    ordenada: true,
    cambiado: false,
    otrosCambios: false,
  })
  player.unmount()
})

test('en lectura, el podio va marcado y fijo, el texto como cita con «Modificar», y Lumi dice la pista', async () => {
  const { app, player } = await consultaValores()
  const podio = consigna(player.render())
  player.unmount()
  const form = app.mount(podio.type, podio.props)
  let tree = form.render()
  const ranking = elementos(tree, (e) => e.type?.name === 'RankingPodium')[0]
  assert.equal(ranking.props.soloLectura, true)
  assert.deepEqual(copia(ranking.props.puestos), ['CREAR', 'LIBERTAD', 'ESTABILIDAD'])
  const guiado = elementos(tree, (e) => e.type?.name === 'RegistroGuiado')[0]
  // Una sola burbuja de Lumi con la pista resaltada, en lugar de los mensajes del podio.
  assert.equal(guiado.props.lumi.type.name, 'RegistroEco')
  const burbuja = app.mount(guiado.props.lumi.type, guiado.props.lumi.props).render()
  assert.equal(burbuja.type.name, 'RegistroLumi')
  assert.ok(JSON.stringify(burbuja.props.texto).includes('Aquí podrías contar un poco más:'))
  assert.equal(
    elementos(burbuja.props.texto, (e) => e.type === 'strong')[0].props.children,
    porAmpliar.items_por_ampliar[0].pista,
  )
  assert.equal(guiado.props.etiqueta, 'Continuar')
  assert.equal(guiado.props.salida, undefined)
  assert.equal(elementos(tree, (e) => e.type?.name === 'RegistroExplicacion').length, 0)
  const lectura = elementos(tree, (e) => e.type?.name === 'RespuestaConsulta')[0]
  assert.equal(lectura.props.texto, consolidadaDe('t-val-orden'))
  const vistaLectura = app.mount(lectura.type, lectura.props).render()
  assert.equal(
    elementos(vistaLectura, (e) => e.type === 'blockquote')[0].props.children,
    consolidadaDe('t-val-orden'),
  )
  const podioVista = app.mount(ranking.type, ranking.props).render()
  const puestos = elementos(podioVista, (e) => e.props?.className?.startsWith?.('sx-podium-slot'))
  assert.ok(puestos.length === 3 && puestos.every((p) => p.props.disabled === true && !p.props.draggable))
  // «Modificar» abre el podio y la explicación de siempre.
  lectura.props.onModificar()
  tree = form.render()
  assert.equal(elementos(tree, (e) => e.type?.name === 'RankingPodium')[0].props.soloLectura, false)
  assert.equal(elementos(tree, (e) => e.type?.name === 'RegistroExplicacion').length, 1)
  assert.equal(
    elementos(tree, (e) => e.type?.name === 'RegistroGuiado')[0].props.etiqueta,
    'Guardar y continuar',
  )
})

test('sin cambios, la última consigna sale como la pantalla de fin y no edita nada', async () => {
  const { app, player } = await consultaValores()
  const ultima = await recorrer(player)
  assert.equal(ultima.props.node.id, 't-val-breve')
  assert.equal(ultima.props.salida.type.name, 'VolverAlMapa')
  player.unmount()
  const form = app.mount(ultima.type, ultima.props)
  const tree = form.render()
  assert.equal(elementos(tree, (e) => e.type?.name === 'VolverAlMapa').length, 1)
  assert.equal(elementos(tree, (e) => e.type === 'button' && e.props.type === 'submit').length, 0)
  assert.equal(
    app.requests.some((r) => r.url.endsWith('/guardar-borrador') || r.url.endsWith('/registro/editar')),
    false,
  )
})

test('con un texto cambiado, «Entregar cambios» envía solo ese ítem y sigue con el seguimiento y el fin', async () => {
  const { app, player } = await consultaValores({ editar: edicionCerrada })
  const nuevo = 'DATO DE PRUEBA: crear me importa porque invento cosas con mis manos'
  const ultima = await recorrer(player, { 't-val-orden': nuevo })
  assert.equal(ultima.props.consulta.otrosCambios, true)
  // El arnés comparte los efectos entre montajes: el pie se comprueba con su lógica, sin montar la consigna.
  const { pieConsulta } = app.load('src/features/activities/lib/edicionRegistro.ts')
  assert.deepEqual(copia(pieConsulta(ultima.props.consulta, true, false, ultima.props.inicial.texto, [])), {
    etiqueta: 'Entregar cambios',
    salir: false,
  })
  ultima.props.onGuardar(ultima.props.inicial.texto, ultima.props.inicial.opciones)
  // La edición evalúa y luego refresca el camino: dos esperas.
  await esperar()
  const req = app.requests.find((r) => r.url.endsWith('/registro/editar'))
  assert.deepEqual(copia(req.body), {
    cuenta: 'est-ana',
    actividad: 't-valores',
    items: [{ item: 't-val-orden', texto: nuevo }],
  })
  assert.equal(
    app.requests.some((r) => r.url.endsWith('/guardar-borrador')),
    false,
  )
  const seguimiento = elementos(player.render(), (e) => e.type?.name === 'RegistroSeguimiento')[0]
  assert.ok(seguimiento.props.porAmpliar)
  seguimiento.props.onContinuar()
  assert.equal(elementos(player.render(), (e) => e.type?.name === 'FinishScreen').length, 1)
  player.unmount()
})

test('volver a la consolidada deshace el cambio; «Anterior» conserva lo escrito sin guardar borrador', async () => {
  const { player } = await consultaValores()
  let nodo = consigna(player.render())
  nodo.props.onGuardar('DATO DE PRUEBA: otro texto', nodo.props.inicial.opciones)
  await esperar()
  nodo = consigna(player.render())
  assert.equal(nodo.props.consulta.otrosCambios, true)
  nodo.props.onAnterior(nodo.props.inicial.texto, [])
  await esperar()
  nodo = consigna(player.render())
  assert.equal(nodo.props.node.id, 't-val-orden')
  assert.equal(nodo.props.inicial.texto, 'DATO DE PRUEBA: otro texto')
  nodo.props.onGuardar(consolidadaDe('t-val-orden'), nodo.props.inicial.opciones)
  await esperar()
  assert.equal(consigna(player.render()).props.consulta.otrosCambios, false)
  player.unmount()
})

test('un ítem no obligatorio en blanco se lee vacío, con «Modificar», y su primer texto se entrega como edición', async () => {
  // DATO DE PRUEBA: t-val-breve opcional y entregado sin texto.
  const registro = copia(porAmpliar)
  Object.assign(
    registro.respuestas.find((r) => r.item === 't-val-breve'),
    { texto_consolidado: null },
  )
  const { app, items } = await iniciar({ actividad: 't-valores', registro, editar: edicionCerrada })
  items.find((i) => i.codigo === 't-val-breve').obligatorio = false
  const player = await abrir(app, 't-valores')
  const ultima = await recorrer(player)
  assert.deepEqual(copia(ultima.props.consulta), {
    original: '',
    opcionesOriginales: [],
    ordenada: false,
    cambiado: false,
    otrosCambios: false,
  })
  const { anotarCambio, edicionesDe } = app.load('src/features/activities/lib/edicionRegistro.ts')
  const primera = anotarCambio({}, registro, ultima.props.item, 'DATO DE PRUEBA: mi primera respuesta', [])
  assert.deepEqual(copia(edicionesDe(primera)), [
    { item: 't-val-breve', texto: 'DATO DE PRUEBA: mi primera respuesta' },
  ])
  ultima.props.onGuardar('DATO DE PRUEBA: mi primera respuesta', [])
  await esperar()
  assert.deepEqual(copia(app.requests.find((r) => r.url.endsWith('/registro/editar')).body.items), [
    { item: 't-val-breve', texto: 'DATO DE PRUEBA: mi primera respuesta' },
  ])
  player.unmount()
  const tree = app.mount(ultima.type, ultima.props).render()
  const lectura = elementos(tree, (e) => e.type?.name === 'RespuestaConsulta')[0]
  assert.equal(lectura.props.texto, '')
  assert.equal(typeof lectura.props.onModificar, 'function')
  const vista = app.mount(lectura.type, lectura.props).render()
  assert.equal(elementos(vista, (e) => e.type === 'blockquote').length, 0)
})

test('la elección guiada de t-expectativas se consulta con sus tarjetas, marcadas y sin poder cambiarlas', async () => {
  const { app } = await iniciar({ registro: jsonServidor('ruta/ruta-registro-t-expectativas-cerrado') })
  const player = await abrir(app, 't-expectativas')
  const nodo = consigna(player.render())
  assert.equal(nodo.type.name, 'RegistroEleccionNode')
  assert.equal(nodo.props.node.id, 't-exp-ruta')
  player.unmount()
  const tree = app.mount(nodo.type, nodo.props).render()
  const tarjetas = elementos(tree, (e) => e.type?.name === 'ChoiceReveal')[0]
  assert.equal(tarjetas.props.soloLectura, true)
  assert.deepEqual(copia(tarjetas.props.seleccion), [{ codigo: 'UNIVERSIDAD' }])
  // Sin pista, Lumi no habla en la consulta (ni con los mensajes de la elección guiada).
  const guiado = elementos(tree, (e) => e.type?.name === 'RegistroGuiado')[0]
  const sinPista = app.mount(guiado.props.lumi.type, guiado.props.lumi.props).render()
  assert.equal(sinPista.type.name, 'CharacterAvatar')
  const vista = app.mount(tarjetas.type, tarjetas.props).render()
  const universidad = elementos(vista, (e) => e.key === 'UNIVERSIDAD')[0]
  assert.equal(universidad.props['aria-disabled'], true)
  universidad.props.onClick()
  assert.equal(
    app.requests.some((r) => r.url.endsWith('/guardar-borrador')),
    false,
  )
})

test('tras editar, el aviso de ítems por ampliar del drawer se actualiza al volver a abrirlo', async () => {
  let vigente = porAmpliar
  const { app } = await iniciar({ actividad: 't-valores', registro: () => vigente, editar: edicionCerrada })
  const valores = app.load('src/store/servidor/sesion.ts')
  const actividad = valores
    .obtenerEstadoServidor()
    .actividades.datos.flatMap((b) => b.actividades)
    .find((a) => a.codigo === 't-valores')
  actividad.estado = 'COMPLETADA'
  const { RegistroPorAmpliar } = app.load('src/features/activities/components/RegistroPorAmpliar.tsx')
  async function drawer() {
    const vista = app.mount(RegistroPorAmpliar, { codigo: 't-valores' })
    vista.render()
    await esperar()
    const tree = vista.render()
    vista.unmount()
    return tree
  }
  assert.deepEqual(copia((await drawer()).props.filas.map((f) => f.item)), ['t-val-orden'])
  const { editarRegistro } = app.load('src/store/servidor/registro.ts')
  await editarRegistro('t-valores', [{ item: 't-val-orden', texto: 'DATO DE PRUEBA: ampliado' }])
  vigente = { ...porAmpliar, items_por_ampliar: [] }
  assert.equal(await drawer(), null)
})

test('cambiar la elección exige reescribir y la edición envía la elección nueva', async () => {
  const { app } = await iniciar({
    registro: jsonServidor('ruta/ruta-registro-t-expectativas-cerrado'),
    editar: jsonServidor('ruta/ruta-editar-t-expectativas'),
  })
  const { errorConsulta, edicionesDe, anotarCambio, mismaEleccion } = app.load(
    'src/features/activities/lib/edicionRegistro.ts',
  )
  const player = await abrir(app, 't-expectativas')
  const ruta = consigna(player.render())
  const original = ruta.props.consulta.original
  assert.match(errorConsulta(ruta.props.consulta, original, [{ codigo: 'TRABAJAR' }]), /reescribe/)
  assert.equal(
    errorConsulta(ruta.props.consulta, 'DATO DE PRUEBA: ahora trabajar', [{ codigo: 'TRABAJAR' }]),
    '',
  )
  // Sin orden, la misma elección en otro orden no es un cambio.
  assert.equal(mismaEleccion([{ codigo: 'A' }, { codigo: 'B' }], [{ codigo: 'B' }, { codigo: 'A' }]), true)
  assert.equal(
    mismaEleccion([{ codigo: 'A' }, { codigo: 'B' }], [{ codigo: 'B' }, { codigo: 'A' }], true),
    false,
  )
  const registro = jsonServidor('ruta/ruta-registro-t-expectativas-cerrado')
  const cambios = anotarCambio({}, registro, ruta.props.item, original, [{ codigo: 'UNIVERSIDAD' }])
  assert.deepEqual(copia(cambios), {})
  const conTexto = anotarCambio({}, registro, ruta.props.item, 'DATO DE PRUEBA: solo texto', [
    { codigo: 'UNIVERSIDAD' },
  ])
  assert.deepEqual(copia(edicionesDe(conTexto)), [
    { item: 't-exp-ruta', texto: 'DATO DE PRUEBA: solo texto' },
  ])
  ruta.props.onGuardar('DATO DE PRUEBA: ahora quiero trabajar', [{ codigo: 'TRABAJAR' }])
  await esperar()
  let nodo = consigna(player.render())
  while (!nodo.props.ultimo) {
    nodo.props.onGuardar(nodo.props.inicial.texto, nodo.props.inicial.opciones)
    await esperar()
    nodo = consigna(player.render())
  }
  nodo.props.onGuardar(nodo.props.inicial.texto, nodo.props.inicial.opciones)
  await esperar()
  assert.deepEqual(copia(app.requests.find((r) => r.url.endsWith('/registro/editar')).body.items), [
    {
      item: 't-exp-ruta',
      texto: 'DATO DE PRUEBA: ahora quiero trabajar',
      opciones: [{ codigo: 'TRABAJAR' }],
    },
  ])
  player.unmount()
})

test('el eco y la pista de un mismo ítem van en una sola burbuja: primero el recuerdo, luego la pista en negrita', () => {
  const app = fixtureServidor()
  const { RegistroEco } = app.load('src/features/activities/components/nodes/RegistroEco.tsx')
  // DATO DE PRUEBA: un eco disponible y una pista.
  const eco = { estado: 'DISPONIBLE', texto: 'Que estudie', titulo: 'Mis expectativas' }
  const burbuja = app
    .mount(RegistroEco, { eco, pista: '¿Por qué lo crees?', hablanteId: 'companero' })
    .render()
  assert.equal(burbuja.type.name, 'RegistroLumi')
  const texto = JSON.stringify(burbuja.props.texto)
  const recuerdo = texto.indexOf('Lumi recuerda lo que escribiste en «Mis expectativas»: «Que estudie»')
  assert.ok(recuerdo >= 0 && recuerdo < texto.indexOf('Aquí podrías contar un poco más:'))
  const negritas = elementos(burbuja.props.texto, (e) => e.type === 'strong')
  assert.equal(negritas.length, 1)
  assert.equal(negritas[0].props.children, '¿Por qué lo crees?')
  const soloEco = app.mount(RegistroEco, { eco, hablanteId: 'companero' }).render()
  assert.equal(elementos(soloEco.props.texto, (e) => e.type === 'strong').length, 0)
  assert.equal(app.mount(RegistroEco, { hablanteId: 'companero' }).render().type.name, 'CharacterAvatar')
})

test('con la actividad completada, la consulta conserva «Anterior» desde la segunda consigna', async () => {
  const { app } = await iniciar({ actividad: 't-valores', registro: porAmpliar })
  // Como en la app: el registro que se consulta está COMPLETADA en el camino.
  app
    .load('src/store/servidor/sesion.ts')
    .obtenerEstadoServidor()
    .actividades.datos.flatMap((b) => b.actividades)
    .find((a) => a.codigo === 't-valores').estado = 'COMPLETADA'
  const player = await abrir(app, 't-valores')
  let nodo = consigna(player.render())
  assert.equal(nodo.props.onAnterior, undefined)
  nodo.props.onGuardar(nodo.props.inicial.texto, nodo.props.inicial.opciones)
  await esperar()
  nodo = consigna(player.render())
  assert.equal(nodo.props.node.id, 't-val-libre')
  assert.equal(typeof nodo.props.onAnterior, 'function')
  nodo.props.onAnterior(nodo.props.inicial.texto, [])
  await esperar()
  assert.equal(consigna(player.render()).props.node.id, 't-val-orden')
  player.unmount()
})
