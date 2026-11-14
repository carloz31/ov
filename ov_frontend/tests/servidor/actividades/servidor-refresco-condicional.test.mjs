// Auditoría plataforma (F2b, F7, F4): las acciones que no cambian el progreso de una actividad solo refrescan el
// camino con desbloqueos; los requisitos con «actual de requerido» se vuelven a pedir con cada acción, refresque o no.
import assert from 'node:assert/strict'
import test from 'node:test'
import {
  cargarAlmacen,
  escenarioRuta,
  esConsultaDominio,
  esperar,
  fixtureServidor,
  respuestaDominio,
} from '../../soporte/servidor-ayudas.mjs'

const desbloqueo = (tipo, codigo) => ({
  regla: `R-PRUEBA-${codigo}`,
  tipo_objetivo: tipo,
  objetivo: { codigo, nombre: 'DATO DE PRUEBA' },
  condiciones: [],
})
const accion = (desbloqueos = [], eventos = [{ tipo: 'ESCRIBE_ENTRADA_LIBRE', referencia: null }]) => ({
  eventos_registrados: eventos,
  nuevos_desbloqueos: desbloqueos,
  nuevas_notificaciones: [],
})

async function preparar() {
  const app = fixtureServidor(),
    estado = escenarioRuta('t1')
  let respuesta = accion()
  app.fetch((r) => {
    if (esConsultaDominio(r)) return respuestaDominio(r, estado)
    if (r.url.includes('/notificaciones')) return { body: { total: 0, no_vistas: 0, items: [] } }
    if (r.url.includes('/progreso/')) return { body: { objetivo: { tipo: 'BLOQUE', codigo: 'CIUDAD' }, disponible: false, reglas: [] } }
    if (r.method === 'POST') return { body: respuesta }
    if (/\/(planes|conversaciones|diario\/\w+|check-ins|amistad)$/.test(r.url)) return { body: [] }
    throw Error(`Solicitud no configurada: ${r.url}`)
  })
  const almacen = cargarAlmacen(app)
  almacen.publicar({ consultasHabilitadas: true })
  await almacen.refrescar()
  app.requests.length = 0
  return {
    app,
    almacen,
    responder(datos) {
      respuesta = datos
    },
    camino: () => app.requests.filter((r) => /\/(actividades|avance)$/.test(r.url)).length,
    lecturas: (patron) => app.requests.filter((r) => r.method === 'GET' && patron.test(r.url)).length,
  }
}

test('diario, cartas e investigaciones sin desbloqueos no vuelven a pedir el camino; con ellos, sí', async () => {
  const f = await preparar()
  const diario = f.app.load('src/store/servidor/diario.ts')
  const conversaciones = f.app.load('src/store/servidor/conversaciones.ts')
  const investigaciones = f.app.load('src/store/servidor/investigaciones.ts')
  assert.equal((await diario.escribirEntrada({ texto: 'DATO DE PRUEBA' })).tipo, 'ok')
  assert.equal((await conversaciones.guardarCarta('DATO DE PRUEBA')).tipo, 'ok')
  assert.equal((await investigaciones.guardarLoQuePienso('524', 'a', 'b', 'c')).tipo, 'ok')
  assert.equal(f.camino(), 0)
  f.responder(accion([desbloqueo('INSIGNIA', 't-insignia')]))
  await diario.escribirEntrada({ texto: 'DATO DE PRUEBA' })
  assert.equal(f.camino(), 2)
})

test('un desbloqueo de pregunta o de conversación no hace pedir dos veces su sección', async () => {
  const f = await preparar()
  const secciones = f.app.load('src/store/servidor/secciones.ts')
  const diario = f.app.load('src/store/servidor/diario.ts')
  const conversaciones = f.app.load('src/store/servidor/conversaciones.ts')
  for (const nombre of ['diarioPreguntas', 'conversaciones']) secciones.montarSeccion(nombre)
  await esperar()
  f.app.requests.length = 0
  f.responder(accion([desbloqueo('PREGUNTA_DIARIO', 'd-prueba')]))
  await diario.escribirEntrada({ texto: 'DATO DE PRUEBA' })
  await esperar()
  assert.equal(f.lecturas(/\/diario\/preguntas$/), 1)
  f.responder(accion([desbloqueo('CONVERSACION', 'c-prueba')]))
  await conversaciones.guardarCarta('DATO DE PRUEBA')
  await esperar()
  assert.equal(f.lecturas(/\/conversaciones$/), 1)
})

test('cada acción confirmada sube la revisión que vuelve a pedir el requisito de la Ciudad, refresque o no', async () => {
  const f = await preparar()
  const refresco = f.app.load('src/store/servidor/refresco.ts')
  const diario = f.app.load('src/store/servidor/diario.ts')
  const leer = () => f.app.mount(() => refresco.useRevisionAcciones(), {}).render()
  const inicial = leer()
  await diario.escribirEntrada({ texto: 'DATO DE PRUEBA' })
  assert.equal(leer(), inicial + 1)
  f.responder(accion([desbloqueo('INSIGNIA', 't-insignia')]))
  await diario.escribirEntrada({ texto: 'DATO DE PRUEBA' })
  assert.equal(leer(), inicial + 2)
  // El requisito de la Ciudad depende de esa revisión: una acción sin desbloqueos lo vuelve a pedir.
  const { useCityRequirement } = f.app.load('src/features/adventure/hooks/useCityRequirement.ts')
  const vista = f.app.mount(() => useCityRequirement({}), {})
  vista.render()
  await esperar()
  const antes = f.lecturas(/\/progreso\/BLOQUE\/CIUDAD$/)
  f.responder(accion())
  await diario.escribirEntrada({ texto: 'DATO DE PRUEBA' })
  vista.render()
  await esperar()
  assert.equal(f.lecturas(/\/progreso\/BLOQUE\/CIUDAD$/), antes + 1)
  assert.equal(f.camino(), 2)
})
