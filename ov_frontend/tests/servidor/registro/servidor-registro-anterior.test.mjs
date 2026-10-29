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

// F01 · ajuste: «Anterior» en el reproductor en modo api (registros y cuestionarios del servidor).
const de = (tree, nombre) => elementos(tree, (e) => e.type?.name === nombre)[0]
const consigna = (tree) =>
  elementos(tree, (e) =>
    ['RegistroConsignaNode', 'RegistroPodioNode', 'RegistroEleccionNode'].includes(e.type?.name),
  )[0]
const borradores = (app) => app.requests.filter((r) => r.url.endsWith('/guardar-borrador'))

test('desde la primera consigna, «Anterior» guarda el borrador sin validar con la posición del diálogo y vuelve a él', async () => {
  const { app } = await iniciar()
  const player = await abrir(app, 't-expectativas')
  let tree = player.render()
  assert.equal(de(tree, 'DialogueBox').props.onAnterior, undefined, 'no aparece en el primer paso')
  de(tree, 'DialogueBox').props.onContinue()
  tree = player.render()
  assert.equal(de(tree, 'PlayerTopBar').props.index, 1)
  // Sin texto mínimo ni «Otra» escrita: igual se guarda, omitiendo la «Otra» vacía.
  consigna(tree).props.onAnterior('', [{ codigo: 'UNIVERSIDAD' }, { codigo: 'OTRA' }])
  await esperar()
  assert.deepEqual(copia(borradores(app).at(-1).body), {
    cuenta: 'est-ana',
    actividad: 't-expectativas',
    item: 't-exp-ruta',
    texto: '',
    opciones: [{ codigo: 'UNIVERSIDAD' }],
    posicion: 't-exp-intro',
  })
  tree = player.render()
  assert.equal(de(tree, 'PlayerTopBar').props.index, 0)
  assert.equal(de(tree, 'DialogueBox').props.typewriter, false)
  player.unmount()
})

test('con la posición en el diálogo de entrada, el registro retoma ahí', async () => {
  const { app } = await iniciar({
    registro: { posicion: 't-exp-intro', estado: 'EN_CURSO', respuestas: [] },
  })
  const player = await abrir(app, 't-expectativas')
  const tree = player.render()
  assert.equal(de(tree, 'PlayerTopBar').props.index, 0)
  assert.ok(de(tree, 'DialogueBox'))
  player.unmount()
})

test('de Apoyo a Ruta: guarda lo escrito en Apoyo y vuelve a Ruta con lo que tenía guardado', async () => {
  const borrador = jsonServidor('ruta/ruta-registro-t-expectativas-borrador')
  const { app } = await iniciar({ registro: { ...borrador, posicion: 't-exp-apoyo' } })
  const player = await abrir(app, 't-expectativas')
  let tree = player.render()
  assert.equal(consigna(tree).props.node.id, 't-exp-apoyo')
  consigna(tree).props.onAnterior('Mi mamá', [{ codigo: 'FAMILIA' }])
  await esperar()
  assert.deepEqual(copia(borradores(app).at(-1).body), {
    cuenta: 'est-ana',
    actividad: 't-expectativas',
    item: 't-exp-apoyo',
    texto: 'Mi mamá',
    opciones: [{ codigo: 'FAMILIA' }],
    posicion: 't-exp-ruta',
  })
  tree = player.render()
  const ruta = consigna(tree)
  assert.equal(ruta.props.node.id, 't-exp-ruta')
  assert.deepEqual(copia(ruta.props.inicial), {
    texto: 'DATO DE PRUEBA: borrador a medias',
    opciones: [{ codigo: 'INSTITUTO' }, { codigo: 'OTRA', texto: 'Viajar un año' }],
  })
  // Al avanzar otra vez, Apoyo conserva lo guardado al retroceder.
  ruta.props.onGuardar('Otra vez', [{ codigo: 'INSTITUTO' }])
  await esperar()
  assert.deepEqual(copia(consigna(player.render()).props.inicial), {
    texto: 'Mi mamá',
    opciones: [{ codigo: 'FAMILIA' }],
  })
  player.unmount()
})

test('con una pregunta de seguimiento pendiente (registro entregado) no hay «Anterior»', async () => {
  const { app } = await iniciar({
    actividad: 't-valores',
    registro: jsonServidor('ruta/ruta-registro-t-valores-pendiente'),
  })
  const player = await abrir(app, 't-valores')
  const tree = player.render()
  assert.ok(de(tree, 'RegistroSeguimiento'))
  assert.equal(consigna(tree), undefined)
  assert.equal(elementos(tree, (e) => e.props?.onAnterior).length, 0)
  player.unmount()
})

async function partida({ soloLectura = false } = {}) {
  const app = fixtureServidor(),
    estado = escenarioRuta('inicial'),
    items = jsonServidor('ruta/ruta-items-t-partida')
  const t0 = estado.bloques[0].actividades
  Object.assign(t0[0], { estado: 'COMPLETADA' })
  Object.assign(t0[1], { estado: 'DISPONIBLE', bloqueo: null })
  app.fetch((req) => {
    if (esConsultaDominio(req)) return respuestaDominio(req, estado)
    if (req.url.includes('/notificaciones')) return { body: { total: 0, no_vistas: 0, items: [] } }
    if (req.url.endsWith('/responder-items'))
      return {
        body: {
          cuenta: req.body.cuenta,
          actividad: req.body.actividad,
          respuestas_guardadas: req.body.respuestas,
          progreso: { estado: 'EN_CURSO', respondidos: 2, total: items.length },
        },
      }
    throw Error(`Solicitud no configurada: ${req.url}`)
  })
  const almacen = cargarAlmacen(app)
  almacen.publicar({ consultasHabilitadas: true })
  await almacen.refrescar()
  const { contenidoPorClave } = app.load('src/data/activities/contenidos.ts')
  const { cuestionarioServidor } = app.load('src/lib/servidor/contenidos.ts')
  const activity = { ...cuestionarioServidor(contenidoPorClave('t_partida'), items), id: 't-partida' }
  const nodosItem = activity.nodos.filter((n) => n.tipo === 'item')
  // DATO DE PRUEBA: el primer ítem respondido con la opción 2; se retoma en el segundo.
  const respuestas = [
    {
      item: items[0].codigo,
      opcion: items[0].escala.opciones.find((o) => o.orden === 2),
      creada_en: '2026-10-07T10:00:00',
      actualizada_en: '2026-10-07T10:00:00',
    },
  ]
  const Reproductor = app.load(
    'src/features/activities/components/StudentActivityPlayer.tsx',
  ).StudentActivityPlayer
  const player = app.mount(Reproductor, {
    activity,
    instrumentoServidor: {
      items,
      respuestas,
      nodoInicialId: nodosItem[1].id,
      revision: soloLectura,
      soloLectura,
    },
    onClose() {},
  })
  return { app, items, nodosItem, player }
}

test('en un cuestionario a medias, «Anterior» vuelve al ítem con su opción y cambiarla la reemplaza', async () => {
  const { app, items, nodosItem, player } = await partida()
  let item = de(player.render(), 'ItemNode')
  assert.equal(item.props.node.id, nodosItem[1].id)
  item.props.onAnterior()
  item = de(player.render(), 'ItemNode')
  assert.equal(item.props.node.id, nodosItem[0].id)
  assert.deepEqual(copia(item.props.existing), { valor: 2 })
  item.props.onAnswer(4)
  await esperar()
  assert.deepEqual(copia(app.requests.find((r) => r.url.endsWith('/responder-items')).body.respuestas), [
    { item: items[0].codigo, opcion: 4 },
  ])
  assert.equal(de(player.render(), 'ItemNode').props.node.id, nodosItem[1].id)
  player.unmount()
})

// Ajuste de F03: la re-entrada a un cuestionario completado se lee con «Anterior» y «Siguiente».
test('un cuestionario en revisión (completado) se recorre con «Anterior», sin poder responder', async () => {
  const { player } = await partida({ soloLectura: true })
  const item = de(player.render(), 'ItemNode')
  assert.equal(typeof item.props.onAnterior, 'function')
  assert.equal(item.props.readOnly, true)
  player.unmount()
})

test('al volver al podio desde el ítem siguiente, se muestra completo con su explicación', async () => {
  const { app } = await iniciar({ actividad: 't-valores' })
  const player = await abrir(app, 't-valores')
  de(player.render(), 'DialogueBox').props.onContinue()
  const podio = consigna(player.render())
  assert.equal(podio.type.name, 'RegistroPodioNode')
  const elegidas = [{ codigo: 'CREAR' }, { codigo: 'LIBERTAD' }, { codigo: 'ESTABILIDAD' }]
  podio.props.onGuardar('Crear me mueve', elegidas)
  await esperar()
  const libre = consigna(player.render())
  assert.equal(libre.props.node.id, 't-val-libre')
  libre.props.onAnterior('Algo a medias', [])
  await esperar()
  const vuelta = consigna(player.render())
  assert.equal(vuelta.type.name, 'RegistroPodioNode')
  assert.deepEqual(copia(vuelta.props.inicial), { texto: 'Crear me mueve', opciones: elegidas })
  // Y al avanzar otra vez, el ítem siguiente conserva lo que tenía al retroceder.
  vuelta.props.onGuardar('Crear me mueve', elegidas)
  await esperar()
  assert.deepEqual(copia(consigna(player.render()).props.inicial), { texto: 'Algo a medias', opciones: [] })
  player.unmount()
})

test('en api, la primera pregunta del cuestionario no tiene «Anterior»', async () => {
  const { nodosItem, player } = await partida()
  const segunda = de(player.render(), 'ItemNode')
  segunda.props.onAnterior()
  const primera = de(player.render(), 'ItemNode')
  assert.equal(primera.props.node.id, nodosItem[0].id)
  assert.equal(primera.props.onAnterior, undefined)
  player.unmount()
})
