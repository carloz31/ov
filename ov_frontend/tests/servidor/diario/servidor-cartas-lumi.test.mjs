import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { fixtureServidor, jsonServidor } from '../../soporte/servidor-ayudas.mjs'

// Ajuste del diario (F05): «Cartas de Lumi», el buzón completo con sus bandejas.
const listo = (datos) => ({ datos, estado: 'listo', error: null })

function pagina(preguntas) {
  const app = fixtureServidor()
  app.load('src/store/servidor/sesion.ts').publicar({ diarioPreguntas: listo(preguntas) })
  const { StudentLumiLettersView } = app.load('src/pages/student/StudentLumiLettersView.tsx')
  return {
    app,
    html: renderToStaticMarkup(
      React.createElement(MemoryRouter, {}, React.createElement(StudentLumiLettersView)),
    ),
  }
}

test('la página tiene «Volver al diario», su título, las tres bandejas con su cuenta y «Actualizar»', () => {
  const { html } = pagina(jsonServidor('ruta/ruta-diario-preguntas-buzon'))
  assert.match(html, /href="\/student\/journal"[^>]*>.*Volver al diario/)
  assert.match(html, /<h1>Cartas de Lumi<\/h1>/)
  assert.match(html, /Las que ya respondiste están en tu cuaderno\./)
  assert.match(html, /Por responder · 0/)
  assert.match(html, /Respondidas · 1/)
  assert.match(html, /Archivadas · 1/)
  assert.match(html, /Actualizar/)
  assert.match(html, /Lumi te dejará una carta al terminar tu próxima actividad\./)
})

test('por responder: tarjeta completa con fecha, remitente, la pregunta y sus botones', () => {
  const { html } = pagina(jsonServidor('ruta/ruta-diario-preguntas'))
  assert.match(html, /Por responder · 2/)
  assert.match(html, /data-completa="true"/)
  assert.match(html, /De: Inicio de prueba/)
  assert.match(html, /“¿Qué te gustaría descubrir de ti en este camino\?”/)
  assert.match(html, /Archivar sin responder/)
  // La personalizada sigue sellada: solo «Abrir».
  assert.match(html, /Lumi tiene una carta para ti/)
})

test('respondidas y archivadas: fila compacta con su fecha y «Leer en el cuaderno» o «Desarchivar»', () => {
  const app = fixtureServidor()
  const { cartasDiario } = app.load('src/lib/servidor/adaptadoresDiario.ts')
  const { FilaCartaCompacta } = app.load('src/features/journal/components/FilaCartaCompacta.tsx')
  const cartas = cartasDiario(jsonServidor('ruta/ruta-diario-preguntas-buzon'))
  const fila = (carta, props) =>
    renderToStaticMarkup(React.createElement(FilaCartaCompacta, { carta, ...props }))
  const respondida = cartas.find((c) => c.bandeja === 'RESPONDIDA')
  const archivada = cartas.find((c) => c.bandeja === 'ARCHIVADA')
  const leida = fila(respondida, { onLeer() {} })
  assert.match(leida, /De: [^<]+ · respondida el 7 de octubre/)
  assert.match(leida, /Leer en el cuaderno/)
  const guardada = fila(archivada, { onDesarchivar() {} })
  assert.match(guardada, /archivada el 7 de octubre/)
  assert.match(guardada, /Desarchivar/)
  assert.equal(respondida.entrada, 1)
})

test('responder lleva al editor con la carta y «Leer en el cuaderno», al detalle de su entrada', () => {
  const hook = readFileSync('src/features/journal/hooks/useCartasLumi.ts', 'utf8')
  assert.match(hook, /\{ pregunta: carta\.codigo \}/)
  assert.match(hook, /entrada: String\(carta\.entrada\)/)
  const pagina = readFileSync('src/features/journal/hooks/useJournalPage.ts', 'utf8')
  assert.match(pagina, /searchParams\.get\('entrada'\)/)
  assert.match(pagina, /setSelectedId\(id\)/)
  const rutas = readFileSync('src/routes/AppRoutes.tsx', 'utf8')
  assert.match(rutas, /<SeccionProtegida seccion="DIARIO">\s*<StudentLumiLettersView \/>/)
})
