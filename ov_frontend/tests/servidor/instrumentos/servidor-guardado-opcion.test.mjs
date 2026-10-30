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

// En api, tocar una opción del test solo la marca; «Continuar» la envía y avanza, con el cargador en el botón y las
// opciones deshabilitadas mientras guarda; sin aviso de «Guardando» y sin volver a leer el camino tras cada respuesta.
const ITEM = jsonServidor('ruta/ruta-items-t-partida')[0]
const opciones = ITEM.escala.opciones.map((o) => ({ value: o.orden, text: o.etiqueta }))
const nodo = { id: 'n', tipo: 'item', instrumentoId: ITEM.instrumento, itemId: ITEM.codigo }

test('mientras guarda, «Continuar» lleva el cargador y todas las opciones quedan deshabilitadas', () => {
  const { ItemNode } = fixtureServidor().load('src/features/activities/components/nodes/ItemNode.tsx')
  const props = {
    node: nodo,
    text: ITEM.enunciado,
    options: opciones,
    direct: true,
    onAnswer() {},
    onContinue() {},
  }
  const guardando = renderToStaticMarkup(
    React.createElement(ItemNode, { ...props, existing: { valor: 3 }, busy: true, confirmar: true }),
  )
  assert.equal((guardando.match(/animate-spin/g) ?? []).length, 1)
  assert.match(
    guardando,
    /<button[^>]*sx-primary-button[^>]*aria-busy="true"[^>]*>Continuar<svg[^>]*animate-spin/,
  )
  assert.equal((guardando.match(/<button[^>]*sx-player-option[^>]*disabled/g) ?? []).length, opciones.length)
  assert.match(guardando, /<button[^>]*sx-player-option is-selected[^>]*>Bastante de acuerdo</)
  // Sin elegir, «Continuar» está deshabilitado y sin cargador.
  const libre = renderToStaticMarkup(React.createElement(ItemNode, { ...props, confirmar: true }))
  assert.doesNotMatch(libre, /animate-spin/)
  assert.match(libre, /<button[^>]*sx-primary-button[^>]*disabled[^>]*>Continuar/)
  assert.doesNotMatch(libre, /sx-player-option[^>]*disabled/)
})

test('con confirmar, elegir solo marca; «Continuar» envía la elegida (o avanza si no cambió); sin él, el lapso local', async () => {
  const app = fixtureServidor()
  const { ItemNode } = app.load('src/features/activities/components/nodes/ItemNode.tsx')
  const montar = (props) => {
    const llamadas = { respuestas: [], continuar: 0 }
    const item = app.mount(ItemNode, {
      node: nodo,
      text: ITEM.enunciado,
      options: opciones,
      direct: true,
      onAnswer: (valor) => llamadas.respuestas.push(valor),
      onContinue: () => llamadas.continuar++,
      ...props,
    })
    const opcion = (i) => elementos(item.render(), (e) => e.type === 'button' && 'aria-pressed' in e.props)[i]
    const continuar = () =>
      elementos(item.render(), (e) => e.type === 'button' && e.props.className === 'sx-primary-button')[0]
    return { item, llamadas, opcion, continuar }
  }
  const nueva = montar({ confirmar: true })
  assert.equal(nueva.continuar().props.disabled, true)
  nueva.opcion(0).props.onClick()
  nueva.opcion(1).props.onClick()
  await new Promise((resolve) => setTimeout(resolve, 350))
  assert.deepEqual(copia(nueva.llamadas), { respuestas: [], continuar: 0 })
  assert.equal(nueva.opcion(1).props['aria-pressed'], true)
  assert.equal(nueva.continuar().props.disabled, false)
  nueva.continuar().props.onClick()
  assert.deepEqual(copia(nueva.llamadas), { respuestas: [opciones[1].value], continuar: 0 })
  nueva.item.unmount()
  // Al volver a una ya respondida, «Continuar» sin cambiar avanza una sola vez, sin volver a responder.
  const igual = montar({ confirmar: true, existing: { valor: opciones[2].value } })
  igual.continuar().props.onClick()
  igual.continuar().props.onClick()
  assert.deepEqual(copia(igual.llamadas), { respuestas: [], continuar: 1 })
  igual.item.unmount()
  // Sin confirmar (modo local), se sigue avanzando tras el lapso, sin botón.
  const local = montar({})
  assert.equal(local.continuar(), undefined)
  local.opcion(0).props.onClick()
  await new Promise((resolve) => setTimeout(resolve, 350))
  assert.deepEqual(copia(local.llamadas), { respuestas: [opciones[0].value], continuar: 0 })
  local.item.unmount()
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
