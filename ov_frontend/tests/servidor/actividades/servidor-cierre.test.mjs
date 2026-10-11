import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { copia, elementos, fixtureServidor, jsonServidor } from '../../soporte/servidor-ayudas.mjs'
import { iniciarMara } from '../../soporte/servidor-mara-ayudas.mjs'

// DATO DE PRUEBA: tipos y cantidades que aún no aparecen juntos en un recibo real.
const desbloqueo = (tipo_objetivo, codigo, nombre = codigo) => ({
  regla: `prueba-${codigo}`,
  tipo_objetivo,
  objetivo: { codigo, nombre },
  condiciones: [],
})
function preparar() {
  const app = fixtureServidor()
  const { resumirCierre } = app.load('src/features/activities/lib/finishSummary.ts')
  return {
    app,
    resumir: (desbloqueos = [], extra = {}) =>
      resumirCierre({
        desbloqueos,
        yaCompletada: false,
        completada: true,
        tienePreguntaDiario: true,
        modoApi: true,
        ...extra,
      }),
  }
}
const ciudad = () => jsonServidor('completar-mission-next-step').nuevos_desbloqueos

test('clasifica los ocho tipos y ordena los extras independientemente del recibo', () => {
  const { resumir } = preparar()
  const resumen = resumir(
    [
      ...ciudad(),
      ...jsonServidor('completar-act-tip-14').nuevos_desbloqueos,
      desbloqueo('TESTIMONIO', 'voz'),
      desbloqueo('PREGUNTA_DIARIO', 'pregunta'),
      desbloqueo('FICHA', 'ficha'),
    ],
    { pieza: { codigo: 'pieza', nombre: 'Molino', obtenidas: 2, necesarias: 4 } },
  )
  assert.equal(resumen.modo, 'recursos')
  assert.deepEqual(
    Array.from(resumen.fichas, (f) => f.codigo),
    ['ficha'],
  )
  assert.deepEqual(
    Array.from(resumen.testimonios, (t) => t.codigo),
    ['voz'],
  )
  assert.deepEqual(
    Array.from(resumen.extras, (e) => e.tipo),
    ['NIVEL', 'INSIGNIA', 'BLOQUE', 'ACTIVIDAD', 'CONVERSACIONES', 'pieza'],
  )
  assert.deepEqual(
    Array.from(resumen.extras, (e) => e.texto),
    [
      'Subiste a Cartógrafo de posibilidades',
      'Nueva insignia: La llave de la ciudad',
      'La ciudad te espera',
      'Se abrió: Las pistas que hablan de ti',
      'Conversaciones disponibles',
      'Pieza de llave: Molino · 2 de 4 para la ciudad',
    ],
  )
  assert.equal(resumir([desbloqueo('BLOQUE', 'BOSQUE', 'Bosque')]).extras[0].texto, 'Nueva zona: Bosque')
})

test('agrupa dos actividades en un único extra', () => {
  const r = preparar().resumir([desbloqueo('ACTIVIDAD', 'a'), desbloqueo('ACTIVIDAD', 'b')])
  assert.equal(r.extras.length, 1)
  assert.equal(r.extras[0].texto, '2 actividades nuevas')
})

test('siete fichas dejan tres visibles y cuatro ocultas; cuatro se muestran completas', () => {
  const { resumir } = preparar()
  const fichas = Array.from({ length: 7 }, (_, i) => desbloqueo('FICHA', `f-${i}`))
  const r = resumir(fichas)
  assert.equal(r.fichasVisibles.length, 3)
  assert.equal(r.fichasOcultas, 4)
  assert.equal(r.totalRecursos, 7)
  assert.equal(resumir(fichas.slice(0, 4)).fichasVisibles.length, 4)
  assert.equal(resumir(fichas.slice(0, 4)).fichasOcultas, 0)
})

test('tres testimonios dejan dos visibles y uno oculto, sin inventar contenido', () => {
  const r = preparar().resumir(
    Array.from({ length: 3 }, (_, i) => desbloqueo('TESTIMONIO', `t-${i}`)),
    {
      testimonios: { 't-0': { persona: 'Ana', rol: 'Ingeniera', cita: 'Aprendo haciendo.' } },
    },
  )
  assert.equal(r.testimoniosVisibles.length, 2)
  assert.equal(r.testimoniosOcultos, 1)
  assert.equal(r.testimonios[0].persona, 'Ana')
  assert.equal(r.testimonios[0].cita, 'Aprendo haciendo.')
  assert.equal(r.testimonios[1].cita, undefined)
  assert.equal(r.testimonios[1].persona, undefined)
})

test('distingue repaso, primer cierre sin novedades y consulta pendiente', () => {
  const { resumir } = preparar()
  assert.equal(resumir().modo, 'sinNovedades')
  const repaso = resumir([], { yaCompletada: true })
  assert.equal(repaso.modo, 'reintento')
  assert.equal(repaso.titulo, 'Repaso completado.')
  assert.equal(repaso.diario.visible, true)
  assert.equal(repaso.extras.length, 0)
  assert.equal(resumir([], { completada: false, yaCompletada: true }).modo, 'consultando')
  assert.equal(resumir([], { completada: false, modoApi: false }).titulo, 'Tu avance queda guardado.')
})

test('soloExtras también admite una pregunta sin recursos y una pieza local', () => {
  const { resumir } = preparar()
  assert.equal(resumir(ciudad()).modo, 'soloExtras')
  assert.equal(resumir(ciudad()).titulo, 'Sigues avanzando.')
  assert.equal(resumir([desbloqueo('PREGUNTA_DIARIO', 'p')]).modo, 'soloExtras')
  assert.equal(
    resumir([], { modoApi: false, pieza: { codigo: 'p', nombre: 'Plaza', obtenidas: 1, necesarias: 4 } })
      .modo,
    'soloExtras',
  )
})

test('marca la pregunta nueva sin crear un bloque de diario cuando no hay prompt', () => {
  const { resumir } = preparar()
  assert.deepEqual(copia(resumir([desbloqueo('PREGUNTA_DIARIO', 'p')]).diario), {
    visible: true,
    nueva: true,
  })
  assert.deepEqual(
    copia(resumir([desbloqueo('PREGUNTA_DIARIO', 'p')], { tienePreguntaDiario: false }).diario),
    { visible: false, nueva: true },
  )
  assert.equal(resumir().diario.nueva, false)
})

test('deduplica por tipo y código conservando objetivos de distintos tipos', () => {
  const { resumir } = preparar()
  const ficha = desbloqueo('FICHA', 'igual')
  const r = resumir([
    ficha,
    { ...ficha, regla: 'otra' },
    desbloqueo('TESTIMONIO', 'igual'),
    ...ciudad(),
    ...ciudad(),
  ])
  assert.equal(r.totalRecursos, 2)
  assert.equal(r.extras.length, 4)
  assert.equal(r.fichas[0].nombre, 'igual')
})

test('el título cambia al reunir cinco recursos y conserva el singular del subtítulo', () => {
  const { resumir } = preparar()
  const fichas = Array.from({ length: 4 }, (_, i) => desbloqueo('FICHA', `f-${i}`))
  assert.equal(resumir(fichas).titulo, 'Este hallazgo viaja contigo.')
  assert.equal(resumir([...fichas, desbloqueo('TESTIMONIO', 't')]).titulo, '¡Cuántos hallazgos juntos!')
  assert.equal(
    resumir(fichas.slice(0, 1)).subtitulo,
    'Tu actividad quedó registrada. Guardamos 1 recurso nuevo en tu mochila.',
  )
})

test('las secciones usan enlaces semánticos, límites, diario accesible e insignia al pasaporte', () => {
  const { app, resumir } = preparar()
  const r = resumir([
    ...Array.from({ length: 7 }, (_, i) => desbloqueo('FICHA', `f-${i}`)),
    ...Array.from({ length: 3 }, (_, i) => desbloqueo('TESTIMONIO', `t-${i}`)),
    ...ciudad(),
    desbloqueo('PREGUNTA_DIARIO', 'p'),
  ])
  const render = (name, props) =>
    renderToStaticMarkup(
      React.createElement(
        MemoryRouter,
        {},
        React.createElement(app.load(`src/features/activities/components/${name}.tsx`)[name], props),
      ),
    )
  const mochila = render('FinishBackpackSection', { resumen: r })
  assert.equal((mochila.match(/class="sx-finish-sheet"/g) ?? []).length, 3)
  assert.equal((mochila.match(/class="sx-finish-testimonial"/g) ?? []).length, 2)
  assert.match(mochila, /\+4 fichas más/)
  assert.match(mochila, /Ver 1 testimonio más/)
  assert.match(mochila, /href="\/student\/resources\?kind=testimonial&amp;ficha=t-0"/)
  assert.match(mochila, /href="\/student\/resources\?kind=sheet"/)
  assert.match(
    render('FinishJournalSection', { pregunta: '¿Qué aprendiste?', nueva: true, onWrite() {} }),
    /aria-label="Pregunta nueva"/,
  )
  const extras = render('FinishExtrasSection', { extras: r.extras, tarjetas: true })
  assert.match(extras, /href="\/student\/profile\?section=passport"/)
  assert.match(extras, /<small>Nivel<\/small>/)
})

test('el cierre local muestra lo obtenido y un repaso no vuelve a ofrecerlo', () => {
  const app = fixtureServidor({ api: false })
  const activity = app.load('src/data/activities/content.ts').activities.find((a) => a.id === 'enc-mitos')
  app
    .load('src/store/journeyStore.ts')
    .updateJourney((s) => ({
      ...s,
      resources: ['ficha-mitos'],
      pieces: ['pieza-plaza'],
      progress: { [activity.id]: { estado: 'completada' } },
    }))
  const hook = app.load('src/features/activities/hooks/useActivityFinish.ts').useActivityFinish
  assert.equal(hook(activity, [], false).resumen.modo, 'recursos')
  assert.equal(hook(activity, [], false).resumen.fichas.length, 1)
  const repaso = hook(activity, [], true).resumen
  assert.equal(repaso.modo, 'reintento')
  assert.equal(repaso.fichas.length, 0)
  assert.equal(repaso.extras.length, 0)
  assert.equal(repaso.diario.visible, true)
  assert.equal(app.requests.length, 0)
})

test('la mochila local selecciona el testimonio del enlace y conserva sus candados', () => {
  const app = fixtureServidor({
    api: false,
    ruta: '/student/resources?kind=testimonial&ficha=health-response-paramedic',
  })
  const hook = app.load('src/features/backpack/hooks/useBackpack.ts').useBackpack
  const m = hook()
  assert.equal(m.selected.id, 'health-response-paramedic')
  assert.equal(m.selected.kind, 'testimonial')
  assert.equal(m.isUnlocked(m.selected), false)
  app.load('src/store/adventureStore.ts').updateAdventure((s) => ({ ...s, solvedCaseIds: ['forest-fire'] }))
  assert.equal(hook().isUnlocked(hook().selected), true)
  assert.equal(app.requests.length, 0)
})

test('el cierre API usa solo el recibo y conserva las acciones de diario, libro y mapa', async () => {
  const f = await iniciarMara()
  const activity = { ...f.activity, id: 'act-tip-14', promptDiario: '¿Qué descubriste?' }
  const hook = f.app.load('src/features/activities/hooks/useActivityFinish.ts').useActivityFinish
  const recibo = jsonServidor('completar-act-tip-14')
  const m = hook(activity, recibo.nuevos_desbloqueos, false)
  assert.equal(m.resumen.totalRecursos, 0)
  assert.equal(m.resumen.extras.length, 1)
  m.escribirDiario()
  const diario = new URL(f.app.navigations.at(-1), 'https://prueba.local')
  assert.equal(diario.searchParams.get('activity'), 'act-tip-14')
  assert.equal(diario.searchParams.get('prompt'), activity.promptDiario)
  assert.equal(diario.searchParams.get('title'), activity.titulo)
  const Finish = f.app.load('src/features/activities/components/FinishScreen.tsx').FinishScreen
  let cerrado = false
  const tree = Finish({
    activity,
    resultadosGenerados: recibo.resultados_generados,
    onClose() {
      cerrado = true
      assert.equal(f.app.navigations.at(-1), '/student/exploration')
    },
  })
  const botones = elementos(tree, (e) => e.type === 'button')
  botones.find((b) => String(b.props.children).includes('Abrir el libro')).props.onClick()
  assert.equal(f.app.navigations.at(-1), '/student/profile/helena')
  botones.at(-1).props.onClick()
  assert.equal(cerrado, true)
})

test('el reproductor conserva yaCompletada de la apertura aunque el servidor confirme el cierre', async () => {
  const f = await iniciarMara()
  const activity = f.app
    .load('src/data/activities/content.ts')
    .activities.find((a) => a.id === 'mission-welcome')
  const remota = f.estado.bloques.flatMap((b) => b.actividades).find((a) => a.codigo === activity.id)
  remota.estado = 'DISPONIBLE'
  await f.almacen.refrescar()
  const hook = f.app.load('src/features/activities/hooks/useActivityPlayer.ts').useActivityPlayer
  const mounted = f.app.mount(hook, { activity, onClose() {} })
  assert.equal(mounted.render().yaCompletada, false)
  remota.estado = 'COMPLETADA'
  await f.almacen.refrescar()
  assert.equal(mounted.render().yaCompletada, false)
  mounted.unmount()
  const repeticion = f.app.mount(hook, { activity, onClose() {} })
  assert.equal(repeticion.render().yaCompletada, true)
  repeticion.unmount()
})

test('el reproductor local conserva el estado inicial al completar y reconoce el repaso al remontar', () => {
  const app = fixtureServidor({ api: false })
  const activity = app
    .load('src/data/activities/content.ts')
    .activities.find((a) => a.id === 'mission-welcome')
  const store = app.load('src/store/journeyStore.ts')
  const hook = app.load('src/features/activities/hooks/useActivityPlayer.ts').useActivityPlayer
  const mounted = app.mount(hook, { activity, onClose() {} })
  assert.equal(mounted.render().yaCompletada, false)
  store.updateJourney((s) => ({
    ...s,
    progress: {
      ...s.progress,
      [activity.id]: { ...s.progress[activity.id], estado: 'completada', nodoActualId: '$fin' },
    },
  }))
  assert.equal(mounted.render().yaCompletada, false)
  mounted.unmount()
  const repaso = app.mount(hook, { activity, onClose() {} })
  assert.equal(repaso.render().yaCompletada, true)
  repaso.unmount()
  assert.equal(app.requests.length, 0)
})

test('sin confirmación remota el cierre consulta el avance aunque el estado local diga completada', async () => {
  const f = await iniciarMara()
  const activity = f.activity
  f.estado.bloques.flatMap((b) => b.actividades).find((a) => a.codigo === activity.id).estado = 'DISPONIBLE'
  await f.almacen.refrescar()
  f.app
    .load('src/store/journeyStore.ts')
    .updateJourney((s) => ({
      ...s,
      resources: ['ficha-mitos'],
      pieces: ['pieza-plaza'],
      progress: { [activity.id]: { estado: 'completada' } },
    }))
  const hook = f.app.load('src/features/activities/hooks/useActivityFinish.ts').useActivityFinish
  const resumen = hook(activity).resumen
  assert.equal(resumen.modo, 'consultando')
  assert.equal(resumen.totalRecursos, 0)
  assert.equal(resumen.extras.length, 0)
})
