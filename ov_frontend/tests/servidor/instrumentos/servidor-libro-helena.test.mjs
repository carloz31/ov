import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router'
import {
  cargarAlmacen,
  copia,
  escenarioRuta,
  esConsultaDominio,
  esperar,
  fixtureServidor,
  jsonServidor,
  libroServidor,
  respuestaDominio,
} from '../../soporte/servidor-ayudas.mjs'

// F03 (HU-024, HU-027, HU-095): el libro de Helena en api lee el avance del servidor, revela con
// `revelar-resultado` y, con perfil plano, invita a repetir las misiones una vez.
const html = (Component, props) =>
  renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(Component, props)))
const vistaRuta = (Vista) =>
  renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      { initialEntries: ['/student/profile/helena/partida-llegada'] },
      React.createElement(
        Routes,
        null,
        React.createElement(Route, {
          path: '/student/profile/helena/:pagina',
          element: React.createElement(Vista),
        }),
      ),
    ),
  )
const accionVacia = { eventos_registrados: [], nuevos_desbloqueos: [] }

async function libro({ etapa = 'ciudad', avance = 'riasec-listo', ruta = '/student/profile/helena', extra } = {}) {
  const app = fixtureServidor({ ruta }),
    estado = escenarioRuta(etapa)
  let fase = avance
  app.fetch((req) => {
    if (esConsultaDominio(req)) return respuestaDominio(req, estado)
    if (req.url.includes('/desbloqueos?')) return { body: [] }
    const respuesta = extra?.(req, (nueva) => (fase = nueva))
    if (respuesta) return respuesta
    if (req.url.endsWith('/instrumentos')) return { body: jsonServidor(`ruta/ruta-avance-instrumentos-${fase}`) }
    if (req.url.includes('resultado?aplicacion=APL-PARTIDA')) return { body: jsonServidor('ruta/ruta-resultado-partida') }
    if (req.url.includes('resultado?aplicacion=APL-RIASEC')) return { body: jsonServidor('ruta/ruta-resultado-riasec') }
    if (req.url.includes('resultado?aplicacion=APL-LLEGADA')) return { body: jsonServidor('ruta/ruta-resultado-llegada') }
    if (req.url.endsWith('/comparacion')) return { body: jsonServidor('ruta/ruta-comparacion-partida-llegada') }
    throw Error(`Solicitud no configurada: ${req.url}`)
  })
  const almacen = cargarAlmacen(app)
  almacen.publicar({ consultasHabilitadas: true })
  await almacen.refrescar()
  await app.load('src/store/servidor/instrumentos.ts').cargarInstrumentos()
  const { useHelenaPages } = app.load('src/features/discovery/hooks/useHelenaPages.ts')
  return { app, almacen, useHelenaPages }
}
const pagina = (modelo, id) => modelo.pages.find((p) => p.id === id)

test('el libro en api tiene cuatro páginas: partida y llegada primero; la sellada dice qué misión falta', async () => {
  const { useHelenaPages } = await libro({ etapa: 't1', avance: 'inicial' })
  const modelo = useHelenaPages()
  assert.deepEqual(copia(modelo.pages.map((p) => [p.id, p.numeral, p.state])), [
    ['partida-llegada', 'I', 'sealed'],
    ['intereses', 'II', 'sealed'],
    ['inteligencias', 'III', 'ready'],
    ['habilidades', 'IV', 'sealed'],
  ])
  const partida = pagina(modelo, 'partida-llegada')
  assert.equal(partida.requisito, 'Completa: Punto de partida')
  assert.equal(partida.activityHref, '/student/missions?actividad=t-partida')
  assert.equal(partida.mostrarRequisito, true)
  assert.equal(partida.demo, false)
})

test('con la Ciudad abierta, intereses pide su primera misión con el título del servidor', async () => {
  const { useHelenaPages } = await libro({ avance: 'partida-lista' })
  const intereses = pagina(useHelenaPages(), 'intereses')
  assert.equal(intereses.state, 'sealed')
  assert.equal(intereses.requisito, 'Completa: Misión de intereses')
  assert.equal(intereses.activityHref, '/student/exploration?actividad=t-mision-intereses')
  assert.deepEqual(copia(intereses.missions), { done: 0, total: 2 })
})

test('romper el sello de la partida revela APL-PARTIDA y la página muestra sus zonas en palabras', async () => {
  const { app, useHelenaPages } = await libro({
    avance: 'partida-lista',
    extra: (req, avanzar) => {
      if (!req.url.endsWith('/revelar-resultado')) return undefined
      avanzar('riasec-listo')
      return { body: { ...jsonServidor('ruta/ruta-revelar-partida'), ...accionVacia } }
    },
  })
  const antes = pagina(useHelenaPages(), 'partida-llegada')
  assert.equal(antes.state, 'ready')
  assert.equal(antes.revelacionBloqueada, false)
  useHelenaPages().revelarPagina('partida-llegada')
  await esperar()
  await esperar()
  const revelar = app.requests.find((r) => r.url === '/api/acciones/revelar-resultado')
  assert.deepEqual(copia(revelar.body), {
    cuenta: 'est-ana',
    instrumento: 'TEST-PARTIDA-LLEGADA',
    aplicacion: 'APL-PARTIDA',
  })
  const despues = pagina(useHelenaPages(), 'partida-llegada')
  assert.equal(despues.state, 'revealed')
  assert.deepEqual(
    copia(despues.resumen.filas.map((f) => [f.codigo, f.nombre, f.zona])),
    [
      ['A', 'Claridad', 'En camino'],
      ['B', 'Conocimiento de mí', 'En camino'],
      ['C', 'Conocimiento de las opciones', 'En camino'],
      ['D', 'Decisión propia', 'En camino'],
      ['E', 'Confianza', 'En camino'],
    ],
  )
  const { HelenaPageCard } = app.load('src/features/discovery/components/HelenaPageCard.tsx')
  const marcado = html(HelenaPageCard, { page: despues, model: useHelenaPages() })
  assert.match(marcado, /En camino/)
  assert.match(marcado, /href="\/student\/profile\/helena\/partida-llegada"/)
  assert.doesNotMatch(marcado, /puntaje|%|Revela tu punto de llegada|guia=1/)
})

test('con la llegada lista aparece el segundo sello; con las dos reveladas, partida → llegada y la comparación', async () => {
  const lista = await libro({ etapa: 't2', avance: 'llegada-lista' })
  const conSello = pagina(lista.useHelenaPages(), 'partida-llegada')
  assert.equal(conSello.selloLlegada, true)
  assert.equal(conSello.aplicacionSello.aplicacion, 'APL-LLEGADA')
  const { HelenaPageCard } = lista.app.load('src/features/discovery/components/HelenaPageCard.tsx')
  assert.match(html(HelenaPageCard, { page: conSello, model: lista.useHelenaPages() }), /Revela tu punto de llegada/)
  const final = await libro({ etapa: 't2', avance: 'final' })
  const ambas = pagina(final.useHelenaPages(), 'partida-llegada')
  assert.equal(ambas.selloLlegada, false)
  assert.equal(ambas.conComparacion, true)
  assert.equal(ambas.resumen.filas[1].zona, 'En camino → Zona fuerte')
  const marcado = html(HelenaPageCard, { page: ambas, model: final.useHelenaPages() })
  assert.match(marcado, /Ver comparación/)
})

test('perfil plano: el reinicio sin usar ofrece repetir; usado, no hay botón', async () => {
  const plano = jsonServidor('ruta/ruta-resultado-riasec-plano')
  const { app, useHelenaPages } = await libro()
  const { HelenaPageCard } = app.load('src/features/discovery/components/HelenaPageCard.tsx')
  libroServidor(app, { 'APL-RIASEC': plano }, { historialRiasec: jsonServidor('ruta/ruta-historial-riasec-plano') })
  const sinUsar = pagina(useHelenaPages(), 'intereses')
  assert.equal(sinUsar.puedeReiniciar, true)
  assert.match(html(HelenaPageCard, { page: sinUsar, model: useHelenaPages() }), /Volver a hacer las misiones/)
  libroServidor(app, { 'APL-RIASEC': plano }, { historialRiasec: jsonServidor('ruta/ruta-historial-riasec') })
  const usado = pagina(useHelenaPages(), 'intereses')
  assert.equal(usado.puedeReiniciar, false)
  assert.equal(usado.resumen.cierre, 'Tus respuestas no distinguen un tipo de interés.')
  assert.doesNotMatch(html(HelenaPageCard, { page: usado, model: useHelenaPages() }), /Volver a hacer las misiones|mara-test/)
})

test('reiniciar envía la aplicación RIASEC y lleva a la primera misión de intereses', async () => {
  const { app, useHelenaPages } = await libro({
    avance: 'final',
    extra: (req, avanzar) => {
      if (req.url.endsWith('/reiniciar-instrumento')) {
        avanzar('reiniciado')
        return { body: { ...jsonServidor('ruta/ruta-reiniciar-riasec'), cuenta: 'est-ana' } }
      }
      if (req.url.includes('resultado?aplicacion=APL-RIASEC'))
        return { body: jsonServidor('ruta/ruta-resultado-riasec-plano') }
      if (req.url.endsWith('/historial')) return { body: jsonServidor('ruta/ruta-historial-riasec-plano') }
      return undefined
    },
  })
  useHelenaPages().reiniciarIntereses()
  await esperar()
  await esperar()
  const reinicio = app.requests.find((r) => r.url === '/api/acciones/reiniciar-instrumento')
  assert.deepEqual(copia(reinicio.body), { cuenta: 'est-ana', instrumento: 'TEST-RIASEC', aplicacion: 'APL-RIASEC' })
  assert.equal(app.navigations.at(-1), '/student/exploration?actividad=t-mision-intereses')
})

test('recarga directa: mientras se lee el libro, la vista espera; luego muestra la comparación', async () => {
  const app = fixtureServidor({ ruta: '/student/profile/helena/partida-llegada' })
  const sesion = app.load('src/store/servidor/sesion.ts')
  sesion.publicar({
    actividades: { datos: escenarioRuta('t2').bloques, estado: 'listo', error: null },
  })
  const { HelenaResultView } = app.load('src/pages/student/HelenaResultView.tsx')
  const espera = vistaRuta(HelenaResultView)
  assert.match(espera, /aria-busy="true"/)
  assert.doesNotMatch(espera, /Navigate|El libro de Helena<\/a>/)
  // DATO DE PRUEBA: en `ruta` todo cambia de partida a llegada; un ítem que se mantuvo prueba el plegado.
  const comparacion = copia(jsonServidor('ruta/ruta-comparacion-partida-llegada'))
  Object.assign(comparacion.dimensiones[0].items[0], { cambio: false, llegada: comparacion.dimensiones[0].items[0].partida })
  libroServidor(
    app,
    {
      'APL-PARTIDA': jsonServidor('ruta/ruta-resultado-partida'),
      'APL-LLEGADA': jsonServidor('ruta/ruta-resultado-llegada'),
    },
    { comparacion },
  )
  const vista = vistaRuta(HelenaResultView)
  assert.match(vista, /Página I · descifrada/)
  assert.match(vista, /Claridad/)
  assert.match(vista, /En camino → Zona fuerte/)
  assert.match(vista, /<details><summary>1 respuesta se mantuvo<\/summary><ul><li><span>Sé qué quiero hacer/)
  // Los que cambiaron van primero, con el mismo estilo sea cual sea el sentido del cambio.
  assert.match(vista, /<span>Puedo explicar con mis palabras qué camino me atrae.<\/span> <strong>Bastante de acuerdo → Muy de acuerdo<\/strong>/)
  assert.doesNotMatch(vista, /puntaje|porcentaje|%/)
})

test('T2 bloqueado por un revelado muestra el aviso con el enlace al libro de Helena', () => {
  const app = fixtureServidor()
  const sesion = app.load('src/store/servidor/sesion.ts')
  const bloques = jsonServidor('ruta/ruta-actividades-t1')
  sesion.publicar({ actividades: { datos: bloques, estado: 'listo', error: null } })
  const camino = app.load('src/features/adventure/lib/caminoPoints.ts').getCaminoPoints({}, {})
  const { getPointDetails } = app.load('src/features/adventure/lib/pointDetails.ts')
  const llegada = getPointDetails(
    camino.find((p) => p.specActivityId === 't-llegada'),
    {},
    {},
  )
  assert.match(llegada.requirement, /revela tu punto de partida/)
  assert.deepEqual(copia(llegada.requirementLink), { label: 'Ir al libro de Helena', href: '/student/profile/helena' })
  const inicio = getPointDetails(
    camino.find((p) => p.specActivityId === 't-cierre-inicio'),
    {},
    {},
  )
  assert.equal(inicio.requirementLink, undefined)
})
