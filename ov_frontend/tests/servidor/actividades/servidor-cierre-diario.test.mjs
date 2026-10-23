import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { fixtureServidor, jsonServidor } from '../../soporte/servidor-ayudas.mjs'

// F05 y su ajuste del diario: el cierre deja la carta en el buzón, como una fila sin botón.
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

test('carta fija: su pregunta, «Respóndela cuando quieras» y «Leer en el diario» con esa carta', () => {
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
    {
      texto: entrada.texto,
      enlace: `/student/journal?pregunta=${entrada.codigo}`,
    },
  )
  const html = fila(app, { pregunta: cierre.preguntaDiario.texto, enlace: cierre.preguntaDiario.enlace })
  assert.match(html, /Lumi te dejó una carta en tu buzón/)
  assert.match(html, new RegExp(`“${entrada.texto.replace(/[?¿]/g, '.')}”`))
  assert.match(html, /Respóndela cuando quieras, desde tu diario/)
  assert.match(html, /href="\/student\/journal\?pregunta=t-diario-fija"[^>]*>Leer en el diario/)
  assert.doesNotMatch(html, /<button|Nueva|Escribir en mi diario/)
})

test('carta personalizada: sin pregunta (ni la base), «Ábrela en tu diario» e «Ir al buzón»', () => {
  const app = fixtureServidor()
  const { useActivityFinish } = app.load('src/features/activities/hooks/useActivityFinish.ts')
  const personal = { codigo: 't-diario-personal', nombre: 'Lo que espero', personalizada: true, texto: null }
  const cierre = useActivityFinish(actividad, [], false, [personal])
  assert.equal(cierre.preguntaDiario.texto, null)
  const html = fila(app, { pregunta: null, enlace: cierre.preguntaDiario.enlace })
  assert.match(html, /Lumi te dejó una carta en tu buzón/)
  assert.match(
    html,
    /Ábrela en tu diario cuando quieras: Lumi la escribirá pensando en lo que le contaste aquí/,
  )
  assert.match(html, /href="\/student\/journal\?pregunta=t-diario-personal"[^>]*>Ir al buzón/)
  assert.doesNotMatch(html, /Lo que espero|“/)
})

test('sin entradas no hay carta (ni la pregunta local) y el cierre no pide redactar', () => {
  const app = fixtureServidor()
  const { useActivityFinish } = app.load('src/features/activities/hooks/useActivityFinish.ts')
  const sin = useActivityFinish(actividad, [], false, [])
  assert.equal(sin.resumen.diario.visible, false)
  assert.equal(sin.preguntaDiario, undefined)
  assert.equal(app.requests.filter((r) => r.url.includes('abrir-pregunta')).length, 0)
})
