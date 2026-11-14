// Auditoría plataforma (F7): las acciones del plan no refrescan el camino sin desbloqueos, vencen `planes` para la
// vista montada y no la piden dos veces cuando el refresco ya la venció por un SECCION_PLAN.
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

test('medidores y paso hecho sin desbloqueos no piden el camino; planes se pide una vez, también con SECCION_PLAN', async () => {
  const f = await preparar()
  const secciones = f.app.load('src/store/servidor/secciones.ts')
  const planes = f.app.load('src/store/servidor/planes.ts')
  secciones.montarSeccion('planes')
  await esperar()
  f.app.requests.length = 0
  assert.equal((await planes.fijarMedidores('psychology', { entusiasmo: 2 })).tipo, 'ok')
  await esperar()
  assert.equal((await planes.marcarPasoHecho('psychology', 1, null)).tipo, 'ok')
  await esperar()
  assert.deepEqual([f.lecturas(/\/planes$/), f.camino()], [2, 0])
  f.app.requests.length = 0
  f.responder(accion([desbloqueo('SECCION_PLAN', 'PASOS')]))
  await planes.fijarMedidores('psychology', { entusiasmo: 3 })
  await esperar()
  assert.deepEqual([f.lecturas(/\/planes$/), f.camino()], [1, 2])
})
