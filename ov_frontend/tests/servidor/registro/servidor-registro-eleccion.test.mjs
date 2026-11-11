import assert from 'node:assert/strict'
import test from 'node:test'
import { copia, elementos, fixtureServidor } from '../../soporte/servidor-ayudas.mjs'
import { contenido } from '../../soporte/servidor-registro-ayudas.mjs'

// Ajuste front de registros (lote 2, §5 y §8): varias «Otra» en una lista, el podio con «Otra», el selector de
// piezas y la opción que cambia la consigna. Los ítems de piezas son los de los fixtures `contenido-*`.
const NODOS = 'src/features/activities/components/nodes'
const de = (tree, nombre) => elementos(tree, (e) => e.type?.name === nombre || e.type === nombre)
const textos = (tree) => {
  const salida = []
  const visitar = (n) => {
    if (typeof n === 'string') salida.push(n)
    else if (Array.isArray(n)) n.forEach(visitar)
    else if (n?.props) visitar(n.props.children)
  }
  visitar(tree)
  return salida.join(' ')
}
// Monta un bloque de elección cuyo `seleccion` sigue lo que el bloque cambia.
function bloque(ruta, item, inicial = []) {
  const app = fixtureServidor()
  const props = { item, pregunta: 'P', seleccion: inicial, onCambiar: (s) => (props.seleccion = copia(s)) }
  const nodo = app.mount(app.load(`${NODOS}/${ruta}.tsx`)[ruta], props)
  return { props, render: () => nodo.render() }
}
// DATO DE PRUEBA: b1-1-logro, de 1 a 2, con «Otra», y b2-4-bien, el podio de tres con «Otra».
const logro = () => contenido('registro-b1-1-a-medias').items[1]
const podio = () => ({
  codigo: 'b2-4-bien', con_llm: true, consigna: null, ecos: [], respuesta: null,
  eleccion: { minima: 3, maxima: 3, ordenada: true, permite_otra: true, etiqueta_otra: null },
  opciones: ['Matemática', 'Comunicación', 'Ciencias', 'Arte'].map((texto) => ({ codigo: texto.toUpperCase(), texto,
    origen: null, grupo: null, exclusiva: false, sin_llm: false, pregunta: null, arranque: null })),
})

test('lista de varias: dos «Otra» con su campo, tope en el máximo y borrado del texto al desmarcar', () => {
  const item = logro()
  assert.equal(item.eleccion.maxima, 2)
  const b = bloque('RegistroEleccionNode', item)
  const chips = () => de(b.render(), 'ChoiceReveal')[0].props
  chips().otra.onAgregar()
  chips().otra.onTexto('OTRA-1', 'Cocinar para muchos')
  assert.equal(chips().otra.puedeAgregar, true)
  chips().otra.onAgregar()
  chips().otra.onTexto('OTRA-2', 'Calmar a mis hermanos')
  assert.deepEqual(b.props.seleccion, [{ codigo: 'OTRA-1', texto: 'Cocinar para muchos' },
    { codigo: 'OTRA-2', texto: 'Calmar a mis hermanos' }])
  // Al llegar al máximo, «+ Otra» se apaga.
  assert.equal(chips().otra.puedeAgregar, false)
  chips().otra.onAgregar()
  assert.equal(b.props.seleccion.length, 2)
  // Al desmarcar una «Otra», su texto se borra; al volver a agregarla, su campo está vacío.
  chips().onAlternar('OTRA-1')
  assert.deepEqual(b.props.seleccion, [{ codigo: 'OTRA-2', texto: 'Calmar a mis hermanos' }])
  chips().otra.onAgregar()
  assert.deepEqual(b.props.seleccion, [{ codigo: 'OTRA-2', texto: 'Calmar a mis hermanos' }, { codigo: 'OTRA-1', texto: '' }])
})

test('ChoiceReveal: cada «Otra» en su fila con su campo; «+ Otra» con borde punteado, apagado en el máximo', () => {
  const app = fixtureServidor()
  const { ChoiceReveal } = app.load(`${NODOS}/ChoiceReveal.tsx`)
  const otra = { etiqueta: 'Otra', puedeAgregar: false, onAgregar: () => {}, onTexto: () => {} }
  const tree = app.mount(ChoiceReveal, {
    opciones: [{ codigo: 'A', texto: 'A' }], reglas: { maxima: 2, exclusivas: [] }, onAlternar: () => {}, otra,
    seleccion: [{ codigo: 'OTRA-1', texto: 'x' }, { codigo: 'OTRA-2', texto: 'y' }],
  }).render()
  const filas = elementos(tree, (e) => e.props?.className === 'sx-choice-other')
  assert.equal(filas.length, 2)
  assert.deepEqual(elementos(tree, (e) => e.type === 'input').map((e) => e.props.value), ['x', 'y'])
  const [agregar] = elementos(tree, (e) => e.type === 'button' && e.props.className.includes('is-otra'))
  assert.equal(agregar.props.disabled, true)
  assert.equal(agregar.props.children, '+ Otra')
})

test('podio con «Otra»: una, dos y tres; el campo sigue al puesto; devolver la ficha borra su texto', () => {
  const b = bloque('RegistroPodioNode', podio())
  const ranking = () => de(b.render(), 'RankingPodium')[0].props
  const campos = () => ranking().bajoPodio.filter(Boolean).map((c) => ({
    rotulo: c.props.children[0].props.children, valor: c.props.children[1].props.value }))
  const escribir = (puesto, texto) =>
    ranking().bajoPodio[puesto].props.children[1].props.onChange({ target: { value: texto } })
  ranking().onChange(['MATEMÁTICA', null, null])
  assert.equal(ranking().otra.codigo(), 'OTRA-1')
  ranking().onChange(['MATEMÁTICA', 'OTRA-1', null])
  escribir(1, 'Arreglar celulares')
  ranking().onChange(['MATEMÁTICA', 'OTRA-1', 'OTRA-2'])
  escribir(2, 'Vender por internet')
  assert.deepEqual(campos(), [{ rotulo: '2.º · ¿Cuál?', valor: 'Arreglar celulares' },
    { rotulo: '3.º · ¿Cuál?', valor: 'Vender por internet' }])
  assert.deepEqual(b.props.seleccion, [{ codigo: 'MATEMÁTICA' }, { codigo: 'OTRA-1', texto: 'Arreglar celulares' },
    { codigo: 'OTRA-2', texto: 'Vender por internet' }])
  // Al intercambiar, la etiqueta del campo sigue al puesto y lo enviado lleva el orden nuevo.
  ranking().onChange(['MATEMÁTICA', 'OTRA-2', 'OTRA-1'])
  assert.deepEqual(campos(), [{ rotulo: '2.º · ¿Cuál?', valor: 'Vender por internet' },
    { rotulo: '3.º · ¿Cuál?', valor: 'Arreglar celulares' }])
  assert.deepEqual(b.props.seleccion.map((o) => o.codigo), ['MATEMÁTICA', 'OTRA-2', 'OTRA-1'])
  // Al devolver una ficha «Otra», su texto se borra.
  ranking().onChange(['MATEMÁTICA', null, 'OTRA-1'])
  assert.deepEqual(b.props.seleccion, [{ codigo: 'MATEMÁTICA' }, { codigo: 'OTRA-1', texto: 'Arreglar celulares' }])
  ranking().onChange(['MATEMÁTICA', 'OTRA-2', 'OTRA-1'])
  assert.equal(b.props.seleccion[1].texto, '')
  // El podio puede llenarse con tres «Otra».
  ranking().onChange(['OTRA-3', 'OTRA-2', 'OTRA-1'])
  assert.equal(ranking().otra.codigo(), undefined)
  assert.equal(campos().length, 3)
  assert.equal(campos()[0].rotulo, '1.º · ¿Cuál?')
})

test('RankingPodium: «+ Otra» entre las fichas y rótulos «2.º lugar» y «3.er lugar»', () => {
  const app = fixtureServidor()
  const { RankingPodium } = app.load(`${NODOS}/RankingPodium.tsx`)
  let elegido
  const tree = app.mount(RankingPodium, { opciones: [{ codigo: 'A', texto: 'A' }], puestos: ['A', null, null],
    etiquetaPrimero: 'Lo más importante', onChange: (p) => (elegido = copia(p)),
    otra: { etiqueta: 'Otra', codigo: () => 'OTRA-1' } }).render()
  const texto = textos(tree)
  assert.ok(texto.includes('2.º lugar') && texto.includes('3.er lugar'))
  const [agregar] = elementos(tree, (e) => e.type === 'button' && e.props.className?.includes('is-otra'))
  agregar.props.onClick()
  assert.deepEqual(elegido, ['A', 'OTRA-1', null])
})

const respalda = () => contenido('registro-b4-1-inicial').items.find((i) => i.codigo === 'b4-1-respalda')
const menos = () => contenido('registro-b4-1-inicial').items.find((i) => i.codigo === 'b4-1-menos')
const cambio = () => contenido('registro-b5-3-inicial').items.find((i) => i.codigo === 'b5-3-cambio')

function selector(item, elegida) {
  const app = fixtureServidor()
  const props = { titulo: '¿Qué parte de ti?', piezas: item.opciones.filter((o) => o.origen), elegida,
    onElegir: (c) => (props.elegido = c) }
  const nodo = app.mount(app.load(`${NODOS}/SelectorPiezas.tsx`).SelectorPiezas, props)
  return { props, render: () => nodo.render() }
}

test('selector de piezas: vacío dice «Elige una»; abre la ventana con los grupos en orden; elegir cierra', () => {
  const s = selector(respalda())
  const boton = () => elementos(s.render(), (e) => e.props?.className?.startsWith?.('sx-selector'))[0]
  assert.ok(textos(boton()).includes('Elige una'))
  const ventana = () => de(s.render(), 'Dialog')[0]
  assert.equal(ventana().props.open, false)
  boton().props.onClick()
  assert.equal(ventana().props.open, true)
  const grupos = elementos(s.render(), (e) => e.props?.className === 'sx-ventana-grupo').map((g) => g.props['aria-label'])
  assert.deepEqual(grupos, [...new Set(respalda().opciones.filter((o) => o.origen).map((o) => o.grupo))])
  const [primera] = elementos(s.render(), (e) => e.props?.className === 'sx-pieza-elegir')
  primera.props.onClick()
  assert.equal(s.props.elegido, respalda().opciones[0].codigo)
  assert.equal(ventana().props.open, false)
  // Ninguna pieza muestra su código.
  assert.ok(!textos(s.render()).includes('INT-I'))
})

test('selector: la pieza elegida con su origen; la de dos líneas, una debajo de otra; un texto largo se recorta', () => {
  const item = respalda()
  const s = selector(item, 'INT-I')
  const cuerpo = elementos(s.render(), (e) => e.props?.className === 'sx-selector-cuerpo')[0]
  const intereses = item.opciones.find((o) => o.codigo === 'INT-I')
  assert.ok(textos(cuerpo).includes(intereses.texto) && textos(cuerpo).includes(intereses.origen))
  const { lineasPieza, recortar } = fixtureServidor().load('src/features/activities/lib/formasEco.ts')
  assert.deepEqual(copia(lineasPieza({ texto: '«a / b»', lineas: ['a', 'b'] })), ['«a»', '«b»'])
  assert.deepEqual(copia(lineasPieza({ texto: 'Matemática' })), ['Matemática'])
  const largo = recortar(`«${'palabra '.repeat(20)}»`, 90)
  assert.ok(largo.recortado && largo.corto.endsWith('…') && largo.corto.length <= 91)
  // En la ventana, un texto largo trae «ver completa» y se abre al tocarlo.
  const largoItem = { ...item, opciones: [{ ...intereses, codigo: 'X', texto: `«${'palabra '.repeat(20)}»` }] }
  const v = selector(largoItem)
  elementos(v.render(), (e) => e.props?.className?.startsWith?.('sx-selector'))[0].props.onClick()
  const [ver] = elementos(v.render(), (e) => e.type === 'button' && e.props.children === 'ver completa')
  ver.props.onClick()
  assert.equal(elementos(v.render(), (e) => e.type === 'button' && e.props.children === 'ver completa').length, 0)
})

test('selector: piezas sin grupo (b5-3) en una sola lista, sin rótulo; con una sola pieza funciona igual', () => {
  const s = selector(cambio())
  elementos(s.render(), (e) => e.props?.className?.startsWith?.('sx-selector'))[0].props.onClick()
  const grupos = elementos(s.render(), (e) => e.props?.className === 'sx-ventana-grupo')
  assert.equal(grupos.length, 1)
  assert.equal(elementos(grupos[0], (e) => e.props?.className === 'sx-eco-rotulo').length, 0)
  const una = { ...cambio(), opciones: cambio().opciones.slice(0, 1) }
  const u = selector(una)
  elementos(u.render(), (e) => e.props?.className?.startsWith?.('sx-selector'))[0].props.onClick()
  elementos(u.render(), (e) => e.props?.className === 'sx-pieza-elegir')[0].props.onClick()
  assert.equal(u.props.elegido, una.opciones[0].codigo)
})

test('ítem de piezas: se marca una sola cosa; la «Otra» y la exclusiva vacían el selector', () => {
  const item = menos()
  const b = bloque('RegistroEleccionNode', item, [{ codigo: 'CUESTA-MATEMATICA' }])
  const arbol = () => b.render()
  assert.equal(de(arbol(), 'SelectorPiezas')[0].props.elegida, 'CUESTA-MATEMATICA')
  // Las fichas de abajo son solo la exclusiva (las piezas van en el selector).
  const chips = () => de(arbol(), 'ChoiceReveal')[0].props
  assert.deepEqual(copia(chips().opciones.map((o) => o.codigo)), ['TODO'])
  chips().otra.onAgregar()
  assert.deepEqual(b.props.seleccion, [{ codigo: 'OTRA', texto: '' }])
  assert.equal(de(arbol(), 'SelectorPiezas')[0].props.elegida, 'OTRA')
  assert.ok(!item.opciones.some((o) => o.codigo === 'OTRA'))
  de(arbol(), 'SelectorPiezas')[0].props.onElegir('INT-I')
  assert.deepEqual(b.props.seleccion, [{ codigo: 'INT-I' }])
  chips().onAlternar('TODO')
  assert.deepEqual(b.props.seleccion, [{ codigo: 'TODO' }])
})

test('ítems de piezas: la exclusiva cambia la pregunta 2 y su arranque, y conserva lo escrito', () => {
  const app = fixtureServidor()
  const { consignaVigente } = app.load('src/lib/servidor/adaptadoresRegistro.ts')
  for (const item of [menos(), cambio()]) {
    const exclusiva = item.opciones.find((o) => o.exclusiva)
    const pieza = item.opciones.find((o) => o.origen)
    assert.equal(consignaVigente(item, [{ codigo: pieza.codigo }]).preguntaTexto, item.consigna.pregunta_texto)
    const conExclusiva = consignaVigente(item, [{ codigo: exclusiva.codigo }])
    assert.equal(conExclusiva.preguntaTexto, exclusiva.pregunta)
    assert.equal(conExclusiva.arranque, exclusiva.arranque)
  }
})

test('b1-7-dia: si alguna opción cambia la pregunta, la pregunta 2 y su caja aparecen al marcar', () => {
  const app = fixtureServidor()
  const { textoVisible } = app.load('src/lib/servidor/adaptadoresRegistro.ts')
  const opcion = (codigo, pregunta = null) => ({ codigo, texto: codigo, origen: null, grupo: null, exclusiva: false,
    sin_llm: false, pregunta, arranque: null })
  // DATO DE PRUEBA: la escala de b1-7-dia, donde solo «Me cuesta imaginarlo» trae su pregunta.
  const dia = { consigna: { pregunta_texto: '¿Qué?' }, opciones: [opcion('CLARO'), opcion('MAS_O_MENOS'),
    opcion('CUESTA', 'Está bien. Cuéntame una sola cosa…')] }
  assert.equal(textoVisible(dia, []), false)
  assert.equal(textoVisible(dia, [{ codigo: 'CLARO' }]), true)
  // Sin opciones que cambien la pregunta, la caja se ve desde el inicio.
  assert.equal(textoVisible({ ...dia, opciones: dia.opciones.slice(0, 2) }, []), true)
  assert.equal(textoVisible({ consigna: dia.consigna, opciones: [] }, []), true)
})
