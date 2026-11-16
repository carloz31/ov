import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { importarAislado, jsonServidor } from '../../soporte/servidor-ayudas.mjs'
import { fixtureApoderado } from '../../soporte/apoderado-ayudas.mjs'

// Ajuste respuestas-orientadora (bocetos 17 y 18): la pestaña Respuestas del perfil, con los fixtures de los casos 5, 6
// y 7 de `sembrar_panel_ejemplo.py`.
const fx = (nombre) => jsonServidor(`contenido/contenido-panel-${nombre}`)
const html = (Component, props) =>
  renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(Component, props)))
const texto = (marcado) => marcado.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

function orientadora() {
  const app = fixtureApoderado({ cuenta: 'ori-carmen', ruta: '/counselor/students' })
  app.fetch((req) => {
    const caso = req.url.match(/estudiantes\/est-panel-(\d)/)?.[1]
    const registro = req.url.match(/\/respuestas\/([\w-]+)$/)?.[1]
    if (caso && registro) return { body: fx(`${caso}-registro-${registro}`) }
    if (caso && req.url.endsWith('/respuestas')) return { body: fx(`${caso}-respuestas`) }
    if (caso && /\/estudiantes\/est-panel-\d$/.test(req.url)) return { body: fx(`${caso}-perfil`) }
    throw Error(`Solicitud no configurada: ${req.url}`)
  })
  return app
}
const modelo = (estudiante, extra = {}) => ({
  estudiante,
  irADestino() {},
  registroPedido: null,
  itemPedido: null,
  ...extra,
})

// La lista ya cargada (lo que pinta la pestaña con los datos del almacén).
async function pestana(caso, extra, cambios = {}) {
  const app = orientadora()
  const { ListaRespuestas } = app.load('src/features/counselor/components/perfil/ListaRespuestas.tsx')
  const datos = { ...fx(`${caso}-respuestas`), ...cambios }
  return html(ListaRespuestas, { datos, modelo: modelo(`est-panel-${caso}`, extra) })
}

test('la línea de eco: mismo registro, otra actividad, planes, otra forma y lo que cambió hoy', async () => {
  const a = await importarAislado('src/lib/servidor/adaptadoresPanelEstudiante.ts')
  const base = { numeros: [], actividad: null, cita: null, opciones: [], planes: [], eco: null, hoy: null }
  const linea = (eco) => {
    const l = a.lineaEcoPanel({ ...base, ...eco })
    return l && [...l.piezas, ...l.hoy].map((p) => p.texto).join('')
  }
  assert.equal(linea({ fuente: 'MISMO_REGISTRO', numeros: [1, 2] }), 'Respondió viendo sus respuestas 1 y 2.')
  assert.equal(linea({ fuente: 'MISMO_REGISTRO', numeros: [1] }), 'Respondió viendo su respuesta 1.')
  assert.equal(
    linea({ fuente: 'TEXTO', actividad: 'Mi historia', cita: 'Me gusta escuchar' }),
    'Respondió viendo lo que escribió en Mi historia: “Me gusta escuchar”.',
  )
  assert.equal(
    linea({ fuente: 'ELECCION', actividad: 'Mi historia', opciones: ['Mamá', 'Papá'] }),
    'Respondió viendo lo que eligió en Mi historia: Mamá, Papá.',
  )
  const planes = [
    { letra: 'A', carrera: 'Enfermería', institucion: 'UNMSM' },
    { letra: 'B', carrera: 'Obstetricia', institucion: null },
  ]
  assert.equal(
    linea({
      fuente: 'PLANES',
      planes,
      hoy: { planes: [{ letra: 'B', carrera: 'Psicología', institucion: null }] },
    }),
    'Respondió viendo: Plan A Enfermería · Plan B Obstetricia. Hoy su Plan B es Psicología.',
  )
  assert.equal(
    linea({ fuente: 'PLANES', planes: planes.slice(0, 1) }),
    'Respondió viendo: Plan A Enfermería · UNMSM.',
  )
  assert.equal(
    linea({ fuente: 'TEXTO', actividad: 'X', cita: 'antes', hoy: { cita: 'después' } }),
    'Respondió viendo lo que escribió en X: “antes”. Hoy dice: “después”.',
  )
  assert.equal(
    linea({
      fuente: 'OTRO',
      eco: { forma: 'carrera', nombre: 'Tu Plan A', carrera: 'Derecho' },
      hoy: { texto: 'Arte' },
    }),
    'Respondió viendo: Tu Plan A: Derecho. Hoy su Plan A es Arte.',
  )
  // Un resultado de test sin valor propio toma sus opciones, sin «: (…)» colgando.
  assert.equal(
    linea({
      fuente: 'OTRO',
      eco: { nombre: 'Tu test de habilidades', tipo: 'RESULTADO', opciones: ['Asertividad'] },
    }),
    'Respondió viendo: Tu test de habilidades: Asertividad.',
  )
  assert.equal(linea({ fuente: 'MISMO_REGISTRO', numeros: [] }), null)
})

test('la lista: grupos por tramo, marcas, sin leyenda ni «Para leer primero», y la línea de lo que hay por revisar', async () => {
  const cinco = texto(await pestana(5))
  assert.match(cinco, /Destacados · \d+ Todos · \d+/)
  assert.match(cinco, /1 registro con algo por revisar/)
  assert.doesNotMatch(cinco, /Etiquetas:|Para leer primero|Ver respuestas|Completado|cambió después/)
  assert.match(cinco, /Tramo 2 · [^·]+ Las voces y la mía 1 sin contenido/)
  // «Mi futuro» tiene una sin contenido pero no es destacado: no está en «Destacados».
  assert.doesNotMatch(cinco, /Mi futuro/)
  const marcado = await pestana(5)
  assert.match(marcado, /<button type="button" aria-expanded="false"/)
  assert.doesNotMatch(marcado, /aria-expanded="true"/)
  // Caso 6: dos sensibles (una en un registro no destacado), abiertos al entrar.
  const seis = await pestana(6)
  assert.match(texto(seis), /2 registros con algo por revisar/)
  assert.equal(seis.match(/aria-expanded="true"/g).length, 2)
  assert.match(texto(seis), /Requiere atención · Lumi la derivó a usted en lugar de seguir preguntando\./)
  assert.match(texto(seis), /Respondió viendo sus respuestas 1 y 2\./)
  assert.doesNotMatch(texto(seis), /Hoy /)
  // Sin destacados en el salón, no hay selector y se ven todas, con «Aún no llega» al final y su tramo.
  const todas = texto(await pestana(6, {}, { hay_destacados: false }))
  assert.doesNotMatch(todas, /Destacados ·/)
  assert.match(todas, /Aún no llega .*Tramo \d · .*Misión opcional/)
  // Caso 7, sin marcas: sin la línea de revisión.
  assert.doesNotMatch(texto(await pestana(7)), /con algo por revisar/)
})

test('la entrada desde un aviso abre su registro y muestra la pregunta marcada', async () => {
  const marcado = await pestana(5, { registroPedido: 'b1-7', itemPedido: 'b1-7-25' })
  // b1-7 no es destacado: se abre en «Todos».
  assert.match(texto(marcado), /Todos · \d+/)
  assert.match(marcado, /aria-expanded="true"/)
})

test('cada pregunta: marcas, elección en negrita, aún no lo sabe, sin encabezado ni diálogo', async () => {
  const app = orientadora()
  const { ItemRegistroLectura } = app.load('src/features/counselor/components/perfil/ItemRegistroLectura.tsx')
  const pintar = (nombre) =>
    fx(nombre)
      .items.map((item) => html(ItemRegistroLectura, { item }))
      .join(' ')
  const futuro = pintar('5-registro-b1-7')
  assert.match(texto(futuro), /Sin contenido · No responde a la pregunta\./)
  assert.match(futuro, /border-dashed/)
  assert.match(texto(futuro), /Marcó que aún no lo sabe|Aún no lo sabe/)
  const voces = pintar('5-registro-b1-3')
  assert.match(texto(voces), /Sin contenido · La dejó vacía\./)
  assert.match(voces, /<strong class="font-semibold">Chocan<\/strong>/)
  assert.doesNotMatch(texto(voces), /Pregunta \d · |Tenía a la vista/)
  const sensible = pintar('6-registro-b1-3')
  assert.match(sensible, /bg-warning-soft/)
  assert.match(texto(sensible), /Requiere atención/)
  const planes = texto(pintar('7-registro-b4-5'))
  assert.match(planes, /Respondió viendo: Plan A .* · Plan B .*\. Hoy su Plan [AB] es /)
  assert.doesNotMatch(texto(pintar('5-registro-b4-5')), /Hoy su Plan/)
})

test('una pregunta sin responder: «Aún no lo responde» en un registro en curso y sin línea de eco', async () => {
  const app = orientadora()
  const { ItemRegistroLectura } = app.load('src/features/counselor/components/perfil/ItemRegistroLectura.tsx')
  const item = {
    numero: 3,
    codigo: 'b1-3-contraste',
    marca: null,
    aun_no_lo_sabe: false,
    ecos: [],
    pregunta_eleccion: '¿Coinciden?',
    eleccion: 'LISTA',
    elegidas: [],
    pregunta_texto: '¿En qué punto?',
    primera_respuesta: null,
    repregunta: null,
    segunda_respuesta: null,
    respondido: false,
  }
  assert.match(texto(html(ItemRegistroLectura, { item, enCurso: true })), /Aún no lo responde/)
  assert.match(texto(html(ItemRegistroLectura, { item })), /No lo respondió/)
  // El origen de una pieza va aparte y con su mayúscula.
  const pieza = {
    ...item,
    respondido: true,
    eleccion: 'PIEZAS',
    primera_respuesta: 'Texto',
    elegidas: [
      { texto: 'Ayudar a otras personas', otra: false, origen: 'Social', grupo: 'INTERESES' },
      { texto: 'Matemática', otra: false, origen: '¿Qué te cuesta?', grupo: 'CUESTA' },
    ],
  }
  const piezas = texto(html(ItemRegistroLectura, { item: pieza }))
  assert.match(piezas, /Ayudar a otras personas \(de sus intereses: Social\)/)
  assert.match(piezas, /Matemática \(de: ¿Qué te cuesta\?\)/)
})
