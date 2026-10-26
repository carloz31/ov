import assert from 'node:assert/strict'
import test from 'node:test'
import { cargarAlmacen, copia, elementos, esperar, fixtureServidor, jsonServidor } from '../../soporte/servidor-ayudas.mjs'

// Ajuste mochila: el compartimento de fichas (grupos por tramo, cierre, vacío y sin resultados).
const texto = (n) =>
  Array.isArray(n)
    ? n.map(texto).join('')
    : typeof n === 'string' || typeof n === 'number'
      ? String(n)
      : n?.props
        ? texto(n.props.children)
        : ''

async function mochila(etapa, { testimonios = [], ruta = '/student/resources' } = {}) {
  const app = fixtureServidor({ ruta })
  app.fetch((r) => {
    if (r.url.endsWith('/fichas')) return { body: jsonServidor(`ruta/ruta-fichas-${etapa}`) }
    if (r.url.endsWith('/testimonios')) return { body: testimonios }
    return { body: [] }
  })
  const almacen = cargarAlmacen(app)
  almacen.publicar({ consultasHabilitadas: true })
  await almacen.asegurarSeccion('fichas')
  const hook = app.mount(app.load('src/features/backpack/hooks/useBackpack.ts').useBackpack, {})
  hook.render()
  await esperar()
  return { app, hook, model: hook.render() }
}

test('agrupa por tramo, luego Ciudad y al final Otras fichas; sin tramos, un solo grupo sin rótulo', () => {
  const { agruparFichas } = fixtureServidor().load('src/features/backpack/lib/agruparFichas.ts')
  const ficha = (id, obtenidaEn, origen = {}) => ({ id, ficha: { obtenidaEn, ...origen } })
  const t1 = { codigo: 'T1', nombre: 'Explorar', numero: 2 },
    t0 = { codigo: 'T0', nombre: 'Inicio', numero: 1 },
    actividad = { codigo: 'a', titulo: 'A' }
  const grupos = agruparFichas(
    [
      ficha('vieja', '2026-01-01', { actividad, tramo: t0 }),
      ficha('ciudad', '2026-01-03', { actividad }),
      ficha('otra', '2026-01-04'),
      ficha('t1', '2026-01-02', { actividad, tramo: t1 }),
      ficha('nueva', '2026-01-05', { actividad, tramo: t0 }),
    ],
    (r) => r.ficha,
  )
  assert.deepEqual(copia(grupos.map((g) => [g.rotulo, g.fichas.map((f) => f.id)])), [
    ['Tramo 1 · Inicio', ['nueva', 'vieja']],
    ['Tramo 2 · Explorar', ['t1']],
    ['Ciudad', ['ciudad']],
    ['Otras fichas', ['otra']],
  ])
  assert.deepEqual(copia(agruparFichas([ficha('x', '1'), ficha('y', '2')], (r) => r.ficha).map((g) => g.rotulo)), [null])
})

test('con fichas obtenidas: separador del tramo, tarjetas sin candados, «Nueva» y el cierre «Más adelante»', async () => {
  const { app, model } = await mochila('final')
  assert.equal(model.nuevas, 1)
  assert.deepEqual([model.fichasObtenidas.length, model.sheets.length, model.fichasPendientes], [2, 3, 1])
  const { CompartimentoFichas } = app.load('src/features/backpack/components/CompartimentoFichas.tsx')
  const arbol = app.mount(CompartimentoFichas, { model }).render()
  const contenido = texto(arbol)
  assert.ok(contenido.includes('Tramo 1 · Inicio') && contenido.includes('2 fichas'))
  assert.ok(contenido.includes('Más adelante'))
  const punteadas = elementos(arbol, (e) => e.type?.name === 'TarjetaPunteada').map((e) => e.props)
  assert.deepEqual(copia(punteadas.map((p) => [p.titulo, p.texto])), [
    [
      'Más fichas te esperan en el camino',
      '1 ficha más te espera en el camino. Las misiones informativas dejan una al terminarlas.',
    ],
  ])
  assert.ok(!contenido.includes('Bloqueado') && !contenido.includes('Ver requisito') && !contenido.includes('Abrir ficha'))
  const tarjetas = elementos(arbol, (e) => e.type?.name === 'TarjetaFicha')
  assert.deepEqual(copia(tarjetas.map((t) => [t.props.resource.id, t.props.nueva])), [
    ['t-ficha', false],
    ['t-ficha-2', true],
  ])
  const { BackpackHeader } = app.load('src/features/backpack/components/BackpackHeader.tsx')
  const barras = elementos(app.mount(BackpackHeader, { model }).render(), (e) => e.type?.name === 'TrailBar')
  assert.deepEqual(copia(barras.map((b) => b.props.text)), ['2 de 3', '0 de 0'])
})

test('sin fichas obtenidas: estado vacío con «Ir al mapa», buscador y favoritos deshabilitados', async () => {
  const { app, model } = await mochila('inicial')
  assert.equal(model.vacio, true)
  const { CompartimentoFichas } = app.load('src/features/backpack/components/CompartimentoFichas.tsx')
  const arbol = app.mount(CompartimentoFichas, { model }).render()
  const vacia = elementos(arbol, (e) => e.type?.name === 'TarjetaPunteada')[0].props
  assert.equal(vacia.titulo, 'Tu mochila está lista, pero todavía vacía')
  assert.ok(vacia.texto.includes('Hay 3 esperando en el camino'))
  assert.equal(vacia.accion.props.to, '/student/exploration')
  assert.equal(elementos(arbol, (e) => e.type?.name === 'TarjetaFicha').length, 0)
  const { BarraMochila } = app.load('src/features/backpack/components/BarraMochila.tsx')
  const barra = app.mount(BarraMochila, { model }).render()
  assert.ok(elementos(barra, (e) => e.type === 'input')[0].props.disabled)
  assert.ok(elementos(barra, (e) => e.props?.['aria-pressed'] !== undefined && e.type === 'button')[0].props.disabled)
})

test('sin resultados: la búsqueda que no encuentra nada ofrece «Limpiar filtros»', async () => {
  const { app, hook } = await mochila('final')
  hook.render().setQuery('palabra que no existe')
  const model = hook.render()
  assert.equal(model.sinResultados, true)
  const { CompartimentoFichas } = app.load('src/features/backpack/components/CompartimentoFichas.tsx')
  const arbol = app.mount(CompartimentoFichas, { model }).render()
  const sin = elementos(arbol, (e) => e.type?.name === 'SinResultados')[0].props
  assert.equal(sin.texto, 'Ninguna ficha coincide con tu búsqueda')
  sin.onLimpiar()
  assert.equal(hook.render().sinResultados, false)
  // El tema también se busca.
  hook.render().setQuery('mitos y creencias')
  assert.deepEqual(copia(hook.render().gruposFichas.flatMap((g) => g.fichas.map((f) => f.id))), ['t-ficha'])
})
