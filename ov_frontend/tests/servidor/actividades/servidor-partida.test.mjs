import assert from 'node:assert/strict'
import test from 'node:test'
import {
  cargarAlmacen,
  elementos,
  escenarioRuta,
  esConsultaDominio,
  esperar,
  fixtureServidor,
  jsonServidor,
  respuestaDominio,
} from '../../soporte/servidor-ayudas.mjs'

// F00: t-partida se responde con el reproductor de encuentros, sin revelar ni nodo resultado.
async function iniciarPartida({ ruta = '/student/missions' } = {}) {
  const app = fixtureServidor({ ruta }),
    estado = escenarioRuta('inicial'),
    items = jsonServidor('ruta/ruta-items-t-partida')
  const respuestas = new Map()
  const servidor = (req) => {
    if (esConsultaDominio(req)) return respuestaDominio(req, estado)
    if (req.url.includes('/desbloqueos?')) return { body: [] }
    if (req.url.endsWith('/items')) return { body: items }
    // DATO DE PRUEBA: respuestas guardadas de t-partida, con el contrato de RespuestasActividad.
    if (req.url.endsWith('/respuestas'))
      return {
        body: {
          cuenta: 'est-ana',
          actividad: 't-partida',
          respuestas: [...respuestas].map(([item, orden]) => ({
            item,
            opcion: items.find((i) => i.codigo === item).escala.opciones.find((o) => o.orden === orden),
            creada_en: '2026-10-07T10:00:00',
            actualizada_en: '2026-10-07T10:00:00',
          })),
        },
      }
    if (req.url.endsWith('/responder-items')) {
      for (const r of req.body.respuestas) respuestas.set(r.item, r.opcion)
      return {
        body: {
          cuenta: req.body.cuenta,
          actividad: req.body.actividad,
          respuestas_guardadas: req.body.respuestas,
          progreso: { estado: 'EN_CURSO', respondidos: respuestas.size, total: items.length },
        },
      }
    }
    throw Error(`Solicitud no configurada: ${req.url}`)
  }
  app.fetch(servidor)
  const almacen = cargarAlmacen(app)
  almacen.publicar({ consultasHabilitadas: true })
  await almacen.refrescar()
  return { app, items, respuestas }
}

test('el Camino abre t-partida con el reproductor de encuentros', async () => {
  const { app } = await iniciarPartida({ ruta: '/student/missions?actividad=t-partida' })
  const screen = app.mount(app.load('src/pages/student/CaminoScreen.tsx').CaminoScreen, {})
  const tree = screen.render()
  assert.equal(elementos(tree, (e) => e.type?.name === 'MaraInteractionPlayer').length, 1)
  assert.equal(app.query.get('actividad'), 't-partida')
  screen.unmount()
})

test('t-partida usa los ítems y la escala del servidor entre los diálogos del contenido, sin resultado RIASEC', async () => {
  const { app, items } = await iniciarPartida()
  const Wrapper = app.load('src/features/activities/components/MaraInteractionPlayer.tsx').MaraInteractionPlayer
  const loader = app.mount(Wrapper, { codigo: 't-partida', onClose() {} })
  loader.render()
  await esperar()
  const child = elementos(loader.render(), (e) => e.type?.name === 'StudentActivityPlayer')[0]
  assert.ok(child)
  const { activity, instrumentoServidor } = child.props
  const { contenidoPorClave } = app.load('src/data/activities/contenidos.ts')
  const contenido = contenidoPorClave('t_partida')
  assert.equal(activity.id, 't-partida')
  assert.equal(activity.nodos.length, items.length + 2)
  assert.equal(activity.nodos[0].texto, contenido.nodos[0].texto)
  assert.equal(activity.nodos.at(-1).texto, contenido.nodos.at(-1).texto)
  assert.deepEqual(
    Array.from(
      activity.nodos.filter((n) => n.tipo === 'item'),
      (n) => n.itemId,
    ),
    [...items].sort((a, b) => a.orden - b.orden).map((i) => i.codigo),
  )
  assert.ok(activity.nodos.every((n) => n.tipo !== 'resultado'))
  assert.equal(instrumentoServidor.soloLectura, false)
  assert.equal(instrumentoServidor.nodoInicialId, activity.nodos[0].id)
  assert.equal(
    app.requests.some((r) => r.url.endsWith('/resultado')),
    false,
  )
  loader.unmount()

  const player = app.mount(app.load('src/features/activities/components/StudentActivityPlayer.tsx').StudentActivityPlayer, {
    activity,
    instrumentoServidor: { ...instrumentoServidor, nodoInicialId: activity.nodos[1].id },
    onClose() {},
  })
  const item = elementos(player.render(), (e) => e.type?.name === 'ItemNode')[0]
  assert.deepEqual(
    Array.from(item.props.options, (o) => o.text),
    items[0].escala.opciones.map((o) => o.etiqueta),
  )
  item.props.onAnswer(3)
  await esperar()
  const post = app.requests.find((r) => r.url.endsWith('/responder-items'))
  assert.deepEqual(post.body.respuestas, [{ item: items[0].codigo, opcion: 3 }])
  assert.equal(post.body.actividad, 't-partida')
  player.unmount()
})
