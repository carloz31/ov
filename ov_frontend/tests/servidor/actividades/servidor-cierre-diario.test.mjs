import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { fixtureServidor, jsonServidor } from '../../soporte/servidor-ayudas.mjs'

// F05: el cierre avisa la pregunta que la acción dejó en el diario y abre esa carta.
const completar = jsonServidor('ruta/ruta-completar-t-inicio')
const actividad = { id: 't-inicio', titulo: 'Inicio', nodos: [], promptDiario: 'Pregunta local' }

test('con entradas_desbloqueadas: «Lumi te dejó una pregunta», su texto y el diario en esa carta', () => {
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
  assert.equal(cierre.resumen.diario.nueva, true)
  assert.deepEqual(
    { ...cierre.preguntaDiario },
    {
      texto: entrada.texto,
      titulo: 'Lumi te dejó una pregunta en tu diario',
    },
  )
  cierre.escribirDiario()
  assert.equal(app.navigations.at(-1), `/student/journal?pregunta=${entrada.codigo}`)
  const { FinishJournalSection } = app.load('src/features/activities/components/FinishJournalSection.tsx')
  const html = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      {},
      React.createElement(FinishJournalSection, {
        ...cierre.preguntaDiario,
        pregunta: cierre.preguntaDiario.texto,
        nueva: true,
        onWrite() {},
      }),
    ),
  )
  assert.match(html, /Lumi te dejó una pregunta en tu diario/)
  assert.match(html, /Nueva/)
})

test('por redactar se muestra el nombre; sin entradas, no hay sección (ni la pregunta local)', () => {
  const app = fixtureServidor()
  const { useActivityFinish } = app.load('src/features/activities/hooks/useActivityFinish.ts')
  const personal = { codigo: 't-diario-personal', nombre: 'Lo que espero', personalizada: true, texto: null }
  assert.equal(useActivityFinish(actividad, [], false, [personal]).preguntaDiario.texto, 'Lo que espero')
  const sin = useActivityFinish(actividad, [], false, [])
  assert.equal(sin.resumen.diario.visible, false)
  assert.equal(sin.preguntaDiario, undefined)
})
