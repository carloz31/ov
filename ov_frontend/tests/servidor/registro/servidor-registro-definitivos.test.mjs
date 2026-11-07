import assert from 'node:assert/strict'
import test from 'node:test'
import { copia, fixtureServidor } from '../../soporte/servidor-ayudas.mjs'

// Ajuste registros: elección desde una referencia y con opciones propias, premarcado, retomar el Plan A, texto
// opcional, opciones guardadas que ya no están, estado abierto y destino sugerido al cerrar.
const cargar = (ruta) => fixtureServidor().load(ruta)
const registro = () => cargar('src/lib/servidor/adaptadoresRegistro.ts')

// DATO DE PRUEBA: un ítem que elige de PLANES y retoma sobre la misma referencia, con dos opciones propias.
const item = (cambios = {}) => ({
  codigo: 't-refe-plan',
  nombre: 'El plan que elegiste',
  consigna: '¿Cuál de tus planes eliges y por qué?',
  min_caracteres: null,
  obligatorio: true,
  eleccion: {
    fuente: 'REFERENCIA',
    lista: null,
    referencia: null,
    referencia_opciones: 't-ref-refe-planes',
    comun: false,
    minima: 1,
    maxima: 1,
    ordenada: false,
    permite_otra: false,
    opciones: [],
    opciones_propias: [
      { codigo: 'NINGUNO_AUN', texto: 'Ninguno todavía', exclusiva: true, pregunta_propia: '¿Qué te falta?', sin_seguimiento: false },
      { codigo: 'PREFIERO_NO', texto: 'Prefiero no decir', exclusiva: true, pregunta_propia: null, sin_seguimiento: true },
    ],
    premarcar_si: null,
    ...cambios,
  },
})
const planes = (estado = 'DISPONIBLE') => ({
  codigo: 't-ref-refe-planes',
  tipo: 'PLANES',
  estado,
  opciones: [
    { codigo: 'mtpe-308', texto: 'Enfermería' },
    { codigo: 'mtpe-291', texto: 'Ciencias de la Comunicación' },
  ],
})

test('las opciones de un ítem son las de su referencia en vivo más las propias', () => {
  const { itemsConOpciones, necesitaReferencias } = registro()
  const [conOpciones] = itemsConOpciones([item()], [planes()])
  assert.deepEqual(
    copia(conOpciones.eleccion.opciones.map((o) => o.codigo)),
    ['mtpe-308', 'mtpe-291', 'NINGUNO_AUN', 'PREFIERO_NO'],
  )
  // Sin dato, solo las propias.
  const [sinPlanes] = itemsConOpciones([item()], [planes('SIN_DATO')])
  assert.deepEqual(copia(sinPlanes.eleccion.opciones.map((o) => o.codigo)), ['NINGUNO_AUN', 'PREFIERO_NO'])
  assert.equal(necesitaReferencias([item()], []), true)
})

test('exclusivas, preguntas propias y texto opcional salen de las opciones propias', () => {
  const { exclusivasPropias, preguntasPropias, cierraSinSeguimiento } = registro()
  assert.deepEqual(copia(exclusivasPropias(item())), ['NINGUNO_AUN', 'PREFIERO_NO'])
  assert.deepEqual(copia(preguntasPropias(item())), { NINGUNO_AUN: '¿Qué te falta?' })
  assert.equal(cierraSinSeguimiento(item(), [{ codigo: 'PREFIERO_NO' }]), true)
  assert.equal(cierraSinSeguimiento(item(), [{ codigo: 'mtpe-308' }]), false)
  assert.equal(cierraSinSeguimiento(item(), []), false)
})

test('retomar sobre la misma referencia marca el Plan A; el premarcado depende del ítem anterior', () => {
  const { anterioresDe, premarcadoDe } = registro()
  const retoma = item({ referencia: 't-ref-refe-planes' })
  assert.deepEqual(copia(anterioresDe(retoma, [planes()])), [{ codigo: 'mtpe-308' }])
  const premarca = item({ premarcar_si: { item: 'b1-3-voz', opcion: 'NADIE', marca: 'SIN_COMPARAR' } })
  const respuesta = (codigo) => [{ item: 'b1-3-voz', estado: 'BORRADOR', opciones_elegidas: [{ codigo }], conversacion: [] }]
  assert.deepEqual(copia(premarcadoDe(premarca, respuesta('NADIE'))), [{ codigo: 'SIN_COMPARAR' }])
  assert.deepEqual(copia(premarcadoDe(premarca, respuesta('MAMA'))), [])
})

test('una opción guardada que ya no está se muestra con su texto y la marca', () => {
  const { conGuardadas, YA_NO_ESTA } = registro()
  const opciones = conGuardadas([{ codigo: 'mtpe-308', texto: 'Enfermería' }], [
    { codigo: 'mtpe-291', texto: 'Ciencias de la Comunicación' },
  ])
  assert.deepEqual(copia(opciones.at(-1)), { codigo: 'mtpe-291', texto: `Ciencias de la Comunicación · ${YA_NO_ESTA}` })
})

test('un texto abierto se cita como «Esto lo dejaste abierto.» y el cierre lo nombra aparte', () => {
  const { citaDialogo, TEXTO_ABIERTO } = registro()
  assert.equal(citaDialogo({ codigo: 'ma3-ref-hito', tipo: 'TEXTO', estado: 'ABIERTA' }), TEXTO_ABIERTO)
  const { textoAbiertos } = cargar('src/features/activities/lib/porAmpliar.ts')
  assert.equal(
    textoAbiertos(['b1-7-hito'], [{ codigo: 'b1-7-hito', nombre: 'Tu hito a un año', consigna: '' }]),
    'Lo dejaste abierto: Tu hito a un año. Puedes volver cuando lo tengas.',
  )
  assert.equal(textoAbiertos([], []), undefined)
})

test('el destino del cierre es la primera coincidencia, con la familia o el plan elegidos', () => {
  const { destinoDe } = cargar('src/features/activities/lib/destinoRegistro.ts')
  const elegidas = (item, ...codigos) => ({ item, estado: 'FINAL', opciones_elegidas: codigos.map((codigo) => ({ codigo })), conversacion: [] })
  const h3 = {
    destinos: [
      { item: 'h3-sorprende', opcion: 'NINGUNA', ruta: 'catalogo' },
      { item: 'h3-sorprende', opcion: '*', ruta: 'catalogo-familia' },
    ],
  }
  assert.deepEqual(copia(destinoDe(h3, [elegidas('h3-sorprende', 'fam-salud')])), {
    texto: 'Ir al catálogo',
    ruta: '/student/catalog/careers?familia=fam-salud',
  })
  assert.equal(destinoDe(h3, [elegidas('h3-sorprende', 'NINGUNA')]).ruta, '/student/catalog/careers')
  const b45 = { destinos: [{ item: 'b4-5-plan-b', opcion: 'A_MEDIAS', ruta: 'plan-b' }] }
  assert.deepEqual(copia(destinoDe(b45, [elegidas('b4-5-plan-b', 'A_MEDIAS')], [planes()])), {
    texto: 'Ir a tu Plan B',
    ruta: '/student/profile/decisions/mtpe-291',
  })
  const b41 = { destinos: [{ item: 'b4-1-familia', opcion: 'TODAS', ruta: null }] }
  assert.equal(destinoDe(b41, [elegidas('b4-1-familia', 'TODAS')]), undefined)
  assert.equal(destinoDe({ destino_por_defecto: 'familia' }, []).ruta, '/student/conversations')
})
