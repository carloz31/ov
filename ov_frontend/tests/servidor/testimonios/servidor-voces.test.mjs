import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { cargarAlmacen, elementos, esperar, fixtureServidor, jsonServidor } from '../../soporte/servidor-ayudas.mjs'

// Ajuste testimonios: línea de la persona, origen por caso o actividad, video con su tramo y cierres.
// DATO DE PRUEBA: voces de actividad armadas sobre los fixtures, porque `ruta` está congelada y no las tiene.
const final = jsonServidor('ruta/ruta-testimonios-final')
const actividad = { codigo: 't-inicio', titulo: 'Misión de prueba' }
const abiertaDeActividad = {
  ...final[0],
  contexto: 'Técnico en LATAM',
  caso: null,
  caso_disponible: false,
  actividad,
  actividad_disponible: true,
}
const bloqueadaDeActividad = { ...final[2], caso: null, caso_disponible: false, actividad, actividad_disponible: true }
const cerradaDeActividad = { ...bloqueadaDeActividad, codigo: 'tb-cerrada', actividad_disponible: false }

const html = (app, ruta, nombre, props) =>
  renderToStaticMarkup(
    React.createElement(MemoryRouter, {}, React.createElement(app.load(ruta)[nombre], props)),
  )

async function mochila(testimonios) {
  const app = fixtureServidor({ ruta: '/student/resources?kind=testimonial' })
  app.fetch((r) => {
    if (r.url.endsWith('/fichas')) return { body: jsonServidor('ruta/ruta-fichas-final') }
    if (r.url.endsWith('/testimonios')) return { body: testimonios }
    return { body: [] }
  })
  const almacen = cargarAlmacen(app)
  almacen.publicar({ consultasHabilitadas: true })
  await almacen.asegurarSeccion('fichas')
  const hook = app.mount(app.load('src/features/backpack/hooks/useBackpack.ts').useBackpack, {})
  hook.render()
  await esperar()
  return { app, model: hook.render() }
}

test('la URL del embed arranca en el inicio y solo lleva fin si existe', () => {
  const { urlEmbedTestimonio, urlYoutubeTestimonio } = fixtureServidor().load('src/lib/servidor/adaptadoresCasos.ts')
  assert.equal(
    urlEmbedTestimonio({ video_id: 'IwEQbscMmss', inicio: 12, fin: null }),
    'https://www.youtube-nocookie.com/embed/IwEQbscMmss?start=12',
  )
  assert.equal(
    urlEmbedTestimonio({ video_id: 'ayxDpxdNOjc', inicio: 180, fin: 480 }),
    'https://www.youtube-nocookie.com/embed/ayxDpxdNOjc?start=180&end=480',
  )
  assert.equal(urlYoutubeTestimonio({ video_id: 'IwEQbscMmss', inicio: 12 }), 'https://youtu.be/IwEQbscMmss?t=12')
  assert.equal(urlEmbedTestimonio({ video_id: null, inicio: null, fin: null }), undefined)
})

test('el recurso lleva la línea de la persona, sin años, y el contexto aparte', () => {
  const { testimonioServidor } = fixtureServidor().load('src/features/backpack/lib/travelerResources.ts')
  const recurso = testimonioServidor(abiertaDeActividad)
  assert.equal(recurso.author, 'Luis Mendoza · Antropólogo y arqueólogo')
  assert.equal(recurso.contexto, 'Técnico en LATAM')
  assert.equal(recurso.embed, 'https://www.youtube-nocookie.com/embed/ysz5S6PUM-U?start=0')
  assert.equal('contexto' in testimonioServidor(final[0]), false)
})

test('tarjeta abierta: con y sin contexto, y su origen por caso o por actividad', () => {
  const app = fixtureServidor()
  const ruta = 'src/features/backpack/components/TarjetaTestimonio.tsx'
  const base = { nombre: 'Hugo', rol: 'Técnico', titulo: 'T', cita: 'C', nueva: false, favorita: false }
  const conCaso = html(app, ruta, 'TarjetaTestimonio', { ...base, regalo: 'La plaza' })
  assert.match(conCaso, /Te la regaló el llamado <strong>La plaza<\/strong>/)
  assert.equal((conCaso.match(/<p>/g) ?? []).length, 1)
  const conActividad = html(app, ruta, 'TarjetaTestimonio', {
    ...base,
    regalo: 'Misión',
    deActividad: true,
    contexto: 'Técnico en LATAM',
  })
  assert.match(conActividad, /Te la dejó la misión <strong>Misión<\/strong>/)
  assert.match(conActividad, /<p>Técnico<\/p><p>Técnico en LATAM<\/p>/)
  assert.doesNotMatch(conActividad, /experiencia/)
})

test('voz de actividad bloqueada: se lista solo con su actividad disponible y lleva al mapa', async () => {
  const { app, model } = await mochila([abiertaDeActividad, bloqueadaDeActividad, cerradaDeActividad])
  assert.deepEqual(
    [model.voces.abiertas.length, model.voces.porDescubrir.length, model.voces.pendientes],
    [1, 1, 1],
  )
  const { CompartimentoVoces } = app.load('src/features/backpack/components/CompartimentoVoces.tsx')
  const arbol = app.mount(CompartimentoVoces, { model }).render()
  const voz = elementos(arbol, (e) => e.type?.name === 'VozPorDescubrir')[0].props
  assert.deepEqual([voz.caso, voz.deActividad], ['Misión de prueba', true])
  assert.ok(voz.hrefCaso.startsWith('/student/missions?punto='))
  const tarjeta = html(app, 'src/features/backpack/components/VozPorDescubrir.tsx', 'VozPorDescubrir', voz)
  assert.match(tarjeta, /Completa la misión <strong>Misión de prueba<\/strong> en el mapa\./)
  assert.match(tarjeta, /Ir al mapa/)
  const abierta = elementos(arbol, (e) => e.type?.name === 'TarjetaTestimonio')[0].props
  assert.deepEqual([abierta.contexto, abierta.regalo, abierta.deActividad], [
    'Técnico en LATAM',
    'Misión de prueba',
    true,
  ])
  // El cierre cuenta la que falta, en singular; el total sale de lo que entrega el servidor.
  const cierre = elementos(arbol, (e) => e.type?.name === 'TarjetaPunteada')[0].props
  assert.equal(cierre.texto, '1 voz más espera en el camino y en llamados que aún no se abren.')
  assert.equal(model.voices.length, 3)
})

test('textos de voces: api menciona las misiones del camino; local conserva los suyos', () => {
  const { textosVoces } = fixtureServidor().load('src/features/backpack/lib/compartimentos.ts')
  const api = textosVoces(true, 14, 3)
  assert.equal(api.cierre, '3 voces más esperan en el camino y en llamados que aún no se abren.')
  assert.equal(
    api.encabezado,
    'Personas reales que cuentan cómo llegaron a lo que hacen. Las encuentras al resolver llamados en la Central de Casos y en algunas misiones del camino.',
  )
  assert.equal(
    api.vacio,
    'Cada llamado que superas en la Central de Casos, y algunas misiones del camino, te presentan a alguien que ya recorrió un camino. Hay 14 voces en la ciudad.',
  )
  const local = textosVoces(false, 2, 1)
  assert.equal(local.cierre, '1 voz más espera en llamados que aún no se abren. Aparecerán aquí cuando la Central los publique.')
  assert.match(local.encabezado, /Cada llamado que atiendes/)
})

test('cierre: persona, ocupación y contexto; una sola voz muestra una sola tarjeta y dos, dos', () => {
  const app = fixtureServidor()
  const { resumirCierre } = app.load('src/features/activities/lib/finishSummary.ts')
  const desbloqueo = (codigo) => ({
    regla: `R-${codigo}`,
    tipo_objetivo: 'TESTIMONIO',
    objetivo: { codigo, nombre: `Título ${codigo}` },
    condiciones: [],
  })
  const entrada = {
    yaCompletada: false,
    completada: true,
    tienePreguntaDiario: false,
    modoApi: true,
    testimonios: {
      'tc4-1': { persona: 'Sandro Ventura', rol: 'Editores', contexto: 'Cineasta con productora propia' },
      'tc5-1': { persona: 'Ricardo Gonzales', rol: 'Fisioterapeutas' },
    },
  }
  const ruta = 'src/features/activities/components/FinishBackpackSection.tsx'
  const una = html(app, ruta, 'FinishBackpackSection', {
    resumen: resumirCierre({ ...entrada, desbloqueos: [desbloqueo('tc4-1')] }),
  })
  assert.equal((una.match(/class="sx-finish-testimonial"/g) ?? []).length, 1)
  assert.match(una, /Sandro Ventura · Editores/)
  assert.match(una, /<span class="sx-finish-contexto">Cineasta con productora propia<\/span>/)
  assert.match(una, /kind=testimonial&amp;ficha=tc4-1/)
  const dos = html(app, ruta, 'FinishBackpackSection', {
    resumen: resumirCierre({ ...entrada, desbloqueos: [desbloqueo('tc5-1'), desbloqueo('tc5-2')] }),
  })
  assert.equal((dos.match(/class="sx-finish-testimonial"/g) ?? []).length, 2)
  assert.doesNotMatch(dos, /sx-finish-contexto/)
  // Mientras carga la sección, el título en lugar de la persona.
  assert.match(dos, /Título tc5-2/)
})
