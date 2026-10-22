import assert from 'node:assert/strict'
import {
  cargarAlmacen,
  elementos,
  escenarioRuta,
  esConsultaDominio,
  esperar,
  fixtureServidor,
  jsonServidor,
  respuestaDominio,
} from './servidor-ayudas.mjs'

// F01: abre los registros de T1 con sus ítems y lo guardado en el servidor (pruebas de registro).
export async function iniciar({ actividad = 't-expectativas', registro, ruta = '/student/missions' } = {}) {
  const app = fixtureServidor({ ruta }),
    estado = escenarioRuta('t1')
  // DATO DE PRUEBA: t-valores disponible, como tras completar t-expectativas.
  const valores = estado.bloques.flatMap((b) => b.actividades).find((a) => a.codigo === 't-valores')
  Object.assign(valores, { estado: 'DISPONIBLE', visible: true, bloqueo: null })
  const items = jsonServidor(`ruta/ruta-items-registro-${actividad}`)
  app.fetch((req) => {
    if (esConsultaDominio(req)) return respuestaDominio(req, estado)
    if (req.url.includes('/desbloqueos?')) return { body: [] }
    if (req.url.endsWith('/items-registro')) return { body: items }
    if (req.url.endsWith('/registro'))
      return { body: registro ?? { posicion: null, estado: null, respuestas: [] } }
    if (req.url.endsWith('/guardar-borrador')) return { body: { item: req.body.item, estado: 'BORRADOR' } }
    throw Error(`Solicitud no configurada: ${req.url}`)
  })
  const almacen = cargarAlmacen(app)
  almacen.publicar({ consultasHabilitadas: true })
  await almacen.refrescar()
  return { app, items }
}

export async function abrir(app, codigo) {
  const Cargador = app.load(
    'src/features/activities/components/RegistroServidorPlayer.tsx',
  ).RegistroServidorPlayer
  const cargador = app.mount(Cargador, { codigo, onClose() {} })
  cargador.render()
  await esperar()
  const hijo = elementos(cargador.render(), (e) => e.type?.name === 'StudentActivityPlayer')[0]
  assert.ok(hijo, 'el cargador abre el reproductor')
  // El arnés comparte los hooks entre montajes: el cargador se desmonta antes de montar el reproductor.
  cargador.unmount()
  const Reproductor = app.load(
    'src/features/activities/components/StudentActivityPlayer.tsx',
  ).StudentActivityPlayer
  return app.mount(Reproductor, hijo.props)
}
// La consigna de un registro: con casillas, podio o elección guiada según el ítem.
