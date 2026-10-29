import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  cargarAlmacen,
  copia,
  elementos,
  escenarioRuta,
  esConsultaDominio,
  fixtureServidor,
  jsonServidor,
  respuestaDominio,
} from '../../soporte/servidor-ayudas.mjs'

// Ajuste de F03: en api, la opción del test se guarda al pulsarla, con un loader en la propia opción y las
// demás deshabilitadas; sin aviso de «Guardando» y sin volver a leer el camino tras cada respuesta.
const ITEM = jsonServidor('ruta/ruta-items-t-partida')[0]
const opciones = ITEM.escala.opciones.map((o) => ({ value: o.orden, text: o.etiqueta }))
const nodo = { id: 'n', tipo: 'item', instrumentoId: ITEM.instrumento, itemId: ITEM.codigo }

test('mientras guarda, la opción elegida lleva el loader y todas quedan deshabilitadas', () => {
  const { ItemNode } = fixtureServidor().load('src/features/activities/components/nodes/ItemNode.tsx')
  const props = { node: nodo, text: ITEM.enunciado, options: opciones, direct: true, onAnswer() {}, onContinue() {} }
  const guardando = renderToStaticMarkup(
    React.createElement(ItemNode, { ...props, existing: { valor: 3 }, busy: true, inmediato: true }),
  )
  assert.equal((guardando.match(/animate-spin/g) ?? []).length, 1)
  assert.match(guardando, /aria-busy="true"[^>]*>Bastante de acuerdo<svg/)
  assert.equal((guardando.match(/<button[^>]*sx-player-option[^>]*disabled/g) ?? []).length, opciones.length)
  const libre = renderToStaticMarkup(React.createElement(ItemNode, { ...props, inmediato: true }))
  assert.doesNotMatch(libre, /animate-spin|disabled/)
})

test('con inmediato la opción se envía al pulsarla; sin él conserva el lapso de avance', () => {
  const app = fixtureServidor()
  const { ItemNode } = app.load('src/features/activities/components/nodes/ItemNode.tsx')
  const enviadas = []
  for (const inmediato of [true, false]) {
    const item = app.mount(ItemNode, {
      node: nodo,
      text: ITEM.enunciado,
      options: opciones,
      direct: true,
      inmediato,
      onAnswer: (valor) => enviadas.push([inmediato, valor]),
      onContinue() {},
    })
    const tree = item.render()
    const boton = elementos(tree, (e) => e.type === 'button' && 'aria-pressed' in e.props)[0]
    boton.props.onClick()
    item.unmount()
  }
  assert.deepEqual(copia(enviadas), [[true, opciones[0].value]])
})

test('solo la primera respuesta vuelve a leer el camino; las demás pasan a la siguiente pregunta', async () => {
  const app = fixtureServidor(),
    estado = escenarioRuta('t1')
  let respondidos = 0
  app.fetch((req) => {
    if (esConsultaDominio(req)) return respuestaDominio(req, estado)
    if (req.url.includes('/notificaciones')) return { body: { total: 0, no_vistas: 0, items: [] } }
    if (req.url.endsWith('/responder-items')) {
      respondidos += 1
      return {
        body: {
          cuenta: 'est-ana',
          actividad: 't-partida',
          respuestas_guardadas: req.body.respuestas,
          progreso: { estado: 'EN_CURSO', respondidos, total: 19 },
        },
      }
    }
    throw Error(`Solicitud no configurada: ${req.url}`)
  })
  const almacen = cargarAlmacen(app)
  almacen.publicar({ consultasHabilitadas: true })
  await almacen.refrescar()
  const operaciones = app.load('src/store/servidor/operaciones.ts')
  const lecturas = () => app.requests.filter((r) => r.url.endsWith('/actividades')).length
  const inicial = lecturas()
  assert.equal((await operaciones.responderItems('t-partida', [{ item: ITEM.codigo, opcion: 3 }])).tipo, 'ok')
  assert.equal(lecturas(), inicial + 1)
  assert.equal((await operaciones.responderItems('t-partida', [{ item: 'AUTO-02', opcion: 3 }])).tipo, 'ok')
  assert.equal(lecturas(), inicial + 1)
})
