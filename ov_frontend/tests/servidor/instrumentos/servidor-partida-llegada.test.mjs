import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router'
import { copia, escenarioRuta, fixtureServidor, jsonServidor, libroServidor } from '../../soporte/servidor-ayudas.mjs'

// Ajuste de F03 (docs/F03-vista-comparacion.md): tarjeta de la página I y vista explicada de partida y llegada,
// con solo la partida y con las dos. En `ruta`: A no cambia en ningún ítem, B y C suben, D baja y E cambia un
// ítem sin cambiar de zona.
const RUTA = '/student/profile/helena/partida-llegada'
const vistaRuta = (Vista) =>
  renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      { initialEntries: [RUTA] },
      React.createElement(
        Routes,
        null,
        React.createElement(Route, { path: '/student/profile/helena/:pagina', element: React.createElement(Vista) }),
      ),
    ),
  )
const html = (Component, props) =>
  renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(Component, props)))
const cuenta = (texto, patron) => texto.match(patron)?.length ?? 0
const PARTIDA = () => ({ 'APL-PARTIDA': jsonServidor('ruta/ruta-resultado-partida') })
const AMBAS = () => ({ ...PARTIDA(), 'APL-LLEGADA': jsonServidor('ruta/ruta-resultado-llegada') })

function preparar({ respuestas = () => ({ body: jsonServidor('ruta/ruta-respuestas-t-partida') }) } = {}) {
  const app = fixtureServidor({ ruta: RUTA })
  app.fetch((req) => {
    if (req.url === '/api/instrumentos') return { body: jsonServidor('ruta/ruta-instrumentos') }
    if (req.url === '/api/actividades/t-partida/items') return { body: jsonServidor('ruta/ruta-items-t-partida') }
    if (req.url === '/api/cuentas/est-ana/actividades/t-partida/respuestas') return respuestas()
    throw Error(`Solicitud no configurada: ${req.url}`)
  })
  app.load('src/store/servidor/sesion.ts').publicar({
    actividades: { datos: escenarioRuta('t2').bloques, estado: 'listo', error: null },
  })
  return app
}
const vista = (app) => vistaRuta(app.load('src/pages/student/HelenaResultView.tsx').HelenaResultView)
const useTarjeta = (app) => {
  const { useHelenaPages } = app.load('src/features/discovery/hooks/useHelenaPages.ts')
  const { HelenaPageCard } = app.load('src/features/discovery/components/HelenaPageCard.tsx')
  const modelo = useHelenaPages()
  return { modelo, marcado: html(HelenaPageCard, { page: modelo.pages[0], model: modelo }) }
}

test('solo partida: la vista pide ítems y respuestas y muestra un banderín y «Al final»', async () => {
  const app = preparar()
  libroServidor(app, PARTIDA())
  await app.load('src/store/servidor/instrumentos.ts').cargarRespuestasPartida()
  assert.deepEqual(
    app.requests.map((r) => r.url),
    ['/api/instrumentos', '/api/actividades/t-partida/items', '/api/cuentas/est-ana/actividades/t-partida/respuestas'],
  )
  const marcado = vista(app)
  assert.match(marcado, /Página I · descifrada · Cómo te sientes frente a tu futuro/)
  assert.match(
    marcado,
    /Helena leyó cómo te sientes al empezar el camino\. Son zonas, no notas: muestran desde dónde partes\./,
  )
  assert.match(marcado, /Tu punto de partida.*Así empiezas el camino\./)
  assert.match(marcado, /<li>1 fuerte<\/li><li>1 en camino<\/li><li>3 por trabajar<\/li>/)
  assert.match(marcado, /<strong>Tu punto de llegada<\/strong> Se revela al final del camino\./)
  assert.match(marcado, /El camino de cada parte/)
  assert.match(marcado, /Donde empiezas.*El banderín de llegada aparecerá al final del camino\./)
  assert.equal(cuenta(marcado, /sx-d-pl-flag-full/g), 0)
  assert.equal(cuenta(marcado, /sx-d-pl-lit/g), 0)
  assert.match(marcado, /Lo que respondiste al empezar/)
  // Agrupados por la dimensión de `/items`: Claridad en la parte 1, con la etiqueta elegida.
  assert.match(marcado, /Parte 1 de 5<\/p><h3>Claridad<\/h3>/)
  const items = jsonServidor('ruta/ruta-items-t-partida')
  assert.equal(cuenta(marcado, /sx-d-pl-chip-pending">Al final</g), items.length)
  assert.match(
    marcado,
    /Sé qué quiero hacer cuando termine el colegio\.<\/span><span role="cell"><span class="sx-d-pl-chip">Bastante de acuerdo/,
  )
  assert.doesNotMatch(marcado, /<details|Completaste|Se mantuvo|puntaje|porcentaje|%/)
})

test('solo partida: si fallan las respuestas, la sección de ítems avisa y el panel de zonas sigue visible', async () => {
  const app = preparar({ respuestas: () => ({ status: 500, body: { detail: { mensaje: 'Falla de prueba' } } }) })
  libroServidor(app, PARTIDA())
  await app.load('src/store/servidor/instrumentos.ts').cargarRespuestasPartida()
  const marcado = vista(app)
  assert.match(marcado, /role="alert"><p>Falla de prueba<\/p><button[^>]*>Reintentar/)
  assert.match(marcado, /El camino de cada parte/)
  assert.equal(cuenta(marcado, /class="sx-d-pl-path"/g), 5)
  assert.doesNotMatch(marcado, /Al final</)
})

test('completo: contadores, dos banderines, ítems cambiados primero y los iguales plegados', () => {
  const app = preparar()
  libroServidor(app, AMBAS(), { comparacion: jsonServidor('ruta/ruta-comparacion-partida-llegada') })
  const marcado = vista(app)
  assert.match(marcado, /muestran dónde estás hoy y qué puedes seguir trabajando\./)
  assert.match(marcado, /Tu recorrido.*Avanzaste de zona en 2 de las 5 partes de tu camino\./)
  assert.match(marcado, /<li>2 avanzaron<\/li><li>3 se mantuvieron o cambiaron<\/li>/)
  assert.match(marcado, /Lo que más cambió fue <strong>Conocimiento de mí y Conocimiento de las opciones<\/strong>/)
  assert.match(marcado, /Las zonas no te califican: son pistas para tu próximo paso\./)
  assert.equal(cuenta(marcado, /sx-d-pl-flag sx-d-pl-flag-full/g), 6)
  assert.match(marcado, /Donde empezaste.*Donde estás hoy.*Si los dos banderines están juntos/)
  assert.match(marcado, /Qué cambió, respuesta por respuesta/)
  // A: ningún ítem cambió; los cuatro quedan plegados.
  assert.match(
    marcado,
    /En esta parte respondiste lo mismo al inicio y al cierre\.<\/p><details[^>]*><summary>4 respuestas se mantuvieron/,
  )
  // C: primero los que cambiaron (resaltados), después los iguales con «=» e «Igual», en la misma rejilla.
  const c = marcado.slice(marcado.indexOf('<h3>Conocimiento de las opciones'), marcado.indexOf('<h3>Decisión propia'))
  assert.match(
    c,
    /sx-d-pl-items sx-d-pl-items-cambio.*sx-d-pl-chip sx-d-pl-chip-strong">Bastante de acuerdo.*<summary>2 respuestas se mantuvieron<\/summary>.*sx-d-pl-items sx-d-pl-items-igual.*>=<.*>Igual</,
  )
  assert.match(c, /Completaste 1 actividad de esta parte/)
  assert.match(marcado, /Completaste 3 actividades de esta parte/)
  // D baja: mismo color, con el aviso neutro solo ahí.
  assert.equal(cuenta(marcado, /Ahora lo ves distinto\./g), 1)
  const d = marcado.slice(marcado.indexOf('<h3>Decisión propia'), marcado.indexOf('<h3>Confianza'))
  assert.match(d, /Fuerte<\/span><svg[^]*?sx-d-pl-chip sx-d-pl-chip-strong">En camino.*Ahora lo ves distinto/)
  assert.doesNotMatch(marcado, /Al final<|puntaje|porcentaje|diferencia|%/)
})

test('ninguna dimensión sube: sin «0 avanzaron», con el texto de zonas mantenidas en el panel y la tarjeta', () => {
  const app = preparar()
  const comparacion = copia(jsonServidor('ruta/ruta-comparacion-partida-llegada'))
  comparacion.dimensiones.forEach((d) => (d.zona_llegada = d.zona_partida))
  libroServidor(app, AMBAS(), { comparacion })
  const texto = 'Tus zonas se mantuvieron o ahora las ves distinto. Mira abajo qué cambió en tus respuestas.'
  const marcado = vista(app)
  assert.ok(marcado.includes(`<h2 id="sintesis-recorrido">${texto}</h2>`))
  assert.match(marcado, /<ul class="sx-d-pl-counters"><li>5 se mantuvieron o cambiaron<\/li><\/ul>/)
  assert.doesNotMatch(marcado, /avanzaron|Avanzaste|Lo que más cambió/)
  const { marcado: card } = useTarjeta(app)
  assert.ok(card.includes(`<p class="sx-d-helena-closure">${texto}</p>`))
  assert.doesNotMatch(card, /Avanzaste/)
})

test('la página I cuenta como descifrada desde la partida', () => {
  const app = preparar()
  libroServidor(app, PARTIDA())
  const { modelo, marcado } = useTarjeta(app)
  assert.equal(modelo.pages.filter((p) => p.state === 'revealed').length, 1)
  assert.match(marcado, /Página I · descifrada · falta la llegada/)
})

test('la rama COMPARACION no lee puntajes, porcentajes ni diferencias', () => {
  const componentes = ['PartidaLlegadaResult', 'PartidaLlegadaSummary', 'PartidaLlegadaSynthesis',
    'PartidaLlegadaAnswers', 'ZoneChips', 'ZonePath', 'ZonePathGrid', 'ZoneGuide', 'ItemComparisonGrid']
  const archivos = [
    'src/features/discovery/lib/partidaLlegada.ts',
    ...componentes.map((c) => `src/features/discovery/components/${c}.tsx`),
  ]
  const sinComentarios = (codigo) => codigo.replace(/\/\/.*$/gm, '')
  for (const archivo of archivos)
    assert.doesNotMatch(sinComentarios(readFileSync(archivo, 'utf8')), /puntaje|porcentaje|diferencia/, archivo)
})
