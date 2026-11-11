import assert from 'node:assert/strict'
import test from 'node:test'
import { copia, fixtureServidor, jsonServidor } from '../../soporte/servidor-ayudas.mjs'
import { contenido } from '../../soporte/servidor-registro-ayudas.mjs'

// Ajuste front de registros (lote 1): el contrato del flujo ítem por ítem (lote 3 del backend) y los adaptadores
// puros del registro, sobre los fixtures regenerados.
const registro = () => fixtureServidor().load('src/lib/servidor/adaptadoresRegistro.ts')
const PASOS = ['responder-b1-1-repregunta', 'seguimiento-b1-1-con-pista', 'responder-b1-1-mensaje',
  'responder-b1-1-sin-evaluar', 'reenviar-b1-1', 'responder-b1-1-edicion', 'seguimiento-b1-1-sin-pista',
  'seguimiento-b1-1-mensaje']

test('cada paso trae `paso`, su repregunta o su mensaje y el registro completo; nunca el tipo', () => {
  for (const nombre of PASOS) {
    const paso = contenido(nombre)
    assert.ok(['SIGUIENTE', 'REPREGUNTA', 'MENSAJE'].includes(paso.paso), nombre)
    assert.equal(paso.paso === 'REPREGUNTA', !!paso.repregunta, nombre)
    assert.equal(paso.paso === 'MENSAJE', !!paso.mensaje, nombre)
    assert.deepEqual(Object.keys(paso.registro).sort(), ['estado', 'item_actual', 'items'])
    const texto = JSON.stringify(paso)
    for (const prohibido of ['"tipo_final"', '"primera_tipo"', '"motivo"', '"sensible"', '"repregunta_cerrada"'])
      assert.ok(!texto.includes(prohibido), `${nombre} trae ${prohibido}`)
  }
  const ruta = jsonServidor('ruta/ruta-responder-t-exp-ruta')
  assert.equal(ruta.paso, 'SIGUIENTE')
})

test('cada ítem de la lectura trae su consigna, elección, opciones, ecos y la respuesta vigente', () => {
  const a = contenido('registro-b1-1-a-medias')
  assert.equal(a.item_actual, 'b1-1-logro')
  const [gustos, logro] = a.items
  assert.deepEqual(Object.keys(gustos.respuesta).sort(),
    ['eco_cambiado', 'linea_seguimiento', 'opciones_elegidas', 'pista', 'primera_respuesta', 'reenviable'])
  assert.equal(gustos.consigna.dialogo, 'Todo mapa empieza por donde uno ya estuvo.')
  assert.equal(logro.respuesta, null)
  assert.ok(logro.eleccion.maxima >= 1 && logro.opciones.some((o) => o.exclusiva))
})

test('la opción marcada con pregunta y arranque reemplaza a los del ítem', () => {
  const { consignaVigente } = registro()
  const logro = contenido('registro-b1-1-a-medias').items[1]
  const ninguno = logro.opciones.find((o) => o.codigo === 'NINGUNO')
  assert.deepEqual(copia(consignaVigente(logro, [])), {
    dialogo: logro.consigna.dialogo,
    preguntaEleccion: logro.consigna.pregunta_eleccion,
    preguntaTexto: logro.consigna.pregunta_texto,
    arranque: logro.consigna.arranque,
  })
  const conNinguno = consignaVigente(logro, [{ codigo: 'NINGUNO' }])
  assert.equal(conNinguno.preguntaTexto, ninguno.pregunta)
  assert.equal(conNinguno.arranque, ninguno.arranque)
})

test('el texto se exige no vacío salvo con una opción sin LLM; sin LLM no hay espera', () => {
  const { requiereTexto, sinLlm } = registro()
  const logro = contenido('registro-b1-1-a-medias').items[1]
  assert.equal(requiereTexto(logro, [{ codigo: 'ORGANIZAR' }]), true)
  assert.equal(sinLlm(logro, [{ codigo: 'ORGANIZAR' }]), false)
  // DATO DE PRUEBA: la exclusiva de b1-1-logro marcada como sin LLM.
  const conSinLlm = { ...logro, opciones: logro.opciones.map((o) => (o.exclusiva ? { ...o, sin_llm: true } : o)) }
  assert.equal(requiereTexto(conSinLlm, [{ codigo: 'NINGUNO' }]), false)
  assert.equal(sinLlm(conSinLlm, [{ codigo: 'NINGUNO' }]), true)
  // Un ítem de `ruta` no tiene tarjeta: va sin LLM, pero igual pide texto.
  const ruta = jsonServidor('ruta/ruta-registro-t-expectativas-cerrado').items[0]
  assert.equal(ruta.con_llm, false)
  assert.equal(sinLlm(ruta, [{ codigo: 'INSTITUTO' }]), true)
  assert.equal(requiereTexto(ruta, [{ codigo: 'INSTITUTO' }]), true)
})

test('la «Otra» va como OTRA con una opción y OTRA-1 con varias; la selección se valida', () => {
  const { codigoOtra, errorSeleccion } = registro()
  const ruta = jsonServidor('ruta/ruta-registro-t-expectativas-cerrado').items[0]
  assert.ok(ruta.eleccion.maxima > 1 && ruta.eleccion.permite_otra)
  assert.equal(codigoOtra(ruta), 'OTRA-1')
  assert.equal(codigoOtra({ ...ruta, eleccion: { ...ruta.eleccion, maxima: 1 } }), 'OTRA')
  assert.equal(errorSeleccion(ruta, []), 'eleccion')
  assert.equal(errorSeleccion(ruta, [{ codigo: 'OTRA-1', texto: '  ' }]), 'otra')
  assert.equal(errorSeleccion(ruta, [{ codigo: 'OTRA-1', texto: 'Viajar' }]), undefined)
})

test('la caja de edición lleva la primera respuesta y, en la línea siguiente, la del seguimiento', () => {
  const { cajaEdicion, marcadasDe } = registro()
  const gustos = contenido('registro-b1-1-completado').items[0].respuesta
  assert.ok(gustos.linea_seguimiento)
  assert.equal(cajaEdicion(gustos), `${gustos.primera_respuesta}\n${gustos.linea_seguimiento}`)
  assert.equal(cajaEdicion({ ...gustos, linea_seguimiento: null }), gustos.primera_respuesta)
  const otra = { ...gustos, opciones_elegidas: [{ codigo: 'OTRA-1', texto: 'Viajar' }, { codigo: 'A', texto: 'a' }] }
  assert.deepEqual(copia(marcadasDe(otra)), [{ codigo: 'OTRA-1', texto: 'Viajar' }, { codigo: 'A' }])
})

test('un solo aviso por ítem: sin evaluar, luego eco cambiado, luego la pista', () => {
  const { avisoDe } = registro()
  const base = contenido('registro-b1-1-a-medias').items[0].respuesta
  assert.ok(base.pista)
  assert.deepEqual(copia(avisoDe({ ...base, reenviable: true, eco_cambiado: true })), { tipo: 'reenviable' })
  assert.deepEqual(copia(avisoDe({ ...base, eco_cambiado: true })), { tipo: 'eco_cambiado' })
  assert.deepEqual(copia(avisoDe(base)), { tipo: 'pista', texto: base.pista })
  assert.equal(avisoDe({ ...base, pista: null }), undefined)
  assert.equal(avisoDe(null), undefined)
  assert.ok(contenido('registro-b1-1-sin-terminar').items[2].respuesta.reenviable)
})

test('el desenlace sale del paso; tras la repregunta, la pista del ítem decide', () => {
  const { desenlace } = registro()
  assert.deepEqual(copia(desenlace(contenido('responder-b1-1-repregunta'), false)), {
    tipo: 'repregunta', texto: contenido('responder-b1-1-repregunta').repregunta,
  })
  assert.deepEqual(copia(desenlace(contenido('responder-b1-1-mensaje'), false)), {
    tipo: 'mensaje', texto: contenido('responder-b1-1-mensaje').mensaje,
  })
  assert.deepEqual(copia(desenlace(contenido('seguimiento-b1-1-con-pista'), true)), { tipo: 'con_pista' })
  assert.deepEqual(copia(desenlace(contenido('seguimiento-b1-1-sin-pista'), true)), { tipo: 'confirmacion' })
  assert.deepEqual(copia(desenlace(contenido('reenviar-b1-1'), false)), { tipo: 'confirmacion' })
})

test('los ecos se muestran como texto simple, con su nombre', () => {
  const { textoEco } = registro()
  assert.equal(textoEco({ codigo: 'x', nombre: 'Tu Plan A', forma: 'carrera', carrera: 'Psicología' }),
    'Tu Plan A: Psicología')
  assert.equal(textoEco({ codigo: 'x', forma: 'pasos', pendientes: ['Uno'], hechos: ['Dos'] }), 'Uno · Dos')
  assert.equal(textoEco({ codigo: 'x', nombre: 'Lo tuyo', texto: 'a / b', lineas: ['a', 'b'] }), 'Lo tuyo: a · b')
})
