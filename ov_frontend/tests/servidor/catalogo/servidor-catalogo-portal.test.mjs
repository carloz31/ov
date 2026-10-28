import assert from 'node:assert/strict'
import test from 'node:test'
import { cargarAlmacen, elementos, esperar, fixtureServidor, jsonServidor } from '../../soporte/servidor-ayudas.mjs'

// Ajuste catalogo-apoderado: el apoderado y la orientadora ven el catálogo del estudiante en modo lectura. Se pide
// con su propia cuenta, sin favoritos, planes, colección, resultado, lugar inesperado ni vistas registradas, y sus
// enlaces van bajo su portal.
const texto = (n) =>
  Array.isArray(n)
    ? n.map(texto).join('')
    : typeof n === 'string' || typeof n === 'number'
      ? String(n)
      : n?.props
        ? texto(n.props.children)
        : ''
const ROLES = [
  { cuenta: 'apo-rosa', base: '/parent/explorar', coletilla: /La misma información que ve su hijo o hija\./ },
  { cuenta: 'ori-carmen', base: '/counselor/explorar', coletilla: /La misma información que ven sus estudiantes\./ },
]
const PROHIBIDAS = /\/favoritos|\/planes|\/coleccion|\/resultado|\/inesperada|\/acciones\//

function catalogo(cuenta, ruta) {
  const app = fixtureServidor({ cuenta, ruta })
  app.fetch((r) => {
    const url = new URL(r.url, 'http://x')
    if (url.pathname.endsWith('/catalogo/carreras')) return { body: jsonServidor('ruta/ruta-catalogo-carreras') }
    if (url.pathname.endsWith('/catalogo/ocupaciones')) return { body: jsonServidor('ruta/ruta-catalogo-ocupaciones-riasec') }
    if (url.pathname.endsWith('/catalogo/carreras/psychology')) return { body: jsonServidor('ruta/ruta-catalogo-carrera-psychology') }
    if (url.pathname.endsWith('/catalogo/ocupaciones/psychologist'))
      return { body: jsonServidor('ruta/ruta-catalogo-ocupacion-psychologist') }
    if (url.pathname.endsWith('/catalogo/instituciones/t-uni')) return { body: jsonServidor('ruta/ruta-catalogo-institucion-t-uni') }
    if (url.pathname.endsWith('/familias')) return { body: jsonServidor('ruta/ruta-catalogo-familias') }
    if (url.pathname.endsWith('/ubicaciones')) return { body: jsonServidor('ruta/ruta-catalogo-ubicaciones') }
    return { body: [] }
  })
  const almacen = cargarAlmacen(app)
  almacen.publicar({ consultasHabilitadas: true })
  // El arnés no tiene router: el contexto del outlet del estudiante se simula, como en las demás pruebas del catálogo.
  app.load('src/context/occupationExplorationContext.ts').useOccupationExplorationContext = () => ({ profiles: [] })
  return app
}

const sinPedidosDelEstudiante = (app, cuenta) => {
  assert.deepEqual(
    app.requests.filter((r) => PROHIBIDAS.test(r.url)).map((r) => r.url),
    [],
  )
  assert.ok(app.requests.length > 0)
  assert.ok(app.requests.every((r) => r.url.includes(`/cuentas/${cuenta}/catalogo/`)))
}

for (const { cuenta, base, coletilla } of ROLES) {
  test(`${cuenta}: los listados van en modo lectura, con la coletilla del rol y enlaces bajo su portal`, async () => {
    const app = catalogo(cuenta, `${base}/careers`)
    const { CatalogoServidor } = app.load('src/features/discovery/components/CatalogoServidor.tsx')
    const { TarjetaCatalogo } = app.load('src/features/discovery/components/TarjetaCatalogo.tsx')
    const { FiltrosCatalogo } = app.load('src/features/discovery/components/FiltrosCatalogo.tsx')
    const carreras = app.mount(CatalogoServidor, {
      section: 'careers',
      obtenido: () => true,
      iconosRevelados: null,
      variante: 'portal',
    })
    carreras.render()
    await esperar()
    let arbol = carreras.render()
    const marcado = texto(arbol)
    assert.match(marcado, /Explorar opciones/)
    assert.match(marcado, coletilla)
    assert.doesNotMatch(marcado, /Mis favoritos|Atlas del mundo exterior/)
    assert.equal(elementos(arbol, (e) => e.type?.name === 'UnexpectedPlace').length, 0)
    const filtros = elementos(arbol, (e) => e.type?.name === 'FiltrosCatalogo')[0]
    assert.equal(filtros.props.soloLetras, true)
    const panel = texto(elementos(FiltrosCatalogo(filtros.props), (e) => e.type?.name === 'PanelFiltros')[0].props.filas.map((f) => f.controles))
    assert.doesNotMatch(panel, /Afines a mi resultado/)
    assert.match(panel, /Filtre por el tipo de interés de la carrera/)
    const tarjeta = elementos(arbol, (e) => e.type?.name === 'TarjetaCatalogo')[0]
    assert.equal(tarjeta.props.conFavorito, false)
    const html = TarjetaCatalogo(tarjeta.props)
    assert.equal(elementos(html, (e) => e.type?.name === 'FavoriteButton').length, 0)
    const enlaces = elementos(html, (e) => typeof e.props?.to === 'string').map((e) => e.props.to)
    assert.ok(enlaces.length >= 2 && enlaces.every((to) => to.startsWith(`${base}/careers`)), enlaces.join())
    carreras.unmount()

    const profesiones = app.mount(CatalogoServidor, {
      section: 'professions',
      obtenido: () => true,
      iconosRevelados: null,
      variante: 'portal',
    })
    profesiones.render()
    await esperar()
    arbol = profesiones.render()
    assert.doesNotMatch(texto(arbol), /Tu exploración|íconos revelados/)
    for (const t of elementos(arbol, (e) => e.type?.name === 'TarjetaCatalogo')) {
      const icono = elementos(TarjetaCatalogo(t.props), (e) => e.type?.name === 'IconoProfesion')[0]
      assert.equal(icono.props.revelado, true)
    }
    sinPedidosDelEstudiante(app, cuenta)
  })

  test(`${cuenta}: los detalles no registran vistas ni muestran favoritos, planes, entrevistas ni lugar inesperado`, async () => {
    const app = catalogo(cuenta, `${base}/careers/psychology`)
    const nombres = (arbol, ...tipos) => elementos(arbol, (e) => tipos.includes(e.type?.name))
    const { DetalleCarreraServidor } = app.load('src/features/discovery/components/DetalleCarreraServidor.tsx')
    const carrera = app.mount(DetalleCarreraServidor, { codigo: 'psychology', variante: 'portal' })
    carrera.render()
    await esperar()
    let arbol = carrera.render()
    carrera.render()
    await esperar()
    assert.match(texto(arbol), /Psicología/)
    assert.equal(nombres(arbol, 'IngresoCarrera', 'DondeEstudiarla', 'CarrerasParecidas', 'FuentesCatalogo').length, 4)
    assert.equal(nombres(arbol, 'FavoriteButton', 'BloquePlanCarrera', 'UnexpectedPlace').length, 0)
    assert.equal(nombres(arbol, 'DiscoveryStage')[0].props.variante, 'portal')
    const profesiones = elementos(arbol, (e) => typeof e.props?.to === 'string' && e.props.to.includes('/professions/'))
    assert.ok(profesiones.length > 0 && profesiones.every((e) => e.props.to.startsWith(`${base}/professions/`)))
    carrera.unmount()

    const { DetalleOcupacionServidor } = app.load('src/features/discovery/components/DetalleOcupacionServidor.tsx')
    const ocupacion = app.mount(DetalleOcupacionServidor, { codigo: 'psychologist', variante: 'portal' })
    ocupacion.render()
    await esperar()
    arbol = ocupacion.render()
    assert.match(texto(arbol), /Psicólogos Clínicos y de Consejería/)
    assert.equal(nombres(arbol, 'IconoProfesion')[0].props.revelado, true)
    assert.doesNotMatch(texto(arbol), /Ícono revelado/)
    assert.equal(nombres(arbol, 'FavoriteButton', 'EntrevistasOcupacion', 'UnexpectedPlace').length, 0)
    assert.equal(nombres(arbol, 'PerfilIntereses')[0].props.resultado, null)
    ocupacion.unmount()

    const { DetalleInstitucionServidor } = app.load('src/features/discovery/components/DetalleInstitucionServidor.tsx')
    const institucion = app.mount(DetalleInstitucionServidor, { codigo: 't-uni', variante: 'portal' })
    institucion.render()
    await esperar()
    arbol = institucion.render()
    assert.equal(elementos(arbol, (e) => e.type === 'a' && e.props.href === 'https://www.unfv.edu.pe/').length, 2)
    assert.equal(nombres(arbol, 'FavoriteButton').length, 0)
    assert.doesNotMatch(texto(arbol), /Usarla en un presupuesto|presupuesto de tu tarjeta/)
    assert.match(texto(arbol), /Revíselos en su página oficial\./)
    sinPedidosDelEstudiante(app, cuenta)
  })
}
