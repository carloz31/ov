import assert from 'node:assert/strict'
import test from 'node:test'
import { elementos, esperar, fixtureServidor } from '../../soporte/servidor-ayudas.mjs'

// Ajuste desbloqueos (D): antes de la primera misión, el «?» del mapa abre el reproductor de ayuda de Lumi con un
// ícono de pregunta en lugar de Lumi, llamado «Ayuda» y, con un solo mensaje, sin pasos ni «Anterior».
function texto(nodo) {
  if (nodo == null || typeof nodo === 'boolean') return ''
  if (typeof nodo === 'string' || typeof nodo === 'number') return String(nodo)
  if (Array.isArray(nodo)) return nodo.map(texto).join('')
  return texto(nodo.props?.children)
}

function dialogo(app, props) {
  const { LumiDialogue } = app.load('src/features/adventure/components/overlays/LumiDialogue.tsx')
  const montado = app.mount(LumiDialogue, { onClose() {}, ...props })
  const tree = montado.render()
  montado.unmount()
  const contenido = elementos(tree, (e) => e.props?.['aria-label'] !== undefined && e.props.className?.includes('sx-lumi-dialog'))[0]
  return {
    nombre: contenido.props['aria-label'],
    lumi: elementos(tree, (e) => e.type?.name === 'CharacterAvatar').length,
    // El ícono de pregunta va en el círculo del avatar, del mismo tamaño que el de Lumi.
    pregunta: elementos(tree, (e) => e.props?.className === 'sx-character-circle sx-character-lg').length,
    indicadores: elementos(tree, (e) => e.props?.className === 'sx-lumi-indicators').length,
    anterior: elementos(tree, (e) => e.type === 'button' && texto(e).includes('Anterior')).length,
  }
}

test('la variante de ayuda con un mensaje: ícono de pregunta, «Ayuda», sin pasos ni «Anterior»', () => {
  const app = fixtureServidor()
  const { avisoAyudaMapa } = app.load('src/data/content/guideTexts.ts')
  assert.equal(avisoAyudaMapa, 'Empieza por la misión que brilla en el mapa.')
  assert.deepEqual(dialogo(app, { steps: [avisoAyudaMapa], variante: 'ayuda' }),
    { nombre: 'Ayuda', lumi: 0, pregunta: 1, indicadores: 0, anterior: 0 })
})

test('la guía de Lumi no cambia', () => {
  const app = fixtureServidor()
  assert.deepEqual(dialogo(app, { steps: ['Uno', 'Dos'] }),
    { nombre: 'Orientación de Lumi', lumi: 1, pregunta: 0, indicadores: 1, anterior: 1 })
  assert.deepEqual(dialogo(app, { steps: ['Uno'] }),
    { nombre: 'Orientación de Lumi', lumi: 1, pregunta: 0, indicadores: 1, anterior: 1 })
})

test('openGuide con la variante de ayuda la lleva a la cola de novedades', async () => {
  const app = fixtureServidor({ ruta: '/student/missions' })
  const { useNoveltyQueue } = app.load('src/features/adventure/hooks/useNoveltyQueue.ts')
  const q = app.mount((p) => useNoveltyQueue(p.view, p.activityOpen), { view: 'missions', activityOpen: false })
  q.render().context.openGuide(['Empieza por la misión que brilla en el mapa.'], 'ayuda')
  await esperar()
  const estado = q.render()
  q.unmount()
  assert.deepEqual([estado.guide, estado.varianteGuia], [['Empieza por la misión que brilla en el mapa.'], 'ayuda'])
})
