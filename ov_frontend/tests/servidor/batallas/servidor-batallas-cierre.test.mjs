import assert from 'node:assert/strict'
import test from 'node:test'
import { copia, elementos, fixtureServidor, jsonServidor } from '../../soporte/servidor-ayudas.mjs'

// F04b: orden del repaso y cierres de la batalla del servidor.
const texto = (n) =>
  Array.isArray(n)
    ? n.map(texto).join('')
    : typeof n === 'string' || typeof n === 'number'
      ? String(n)
      : n?.props
        ? texto(n.props.children)
        : ''

test('el repaso abre primero la ficha con más errores; si empatan, la del primer fallo', () => {
  const app = fixtureServidor()
  const { ordenFichasRepaso } = app.load('src/features/activities/lib/batallaServidor.ts')
  const fichas = ['t-ficha', 't-ficha-2']
  assert.deepEqual(copia(ordenFichasRepaso(fichas, ['t-ficha-2', 't-ficha', 't-ficha-2'])), ['t-ficha-2', 't-ficha'])
  assert.deepEqual(copia(ordenFichasRepaso(fichas, ['t-ficha-2', 't-ficha'])), ['t-ficha-2', 't-ficha'])
  assert.deepEqual(copia(ordenFichasRepaso(fichas, ['t-ficha', 't-ficha-2'])), ['t-ficha', 't-ficha-2'])
  // Sin errores (la intro), el orden de la batalla: la de su primera pregunta.
  assert.deepEqual(copia(ordenFichasRepaso(fichas, [])), fichas)
  assert.deepEqual(copia(ordenFichasRepaso(['t-ficha'], ['t-ficha-2'])), ['t-ficha'])
})

function cierre(cambios = {}) {
  const app = fixtureServidor()
  const { challenges } = app.load('src/data/content/challenges.ts')
  const { CierreBatalla } = app.load('src/features/activities/components/challenges/CierreBatalla.tsx')
  const c = challenges.find((x) => x.id === 'desafio-rumor')
  const llamadas = []
  const model = {
    c,
    battle: { questions: [], index: 0, enemyLife: 0, sparks: 2, hits: 5, answered: 6, finished: true },
    victory: true,
    practicaIntento: false,
    desbloqueos: [],
    title: { current: null },
    sheets: ['t-ficha-2', 't-ficha'],
    setResourcesOpen: (v) => llamadas.push(['repaso', v]),
    start: () => llamadas.push(['intentar']),
    etiquetaRepaso: 'Repasar las fichas',
    ...cambios,
  }
  return { arbol: CierreBatalla({ model, onClose: () => llamadas.push(['cerrar']) }), llamadas }
}
const botones = (arbol) => elementos(arbol, (e) => e.type === 'button')

test('la victoria muestra la espada, sus desbloqueos y «Continuar», sin respuestas correctas', () => {
  const desbloqueos = jsonServidor('ruta/ruta-completar-t-inicio').nuevos_desbloqueos
  const { arbol, llamadas } = cierre({ desbloqueos })
  const t = texto(arbol)
  assert.ok(t.includes('Desafío superado') && t.includes('¡Disipaste a El Rumor!'))
  assert.ok(t.includes('5 aciertos de 6 preguntas') && t.includes('Te quedaron 2 destellos'))
  assert.ok(!/correcta/i.test(t))
  assert.equal(elementos(arbol, (e) => e.type?.name === 'FinishExtrasSection').length, 1)
  const [continuar] = botones(arbol)
  assert.equal(texto(continuar), 'Continuar')
  assert.ok(continuar.props.className.includes('sx-challenge-continue'))
  continuar.props.onClick()
  assert.deepEqual(llamadas, [['cerrar']])
})

test('la práctica tiene el emblema en gris y no muestra desbloqueos', () => {
  const desbloqueos = jsonServidor('ruta/ruta-completar-t-inicio').nuevos_desbloqueos
  const { arbol } = cierre({ practicaIntento: true, desbloqueos })
  assert.ok(texto(arbol).includes('Práctica completada'))
  assert.equal(elementos(arbol, (e) => String(e.props?.className).includes('is-muted')).length, 1)
  assert.equal(elementos(arbol, (e) => /^Finish/.test(e.type?.name ?? '')).length, 0)
})

test('la derrota repasa primero y después reintenta; sin fichas, solo reintenta', () => {
  const { arbol, llamadas } = cierre({ victory: false, battle: { questions: [], index: 0, enemyLife: 2, sparks: 0, hits: 3, answered: 6, finished: true } })
  assert.deepEqual(copia(botones(arbol).map(texto)), ['Repasar las fichas', 'Intentar de nuevo'])
  assert.ok(!texto(arbol).includes('Volver a la ciudad'))
  botones(arbol).forEach((b) => b.props.onClick())
  assert.deepEqual(llamadas, [['repaso', true], ['intentar']])
  // El emblema es el personaje, intacto.
  const [img] = elementos(arbol, (e) => e.type === 'img')
  assert.ok(img.props.src)
  const sinFichas = cierre({ victory: false, sheets: [] })
  const unico = botones(sinFichas.arbol)
  assert.deepEqual(copia(unico.map(texto)), ['Intentar de nuevo'])
  assert.ok(unico[0].props.className.includes('sx-primary-button'))
})
