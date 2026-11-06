import assert from 'node:assert/strict'
import test from 'node:test'
import {
  cargarAlmacen,
  copia,
  elementos,
  escenarioRuta,
  esConsultaDominio,
  esperar,
  fixtureServidor,
  jsonServidor,
  respuestaDominio,
} from '../../soporte/servidor-ayudas.mjs'
import { abrir, iniciar } from '../../soporte/servidor-registro-ayudas.mjs'

// F03: t-contraste cita el código de interés y las ocupaciones revelados; t-lee-cuestionario, la respuesta de
// la partida. Sin dato (perfil plano, reinicio), la cita no se muestra y la actividad sigue igual.
const CONTRASTE = {
  disponible: jsonServidor('ruta/ruta-referencias-t-contraste'),
  plano: jsonServidor('ruta/ruta-referencias-t-contraste-plano'),
  reiniciado: jsonServidor('ruta/ruta-referencias-t-contraste-reiniciado'),
}
const LEE = jsonServidor('ruta/ruta-referencias-t-lee-cuestionario')

test('la cita de un resultado usa las opciones del servidor; sin dato ni opciones, nada', () => {
  const { citaReferencia, codigosEco, necesitaReferencias } = fixtureServidor().load(
    'src/lib/servidor/adaptadoresRegistro.ts',
  )
  const [coincidencias, resultado] = ['t-ref-coincidencias', 't-ref-resultado'].map((c) =>
    CONTRASTE.disponible.referencias.find((r) => r.codigo === c),
  )
  assert.equal(
    citaReferencia(resultado),
    `Tu código de interés: ${resultado.opciones.map((o) => o.texto).join(' · ')}`,
  )
  assert.equal(resultado.opciones[0].texto, 'Investigativa')
  assert.equal(
    citaReferencia(coincidencias),
    `Ocupaciones afines: ${coincidencias.opciones
      .slice(0, 3)
      .map((o) => o.texto)
      .join(', ')}`,
  )
  for (const referencias of [CONTRASTE.plano, CONTRASTE.reiniciado])
    assert.ok(referencias.referencias.every((r) => citaReferencia(r) === undefined))
  assert.equal(citaReferencia(LEE.referencias[0]), `«${LEE.referencias[0].texto}»`)
  assert.deepEqual(copia(codigosEco(['a', 'b'])), ['a', 'b'])
  assert.deepEqual(copia(codigosEco('a')), ['a'])
  assert.equal(necesitaReferencias([], [['t-ref-resultado']]), true)
  assert.equal(necesitaReferencias([], [[]]), false)
})

async function consignaContraste(referencias) {
  const { app } = await iniciar({ actividad: 't-contraste', referencias })
  const player = await abrir(app, 't-contraste')
  elementos(player.render(), (e) => e.type?.name === 'DialogueBox')[0].props.onContinue()
  return { app, nodo: elementos(player.render(), (e) => e.type?.name === 'RegistroConsignaNode')[0] }
}

test('t-contraste abre su consigna con las dos citas en la burbuja de Lumi', async () => {
  const { app, nodo } = await consignaContraste(CONTRASTE.disponible)
  assert.ok(app.requests.some((r) => r.url.endsWith('/cuentas/est-ana/actividades/t-contraste/referencias')))
  assert.equal(nodo.props.node.item, 't-con-contraste')
  assert.equal(nodo.props.eco.estado, 'DISPONIBLE')
  assert.match(nodo.props.eco.cita, /^Tu código de interés: Investigativa · .+\. Ocupaciones afines: /)
})

test('con perfil plano o tras el reinicio, t-contraste se abre sin cita', async () => {
  for (const referencias of [CONTRASTE.plano, CONTRASTE.reiniciado]) {
    const { nodo } = await consignaContraste(referencias)
    assert.equal(nodo.props.node.item, 't-con-contraste')
    assert.equal(nodo.props.eco, undefined)
  }
})

async function abrirLectura(referencias, { edit, completada } = {}) {
  const app = fixtureServidor(),
    estado = escenarioRuta('t1')
  const lee = estado.bloques.flatMap((b) => b.actividades).find((a) => a.codigo === 't-lee-cuestionario')
  Object.assign(lee, { estado: completada ? 'COMPLETADA' : 'DISPONIBLE', visible: true, bloqueo: null })
  app.fetch((req) => {
    if (esConsultaDominio(req)) return respuestaDominio(req, estado)
    if (req.url.includes('/notificaciones')) return { body: { total: 0, no_vistas: 0, items: [] } }
    if (req.url.endsWith('/t-lee-cuestionario/referencias')) return { body: referencias }
    throw Error(`Solicitud no configurada: ${req.url}`)
  })
  const almacen = cargarAlmacen(app)
  almacen.publicar({ consultasHabilitadas: true })
  await almacen.refrescar()
  const { conEcoEncuentro, actividadPorContenido } = app.load('src/lib/servidor/contenidos.ts')
  assert.ok(conEcoEncuentro(actividadPorContenido(estado.bloques, 't-lee-cuestionario')))
  const Cargador = app.load('src/features/activities/components/EncuentroServidorPlayer.tsx').EncuentroServidorPlayer
  const cargador = app.mount(Cargador, { codigo: 't-lee-cuestionario', edit, onClose() {} })
  cargador.render()
  await esperar()
  const hijo = elementos(cargador.render(), (e) => e.type?.name === 'StudentActivityPlayer')[0]
  assert.ok(hijo, 'el cargador abre el reproductor')
  // El arnés comparte los hooks entre montajes: el cargador se desmonta antes de montar el reproductor.
  cargador.unmount()
  return { app, actividad: hijo.props.activity, hijo }
}

test('t-lee-cuestionario pide sus referencias y su diálogo dice la respuesta de la partida', async () => {
  const { app, actividad } = await abrirLectura(LEE)
  assert.ok(app.requests.some((r) => r.url.endsWith('/cuentas/est-ana/actividades/t-lee-cuestionario/referencias')))
  const cita = actividad.nodos.find((n) => n.id === 't-lee-cuestionario-cita')
  assert.ok(cita.texto.endsWith(`respondiste: «${LEE.referencias[0].texto}»`))
})

test('sin dato de la partida, el diálogo dice solo su texto', async () => {
  const sinDato = { referencias: [{ ...LEE.referencias[0], estado: 'SIN_DATO', texto: null }] }
  const { actividad } = await abrirLectura(sinDato)
  const cita = actividad.nodos.find((n) => n.id === 't-lee-cuestionario-cita')
  assert.ok(cita.texto.endsWith('respondiste:'))
})

test('en la Ciudad, t-contraste se abre con el reproductor de registros del servidor', async () => {
  const app = fixtureServidor({ ruta: '/student/exploration?actividad=t-contraste' }),
    estado = escenarioRuta('ciudad')
  const contraste = estado.bloques.flatMap((b) => b.actividades).find((a) => a.codigo === 't-contraste')
  Object.assign(contraste, { estado: 'DISPONIBLE', visible: true, bloqueo: null })
  app.fetch((req) => {
    if (esConsultaDominio(req)) return respuestaDominio(req, estado)
    if (req.url.includes('/notificaciones')) return { body: { total: 0, no_vistas: 0, items: [] } }
    throw Error(`Solicitud no configurada: ${req.url}`)
  })
  const almacen = cargarAlmacen(app)
  almacen.publicar({ consultasHabilitadas: true })
  await almacen.refrescar()
  const { CiudadScreen } = app.load('src/pages/student/CiudadScreen.tsx')
  const pantalla = app.mount(CiudadScreen, {})
  const registro = elementos(pantalla.render(), (e) => e.type?.name === 'RegistroServidorPlayer')[0]
  assert.equal(registro?.props.codigo, 't-contraste')
  pantalla.unmount()
})

test('reintentar t-lee-cuestionario completada la recorre desde el primer diálogo, con «Anterior»', async () => {
  const { app, hijo } = await abrirLectura(LEE, { edit: true, completada: true })
  assert.equal(hijo.props.edit, true)
  const { StudentActivityPlayer } = app.load('src/features/activities/components/StudentActivityPlayer.tsx')
  const player = app.mount(StudentActivityPlayer, hijo.props)
  const caja = () => elementos(player.render(), (e) => e.type?.name === 'DialogueBox')[0]
  assert.equal(caja().props.text, 'Al empezar el camino respondiste unas preguntas sobre tu futuro.')
  caja().props.onContinue()
  await esperar()
  assert.equal(typeof caja().props.onAnterior, 'function')
  caja().props.onAnterior()
  await esperar()
  assert.equal(caja().props.text, 'Al empezar el camino respondiste unas preguntas sobre tu futuro.')
})
