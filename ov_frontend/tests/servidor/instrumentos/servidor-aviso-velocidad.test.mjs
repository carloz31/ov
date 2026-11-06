import assert from 'node:assert/strict'
import test from 'node:test'
import {
  cargarAlmacen,
  elementos,
  escenarioRuta,
  esConsultaDominio,
  esperar,
  fixtureServidor,
  importarAislado,
  jsonServidor,
  respuestaDominio,
} from '../../soporte/servidor-ayudas.mjs'

// HU-096: el reproductor mide el tiempo de cada ítem y muestra el aviso de velocidad que decide el servidor.
const { textoAvisoVelocidad } = await importarAislado('src/features/activities/lib/avisoVelocidad.ts')

async function iniciar({ avisos = {}, respondidos = 2 } = {}) {
  const app = fixtureServidor({ ruta: '/student/missions?actividad=t-partida' }),
    estado = escenarioRuta('t1'),
    control = { refrescoFalla: false }
  app.fetch((req) => {
    if (esConsultaDominio(req)) {
      if (control.refrescoFalla) throw Error('DATO DE PRUEBA')
      return respuestaDominio(req, estado)
    }
    if (req.url.includes('/notificaciones')) return { body: { total: 0, no_vistas: 0, items: [] } }
    if (req.url.endsWith('/responder-items')) {
      const [{ item, opcion }] = req.body.respuestas
      return {
        body: {
          cuenta: 'est-ana',
          actividad: 't-partida',
          respuestas_guardadas: [{ item, opcion }],
          progreso: { estado: 'EN_CURSO', respondidos, total: 19 },
          aviso_velocidad: avisos[item] ?? null,
        },
      }
    }
    throw Error(`Solicitud no configurada: ${req.url}`)
  })
  const almacen = cargarAlmacen(app)
  almacen.publicar({ consultasHabilitadas: true })
  await almacen.refrescar()
  const items = jsonServidor('ruta/ruta-items-t-partida')
  const { actividadPorContenido, cuestionarioServidor } = app.load('src/lib/servidor/contenidos.ts')
  const activity = cuestionarioServidor(actividadPorContenido(estado.bloques, 't-partida'), items)
  const { StudentActivityPlayer } = app.load('src/features/activities/components/StudentActivityPlayer.tsx')
  const player = app.mount(StudentActivityPlayer, {
    activity,
    instrumentoServidor: {
      items,
      respuestas: [],
      nodoInicialId: activity.nodos.find((n) => n.tipo === 'item').id,
      revision: false,
      soloLectura: false,
    },
    onClose() {},
  })
  await esperar()
  const nodo = () => elementos(player.render(), (e) => e.type?.name === 'ItemNode')[0]
  const aviso = () => elementos(player.render(), (e) => e.type?.name === 'AvisoVelocidad')[0]
  const guardados = () =>
    app.requests.filter((r) => r.url.endsWith('/responder-items')).map((r) => r.body.respuestas[0])
  return { nodo, aviso, guardados, control }
}

test('el tiempo corre desde que el ítem se puede responder, por cada ítem', async () => {
  const { nodo, guardados } = await iniciar()
  // El arnés corre los efectos al pintar: el ítem queda en pantalla antes de esperar.
  nodo()
  await esperar()
  await new Promise((resolve) => setTimeout(resolve, 80))
  nodo().props.onAnswer(3)
  await esperar()
  assert.equal(nodo().props.node.itemId, 'AUTO-02')
  nodo().props.onAnswer(3)
  await esperar()
  const [primero, segundo] = guardados()
  assert.ok(primero.tiempo_ms >= 70, `primero: ${primero.tiempo_ms}`)
  assert.ok(segundo.tiempo_ms < 70, `segundo: ${segundo.tiempo_ms}`)
})

test('un ítem ya respondido se reenvía sin tiempo', async () => {
  const { nodo, guardados } = await iniciar()
  nodo().props.onAnswer(3)
  await esperar()
  nodo().props.onAnterior()
  await esperar()
  assert.equal(nodo().props.node.itemId, 'AUTO-01')
  nodo().props.onAnswer(4)
  await esperar()
  assert.equal(typeof guardados()[0].tiempo_ms, 'number')
  assert.deepEqual(guardados()[1], { item: 'AUTO-01', opcion: 4 })
})

test('sin aviso del servidor no hay toast; con aviso se muestra con su número y su personaje, y se cierra', async () => {
  const { nodo, aviso } = await iniciar({ avisos: { 'AUTO-02': 1 } })
  nodo().props.onAnswer(3)
  await esperar()
  assert.equal(aviso(), undefined)
  nodo().props.onAnswer(3)
  await esperar()
  assert.equal(aviso().props.numero, 1)
  assert.equal(aviso().props.hablanteId, nodo().props.node.hablanteId)
  // El toast no detiene la actividad: la siguiente pregunta ya está lista.
  assert.equal(nodo().props.node.itemId, 'AUTO-03')
  aviso().props.onDismiss()
  await esperar()
  assert.equal(aviso(), undefined)
})

test('el segundo aviso reemplaza al primero', async () => {
  const { nodo, aviso } = await iniciar({ avisos: { 'AUTO-01': 1, 'AUTO-02': 2 } })
  nodo().props.onAnswer(3)
  await esperar()
  assert.equal(aviso().props.numero, 1)
  nodo().props.onAnswer(3)
  await esperar()
  assert.equal(aviso().props.numero, 2)
})

test('guardado sin refrescar: el reintento conserva el tiempo, no reenvía y muestra el aviso una vez', async () => {
  const { nodo, aviso, guardados, control } = await iniciar({ avisos: { 'AUTO-01': 1 }, respondidos: 1 })
  control.refrescoFalla = true
  nodo().props.onAnswer(3)
  await esperar()
  assert.equal(aviso(), undefined)
  assert.equal(nodo().props.node.itemId, 'AUTO-01')
  control.refrescoFalla = false
  nodo().props.onAnswer(3)
  await esperar()
  assert.equal(aviso().props.numero, 1)
  assert.equal(nodo().props.node.itemId, 'AUTO-02')
  assert.equal(guardados().length, 1)
})

test('los textos nombran al personaje que conduce; si conduce Lumi, van en primera persona', () => {
  assert.match(textoAvisoVelocidad(1, 'bibliotecaria', 'Sol'), /pensar en las preguntas de Sol\?/)
  assert.match(textoAvisoVelocidad(2, 'bibliotecaria', 'Sol'), /buen camino con Sol\..*Sol te esperará\.$/)
  assert.match(textoAvisoVelocidad(1, 'helena', 'Helena'), /las preguntas de Helena\?/)
  assert.match(textoAvisoVelocidad(1, 'companero', 'Lumi'), /pensar en mis preguntas\?/)
  assert.match(textoAvisoVelocidad(2, 'companero', 'Lumi'), /^Ya llevas buen camino\..*aquí estaré\.$/)
  assert.doesNotMatch(textoAvisoVelocidad(2, 'companero', 'Lumi'), /Lumi/)
})

test('el toast de velocidad usa AvisoToast con Sparkles, 8 s y el párrafo completo', async () => {
  const { readFileSync } = await import('node:fs')
  const fuente = readFileSync('src/features/activities/components/AvisoVelocidad.tsx', 'utf8')
  assert.match(fuente, /icono=\{Sparkles\}/)
  assert.match(fuente, /titulo="Lumi"/)
  assert.match(fuente, /DURACION_AVISO = 8000/)
  assert.match(fuente, /\bparrafo\b/)
  assert.doesNotMatch(fuente, /useNoveltyQueue/)
})
