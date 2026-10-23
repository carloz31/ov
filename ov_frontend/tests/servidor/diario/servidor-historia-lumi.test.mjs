import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { copia, fixtureServidor, jsonServidor } from '../../soporte/servidor-ayudas.mjs'

// Ajuste del diario (F05): la historia de Lumi son las actividades del bloque LUMI, abiertas por la amistad.
const listo = (datos) => ({ datos, estado: 'listo', error: null })
const inicial = jsonServidor('ruta/ruta-actividades-inicial')
const amistad = jsonServidor('ruta/ruta-diario-amistad')

function conActividades(bloques = inicial) {
  const app = fixtureServidor()
  app.load('src/store/servidor/sesion.ts').publicar({ actividades: listo(bloques) })
  return app
}
function useHistoriaDePrueba(app, conversations = 0) {
  const { useHistoriaLumi } = app.load('src/features/journal/hooks/useHistoriaLumi.ts')
  return useHistoriaLumi({ conversations })
}

test('los capítulos son las 5 actividades LUMI, con su título y el requisito de su condición', () => {
  const app = conActividades()
  const h = useHistoriaDePrueba(app)
  assert.deepEqual(copia(h.capitulos.map((c) => [c.numero, c.codigo, c.desbloqueado, c.requisito])), [
    [1, 't-lumi-1', false, 1],
    [2, 't-lumi-2', false, 5],
    [3, 't-lumi-3', false, 12],
    [4, 't-lumi-4', false, 25],
    [5, 't-lumi-5', false, 45],
  ])
  assert.equal(h.capitulos[0].titulo, 'Cómo llegué a este mundo')
  assert.equal(h.siguienteRecuerdo, 'Cómo llegué a este mundo')
  // El umbral del capítulo n es el del nivel n de amistad: el siguiente de 3 puntos es 5, el del capítulo 2.
  assert.equal(h.capitulos[1].requisito, amistad.siguiente_en)
  const actividad = h.actividad('t-lumi-1')
  assert.equal(actividad.id, 't-lumi-1')
  assert.ok(actividad.nodos.length >= 2 && actividad.nodos.every((n) => n.tipo === 'dialogo'))
})

test('local: los mismos contenidos y los umbrales de la amistad local, uno por capítulo', () => {
  const app = fixtureServidor({ api: false })
  const { lumiMemoryThresholds } = app.load('src/features/journal/lib/lumiBond.ts')
  assert.deepEqual([...lumiMemoryThresholds], [1, 5, 10, 15, 20])
  const h = useHistoriaDePrueba(app, 6)
  assert.deepEqual(
    h.capitulos.map((c) => [c.desbloqueado, c.requisito]),
    lumiMemoryThresholds.map((t) => [6 >= t, t]),
  )
  assert.equal(h.actividad('t-lumi-2').titulo, 'Recuerdo de prueba 2')
})

test('«La historia de Lumi»: de 3 en 3 con flechas, abiertos con «Volver a ver» y bloqueados con su requisito', () => {
  const app = conActividades()
  const capitulos = useHistoriaDePrueba(app).capitulos.map((c, i) => ({ ...c, desbloqueado: i === 0 }))
  const { HistoriaLumi } = app.load('src/features/journal/components/HistoriaLumi.tsx')
  const html = renderToStaticMarkup(React.createElement(HistoriaLumi, { capitulos, onVer() {} }))
  assert.match(html, /La historia de Lumi/)
  assert.match(html, /1 de 5/)
  assert.equal((html.match(/class="sx-j-capitulo"/g) ?? []).length, 3)
  assert.match(html, /Volver a ver/)
  assert.match(html, /Al llegar a 5 cartas/)
  assert.match(html, /aria-label="Capítulos siguientes"/)
  assert.doesNotMatch(html, /Guardar en mi memoria/)
})

test('un capítulo se cierra con «Volver al diario», sin mochila, carta ni «Volver al mapa»', () => {
  const app = conActividades()
  const actividad = useHistoriaDePrueba(app).actividad('t-lumi-1')
  const { FinishScreen } = app.load('src/features/activities/components/FinishScreen.tsx')
  const html = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      {},
      React.createElement(FinishScreen, {
        activity: actividad,
        salida: { texto: 'Volver al diario', titulo: 'Lumi te contó un recuerdo.', onClick() {} },
      }),
    ),
  )
  assert.match(html, /Volver al diario/)
  assert.match(html, /<h2>Lumi te contó un recuerdo\.<\/h2>/)
  assert.doesNotMatch(
    html,
    /Volver al mapa|Nuevo en tu mochila|Lumi te dejó una carta|Este hallazgo viaja contigo/,
  )
  const vista = readFileSync('src/pages/student/StudentJournalView.tsx', 'utf8')
  assert.match(vista, /titulo: 'Lumi te contó un recuerdo\.'/)
})

test('el diario dice «carta» en el editor y en los avisos, y el aviso no corta su descripción', () => {
  const editor = readFileSync('src/features/journal/components/JournalEditor.tsx', 'utf8')
  const pagina = readFileSync('src/features/journal/hooks/useJournalPage.ts', 'utf8')
  assert.match(editor, /placeholder="Título de tu carta"/)
  assert.doesNotMatch(editor, /conversaci/)
  for (const titulo of ['¡Carta guardada!', 'Carta guardada.', 'Carta actualizada.'])
    assert.ok(pagina.includes(titulo))
  assert.doesNotMatch(pagina, /'Conversación (guardada|actualizada)/)
  const css = readFileSync('src/features/journal/styles/journal.css', 'utf8')
  assert.match(css, /\[data-ambient='journal'\] \.sx-badge-copy \.sx-toast-linea \{[^}]*white-space: normal/)
})

test('LUMI queda fuera del mapa, del avance y de las novedades; la apertura es automática al desbloquear', () => {
  const app = conActividades()
  const { progresoBloque } = app.load('src/lib/servidor/contenidos.ts')
  const sinLumi = inicial.filter((b) => b.espacio !== 'LUMI')
  assert.deepEqual(copia(progresoBloque(inicial)), copia(progresoBloque(sinLumi)))
  const { bloquesZona } = app.load('src/lib/servidor/adaptadores.ts')
  assert.ok(!bloquesZona(inicial, 'CAMINO').some((b) => b.espacio === 'LUMI'))
  assert.ok(!bloquesZona(inicial, 'CIUDAD').some((b) => b.espacio === 'LUMI'))
  const contenidos = app.load('src/data/activities/contenidos.ts')
  for (const n of [1, 2, 3, 4, 5]) assert.equal(contenidos.contenidoPorClave(`t_lumi_${n}`).mapa, undefined)
  const sesion = app.load('src/store/servidor/sesion.ts')
  sesion.publicar({
    desbloqueosAccion: [
      {
        regla: 'R-t-lumi-1',
        tipo_objetivo: 'ACTIVIDAD',
        objetivo: { codigo: 't-lumi-1', nombre: 'Cómo llegué' },
        condiciones: [],
      },
    ],
  })
  assert.deepEqual(copia(app.load('src/store/servidor/avisos.ts').avisosPendientes()), [])
  const pagina = readFileSync('src/features/journal/hooks/useJournalPage.ts', 'utf8')
  assert.match(pagina, /historia\.esRecuerdo\(d\.objetivo\.codigo\)/)
  assert.match(pagina, /if \(screen !== 'home' \|\| !capituloPendiente\) return/)
})
