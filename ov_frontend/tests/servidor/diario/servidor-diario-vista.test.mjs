import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { fixtureServidor, jsonServidor } from '../../soporte/servidor-ayudas.mjs'

// F05 y su ajuste del diario: la portada (Hoy, buzón y tarjeta de Lumi) con lo que entrega el servidor.
const app = fixtureServidor()
const adaptadores = app.load('src/lib/servidor/adaptadoresDiario.ts')
const { lumiBondServidor } = app.load('src/features/journal/lib/lumiBond.ts')
const entradas = adaptadores.entradasDiario(jsonServidor('ruta/ruta-diario-entradas'))
const cartas = adaptadores.cartasDiario(jsonServidor('ruta/ruta-diario-preguntas'))
const bond = lumiBondServidor(adaptadores.amistadDiario(jsonServidor('ruta/ruta-diario-amistad')))
const ahora = new Date('2026-10-09T15:00:00')
const render = (archivo, props) =>
  renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      {},
      React.createElement(app.load(`src/features/journal/components/${archivo}.tsx`)[archivo], props),
    ),
  )
const nada = () => {}
const acciones = { onResponder: nada, onAbrir: nada, onArchivar: nada }
const carta = (extra = {}) => ({ ...cartas[0], ...extra })

test('cartas: recibidas, de la más reciente a la más antigua, selladas sin pregunta y con remitente', () => {
  assert.deepEqual(
    cartas.map((c) => [c.codigo, c.estado, c.bandeja, c.remitente?.titulo, c.texto !== null]),
    [
      ['t-diario-fija', 'lista', 'PENDIENTE', 'Inicio de prueba', true],
      ['t-diario-personal', 'sellada', 'PENDIENTE', 'Registro de expectativas', false],
    ],
  )
  const recientes = adaptadores.cartasDiario([
    { ...jsonServidor('ruta/ruta-diario-preguntas')[0], codigo: 'vieja', recibida_en: '2026-10-01T08:00:00' },
    { ...jsonServidor('ruta/ruta-diario-preguntas')[0], codigo: 'nueva', recibida_en: '2026-10-08T08:00:00' },
  ])
  assert.deepEqual(
    recientes.map((c) => c.codigo),
    ['nueva', 'vieja'],
  )
  assert.equal(adaptadores.cartaDeActividad(cartas, 't-inicio').codigo, 't-diario-fija')
  assert.equal(adaptadores.cartaDeActividad(cartas, 't-partida'), undefined)
  assert.deepEqual(
    ['2026-10-09T08:00:00', '2026-10-08T23:00:00', '2026-10-07T10:00:00'].map((f) =>
      adaptadores.fechaRelativa(f, ahora),
    ),
    ['hoy', 'ayer', 'hace 2 días'],
  )
})

test('buzón: hasta 3 filas con remitente, fecha y una sola acción («Responder»); sin pendientes, el estado vacío', () => {
  const muchas = ['a', 'b', 'c', 'd'].map((codigo) => carta({ codigo }))
  const html = render('BuzonLumi', { cartas: muchas, ahora, enRedaccion: [], acciones, limite: 3 })
  assert.match(html, /Buzón/)
  assert.match(html, /4 por responder/)
  assert.equal((html.match(/class="sx-j-carta"/g) ?? []).length, 3)
  assert.match(html, /hace 2 días/)
  assert.match(html, /De: Inicio de prueba · hace 2 días/)
  assert.match(html, /“¿Qué te gustaría descubrir de ti en este camino\?”/)
  // En la portada cada carta tiene una sola acción a la derecha; archivar queda en «Cartas de Lumi».
  assert.equal((html.match(/>Responder<\/button>/g) ?? []).length, 3)
  assert.doesNotMatch(html, /Archivar sin responder/)
  assert.match(html, /Cartas que Lumi te dejó al terminar una actividad\. Responde cuando quieras\./)
  assert.doesNotMatch(html, /Actualizar/)
  const vacio = render('BuzonLumi', {
    cartas: [carta({ bandeja: 'RESPONDIDA' })],
    ahora,
    enRedaccion: [],
    acciones,
  })
  assert.match(vacio, /0 por responder/)
  assert.match(vacio, /Lumi te dejará una carta al terminar tu próxima actividad\./)
})

test('buzón: la sellada solo se abre y la que está en redacción no tiene acciones', () => {
  const [, sellada] = cartas
  const html = render('BuzonLumi', { cartas: [sellada], ahora, enRedaccion: [], acciones })
  assert.match(html, /Lumi tiene una carta para ti/)
  assert.match(html, />Abrir</)
  assert.doesNotMatch(html, /Responder|Archivar|“/)
  const redactando = render('BuzonLumi', {
    cartas: [sellada],
    ahora,
    enRedaccion: [sellada.codigo],
    acciones,
    actualizar: { onClick: nada, cargando: false },
  })
  assert.match(redactando, /data-estado="redaccion"/)
  assert.match(redactando, /Lumi está escribiendo tu carta…/)
  assert.doesNotMatch(redactando, />Abrir<|Responder|Archivar/)
  assert.match(redactando, /Actualizar/)
})

test('Hoy: con pregunta, contada, sin pregunta y mientras llega', () => {
  const base = { now: ahora, onRespond: nada, onFree: nada }
  const editor = {
    prompt: '¿Qué momento de hoy?',
    linkedActivityId: 'daily-prompt-x',
    title: '',
    lockedTags: [],
  }
  const conPregunta = render('DailyQuestionCard', {
    ...base,
    hoy: { estado: 'pregunta', texto: '¿Qué momento de hoy?', editor },
  })
  assert.match(conPregunta, /Hoy · viernes 9 de octubre/)
  assert.match(conPregunta, /La pregunta vence hoy/)
  assert.match(conPregunta, /Lumi te pregunta/)
  assert.match(conPregunta, /“¿Qué momento de hoy\?”/)
  assert.match(conPregunta, /Responder a Lumi/)
  assert.match(conPregunta, /class="sx-d-action sx-d-action-ghost"[^>]*>.*Escribir algo libre/)
  assert.match(conPregunta, /No necesitas una pregunta para contarle algo\./)
  const contada = render('DailyQuestionCard', { ...base, hoy: { estado: 'contada', texto: 'x' } })
  assert.match(contada, /Hoy ya le contaste a Lumi/)
  assert.doesNotMatch(contada, /Responder a Lumi|La pregunta vence hoy/)
  assert.match(contada, /class="sx-d-action"[^>]*>.*Escribir algo libre/)
  assert.match(
    render('DailyQuestionCard', { ...base, hoy: { estado: 'sin_pregunta' } }),
    /Hoy no hay pregunta/,
  )
  assert.match(
    render('DailyQuestionCard', { ...base, hoy: { estado: 'cargando' } }),
    /Lumi está escribiendo…/,
  )
})

test('tarjeta de Lumi: nivel, cartas enviadas, siguiente nivel y el texto fijo del día', () => {
  const html = render('LumiBondPanel', { bond })
  assert.match(html, /Nivel 1 · Conociéndonos/)
  assert.match(html, /3 cartas enviadas/)
  assert.match(html, /Siguiente nivel: 5/)
  assert.match(html, /Faltan <strong>2 cartas<\/strong> para que Lumi te cuente su siguiente recuerdo\./)
  assert.match(html, /Hoy cuentan hasta 3 cartas · la amistad nunca se pierde/)
  assert.doesNotMatch(html, /conversaciones|Guardar en mi memoria/)
  assert.match(
    render('LumiBondPanel', { bond, siguienteRecuerdo: 'Cómo llegué' }),
    /Faltan <strong>2 cartas<\/strong> para que Lumi te cuente <em>«Cómo llegué»<\/em>\./,
  )
})

test('cuaderno: 3 en la portada, filtros por tipo, buscador, orden, origen y «Editada»', () => {
  const cuaderno = (completo) => render('CuadernoDiario', { entries: entradas, onOpen: nada, completo })
  const portada = cuaderno(false)
  assert.equal((portada.match(/class="sx-j-entry"/g) ?? []).length, 3)
  assert.match(portada, /4 cartas desde el 7 de octubre/)
  assert.match(portada, /Mostrando las 3 más recientes/)
  assert.match(portada, /Ver todo el cuaderno/)
  assert.match(portada, /href="\/student\/journal\?cuaderno=completo"/)
  for (const filtro of ['Todas', 'Libres', 'Pregunta del día', 'Cartas de Lumi'])
    assert.match(portada, new RegExp(filtro))
  assert.match(portada, /Buscar por título o pregunta/)
  assert.match(portada, /Más reciente primero/)
  assert.doesNotMatch(portada, /Por tema|Buscar por tema|sx-j-tags/)
  const completo = cuaderno(true)
  assert.equal((completo.match(/class="sx-j-entry"/g) ?? []).length, 4)
  assert.doesNotMatch(completo, /Ver todo el cuaderno/)
  assert.equal((completo.match(/>Editada</g) ?? []).length, 1)
  const { tipoEntrada } = app.load('src/features/journal/hooks/useJournalHome.ts')
  assert.deepEqual(entradas.map((e) => tipoEntrada(e)).sort(), ['cartas', 'cartas', 'del_dia', 'libres'])
  const dialogo = readFileSync('src/pages/student/StudentJournalView.tsx', 'utf8')
  assert.match(dialogo, /Se borrará tu respuesta y la carta quedará archivada en tu buzón\./)
  assert.match(dialogo, /Se borrará la entrada\./)
})

test('editor: título opcional y sin etiquetas en api', () => {
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
  const api = render('JournalEditor', { ...props, prompt: '¿Qué esperas?', servidor: { escribiendo: false } })
  assert.match(api, /Lumi: “¿Qué esperas\?”/)
  assert.doesNotMatch(api, /Etiquetas \(opcional\)|Hoy ya contaron/)
  assert.doesNotMatch(api, /id="journal-title"[^>]*required/)
  assert.match(render('JournalEditor', props), /Etiquetas \(opcional\)/)
})

test('la página guarda en el servidor y responde cartas listas; el drawer enlaza la carta de su actividad', () => {
  const pagina = readFileSync('src/features/journal/hooks/useJournalPage.ts', 'utf8')
  assert.match(pagina, /escribirEntrada\(\{ texto, titulo, \.\.\.destino \}\)/)
  assert.match(pagina, /if \(carta\.estado !== 'lista' \|\| !carta\.texto\) return/)
  assert.match(pagina, /Tu amistad con Lumi suma una carta\./)
  const mapa = readFileSync('src/features/adventure/hooks/useMapScreen.ts', 'utf8')
  assert.match(mapa, /cartaDeActividad\(cartasDiario\(preguntas\.datos\), selected\.specActivityId\)/)
  const interaccion = readFileSync('src/features/adventure/hooks/useMapInteraction.ts', 'utf8')
  assert.match(interaccion, /pregunta: detail\.journal\.pregunta/)
})
