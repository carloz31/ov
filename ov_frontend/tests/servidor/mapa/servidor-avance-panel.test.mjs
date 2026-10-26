import assert from 'node:assert/strict'
import test from 'node:test'
import { elementos, fixtureServidor, jsonServidor } from '../../soporte/servidor-ayudas.mjs'

// Ajuste del panel (F05): la tarjeta de avance del panel lee `/avance`: un anillo con el porcentaje global
// y, en texto, el tramo actual (solo requeridas). El total del camino no se muestra en texto.
const listo = (datos) => ({ datos, estado: 'listo', error: null })
function texto(nodo) {
  if (nodo == null || typeof nodo === 'boolean') return ''
  if (typeof nodo === 'string' || typeof nodo === 'number') return String(nodo)
  if (Array.isArray(nodo)) return nodo.map(texto).join('')
  return texto(nodo.props?.children)
}
function tarjeta(zona, avance) {
  const app = fixtureServidor()
  app.load('src/store/servidor/sesion.ts').publicar({
    actividades: listo(jsonServidor('ruta/ruta-actividades-t1')),
    ...(avance ? { avance: listo(avance) } : {}),
  })
  const { getZoneProgress } = app.load('src/features/adventure/lib/mapPoints.ts')
  const { AdventurePanel } = app.load('src/features/adventure/components/AdventurePanel.tsx')
  const panel = app.mount(AdventurePanel, {
    adventure: app.load('src/store/adventureStore.ts').useAdventure(),
    points: [],
    progress: getZoneProgress(zona, {}, {}),
    siguiente: null,
    onSelect() {},
    onCheckIn() {},
  })
  const e = elementos(panel.render(), (x) => x.type?.name === 'ProgresoZona')[0]
  const arbol = e.type(e.props)
  panel.unmount()
  return arbol
}
const anillo = (arbol) => elementos(arbol, (e) => e.props?.role === 'progressbar')[0]

test('camino: el anillo con el porcentaje global y el tramo actual en texto, con su nombre', () => {
  const avance = jsonServidor('ruta/ruta-avance-t1')
  const arbol = tarjeta('missions', avance)
  assert.equal(arbol.props['data-zona'], 'camino')
  assert.equal(anillo(arbol).props['aria-valuenow'], avance.camino.porcentaje)
  const t = texto(arbol)
  assert.match(t, new RegExp(`^${Math.round(avance.camino.porcentaje)}%Camino`))
  assert.match(t, /Tramo 2 · 0 de 1 misiones/)
  // El nombre del tramo de la ruta de prueba es «Camino»: se muestra igual (dato de prueba).
  assert.match(t, /misionesCamino$/)
  assert.doesNotMatch(t, new RegExp(`de ${avance.camino.total}`))
  // Sin barra fina.
  assert.equal(elementos(arbol, (e) => e.props?.className === 'sx-progress-bar').length, 0)
})

test('camino completo: sin tramo y con su porcentaje, aunque no llegue al 100 %', () => {
  const avance = {
    ...jsonServidor('ruta/ruta-avance-t2'),
    camino: { completadas: 7, total: 14, porcentaje: 50 },
    tramo_actual: null,
    camino_completo: true,
  }
  const t = texto(tarjeta('missions', avance))
  assert.match(t, /^50%CaminoCamino completo$/)
})

test('ciudad: el color de la Ciudad y la afinidad, sin tramos', () => {
  const avance = jsonServidor('ruta/ruta-avance-final')
  const arbol = tarjeta('central', avance)
  assert.equal(arbol.props['data-zona'], 'ciudad')
  assert.equal(texto(arbol), `${Math.round(avance.ciudad.porcentaje)}%Ciudad${Math.round(avance.ciudad.porcentaje)}% de afinidad`)
})

test('si falló el avance: anillo vacío sin número y solo el rótulo', () => {
  const arbol = tarjeta('missions', null)
  assert.equal(anillo(arbol).props['aria-valuenow'], undefined)
  assert.equal(texto(arbol), 'Camino')
})
