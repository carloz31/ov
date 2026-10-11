import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Routes, Route } from 'react-router'
import { copia, elementos, fixtureServidor, jsonServidor } from '../../soporte/servidor-ayudas.mjs'
import { iniciarMara } from '../../soporte/servidor-mara-ayudas.mjs'

const codigos = (dimensiones) => Array.from(dimensiones, (d) => d.code)
function funciones(app = fixtureServidor()) {
  return {
    ...app.load('src/features/discovery/lib/resultPage.ts'),
    ...app.load('src/lib/servidor/adaptadores.ts'),
  }
}
async function preparar(resultado = jsonServidor('resultado-riasec'), pagina = 'intereses', ruta) {
  const f = await iniciarMara({ resultado, ruta })
  await f.app.load('src/store/servidor/resultado.ts').cargarResultadoRiasec()
  f.app.load('src/store/discoveryStore.ts').revelarPaginaApi('est-ana', resultado.calculado_en, pagina)
  const { useResultPage } = f.app.load('src/features/discovery/hooks/useResultPage.ts')
  return {
    ...f,
    hook: useResultPage,
    model: function useModelo() {
      return useResultPage(pagina)
    },
  }
}
const html = (Component, props) =>
  renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(Component, props)))

test('resultado completo adapta todas las descripciones remotas y respeta el orden del código', () => {
  const r = copia(jsonServidor('resultado-riasec'))
  // DATO DE PRUEBA: texto remoto diferente del catálogo local.
  r.dimensiones[0].descripcion = 'Descripción propia del servidor.'
  const { resultadoHelenaCompleto, resumirResultado } = funciones()
  const resumen = resumirResultado('COINCIDENCIAS', resultadoHelenaCompleto(r, 'COINCIDENCIAS'))
  assert.equal(resumen.dimensiones.length, 6)
  assert.equal(resumen.dimensiones[0].description, r.dimensiones[0].descripcion)
  assert.deepEqual(codigos(resumen.protagonistas), Array.from(r.codigo_interes.codigo))
  assert.equal(resumen.secciones.ocupaciones, true)
  assert.equal(resumen.secciones.carreras, true)
  assert.equal(resumen.secciones.siguientesPasos, false)
  assert.deepEqual(
    Array.from(resumen.ordenadas, (d) => d.score),
    [100, 75, 50, 0, 0, 0],
  )
})

test('tipo DESTACADAS admite una dimensión o dos empatadas y el servidor decide cuáles', () => {
  const { resultadoHelenaCompleto, resumirResultado } = funciones()
  // DATO DE PRUEBA: TEST-INT real futuro con porcentajes y descripciones del contrato.
  const dimensiones = [
    {
      codigo: 'INT-LIN',
      nombre: 'Lingüística',
      descripcion: 'Texto remoto lingüístico.',
      puntaje: 15,
      puntaje_maximo: 20,
      porcentaje: 75,
    },
    {
      codigo: 'INT-INTER',
      nombre: 'Interpersonal',
      descripcion: 'Texto remoto interpersonal.',
      puntaje: 15,
      puntaje_maximo: 20,
      porcentaje: 75,
    },
  ]
  for (const cantidad of [1, 2]) {
    const r = {
      instrumento: 'TEST-INT',
      aplicacion: 'APL-INT',
      calculado_en: '2026-10-09T00:00:00',
      perfil_plano: false,
      dimensiones,
      dimensiones_destacadas: dimensiones.slice(0, cantidad),
    }
    const resumen = resumirResultado('DESTACADAS', resultadoHelenaCompleto(r, 'DESTACADAS'))
    assert.equal(resumen.protagonistas.length, cantidad)
    assert.equal(resumen.protagonistas[0].description, dimensiones[0].descripcion)
    assert.equal(resumen.secciones.ocupaciones, false)
    assert.equal(resumen.secciones.carreras, false)
    assert.equal(resumen.secciones.siguientesPasos, true)
  }
})

test('destacadas locales conserva todos los máximos y orden de empates sin mutar', () => {
  const { dimensionesDestacadas, ordenarDimensiones } = funciones()
  // DATO DE PRUEBA: tres dimensiones mínimas para comprobar orden estable.
  const dims = [
    { code: 'a', score: 40 },
    { code: 'b', score: 75 },
    { code: 'c', score: 75 },
  ]
  assert.deepEqual(codigos(dimensionesDestacadas(dims)), ['b', 'c'])
  assert.deepEqual(codigos(ordenarDimensiones(dims)), ['b', 'c', 'a'])
  assert.deepEqual(codigos(dims), ['a', 'b', 'c'])
  assert.deepEqual(codigos(dimensionesDestacadas([])), [])
})

test('perfil plano no resalta dimensiones ni permite ocupaciones o carreras', async () => {
  const r = copia(jsonServidor('resultado-riasec'))
  // DATO DE PRUEBA: un perfil plano aunque lleguen sugerencias; deben omitirse.
  r.perfil_plano = true
  const f = await preparar(r)
  const m = f.model()
  assert.equal(m.resumen.perfilPlano, true)
  assert.equal(m.resumen.protagonistas.length, 0)
  assert.equal(m.ocupaciones.length, 0)
  assert.equal(m.carreras.length, 0)
  assert.equal(m.mostrarOcupaciones, false)
  assert.equal(m.mostrarCarreras, false)
  const { DimensionProfile } = f.app.load('src/features/discovery/components/DimensionProfile.tsx')
  const marcado = html(DimensionProfile, {
    resumen: m.resumen,
    guia: false,
    abrirGuia() {},
    expandidas: [],
    alternar() {},
  })
  assert.doesNotMatch(marcado, /sx-d-result-highlight/)
})

test('carreras se ordena por cantidad de vías y mantiene orden remoto en empate', () => {
  const { ordenarCarreras } = funciones()
  const r = jsonServidor('resultado-riasec')
  const ordenadas = ordenarCarreras(r.carreras_recomendadas)
  assert.deepEqual(
    Array.from(ordenadas, (c) => c.codigo),
    ['civil-engineering', 'environmental-engineering', 'veterinary-medicine'],
  )
  const empatadas = [r.carreras_recomendadas[1], r.carreras_recomendadas[0]]
  assert.deepEqual(
    Array.from(ordenarCarreras(empatadas), (c) => c.codigo),
    ['environmental-engineering', 'civil-engineering'],
  )
})

test('filtros de ajuste usan las etiquetas remotas y Todas conserva el conjunto', async () => {
  const f = await preparar()
  const { filtrarPorAjuste } = funciones(f.app)
  const ocupaciones = f.model().ocupaciones
  assert.equal(ocupaciones.length, 10)
  assert.equal(filtrarPorAjuste(ocupaciones, 'Todas').length, 10)
  for (const ajuste of ['Mejor ajuste', 'Gran ajuste', 'Buen ajuste']) {
    const filtradas = filtrarPorAjuste(ocupaciones, ajuste)
    assert.ok(filtradas.length > 0)
    assert.ok(filtradas.every((o) => o.ajuste === ajuste))
  }
})

test('hook filtra carreras por ocupación, guarda favoritos y respeta los tres planes locales', async () => {
  const f = await preparar()
  const montado = f.app.mount(() => f.hook('intereses'))
  let m = montado.render()
  const ocupacion = m.ocupaciones[0]
  m.setSeleccion(ocupacion.clave)
  m = montado.render()
  assert.ok(m.carreras.every((c) => c.via.some((o) => o.codigo_onet === ocupacion.clave)))
  m.guardarOcupacion(ocupacion.codigo)
  assert.equal(montado.render().ocupaciones[0].favorita, true)
  m.setSeleccion(null)
  m = montado.render()
  m.guardarCarrera(m.carreras[0].codigo)
  assert.equal(montado.render().carreras[0].favorita, true)
  for (let i = 0; i < 3; i++) {
    m = montado.render()
    assert.equal(m.siguientePlan, ['A', 'B', 'C'][i])
    assert.equal(m.crearPlan(m.carreras[i].nombre, m.carreras[i].codigo), true)
    assert.equal(montado.render().carreras[i].plan, ['A', 'B', 'C'][i])
  }
  m = montado.render()
  assert.equal(m.siguientePlan, undefined)
  assert.equal(m.crearPlan('Otro', 'otro'), false)
  assert.equal(f.app.requests.filter((r) => r.method !== 'GET').length, 0)
  montado.unmount()
})

test('hook alterna guía y descripciones y conserva filtros de ajuste', async () => {
  const f = await preparar()
  const montado = f.app.mount(() => f.hook('intereses'))
  let m = montado.render()
  m.setGuia(true)
  m.alternarDimension('R')
  m.setAjuste('Gran ajuste')
  m = montado.render()
  assert.equal(m.guia, true)
  assert.deepEqual(Array.from(m.expandidas), ['R'])
  assert.ok(m.ocupaciones.every((o) => o.ajuste === 'Gran ajuste'))
  m.alternarDimension('R')
  m.setGuia(false)
  assert.equal(montado.render().expandidas.length, 0)
  assert.equal(montado.render().guia, false)
  montado.unmount()
})

test('páginas inexistentes, selladas o sin revelar no tienen modelo', async () => {
  const f = await preparar()
  for (const pagina of ['otra', 'habilidades', 'inteligencias', undefined]) assert.equal(f.hook(pagina), null)
  f.app
    .load('src/store/discoveryStore.ts')
    .revelarPaginaApi('est-luis', jsonServidor('resultado-riasec').calculado_en, 'inteligencias')
  assert.equal(f.hook('inteligencias'), null)
})

test('inteligencias demuestra siete dimensiones y el empate en ambos modos, y acepta resultado real', async () => {
  const remoto = await preparar(jsonServidor('resultado-riasec'), 'inteligencias')
  const local = fixtureServidor({ api: false })
  local
    .load('src/store/discoveryStore.ts')
    .updateDiscovery((s) => ({ ...s, revealedPages: ['inteligencias'] }))
  for (const app of [remoto.app, local]) {
    const { useResultPage } = app.load('src/features/discovery/hooks/useResultPage.ts')
    const m = useResultPage('inteligencias')
    assert.equal(m.page.demo, true)
    assert.equal(m.resumen.dimensiones.length, 7)
    assert.deepEqual(codigos(m.resumen.protagonistas), ['INT-LIN', 'INT-INTER'])
    assert.deepEqual(
      Array.from(m.resumen.protagonistas, (d) => d.score),
      [75, 75],
    )
    assert.equal(m.mostrarOcupaciones, false)
    assert.equal(m.mostrarCarreras, false)
    // DATO DE PRUEBA: resultado futuro real que usa el mismo hook y plantilla.
    const dimensiones = m.resumen.dimensiones.map((d) => ({
      codigo: d.code,
      nombre: d.name,
      descripcion: `Remota: ${d.name}`,
      porcentaje: d.score,
      puntaje: d.score,
      puntaje_maximo: 100,
    }))
    const r = {
      instrumento: 'TEST-INT',
      aplicacion: 'APL-INT',
      calculado_en: '2026-10-09T00:00:00',
      perfil_plano: false,
      dimensiones,
      dimensiones_destacadas: [dimensiones[2]],
    }
    const real = useResultPage('inteligencias', r)
    assert.equal(real.page.demo, false)
    assert.deepEqual(codigos(real.resumen.protagonistas), ['INT-ESP'])
    assert.equal(real.resumen.protagonistas[0].description, 'Remota: Espacial')
  }
})

test('intereses local conserva afinidades existentes y no usa datos del servidor', () => {
  const app = fixtureServidor({ api: false })
  const journey = app.load('src/store/journeyStore.ts')
  journey.updateJourney((s) => ({
    ...s,
    progress: {
      ...s.progress,
      'act-tip-01': { actividadId: 'act-tip-01', estado: 'completada', nodoActual: '$fin' },
    },
  }))
  app.load('src/store/discoveryStore.ts').updateDiscovery((s) => ({ ...s, revealedPages: ['intereses'] }))
  const { useResultPage } = app.load('src/features/discovery/hooks/useResultPage.ts')
  const m = useResultPage('intereses')
  assert.equal(m.page.demo, true)
  assert.deepEqual(codigos(m.resumen.protagonistas), ['S', 'I', 'A'])
  const { isAffine } = app.load('src/features/discovery/lib/catalogSelectors.ts')
  assert.ok(m.ocupaciones.length > 0)
  assert.ok(m.ocupaciones.every((o) => o.ajuste === isAffine(o.codigo, ['intereses'])))
  assert.ok(m.carreras.length > 0)
  assert.equal(app.requests.length, 0)
})

test('ocupaciones desconocidas no inventan descripción, letras, detalle ni identificador', async () => {
  const r = copia(jsonServidor('resultado-riasec'))
  // DATO DE PRUEBA: una ocupación de O*NET sin correspondencia en el catálogo.
  r.coincidencias[0] = { ...r.coincidencias[0], codigo: null, titulo: 'Ocupación remota sin catálogo' }
  const f = await preparar(r)
  const o = f.model().ocupaciones[0]
  assert.equal(o.titulo, r.coincidencias[0].titulo)
  assert.equal(o.codigo, null)
  assert.equal(o.descripcion, undefined)
  assert.equal(o.letras, undefined)
  assert.equal(o.href, undefined)
})

test('perfil y guía exponen aria-expanded, texto remoto y ejemplos por código', async () => {
  const f = await preparar()
  const { resumen } = f.model()
  const { DimensionProfile } = f.app.load('src/features/discovery/components/DimensionProfile.tsx')
  const { DimensionGuide } = f.app.load('src/features/discovery/components/DimensionGuide.tsx')
  const marcado = html(DimensionProfile, {
    resumen,
    guia: true,
    abrirGuia() {},
    expandidas: ['R'],
    alternar() {},
  })
  assert.match(marcado, /aria-expanded="true"/)
  assert.ok(marcado.includes(resumen.dimensiones.find((d) => d.code === 'R').description))
  const guia = html(DimensionGuide, { resumen, cerrar() {} })
  assert.match(guia, /aria-label="Cerrar guía"/)
  assert.equal((guia.match(/<article/g) ?? []).length, 6)
  assert.match(guia, /Por ejemplo: reparar o armar objetos/)
})

test('carreras muestran duración literal y ocultan crear plan al alcanzar el límite', async () => {
  const f = await preparar()
  const { RecommendedCareers } = f.app.load('src/features/discovery/components/RecommendedCareers.tsx')
  const m = f.model()
  const marcado = html(RecommendedCareers, {
    carreras: m.carreras,
    verTodas() {},
    guardar() {},
    crearPlan() {},
  })
  assert.doesNotMatch(marcado, /Hacer mi plan/)
  assert.match(marcado, /5 años aproximadamente/)
  assert.match(marcado, /Conduce a 4/)
  assert.match(marcado, /Ver carrera/)
})

test('siguientes pasos conserva la pregunta como prompt y enlaza familia y página I', () => {
  const app = fixtureServidor({ api: false })
  const { ResultNextSteps } = app.load('src/features/discovery/components/ResultNextSteps.tsx')
  const tree = ResultNextSteps()
  const links = elementos(tree, (e) => typeof e.props.to === 'string')
  assert.equal(links[0].props.to, '/student/conversations')
  const url = new URL(links[1].props.to, 'https://prueba.local')
  assert.equal(url.pathname, '/student/journal')
  assert.equal(
    url.searchParams.get('prompt'),
    '¿En qué momento reciente usaste tu inteligencia más fuerte sin darte cuenta?',
  )
  assert.equal(links[2].props.to, '/student/profile/helena/intereses')
})

test('vista de ruta compone el resultado por parámetro y el libro enlaza al detalle y la guía', async () => {
  const f = await preparar()
  const { HelenaResultView } = f.app.load('src/pages/student/HelenaResultView.tsx')
  const vista = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      { initialEntries: ['/student/profile/helena/intereses'] },
      React.createElement(
        Routes,
        null,
        React.createElement(Route, {
          path: '/student/profile/helena/:pagina',
          element: React.createElement(HelenaResultView),
        }),
      ),
    ),
  )
  assert.match(vista, /<h1>Lo que te atrae hacer<\/h1>/)
  assert.match(vista, /Tu código de interés/)
  assert.match(vista, /Trabajos que se parecen/)
  assert.doesNotMatch(vista, /Qué hacer con lo que descubriste/)
  const { useHelenaPages } = f.app.load('src/features/discovery/hooks/useHelenaPages.ts')
  const { HelenaBookPages } = f.app.load('src/features/discovery/components/HelenaBookPages.tsx')
  const libro = html(HelenaBookPages, { model: useHelenaPages() })
  assert.match(libro, /href="\/student\/profile\/helena\/intereses"[^>]*>Ver resultado completo/)
  assert.match(libro, /href="\/student\/profile\/helena\/intereses\?guia=1"[^>]*>¿Qué significa cada letra\?/)
  assert.doesNotMatch(libro, /Carreras que conducen a ellas|afines=1/)
})

test('sin resultado API no sustituye las sugerencias por el ejemplo local', async () => {
  const f = await iniciarMara()
  const { useResultPage } = f.app.load('src/features/discovery/hooks/useResultPage.ts')
  f.app.load('src/store/discoveryStore.ts').updateDiscovery((s) => ({ ...s, revealedPages: ['intereses'] }))
  assert.equal(useResultPage('intereses'), null)
})

test('pestañas de ajuste permiten flechas, Home y End con foco en la selección', () => {
  const app = fixtureServidor()
  const { AffineOccupations } = app.load('src/features/discovery/components/AffineOccupations.tsx')
  let seleccionado = 'Todas',
    enfocado = -1
  const focos = Array.from({ length: 4 }, (_, i) => ({
    focus: () => {
      enfocado = i
    },
  }))
  for (const [key, esperado, foco] of [
    ['ArrowRight', 'Mejor ajuste', 1],
    ['End', 'Buen ajuste', 3],
    ['ArrowLeft', 'Gran ajuste', 2],
    ['Home', 'Todas', 0],
  ]) {
    const tree = AffineOccupations({
      ocupaciones: [],
      ajuste: seleccionado,
      filtrar: (valor) => {
        seleccionado = valor
      },
      elegir() {},
      guardar() {},
    })
    const tabs = elementos(tree, (e) => e.props.role === 'tablist')[0]
    let prevenido = false
    tabs.props.onKeyDown({
      key,
      preventDefault: () => {
        prevenido = true
      },
      currentTarget: { querySelectorAll: () => focos },
    })
    assert.equal(prevenido, true)
    assert.equal(seleccionado, esperado)
    assert.equal(enfocado, foco)
  }
})

test('el libro y todos sus detalles conservan el módulo desplazable de Helena', () => {
  const { getStudentView, isDiscoveryView } = fixtureServidor().load('src/lib/studentViews.ts')
  for (const ruta of [
    '/student/profile/helena',
    '/student/profile/helena/intereses',
    '/student/profile/helena/inteligencias',
    '/student/profile/helena/no-existe',
  ]) {
    assert.equal(getStudentView(ruta), 'profile-helena')
    assert.equal(isDiscoveryView(getStudentView(ruta)), true)
  }
  assert.equal(getStudentView('/student/exploration'), 'central')
  assert.equal(getStudentView('/student/profile'), 'profile-general')
})

test('resumen de intereses usa la plantilla exacta, negritas y orden del código', () => {
  const app = fixtureServidor()
  const { InterestCode } = app.load('src/features/discovery/components/InterestCode.tsx')
  const { fragmentosResumen } = app.load('src/features/discovery/data/dimensionExamples.ts')
  const esperados = {
    R: 'trabajas con las manos, con herramientas o al aire libre',
    I: 'investigas y buscas entender cómo funcionan las cosas',
    A: 'creas y te expresas con libertad',
    S: 'ayudas, enseñas o acompañas a otras personas',
    E: 'lideras, convences u organizas proyectos',
    C: 'ordenas información y trabajas con datos de forma precisa',
  }
  assert.deepEqual({ ...fragmentosResumen }, esperados)
  // DATO DE PRUEBA: orden S,A,I distinto de la ordenación alfabética.
  const dimensiones = ['S', 'A', 'I'].map((code) => ({
    code,
    name: code,
    description: `Descripción completa ${code}.`,
  }))
  const marcado = html(InterestCode, { dimensiones, empate: false })
  assert.ok(
    marcado.includes(
      `Te atraen sobre todo las actividades en las que <strong>${esperados.S}</strong>, seguidas de aquellas en las que <strong>${esperados.A}</strong> y de aquellas en las que <strong>${esperados.I}</strong>.`,
    ),
  )
  assert.doesNotMatch(marcado, /<li>/)
  // DATO DE PRUEBA: dimensión sin fragmento; las tres descripciones deben mantenerse.
  dimensiones[1].code = 'DESCONOCIDA'
  const alternativo = html(InterestCode, { dimensiones, empate: false })
  assert.equal((alternativo.match(/<li>/g) ?? []).length, 3)
  for (const d of dimensiones) assert.ok(alternativo.includes(d.description))
  assert.doesNotMatch(alternativo, /Te atraen sobre todo/)
})

test('duración conocida conserva el texto del catálogo en ambos modos y la desconocida se omite', () => {
  const app = fixtureServidor()
  const { carrerasResultado } = app.load('src/features/discovery/lib/resultCatalog.ts')
  const { careerCatalog } = app.load('src/data/catalog/careersAndInstitutions.ts')
  const resultado = copia(jsonServidor('resultado-riasec'))
  const remoto = carrerasResultado(resultado, true, [])
  for (const c of remoto)
    assert.equal(c.duracion, careerCatalog.find((entrada) => entrada.id === c.codigo)?.duration)
  assert.equal(remoto[0].duracion, '5 años aproximadamente')
  // DATO DE PRUEBA: código ausente del catálogo; no se inventa la duración.
  resultado.carreras_recomendadas[0].codigo = 'carrera-desconocida'
  assert.equal(carrerasResultado(resultado, true, [])[0].duracion, undefined)
  const { occupationDetails } = app.load('src/features/discovery/lib/catalogDetails.ts')
  const ocupaciones = occupationDetails.map((o) => ({ codigo: o.id, clave: o.onetCode, titulo: o.name }))
  const locales = carrerasResultado(undefined, false, ocupaciones)
  assert.ok(locales.length > 0)
  for (const c of locales)
    assert.equal(c.duracion, careerCatalog.find((entrada) => entrada.id === c.codigo)?.duration)
})

test('la tarjeta del libro conserva su resumen con descripciones completas', async () => {
  const f = await preparar()
  const { useHelenaPages } = f.app.load('src/features/discovery/hooks/useHelenaPages.ts')
  const { HelenaBookPages } = f.app.load('src/features/discovery/components/HelenaBookPages.tsx')
  const model = useHelenaPages()
  const marcado = html(HelenaBookPages, { model })
  assert.ok(marcado.includes(model.pages.find((p) => p.id === 'intereses').result.areas[0].description))
  assert.doesNotMatch(marcado, /Te atraen sobre todo las actividades/)
})

test('F4b: resumen COINCIDENCIAS conserva código y descripciones, sin puntajes, con conteos reales', () => {
  const { resumenPagina, resultadoHelenaCompleto } = funciones()
  const r = copia(jsonServidor('resultado-riasec'))
  // DATO DE PRUEBA: código CAS y cantidades distintas de las ilustraciones.
  r.codigo_interes.codigo = ['C', 'A', 'S']
  r.coincidencias = r.coincidencias.slice(0, 4)
  r.carreras_recomendadas = r.carreras_recomendadas.slice(0, 2)
  const resultado = {
    ...resultadoHelenaCompleto(r, 'COINCIDENCIAS'),
    coincidencias: r.coincidencias,
    carreras_recomendadas: r.carreras_recomendadas,
  }
  const page = { state: 'revealed', tipoResultado: 'COINCIDENCIAS' }
  const resumen = resumenPagina(page, resultado)
  assert.equal(resumen.rotulo, 'Tu código de interés · CAS')
  assert.deepEqual(
    Array.from(resumen.filas, (d) => d.codigo),
    ['C', 'A', 'S'],
  )
  assert.ok(
    resumen.filas.every(
      (d) =>
        d.marcador === 'letra' &&
        d.descripcion === r.dimensiones.find((dimension) => dimension.codigo === d.codigo).descripcion,
    ),
  )
  assert.doesNotMatch(JSON.stringify(resumen), /score|porcentaje|puntaje|%/)
  assert.deepEqual(
    Array.from(resumen.contenidos, (c) => c.texto),
    ['Tu perfil en los 6 tipos de interés', '4 ocupaciones afines', '2 carreras que conducen a ellas'],
  )
  assert.equal(resumen.cierre, 'Ninguno es mejor que otro: son pistas para explorar.')
  for (const extras of [{}, { coincidencias: [], carreras_recomendadas: [] }]) {
    const sinDatos = resumenPagina(page, { ...resultadoHelenaCompleto(r, 'COINCIDENCIAS'), ...extras })
    assert.equal(sinDatos.contenidos.length, 1)
  }
  assert.deepEqual(
    Array.from(resumenPagina(page, { ...resultado, coincidencias: [] }).contenidos, (c) => c.icono),
    ['perfil', 'carreras'],
  )
  assert.deepEqual(
    Array.from(resumenPagina(page, { ...resultado, carreras_recomendadas: [] }).contenidos, (c) => c.icono),
    ['perfil', 'ocupaciones'],
  )
  for (const state of ['sealed', 'ready'])
    assert.equal(resumenPagina({ ...page, state }, resultado).contenidos.length, 0)
})

test('F4b: perfil plano muestra el aviso exacto y solo anuncia el perfil', async () => {
  const r = copia(jsonServidor('resultado-riasec'))
  r.perfil_plano = true // DATO DE PRUEBA: caso límite, con sugerencias que se deben omitir.
  const f = await preparar(r)
  const model = f.app.load('src/features/discovery/hooks/useHelenaPages.ts').useHelenaPages()
  const page = model.pages.find((p) => p.id === 'intereses')
  assert.equal(page.resumen.rotulo, 'Tu código de interés')
  assert.equal(page.resumen.filas.length, 0)
  assert.equal(page.resumen.titulo, 'Tus respuestas no marcaron un interés por encima de otro')
  assert.equal(
    page.resumen.cierre,
    'Respondiste de forma muy parecida a todos los tipos de actividad. Revisa tus encuentros con Mara pensando en lo que de verdad disfrutas.',
  )
  assert.equal(page.resumen.contenidos.length, 1)
  const { HelenaPageCard } = f.app.load('src/features/discovery/components/HelenaPageCard.tsx')
  const marcado = html(HelenaPageCard, { page, model })
  assert.match(marcado, /href="\/student\/exploration\?punto=mara-test"/)
  assert.doesNotMatch(marcado, /ocupaciones afines|carreras que|guia=1/)
})

test('F4b: DESTACADAS comparte filas, admite una o dos y cambia rótulo y cierre', () => {
  const app = fixtureServidor({ api: false })
  app.load('src/store/discoveryStore.ts').updateDiscovery((s) => ({ ...s, revealedPages: ['inteligencias'] }))
  const page = app
    .load('src/features/discovery/hooks/useHelenaPages.ts')
    .useHelenaPages()
    .pages.find((p) => p.tipoResultado === 'DESTACADAS')
  const { resumenPagina } = funciones(app)
  const { HelenaPageSummary } = app.load('src/features/discovery/components/HelenaPageSummary.tsx')
  for (const cantidad of [1, 2]) {
    // DATO DE PRUEBA: selección explícita de una o dos dimensiones en el mismo resultado.
    const resultado = { ...page.result, destacadas: page.result.areas.slice(0, cantidad) }
    const resumen = resumenPagina(page, resultado)
    assert.equal(resumen.filas.length, cantidad)
    assert.ok(resumen.filas.every((fila) => fila.marcador === 'inteligencia'))
    assert.equal(
      resumen.rotulo,
      cantidad === 1 ? 'Tu inteligencia más desarrollada' : 'Tus inteligencias más desarrolladas',
    )
    assert.equal(
      resumen.cierre,
      cantidad === 1
        ? 'Es la que más usas hoy para aprender y resolver. Todas se pueden desarrollar.'
        : 'Destacan por igual. Ninguna es mejor que otra: describen cómo te gusta aprender y resolver.',
    )
    assert.deepEqual(
      Array.from(resumen.contenidos, (c) => c.texto),
      ['Tu perfil en las 7 inteligencias', 'Ideas para aprovecharlo con tu familia y tu diario'],
    )
    const marcado = html(HelenaPageSummary, { resumen })
    assert.doesNotMatch(marcado, /%|sx-d-trail|sx-d-seal/)
    assert.equal((marcado.match(/class="sx-d-helena-marker"/g) ?? []).length, cantidad)
  }
})

test('F4b: guia=1 abre la guía del resultado y permite cerrarla sin reabrirla', async () => {
  const f = await preparar(
    jsonServidor('resultado-riasec'),
    'intereses',
    '/student/profile/helena/intereses?guia=1',
  )
  const montado = f.app.mount(() => f.hook('intereses'))
  assert.equal(montado.render().guia, true)
  montado.render().setGuia(false)
  assert.equal(montado.render().guia, false)
  montado.unmount()
})
