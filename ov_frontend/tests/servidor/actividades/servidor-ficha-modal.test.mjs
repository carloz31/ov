import assert from 'node:assert/strict'
import test from 'node:test'
import { cargarAlmacen, copia, elementos, esperar, fixtureServidor, jsonServidor } from '../../soporte/servidor-ayudas.mjs'

// Ajuste mochila: el modal de ficha compartido (cabecera, cuerpo con scroll y pie fijos).
const texto = (n) =>
  Array.isArray(n)
    ? n.map(texto).join('')
    : typeof n === 'string' || typeof n === 'number'
      ? String(n)
      : n?.props
        ? texto(n.props.children)
        : ''

const fichasFinal = jsonServidor('ruta/ruta-fichas-final')

test('tiempo de lectura: una palabra cada 200 por minuto, como mínimo uno', () => {
  const { tiempoLectura } = fixtureServidor().load('src/features/backpack/lib/fichaLectura.ts')
  assert.equal(tiempoLectura(undefined), 1)
  assert.equal(tiempoLectura('una dos tres'), 1)
  assert.equal(tiempoLectura(Array(1300).fill('palabra').join(' ')), 7)
})

test('el color del tema sale de una paleta fija y es el mismo para el mismo tema', () => {
  const { colorTema, paletaTemas } = fixtureServidor().load('src/features/backpack/lib/fichaLectura.ts')
  assert.equal(paletaTemas.length, 6)
  assert.deepEqual(copia(colorTema('Mitos y creencias')), copia(colorTema('Mitos y creencias')))
  assert.ok(paletaTemas.includes(colorTema('Mundo laboral')))
})

test('el markdown de lectura dibuja subtítulos, listas, citas y enlaces https, sin HTML crudo', () => {
  const app = fixtureServidor()
  const { ResourceText } = app.load('src/components/student/ResourceText.tsx')
  const arbol = app
    .mount(ResourceText, {
      text: '### Título\n\n- uno\n- **dos**\n\n1. a\n2. b\n\n> Una cita\n\n[sitio](https://ejemplo.pe) y [otro](javascript:alert(1))',
    })
    .render()
  const tipos = (tipo) => elementos(arbol, (e) => e.type === tipo)
  assert.equal(texto(tipos('h3')), 'Título')
  assert.equal(tipos('ul')[0] && tipos('li').length, 4)
  assert.equal(texto(tipos('blockquote')), 'Una cita')
  assert.equal(texto(tipos('strong')), 'dos')
  const enlaces = tipos('a')
  assert.deepEqual(copia(enlaces.map((a) => [a.props.href, a.props.rel])), [['https://ejemplo.pe', 'noopener noreferrer']])
  assert.ok(texto(arbol).includes('otro'))
})

test('el modal muestra tema, origen, tramo y minutos; enlaza la actividad solo desde la mochila', async () => {
  const app = fixtureServidor()
  app.fetch((r) => {
    if (r.url.endsWith('/fichas/t-ficha')) return { body: jsonServidor('ruta/ruta-ficha-t-ficha') }
    if (r.url.endsWith('/ver-ficha')) return { body: { eventos_registrados: [], nuevos_desbloqueos: [] } }
    return { body: [] }
  })
  cargarAlmacen(app).publicar({ consultasHabilitadas: true })
  const { FichaModal } = app.load('src/features/backpack/components/FichaModal.tsx')
  const { fichaServidor } = app.load('src/features/backpack/lib/travelerResources.ts')
  const resource = fichaServidor(fichasFinal[0])
  const dibujar = async (enlazarActividad) => {
    const modal = app.mount(FichaModal, { abierto: true, resource, enlazarActividad, onClose() {} })
    modal.render()
    await esperar()
    return modal.render()
  }
  const mochila = await dibujar(true)
  assert.deepEqual(copia(elementos(mochila, (e) => e.type?.name === 'ChipTema').map((e) => e.props.tema)), [
    'Mitos y creencias',
  ])
  assert.ok(texto(mochila).includes('La encontraste en Inicio de prueba · Tramo 1 · 1 min de lectura'))
  const enlaces = elementos(mochila, (e) => typeof e.props?.to === 'string')
  assert.equal(enlaces.length, 1)
  assert.match(enlaces[0].props.to, /^\/student\/missions\?punto=/)
  // Desde una actividad (el host global), el nombre va como texto plano.
  const actividad = await dibujar(false)
  assert.equal(elementos(actividad, (e) => typeof e.props?.to === 'string').length, 0)
  assert.ok(texto(actividad).includes('Inicio de prueba'))
  assert.ok(!texto(actividad).includes('Ficha desbloqueada') && !texto(actividad).includes('Leí la ficha'))
})

test('al abrirse, el modal registra VISTA_FICHA solo si la ficha todavía es nueva', async () => {
  const app = fixtureServidor()
  app.fetch((r) => {
    if (r.url.endsWith('/acciones/ver-ficha')) return { body: { eventos_registrados: [], nuevos_desbloqueos: [] } }
    return { body: [] }
  })
  cargarAlmacen(app).publicar({ consultasHabilitadas: true })
  const { FichaModal } = app.load('src/features/backpack/components/FichaModal.tsx')
  const { fichaServidor } = app.load('src/features/backpack/lib/travelerResources.ts')
  for (const ficha of fichasFinal.filter((f) => f.estado === 'DISPONIBLE')) {
    const modal = app.mount(FichaModal, { abierto: true, resource: fichaServidor(ficha), onClose() {} })
    modal.render()
    await esperar()
    modal.unmount()
  }
  // t-ficha ya está vista en el fixture; solo t-ficha-2 se registra.
  assert.deepEqual(
    copia(app.requests.filter((r) => r.url.endsWith('/ver-ficha')).map((r) => r.body)),
    [{ cuenta: 'est-ana', ficha: 't-ficha-2' }],
  )
})

test('mientras se piden las fichas, el modal muestra su esqueleto', () => {
  const app = fixtureServidor()
  const { FichaModal } = app.load('src/features/backpack/components/FichaModal.tsx')
  const arbol = app.mount(FichaModal, { abierto: true, cargando: true, onClose() {} }).render()
  assert.ok(elementos(arbol, (e) => e.type?.name === 'Skeleton').length > 0)
  assert.equal(elementos(arbol, (e) => e.type?.name === 'ResourceContent').length, 0)
})

test('en api, el modal pide el contenido al abrirse: primero su carga, luego la ficha; un solo pedido', async () => {
  const app = fixtureServidor()
  app.fetch((r) => {
    if (r.url.endsWith('/fichas/t-ficha')) return { body: jsonServidor('ruta/ruta-ficha-t-ficha') }
    return { body: [] }
  })
  cargarAlmacen(app).publicar({ consultasHabilitadas: true })
  const { FichaModal } = app.load('src/features/backpack/components/FichaModal.tsx')
  const { fichaServidor } = app.load('src/features/backpack/lib/travelerResources.ts')
  const resource = fichaServidor(fichasFinal[0])
  // Dos aperturas (mochila y una actividad) comparten el pedido.
  const uno = app.mount(FichaModal, { abierto: true, resource, enlazarActividad: true, onClose() {} })
  const dos = app.mount(FichaModal, { abierto: true, resource, onClose() {} })
  const cargando = uno.render()
  dos.render()
  assert.ok(elementos(cargando, (e) => e.type?.name === 'Skeleton').length > 0)
  assert.equal(elementos(cargando, (e) => e.type?.name === 'ResourceContent').length, 0)
  await esperar()
  const listo = uno.render()
  const cuerpo = elementos(listo, (e) => e.type?.name === 'ResourceContent')[0]
  assert.ok(cuerpo.props.resource.content.startsWith('Muchas decisiones'))
  assert.equal(app.requests.filter((r) => r.url.endsWith('/fichas/t-ficha')).length, 1)
})
