// Una cuenta de estudiante sin vínculo familiar abre Familia y el servidor responde con error: la pantalla ofrece
// «Reintentar» y también «Volver al mapa» (al último mapa visitado), para no quedar sin salida.
import assert from 'node:assert/strict'
import test from 'node:test'
import { fixtureServidor } from '../../soporte/servidor-ayudas.mjs'

const MENSAJE = 'La cuenta no pertenece a un vínculo familiar'

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
