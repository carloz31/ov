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
  // Insignia y nivel salen de la lista: son medallas bajo el título.
  assert.deepEqual(
    Array.from(resumen.extras, (e) => e.tipo),
    ['BLOQUE', 'ACTIVIDAD', 'CONVERSACIONES', 'pieza'],
  )
  assert.deepEqual(
    Array.from(resumen.extras, (e) => e.texto),
    [
      'La ciudad te espera',
      '1 actividad nueva en el mapa',
      'Conversaciones disponibles',
      'Pieza de llave: Molino · 2 de 4 para la ciudad',
    ],
  )
  assert.deepEqual(copia(resumen.medallas.map((m) => [m.tipo, m.etiqueta, m.nombre])), [
    ['INSIGNIA', 'Nueva insignia', 'La llave de la ciudad'],
    ['NIVEL', 'Subiste de nivel', 'Cartógrafo de posibilidades'],
  ])
  assert.equal(resumir([desbloqueo('BLOQUE', 'BOSQUE', 'Bosque')]).extras[0].texto, 'Nueva zona: Bosque')
})

test('las secciones abiertas tienen su texto en el cierre, como al cerrar t-valores (F01)', () => {
  const { resumir } = preparar()
  const valores = jsonServidor('ruta/ruta-continuar-sin-responder-t-valores').nuevos_desbloqueos
  const r = resumir([
    ...valores,
    desbloqueo('SECCION', 'CATALOGO', 'Catálogo'),
    desbloqueo('SECCION', 'DIARIO', 'Diario'),
    desbloqueo('SECCION', 'PLANES', 'Planes'),
  ])
  assert.equal(r.modo, 'soloExtras')
  // Todas las secciones del perfil en una sola fila; la sección de planes, en la suya.
  assert.deepEqual(copia(r.extras.map((e) => [e.tipo, e.texto])), [
    ['SECCIONES', 'Catálogo, Diario y Planes'],
    ['SECCION_PLAN', `Nueva sección en tus planes: ${valores[0].objetivo.nombre}`],
  ])
  assert.equal(resumir([desbloqueo('SECCION', 'DIARIO', 'Diario')]).extras[0].texto, 'Diario')
})

test('agrupa dos actividades en un único extra', () => {
  const r = preparar().resumir([desbloqueo('ACTIVIDAD', 'a'), desbloqueo('ACTIVIDAD', 'b')])
  assert.equal(r.extras.length, 1)
  assert.equal(r.extras[0].texto, '2 actividades nuevas en el mapa')
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
  assert.equal(r.extras.length, 2)
  assert.equal(r.medallas.length, 2)
  assert.equal(r.fichas[0].nombre, 'igual')
})

test('el título cambia al reunir cinco recursos y conserva el singular del subtítulo', () => {
  const { resumir } = preparar()
  const fichas = Array.from({ length: 4 }, (_, i) => desbloqueo('FICHA', `f-${i}`))
  assert.equal(resumir(fichas).titulo, 'Este hallazgo viaja contigo.')
  assert.equal(resumir([...fichas, desbloqueo('TESTIMONIO', 't')]).titulo, '¡Cuántos hallazgos juntos!')
  // La columna de la mochila ya muestra el conteo: el subtítulo no lo repite.
  assert.equal(resumir(fichas.slice(0, 1)).subtitulo, 'Tu actividad quedó registrada.')
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
  // Ajuste del diario de F05 (autorizado por la spec): la carta es una fila sin badge ni botón.
  const carta = render('FinishJournalSection', { pregunta: '¿Qué aprendiste?', enlace: '/student/journal' })
  assert.match(carta, /Lumi te dejó una carta en tu buzón/)
  assert.match(carta, /Leer en el diario/)
  assert.doesNotMatch(carta, /<button|Nueva/)
  const medallas = render('FinishMedalsSection', { medallas: r.medallas })
  assert.match(medallas, /href="\/student\/profile\?section=passport"/)
  assert.match(medallas, /<small>Subiste de nivel<\/small>/)
})

test('«Se abrió para ti» enlaza cada sección y la zona; las filas de planes y de actividades no tienen enlace', () => {
  const { app, resumir } = preparar()
  const r = resumir([
    desbloqueo('SECCION', 'CATALOGO', 'Catálogo'),
    desbloqueo('SECCION', 'CHECK_IN', 'Check-in'),
    desbloqueo('SECCION', 'PLANES', 'Planes'),
    desbloqueo('SECCION_PLAN', 'POR_QUE', 'Por qué'),
    desbloqueo('BLOQUE', 'CIUDAD', 'La ciudad'),
    desbloqueo('ACTIVIDAD', 'a'),
    desbloqueo('ACTIVIDAD', 'b'),
    desbloqueo('CONVERSACIONES', '-', 'Conversaciones'),
  ])
  const html = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      {},
      React.createElement(app.load('src/features/activities/components/FinishExtrasSection.tsx').FinishExtrasSection, {
        extras: r.extras,
      }),
    ),
  )
  const filas = html.split('<li>').slice(1)
  assert.match(html, /<h3 id="finish-extras-title">Se abrió para ti<\/h3>/)
  assert.match(
    filas[0],
    /<a href="\/student\/catalog\/professions"[^>]*>Catálogo<\/a>, Check-in y <a href="\/student\/profile\/decisions"[^>]*>Planes<\/a>/,
  )
  assert.match(filas[1], /Nueva sección en tus planes: Por qué/)
  assert.doesNotMatch(filas[1], /<a /)
  assert.match(filas[2], /La ciudad te espera.*href="\/student\/exploration"/)
  assert.match(filas[3], /2 actividades nuevas en el mapa/)
  assert.doesNotMatch(filas[3], /<a /)
  assert.match(filas[4], /Conversaciones disponibles.*href="\/student\/conversations"/)
})

test('el número de recursos de la mochila decide en qué columna va «Se abrió para ti»', () => {
  const { resumir } = preparar()
  const fichas = (n) => Array.from({ length: n }, (_, i) => desbloqueo('FICHA', `f-${i}`))
  const testimonios = (n) => Array.from({ length: n }, (_, i) => desbloqueo('TESTIMONIO', `t-${i}`))
  assert.equal(resumir([...fichas(3), ...ciudad()]).abiertoAlLado, true)
  assert.equal(resumir([...fichas(1), ...testimonios(1)]).abiertoAlLado, true)
  assert.equal(resumir([...fichas(4)]).abiertoAlLado, false)
  // Un testimonio con dos fichas ya ocupa demasiado alto aunque sean solo tres recursos.
  assert.equal(resumir([...fichas(2), ...testimonios(1)]).abiertoAlLado, false)
  // Sin mochila no hay columna derecha.
  assert.equal(resumir(ciudad()).abiertoAlLado, false)
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

// F00: el aviso del libro dependía de resultados_generados, que el servidor ya no envía (vuelve en F03).
test('el cierre API usa solo el recibo y conserva las acciones de diario y mapa', async () => {
  const f = await iniciarMara()
  const activity = { ...f.activity, id: 'act-tip-14', promptDiario: '¿Qué descubriste?' }
  const hook = f.app.load('src/features/activities/hooks/useActivityFinish.ts').useActivityFinish
  const recibo = jsonServidor('completar-act-tip-14')
  const m = hook(activity, recibo.nuevos_desbloqueos, false)
  assert.equal(m.resumen.totalRecursos, 0)
  assert.equal(m.resumen.extras.length, 1)
  // Ajuste del diario de F05: en api, la carta del cierre sale de `entradas_desbloqueadas`, no de `promptDiario`.
  assert.equal(m.preguntaDiario, undefined)
  const Finish = f.app.load('src/features/activities/components/FinishScreen.tsx').FinishScreen
  let cerrado = false
  const tree = Finish({
    activity,
    onClose() {
      cerrado = true
      assert.equal(f.app.navigations.at(-1), '/student/exploration')
    },
  })
  const botones = elementos(tree, (e) => e.type === 'button')
  assert.equal(
    botones.some((b) => String(b.props.children).includes('Abrir el libro')),
    false,
  )
  // F02: la salida es el componente compartido con la consulta del registro; su botón es el mismo.
  const salida = elementos(tree, (e) => e.type?.name === 'VolverAlMapa')[0]
  salida.type(salida.props).props.onClick()
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
