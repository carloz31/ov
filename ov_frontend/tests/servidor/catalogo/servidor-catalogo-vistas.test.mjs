import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'
import { cargarAlmacen, copia, elementos, esperar, fixtureServidor, jsonServidor } from '../../soporte/servidor-ayudas.mjs'

// F06: el catálogo en api con los fixtures ruta-*: pestañas paginadas con filtros, detalles del servidor, la vista
// registrada al abrirlos y el lugar inesperado elegido por el servidor.
const texto = (n) =>
  Array.isArray(n)
    ? n.map(texto).join('')
    : typeof n === 'string' || typeof n === 'number'
      ? String(n)
      : n?.props
        ? texto(n.props.children)
        : ''
const accion = { eventos_registrados: [], nuevos_desbloqueos: [] }
const pagina = (nombre, desde) => {
  const datos = jsonServidor(`ruta/ruta-${nombre}`)
  return desde === '0' ? datos : { ...datos, items: datos.items.map((i) => ({ ...i, codigo: `${i.codigo}-2` })) }
}

function catalogo(ruta = '/student/catalog/careers') {
  const app = fixtureServidor({ ruta })
  app.fetch((r) => {
    const url = new URL(r.url, 'http://x')
    if (url.pathname.endsWith('/catalogo/carreras')) return { body: pagina('catalogo-carreras', url.searchParams.get('desde')) }
    if (url.pathname.endsWith('/catalogo/instituciones')) return { body: jsonServidor('ruta/ruta-catalogo-instituciones') }
    if (url.pathname.endsWith('/catalogo/carreras/psychology')) return { body: jsonServidor('ruta/ruta-catalogo-carrera-psychology') }
    if (url.pathname.endsWith('/catalogo/ocupaciones/psychologist'))
      return { body: jsonServidor('ruta/ruta-catalogo-ocupacion-psychologist') }
    if (url.pathname.endsWith('/catalogo/instituciones/t-uni')) return { body: jsonServidor('ruta/ruta-catalogo-institucion-t-uni') }
    if (url.pathname.endsWith('/catalogo/carreras/no-existe'))
      return { status: 404, body: { detail: { mensaje: 'Carrera no encontrada en el catálogo' } } }
    if (url.pathname.endsWith('/familias')) return { body: jsonServidor('ruta/ruta-catalogo-familias') }
    if (url.pathname.endsWith('/ubicaciones')) return { body: jsonServidor('ruta/ruta-catalogo-ubicaciones') }
    if (url.pathname.endsWith('/inesperada')) return { body: { codigo: 'nursing', revisitando: true } }
    if (url.pathname.endsWith('/coleccion')) return { body: jsonServidor('ruta/ruta-coleccion') }
    if (url.pathname.includes('/acciones/')) return { body: accion }
    return { body: [] }
  })
  const almacen = cargarAlmacen(app)
  almacen.publicar({ consultasHabilitadas: true })
  const contexto = app.load('src/context/occupationExplorationContext.ts')
  contexto.useOccupationExplorationContext = () => ({
    profiles: [],
    careerInterestIds: [],
    institutionInterestIds: [],
    decisionSheets: [],
  })
  return { app, almacen }
}

test('los adaptadores del catálogo solo importan tipos y arman rangos, gestión y letras', () => {
  const fuente = readFileSync('src/lib/servidor/adaptadoresCatalogo.ts', 'utf8')
  assert.ok([...fuente.matchAll(/^import\s+(.+)$/gm)].every((m) => m[1].startsWith('type ')))
  const codigo = ts.transpileModule(fuente, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 },
  }).outputText
  return import(`data:text/javascript;base64,${Buffer.from(codigo).toString('base64')}`).then((a) => {
    const { ingreso } = jsonServidor('ruta/ruta-catalogo-carrera-psychology')
    assert.match(a.rangoSoles(ingreso.nacional.jovenes), /^de S\/ 1[.,\s]?240 a S\/ 5[.,\s]?359$/)
    assert.equal(a.lineaInstitucion({ tipo: 'INSTITUTO', gestion: null, ubicacion: { nombre: 'Arequipa' } }), 'Instituto · Arequipa')
    assert.equal(a.alternarLetra('S', 'I'), 'SI')
    assert.equal(a.alternarLetra('SIA', 'E'), 'SIA')
    assert.equal(a.alternarLetra('SIA', 'I'), 'SA')
  })
})

test('la pestaña de carreras pide su lista al mostrarse, filtra por familia y acumula con «Mostrar más»', async () => {
  const { app } = catalogo()
  const { CatalogoServidor } = app.load('src/features/discovery/components/CatalogoServidor.tsx')
  const vista = app.mount(CatalogoServidor, { section: 'careers', query: '', obtenido: () => false })
  vista.render()
  await esperar()
  let arbol = vista.render()
  const tarjetas = () => elementos(arbol, (e) => e.type?.name === 'TarjetaCatalogo')
  assert.equal(tarjetas().length, 4)
  assert.equal(tarjetas()[0].props.item.nombre, jsonServidor('ruta/ruta-catalogo-carreras').items[0].nombre)
  const mas = elementos(arbol, (e) => e.type === 'button' && texto(e) === 'Mostrar más')[0]
  mas.props.onClick()
  await esperar()
  arbol = vista.render()
  assert.equal(tarjetas().length, 8)
  const filtros = elementos(arbol, (e) => e.type?.name === 'FiltrosCatalogo')[0]
  const { FiltrosCatalogo } = app.load('src/features/discovery/components/FiltrosCatalogo.tsx')
  const select = elementos(FiltrosCatalogo(filtros.props), (e) => e.type === 'select')[0]
  assert.deepEqual([select.props['aria-label'], select.props.disabled], ['Familia', false])
  select.props.onChange({ target: { value: 'family-nursing' } })
  vista.render()
  await esperar()
  const listas = app.requests.filter((r) => r.url.includes('/catalogo/carreras?')).map((r) => r.url)
  assert.deepEqual(listas.map((u) => new URL(u, 'http://x').search), [
    '?limite=20&desde=0',
    '?limite=20&desde=4',
    '?familia=family-nursing&limite=20&desde=0',
  ])
  // Las opciones de filtro se piden una sola vez; la colección no se pide en la pestaña de carreras.
  assert.equal(app.requests.filter((r) => r.url.endsWith('/familias')).length, 1)
})

test('«Mis favoritos» pide la misma lista con el filtro, y el corazón espera al servidor', async () => {
  const { app } = catalogo('/student/catalog/institutions')
  const { CatalogoServidor } = app.load('src/features/discovery/components/CatalogoServidor.tsx')
  const vista = app.mount(CatalogoServidor, { section: 'institutions', query: '', obtenido: () => false })
  vista.render()
  await esperar()
  let arbol = vista.render()
  const tarjetas = () => elementos(arbol, (e) => e.type?.name === 'TarjetaCatalogo')
  const { TarjetaCatalogo } = app.load('src/features/discovery/components/TarjetaCatalogo.tsx')
  assert.match(texto(TarjetaCatalogo(tarjetas()[0].props)), /(Universidad|Instituto) · (Pública|Privada) · /)
  elementos(arbol, (e) => e.type?.name === 'FiltrosCatalogo')[0].props.onFavoritos()
  vista.render()
  await esperar()
  assert.ok(app.requests.some((r) => /\/catalogo\/instituciones\?favoritos=true&limite=20&desde=0$/.test(r.url)))
  arbol = vista.render()
  tarjetas()[0].props.onFavorito()
  arbol = vista.render()
  assert.equal(tarjetas().filter((t) => t.props.pendiente).length, 1)
  await esperar()
  const marca = app.requests.find((r) => r.url.endsWith('/acciones/marcar-favorito'))
  assert.equal(marca.body.tipo, 'INSTITUCION')
})

test('los detalles del servidor muestran sus datos y registran la vista una sola vez', async () => {
  const { app } = catalogo()
  const { DetalleCarreraServidor } = app.load('src/features/discovery/components/DetalleCarreraServidor.tsx')
  const carrera = app.mount(DetalleCarreraServidor, { codigo: 'psychology' })
  carrera.render()
  await esperar()
  let arbol = carrera.render()
  carrera.render()
  await esperar()
  const marcado = texto(arbol)
  assert.match(marcado, /Psicología/)
  const ingreso = elementos(arbol, (e) => e.type?.name === 'IngresoCarrera')[0]
  const { IngresoCarrera } = app.load('src/features/discovery/components/IngresoCarrera.tsx')
  assert.match(texto(IngresoCarrera(ingreso.props)), /JóvenesS\/ 2[.,\s]?824/)
  assert.match(texto(IngresoCarrera(ingreso.props)), /Ponte en Carrera \(MTPE\)/)
  assert.doesNotMatch(marcado, /Explorando familias|Datos de demostración/)
  const vistas = app.requests.filter((r) => r.url.endsWith('/acciones/ver-carrera'))
  assert.deepEqual(copia(vistas.map((r) => r.body)), [{ cuenta: 'est-ana', carrera: 'mtpe-369' }])
  const { DetalleOcupacionServidor } = app.load('src/features/discovery/components/DetalleOcupacionServidor.tsx')
  const ocupacion = app.mount(DetalleOcupacionServidor, { codigo: 'psychologist' })
  ocupacion.render()
  await esperar()
  arbol = ocupacion.render()
  assert.match(texto(arbol), /Psicólogos Clínicos y de Consejería/)
  assert.match(texto(arbol), /Psicología/)
  const { DetalleInstitucionServidor } = app.load('src/features/discovery/components/DetalleInstitucionServidor.tsx')
  const institucion = app.mount(DetalleInstitucionServidor, { codigo: 't-uni' })
  institucion.render()
  await esperar()
  arbol = institucion.render()
  assert.match(texto(arbol), /Universidad · Pública · Lima/)
  assert.equal(elementos(arbol, (e) => e.type === 'a' && e.props.href === 'https://www.unfv.edu.pe/').length, 1)
  assert.ok(app.requests.some((r) => r.url.endsWith('/acciones/ver-institucion')))
})

test('un código que no existe muestra la página perdida del atlas sin registrar vista', async () => {
  const { app } = catalogo()
  const { DetalleCarreraServidor } = app.load('src/features/discovery/components/DetalleCarreraServidor.tsx')
  const vista = app.mount(DetalleCarreraServidor, { codigo: 'no-existe' })
  vista.render()
  await esperar()
  assert.equal(elementos(vista.render(), (e) => e.type?.name === 'EsperaDetalle')[0].props.noExiste, true)
  assert.equal(app.requests.filter((r) => r.url.includes('/acciones/ver-')).length, 0)
})

test('el lugar inesperado lo elige el servidor y lleva a su detalle', async () => {
  const { app } = catalogo()
  const { UnexpectedPlace } = app.load('src/features/discovery/components/UnexpectedPlace.tsx')
  const vista = app.mount(UnexpectedPlace, { kind: 'career', currentId: 'psychology' })
  let arbol = vista.render()
  assert.doesNotMatch(texto(arbol), /están en tus favoritos/)
  const boton = elementos(arbol, (e) => e.type === 'button')[0]
  assert.equal(boton.props.disabled, false)
  boton.props.onClick()
  arbol = vista.render()
  assert.equal(elementos(arbol, (e) => e.type === 'button')[0].props['aria-busy'], true)
  await esperar()
  assert.ok(app.requests.some((r) => r.url.endsWith('/catalogo/carreras/inesperada?excluir=psychology')))
  assert.deepEqual(copia(app.navigations), ['/student/catalog/careers/nursing'])
})
