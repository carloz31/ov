import assert from 'node:assert/strict'
import test from 'node:test'
import { elementos, fixtureServidor } from '../../soporte/servidor-ayudas.mjs'

// Ajuste lumi-mensajes (§13): en el portal del apoderado habla la plataforma, de usted, y no aparece Lumi.
const texto = (n) =>
  Array.isArray(n)
    ? n.map(texto).join('')
    : typeof n === 'string' || typeof n === 'number'
      ? String(n)
      : n?.props
        ? texto(n.props.children)
        : ''

function guia(app, audience) {
  const { GuideDialogue } = app.load('src/components/common/GuideDialogue.tsx')
  return app.mount(GuideDialogue, { audience, text: 'DATO DE PRUEBA', abierto: true, onCerrar() {} }).render()
}
const etiquetas = (arbol) =>
  elementos(arbol, (e) => e.props?.role === 'img').map((e) => e.props['aria-label'])

test('la guía para familias muestra un ícono, no la figura de Lumi', () => {
  const app = fixtureServidor({ ruta: '/parent' })
  const familias = guia(app, 'parent')
  assert.deepEqual(etiquetas(familias), ['Guía para familias'])
  assert.doesNotMatch(texto(familias), /Lumi/)
  assert.match(texto(familias), /Guía para familias/)
  const estudiante = guia(app, 'student')
  assert.deepEqual(etiquetas(estudiante), ['Lumi'])
  assert.match(texto(estudiante), /Lumi · Quien te acompaña/)
})

test('cada sección del portal en api tiene su guía, de usted', () => {
  const app = fixtureServidor({ ruta: '/parent' })
  const { parentGuides } = app.load('src/data/content/guideTexts.ts')
  assert.deepEqual(Object.keys(parentGuides).sort(), [
    'activities',
    'careers',
    'conversations',
    'overview',
    'questionnaire',
  ])
  for (const [clave, guia] of Object.entries(parentGuides)) {
    assert.doesNotMatch(guia, /\b(tu|tus|úsalo|completes|ves)\b|Lumi|orientadora/, clave)
    assert.match(guia, /su hijo o hija/, clave)
  }
})
