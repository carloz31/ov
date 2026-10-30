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

function cierre(cambios = {}) {
  const app = fixtureServidor()
  const { challenges } = app.load('src/data/content/challenges.ts')
  const { CierreBatalla } = app.load('src/features/activities/components/challenges/CierreBatalla.tsx')
  const c = challenges.find((x) => x.id === 'desafio-rumor')
  const llamadas = []
  const base = {
    eventos_registrados: [],
    nuevos_desbloqueos: [],
    victoria: true,
    practica: false,
    aciertos: 5,
    preguntas: 6,
    destellos_restantes: 2,
    fichas_repaso: [],
  }
  const model = {
    c,
    enviandoIntento: false,
    errorIntento: '',
    reintentarIntento: () => llamadas.push(['reintentar']),
    vidasEnemigo: 5,
    title: { current: null },
    start: () => llamadas.push(['intentar']),
    ...cambios,
    // F04c: el cierre sale de la respuesta del servidor, no del cálculo local.
    resultado: cambios.resultado === null ? undefined : { ...base, ...(cambios.resultado ?? {}) },
  }
  return { arbol: CierreBatalla({ model, onClose: () => llamadas.push(['cerrar']) }), llamadas }
}
const botones = (arbol) => elementos(arbol, (e) => e.type === 'button')

test('la victoria muestra la espada, sus desbloqueos y «Continuar», sin respuestas correctas', () => {
  const desbloqueos = jsonServidor('ruta/ruta-completar-t-inicio').nuevos_desbloqueos
  const { arbol, llamadas } = cierre({ resultado: { nuevos_desbloqueos: desbloqueos } })
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
  const { arbol } = cierre({ resultado: { practica: true, nuevos_desbloqueos: desbloqueos } })
  assert.ok(texto(arbol).includes('Práctica completada'))
  assert.equal(elementos(arbol, (e) => String(e.props?.className).includes('is-muted')).length, 1)
  assert.equal(elementos(arbol, (e) => /^Finish/.test(e.type?.name ?? '')).length, 0)
})

const FICHAS_REPASO = [
  { codigo: 't-ficha', titulo: 'Ficha de prueba' },
  { codigo: 't-ficha-2', titulo: 'Segunda ficha de prueba' },
]
const chips = (arbol) => elementos(arbol, (e) => e.type?.name === 'ChipsFicha')

test('la derrota muestra «Para la próxima, repasa» con las fichas del servidor, «Volver al mapa» e «Intentar de nuevo»', () => {
  const { arbol, llamadas } = cierre({
    resultado: { victoria: false, aciertos: 3, preguntas: 6, destellos_restantes: 0, fichas_repaso: FICHAS_REPASO },
  })
  assert.ok(texto(arbol).includes('Le quitaste 3 de sus 5 vidas'))
  const [repaso] = chips(arbol)
  assert.deepEqual([repaso.props.etiqueta, copia(repaso.props.fichas)], ['Para la próxima, repasa:', FICHAS_REPASO])
  // «Volver al mapa» secundario, al lado de «Intentar de nuevo», la acción principal.
  assert.deepEqual(copia(botones(arbol).map(texto)), ['Volver al mapa', 'Intentar de nuevo'])
  assert.ok(botones(arbol)[0].props.className.includes('sx-secondary-button'))
  assert.ok(botones(arbol)[1].props.className.includes('sx-primary-button'))
  assert.ok(!texto(arbol).includes('Volver a la ciudad') && !/correcta/i.test(texto(arbol)))
  botones(arbol)[1].props.onClick()
  assert.deepEqual(llamadas, [['intentar']])
  // El emblema es el personaje, intacto.
  const [img] = elementos(arbol, (e) => e.type === 'img')
  assert.ok(img.props.src)
})

test('la victoria muestra las fichas a repasar solo si falló alguna, con su texto en singular o plural', () => {
  assert.equal(chips(cierre().arbol).length, 0)
  assert.ok(!texto(cierre().arbol).includes('Ganaste, aunque'))
  const una = cierre({ resultado: { fichas_repaso: FICHAS_REPASO.slice(0, 1) } }).arbol
  assert.ok(texto(una).includes('Ganaste, aunque esta ficha aún te puede dar más luz.'))
  assert.equal(chips(una).length, 1)
  const dos = cierre({ resultado: { fichas_repaso: FICHAS_REPASO } }).arbol
  assert.ok(texto(dos).includes('Ganaste, aunque estas fichas aún te pueden dar más luz.'))
  // La práctica también, si tuvo fallos.
  const practica = cierre({ resultado: { practica: true, fichas_repaso: FICHAS_REPASO.slice(0, 1) } }).arbol
  assert.equal(chips(practica).length, 1)
})

test('mientras se envía el intento, un estado de carga; si falla, el error con «Reintentar»', () => {
  const enviando = cierre({ resultado: null, enviandoIntento: true })
  assert.equal(texto(enviando.arbol), 'Guardando tu intento…')
  assert.equal(elementos(enviando.arbol, (e) => e.props?.role === 'status').length, 1)
  const fallido = cierre({ resultado: null, errorIntento: 'No se pudo conectar con el servidor. Vuelve a intentarlo.' })
  assert.equal(elementos(fallido.arbol, (e) => e.props?.role === 'alert').length, 1)
  const [reintentar] = botones(fallido.arbol)
  assert.equal(texto(reintentar), 'Reintentar')
  reintentar.props.onClick()
  assert.deepEqual(fallido.llamadas, [['reintentar']])
})

test('la intro: las vidas de cada uno, reglas en una línea, las fichas del desafío y la acción a la derecha (F04d)', () => {
  const app = fixtureServidor()
  const { challenges } = app.load('src/data/content/challenges.ts')
  const { IntroDesafio } = app.load('src/features/activities/components/challenges/IntroDesafio.tsx')
  const c = challenges.find((x) => x.id === 'desafio-rumor')
  const fichasIntro = [
    { codigo: 't-ficha', titulo: 'Ficha de prueba', bloqueada: false },
    { codigo: 't-ficha-2', titulo: 'Segunda ficha de prueba', bloqueada: true },
  ]
  const arbol = IntroDesafio({
    model: { c, title: { current: null }, requirements: [], puedeIniciar: true, estadoBatalla: 'lista', vidasEnemigo: 5, destellos: 3, fichasIntro, start() {} },
  })
  const t = texto(arbol)
  assert.ok(t.includes('El Rumor tiene: 5 vidas') && t.includes('Tú tienes: 3 vidas'))
  assert.ok(!t.includes('Cada pregunta'))
  assert.ok(t.includes('Cada acierto le quita una vida al enemigo y cada error te quita una de las tuyas. Sin límite de tiempo.'))
  assert.ok(!t.includes('Repasar'))
  const [chips] = elementos(arbol, (e) => e.type?.name === 'ChipsFicha')
  assert.deepEqual([chips.props.etiqueta, copia(chips.props.fichas)], ['Este desafío se basa en estas fichas:', fichasIntro])
  const [acciones] = elementos(arbol, (e) => String(e.props?.className).includes('sx-actions-end'))
  assert.deepEqual(copia(botones(acciones).map(texto)), ['Enfrentar a El Rumor'])
})

test('cada chip abre su ficha en modo repaso; la bloqueada lleva candado', () => {
  const app = fixtureServidor()
  const { ChipsFicha } = app.load('src/features/activities/components/challenges/ChipsFicha.tsx')
  const visor = app.load('src/store/visorRecursoStore.ts')
  const arbol = ChipsFicha({
    etiqueta: 'Tu luz viene de:',
    fichas: [
      { codigo: 't-ficha', titulo: 'Ficha de prueba' },
      { codigo: 't-ficha-2', titulo: 'Segunda ficha de prueba', bloqueada: true },
    ],
  })
  const chips = botones(arbol)
  assert.equal(elementos(chips[1], (e) => e.props?.['aria-label'] === 'Bloqueada').length, 1)
  chips[1].props.onClick()
  assert.deepEqual(copia(visor.obtenerRecursoAbierto()), { codigo: 't-ficha-2', modo: 'repaso' })
  assert.equal(ChipsFicha({ etiqueta: 'x', fichas: [] }), null)
})

test('el feedback no dice de qué ficha sale ni enlaza fichas, y «Ver resultado» va a la derecha', () => {
  const app = fixtureServidor()
  const { challenges } = app.load('src/data/content/challenges.ts')
  const { ChallengeStage } = app.load('src/features/activities/components/challenges/ChallengeStage.tsx')
  const c = challenges.find((x) => x.id === 'desafio-rumor')
  const pregunta = {
    id: 't-batalla-p01',
    enunciado: '¿Qué convierte una frase en un mito vocacional?',
    opciones: [{ id: '0', texto: 'Repetirla sin comprobarla' }, { id: '1', texto: 'Buscar evidencia' }],
    correcta: '0',
    explicacion: 'Que una frase se repita no demuestra que sea cierta.',
    ficha: { codigo: 't-ficha', titulo: 'Ficha de prueba' },
  }
  const battle = { questions: [pregunta], index: 0, enemyLife: 0, sparks: 3, hits: 1, answered: 1, finished: true, selected: '0' }
  const arbol = ChallengeStage({
    model: { c, error: '', practice: { current: false }, stage: 'battle', setStage() {}, battle, setBattle() {}, title: { current: null }, muestraRecompensas: false, cierreServidor: true, vidasEnemigo: 5, destellos: 3, question: pregunta, hit: true, victory: true, answer() {}, responseTitle: '¡Golpe de luz!' },
    onClose() {},
  })
  assert.equal(elementos(arbol, (e) => String(e.props?.className).includes('sx-check-source')).length, 0)
  assert.ok(!texto(arbol).includes('Sale de') && !texto(arbol).includes('se abre al terminar'))
  assert.ok(!texto(arbol).includes('Las fichas se abren al terminar el desafío'))
  const [acciones] = elementos(arbol, (e) => String(e.props?.className).includes('sx-actions-end'))
  assert.deepEqual(copia(botones(acciones).map(texto)), ['Ver resultado'])
})
