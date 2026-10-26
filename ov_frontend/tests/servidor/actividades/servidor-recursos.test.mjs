import assert from 'node:assert/strict'
import test from 'node:test'
import { cargarAlmacen, copia, elementos, esperar, fixtureServidor, jsonServidor } from '../../soporte/servidor-ayudas.mjs'

// F04d: el visor de la mochila es la única presentación de una ficha.
const texto = (n) =>
  Array.isArray(n)
    ? n.map(texto).join('')
    : typeof n === 'string' || typeof n === 'number'
      ? String(n)
      : n?.props
        ? texto(n.props.children)
        : ''

test('una diapositiva con más de un recurso no pasa la validación; los contenidos actuales sí', () => {
  const app = fixtureServidor()
  const { validateActivity } = app.load('src/lib/activities/validation.ts')
  const { contenidos } = app.load('src/data/activities/contenidos.ts')
  for (const contenido of Object.values(contenidos)) validateActivity(contenido)
  const diapositiva = { id: 'd1', tipo: 'diapositiva', bloques: [], recursoIds: ['ficha-mitos', 'rec-video-mitos'] }
  assert.throws(
    () => validateActivity({ id: 'prueba', tipo: 'encuentro', nodos: [diapositiva] }),
    /trae más de un recurso/,
  )
  assert.doesNotThrow(() =>
    validateActivity({ id: 'prueba', tipo: 'encuentro', nodos: [{ ...diapositiva, recursoIds: ['ficha-mitos'] }] }),
  )
})

// Ajuste mochila: un solo modal de ficha, sin badge ni «Leí la ficha», con favoritos en el pie.
test('el modal de ficha no tiene badge ni «Leí la ficha» y conserva los favoritos', () => {
  const app = fixtureServidor()
  const { FichaModal } = app.load('src/features/backpack/components/FichaModal.tsx')
  const { recursoDesdeCatalogo } = app.load('src/features/backpack/lib/travelerResources.ts')
  const resource = recursoDesdeCatalogo('t-ficha')
  const modal = texto(app.mount(FichaModal, { abierto: true, resource, onClose() {} }).render())
  assert.ok(!modal.includes('desbloqueada') && !modal.includes('Leí la ficha') && !modal.includes('Ficha leída'))
  assert.ok(modal.includes('Agregar a favoritos') && modal.includes(resource.title))
  assert.ok(modal.includes('Las favoritas aparecen primero cuando armes tus planes.'))
})

test('los recursos del catálogo se abren por código, también los que no son fichas', () => {
  const app = fixtureServidor()
  const { recursoDesdeCatalogo, recursoDeFicha } = app.load('src/features/backpack/lib/travelerResources.ts')
  assert.equal(recursoDesdeCatalogo('t-ficha-2', 'Título del servidor').title, 'Título del servidor')
  // Enlace, lectura y video siguen abriéndose (el video sin enlace muestra el aviso de «próximamente»).
  for (const codigo of ['rec-ponteencarrera', 'rec-unesco-stem', 'rec-video-mitos'])
    assert.ok(recursoDesdeCatalogo(codigo), codigo)
  assert.ok(recursoDesdeCatalogo('rec-ponteencarrera').url && recursoDesdeCatalogo('rec-unesco-stem').content)
  // Una ficha del servidor sin contenido en el front se abre con su título y el aviso de «próximamente».
  assert.deepEqual(copia(recursoDeFicha('sin-contenido', 'Ficha nueva')).title, 'Ficha nueva')
  assert.equal(recursoDeFicha('sin-contenido'), undefined)
})

test('en api, la mochila lista las fichas de la cuenta en el servidor, disponibles y bloqueadas', () => {
  const app = fixtureServidor()
  const sesion = app.load('src/store/servidor/sesion.ts')
  const recursos = app.load('src/features/backpack/lib/travelerResources.ts')
  const fichas = (etapa) => {
    sesion.publicar({ fichas: { datos: jsonServidor(`ruta/ruta-fichas-${etapa}`), estado: 'listo', error: null } })
    return recursos.getTravelResources([]).filter((r) => r.kind === 'sheet')
  }
  const inicial = fichas('inicial')
  assert.deepEqual(copia(inicial.map((r) => [r.id, r.title])), [
    ['t-ficha', 'Ficha de prueba'],
    ['t-ficha-2', 'Segunda ficha de prueba'],
    ['t-ficha-3', 'Carrera, ocupación e institución'],
  ])
  assert.deepEqual(copia(inicial.map((r) => recursos.isTravelResourceUnlocked(r, {}, {}))), [false, false, false])
  const final = fichas('final')
  assert.deepEqual(copia(final.map((r) => recursos.isTravelResourceUnlocked(r, {}, {}))), [true, true, false])
  // Ajuste mochila: el contenido, el tema y el origen de una ficha obtenida salen del servidor.
  assert.ok(final[0].content.startsWith('Muchas decisiones'))
  assert.deepEqual(copia([final[0].ficha.tema, final[0].ficha.actividad.codigo, final[0].ficha.tramo.numero]), [
    'Mitos y creencias',
    't-inicio',
    1,
  ])
})

test('?ficha= de una ficha bloqueada abre su pop up de requisito; disponible, el visor', async () => {
  const preparar = async (etapa) => {
    const app = fixtureServidor({ ruta: '/student/resources?kind=sheet&ficha=t-ficha' })
    app.fetch((r) => {
      if (r.url.endsWith('/fichas')) return { body: jsonServidor(`ruta/ruta-fichas-${etapa}`) }
      if (r.url.endsWith('/testimonios')) return { body: [] }
      if (r.url.includes('/progreso/FICHA/t-ficha'))
        return { body: { tipo: 'FICHA', codigo: 't-ficha', estado: 'BLOQUEADA', reglas: [] } }
      return { body: [] }
    })
    const almacen = cargarAlmacen(app)
    almacen.publicar({ consultasHabilitadas: true })
    await almacen.asegurarSeccion('fichas')
    const view = app.mount(app.load('src/features/backpack/hooks/useBackpack.ts').useBackpack, {})
    view.render()
    await esperar()
    return view.render()
  }
  const bloqueada = await preparar('inicial')
  assert.equal(bloqueada.requisitoId, 't-ficha')
  assert.equal(bloqueada.isUnlocked(bloqueada.selected), false)
  const disponible = await preparar('final')
  assert.equal(disponible.requisitoId, null)
  assert.equal(disponible.selected.id, 't-ficha')
  assert.equal(disponible.isUnlocked(disponible.selected), true)
})

test('el modal muestra el contenido, el enlace y el aviso de lo pendiente (antes en el drawer de fichas)', () => {
  const app = fixtureServidor()
  const { FichaModal } = app.load('src/features/backpack/components/FichaModal.tsx')
  const { recursoDesdeCatalogo, recursoDeFicha } = app.load('src/features/backpack/lib/travelerResources.ts')
  const dibujar = (resource) => app.mount(FichaModal, { abierto: true, resource, onClose() {} }).render()
  const ficha = dibujar(recursoDesdeCatalogo('ficha-mitos'))
  assert.ok(texto(ficha).includes('Mitos y realidades del futuro profesional'))
  // El contenido lo dibuja ResourceContent, el mismo de la mochila.
  const { ResourceContent } = app.load('src/features/backpack/components/ResourceContent.tsx')
  const contenido = (resource) => app.mount(ResourceContent, { resource }).render()
  const enlace = contenido(recursoDesdeCatalogo('rec-ponteencarrera'))
  assert.equal(elementos(enlace, (e) => e.type === 'a' && /ponteencarrera\.pe/.test(e.props.href)).length, 1)
  assert.ok(texto(contenido(recursoDeFicha('sin-contenido', 'Ficha nueva'))).includes('estará disponible próximamente'))
  assert.equal(elementos(ficha, (e) => e.type?.name === 'ResourceContent').length, 1)
})

test('con una ficha abierta (o su requisito), el tutorial de Lumi espera y no se marca como visto (F04d)', async () => {
  const app = fixtureServidor({ ruta: '/student/resources?kind=sheet&ficha=t-ficha' })
  const ui = app.load('src/store/studentUiStore.ts')
  const visor = app.load('src/store/visorRecursoStore.ts')
  ui.updateStudentUi((s) => ({ ...s, introsSeen: { ...s.introsSeen, resources: false }, cityArrivalSeen: true }))
  const { useNoveltyQueue } = app.load('src/features/adventure/hooks/useNoveltyQueue.ts')
  const cola = app.mount((p) => useNoveltyQueue(p.view, p.activityOpen), { view: 'resources', activityOpen: false })
  const render = () => cola.render()
  const vista = () => ui.useStudentUi().introsSeen.resources ?? false
  // La mochila abrió la ficha pedida por ?ficha=: el tutorial no se muestra.
  const cerrarFicha = visor.registrarFichaEnPantalla()
  render()
  await esperar()
  assert.equal(render().active, null)
  assert.equal(vista(), false)
  // Al cerrarla, el tutorial aparece; recién al cerrarlo queda visto.
  cerrarFicha()
  await esperar()
  const conTutorial = render()
  assert.deepEqual(copia(conTutorial.active), { kind: 'intro', view: 'resources' })
  // El pop up de requisito también tiene prioridad.
  const cerrarRequisito = visor.registrarFichaEnPantalla()
  assert.equal(render().active, null)
  cerrarRequisito()
  await esperar()
  assert.equal(vista(), false)
  render().closeGuide()
  await esperar()
  assert.equal(render().active, null)
  assert.equal(vista(), true)
  cola.unmount()
})
