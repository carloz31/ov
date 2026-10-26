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
    if (r.url.endsWith('-favorito')) return { body: { eventos_registrados: [], nuevos_desbloqueos: [] } }
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

test('voces: abiertas, por descubrir con su llamado disponible y cierre con las que faltan', async () => {
  const { app, model } = await mochila('final', {
    testimonios: jsonServidor('ruta/ruta-testimonios-final'),
    ruta: '/student/resources?kind=testimonial',
  })
  assert.deepEqual(
    [model.voces.abiertas.length, model.voces.porDescubrir.length, model.voces.pendientes, model.vacio],
    [1, 1, 2, false],
  )
  const { CompartimentoVoces } = app.load('src/features/backpack/components/CompartimentoVoces.tsx')
  const arbol = app.mount(CompartimentoVoces, { model }).render()
  assert.ok(texto(arbol).includes('1 de 4 voces'))
  const abierta = elementos(arbol, (e) => e.type?.name === 'TarjetaTestimonio')[0].props
  assert.deepEqual(copia([abierta.nombre, abierta.rol, abierta.regalo, abierta.nueva]), [
    'Luis Mendoza',
    'Paramédico/a · 5 años de experiencia',
    'Caso de prueba',
    false,
  ])
  const voz = elementos(arbol, (e) => e.type?.name === 'VozPorDescubrir')[0].props
  assert.equal(voz.caso, 'Caso de prueba')
  assert.ok(voz.pista && voz.hrefCaso.includes('punto='))
  const cierre = elementos(arbol, (e) => e.type?.name === 'TarjetaPunteada')[0].props
  assert.equal(cierre.titulo, 'Más voces se suman a la ciudad')
  assert.ok(cierre.texto.startsWith('2 voces más esperan en llamados que aún no se abren.'))
  // Las voces de llamados cerrados no se listan.
  assert.equal(elementos(arbol, (e) => e.type?.name === 'VozPorDescubrir').length, 1)
})

test('voces: sin abiertas ni llamados disponibles, el compartimento vacío', async () => {
  const { app, model } = await mochila('inicial', {
    testimonios: jsonServidor('ruta/ruta-testimonios-inicial'),
    ruta: '/student/resources?kind=testimonial',
  })
  assert.equal(model.vacio, true)
  const { CompartimentoVoces } = app.load('src/features/backpack/components/CompartimentoVoces.tsx')
  const vacia = elementos(app.mount(CompartimentoVoces, { model }).render(), (e) => e.type?.name === 'TarjetaPunteada')[0]
    .props
  assert.equal(vacia.titulo, 'Las voces llegan con los llamados')
  assert.ok(vacia.texto.endsWith('Hay 4 voces en la ciudad.'))
})

test('favoritos en api: se leen del servidor y se guardan con marcar y desmarcar', async () => {
  const { app, hook } = await mochila('final', {
    testimonios: jsonServidor('ruta/ruta-testimonios-final'),
  })
  let model = hook.render()
  const ficha = (id) => model.fichasObtenidas.find((f) => f.id === id)
  // En el fixture final, t-ficha es favorita.
  assert.deepEqual([model.esFavorita(ficha('t-ficha')), model.esFavorita(ficha('t-ficha-2'))], [true, false])
  const consultas = () => app.requests.filter((r) => /\/(fichas|testimonios)$/.test(r.url)).length
  const antes = consultas()
  // Mientras el POST corre, la estrella muestra su cargador y no cambia; un segundo clic se ignora.
  model.toggleFavorite('t-ficha-2')
  model = hook.render()
  assert.deepEqual([model.favoritoPendiente('t-ficha-2'), model.esFavorita(ficha('t-ficha-2'))], [true, false])
  model.toggleFavorite('t-ficha-2')
  await esperar()
  model = hook.render()
  assert.deepEqual([model.favoritoPendiente('t-ficha-2'), model.esFavorita(ficha('t-ficha-2'))], [false, true])
  model.toggleFavorite('t-ficha')
  model.toggleFavorite('t-testimonio-1')
  await esperar()
  assert.deepEqual(
    copia(app.requests.filter((r) => r.url.endsWith('-favorito')).map((r) => [r.url, r.body])),
    [
      ['/api/acciones/marcar-favorito', { cuenta: 'est-ana', tipo: 'FICHA', codigo: 't-ficha-2' }],
      ['/api/acciones/desmarcar-favorito', { cuenta: 'est-ana', tipo: 'FICHA', codigo: 't-ficha' }],
      ['/api/acciones/marcar-favorito', { cuenta: 'est-ana', tipo: 'TESTIMONIO', codigo: 't-testimonio-1' }],
    ],
  )
  const { TarjetaFicha } = app.load('src/features/backpack/components/TarjetaFicha.tsx')
  const tarjeta = app.mount(TarjetaFicha, {
    resource: ficha('t-ficha'),
    favorita: true,
    nueva: false,
    pendiente: true,
    onOpen() {},
    onFavorite() {},
  }).render()
  const estrella = elementos(tarjeta, (e) => e.props?.['aria-busy'] !== undefined)[0]
  assert.equal(estrella.props['aria-busy'], true)
  assert.equal(elementos(estrella, (e) => e.type?.displayName === 'Loader2' || /Loader/.test(e.type?.displayName ?? '')).length, 1)
  // Confirmado el POST, el cambio se aplica a lo cargado: no se vuelven a pedir fichas ni testimonios.
  assert.equal(consultas(), antes)
  model = hook.render()
  assert.deepEqual(
    [model.esFavorita(ficha('t-ficha')), model.esFavorita(model.voces.abiertas[0])],
    [false, true],
  )
  // «Solo favoritos» usa los del servidor.
  hook.render().setFavoritesOnly(true)
  assert.deepEqual(copia(hook.render().gruposFichas.flatMap((g) => g.fichas.map((f) => f.id))), ['t-ficha-2'])
})
