// Ajuste vista del ítem de registro: personaje arriba, bloques de elección y de texto en el orden del nodo, chips,
// reacción del personaje bajo las opciones, indicador de cantidad y texto obligatorio. Con los nodos de t-referencia.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { copia, elementos, fixtureServidor, jsonServidor } from '../../soporte/servidor-ayudas.mjs'

const contenido = JSON.parse(readFileSync('src/data/activities/contenidos/ruta/t_referencia.json', 'utf8'))
const nodo = (item) => contenido.nodos.find((n) => n.item === item)

// DATO DE PRUEBA: los ítems de t-referencia (datos/ruta.py) con las opciones ya armadas desde PLANES.
const propias = [
  { codigo: 'NINGUNO_AUN', texto: 'Ninguno todavía', exclusiva: true, pregunta_propia: '¿Qué te falta para elegir uno?', sin_seguimiento: false },
  { codigo: 'PREFIERO_NO', texto: 'Prefiero no decir', exclusiva: true, pregunta_propia: null, sin_seguimiento: true },
  { codigo: 'OTRO_PLAN', texto: 'Uno que aún no anoto', exclusiva: false, pregunta_propia: null, sin_seguimiento: false },
]
const planes = [
  { codigo: 'mtpe-308', texto: 'Enfermería' },
  { codigo: 'mtpe-291', texto: 'Ciencias de la Comunicación' },
]
const eleccion = (cambios) => ({
  fuente: 'REFERENCIA',
  lista: null,
  referencia: null,
  referencia_opciones: 't-ref-refe-planes',
  comun: false,
  minima: 1,
  maxima: 2,
  ordenada: false,
  permite_otra: false,
  opciones: [...planes, ...propias.map(({ codigo, texto }) => ({ codigo, texto }))],
  opciones_propias: propias,
  premarcar_si: null,
  ...cambios,
})
const plan = {
  codigo: 't-refe-plan',
  nombre: 'El plan que elegiste',
  consigna: '¿Cuál de tus planes eliges y por qué?',
  min_caracteres: null,
  obligatorio: true,
  eleccion: eleccion(),
}
const retoma = {
  ...plan,
  codigo: 't-refe-retoma',
  consigna: '¿Sigues con el mismo plan? Cuéntame por qué.',
  eleccion: eleccion({
    maxima: 1,
    referencia: 't-ref-refe-planes',
    opciones: [...planes, { codigo: 'SIN_PLAN', texto: 'Todavía no tengo uno' }],
    opciones_propias: [
      { codigo: 'SIN_PLAN', texto: 'Todavía no tengo uno', exclusiva: true, pregunta_propia: null, sin_seguimiento: true },
    ],
    premarcar_si: { item: 't-refe-plan', opcion: 'PREFIERO_NO', marca: 'SIN_PLAN' },
  }),
}
const duda = { ...plan, codigo: 't-refe-duda', consigna: '¿Qué te gustaría tener claro de tu plan A?', eleccion: null }

function cargar() {
  const app = fixtureServidor()
  const componente = (n) => app.load(`src/features/activities/components/nodes/${n}.tsx`)[n]
  return {
    app,
    componente,
    vista: app.load('src/features/activities/lib/presentacionItem.ts'),
    lib: app.load('src/features/activities/lib/eleccionGuiada.ts'),
    podio: app.load('src/features/activities/lib/podio.ts'),
  }
}
function montar(app, Nodo, node, item, inicial = { texto: '', opciones: [] }, extra = {}) {
  const guardados = []
  const vista = app.mount(Nodo, {
    node,
    item,
    inicial,
    ultimo: false,
    ocupado: false,
    error: '',
    onGuardar: (texto, opciones) => guardados.push({ texto, opciones }),
    ...extra,
  })
  return { vista, guardados }
}
const de = (tree, nombre) => elementos(tree, (e) => e.type?.name === nombre)[0]
const bloques = (tree) =>
  elementos(de(tree, 'RegistroGuiado'), (e) => ['RegistroBloqueEleccion', 'RegistroExplicacion'].includes(e.type?.name))

test('elección primero: el personaje dice lo fijo, cada control lleva su pregunta y los numerales 1 y 2', () => {
  const { app, componente } = cargar()
  const { vista } = montar(app, componente('RegistroEleccionNode'), nodo('t-refe-plan'), plan)
  const tree = vista.render()
  assert.equal(de(tree, 'RegistroGuiado').props.dialogo, 'Miremos tus planes uno por uno.')
  const [primero, segundo] = bloques(tree)
  assert.equal(primero.type.name, 'RegistroBloqueEleccion')
  assert.deepEqual(copia([primero.props.numeral, primero.props.pregunta]), [1, '¿Cuál de tus planes eliges?'])
  assert.equal(primero.props.indicador, 'Elige 1 a 2 · 0/2')
  // El campo se ve antes de elegir, con la entrada como placeholder.
  assert.equal(segundo.type.name, 'RegistroExplicacion')
  assert.deepEqual(
    copia([segundo.props.numeral, segundo.props.pregunta, segundo.props.entrada]),
    [2, '¿Qué te atrae de ese plan?', 'Me atrae porque…'],
  )
  vista.unmount()
})

test('texto primero: el bloque de texto va antes y los numerales se invierten; el guardado no cambia', () => {
  const { app, componente } = cargar()
  const node = { ...nodo('t-refe-plan'), orden: 'texto-primero' }
  const { vista, guardados } = montar(app, componente('RegistroEleccionNode'), node, plan)
  let tree = vista.render()
  const [primero, segundo] = bloques(tree)
  assert.deepEqual(copia([primero.type.name, primero.props.numeral]), ['RegistroExplicacion', 1])
  assert.deepEqual(copia([segundo.type.name, segundo.props.numeral]), ['RegistroBloqueEleccion', 2])
  primero.props.onTexto('Me gusta cuidar a otros')
  de(vista.render(), 'ChoiceReveal').props.onAlternar('mtpe-308')
  de(vista.render(), 'RegistroGuiado').props.onEnviar()
  assert.deepEqual(copia(guardados), [{ texto: 'Me gusta cuidar a otros', opciones: [{ codigo: 'mtpe-308' }] }])
  vista.unmount()
})

test('una opción con pregunta propia cambia la pregunta del texto y su entrada; al desmarcarla, vuelve', () => {
  const { app, componente } = cargar()
  const { vista } = montar(app, componente('RegistroEleccionNode'), nodo('t-refe-plan'), plan)
  const texto = () => de(vista.render(), 'RegistroExplicacion').props
  de(vista.render(), 'ChoiceReveal').props.onAlternar('NINGUNO_AUN')
  assert.equal(texto().pregunta, '¿Qué te falta para elegir uno?')
  // Sin entrada propia, la entrada del ítem ya no encaja: el campo pasa a una libre.
  assert.equal(texto().entrada, 'Escribe aquí…')
  de(vista.render(), 'ChoiceReveal').props.onAlternar('NINGUNO_AUN')
  assert.equal(texto().pregunta, '¿Qué te atrae de ese plan?')
  assert.equal(texto().entrada, 'Me atrae porque…')
  de(vista.render(), 'ChoiceReveal').props.onAlternar('OTRO_PLAN')
  assert.equal(texto().entrada, 'El plan es… y me atrae porque…')
  vista.unmount()
})

test('una opción sin seguimiento deja el texto opcional con su pregunta genérica', () => {
  const { app, componente } = cargar()
  const { vista, guardados } = montar(app, componente('RegistroEleccionNode'), nodo('t-refe-plan'), plan)
  de(vista.render(), 'ChoiceReveal').props.onAlternar('PREFIERO_NO')
  assert.equal(de(vista.render(), 'RegistroExplicacion').props.pregunta, 'Si quieres, cuéntame un poco más')
  de(vista.render(), 'RegistroGuiado').props.onEnviar()
  assert.deepEqual(copia(guardados), [{ texto: '', opciones: [{ codigo: 'PREFIERO_NO' }] }])
  vista.unmount()
})

test('ningún ítem se guarda con el texto vacío, tenga o no criterio', () => {
  const { app, componente } = cargar()
  const { vista, guardados } = montar(app, componente('RegistroEleccionNode'), nodo('t-refe-plan'), plan)
  de(vista.render(), 'ChoiceReveal').props.onAlternar('mtpe-308')
  de(vista.render(), 'RegistroGuiado').props.onEnviar()
  assert.equal(guardados.length, 0)
  assert.equal(de(vista.render(), 'RegistroExplicacion').props.error, 'Escribe al menos 1 caracteres.')
  vista.unmount()
  // Un ítem de solo texto: el personaje, un bloque sin numeral y el mismo rechazo.
  const t = montar(app, componente('RegistroConsignaNode'), nodo('t-refe-duda'), duda)
  const tree = t.vista.render()
  assert.equal(de(tree, 'RegistroGuiado').props.dialogo, 'Una última cosa.')
  const [solo, ...resto] = bloques(tree)
  assert.equal(resto.length, 0)
  assert.equal(solo.props.numeral, undefined)
  assert.equal(solo.props.entrada, 'Me gustaría saber…')
  de(tree, 'RegistroGuiado').props.onEnviar()
  assert.equal(t.guardados.length, 0)
  assert.equal(de(t.vista.render(), 'RegistroGuiado').props.error, 'Escribe al menos 1 caracteres.')
  t.vista.unmount()
})

test('el indicador: «Elige 1», «Ordena tus 3» y el contador solo con máximo mayor que 1', () => {
  const { vista } = cargar()
  assert.equal(vista.indicadorEleccion({ minima: 1, maxima: 1 }, 1), 'Elige 1')
  assert.equal(vista.indicadorEleccion({ minima: 1, maxima: 3 }, 2), 'Elige 1 a 3 · 2/3')
  assert.equal(vista.indicadorEleccion({ minima: 2, maxima: 2 }, 1), 'Elige 2 · 1/2')
  assert.equal(vista.indicadorEleccion({ minima: 3, maxima: 3 }, 0, true), 'Ordena tus 3')
})

test('la reacción: nada sin marcar; `inicio` solo con lo premarcado intacto; `una` al elegir', () => {
  const { lib, podio } = cargar()
  const mensajes = { inicio: 'Tu plan llega marcado.', una: 'Anotado.' }
  const reglas = { maxima: 1, exclusivas: ['SIN_PLAN'] }
  assert.equal(lib.mensajeEleccion(mensajes, [], reglas, false), undefined)
  assert.equal(lib.mensajeEleccion(mensajes, [{ codigo: 'mtpe-308' }], reglas, false), 'Anotado.')
  const premarcadas = ['SIN_PLAN']
  assert.equal(lib.mensajeEleccion(mensajes, [{ codigo: 'SIN_PLAN' }], reglas, false, premarcadas), 'Tu plan llega marcado.')
  assert.equal(lib.mensajeEleccion(mensajes, [{ codigo: 'mtpe-291' }], reglas, false, premarcadas), 'Anotado.')
  // El podio vacío no reacciona; a medias y completo, sí.
  const unidad = { singular: 'valor', plural: 'valores' }
  assert.equal(podio.mensajeLumi([null, null, null], unidad), undefined)
  assert.equal(podio.mensajeLumi(['A', null, null], unidad), 'Bien. Te faltan 2 valores.')
  assert.match(podio.mensajeLumi(['A', 'B', 'C'], unidad), /^¡Tu podio está listo!/)
})

test('el premarcado llega marcado, con su reacción bajo las opciones; solo lo de la vez pasada lleva etiqueta', () => {
  const { app, componente } = cargar()
  const inicial = { texto: '', opciones: [{ codigo: 'mtpe-308' }] }
  const { vista } = montar(app, componente('RegistroEleccionNode'), nodo('t-refe-retoma'), retoma, inicial, {
    anteriores: [{ codigo: 'mtpe-308' }],
    premarcadas: [{ codigo: 'mtpe-308' }],
  })
  const eleccionVista = () => de(vista.render(), 'ChoiceReveal').props
  assert.equal(eleccionVista().reaccion.props.texto, 'Tu plan llega marcado. Cámbialo si hoy es otro.')
  assert.equal(eleccionVista().reaccion.props.reaccion, true)
  eleccionVista().onAlternar('mtpe-291')
  assert.equal(eleccionVista().reaccion.props.texto, 'Anotado. Ahora cuéntame.')
  vista.unmount()
  const ChoiceReveal = componente('ChoiceReveal')
  const chips = app.mount(ChoiceReveal, {
    opciones: retoma.eleccion.opciones,
    seleccion: [{ codigo: 'mtpe-291' }],
    reglas: { maxima: 1, exclusivas: ['SIN_PLAN'] },
    anteriores: ['mtpe-308'],
    etiquetaAnterior: 'La vez pasada',
    onAlternar() {},
    onTextoOtra() {},
  })
  const tree = chips.render()
  const chip = (codigo) => elementos(tree, (e) => e.key === codigo)[0]
  // La etiqueta de la vez pasada va dentro del chip; lo elegido ahora lleva solo el ✓ (el chip no cambia de ancho).
  assert.ok(elementos(chip('mtpe-308'), (e) => e.props?.children === 'La vez pasada').length)
  assert.equal(elementos(chip('mtpe-291'), (e) => e.props?.className === 'sx-choice-badge').length, 0)
  chips.unmount()
})

test('chips: la exclusiva va en una fila aparte y desmarca las demás; «+ Otra» abre su campo bajo las opciones', () => {
  const { app, componente, lib } = cargar()
  const ChoiceReveal = componente('ChoiceReveal')
  const reglas = { maxima: 2, exclusivas: ['NINGUNO_AUN', 'PREFIERO_NO'] }
  const props = (seleccion) => ({
    opciones: [...plan.eleccion.opciones, { codigo: 'OTRA', texto: 'Otra' }],
    seleccion,
    reglas,
    onAlternar() {},
    onTextoOtra() {},
  })
  let vista = app.mount(ChoiceReveal, props([]))
  let tree = vista.render()
  const filas = elementos(tree, (e) => /\bsx-chips\b/.test(e.props?.className ?? ''))
  assert.equal(filas.length, 2)
  const enFila = (fila) => elementos(fila, (e) => e.props?.role === 'button').map((e) => e.key)
  assert.deepEqual(copia(enFila(filas[0])), ['mtpe-308', 'mtpe-291', 'OTRO_PLAN', 'OTRA'])
  assert.deepEqual(copia(enFila(filas[1])), ['NINGUNO_AUN', 'PREFIERO_NO'])
  assert.match(elementos(tree, (e) => e.key === 'OTRA')[0].props.className, /is-otra/)
  vista.unmount()
  const resultado = lib.alternar([{ codigo: 'mtpe-308' }, { codigo: 'mtpe-291' }], 'NINGUNO_AUN', reglas)
  assert.deepEqual(copia(resultado.seleccion), [{ codigo: 'NINGUNO_AUN' }])
  vista = app.mount(ChoiceReveal, props([{ codigo: 'OTRA', texto: 'Diseño' }]))
  tree = vista.render()
  const campo = elementos(tree, (e) => e.props?.['aria-label'] === '¿Cuál?')[0]
  assert.equal(campo.props.value, 'Diseño')
  // El campo de «Otra» no está dentro de ningún chip.
  assert.equal(elementos(elementos(tree, (e) => e.key === 'OTRA')[0], (e) => e === campo).length, 0)
  vista.unmount()
})

test('podio: «Ordena tus 3», el campo visible desde el inicio y sin reacción con el podio vacío', () => {
  const { app, componente } = cargar()
  const valores = jsonServidor('ruta/ruta-items-registro-t-valores').find((i) => i.codigo === 't-val-orden')
  const nodoValores = JSON.parse(readFileSync('src/data/activities/contenidos/ruta/t_valores.json', 'utf8')).nodos.find(
    (n) => n.item === 't-val-orden',
  )
  const { vista } = montar(app, componente('RegistroPodioNode'), nodoValores, valores)
  const tree = vista.render()
  const [eleccionBloque, textoBloque] = bloques(tree)
  assert.equal(eleccionBloque.props.indicador, `Ordena tus ${valores.eleccion.maxima}`)
  assert.equal(textoBloque.type.name, 'RegistroExplicacion')
  assert.equal(de(tree, 'RegistroPersonaje').props.texto, undefined)
  vista.unmount()
})

test('el marco: sin `dialogo` no hay personaje arriba; el pie lleva la leyenda y «Siguiente» o «Entregar»', () => {
  const { app, componente } = cargar()
  const Personaje = componente('RegistroPersonaje')
  assert.equal(app.mount(Personaje, {}).render(), null)
  const Guiado = componente('RegistroGuiado')
  const pie = (ultimo) =>
    app.mount(Guiado, { ultimo, ocupado: false, error: '', onEnviar() {}, children: null }).render()
  const textos = (tree) =>
    elementos(tree, (e) => typeof e.props?.children === 'string' || Array.isArray(e.props?.children))
      .flatMap((e) => [e.props.children].flat())
      .filter((t) => typeof t === 'string')
  assert.ok(textos(pie(false)).includes('Lo ven tú y tu orientadora'))
  assert.ok(textos(pie(false)).includes('Siguiente'))
  assert.ok(textos(pie(true)).includes('Entregar'))
})
