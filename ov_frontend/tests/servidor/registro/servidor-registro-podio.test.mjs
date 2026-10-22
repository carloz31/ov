import assert from 'node:assert/strict'
import test from 'node:test'
import { copia, elementos, fixtureServidor, jsonServidor } from '../../soporte/servidor-ayudas.mjs'

// F01: podio de «elegir y ordenar top N» con el ítem t-val-orden (lista propia, 3 de 3, ordenada).
const items = jsonServidor('ruta/ruta-items-registro-t-valores')
const orden = items.find((i) => i.codigo === 't-val-orden')
const contenido = JSON.parse(
  (await import('node:fs')).readFileSync('src/data/activities/contenidos/t_valores.json', 'utf8'),
)
const nodo = contenido.nodos.find((n) => n.item === 't-val-orden')

function cargar() {
  const app = fixtureServidor()
  return {
    app,
    podio: app.load('src/features/activities/lib/podio.ts'),
    RankingPodium: app.load('src/features/activities/components/nodes/RankingPodium.tsx').RankingPodium,
    RegistroPodioNode: app.load('src/features/activities/components/nodes/RegistroPodioNode.tsx')
      .RegistroPodioNode,
  }
}
const texto = (tree) =>
  elementos(tree, (e) => typeof e.props?.children === 'string').map((e) => e.props.children)

test('colocar llena el primer puesto libre; devolver e intercambiar respetan el orden; N es configurable', () => {
  const { podio } = cargar()
  let p = podio.puestosDesde([], 3)
  p = podio.colocar(p, 'CREAR')
  p = podio.colocar(p, 'LIBERTAD')
  assert.deepEqual(copia(p), ['CREAR', 'LIBERTAD', null])
  assert.equal(podio.colocar(p, 'CREAR'), p, 'una ficha colocada no se repite')
  p = podio.quitar(p, 0)
  assert.deepEqual(copia(p), [null, 'LIBERTAD', null])
  p = podio.colocar(p, 'SERVIR')
  assert.deepEqual(copia(p), ['SERVIR', 'LIBERTAD', null], 'el hueco liberado es el primero libre')
  p = podio.colocar(p, 'CREAR')
  assert.equal(podio.completo(p), true)
  assert.deepEqual(copia(podio.intercambiar(p, 0, 2)), ['CREAR', 'LIBERTAD', 'SERVIR'])
  assert.equal(podio.colocar(p, 'ESTABILIDAD'), p, 'un podio lleno no admite más')
  assert.deepEqual(copia(podio.puestosDesde(['A'], 5)), ['A', null, null, null, null])
  assert.deepEqual(copia(podio.seleccionDe(['A', null, 'B'])), ['A', 'B'])
})

test('los mensajes de Lumi siguen el estado y el N del podio', () => {
  const { podio } = cargar()
  const unidad = { singular: 'valor', plural: 'valores' }
  assert.equal(
    podio.mensajeLumi([null, null, null], unidad),
    'Arma tu podio: toca los tres valores que más te importan, empezando por el primero.',
  )
  assert.equal(podio.mensajeLumi(['A', null, null], unidad), 'Bien. Te faltan 2 valores.')
  assert.equal(podio.mensajeLumi(['A', 'B', null], unidad), 'Bien. Te falta 1 valor.')
  assert.equal(
    podio.mensajeLumi(['A', 'B', 'C'], unidad),
    '¡Tu podio está listo! Ahora cuéntame por qué elegiste tu primer lugar.',
  )
  assert.match(podio.mensajeLumi([null, null, null, null, null], unidad), /toca los cinco valores/)
})

test('solo la elección ordenada de N fijo y sin «otra» usa el podio', () => {
  const { podio } = cargar()
  assert.equal(podio.esTopN(orden), true)
  for (const i of items.filter((x) => x.codigo !== 't-val-orden')) assert.equal(podio.esTopN(i), false)
  const expectativas = jsonServidor('ruta/ruta-items-registro-t-expectativas')
  assert.ok(expectativas.every((i) => !podio.esTopN(i)))
  assert.equal(podio.esTopN({ ...orden, eleccion: { ...orden.eleccion, minima: 1 } }), false)
})

test('el podio coloca, devuelve y oculta la grilla al completarse; cada puesto dice su posición', () => {
  const { app, RankingPodium } = cargar()
  let puestos = [null, null, null]
  const props = () => ({
    opciones: orden.eleccion.opciones,
    puestos,
    etiquetaPrimero: 'Lo más importante',
    iconos: nodo.podio.iconos,
    onChange: (p) => (puestos = p),
  })
  const vista = app.mount(RankingPodium, props())
  const ficha = (tree, nombre) =>
    elementos(tree, (e) => e.props?.className === 'sx-podium-chip' && e.key === nombre)[0]
  ficha(vista.render(), 'CREAR').props.onClick()
  assert.deepEqual(copia(puestos), ['CREAR', null, null])
  vista.unmount()
  let tree = app.mount(RankingPodium, props()).render()
  // La ficha colocada deja su hueco en la grilla, sin desplazar a las demás.
  assert.equal(ficha(tree, 'CREAR').props.style.visibility, 'hidden')
  const slots = elementos(tree, (e) => e.type === 'button' && /sx-podium-slot/.test(e.props.className))
  assert.equal(slots[0].props['aria-label'], 'Puesto 1: Crear cosas nuevas. Pulsa para quitar')
  assert.equal(slots[1].props['aria-label'], 'Puesto 2: vacío')
  assert.deepEqual(
    texto(tree).filter((t) => /lugar|importante/.test(t)),
    ['Lo más importante', '2º lugar', '3º lugar'],
  )
  slots[0].props.onClick()
  assert.deepEqual(copia(puestos), [null, null, null])
  puestos = ['CREAR', 'LIBERTAD', 'SERVIR']
  tree = app.mount(RankingPodium, props()).render()
  assert.equal(elementos(tree, (e) => e.props?.className === 'sx-podium-chips').length, 0)
  // Arrastrar el puesto 3 sobre el 1 los intercambia.
  const [primero, , tercero] = elementos(
    tree,
    (e) => e.type === 'button' && /sx-podium-slot/.test(e.props.className),
  )
  tercero.props.onDragStart({ dataTransfer: {} })
  primero.props.onDrop({ preventDefault() {} })
  assert.deepEqual(copia(puestos), ['SERVIR', 'LIBERTAD', 'CREAR'])
})

function montarNodo(app, RegistroPodioNode, inicial, guardados = []) {
  return app.mount(RegistroPodioNode, {
    node: nodo,
    item: orden,
    inicial,
    ultimo: false,
    ocupado: false,
    error: '',
    onGuardar: (texto, opciones) => guardados.push({ texto, opciones }),
  })
}
const podioDe = (tree) => elementos(tree, (e) => e.type?.name === 'RankingPodium')[0]
const explicacion = (tree) => elementos(tree, (e) => e.props?.className === 'sx-podium-explain')[0]
const enviar = (tree) => elementos(tree, (e) => e.type === 'form')[0].props.onSubmit({ preventDefault() {} })

test('al completar aparece la explicación del primer lugar; quitar una ficha la oculta sin borrar el texto', () => {
  const { app, RegistroPodioNode } = cargar()
  const vista = montarNodo(app, RegistroPodioNode, { texto: '', opciones: [] })
  let tree = vista.render()
  assert.equal(explicacion(tree), undefined)
  podioDe(tree).props.onChange(['CREAR', 'LIBERTAD', 'ESTABILIDAD'])
  tree = vista.render()
  assert.ok(explicacion(tree))
  assert.ok(texto(tree).includes('¿Por qué «Crear cosas nuevas» es lo más importante para ti?'))
  elementos(tree, (e) => e.type === 'textarea')[0].props.onChange({ target: { value: 'Me gusta inventar' } })
  podioDe(vista.render()).props.onChange([null, 'LIBERTAD', 'ESTABILIDAD'])
  tree = vista.render()
  assert.equal(explicacion(tree), undefined)
  podioDe(tree).props.onChange(['CREAR', 'LIBERTAD', 'ESTABILIDAD'])
  assert.equal(elementos(vista.render(), (e) => e.type === 'textarea')[0].props.value, 'Me gusta inventar')
  vista.unmount()
})

test('cambiar el primer lugar después de escribir avisa sin borrar; editar el texto quita el aviso', () => {
  const { app, RegistroPodioNode } = cargar()
  const vista = montarNodo(app, RegistroPodioNode, { texto: '', opciones: [] })
  podioDe(vista.render()).props.onChange(['CREAR', 'LIBERTAD', 'ESTABILIDAD'])
  elementos(vista.render(), (e) => e.type === 'textarea')[0].props.onChange({
    target: { value: 'Me gusta inventar' },
  })
  const aviso = (tree) => elementos(tree, (e) => e.props?.className === 'sx-podium-warning')[0]
  assert.equal(aviso(vista.render()), undefined)
  podioDe(vista.render()).props.onChange(['LIBERTAD', 'CREAR', 'ESTABILIDAD'])
  let tree = vista.render()
  assert.ok(aviso(tree))
  assert.equal(elementos(tree, (e) => e.type === 'textarea')[0].props.value, 'Me gusta inventar')
  assert.match(texto(tree).join(' '), /¿Por qué «Tener libertad»/)
  elementos(tree, (e) => e.type === 'textarea')[0].props.onChange({ target: { value: 'Me gusta decidir' } })
  assert.equal(aviso(vista.render()), undefined)
  vista.unmount()
})

test('un registro guardado abre con el podio completo y la explicación con su texto', () => {
  const { app, RegistroPodioNode } = cargar()
  const guardado = jsonServidor('ruta/ruta-registro-t-valores-pendiente').respuestas[0]
  const vista = montarNodo(app, RegistroPodioNode, {
    texto: guardado.conversacion[0].texto,
    opciones: guardado.opciones_elegidas,
  })
  const tree = vista.render()
  assert.deepEqual(copia(podioDe(tree).props.puestos), ['CREAR', 'LIBERTAD', 'ESTABILIDAD'])
  assert.equal(elementos(tree, (e) => e.type === 'textarea')[0].props.value, guardado.conversacion[0].texto)
  assert.equal(elementos(tree, (e) => e.props?.className === 'sx-podium-warning').length, 0)
  vista.unmount()
})

test('avanzar sin podio completo o sin texto muestra el error junto al control; el envío no cambia de formato', () => {
  const { app, RegistroPodioNode } = cargar()
  const guardados = []
  const vista = montarNodo(app, RegistroPodioNode, { texto: '', opciones: [] }, guardados)
  enviar(vista.render())
  assert.equal(podioDe(vista.render()).props.error, 'Completa tu podio: te faltan 3 valores.')
  podioDe(vista.render()).props.onChange(['CREAR', 'LIBERTAD', 'ESTABILIDAD'])
  enviar(vista.render())
  let tree = vista.render()
  assert.equal(podioDe(tree).props.error, undefined)
  assert.ok(elementos(explicacion(tree), (e) => e.props?.role === 'alert').length)
  assert.equal(guardados.length, 0)
  elementos(tree, (e) => e.type === 'textarea')[0].props.onChange({ target: { value: '  Crear me mueve  ' } })
  enviar(vista.render())
  // Igual que la elección ordenada anterior: opciones en orden, solo con código, y el texto recortado.
  assert.deepEqual(copia(guardados), [
    {
      texto: 'Crear me mueve',
      opciones: [{ codigo: 'CREAR' }, { codigo: 'LIBERTAD' }, { codigo: 'ESTABILIDAD' }],
    },
  ])
  vista.unmount()
})
