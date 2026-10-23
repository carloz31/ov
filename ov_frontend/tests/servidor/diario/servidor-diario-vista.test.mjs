import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { fixtureServidor, jsonServidor } from '../../soporte/servidor-ayudas.mjs'

// F05: el diario en api con lo que entrega el servidor.
const app = fixtureServidor()
const adaptadores = app.load('src/lib/servidor/adaptadoresDiario.ts')
const { lumiBondServidor } = app.load('src/features/journal/lib/lumiBond.ts')
const entradas = adaptadores.entradasDiario(jsonServidor('ruta/ruta-diario-entradas'))
const { cartas, porDescubrir } = adaptadores.cartasDiario(jsonServidor('ruta/ruta-diario-preguntas'))
const bond = lumiBondServidor(adaptadores.amistadDiario(jsonServidor('ruta/ruta-diario-amistad')))
const render = (archivo, props) =>
  renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      {},
      React.createElement(app.load(`src/features/journal/components/${archivo}.tsx`)[archivo], props),
    ),
  )
const nada = () => {}
const inicio = (extra = {}) =>
  render('JournalHome', {
    entries: entradas,
    grouping: 'timeline',
    onChangeGrouping: nada,
    onSuggested: nada,
    onNew: nada,
    onOpen: nada,
    query: '',
    setQuery: nada,
    bond,
    onboarding: false,
    onBegin: nada,
    now: new Date('2026-10-07T15:00:00Z'),
    onDailyQuestion: nada,
    mostrarTemas: false,
    cartasServidor: { cartas, porDescubrir, onCarta: nada },
    dailyQuestion: React.createElement('p', {}, 'tarjeta del día'),
    ...extra,
  })

test('cuaderno: solo «Línea de tiempo», sin temas, con el origen y «Editada»', () => {
  const html = inicio()
  assert.match(html, /Línea de tiempo/)
  assert.doesNotMatch(html, /Por tema|Buscar por tema|sx-j-topic-filters|sx-j-tags/)
  for (const etiqueta of ['Carta de Lumi', 'Pregunta del día', 'Libre'])
    assert.match(html, new RegExp(etiqueta))
  assert.equal((html.match(/>Editada</g) ?? []).length, 1)
  assert.match(html, /Mi tarde/)
  assert.match(html, /tarjeta del día/)
})

test('cartas: nombre del servidor sin «Después de» y las bloqueadas como «por descubrir»', () => {
  const html = inicio()
  assert.match(html, /Cartas de Lumi por responder <span>2<\/span>/)
  assert.match(html, /Lumi: “Mi primer paso”/)
  assert.match(html, /Lumi: “Lo que espero”/)
  assert.doesNotMatch(html, /Después de:/)
  assert.match(html, /1 entradas por descubrir/)
  assert.doesNotMatch(html, /Lo que conversamos/)
  const sinBloqueadas = inicio({ cartasServidor: { cartas: [], porDescubrir: 0, onCarta: nada } })
  assert.doesNotMatch(sinBloqueadas, /por descubrir/)
  assert.match(sinBloqueadas, /Respondiste todas las cartas/)
})

test('editor: título opcional, sin etiquetas y «Lumi está escribiendo…» mientras llega la carta', () => {
  const props = {
    body: '',
    editing: false,
    title: '',
    onTitleChange: nada,
    remainingToday: 3,
    lockedTags: [],
    onAddTag: nada,
    onBack: nada,
    onBodyChange: nada,
    onRemoveTag: nada,
    onSave: nada,
    onTagDraftChange: nada,
    suggestedTags: [],
    tagDraft: '',
    tags: [],
  }
  const escribiendo = render('JournalEditor', { ...props, servidor: { escribiendo: true } })
  assert.match(escribiendo, /Lumi está escribiendo…/)
  assert.doesNotMatch(escribiendo, /Etiquetas \(opcional\)|Hoy ya contaron/)
  assert.doesNotMatch(escribiendo, /id="journal-title"[^>]*required/)
  const lista = render('JournalEditor', {
    ...props,
    body: 'Hola',
    prompt: '¿Qué esperas?',
    servidor: { escribiendo: false },
  })
  assert.match(lista, /Lumi: “¿Qué esperas\?”/)
  assert.doesNotMatch(lista, /escribiendo|disabled=""/)
  // Local sigue igual: etiquetas y título obligatorio.
  assert.match(render('JournalEditor', props), /Etiquetas \(opcional\)/)
})

test('pregunta del día: cerrada, abierta con el texto del servidor y respondida', () => {
  const base = { now: new Date('2026-10-07T15:00:00Z'), onRespond: nada, onOpenAnswer: nada }
  const servidor = { texto: null, respondida: false, abrir: nada, error: '' }
  assert.match(render('DailyQuestionCard', { ...base, servidor }), /Lumi dejó una pregunta nueva para ti/)
  const abierta = render('DailyQuestionCard', {
    ...base,
    servidor: { ...servidor, texto: '¿Qué momento de hoy?' },
  })
  assert.match(abierta, /“¿Qué momento de hoy\?”/)
  assert.doesNotMatch(abierta, /sx-j-daily-tags/)
  const respuesta = entradas.find((e) => e.origen === 'RECOMENDACION_DIA')
  const lista = render('DailyQuestionCard', {
    ...base,
    servidor: { ...servidor, texto: 'x', respondida: true, respuesta },
  })
  assert.match(lista, /Ya respondiste la pregunta de hoy/)
  assert.match(lista, /Ver mi respuesta/)
  const fallo = render('DailyQuestionCard', {
    ...base,
    servidor: { ...servidor, error: 'No se pudo conectar con el servidor.' },
  })
  assert.match(fallo, /No se pudo conectar con el servidor\./)
})

test('amistad: nivel y puntos del servidor, cinco recuerdos y sin el conteo de hoy', () => {
  const html = render('LumiBondPanel', { bond })
  assert.match(html, /Conociéndonos/)
  assert.match(html, /3 conversaciones/)
  assert.match(html, /Faltan 2 para el siguiente nivel/)
  assert.match(html, /1 de 5/)
  assert.match(html, /Al llegar a 5 conversaciones/)
  assert.equal((html.match(/Al llegar a/g) ?? []).length, 1)
  assert.doesNotMatch(html, /Hoy ya contaron/)
  assert.match(html, /Hoy cuentan hasta 3 conversaciones/)
})

test('la página guarda en el servidor: libre, carta o del día, editar y borrar por número', async () => {
  const fuente = (await import('node:fs')).readFileSync(
    'src/features/journal/hooks/useJournalPage.ts',
    'utf8',
  )
  assert.match(fuente, /escribirEntrada\(\{ texto, titulo, \.\.\.destino \}\)/)
  assert.match(
    fuente,
    /setDestino\(linkedActivityId\.startsWith\('daily-prompt-'\) \? \{ delDia: true \} : \{\}\)/,
  )
  assert.match(fuente, /editarEntrada\(numero, texto, titulo\)/)
  assert.match(fuente, /borrarEntrada\(numero\)/)
  assert.match(fuente, /searchParams\.get\('pregunta'\)/)
})
