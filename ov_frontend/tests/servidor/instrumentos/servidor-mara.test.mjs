import { esConsultaDominio } from '../../soporte/servidor-ayudas.mjs'
import { loadMapPoints } from '../../soporte/refactor-map.mjs'
import assert from 'node:assert/strict'
import test from 'node:test'
import { iniciarMara, itemEn, botonEn } from '../../soporte/servidor-mara-ayudas.mjs'
import { jsonServidor, elementos, esperar } from '../../soporte/servidor-ayudas.mjs'

test('construye Mara con los códigos, el orden y las opciones reales; reparte tres saludos', async () => {
  const f = await iniciarMara(),
    a = f.app.load('src/lib/servidor/adaptadores.ts')
  assert.equal(f.activity.nodos.length, f.items.length + 2)
  assert.deepEqual(
    Array.from(
      f.activity.nodos.filter((n) => n.tipo === 'item'),
      (n) => n.itemId,
    ),
    f.items.map((i) => i.codigo),
  )
  assert.equal(
    f.activity.nodos.some((n) => n.itemId?.startsWith('tip-')),
    false,
  )
  const saludos = [2, 3, 4, 5].map(
    (numero) =>
      a.construirInteraccionMara(
        { codigo: `act-tip-${String(numero).padStart(2, '0')}`, titulo: 'DATO DE PRUEBA' },
        f.items,
        'primero',
      ).nodos[0].texto,
  )
  assert.equal(new Set(saludos).size, 3)
  assert.equal(saludos[0], saludos[3])
})

test('la reanudación usa el primer ítem sin responder e ignora el nodo y las respuestas locales', async () => {
  const f = await iniciarMara({ cantidad: 3 })
  const journey = f.app.load('src/store/journeyStore.ts')
  journey.updateJourney((s) => ({
    ...s,
    drafts: { prueba: 'DATO DE PRUEBA: borrador' },
    progress: { ...s.progress, 'act-tip-01': { ...s.progress['act-tip-01'], nodoActualId: '$fin' } },
  }))
  const player = f.montar(),
    item = itemEn(player)
  assert.equal(item.props.node.itemId, f.items[3].codigo)
  assert.equal(item.props.text, f.items[3].enunciado)
  assert.deepEqual(
    Array.from(item.props.options, (o) => o.text),
    f.items[3].escala.opciones.map((o) => o.etiqueta),
  )
  assert.equal(journey.getJourneySnapshot().drafts.prueba, 'DATO DE PRUEBA: borrador')
  assert.equal(f.app.requests.filter((r) => r.method === 'POST').length, 0)
})

test('con todos los ítems respondidos abre la despedida, y solo move confirma la finalización', async () => {
  const f = await iniciarMara({ cantidad: 5 }),
    player = f.montar()
  const dialogo = elementos(player.render(), (e) => e.type?.name === 'DialogueBox')[0]
  assert.match(dialogo.props.text, /Gracias/)
  dialogo.props.onContinue()
  dialogo.props.onContinue()
  await esperar()
  assert.equal(f.app.requests.filter((r) => r.url.endsWith('/completar-actividad')).length, 1)
  assert.equal(elementos(player.render(), (e) => e.type?.name === 'FinishScreen').length, 1)
})

test('cada selección guarda el orden, bloquea doble clic y no escribe respuestas ni resultados locales', async () => {
  const f = await iniciarMara(),
    player = f.montar({ nodoInicialId: f.activity.nodos[1].id })
  let resolver
  f.app.fetch((req) =>
    req.url.endsWith('/responder-items')
      ? new Promise((resolve) => {
          resolver = () => resolve(f.servidor(req))
        })
      : f.servidor(req),
  )
  const item = itemEn(player)
  item.props.onAnswer(4)
  item.props.onAnswer(2)
  assert.equal(itemEn(player).props.busy, true)
  assert.equal(f.app.requests.filter((r) => r.url.endsWith('/responder-items')).length, 1)
  resolver()
  await esperar()
  assert.equal(itemEn(player).props.node.itemId, f.items[1].codigo)
  const journey = f.app.load('src/store/journeyStore.ts').getJourneySnapshot()
  assert.equal(journey.items.length, 0)
  assert.equal(journey.results.length, 0)
  assert.equal(
    f.app.requests.some((r) => r.url.endsWith('/completar-actividad')),
    false,
  )
})

test('un guardado confirmado reintenta el refresco sin repetir el POST ni cambiar la opción', async () => {
  const f = await iniciarMara(),
    player = f.montar({ nodoInicialId: f.activity.nodos[1].id })
  let fallar = true
  f.app.fetch((req) => {
    if (esConsultaDominio(req) && fallar) throw Error('DATO DE PRUEBA: sin red')
    return f.servidor(req)
  })
  itemEn(player).props.onAnswer(5)
  await esperar()
  assert.equal(itemEn(player).props.node.itemId, f.items[0].codigo)
  fallar = false
  itemEn(player).props.onAnswer(2)
  await esperar()
  assert.equal(f.respuestas.get(f.items[0].codigo), 5)
  assert.equal(f.app.requests.filter((r) => r.url.endsWith('/responder-items')).length, 1)
  assert.equal(itemEn(player).props.node.itemId, f.items[1].codigo)
})

test('desconexión y 409 mantienen el ítem; solo el 409 por resultado vigente activa lectura', async () => {
  const f = await iniciarMara(),
    player = f.montar({ nodoInicialId: f.activity.nodos[1].id })
  let fallo = 'red'
  f.app.fetch((req) => {
    if (!req.url.endsWith('/responder-items')) return f.servidor(req)
    if (fallo === 'red') throw Error('DATO DE PRUEBA')
    return {
      status: 409,
      body: {
        detail: {
          mensaje:
            fallo === 'fijo'
              ? 'Las respuestas están fijas: la aplicación tiene un resultado vigente'
              : 'Actividad bloqueada',
        },
      },
    }
  })
  itemEn(player).props.onAnswer(4)
  await esperar()
  assert.ok(botonEn(player.render(), 'Reintentar'))
  assert.equal(itemEn(player).props.readOnly, false)
  fallo = 'bloqueo'
  itemEn(player).props.onAnswer(4)
  await esperar()
  assert.equal(itemEn(player).props.readOnly, false)
  fallo = 'fijo'
  itemEn(player).props.onAnswer(4)
  await esperar()
  assert.equal(itemEn(player).props.readOnly, true)
  assert.equal(
    f.app.requests.some((r) => r.url.endsWith('/completar-actividad')),
    false,
  )
})

test('la revisión de una completada con resultado recorre las respuestas sin POST ni nueva finalización', async () => {
  const f = await iniciarMara({ cantidad: 5, completada: true, resultado: jsonServidor('resultado-riasec') }),
    player = f.montar()
  assert.equal(itemEn(player).props.readOnly, true)
  assert.equal(itemEn(player).props.existing.valor, 4)
  itemEn(player).props.onAnswer(1)
  for (let i = 0; i < 5; i++) itemEn(player).props.onContinue()
  elementos(player.render(), (e) => e.type?.name === 'DialogueBox')[0].props.onContinue()
  assert.equal(f.cerrada, 1)
  assert.equal(f.app.requests.filter((r) => r.method === 'POST').length, 0)
})

test('Ciudad permite Mara disponible, bloquea interacciones futuras por URL y expone revisiones en el detalle', async () => {
  const f = await iniciarMara({ ruta: '/student/exploration?actividad=act-tip-01' })
  const Ciudad = f.app.load('src/pages/student/CiudadScreen.tsx').CiudadScreen
  assert.equal(
    elementos(f.app.mount(Ciudad, {}).render(), (e) => e.type?.name === 'MaraInteractionPlayer').length,
    1,
  )
  const g = await iniciarMara({
    ruta: '/student/exploration?actividad=act-tip-02',
    cantidad: 5,
    completada: true,
  })
  const screen = g.app.mount(g.app.load('src/pages/student/CiudadScreen.tsx').CiudadScreen, {})
  assert.equal(elementos(screen.render(), (e) => e.type?.name === 'MaraInteractionPlayer').length, 0)
  assert.equal(g.app.query.has('actividad'), false)
  const mapa = loadMapPoints(g.app.load),
    journey = g.app.load('src/store/journeyStore.ts').getJourneySnapshot(),
    adventure = g.app.load('src/store/adventureStore.ts').useAdventure()
  const point = mapa.getCiudadPoints(adventure, journey).find((p) => p.id === 'mara-test')
  assert.equal(mapa.getPointDetails(point, adventure, journey).reviewActivities[0].codigo, 'act-tip-01')
})

test('la carga de Mara consulta ítems y respuestas y ofrece reintento sin sustituirlos por TIP', async () => {
  const f = await iniciarMara({ cantidad: 3 }),
    Wrapper = f.app.load('src/features/activities/components/MaraInteractionPlayer.tsx').MaraInteractionPlayer
  const loader = f.app.mount(Wrapper, { codigo: 'act-tip-01', onClose() {} })
  loader.render()
  await esperar()
  const child = elementos(loader.render(), (e) => e.type?.name === 'StudentActivityPlayer')[0]
  assert.equal(child.props.instrumentoServidor.nodoInicialId, f.activity.nodos[4].id)
  assert.equal(
    f.app.requests.some((r) => r.url.endsWith('/respuestas')),
    true,
  )
  loader.unmount()
  const g = await iniciarMara()
  g.app.fetch((req) =>
    req.url.endsWith('/items')
      ? { status: 503, body: { mensaje: 'DATO DE PRUEBA: indisponible' } }
      : g.servidor(req),
  )
  const failed = g.app.mount(
    g.app.load('src/features/activities/components/MaraInteractionPlayer.tsx').MaraInteractionPlayer,
    { codigo: 'act-tip-01', onClose() {} },
  )
  failed.render()
  await esperar()
  assert.ok(botonEn(failed.render(), 'Reintentar'))
})

test('las consultas de la cuenta anterior se descartan cuando cambia el estudiante', async () => {
  const f = await iniciarMara()
  let resolver
  f.app.fetch((req) =>
    req.url.endsWith('/respuestas')
      ? new Promise((resolve) => {
          resolver = () => resolve(f.servidor(req))
        })
      : f.servidor(req),
  )
  const pendiente = f.almacen.consultarRespuestas('act-tip-01')
  f.app.load('src/store/servidor/operaciones.ts').prepararIngreso()
  f.app.load('src/store/servidor/cuenta.ts').guardarUsuarioIngreso('est-luis')
  resolver()
  assert.equal((await pendiente).tipo, 'http')
  assert.equal(f.almacen.obtenerEstadoServidor().resultadoRiasec, null)
})
