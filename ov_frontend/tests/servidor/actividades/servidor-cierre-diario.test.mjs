import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { fixtureServidor, jsonServidor } from '../../soporte/servidor-ayudas.mjs'

// F05 y su ajuste del diario: el cierre deja la carta en el buzón, como una fila sin botón. Ajuste cartas-diario:
// en api, solo el enlace a la carta.
const completar = jsonServidor('ruta/ruta-completar-t-inicio')
const actividad = { id: 't-inicio', titulo: 'Inicio', nodos: [], promptDiario: 'Pregunta local' }
const fila = (app, props) =>
  renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      {},
      React.createElement(
        app.load('src/features/activities/components/FinishJournalSection.tsx').FinishJournalSection,
        props,
      ),
    ),
  )

test('en api el cierre solo enlaza a la carta, sin su nombre ni su texto (ajuste cartas-diario)', () => {
  const app = fixtureServidor()
  const { useActivityFinish } = app.load('src/features/activities/hooks/useActivityFinish.ts')
  const cierre = useActivityFinish(
    actividad,
    completar.nuevos_desbloqueos,
    false,
    completar.entradas_desbloqueadas,
  )
  const [entrada] = completar.entradas_desbloqueadas
  assert.equal(cierre.resumen.diario.visible, true)
  assert.deepEqual(
    { ...cierre.preguntaDiario },
    { texto: null, enlace: `/student/journal?pregunta=${entrada.codigo}` },
  )
  const html = fila(app, { pregunta: cierre.preguntaDiario.texto, enlace: cierre.preguntaDiario.enlace })
  assert.match(
    html,
    /href="\/student\/journal\?pregunta=t-diario-fija"[^>]*>Lumi te dejó una carta en tu diario<svg[^>]*lucide-arrow-right/,
  )
  // La fila: sobre con punto dorado y el enlace.
  assert.match(html, /class="sx-finish-letter-icon"[^]*class="sx-finish-letter-dot"[^]*<a class="sx-finish-letter-link"/)
  assert.doesNotMatch(html, /<button|“|Mi primer paso|Respóndela|Leer en el diario|buzón/)
  // Una adaptada tampoco muestra su texto.
  const adaptada = { codigo: 't-diario-personal', nombre: 'Lo que espero', texto: 'DATO DE PRUEBA: una carta' }
  assert.equal(useActivityFinish(actividad, [], false, [adaptada]).preguntaDiario.texto, null)
})

test('en local, la pregunta de la actividad con «Leer en el diario», como antes', () => {
  const app = fixtureServidor()
  const html = fila(app, { pregunta: 'Pregunta local', enlace: '/student/journal' })
  assert.match(html, /Lumi te dejó una carta en tu buzón/)
  assert.match(html, /“Pregunta local”/)
  assert.match(html, /Respóndela cuando quieras, desde tu diario/)
  assert.match(html, />Leer en el diario<svg[^>]*lucide-arrow-right/)
})

test('sin entradas no hay carta (ni la pregunta local) y el cierre no pide redactar', () => {
  const app = fixtureServidor()
  const { useActivityFinish } = app.load('src/features/activities/hooks/useActivityFinish.ts')
  const sin = useActivityFinish(actividad, [], false, [])
  assert.equal(sin.resumen.diario.visible, false)
  assert.equal(sin.preguntaDiario, undefined)
  assert.equal(app.requests.filter((r) => r.url.includes('abrir-pregunta')).length, 0)
})
