// Auditoría plataforma: un ingreso que tarda más de 8 s avisa que siga esperando; un tiempo agotado o un error de red
// invita a intentar de nuevo y el botón vuelve a activarse. Sin tiempo límite propio ni reintentos.
import assert from 'node:assert/strict'
import test, { mock } from 'node:test'
import { esperar, fixtureServidor } from '../../soporte/servidor-ayudas.mjs'

const REINTENTO = 'No pudimos completar el ingreso porque el servidor tardó demasiado o no hubo conexión. Vuelve a intentarlo.'

test('el mensaje del ingreso invita a reintentar ante un tiempo agotado o sin red, y conserva el del servidor', () => {
  const app = fixtureServidor({ cuenta: null })
  const { mensajeIngreso } = app.load('src/features/auth/lib/mensajeIngreso.ts')
  const { mensajeErrorServidor } = app.load('src/store/servidor/sesion.ts')
  for (const estado of [408, 502, 503, 504])
    assert.equal(mensajeIngreso({ tipo: 'http', estado, detalle: '<html>' }, mensajeErrorServidor), REINTENTO)
  assert.equal(mensajeIngreso({ tipo: 'sin_conexion' }, mensajeErrorServidor), REINTENTO)
  const credenciales = { tipo: 'http', estado: 401, detalle: { mensaje: 'Usuario o contraseña incorrectos' } }
  assert.equal(mensajeIngreso(credenciales, mensajeErrorServidor), 'Usuario o contraseña incorrectos')
})

test('a los 8 s sin respuesta aparece el aviso; al fallar por tiempo, se invita a reintentar y el botón se reactiva', async () => {
  mock.timers.enable({ apis: ['setTimeout'] })
  try {
    const app = fixtureServidor({ cuenta: null, ruta: '/login' })
    let responder
    app.fetch(() => new Promise((resolver) => (responder = resolver)))
    const { useLogin } = app.load('src/features/auth/hooks/useLogin.ts')
    const { LoginScreen } = app.load('src/features/auth/components/LoginScreen.tsx')
    const vista = app.mount(() => useLogin(), {})
    const pedido = vista.render().enter('nav01@ov.test', 'DATO-DE-PRUEBA-2026')
    mock.timers.tick(7999)
    assert.equal(vista.render().lento, false)
    mock.timers.tick(1)
    const esperando = vista.render()
    assert.deepEqual([esperando.enviando, esperando.lento], [true, true])
    const html = (props) => JSON.stringify(LoginScreen({ onEnter() {}, ...props }))
    assert.match(html({ enviando: true, lento: true }), /Hay muchas personas ingresando/)
    assert.doesNotMatch(html({ enviando: true, lento: false }), /Hay muchas personas ingresando/)
    // Una segunda pulsación mientras espera no envía otra petición.
    await vista.render().enter('nav01@ov.test', 'DATO-DE-PRUEBA-2026')
    assert.equal(app.requests.filter((r) => r.url.endsWith('/sesion/ingresar')).length, 1)
    responder({ status: 504, body: '<html>Gateway Timeout</html>' })
    await pedido
    await esperar()
    const final = vista.render()
    assert.deepEqual([final.enviando, final.lento, final.error], [false, false, REINTENTO])
    assert.equal(app.requests.filter((r) => r.url.endsWith('/sesion/ingresar')).length, 1)
  } finally {
    mock.timers.reset()
  }
})
