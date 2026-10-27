import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test, { mock } from 'node:test'
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
    if (url.pathname.endsWith('/catalogo/ocupaciones')) return { body: jsonServidor('ruta/ruta-catalogo-ocupaciones-riasec') }
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

// Ajuste catalogo-datos-reales (F6a): los filtros esperan 400 ms antes de pedir la lista.
const esperarFiltros = () => new Promise((resolve) => setTimeout(resolve, 450))
const busquedas = (app, clase) =>
  app.requests.filter((r) => r.url.includes(`/catalogo/${clase}?`)).map((r) => new URL(r.url, 'http://x').search)

test('la pestaña de carreras pide su lista al mostrarse, filtra por familia y acumula con «Mostrar 20 más»', async () => {
  const { app } = catalogo()
  const { CatalogoServidor } = app.load('src/features/discovery/components/CatalogoServidor.tsx')
  const vista = app.mount(CatalogoServidor, { section: 'careers', obtenido: () => false, iconosRevelados: null })
  vista.render()
  await esperar()
  let arbol = vista.render()
  const tarjetas = () => elementos(arbol, (e) => e.type?.name === 'TarjetaCatalogo')
  assert.equal(tarjetas().length, 4)
  assert.equal(tarjetas()[0].props.item.nombre, jsonServidor('ruta/ruta-catalogo-carreras').items[0].nombre)
  assert.match(texto(arbol), /603 carreras universitarias, técnicas y de las Fuerzas Armadas y Policía/)
  assert.doesNotMatch(texto(arbol), /Tu exploración/)
  const pie = elementos(arbol, (e) => e.type?.name === 'PieListado')[0]
  assert.deepEqual([pie.props.mostrados, pie.props.total, pie.props.hayMas], [4, 603, true])
  const { PieListado } = app.load('src/features/discovery/components/PieListado.tsx')
  assert.match(texto(PieListado(pie.props)), /Mostrando 4 de 603.*Mostrar 20 más/)
  pie.props.onMas()
  await esperar()
  arbol = vista.render()
  assert.equal(tarjetas().length, 8)
  // La familia cambia la URL; la lista se pide después de la espera, con las páginas anteriores descartadas.
  elementos(arbol, (e) => e.type?.name === 'FiltrosCatalogo')[0].props.onCambiar({ familia: '331' })
  arbol = vista.render()
  assert.equal(tarjetas().length, 0)
  assert.equal(app.query.get('familia'), '331')
  await esperarFiltros()
  vista.render()
  await esperar()
  arbol = vista.render()
  assert.equal(tarjetas().length, 4)
  assert.deepEqual(busquedas(app, 'carreras'), ['?limite=20&desde=0', '?limite=20&desde=4', '?familia=331&limite=20&desde=0'])
  // Las opciones de filtro se piden una sola vez.
  assert.equal(app.requests.filter((r) => r.url.endsWith('/familias')).length, 1)
})

test('las letras pulsadas seguidas piden una sola lista, en el orden en que se pulsan', async () => {
  const { app } = catalogo('/student/catalog/professions')
  const { CatalogoServidor } = app.load('src/features/discovery/components/CatalogoServidor.tsx')
  const vista = app.mount(CatalogoServidor, { section: 'professions', obtenido: () => false, iconosRevelados: 1 })
  vista.render()
  await esperar()
  const arbol = vista.render()
  assert.match(texto(arbol), /Tu exploración1 de 923 íconos revelados/)
  const filtros = elementos(arbol, (e) => e.type?.name === 'FiltrosCatalogo')[0]
  for (const letra of ['R', 'I', 'C']) filtros.props.onLetra(letra)
  assert.equal(app.query.get('riasec'), 'RIC')
  vista.render()
  await esperarFiltros()
  vista.render()
  await esperar()
  assert.deepEqual(busquedas(app, 'ocupaciones'), ['?limite=20&desde=0', '?riasec=RIC&limite=20&desde=0'])
})

test('con temporizadores falsos, R, I y A a 100 ms una de otra piden una sola lista con riasec=RIA', async () => {
  // El arnés toma `setTimeout` al crearse: los temporizadores falsos se activan antes.
  mock.timers.enable({ apis: ['setTimeout'] })
  try {
    const { app } = catalogo()
    const { CatalogoServidor } = app.load('src/features/discovery/components/CatalogoServidor.tsx')
    const vista = app.mount(CatalogoServidor, { section: 'careers', obtenido: () => false, iconosRevelados: null })
    vista.render()
    await esperar()
    let arbol = vista.render()
    const filtros = () => elementos(arbol, (e) => e.type?.name === 'FiltrosCatalogo')[0].props
    for (const [n, letra] of ['R', 'I', 'A'].entries()) {
      if (n) mock.timers.tick(100)
      filtros().onLetra(letra)
      arbol = vista.render()
      // Las letras y «Código: …» cambian al instante; la grilla espera con el esqueleto y el contador busca.
      assert.equal(filtros().letras, 'RIA'.slice(0, n + 1))
      assert.match(texto(arbol), /Buscando…/)
    }
    mock.timers.tick(399)
    vista.render()
    await esperar()
    assert.deepEqual(busquedas(app, 'carreras'), ['?limite=20&desde=0'])
    mock.timers.tick(1)
    vista.render()
    await esperar()
    vista.render()
    await esperar()
    assert.deepEqual(busquedas(app, 'carreras'), ['?limite=20&desde=0', '?riasec=RIA&limite=20&desde=0'])
    assert.doesNotMatch(texto(vista.render()), /Buscando…/)
  } finally {
    mock.timers.reset()
  }
})

test('«Mis favoritos» pide la misma lista con el filtro, y el corazón espera al servidor', async () => {
  const { app } = catalogo('/student/catalog/institutions')
  const { CatalogoServidor } = app.load('src/features/discovery/components/CatalogoServidor.tsx')
  const vista = app.mount(CatalogoServidor, { section: 'institutions', obtenido: () => false, iconosRevelados: null })
  vista.render()
  await esperar()
  let arbol = vista.render()
  const tarjetas = () => elementos(arbol, (e) => e.type?.name === 'TarjetaCatalogo')
  const { TarjetaCatalogo } = app.load('src/features/discovery/components/TarjetaCatalogo.tsx')
  const primera = jsonServidor('ruta/ruta-catalogo-instituciones').items[0]
  assert.match(texto(TarjetaCatalogo(tarjetas()[0].props)), new RegExp(`${primera.ubicacion.nombre} · ${primera.distrito}`))
  assert.equal(elementos(arbol, (e) => e.type?.name === 'UnexpectedPlace').length, 0)
  elementos(arbol, (e) => e.type === 'button' && /Mis favoritos/.test(texto(e)))[0].props.onClick()
  vista.render()
  await esperarFiltros()
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

test('los filtros en la URL: afines y favoritos se excluyen, el área quita la familia y se recuerda cada pestaña', async () => {
  const fuente = readFileSync('src/features/discovery/lib/filtrosCatalogo.ts', 'utf8')
  const codigo = ts.transpileModule(fuente, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 },
  }).outputText
  const f = await import(`data:text/javascript;base64,${Buffer.from(codigo).toString('base64')}`)
  const leidos = f.leerFiltros('careers', new URLSearchParams('buscar=psi&gestion=PUBLICA&area=3&familia=313'))
  assert.deepEqual(copia(leidos), { buscar: 'psi', area: '3', familia: '313' })
  assert.equal(f.escribirFiltros('careers', { familia: '313', tipo: 'INSTITUTO' }).toString(), 'tipo=INSTITUTO&familia=313')
  assert.deepEqual(copia(f.cambiarFiltros({ favoritos: '1', riasec: 'RI' }, { afines: '1' })), { afines: '1' })
  assert.deepEqual(copia(f.cambiarFiltros({ afines: '1' }, { favoritos: '1' })), { favoritos: '1' })
  assert.deepEqual(copia(f.cambiarFiltros({ afines: '1' }, { riasec: 'S' })), { riasec: 'S' })
  assert.deepEqual(copia(f.cambiarFiltros({ area: '3', familia: '313' }, { area: '5' })), { area: '5' })
  assert.deepEqual(copia(f.cambiarFiltros({ area: '3', familia: '313' }, { tipo: '' })), { area: '3', familia: '313' })
  assert.equal(f.letrasAfines('IRA'), 'IR')
  assert.equal(f.busquedaRecordada('careers'), '')
  f.recordarBusqueda('careers', 'familia=313')
  assert.equal(f.busquedaRecordada('careers'), '?familia=313')
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
  // Ajuste catalogo-datos-reales (F6b): «Por lugar» arranca en todo el país, con jóvenes destacada.
  const tramos = elementos(IngresoCarrera(ingreso.props), (e) => e.type?.name === 'TarjetaTramo')
  assert.deepEqual(
    tramos.map((t) => [t.props.titulo, t.props.tramo.promedio, !!t.props.destacada]),
    [['Jóvenes', 2824, true], ['Adultos', 5033, false]],
  )
  assert.equal(elementos(arbol, (e) => e.type?.name === 'FuentesCatalogo')[0].props.de, 'carrera')
  assert.equal(elementos(arbol, (e) => e.type?.name === 'BloquePlanCarrera').length, 1)
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
  assert.match(texto(arbol), /Universidad Nacional Federico Villarreal/)
  assert.equal(elementos(arbol, (e) => e.type === 'a' && e.props.href === 'https://www.unfv.edu.pe/').length, 2)
  assert.equal(elementos(arbol, (e) => e.type?.name === 'CarrerasDeInstitucion').length, 1)
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

test('el bloque de plan de la carrera tiene tres estados: ya es plan, hay espacio o los tres están ocupados', () => {
  const { app } = catalogo()
  const { BloquePlanCarrera } = app.load('src/features/discovery/components/BloquePlanCarrera.tsx')
  const base = { letra: null, libres: 0, ocupados: [], armar: () => {} }
  assert.match(texto(BloquePlanCarrera({ planes: { ...base, letra: 'B' } })), /Ya es tu Plan BSigue armándolo.*Ver mi tarjeta/)
  const libre = BloquePlanCarrera({ planes: { ...base, libres: 1 } })
  assert.match(texto(libre), /Te queda 1 de 3 espacios/)
  assert.equal(elementos(libre, (e) => e.type === 'button').length, 1)
  const ocupados = [{ letra: 'A', nombre: 'Ingeniería Civil' }, { letra: 'B', nombre: 'Psicología' }, { letra: 'C', nombre: 'Derecho' }]
  const lleno = BloquePlanCarrera({ planes: { ...base, ocupados } })
  assert.match(texto(lleno), /A: Ingeniería Civil, B: Psicología, C: Derecho/)
  assert.equal(elementos(lleno, (e) => e.type === 'button').length, 0)
})

test('el perfil de intereses ordena las barras y compara con el resultado en tres frases', () => {
  const { app } = catalogo()
  const { PerfilIntereses } = app.load('src/features/discovery/components/PerfilIntereses.tsx')
  const puntajes = { R: 1, I: 76, A: 34, S: 93, E: 27, C: 42 }
  const sinResultado = PerfilIntereses({ puntajes, codigo: ['S', 'I'], resultado: null })
  assert.match(texto(sinResultado), /Social93 %Investigador76 %Convencional42 %/)
  assert.doesNotMatch(texto(sinResultado), /Comparado con tu resultado/)
  const frase = (resultado) => texto(PerfilIntereses({ puntajes, codigo: ['S', 'I'], resultado }))
  assert.match(frase(['S', 'A', 'E']), /Comparten el interés principal, Social\./)
  assert.match(frase(['I', 'R', 'A']), /Comparten Investigador, aunque no el interés principal\./)
  assert.match(frase(['R', 'E', 'C']), /tus intereses van por otro lado, aunque eso no la descarta/)
})
