import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { copia, elementos, fixtureServidor, jsonServidor } from '../../soporte/servidor-ayudas.mjs'

// F01: elección guiada «elegir sin orden + explicar» con Ruta (1 a 2, «Otra», «Aún no lo sé») y Apoyo (1).
const items = jsonServidor('ruta/ruta-items-registro-t-expectativas')
const ruta = items.find((i) => i.codigo === 't-exp-ruta')
const apoyo = items.find((i) => i.codigo === 't-exp-apoyo')
const contenido = JSON.parse(readFileSync('src/data/activities/contenidos/t_expectativas.json', 'utf8'))
const nodoRuta = contenido.nodos.find((n) => n.item === 't-exp-ruta')
const nodoApoyo = contenido.nodos.find((n) => n.item === 't-exp-apoyo')
const reglasRuta = { maxima: 2, exclusivas: ['AUN_NO_SE'] }

function cargar() {
  const app = fixtureServidor()
  const componente = (n) => app.load(`src/features/activities/components/nodes/${n}.tsx`)[n]
  return { app, lib: app.load('src/features/activities/lib/eleccionGuiada.ts'), componente }
}
const codigos = (s) => copia(s.map((o) => o.codigo))

test('alternar elige y quita, bloquea la tercera sin reemplazar y con máxima 1 actúa como radio', () => {
  const { lib } = cargar()
  let r = lib.alternar([], 'UNIVERSIDAD', reglasRuta)
  r = lib.alternar(r.seleccion, 'EMPRENDER', reglasRuta)
  assert.deepEqual(codigos(r.seleccion), ['UNIVERSIDAD', 'EMPRENDER'])
  const tercera = lib.alternar(r.seleccion, 'TRABAJAR', reglasRuta)
  assert.equal(tercera.bloqueada, true)
  assert.equal(tercera.seleccion, r.seleccion)
  assert.deepEqual(codigos(lib.alternar(r.seleccion, 'UNIVERSIDAD', reglasRuta).seleccion), ['EMPRENDER'])
  const radio = { maxima: 1, exclusivas: [] }
  assert.deepEqual(codigos(lib.alternar([{ codigo: 'FAMILIA' }], 'AMIGOS', radio).seleccion), ['AMIGOS'])
})

test('«Aún no lo sé» es exclusiva en ambos sentidos', () => {
  const { lib } = cargar()
  const dos = [{ codigo: 'UNIVERSIDAD' }, { codigo: 'EMPRENDER' }]
  assert.deepEqual(codigos(lib.alternar(dos, 'AUN_NO_SE', reglasRuta).seleccion), ['AUN_NO_SE'])
  assert.deepEqual(codigos(lib.alternar([{ codigo: 'AUN_NO_SE' }], 'TRABAJAR', reglasRuta).seleccion), [
    'TRABAJAR',
  ])
})

test('la pregunta nombra lo elegido en minúsculas, usa «Otra» escrita, la exclusiva y la propia de cada opción', () => {
  const { lib } = cargar()
  const opciones = [...ruta.eleccion.opciones, { codigo: 'OTRA', texto: 'Otra' }]
  const p = (sel) => lib.preguntaEleccion(nodoRuta.eleccion, sel, opciones, ['AUN_NO_SE'])
  assert.equal(p([{ codigo: 'UNIVERSIDAD' }]), '¿Por qué te atrae estudiar en una universidad?')
  assert.equal(
    p([{ codigo: 'UNIVERSIDAD' }, { codigo: 'EMPRENDER' }]),
    '¿Por qué te atrae estudiar en una universidad y emprender un negocio?',
  )
  assert.equal(
    p([{ codigo: 'TRABAJAR' }, { codigo: 'OTRA', texto: 'Viajar un año' }]),
    '¿Por qué te atrae trabajar y viajar un año?',
  )
  assert.equal(p([{ codigo: 'AUN_NO_SE' }]), '¿Qué te hace dudar o qué te gustaría descubrir?')
  const pa = (codigo) => lib.preguntaEleccion(nodoApoyo.eleccion, [{ codigo }], apoyo.eleccion.opciones, [])
  assert.equal(pa('FAMILIA'), '¿Cómo te apoya tu familia? Cuenta un ejemplo.')
  assert.equal(pa('DOCENTES'), '¿Cómo te apoyan tus docentes? Cuenta un ejemplo.')
  assert.equal(pa('AMIGOS'), '¿Cómo te apoyan tus amigos? Cuenta un ejemplo.')
})

test('los mensajes de Lumi siguen el estado, incluido el intento de una tercera ruta', () => {
  const { lib } = cargar()
  const m = (sel, bloqueada = false) =>
    lib.mensajeEleccion(nodoRuta.eleccion.mensajes, sel, reglasRuta, bloqueada)
  assert.match(m([]), /^Llegaste a una encrucijada/)
  assert.equal(m([{ codigo: 'TRABAJAR' }]), 'Buena elección. Si quieres, puedes sumar una ruta más.')
  const dos = [{ codigo: 'TRABAJAR' }, { codigo: 'EMPRENDER' }]
  assert.equal(m(dos), 'Dos rutas en el mapa. Cuéntame qué te atrae de ellas.')
  assert.equal(m(dos, true), 'Ya elegiste dos rutas. Quita una para cambiar.')
  assert.equal(m([{ codigo: 'AUN_NO_SE' }]), 'Está bien no saberlo todavía. Para eso está este camino.')
})

test('las tarjetas son botones con aria-pressed; «Otra» muestra su campo y escribir no alterna la tarjeta', () => {
  const { app, componente } = cargar()
  const ChoiceReveal = componente('ChoiceReveal')
  const alternadas = []
  const props = (seleccion) => ({
    opciones: [...ruta.eleccion.opciones, { codigo: 'OTRA', texto: 'Otra' }],
    seleccion,
    reglas: reglasRuta,
    etiquetaElegida: 'Tu ruta',
    iconos: nodoRuta.eleccion.iconos,
    onAlternar: (c) => alternadas.push(c),
    onTextoOtra() {},
  })
  let vista = app.mount(ChoiceReveal, props([]))
  let tree = vista.render()
  const tarjetas = elementos(tree, (e) => e.props?.role === 'button')
  assert.equal(tarjetas.length, 6)
  assert.ok(tarjetas.every((t) => t.props.tabIndex === 0 && t.props['aria-pressed'] === false))
  assert.equal(elementos(tree, (e) => e.props?.['aria-label'] === '¿Cuál?').length, 0)
  tarjetas[1].props.onKeyDown({ key: ' ', preventDefault() {} })
  assert.deepEqual(alternadas, ['INSTITUTO'])
  vista.unmount()
  vista = app.mount(ChoiceReveal, props([{ codigo: 'TRABAJAR' }, { codigo: 'OTRA', texto: 'Viajar' }]))
  tree = vista.render()
  const elegida = elementos(tree, (e) => e.key === 'TRABAJAR')[0]
  assert.equal(elegida.props['aria-pressed'], true)
  assert.ok(elementos(elegida, (e) => e.props?.children === 'Tu ruta').length)
  // Con el máximo, las no elegidas se atenúan pero siguen pulsables.
  assert.match(elementos(tree, (e) => e.key === 'UNIVERSIDAD')[0].props.className, /is-dimmed/)
  const campo = elementos(tree, (e) => e.props?.['aria-label'] === '¿Cuál?')[0]
  assert.equal(campo.props.value, 'Viajar')
  let detenido = 0
  campo.props.onClick({ stopPropagation: () => detenido++ })
  campo.props.onKeyDown({ key: ' ', stopPropagation: () => detenido++ })
  assert.equal(detenido, 2)
  assert.deepEqual(alternadas, ['INSTITUTO'])
  vista.unmount()
})

function montar(app, Nodo, nodo, item, inicial, guardados = []) {
  return app.mount(Nodo, {
    node: nodo,
    item,
    inicial,
    ultimo: false,
    ocupado: false,
    error: '',
    onGuardar: (texto, opciones) => guardados.push({ texto, opciones }),
  })
}
const de = (tree, nombre) => elementos(tree, (e) => e.type?.name === nombre)[0]

test('la explicación aparece al elegir y se oculta al vaciar, conservando el texto', () => {
  const { app, componente } = cargar()
  const vista = montar(app, componente('RegistroEleccionNode'), nodoRuta, ruta, { texto: '', opciones: [] })
  let tree = vista.render()
  assert.equal(de(tree, 'RegistroExplicacion'), undefined)
  assert.match(de(tree, 'RegistroGuiado').props.mensaje, /encrucijada/)
  de(tree, 'ChoiceReveal').props.onAlternar('UNIVERSIDAD')
  tree = vista.render()
  de(tree, 'RegistroExplicacion').props.onTexto('Quiero investigar')
  de(vista.render(), 'ChoiceReveal').props.onAlternar('UNIVERSIDAD')
  assert.equal(de(vista.render(), 'RegistroExplicacion'), undefined)
  de(vista.render(), 'ChoiceReveal').props.onAlternar('EMPRENDER')
  tree = vista.render()
  assert.equal(de(tree, 'RegistroExplicacion').props.texto, 'Quiero investigar')
  assert.equal(de(tree, 'RegistroExplicacion').props.pregunta, '¿Por qué te atrae emprender un negocio?')
  vista.unmount()
})

test('un registro guardado abre con sus rutas, «Otra» escrita y la explicación con su texto', () => {
  const { app, componente } = cargar()
  const guardado = jsonServidor('ruta/ruta-registro-t-expectativas-borrador').respuestas[0]
  const vista = montar(app, componente('RegistroEleccionNode'), nodoRuta, ruta, {
    texto: guardado.conversacion[0].texto,
    opciones: guardado.opciones_elegidas,
  })
  const tree = vista.render()
  assert.deepEqual(copia(de(tree, 'ChoiceReveal').props.seleccion), guardado.opciones_elegidas)
  assert.equal(de(tree, 'RegistroExplicacion').props.texto, guardado.conversacion[0].texto)
  assert.equal(
    de(tree, 'RegistroExplicacion').props.pregunta,
    '¿Por qué te atrae estudiar en un instituto y viajar un año?',
  )
  vista.unmount()
})

test('avanzar valida selección, «Otra» y texto junto a cada control; el envío es igual al de la consigna anterior', () => {
  const { app, componente } = cargar()
  const guardados = []
  const vista = montar(
    app,
    componente('RegistroEleccionNode'),
    nodoRuta,
    ruta,
    { texto: '', opciones: [] },
    guardados,
  )
  const enviar = () => de(vista.render(), 'RegistroGuiado').props.onEnviar()
  enviar()
  assert.equal(de(vista.render(), 'ChoiceReveal').props.error, 'Elige al menos una ruta.')
  de(vista.render(), 'ChoiceReveal').props.onAlternar('TRABAJAR')
  de(vista.render(), 'ChoiceReveal').props.onAlternar('OTRA')
  enviar()
  let tree = vista.render()
  assert.equal(de(tree, 'ChoiceReveal').props.error, undefined)
  assert.equal(de(tree, 'ChoiceReveal').props.errorOtra, 'Escribe cuál es tu otra ruta.')
  assert.equal(de(tree, 'RegistroExplicacion').props.error, 'Escribe al menos 1 caracteres.')
  de(tree, 'ChoiceReveal').props.onTextoOtra('  Viajar un año ')
  de(vista.render(), 'RegistroExplicacion').props.onTexto(' Quiero conocer el mundo ')
  enviar()
  assert.equal(guardados.length, 1)
  vista.unmount()
  // La consigna con casillas, con las mismas entradas, enviaba exactamente lo mismo.
  const anteriores = []
  const RegistroConsignaNode = componente('RegistroConsignaNode')
  const consigna = montar(
    app,
    RegistroConsignaNode,
    nodoRuta,
    ruta,
    {
      texto: ' Quiero conocer el mundo ',
      opciones: [{ codigo: 'TRABAJAR' }, { codigo: 'OTRA', texto: '  Viajar un año ' }],
    },
    anteriores,
  )
  elementos(consigna.render(), (e) => e.type === 'form')[0].props.onSubmit({ preventDefault() {} })
  consigna.unmount()
  assert.deepEqual(copia(guardados), copia(anteriores))
  assert.deepEqual(copia(guardados[0]), {
    texto: 'Quiero conocer el mundo',
    opciones: [{ codigo: 'TRABAJAR' }, { codigo: 'OTRA', texto: 'Viajar un año' }],
  })
})

test('Apoyo usa la misma elección como radio, con su etiqueta y sin lenguaje de encrucijada', () => {
  const { app, componente } = cargar()
  const vista = montar(app, componente('RegistroEleccionNode'), nodoApoyo, apoyo, { texto: '', opciones: [] })
  let tree = vista.render()
  assert.equal(
    de(tree, 'RegistroGuiado').props.mensaje,
    'Nadie decide solo. ¿Quién te acompaña en esta decisión?',
  )
  assert.equal(de(tree, 'ChoiceReveal').props.etiquetaElegida, 'Te acompaña')
  assert.deepEqual(
    copia(de(tree, 'ChoiceReveal').props.opciones.map((o) => o.codigo)),
    apoyo.eleccion.opciones.map((o) => o.codigo),
  )
  de(tree, 'ChoiceReveal').props.onAlternar('FAMILIA')
  de(vista.render(), 'ChoiceReveal').props.onAlternar('DOCENTES')
  tree = vista.render()
  assert.deepEqual(codigos(de(tree, 'ChoiceReveal').props.seleccion), ['DOCENTES'])
  assert.equal(
    de(tree, 'RegistroGuiado').props.mensaje,
    'Qué bueno contar con alguien. Cuéntame cómo te apoya.',
  )
  assert.equal(
    de(tree, 'RegistroExplicacion').props.pregunta,
    '¿Cómo te apoyan tus docentes? Cuenta un ejemplo.',
  )
  vista.unmount()
})
