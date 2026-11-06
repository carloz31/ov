// El Camino y la Ciudad no muestran sus nodos sobre un fondo vacío: el mapa espera a su imagen (MapCanvas).
import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { fixtureServidor } from '../../soporte/servidor-ayudas.mjs'

// DATO DE PRUEBA: un punto del mapa, suficiente para que el lienzo dibuje un nodo.
const punto = {
  id: 'p1',
  specActivityId: 't-inicio',
  title: 'Inicio',
  x: 130,
  y: 140,
  status: 'available',
  icon: 'book-open',
}

for (const [zona, imagen] of [
  ['Camino', '/images/adventure/journey-map.png'],
  ['Ciudad', '/images/adventure/city-map.png'],
]) {
  test(`${zona}: el lienzo arranca oculto, con la imagen pidiéndose, hasta que la imagen carga`, () => {
    const { MapCanvas } = fixtureServidor().load('src/features/adventure/components/MapCanvas.tsx')
    const html = renderToStaticMarkup(
      React.createElement(MapCanvas, {
        points: [punto],
        variant: zona === 'Camino' ? 'route' : 'open',
        panelOpen: false,
        onSelect() {},
        onScaleChange() {},
        backgroundImage: imagen,
        label: `Mapa de ${zona}`,
      }),
    )
    // El viewport marca la espera y la imagen ya está en el lienzo, para que el navegador la cargue.
    assert.match(html, /class="sx-map-viewport"[^>]*data-cargando="true"/)
    assert.match(html, new RegExp(`<img[^>]*class="sx-map-image"[^>]*src="${imagen}"`))
  })
}

test('mientras espera, el lienzo (imagen, camino y nodos) no se ve y la pantalla de carga sí', () => {
  const css = readFileSync('src/styles/student/student-base.css', 'utf8')
  assert.match(css, /\.sx-map-viewport\[data-cargando\] \.sx-map-canvas \{\s*visibility: hidden;/)
  const hook = readFileSync('src/features/adventure/hooks/useImagenMapa.ts', 'utf8')
  // Se muestra cuando la imagen cargó y se decodificó (o falló), también si ya estaba en caché.
  assert.match(hook, /actual\.decode\(\)\.then\(listo, listo\)/)
  assert.match(hook, /if \(actual\.complete\) alCargar\(\)/)
  assert.match(hook, /addEventListener\('error', listo/)
  const fuente = readFileSync('src/features/adventure/components/MapCanvas.tsx', 'utf8')
  assert.match(fuente, /<PantallaCarga\s+estado="cargando"[^>]*enSeccion/)
})
