import assert from 'node:assert/strict'
import test from 'node:test'
import { copia, fixtureServidor } from '../../soporte/servidor-ayudas.mjs'

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

test('en modo repaso el visor oculta el badge y «Leí la ficha», y conserva los favoritos', () => {
  const app = fixtureServidor()
  const { VisorRecurso } = app.load('src/features/backpack/components/VisorRecurso.tsx')
  const { recursoDesdeCatalogo } = app.load('src/features/backpack/lib/travelerResources.ts')
  const resource = recursoDesdeCatalogo('t-ficha')
  const mochila = texto(app.mount(VisorRecurso, { resource, onClose() {} }).render())
  assert.ok(mochila.includes('desbloqueada') && mochila.includes('Leí la ficha'))
  assert.ok(mochila.includes('Agregar a favoritos'))
  const repaso = texto(app.mount(VisorRecurso, { resource, modo: 'repaso', onClose() {} }).render())
  assert.ok(!repaso.includes('desbloqueada') && !repaso.includes('Leí la ficha') && !repaso.includes('Ficha leída'))
  assert.ok(repaso.includes('Agregar a favoritos') && repaso.includes(resource.title))
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
