import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'
import {
  cargarAlmacen,
  elementos,
  escenarioRuta,
  esConsultaDominio,
  esperar,
  fixtureServidor,
  jsonServidor,
  respuestaDominio,
} from '../../soporte/servidor-ayudas.mjs'

// Ajuste de F03: re-entrar a un test completado (api) es de lectura primero, con «Anterior» y «Siguiente»;
// «Cambiar mis respuestas» solo si el servidor admite cambios, y si no, una línea dice que quedaron fijas.
const code = ts.transpileModule(readFileSync('src/lib/servidor/adaptadoresInstrumentos.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 },
}).outputText
const instrumentos = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
const CATALOGO = jsonServidor('ruta/ruta-instrumentos')
const avance = (momento) => jsonServidor(`ruta/ruta-avance-instrumentos-${momento}`)

test('admite cambios: sin resultado vigente y si no es partida ni llegada', () => {
  const { admiteCambios } = instrumentos
  assert.equal(admiteCambios('TEST-RIASEC', avance('riasec-listo'), CATALOGO), true)
  assert.equal(admiteCambios('TEST-RIASEC', avance('final'), CATALOGO), false)
  assert.equal(admiteCambios('TEST-PARTIDA-LLEGADA', avance('inicial'), CATALOGO), false)
  assert.equal(admiteCambios(undefined, avance('inicial'), CATALOGO), false)
})

async function reentrar({ puedeCambiar }) {
  const app = fixtureServidor({ ruta: '/student/missions?actividad=t-partida&revision=1' }),
    estado = escenarioRuta('t1')
  app.fetch((req) => {
    if (esConsultaDominio(req)) return respuestaDominio(req, estado)
    if (req.url.includes('/notificaciones')) return { body: { total: 0, no_vistas: 0, items: [] } }
    if (req.url.endsWith('/responder-items'))
      return {
        body: {
          cuenta: 'est-ana',
          actividad: 't-partida',
          respuestas_guardadas: req.body.respuestas,
          progreso: { estado: 'COMPLETADA', respondidos: 19, total: 19 },
        },
      }
    throw Error(`Solicitud no configurada: ${req.url}`)
  })
  const almacen = cargarAlmacen(app)
  almacen.publicar({ consultasHabilitadas: true })
  await almacen.refrescar()
  const items = jsonServidor('ruta/ruta-items-t-partida')
  // DATO DE PRUEBA: todas respondidas con «Bastante de acuerdo» (3).
  const respuestas = items.map((i) => ({
    item: i.codigo,
    opcion: i.escala.opciones.find((o) => o.orden === 3),
    creada_en: '2026-10-07T10:00:00',
    actualizada_en: '2026-10-07T10:00:00',
  }))
  const { actividadPorContenido, cuestionarioServidor } = app.load('src/lib/servidor/contenidos.ts')
  const activity = cuestionarioServidor(actividadPorContenido(estado.bloques, 't-partida'), items)
  const { StudentActivityPlayer } = app.load('src/features/activities/components/StudentActivityPlayer.tsx')
  const player = app.mount(StudentActivityPlayer, {
    activity,
    instrumentoServidor: {
      items,
      respuestas,
      nodoInicialId: activity.nodos.find((n) => n.tipo === 'item').id,
      revision: true,
      soloLectura: false,
      puedeCambiar,
    },
    onClose() {},
  })
  const nodo = () => elementos(player.render(), (e) => e.type?.name === 'ItemNode')[0]
  return { app, nodo }
}

test('con cambios admitidos: lectura primero, tocar no guarda y «Cambiar mis respuestas» pasa a edición', async () => {
  const { app, nodo } = await reentrar({ puedeCambiar: true })
  assert.equal(nodo().props.readOnly, true)
  assert.equal(nodo().props.fijas, false)
  assert.equal(nodo().props.existing.valor, 3)
  nodo().props.onAnswer(4)
  await esperar()
  assert.ok(!app.requests.some((r) => r.url.endsWith('/responder-items')))
  // «Siguiente» avanza en lectura y la segunda pregunta tiene «Anterior».
  nodo().props.onContinue()
  await esperar()
  assert.equal(nodo().props.node.itemId, 'AUTO-02')
  assert.equal(typeof nodo().props.onAnterior, 'function')
  nodo().props.onAnterior()
  await esperar()
  assert.equal(nodo().props.node.itemId, 'AUTO-01')
  nodo().props.onCambiar()
  await esperar()
  assert.equal(nodo().props.readOnly, false)
  assert.equal(nodo().props.onCambiar, undefined)
  nodo().props.onAnswer(4)
  await esperar()
  const guardado = app.requests.find((r) => r.url.endsWith('/responder-items'))
  assert.deepEqual(guardado.body.respuestas, [{ item: 'AUTO-01', opcion: 4 }])
})

test('sin cambios admitidos: solo lectura con la línea de respuestas fijas y sin botón', async () => {
  const { app, nodo } = await reentrar({ puedeCambiar: false })
  assert.equal(nodo().props.readOnly, true)
  assert.equal(nodo().props.fijas, true)
  assert.equal(nodo().props.onCambiar, undefined)
  nodo().props.onAnswer(4)
  await esperar()
  assert.ok(!app.requests.some((r) => r.url.endsWith('/responder-items')))
  const { ItemNode } = app.load('src/features/activities/components/nodes/ItemNode.tsx')
  const React = (await import('react')).default
  const { renderToStaticMarkup } = await import('react-dom/server')
  const marcado = renderToStaticMarkup(React.createElement(ItemNode, nodo().props))
  assert.match(marcado, /Tus respuestas ya quedaron fijas\./)
  assert.match(marcado, /Siguiente/)
  assert.doesNotMatch(marcado, /Cambiar mis respuestas/)
})
