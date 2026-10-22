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

// F01: entrega, preguntas de seguimiento y cierre con items_por_ampliar, con los fixtures de t-valores.
const pendienteFx = jsonServidor('ruta/ruta-registro-t-valores-pendiente')
const entregaFx = jsonServidor('ruta/ruta-entregar-t-valores-seguimiento')
const respuestaFx = jsonServidor('ruta/ruta-responder-seguimiento-t-valores')
const cierreFx = jsonServidor('ruta/ruta-continuar-sin-responder-t-valores')

async function abrirValores(registro) {
  const app = fixtureServidor(),
    estado = escenarioRuta('t1')
  const items = jsonServidor('ruta/ruta-items-registro-t-valores')
  app.fetch((req) => {
    if (esConsultaDominio(req)) return respuestaDominio(req, estado)
    if (req.url.includes('/desbloqueos?')) return { body: [] }
    if (req.url.endsWith('/items-registro')) return { body: items }
    if (req.url.endsWith('/registro')) return { body: registro }
    if (req.url.endsWith('/guardar-borrador')) return { body: { item: req.body.item, estado: 'BORRADOR' } }
    if (req.url.endsWith('/entregar')) return { body: entregaFx }
    if (req.url.endsWith('/responder-seguimiento')) return { body: respuestaFx }
    if (req.url.endsWith('/continuar-sin-responder')) return { body: cierreFx }
    throw Error(`Solicitud no configurada: ${req.url}`)
  })
  const almacen = cargarAlmacen(app)
  almacen.publicar({ consultasHabilitadas: true })
  await almacen.refrescar()
  const Cargador = app.load(
    'src/features/activities/components/RegistroServidorPlayer.tsx',
  ).RegistroServidorPlayer
  const cargador = app.mount(Cargador, { codigo: 't-valores', onClose() {} })
  cargador.render()
  await esperar()
  const hijo = elementos(cargador.render(), (e) => e.type?.name === 'StudentActivityPlayer')[0]
  cargador.unmount()
  const Reproductor = app.load(
    'src/features/activities/components/StudentActivityPlayer.tsx',
  ).StudentActivityPlayer
  return { app, player: app.mount(Reproductor, hijo.props) }
}
const seguimiento = (tree) => elementos(tree, (e) => e.type?.name === 'RegistroSeguimiento')[0]

test('turnosRegistro arma el hilo: pregunta pendiente, respuesta dada y pregunta omitida', () => {
  const { turnosRegistro } = fixtureServidor().load('src/features/activities/hooks/useRegistroServidor.ts')
  const primera = turnosRegistro(pendienteFx.respuestas[0])
  assert.equal(primera.textoInicial, 'DATO DE PRUEBA: crear me importa [vaga]')
  assert.equal(primera.turnos.length, 1)
  assert.equal(primera.pendiente, primera.turnos[0])
  const segunda = turnosRegistro(respuestaFx.respuestas[0])
  assert.equal(segunda.turnos[0].respuesta, 'DATO DE PRUEBA: porque sí [vaga]')
  assert.equal(segunda.pendiente, segunda.turnos[1])
  const cerrada = turnosRegistro(cierreFx.respuestas[0])
  assert.equal(cerrada.pendiente, undefined)
  assert.deepEqual(copia(cerrada.turnos.map((t) => t.omitida)), [false, true])
})

test('«Entregar» en la última consigna guarda, entrega y muestra la pregunta; luego responder y continuar sin responder cierran', async () => {
  const { app, player } = await abrirValores({ posicion: 't-val-breve', estado: 'EN_CURSO', respuestas: [] })
  const nodo = elementos(player.render(), (e) => e.type?.name === 'RegistroConsignaNode')[0]
  assert.equal(nodo.props.node.id, 't-val-breve')
  assert.equal(nodo.props.ultimo, true)
  nodo.props.onGuardar('Un momento', [])
  await esperar()
  const urls = app.requests.map((r) => r.url)
  assert.ok(
    urls.indexOf('/api/acciones/registro/guardar-borrador') < urls.indexOf('/api/acciones/registro/entregar'),
  )
  assert.equal(app.requests.find((r) => r.url.endsWith('/guardar-borrador')).body.posicion, 't-val-breve')

  let vista = seguimiento(player.render())
  assert.equal(vista.props.item, 't-val-orden')
  assert.equal(vista.props.hilo.pendiente.pregunta, entregaFx.respuestas[0].conversacion[1].texto)
  assert.equal(vista.props.porAmpliar, undefined)
  vista.props.onResponder('Porque crear me da energía')
  await esperar()
  assert.deepEqual(copia(app.requests.find((r) => r.url.endsWith('/responder-seguimiento')).body), {
    cuenta: 'est-ana',
    actividad: 't-valores',
    item: 't-val-orden',
    texto: 'Porque crear me da energía',
  })

  vista = seguimiento(player.render())
  assert.equal(vista.props.hilo.turnos.length, 2)
  vista.props.onOmitir()
  await esperar()
  vista = seguimiento(player.render())
  assert.deepEqual(copia(vista.props.porAmpliar), [
    { nombre: 'Valores', pista: cierreFx.items_por_ampliar[0].pista },
  ])
  assert.equal(vista.props.hilo, undefined)
  // El cierre nunca muestra la clasificación del evaluador.
  assert.doesNotMatch(JSON.stringify(vista.props.porAmpliar), /POCO_DESARROLLADA|ADECUADA|clasificacion/)

  vista.props.onContinuar()
  const fin = elementos(player.render(), (e) => e.type?.name === 'FinishScreen')[0]
  assert.ok(fin)
  assert.deepEqual(copia(fin.props.desbloqueosServidor), copia(cierreFx.nuevos_desbloqueos))
  player.unmount()
})

test('al reabrir con una pregunta pendiente, el reproductor va directo al seguimiento', async () => {
  const { player } = await abrirValores(pendienteFx)
  const vista = seguimiento(player.render())
  assert.ok(vista)
  assert.equal(vista.props.hilo.pendiente.orden, 1)
  player.unmount()
})

test('la vista de seguimiento ofrece «Responder» y «Continuar sin responder» y el cierre solo nombra ítem y pista', () => {
  const app = fixtureServidor()
  const { RegistroSeguimiento } = app.load(
    'src/features/activities/components/followup/RegistroSeguimiento.tsx',
  )
  const { turnosRegistro } = app.load('src/features/activities/hooks/useRegistroServidor.ts')
  const base = {
    ocupado: false,
    error: '',
    onResponder() {},
    onOmitir() {},
    onReintentar() {},
    onContinuar() {},
  }
  const textos = (tree) =>
    elementos(tree, (e) => e.type === 'button' || e.props?.text).map((e) =>
      e.type === 'button'
        ? [e.props.children]
            .flat()
            .filter((c) => typeof c === 'string')
            .join('')
        : e.props.text,
    )
  const pregunta = app.mount(RegistroSeguimiento, {
    ...base,
    item: 't-val-orden',
    hilo: turnosRegistro(pendienteFx.respuestas[0]),
  })
  assert.deepEqual(
    textos(pregunta.render()).filter((t) => /Responder|Continuar/.test(t)),
    ['Responder', 'Continuar sin responder'],
  )
  pregunta.unmount()
  const cierre = app.mount(RegistroSeguimiento, {
    ...base,
    porAmpliar: [{ nombre: 'Valores', pista: '¿Por qué?' }],
  })
  assert.deepEqual(textos(cierre.render()), [
    'Tus respuestas quedaron entregadas.',
    'Podrías profundizar en Valores: ¿Por qué?',
    'Continuar',
  ])
  cierre.unmount()
})
