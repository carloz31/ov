// Una cuenta de estudiante sin vínculo familiar abre Familia y el servidor responde con error: la pantalla ofrece
// «Reintentar» y también «Volver al mapa» (al último mapa visitado), para no quedar sin salida.
import assert from 'node:assert/strict'
import test from 'node:test'
import {
  cargarAlmacen,
  escenarioRuta,
  esConsultaDominio,
  fixtureServidor,
  respuestaDominio,
} from '../../soporte/servidor-ayudas.mjs'

const MENSAJE = 'Tu apoderado aún no se ha registrado en la plataforma.'

test('Familia con error: además de Reintentar, «Volver al mapa» lleva al último mapa', () => {
  const app = fixtureServidor({ ruta: '/student/familia' })
  const { MarcoFamiliaEstudiante } = app.load(
    'src/features/family-conversations/components/servidor/MarcoFamiliaEstudiante.tsx',
  )
  const m = { estado: 'error', datos: null, mensajeError: MENSAJE, reintentar() {}, textos: { cargandoFrase: '', cargandoTitulo: '' } }
  const vista = app.mount(() => MarcoFamiliaEstudiante({ m, children: null }), {})
  const marco = vista.render()
  const carga = marco.props.carga
  assert.equal(carga.props.mensaje, MENSAJE)
  assert.equal(typeof carga.props.onReintentar, 'function')
  assert.equal(carga.props.volver.texto, 'Volver al mapa')
  carga.props.volver.onClick()
  assert.equal(app.navigations.at(-1), '/student/missions')
})

test('al salir de Familia con error, la franja del portal ya no lo muestra y al volver se pide de nuevo', async () => {
  const app = fixtureServidor(),
    estado = escenarioRuta('t1')
  app.fetch((req) => {
    if (esConsultaDominio(req)) return respuestaDominio(req, estado)
    if (req.url.endsWith('/conversaciones')) return { status: 409, body: { detail: { mensaje: MENSAJE } } }
    throw Error(`Solicitud no configurada: ${req.url}`)
  })
  const almacen = cargarAlmacen(app)
  almacen.publicar({ consultasHabilitadas: true })
  const desmontar = almacen.montarSeccion('conversaciones')
  await almacen.asegurarSeccion('conversaciones')
  assert.equal(almacen.mensajeErrorServidor(almacen.errorSeccionesActivas()), MENSAJE)
  let avisos = 0
  almacen.suscribirServidor(() => avisos++)
  desmontar()
  // La franja se recalcula (hubo aviso) y ya no hay error activo; la sección no se pidió sin una vista.
  assert.ok(avisos > 0)
  assert.equal(almacen.errorSeccionesActivas(), null)
  assert.equal(almacen.obtenerEstadoServidor().conversaciones.estado, 'vencido')
  const pedidas = () => app.requests.filter((r) => r.url.endsWith('/conversaciones')).length
  assert.equal(pedidas(), 1)
  almacen.montarSeccion('conversaciones')
  await almacen.asegurarSeccion('conversaciones')
  assert.equal(pedidas(), 2)
})
