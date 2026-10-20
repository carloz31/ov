// B17 · HU-001 en modo api, con los fixtures ruta-sesion-*: token en la cabecera, 401 que limpia la sesión,
// sesión guardada que se valida con GET /sesion y errores del ingreso.
import assert from 'node:assert/strict'
import test from 'node:test'
import { esperar, fixtureServidor, jsonServidor } from '../../soporte/servidor-ayudas.mjs'

const ruta = (nombre) => jsonServidor(`ruta/ruta-${nombre}`)
const sesionGuardada = (app) => JSON.parse(app.local.get('ov.acceso.v1') ?? 'null')

test('el ingreso guarda token y cuenta en ov.acceso.v1 y GET /sesion trae hijos o salones', async () => {
  for (const [rol, codigo] of [
    ['estudiante', 'est-ana'],
    ['apoderado', 'apo-rosa'],
    ['orientadora', 'ori-carmen'],
  ]) {
    const app = fixtureServidor({ cuenta: null })
    app.fetch((r) => {
      if (r.url === '/api/sesion/ingresar') return { body: ruta(`sesion-ingresar-${rol}`) }
      if (r.url === '/api/sesion') return { body: ruta(`sesion-${rol}`) }
      throw Error(r.url)
    })
    const acceso = app.load('src/store/accesoStore.ts')
    assert.equal(await acceso.iniciarSesionServidor('correo@example.com', 'clave'), null)
    assert.deepEqual(app.requests[0].body, { usuario: 'correo@example.com', contrasena: 'clave' })
    assert.equal(app.requests[0].headers.Authorization, undefined)
    assert.equal(sesionGuardada(app).token, 'TOKEN-DE-PRUEBA')
    assert.equal(sesionGuardada(app).cuenta.codigo, codigo)
    await acceso.validarSesionGuardada()
    assert.equal(app.requests[1].headers.Authorization, 'Bearer TOKEN-DE-PRUEBA')
    const datos = acceso.datosSesion()
    assert.deepEqual(datos.hijos.map((h) => h.codigo), rol === 'apoderado' ? ['est-ana'] : [])
    assert.deepEqual(datos.salones.map((s) => s.codigo), rol === 'orientadora' ? ['5A'] : [])
    assert.equal(app.sesion.get('ov.cuenta-servidor.v1'), undefined)
  }
})

test('el error del ingreso se muestra con el mensaje del servidor y sin sesión', async () => {
  const app = fixtureServidor({ cuenta: null })
  const acceso = app.load('src/store/accesoStore.ts')
  const { mensajeErrorServidor } = app.load('src/store/servidor/sesion.ts')
  app.fetch(() => ({ status: 401, body: ruta('sesion-error') }))
  const error = await acceso.iniciarSesionServidor('ana.estudiante@example.com', 'otra')
  assert.equal(mensajeErrorServidor(error), 'Usuario o contraseña incorrectos')
  assert.equal(acceso.sesionActual(), null)
  assert.equal(acceso.avisoSesion(), null, 'un 401 del ingreso no es una sesión vencida')
  app.fetch(() => {
    throw Error('Sin red')
  })
  const sinRed = await acceso.iniciarSesionServidor('ana.estudiante@example.com', 'Ana2026!')
  assert.equal(mensajeErrorServidor(sinRed), 'No se pudo conectar con el servidor. Vuelve a intentarlo.')
})

test('cada petición lleva la cabecera del token guardado', async () => {
  const app = fixtureServidor()
  app.fetch(() => ({ body: { eventos_registrados: [], nuevos_desbloqueos: [] } }))
  const { ingresar } = app.load('src/services/api/acciones.ts')
  await ingresar('est-ana')
  assert.equal(app.requests[0].headers.Authorization, 'Bearer TOKEN-DE-PRUEBA')
  assert.equal(app.requests[0].headers['Content-Type'], 'application/json')
})

test('un 401 limpia la sesión, borra la clave y deja el aviso para el login', async () => {
  const app = fixtureServidor()
  const acceso = app.load('src/store/accesoStore.ts')
  app.fetch(() => ({ status: 401, body: { detail: { mensaje: 'Tu sesión terminó. Vuelve a ingresar.' } } }))
  const respuesta = await app.load('src/services/api/cuentas.ts').obtenerResumen('est-ana')
  assert.equal(respuesta.estado, 401)
  assert.equal(acceso.sesionActual(), null)
  assert.equal(app.local.has('ov.acceso.v1'), false)
  assert.equal(acceso.avisoSesion(), 'Tu sesión terminó. Vuelve a ingresar.')
  assert.equal(app.load('src/store/servidor/cuenta.ts').cuentaActiva(), null)
})

test('al recargar, el token guardado se valida con GET /sesion; si responde 401 se vuelve al login', async () => {
  const guardada = { token: 'TOKEN-DE-PRUEBA', expira_en: '2026-10-08T15:00:00Z', cuenta: ruta('sesion-ingresar-apoderado').cuenta }
  const valida = fixtureServidor({ cuenta: null, guardado: { 'ov.acceso.v1': JSON.stringify(guardada) } })
  valida.fetch(() => ({ body: ruta('sesion-apoderado') }))
  const acceso = valida.load('src/store/accesoStore.ts')
  assert.equal(acceso.sesionActual().cuenta.codigo, 'apo-rosa')
  await acceso.validarSesionGuardada()
  assert.deepEqual(valida.requests.map((r) => [r.method, r.url, r.headers.Authorization]), [
    ['GET', '/api/sesion', 'Bearer TOKEN-DE-PRUEBA'],
  ])
  assert.equal(acceso.sesionActual().cuenta.codigo, 'apo-rosa')
  assert.equal(valida.load('src/store/servidor/cuenta.ts').cuentaApoderado(), 'apo-rosa')

  const vencida = fixtureServidor({ cuenta: null, guardado: { 'ov.acceso.v1': JSON.stringify(guardada) } })
  vencida.fetch(() => ({ status: 401, body: { detail: { mensaje: 'Tu sesión terminó. Vuelve a ingresar.' } } }))
  const accesoVencido = vencida.load('src/store/accesoStore.ts')
  await accesoVencido.validarSesionGuardada()
  await esperar()
  assert.equal(accesoVencido.sesionActual(), null)
  assert.equal(accesoVencido.avisoSesion(), 'Tu sesión terminó. Vuelve a ingresar.')
})

test('en modo api una sesión local sin token no se usa', async () => {
  const local = { token: null, expira_en: null, cuenta: ruta('sesion-ingresar-estudiante').cuenta }
  const app = fixtureServidor({ cuenta: null, guardado: { 'ov.acceso.v1': JSON.stringify(local) } })
  const acceso = app.load('src/store/accesoStore.ts')
  await acceso.validarSesionGuardada()
  assert.equal(acceso.sesionActual(), null)
  assert.deepEqual(app.requests, [])
})
