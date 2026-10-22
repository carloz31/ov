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
  const base = {
    eventos_registrados: [],
    nuevos_desbloqueos: [],
    victoria: true,
    practica: false,
    aciertos: 5,
    preguntas: 6,
    destellos_restantes: 2,
  }
  const model = {
    c,
    enviandoIntento: false,
    errorIntento: '',
    reintentarIntento: () => llamadas.push(['reintentar']),
    vidasEnemigo: 5,
    title: { current: null },
    sheets: ['t-ficha-2', 't-ficha'],
    repasar: () => llamadas.push(['repaso', true]),
    start: () => llamadas.push(['intentar']),
    etiquetaRepaso: 'Repasar las fichas',
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

test('la derrota repasa primero y después reintenta; sin fichas, solo reintenta', () => {
  const { arbol, llamadas } = cierre({ resultado: { victoria: false, aciertos: 3, preguntas: 6, destellos_restantes: 0 } })
  assert.ok(texto(arbol).includes('Le quitaste 3 de sus 5 vidas'))
  assert.deepEqual(copia(botones(arbol).map(texto)), ['Repasar las fichas', 'Intentar de nuevo'])
  assert.ok(!texto(arbol).includes('Volver a la ciudad'))
  botones(arbol).forEach((b) => b.props.onClick())
  assert.deepEqual(llamadas, [['repaso', true], ['intentar']])
  // El emblema es el personaje, intacto.
  const [img] = elementos(arbol, (e) => e.type === 'img')
  assert.ok(img.props.src)
  const sinFichas = cierre({ resultado: { victoria: false }, sheets: [] })
  const unico = botones(sinFichas.arbol)
  assert.deepEqual(copia(unico.map(texto)), ['Intentar de nuevo'])
  assert.ok(unico[0].props.className.includes('sx-primary-button'))
})

test('el drawer y el repaso ofrecen solo las fichas disponibles con contenido', () => {
  const app = fixtureServidor()
  const { fichasDeRepaso } = app.load('src/features/activities/lib/batallaServidor.ts')
  const [batalla] = jsonServidor('ruta/ruta-batallas')
  const conContenido = (codigo) => codigo !== 'sin-contenido'
  assert.deepEqual(copia(fichasDeRepaso(batalla.fichas, conContenido).map((f) => f.codigo)), ['t-ficha', 't-ficha-2'])
  // Una ficha todavía no obtenida, o sin contenido en el front, no se ofrece.
  const mezcla = [
    { ...batalla.fichas[0], estado: 'BLOQUEADA' },
    batalla.fichas[1],
    { codigo: 'sin-contenido', titulo: 'Sin contenido', estado: 'DISPONIBLE' },
  ]
  assert.deepEqual(copia(fichasDeRepaso(mezcla, conContenido).map((f) => f.codigo)), ['t-ficha-2'])
  assert.deepEqual(copia(fichasDeRepaso([], conContenido)), [])
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

test('la intro: dos estadísticas, reglas en una línea, «Tu luz viene de» y la acción a la derecha (F04d)', () => {
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
  assert.ok(t.includes('El Rumor: 5 de vida') && t.includes('Tú: 3 destellos'))
  assert.ok(!t.includes('Cada pregunta'))
  assert.ok(t.includes('Cada acierto le quita una vida al enemigo y cada error te quita un destello. Sin límite de tiempo.'))
  assert.ok(!t.includes('Repasar'))
  const [chips] = elementos(arbol, (e) => e.type?.name === 'ChipsFicha')
  assert.deepEqual([chips.props.etiqueta, copia(chips.props.fichas)], ['Tu luz viene de:', fichasIntro])
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
