import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import React from 'react'
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

// Ajuste carga-casos: la Central juega en api un caso JSON (hidden-plaza, el de t-caso) con la escala del servidor,
// de punta a punta: superarlo y quedarse sin presupuesto con fases pendientes.
const json = JSON.parse(readFileSync('src/data/cases/plataforma/hidden-plaza.json', 'utf8'))
const directorio = jsonServidor('ruta/ruta-ocupaciones-caso')
const [cuentaCaso] = jsonServidor('ruta/ruta-casos')
const resolver = jsonServidor('ruta/ruta-resolver-caso')

const textoDe = (nodo) =>
  Array.isArray(nodo)
    ? nodo.map(textoDe).join('')
    : React.isValidElement(nodo)
      ? textoDe(nodo.props.children)
      : nodo === null || nodo === undefined || typeof nodo === 'boolean'
        ? ''
        : String(nodo)
const llamado = (arbol, nombre) => elementos(arbol, (e) => e.type?.name === nombre)[0]
const boton = (arbol, texto) => elementos(arbol, (e) => e.type === 'button' && textoDe(e).includes(texto))[0]

async function central({ superado }) {
  const app = fixtureServidor({ ruta: '/student/cases/hidden-plaza/play' }),
    estado = escenarioRuta('ciudad')
  app.fetch((req) => {
    if (esConsultaDominio(req)) return respuestaDominio(req, estado)
    if (req.url.includes('/notificaciones')) return { body: { total: 0, no_vistas: 0, items: [] } }
    if (req.url.endsWith('/casos'))
      return { body: [{ ...cuentaCaso, superado, mejor_puntaje: superado ? 8 : 0, intentos: 1 }] }
    if (req.url.endsWith('/resolver-caso'))
      return {
        body: superado
          ? resolver
          : { ...resolver, nuevos_desbloqueos: [], nuevas_notificaciones: [], ocupaciones_nuevas: [] },
      }
    throw Error(`Solicitud no configurada: ${req.url}`)
  })
  const almacen = cargarAlmacen(app)
  almacen.publicar({ consultasHabilitadas: true })
  await almacen.refrescar()
  const { casoDesdeJson } = app.load('src/features/cases/lib/casoDesdeJson.ts')
  const { getExplorationImagePath } = app.load('src/lib/explorationAssets.ts')
  const caso = casoDesdeJson(
    json,
    { titulo: cuentaCaso.titulo, minimo: cuentaCaso.puntaje_minimo, maximo: cuentaCaso.puntaje_maximo },
    directorio,
    getExplorationImagePath,
  )
  const { ForestFireCaseView } = app.load('src/features/cases/components/ForestFireCaseView.tsx')
  const vista = app.mount(ForestFireCaseView, { actividad: 't-caso', caso, onClose() {}, onComplete() {} })
  let arbol = vista.render()
  return {
    app,
    caso,
    get arbol() {
      return arbol
    },
    dibujar: () => (arbol = vista.render()),
    envios: () => app.requests.filter((r) => r.url.endsWith('/resolver-caso')).map((r) => copia(r.body)),
  }
}

// Escucha a todos, arma el equipo de cada problema con `equipo(problema)` y confirma la fase.
function jugarFase(c, fase, equipo) {
  if (fase.number > 1) {
    boton(c.arbol, 'Comenzar fase').props.onClick()
    c.dibujar()
  }
  llamado(c.arbol, 'ListenScreen').props.onHear(fase.messages.map((m) => m.id))
  c.dibujar()
  llamado(c.arbol, 'ListenScreen').props.onNext()
  c.dibujar()
  for (const problema of fase.problems) {
    for (const id of equipo(problema)) {
      llamado(c.arbol, 'ProfessionalDirectory').props.onCall(id)
      c.dibujar()
    }
    llamado(c.arbol, 'StepActions').props.onNext()
    c.dibujar()
  }
  assert.equal(llamado(c.arbol, 'StepActions').props.label, 'Confirmar equipo')
  llamado(c.arbol, 'StepActions').props.onNext()
  c.dibujar()
}

test('completar hidden-plaza con el equipo justo lo supera con la escala del servidor', async () => {
  const c = await central({ superado: true })
  const cabecera = llamado(c.arbol, 'ForestFireCaseHeader').props
  assert.deepEqual([cabecera.titulo, cabecera.presupuesto, cabecera.budgetRemaining], ['Caso de prueba', 10, 10])
  assert.equal(cabecera.label, `Fase 1 de 3 · ${json.fases[0].nombre}`)
  for (const fase of c.caso.phases) {
    jugarFase(c, fase, (problema) => problema.expectedProfessionalIds)
    llamado(c.arbol, 'PhaseResultScreen').props.onContinue()
    await esperar()
    c.dibujar()
  }
  const correctas = [...new Set(json.fases.flatMap((f) => f.problemas.flatMap((p) => p.necesidades.map((n) => n.onet))))]
  assert.deepEqual(c.envios(), [{ cuenta: 'est-ana', actividad: 't-caso', puntaje: 8, ocupaciones: correctas }])
  const cierre = llamado(c.arbol, 'FinalReportScreen').props
  assert.equal(cierre.servidor.superado, true)
  assert.equal(cierre.servidor.puntaje, 'Puntaje: 8 de 8 · mínimo 6')
  assert.equal(cierre.servidor.tematica, json.tematica)
  assert.equal(cierre.bestScore, 8)
  assert.deepEqual(copia(cierre.newIcons), resolver.ocupaciones_nuevas)
  assert.equal(cierre.caso, c.caso)
  assert.equal(llamado(c.arbol, 'ForestFireCaseHeader').props.label, 'Cierre del caso')
})

test('sin presupuesto y con fases pendientes, el intento termina en «El presupuesto se agotó» con puntaje 0', async () => {
  const c = await central({ superado: false })
  const [primera] = c.caso.phases
  const [p1, p2] = primera.problems
  const resto = c.caso.professionals.map((p) => p.id).filter((id) => id !== p2.expectedProfessionalIds[0])
  // Nueve llamadas en el primer problema y una en el segundo: los 10 puntos del presupuesto en la fase 1.
  jugarFase(c, primera, (problema) => (problema.id === p1.id ? resto.slice(0, 9) : p2.expectedProfessionalIds))
  assert.equal(llamado(c.arbol, 'PhaseResultScreen').props.remaining, 0)
  llamado(c.arbol, 'PhaseResultScreen').props.onContinue()
  await esperar()
  c.dibujar()
  assert.deepEqual(c.envios(), [{ cuenta: 'est-ana', actividad: 't-caso', puntaje: 0, ocupaciones: [] }])
  const pantalla = textoDe(c.arbol)
  assert.match(pantalla, /El presupuesto se agotó/)
  assert.match(pantalla, /Usaste los 10 puntos antes de completar todas las fases\. Vuelve a intentarlo/)
  assert.equal(llamado(c.arbol, 'FinalReportScreen'), undefined)
  assert.ok(boton(c.arbol, 'Intentar de nuevo') && boton(c.arbol, 'Volver a la ciudad'))
  // Reintentar arranca limpio, con el presupuesto entero.
  boton(c.arbol, 'Intentar de nuevo').props.onClick()
  c.dibujar()
  assert.equal(llamado(c.arbol, 'ForestFireCaseHeader').props.budgetRemaining, 10)
})
