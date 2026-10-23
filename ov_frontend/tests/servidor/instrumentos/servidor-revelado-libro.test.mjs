import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { escenarioRuta, fixtureServidor, jsonServidor, libroServidor } from '../../soporte/servidor-ayudas.mjs'

// Ajuste de F03 (docs/specs/F03-revelado-libro.md): tarjeta común de revelado del libro de Helena, llegada a
// tarjeta completa, sello accesible por teclado y chips de alcance.
const html = (Component, props) =>
  renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(Component, props)))
const cuenta = (texto, patron) => texto.match(patron)?.length ?? 0

function useLibro(resultados = {}, { partes = 5 } = {}) {
  const app = fixtureServidor({ ruta: '/student/profile/helena' })
  app.fetch((req) => {
    throw Error(`Solicitud no configurada: ${req.url}`)
  })
  const sesion = app.load('src/store/servidor/sesion.ts')
  sesion.publicar({ actividades: { datos: escenarioRuta('t2').bloques, estado: 'listo', error: null } })
  libroServidor(app, resultados)
  sesion.publicar({ instrumentos: { ...sesion.obtenerEstadoServidor().instrumentos, partesPartida: partes } })
  const { useHelenaPages } = app.load('src/features/discovery/hooks/useHelenaPages.ts')
  const { HelenaPageCard } = app.load('src/features/discovery/components/HelenaPageCard.tsx')
  const modelo = useHelenaPages()
  const tarjeta = (id) => html(HelenaPageCard, { page: modelo.pages.find((p) => p.id === id), model: modelo })
  return { app, modelo, tarjeta }
}
const SELLO = /<button type="button" class="sx-d-reveal-seal" aria-label="Romper el sello" aria-disabled="false">/

test('partida lista: el sello es la única acción, con el texto de Helena y lo que hay adentro', () => {
  const marcado = useLibro().tarjeta('partida-llegada')
  assert.match(marcado, /class="sx-d-parchment sx-d-helena-card sx-d-helena-ready"/)
  assert.match(marcado, /Página I · lista para revelar/)
  assert.match(marcado, SELLO)
  assert.match(marcado, /lucide-sparkles/)
  assert.match(
    marcado,
    /Helena terminó de leer tus respuestas\. Rompe el sello para descubrir tu punto de partida\./,
  )
  assert.match(marcado, /<strong>Adentro:<\/strong> tu zona en las 5 partes de tu camino\./)
  assert.match(marcado, /Toca el sello para romperlo/)
  assert.equal(cuenta(marcado, /Romper el sello/g), 1)
  assert.doesNotMatch(marcado, /<footer|sx-d-action-gold|Ir a la siguiente misión/)
  assert.match(marcado, /sx-d-scope sx-d-scope-project.*lucide-flag.*Para tu proyecto/)
})

test('partida lista sin el número de partes (catálogo sin respuesta): el texto no las cuenta', () => {
  const marcado = useLibro({}, { partes: null }).tarjeta('partida-llegada')
  assert.match(marcado, /<strong>Adentro:<\/strong> tu zona en cada parte de tu camino\./)
})

test('llegada lista: ocupa toda la tarjeta, con el banderín como sello y el texto del cierre', () => {
  const { modelo, tarjeta } = useLibro({ 'APL-PARTIDA': jsonServidor('ruta/ruta-resultado-partida') })
  const marcado = tarjeta('partida-llegada')
  assert.equal(modelo.pages[0].state, 'revealed')
  assert.match(marcado, /class="sx-d-parchment sx-d-helena-card sx-d-helena-ready sx-d-revealed"/)
  assert.match(marcado, /Página I · tu llegada está lista/)
  assert.match(marcado, SELLO)
  assert.match(marcado, /sx-d-reveal-seal[^]*?lucide-flag/)
  assert.match(marcado, /Helena leyó tus respuestas del cierre\. Toca el sello para ver cómo llegaste\./)
  assert.match(marcado, /<strong>Adentro:<\/strong> cómo cambió cada parte desde tu partida\./)
  assert.doesNotMatch(marcado, /sx-d-pl-summary|En tu resultado completo|<footer|Revela tu punto de llegada/)
})

test('intereses listo: mismo patrón, con su nombre de resultado y su contenido', () => {
  const marcado = useLibro().tarjeta('intereses')
  assert.match(marcado, /Página II · lista para revelar/)
  assert.match(marcado, SELLO)
  assert.match(marcado, /Rompe el sello para descubrir tu código de interés\./)
  assert.match(marcado, /<strong>Adentro:<\/strong> tu código de interés y las ocupaciones que se le parecen\./)
  assert.doesNotMatch(marcado, /<footer/)
})

test('el sello responde al teclado como botón y, mientras revela, se ve igual pero no actúa', () => {
  const app = fixtureServidor()
  const { RevealSeal } = app.load('src/features/discovery/components/RevealSeal.tsx')
  const boton = (ocupado, romper) =>
    RevealSeal({ texto: 'T', adentro: 'A', llegada: false, ocupado, romper }).props.children[0]
  let rotos = 0
  const libre = boton(false, () => rotos++)
  // Un <button> nativo sin tabindex negativo: Tab lo enfoca y Enter o Espacio disparan onClick.
  assert.equal(libre.type, 'button')
  assert.equal(libre.props.type, 'button')
  assert.equal(libre.props['aria-label'], 'Romper el sello')
  assert.equal(libre.props.tabIndex, undefined)
  libre.props.onClick()
  assert.equal(rotos, 1)
  const ocupado = boton(true, () => rotos++)
  assert.equal(ocupado.props['aria-disabled'], true)
  assert.equal(ocupado.props.disabled, undefined)
  assert.equal(ocupado.props.className, libre.props.className)
  ocupado.props.onClick()
  assert.equal(rotos, 1)
})

test('ScopeChip: «Para tu proyecto» lleno con banderín; «Opcional · si quieres» punteado con brújula', () => {
  const app = fixtureServidor()
  const { ScopeChip } = app.load('src/features/discovery/components/ScopeChip.tsx')
  assert.match(html(ScopeChip, { prioritario: true }), /^<span class="sx-d-scope sx-d-scope-project">.*lucide-flag.*Para tu proyecto<\/span>$/)
  assert.match(
    html(ScopeChip, { prioritario: false }),
    /^<span class="sx-d-scope sx-d-scope-optional">.*lucide-compass.*Opcional · si quieres<\/span>$/,
  )
  // Inteligencias es opcional en el libro: la tarjeta lo refleja.
  assert.match(useLibro().tarjeta('inteligencias'), /sx-d-scope-optional/)
})
