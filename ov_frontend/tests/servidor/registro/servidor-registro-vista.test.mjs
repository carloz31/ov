import assert from 'node:assert/strict'
import test from 'node:test'
import { copia, elementos, fixtureServidor } from '../../soporte/servidor-ayudas.mjs'
import { contenido } from '../../soporte/servidor-registro-ayudas.mjs'

// Ajuste front de registros (lote 1): las tres pantallas de un ítem (§3–§5): por responder o en edición, en lectura
// y la de Lumi. Cada prueba monta su componente en un arnés propio.
const NODOS = 'src/features/activities/components/nodes'
const montar = (ruta, nombre, props) => {
  const app = fixtureServidor()
  return app.mount(app.load(`${NODOS}/${ruta}.tsx`)[nombre], props)
}
const textos = (tree) => {
  const salida = []
  const visitar = (n) => {
    if (typeof n === 'string') salida.push(n)
    else if (Array.isArray(n)) n.forEach(visitar)
    else if (n?.props) {
      // Lote 2: la pista (PistaLumi) lleva su rótulo y su texto como props.
      for (const clave of ['rotulo', 'texto']) if (typeof n.props[clave] === 'string') salida.push(n.props[clave])
      visitar(n.props.children)
    }
  }
  visitar(tree)
  return salida.join(' ')
}
const de = (tree, nombre) => elementos(tree, (e) => e.type?.name === nombre || e.type === nombre)
const nada = () => {}
const lecturaProps = (respuesta) => {
  const gustos = contenido('registro-b1-1-a-medias').items[0]
  return {
    item: { ...gustos, respuesta: { ...gustos.respuesta, ...respuesta } },
    hablanteId: 'guardian',
    ocupado: false,
    error: '',
    onModificar: nada,
    onReenviar: nada,
    onContinuar: nada,
  }
}

test('lectura: nada se puede mover sin «Modificar»; la pista va debajo con su rótulo', () => {
  const props = lecturaProps({})
  const tree = montar('RegistroLecturaNode', 'RegistroLecturaNode', props).render()
  assert.equal(tree.type.name, 'RegistroGuiado')
  assert.equal(tree.props.etiqueta, 'Continuar')
  assert.equal(de(tree, 'textarea').length, 0)
  assert.equal(de(tree, 'input').length, 0)
  assert.equal(de(tree, 'ChoiceReveal').length + de(tree, 'RankingPodium').length, 0)
  const texto = textos(tree)
  assert.ok(texto.includes(props.item.respuesta.primera_respuesta))
  assert.ok(texto.includes('Modificar'))
  assert.ok(texto.includes('Lumi aún quiere saber') && texto.includes(props.item.respuesta.pista))
  assert.ok(!texto.includes('Volver a enviar'))
})

test('lectura: un solo aviso, sin evaluar (con su botón) antes que eco cambiado, y este antes que la pista', () => {
  const reenviable = textos(montar('RegistroLecturaNode', 'RegistroLecturaNode',
    lecturaProps({ reenviable: true, eco_cambiado: true })).render())
  assert.ok(reenviable.includes('Lumi no llegó a escuchar esta respuesta.') && reenviable.includes('Volver a enviar'))
  assert.ok(!reenviable.includes('Lumi aún quiere saber') && !reenviable.includes('antes de que cambiara'))
  const eco = textos(montar('RegistroLecturaNode', 'RegistroLecturaNode', lecturaProps({ eco_cambiado: true })).render())
  assert.ok(eco.includes(
    'Esto lo respondiste antes de que cambiara algo de lo que habías dicho. Puede que hoy lo veas distinto.'))
  assert.ok(!eco.includes('Volver a enviar') && !eco.includes('Lumi aún quiere saber'))
})

test('lectura: la elección sin acción y un solo bloque con la primera respuesta y la línea del seguimiento', () => {
  const gustos = contenido('registro-b1-1-completado').items[0]
  const logro = contenido('registro-b1-1-completado').items[1]
  const tree = montar('RegistroLecturaNode', 'RegistroLecturaNode', { ...lecturaProps({}), item: logro }).render()
  assert.equal(de(tree, 'ElegidoLectura').length, 1)
  const fichas = montar('ElegidoLectura', 'ElegidoLectura', { item: logro }).render()
  assert.deepEqual(elementos(fichas, (e) => e.type === 'span').map((e) => e.props.children),
    logro.respuesta.opciones_elegidas.map((o) => o.texto))
  assert.equal(elementos(fichas, (e) => e.type === 'button' || e.props?.onClick).length, 0)
  const conLinea = montar('RegistroLecturaNode', 'RegistroLecturaNode', { ...lecturaProps({}), item: gustos }).render()
  // Observación de la prueba manual: las dos líneas van dentro del mismo bloque.
  const [bloque] = elementos(conLinea, (e) => e.props?.className === 'sx-item-respuesta')
  const texto = textos(bloque)
  assert.ok(texto.indexOf(gustos.respuesta.primera_respuesta) >= 0)
  assert.ok(texto.indexOf(gustos.respuesta.primera_respuesta) < texto.indexOf(gustos.respuesta.linea_seguimiento))
  // «Modificar» va en la cabecera «Tu respuesta», antes de la pregunta.
  const [cabecera] = elementos(conLinea, (e) => e.props?.className === 'sx-item-cabecera-respuesta')
  assert.ok(textos(cabecera).includes('Tu respuesta') && textos(cabecera).includes('Modificar'))
})

test('lectura: una «Otra» de una lista muestra lo escrito; el podio, sus puestos con lo escrito; la pieza, su origen', () => {
  const logro = contenido('registro-b1-1-completado').items[1]
  const conOtra = { ...logro, respuesta: { ...logro.respuesta, opciones_elegidas: [
    { codigo: 'ORGANIZAR', texto: 'Organizar' }, { codigo: 'OTRA-1', texto: 'Cocinar para muchos' }] } }
  const fichas = montar('ElegidoLectura', 'ElegidoLectura', { item: conOtra }).render()
  assert.ok(elementos(fichas, (e) => e.type === 'span').some((e) => e.props.children === 'Cocinar para muchos'))
  const podio = { codigo: 'b2-4-bien', eleccion: { minima: 3, maxima: 3, ordenada: true, permite_otra: true,
    etiqueta_otra: null }, opciones: [], respuesta: { opciones_elegidas: [{ codigo: 'MAT', texto: 'Matemática' },
    { codigo: 'OTRA-1', texto: 'Arreglar celulares' }, { codigo: 'OTRA-2', texto: 'Vender por internet' }] } }
  const [ranking] = de(montar('ElegidoLectura', 'ElegidoLectura', { item: podio }).render(), 'RankingPodium')
  assert.equal(ranking.props.soloLectura, true)
  assert.deepEqual(copia(ranking.props.puestos), ['MAT', 'OTRA-1', 'OTRA-2'])
  assert.ok(ranking.props.opciones.some((o) => o.texto === 'Arreglar celulares'))
  const menos = contenido('registro-b4-1-completado').items.find((i) => i.codigo === 'b4-1-menos')
  const pieza = textos(montar('ElegidoLectura', 'ElegidoLectura', { item: menos }).render())
  assert.ok(pieza.includes('Matemática') && pieza.includes('¿Qué te cuesta?'))
})

const itemProps = (extra = {}) => ({
  item: contenido('registro-b1-1-a-medias').items[1],
  hablanteId: 'guardian',
  borrador: { opciones: [], texto: '' },
  onBorrador: nada,
  ocupado: false,
  error: '',
  onEnviar: nada,
  onAnterior: nada,
  onCancelar: nada,
  ...extra,
})

test('por responder: «Anterior» y «Enviar» (apagado con el texto vacío); en edición, «Cancelar», rótulo y pista', () => {
  let tree = montar('RegistroItemNode', 'RegistroItemNode', itemProps()).render()
  // Sin etiqueta, el botón principal del marco es «Enviar».
  assert.equal(tree.props.etiqueta, undefined)
  assert.equal(tree.props.deshabilitado, true)
  assert.equal(typeof tree.props.onAnterior, 'function')
  assert.equal(tree.props.onCancelar, undefined)
  assert.ok(!textos(tree).includes('Modificando tu respuesta'))
  tree = montar('RegistroItemNode', 'RegistroItemNode', itemProps({
    borrador: { opciones: [{ codigo: 'ORGANIZAR' }], texto: 'Algo' },
    edicion: { pista: 'DATO DE PRUEBA: ¿qué hiciste tú?' },
  })).render()
  assert.equal(tree.props.deshabilitado, false)
  assert.equal(tree.props.onAnterior, undefined)
  assert.equal(typeof tree.props.onCancelar, 'function')
  const texto = textos(tree)
  assert.ok(texto.includes('Modificando tu respuesta'))
  assert.ok(texto.indexOf('Podrías contar más sobre esto') >= 0)
  // La pista va arriba de la caja.
  const hijos = [tree.props.children].flat(2).filter(Boolean)
  const pista = hijos.findIndex((h) => h.type?.name === 'PistaLumi')
  const caja = hijos.findIndex((h) => h.type?.name === 'RegistroExplicacion')
  assert.ok(pista >= 0 && pista < caja)
})

test('la opción elegida cambia la pregunta y el arranque y conserva lo escrito', () => {
  const props = itemProps({ borrador: { opciones: [{ codigo: 'ORGANIZAR' }], texto: 'Lo que llevo escrito' } })
  const ninguno = props.item.opciones.find((o) => o.codigo === 'NINGUNO')
  const caja = (p) => de(montar('RegistroItemNode', 'RegistroItemNode', p).render(), 'RegistroExplicacion')[0].props
  assert.equal(caja(props).pregunta, props.item.consigna.pregunta_texto)
  let cambiado
  const eleccion = de(montar('RegistroItemNode', 'RegistroItemNode', { ...props, onBorrador: (b) => (cambiado = b) })
    .render(), 'RegistroEleccionNode')[0]
  eleccion.props.onCambiar([{ codigo: 'NINGUNO' }])
  assert.deepEqual(copia(cambiado), { opciones: [{ codigo: 'NINGUNO' }], texto: 'Lo que llevo escrito' })
  const despues = caja({ ...props, borrador: cambiado })
  assert.equal(despues.pregunta, ninguno.pregunta)
  assert.equal(despues.entrada, ninguno.arranque)
  assert.equal(despues.texto, 'Lo que llevo escrito')
})

test('sin elegir, «Enviar» muestra el error común y no envía', () => {
  let enviado = false
  const nodo = montar('RegistroItemNode', 'RegistroItemNode', itemProps({
    borrador: { opciones: [], texto: 'Algo' }, onEnviar: () => (enviado = true),
  }))
  nodo.render().props.onEnviar()
  assert.equal(enviado, false)
  const error = de(nodo.render(), 'RegistroEleccionNode')[0].props.error
  assert.equal(error, 'Elige una opción para continuar.')
})

test('la exclusiva va aparte y desmarca el resto; la «Otra» lleva el código del backend', () => {
  const item = contenido('registro-b1-1-a-medias').items[1]
  let elegidas = [{ codigo: 'ORGANIZAR' }]
  const bloque = montar('RegistroEleccionNode', 'RegistroEleccionNode', {
    item, pregunta: 'P', seleccion: elegidas, onCambiar: (s) => (elegidas = s),
  }).render()
  const chips = de(bloque, 'ChoiceReveal')[0].props
  assert.deepEqual(copia(chips.reglas.exclusivas), ['NINGUNO'])
  chips.onAlternar('NINGUNO')
  assert.deepEqual(copia(elegidas), [{ codigo: 'NINGUNO' }])
  // Lote 2: la «Otra» ya no es una opción más: se agrega con «+ Otra» (OTRA u OTRA-1…).
  if (item.eleccion.permite_otra) {
    chips.otra.onAgregar()
    assert.ok(elegidas.some((o) => o.codigo === (item.eleccion.maxima > 1 ? 'OTRA-1' : 'OTRA')))
  }
  const chipsOrigen = chips.opciones.filter((o) => o.origen)
  assert.ok(chipsOrigen.every((o) => typeof o.origen === 'string'))
})

test('pantalla de Lumi: «Tu respuesta» recortada, puntos al esperar, sin «Anterior» y el pie', () => {
  // DATO DE PRUEBA: una respuesta larga, que se recorta con «ver completa».
  const base = { eleccion: 'Organizar', texto: 'Mi respuesta '.repeat(20), ocupado: false, error: '', onResponder: nada, onSeguir: nada,
    onContinuar: nada }
  let tree = montar('PantallaLumi', 'PantallaLumi', { ...base, estado: { tipo: 'esperando' } }).render()
  let texto = textos(tree)
  assert.ok(texto.includes('Tu respuesta') && texto.includes('Organizar') && texto.includes('ver completa'))
  assert.ok(texto.includes('Lo ven tú y tu orientadora'))
  assert.equal(elementos(tree, (e) => e.props?.className === 'sx-followup-dots').length, 1)
  assert.ok(!texto.includes('Anterior') && !/\blee\b|leer/.test(texto))
  tree = montar('PantallaLumi', 'PantallaLumi', { ...base, estado: { tipo: 'repregunta', texto: '¿Y luego?' } }).render()
  texto = textos(tree)
  assert.ok(texto.includes('Responder') && texto.includes('Seguir sin responder'))
  const responder = elementos(tree, (e) => e.type === 'button' && e.props.type === 'submit')[0]
  assert.equal(responder.props.disabled, true)
  tree = montar('PantallaLumi', 'PantallaLumi', { ...base, estado: { tipo: 'desenlace', texto: 'Listo.' } }).render()
  assert.ok(textos(tree).includes('Continuar'))
  assert.equal(elementos(tree, (e) => e.props?.className === 'sx-followup-dots').length, 0)
})
