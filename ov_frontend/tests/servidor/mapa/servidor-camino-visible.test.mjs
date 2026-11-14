import assert from 'node:assert/strict'
import test from 'node:test'
import { copia, fixtureServidor, jsonServidor } from '../../soporte/servidor-ayudas.mjs'

// Ajuste lumi-mensajes (§15): en api, el mapa del camino muestra las requeridas completadas, las disponibles o
// empezadas, solo la primera requerida bloqueada (en el orden del servidor) y las opcionales desbloqueadas.
// «Mis actividades», el siguiente paso y la entrada a una actividad siguen leyendo todos los puntos.
const CONTENIDO = 'contenido/contenido-actividades-inicial'

function preparar(bloques) {
  const app = fixtureServidor({ desarrollo: false })
  const sesion = app.load('src/store/servidor/sesion.ts')
  sesion.publicar({ actividades: { datos: bloques, estado: 'listo', error: null } })
  const camino = app.load('src/features/adventure/lib/caminoPoints.ts')
  const visible = app.load('src/features/adventure/lib/caminoVisible.ts')
  const { siguientePaso } = app.load('src/features/adventure/lib/siguientePaso.ts')
  return {
    app,
    todos: () => camino.getCaminoPoints({}, {}),
    mapa: () => camino.getCaminoPointsMapa({}, {}),
    visible,
    siguiente: (puntos) => siguientePaso(bloques, puntos, 'camino'),
  }
}

const requeridasCamino = (bloques) =>
  bloques.filter((b) => b.espacio === 'MISIONES_CAMPO').flatMap((b) => b.actividades.filter((a) => a.requerida))

// El camino con las k primeras requeridas completadas, la siguiente disponible y el resto bloqueadas.
function caminoEnPaso(k) {
  const bloques = copia(jsonServidor(CONTENIDO))
  requeridasCamino(bloques).forEach((a, i) => {
    a.estado = i < k ? 'COMPLETADA' : i === k ? 'DISPONIBLE' : 'BLOQUEADA'
  })
  return bloques
}
const ids = (puntos) => puntos.map((p) => p.specActivityId)
const bloqueadasRequeridas = (puntos) => puntos.filter((p) => !p.opcional && p.status === 'locked')

const punto = (id, status, extra = {}) => ({ id, specActivityId: id, status, zone: 'missions', ...extra })
test('el filtro deja las completadas, las disponibles y solo la primera requerida bloqueada', () => {
  const { visible } = preparar(caminoEnPaso(0))
  const filtrar = (puntos) => ids(visible.puntosVisiblesCamino(puntos))
  // Ninguna completada: la primera y la siguiente con candado.
  assert.deepEqual(filtrar([punto('a', 'available'), punto('b', 'locked'), punto('c', 'locked')]), ['a', 'b'])
  // Dos disponibles a la vez: las dos se ven.
  assert.deepEqual(
    filtrar([punto('a', 'completed'), punto('b', 'available'), punto('c', 'available'), punto('d', 'locked'), punto('e', 'locked')]),
    ['a', 'b', 'c', 'd'],
  )
  // La siguiente espera algo de fuera (ninguna disponible): se ve ella, con candado.
  assert.deepEqual(filtrar([punto('a', 'completed'), punto('b', 'locked'), punto('c', 'locked')]), ['a', 'b'])
  // Una opcional desbloqueada se ve; su candado no cuenta como la siguiente.
  assert.deepEqual(
    filtrar([punto('a', 'completed'), punto('x', 'available', { opcional: true }), punto('b', 'locked'), punto('c', 'locked')]),
    ['a', 'x', 'b'],
  )
  assert.deepEqual(
    filtrar([punto('x', 'locked', { opcional: true }), punto('a', 'available'), punto('b', 'locked')]),
    ['x', 'a', 'b'],
  )
  // Todo completado: se ve todo.
  assert.deepEqual(filtrar([punto('a', 'completed'), punto('b', 'completed')]), ['a', 'b'])
})

test('con una cuenta nueva de contenido se ven b0-1 y b0-2 con candado', () => {
  const m = preparar(copia(jsonServidor(CONTENIDO)))
  assert.deepEqual(
    copia(m.mapa().map((p) => [p.specActivityId, p.status])),
    [
      ['b0-1', 'available'],
      ['b0-2', 'locked'],
    ],
  )
  // «Mis actividades» y el siguiente paso siguen leyendo todo el camino.
  assert.ok(m.todos().length > 2)
})

test('recorrido: en cada paso del camino de contenido se ve la disponible y solo la siguiente bloqueada', () => {
  const total = requeridasCamino(jsonServidor(CONTENIDO)).length
  assert.equal(total, 38)
  for (let k = 0; k <= total; k++) {
    const bloques = caminoEnPaso(k)
    const m = preparar(bloques)
    const todos = m.todos()
    const visibles = m.mapa()
    const requeridas = requeridasCamino(bloques)
    if (k < total) {
      assert.ok(ids(visibles).includes(requeridas[k].codigo), `paso ${k}: la disponible se ve`)
      const bloqueadas = bloqueadasRequeridas(visibles)
      if (k < total - 1) {
        assert.equal(bloqueadas.length, 1, `paso ${k}: una sola bloqueada`)
        assert.equal(bloqueadas[0].specActivityId, requeridas[k + 1].codigo, `paso ${k}: es la siguiente`)
      } else assert.equal(bloqueadas.length, 0)
    }
    for (const p of todos.filter((p) => p.status === 'available'))
      assert.ok(ids(visibles).includes(p.specActivityId), `paso ${k}: ${p.specActivityId} disponible y oculta`)
    const paso = m.siguiente(todos)
    if (paso && 'punto' in paso && paso.punto.zone === 'missions')
      assert.ok(
        visibles.some((p) => p.id === paso.punto.id),
        `paso ${k}: el siguiente paso apunta a un punto oculto`,
      )
    if (k === total) {
      const fin = visibles.filter((p) => !p.opcional)
      assert.equal(fin.length, 38)
      assert.ok(fin.every((p) => p.status === 'completed'))
    }
  }
})

test('un ?punto= de una misión oculta abre la siguiente bloqueada visible', () => {
  const m = preparar(caminoEnPaso(10))
  const { useMapScreen } = m.app.load('src/features/adventure/hooks/useMapScreen.ts')
  const adventure = m.app.load('src/store/adventureStore.ts').useAdventure()
  const visibles = m.mapa()
  const siguiente = bloqueadasRequeridas(visibles)[0]
  // b5-2 (la llegada que enlaza el libro de Helena) está oculta en el tramo 2.
  const oculta = m.todos().find((p) => p.specActivityId === 'b5-2')
  assert.ok(oculta && !visibles.some((p) => p.id === oculta.id))
  const abrir = (selectedId) =>
    m.app.mount(useMapScreen, { zone: 'missions', points: visibles, adventure, journey: {}, selectedId }).render()
  const pantalla = abrir(oculta.id)
  assert.equal(pantalla.selected.id, siguiente.id)
  assert.equal(pantalla.selectedPointId, siguiente.id)
  assert.equal(pantalla.selected.status, 'locked')
  // Un punto visible se abre a sí mismo y uno que no es del camino no abre nada.
  assert.equal(abrir(visibles[0].id).selected.id, visibles[0].id)
  assert.equal(abrir('no-existe').selected, undefined)
})
