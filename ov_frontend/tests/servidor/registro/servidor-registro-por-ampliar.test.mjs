import assert from 'node:assert/strict'
import test from 'node:test'
import {
  cargarAlmacen,
  copia,
  escenarioRuta,
  esConsultaDominio,
  esperar,
  fixtureServidor,
  jsonServidor,
  respuestaDominio,
} from '../../soporte/servidor-ayudas.mjs'

// F01 · ajuste: ítems por ampliar de un registro cerrado, en el cierre y en el drawer de la actividad.
const itemsExpectativas = jsonServidor('ruta/ruta-items-registro-t-expectativas')
const cerrado = jsonServidor('ruta/ruta-registro-t-expectativas-cerrado')
// DATO DE PRUEBA: pistas de ejemplo para los ítems por ampliar.
const porAmpliar = (...items) => items.map((item) => ({ item, pista: `¿Y en ${item}?` }))

function helper() {
  return fixtureServidor().load('src/features/activities/lib/porAmpliar.ts')
}

test('el texto de Lumi usa singular y plural, y el cierre suma la invitación a volver', () => {
  const { textoPorAmpliar } = helper()
  assert.equal(
    textoPorAmpliar(1, { volver: false }),
    'Me quedé con ganas de saber un poco más de una cosa que escribiste. Quién sabe, quizá se abra algo nuevo en el camino.',
  )
  assert.equal(
    textoPorAmpliar(2, { volver: true }),
    'Me quedé con ganas de saber un poco más de dos cosas que escribiste. Puedes volver a ellas ahora o cuando quieras. Quién sabe, quizá se abra algo nuevo en el camino.',
  )
  assert.match(textoPorAmpliar(1, { volver: true }), /Puedes volver a ella ahora/)
})

test('el nombre humano usa la etiqueta corta, si no la consigna recortada, nunca el código; sin pista, el respaldo', () => {
  const { nombreItem, filasPorAmpliar, PISTA_POR_DEFECTO } = helper()
  assert.equal(nombreItem({ nombre: 'Breve', consigna: '¿Algo?' }), 'Breve')
  const larga = 'Describe un momento en que actuaste según tus valores y qué aprendiste de eso'
  const recortada = nombreItem({ nombre: '', consigna: larga })
  assert.ok(recortada.endsWith('…') && recortada.length <= 49 && larga.startsWith(recortada.slice(0, -1)))
  assert.equal(nombreItem(undefined), 'Una de tus respuestas')
  const filas = filasPorAmpliar(
    [
      { item: 't-exp-ruta', pista: '' },
      { item: 't-desconocido', pista: '¿Por qué?' },
    ],
    itemsExpectativas,
  )
  assert.deepEqual(copia(filas), [
    {
      item: 't-exp-ruta',
      nombre: 'Tu ruta después del colegio',
      pista: PISTA_POR_DEFECTO,
      conEleccion: true,
    },
    { item: 't-desconocido', nombre: 'Una de tus respuestas', pista: '¿Por qué?', conEleccion: false },
  ])
  assert.ok(filas.every((f) => !/^t-/.test(f.nombre)))
})

async function drawer({ codigo = 't-expectativas', estado = 'COMPLETADA', registro = cerrado } = {}) {
  const app = fixtureServidor(),
    escenario = escenarioRuta('t1')
  const actividad = escenario.bloques.flatMap((b) => b.actividades).find((a) => a.codigo === codigo)
  Object.assign(actividad, { estado })
  app.fetch((req) => {
    if (esConsultaDominio(req)) return respuestaDominio(req, escenario)
    if (req.url.includes('/desbloqueos?')) return { body: [] }
    if (req.url.endsWith('/items-registro')) return { body: itemsExpectativas }
    if (req.url.endsWith('/registro')) return { body: registro }
    throw Error(`Solicitud no configurada: ${req.url}`)
  })
  const almacen = cargarAlmacen(app)
  almacen.publicar({ consultasHabilitadas: true })
  await almacen.refrescar()
  const { RegistroPorAmpliar } = app.load('src/features/activities/components/RegistroPorAmpliar.tsx')
  const vista = app.mount(RegistroPorAmpliar, { codigo })
  vista.render()
  await esperar()
  const tree = vista.render()
  vista.unmount()
  return { app, tree }
}

test('drawer: sin ítems por ampliar (registro adecuado) no hay bloque', async () => {
  const { tree } = await drawer({ registro: { ...cerrado, items_por_ampliar: [] } })
  assert.equal(tree, null)
})

test('drawer: con uno y con dos ítems por ampliar, el bloque nombra los ítems sin pista', async () => {
  const { textoPorAmpliar } = helper()
  for (const items of [['t-exp-espera'], ['t-exp-ruta', 't-exp-espera']]) {
    const { tree } = await drawer({ registro: { ...cerrado, items_por_ampliar: porAmpliar(...items) } })
    assert.equal(tree.type.name, 'BloquePorAmpliar')
    assert.equal(tree.props.titulo, undefined)
    assert.equal(tree.props.texto, textoPorAmpliar(items.length, { volver: false }))
    assert.equal(tree.props.conPista, false)
    assert.equal(tree.props.compacto, true)
    const nombres = { 't-exp-ruta': 'Tu ruta después del colegio', 't-exp-espera': 'Lo que esperan de ti' }
    assert.deepEqual(
      copia(tree.props.filas.map((f) => f.nombre)),
      items.map((i) => nombres[i]),
    )
  }
})

test('drawer: un registro sin completar o una actividad que no es registro no consultan ni muestran nada', async () => {
  const enCurso = await drawer({ estado: 'EN_CURSO' })
  assert.equal(enCurso.tree, null)
  assert.equal(
    enCurso.app.requests.some((r) => r.url.endsWith('/registro')),
    false,
  )
  const informativa = await drawer({ codigo: 't-lee-cuestionario' })
  assert.equal(informativa.tree, null)
  assert.equal(
    informativa.app.requests.some((r) => r.url.endsWith('/registro')),
    false,
  )
})

test('el cierre y el drawer dicen lo mismo de lo que queda por ampliar', () => {
  const { textoPorAmpliar } = helper()
  const cierre = textoPorAmpliar(2, { volver: true })
  const enDrawer = textoPorAmpliar(2, { volver: false })
  const [primera] = enDrawer.split('. ')
  assert.ok(cierre.startsWith(primera))
  assert.ok(cierre.endsWith('Quién sabe, quizá se abra algo nuevo en el camino.'))
  assert.ok(enDrawer.endsWith('Quién sabe, quizá se abra algo nuevo en el camino.'))
})
