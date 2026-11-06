import assert from 'node:assert/strict'
import test from 'node:test'
import {
  cargarAlmacen,
  elementos,
  escenarioRuta,
  esConsultaDominio,
  fixtureServidor,
  respuestaDominio,
} from '../../soporte/servidor-ayudas.mjs'

// F01 · HU-016: la misión adicional aparece con REGISTRO_ADECUADO de t-expectativas y se emprende.
async function camino(etapa, ruta = '/student/missions') {
  const app = fixtureServidor({ ruta }),
    estado = escenarioRuta(etapa)
  app.fetch((req) => {
    if (esConsultaDominio(req)) return respuestaDominio(req, estado)
    if (req.url.includes('/notificaciones')) return { body: { total: 0, no_vistas: 0, items: [] } }
    throw Error(`Solicitud no configurada: ${req.url}`)
  })
  const almacen = cargarAlmacen(app)
  almacen.publicar({ consultasHabilitadas: true })
  await almacen.refrescar()
  return app
}

test('antes del registro adecuado la misión adicional no se puede abrir', async () => {
  const app = await camino('t1')
  const { obtenerEstadoServidor } = app.load('src/store/servidor/sesion.ts')
  const bloques = obtenerEstadoServidor().actividades.datos
  assert.equal(
    bloques.flatMap((b) => b.actividades).find((a) => a.codigo === 't-adicional').estado,
    'BLOQUEADA',
  )
})

test('con el registro adecuado, la misión adicional se abre con el reproductor de encuentros', async () => {
  const app = await camino('ciudad', '/student/missions?actividad=t-adicional')
  const { actividadPorContenido } = app.load('src/lib/servidor/contenidos.ts')
  const { obtenerEstadoServidor } = app.load('src/store/servidor/sesion.ts')
  const actividad = actividadPorContenido(obtenerEstadoServidor().actividades.datos, 't-adicional')
  assert.equal(actividad.tipo, 'encuentro')
  assert.ok(actividad.nodos.length > 0)
  const screen = app.mount(app.load('src/pages/student/CaminoScreen.tsx').CaminoScreen, {})
  const tree = screen.render()
  const player = elementos(tree, (e) => e.type?.name === 'StudentActivityPlayer')[0]
  assert.equal(player.props.activity.id, 't-adicional')
  assert.equal(elementos(tree, (e) => e.type?.name === 'RegistroServidorPlayer').length, 0)
  assert.equal(app.query.get('actividad'), 't-adicional')
  screen.unmount()
})
