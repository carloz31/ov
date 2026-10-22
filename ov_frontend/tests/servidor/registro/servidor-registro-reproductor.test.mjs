import assert from 'node:assert/strict'
import test from 'node:test'
import { copia, elementos, esperar, jsonServidor } from '../../soporte/servidor-ayudas.mjs'
import { abrir, iniciar } from '../../soporte/servidor-registro-ayudas.mjs'

// F01: el Camino abre los registros de T1 con sus ítems y lo guardado en el servidor.
const consigna = (tree) =>
  elementos(tree, (e) =>
    ['RegistroConsignaNode', 'RegistroPodioNode', 'RegistroEleccionNode'].includes(e.type?.name),
  )[0]

test('el Camino abre un registro con el reproductor de registros del servidor', async () => {
  const { app } = await iniciar({ ruta: '/student/missions?actividad=t-expectativas' })
  const screen = app.mount(app.load('src/pages/student/CaminoScreen.tsx').CaminoScreen, {})
  assert.equal(elementos(screen.render(), (e) => e.type?.name === 'RegistroServidorPlayer').length, 1)
  screen.unmount()
})

test('retoma en la posición guardada con el texto y las opciones del borrador, incluida «otra»', async () => {
  const { app, items } = await iniciar({
    registro: jsonServidor('ruta/ruta-registro-t-expectativas-borrador'),
  })
  const player = await abrir(app, 't-expectativas')
  const nodo = consigna(player.render())
  assert.equal(nodo.type.name, 'RegistroEleccionNode')
  assert.equal(nodo.props.node.id, 't-exp-ruta')
  assert.equal(nodo.props.item.consigna, items[0].consigna)
  assert.equal(nodo.props.ultimo, false)
  assert.deepEqual(copia(nodo.props.inicial), {
    texto: 'DATO DE PRUEBA: borrador a medias',
    opciones: [{ codigo: 'INSTITUTO' }, { codigo: 'OTRA', texto: 'Viajar un año' }],
  })
  player.unmount()
  const form = app.mount(nodo.type, nodo.props)
  const tree = form.render()
  const lista = elementos(tree, (e) => e.type?.name === 'ChoiceReveal')[0]
  assert.equal(
    elementos(tree, (e) => e.type?.name === 'RegistroExplicacion')[0].props.texto,
    'DATO DE PRUEBA: borrador a medias',
  )
  form.unmount()
  const opciones = app.mount(lista.type, lista.props).render()
  assert.equal(
    elementos(opciones, (e) => e.props?.['aria-label'] === '¿Cuál?')[0].props.value,
    'Viajar un año',
  )
})

test('«Guardar y continuar» guarda el borrador con la posición del nodo siguiente y avanza', async () => {
  const { app } = await iniciar()
  const player = await abrir(app, 't-expectativas')
  let tree = player.render()
  // Sin borradores empieza en el diálogo de entrada.
  elementos(tree, (e) => e.type?.name === 'DialogueBox')[0].props.onContinue()
  const nodo = consigna(player.render())
  assert.equal(nodo.props.node.id, 't-exp-ruta')
  nodo.props.onGuardar('Quiero estudiar', [{ codigo: 'UNIVERSIDAD' }])
  await esperar()
  const req = app.requests.find((r) => r.url.endsWith('/guardar-borrador'))
  assert.deepEqual(copia(req.body), {
    cuenta: 'est-ana',
    actividad: 't-expectativas',
    item: 't-exp-ruta',
    texto: 'Quiero estudiar',
    opciones: [{ codigo: 'UNIVERSIDAD' }],
    posicion: 't-exp-apoyo',
  })
  tree = player.render()
  assert.equal(consigna(tree).props.node.id, 't-exp-apoyo')
  player.unmount()
})

test('la elección ordenada numera las opciones en el orden elegido y no deja pasar de la máxima', async () => {
  const { app, items } = await iniciar({ actividad: 't-valores' })
  const { RegistroConsignaNode } = app.load(
    'src/features/activities/components/nodes/RegistroConsignaNode.tsx',
  )
  const { RegistroOpciones } = app.load('src/features/activities/components/nodes/RegistroOpciones.tsx')
  let guardado
  const form = app.mount(RegistroConsignaNode, {
    node: {
      id: 't-val-orden',
      tipo: 'consigna',
      item: 't-val-orden',
      premisa: '',
      entregable: { tipo: 'texto' },
    },
    item: items[0],
    inicial: { texto: '', opciones: [] },
    ultimo: false,
    ocupado: false,
    error: '',
    onGuardar: (texto, opciones) => (guardado = { texto, opciones }),
  })
  const opciones = () => {
    const el = elementos(form.render(), (e) => e.type === RegistroOpciones)[0]
    return { el, tree: app.mount(RegistroOpciones, el.props).render() }
  }
  for (const codigo of ['CREAR', 'LIBERTAD', 'ESTABILIDAD']) {
    const { tree } = opciones()
    const label = elementos(tree, (e) => e.key === codigo)[0]
    elementos(label, (e) => e.type === 'input')[0].props.onChange()
  }
  const { el, tree } = opciones()
  assert.deepEqual(copia(el.props.selection), [
    { codigo: 'CREAR' },
    { codigo: 'LIBERTAD' },
    { codigo: 'ESTABILIDAD' },
  ])
  assert.equal(elementos(tree, (e) => e.type === 'legend')[0].props.children, 'Elige y ordena 3')
  assert.deepEqual(
    elementos(tree, (e) => e.props?.className === 'sx-submission-order').map((e) => e.props.children),
    [1, 3, 2],
  )
  const servir = elementos(elementos(tree, (e) => e.key === 'SERVIR')[0], (e) => e.type === 'input')[0]
  assert.equal(servir.props.disabled, true)
  // Sin texto en un ítem obligatorio no se guarda.
  elementos(form.render(), (e) => e.type === 'form')[0].props.onSubmit({ preventDefault() {} })
  assert.equal(guardado, undefined)
  elementos(form.render(), (e) => e.type === 'textarea')[0].props.onChange({
    target: { value: 'Crear me mueve' },
  })
  elementos(form.render(), (e) => e.type === 'form')[0].props.onSubmit({ preventDefault() {} })
  assert.deepEqual(copia(guardado), {
    texto: 'Crear me mueve',
    opciones: [{ codigo: 'CREAR' }, { codigo: 'LIBERTAD' }, { codigo: 'ESTABILIDAD' }],
  })
})

test('t-valores se responde con el podio y envía el mismo borrador que la elección ordenada', async () => {
  const { app } = await iniciar({ actividad: 't-valores' })
  const player = await abrir(app, 't-valores')
  elementos(player.render(), (e) => e.type?.name === 'DialogueBox')[0].props.onContinue()
  const tree = player.render()
  const podio = consigna(tree)
  assert.equal(podio.type.name, 'RegistroPodioNode')
  assert.equal(podio.props.node.id, 't-val-orden')
  podio.props.onGuardar('Crear me mueve', [
    { codigo: 'CREAR' },
    { codigo: 'LIBERTAD' },
    { codigo: 'ESTABILIDAD' },
  ])
  await esperar()
  // Mismo cuerpo que generaba la lista numerada (y que exporta ruta-borrador-t-valores en el backend).
  assert.deepEqual(copia(app.requests.find((r) => r.url.endsWith('/guardar-borrador')).body), {
    cuenta: 'est-ana',
    actividad: 't-valores',
    item: 't-val-orden',
    texto: 'Crear me mueve',
    opciones: [{ codigo: 'CREAR' }, { codigo: 'LIBERTAD' }, { codigo: 'ESTABILIDAD' }],
    posicion: 't-val-libre',
  })
  player.unmount()
})
