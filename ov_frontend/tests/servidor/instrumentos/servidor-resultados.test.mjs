import { esConsultaDominio, respuestaDominio } from '../../soporte/servidor-ayudas.mjs'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { iniciarMara, botonEn } from '../../soporte/servidor-mara-ayudas.mjs'
import { fixtureServidor, jsonServidor, copia, elementos, esperar } from '../../soporte/servidor-ayudas.mjs'

const texto = (node) =>
  Array.isArray(node)
    ? node.map(texto).join(' ')
    : typeof node === 'string' || typeof node === 'number'
      ? String(node)
      : node?.props
        ? texto(node.props.children)
        : ''

test('el resultado conserva IRA y sus porcentajes en el orden del código, sin ordenar puntajes localmente', async () => {
  const f = await iniciarMara({ resultado: jsonServidor('resultado-riasec') }),
    a = f.app.load('src/lib/servidor/adaptadores.ts')
  const resultado = copia(jsonServidor('resultado-riasec'))
  resultado.dimensiones.reverse()
  assert.deepEqual(
    Array.from(a.areasRiasec(resultado), (d) => [d.codigo, d.porcentaje]),
    [
      ['I', 100],
      ['R', 75],
      ['A', 50],
    ],
  )
  const node = f.app.load('src/features/activities/components/nodes/ResultNode.tsx').ResultNode
  const tree = node({ activity: f.activity, instrumentId: 'TEST-RIASEC' })
  assert.match(texto(tree), /100\s*%/)
  assert.match(texto(tree), /75\s*%/)
  assert.match(texto(tree), /50\s*%/)
  assert.equal(f.app.load('src/store/journeyStore.ts').getJourneySnapshot().results.length, 0)
  assert.equal(f.app.requests.filter((r) => r.method === 'POST').length, 0)
})

test('el sello requiere resultado y se guarda por cuenta y calculado_en sin tocar revealedPages local', async () => {
  const f = await iniciarMara({ resultado: jsonServidor('resultado-riasec') }),
    a = f.app.load('src/lib/servidor/adaptadores.ts'),
    d = f.app.load('src/store/discoveryStore.ts')
  d.updateDiscovery((s) => ({ ...s, revealedPages: ['intereses'] }))
  const resultado = jsonServidor('resultado-riasec')
  assert.equal(
    a.paginaInteresesServidor(f.estado.bloques, null, d.getDiscovery(), f.estado.cuenta.codigo).state,
    'sealed',
  )
  assert.equal(
    a.paginaInteresesServidor(f.estado.bloques, resultado, d.getDiscovery(), f.estado.cuenta.codigo).state,
    'ready',
  )
  d.revelarPaginaApi('est-ana', resultado.calculado_en, 'intereses')
  const pagina = a.paginaInteresesServidor(
    f.estado.bloques,
    resultado,
    d.getDiscovery(),
    f.estado.cuenta.codigo,
  )
  assert.equal(pagina.state, 'revealed')
  assert.equal(pagina.result.areas[0].score, 100)
  // DATO DE PRUEBA: otra cuenta y un resultado nuevo tras reinicio.
  const luis = copia(f.estado)
  luis.cuenta.codigo = 'est-luis'
  assert.equal(
    a.paginaInteresesServidor(luis.bloques, resultado, d.getDiscovery(), luis.cuenta.codigo).state,
    'ready',
  )
  assert.equal(
    a.paginaInteresesServidor(
      f.estado.bloques,
      { ...resultado, calculado_en: '2026-10-08T10:00:00' },
      d.getDiscovery(),
      f.estado.cuenta.codigo,
    ).state,
    'ready',
  )
  assert.deepEqual(Array.from(d.getDiscovery().revealedPages), ['intereses'])
  const reload = fixtureServidor({ guardado: Object.fromEntries(f.app.local) }).load(
    'src/store/discoveryStore.ts',
  )
  assert.deepEqual(
    Array.from(reload.paginasReveladasApi(reload.getDiscovery(), 'est-ana', resultado.calculado_en)),
    ['intereses'],
  )
})

test('un 409 con avance es resultado pendiente, pero red y otros 409 son errores explícitos', async () => {
  const f = await iniciarMara()
  assert.deepEqual(copia(await f.almacen.cargarResultadoRiasec()), { tipo: 'ok', datos: null })
  assert.equal(f.almacen.obtenerEstadoServidor().estadoResultado, 'pendiente')
  f.app.fetch(() => {
    throw Error('DATO DE PRUEBA: sin red')
  })
  assert.equal((await f.almacen.cargarResultadoRiasec()).tipo, 'sin_conexion')
  assert.equal(f.almacen.obtenerEstadoServidor().estadoResultado, 'error')
  f.app.fetch(() => ({ status: 409, body: { detail: { mensaje: 'DATO DE PRUEBA: conflicto distinto' } } }))
  assert.equal((await f.almacen.cargarResultadoRiasec()).tipo, 'bloqueado')
})

test('las consultas simultáneas del resultado comparten GET sin inventar un cambio de cuenta', async () => {
  const f = await iniciarMara()
  let confirmar,
    consultas = 0
  f.app.fetch(() => {
    consultas++
    return new Promise((resolve) => {
      confirmar = resolve
    })
  })
  const primera = f.almacen.cargarResultadoRiasec()
  const segunda = f.almacen.cargarResultadoRiasec()
  assert.equal(consultas, 1)
  confirmar({ body: jsonServidor('resultado-riasec') })
  assert.equal((await primera).tipo, 'ok')
  assert.equal((await segunda).tipo, 'ok')
  assert.equal(f.almacen.obtenerEstadoServidor().estadoResultado, 'listo')
})

test('al fallar la consulta del resultado después del POST 14 se reintenta solo GET y se conserva el aviso', async () => {
  const f = await iniciarMara(),
    acciones = f.app.load('src/store/servidor/operaciones.ts')
  const recibo = jsonServidor('completar-act-tip-14')
  let falla = true
  f.app.fetch((req) => {
    if (req.url.endsWith('/completar-actividad')) return { body: recibo }
    if (esConsultaDominio(req)) {
      const estado = copia(f.estado)
      estado.bloques.flatMap((b) => b.actividades).find((a) => a.codigo === 'act-tip-final').estado =
        'DISPONIBLE'
      return respuestaDominio(req, estado)
    }
    if (req.url.endsWith('/resultado')) {
      if (falla) throw Error('DATO DE PRUEBA: fallo de resultado')
      return { body: jsonServidor('resultado-riasec') }
    }
    return f.servidor(req)
  })
  const primera = await acciones.completarActividad('act-tip-14')
  assert.equal(primera.tipo, 'guardado_sin_refrescar')
  falla = false
  const segunda = await acciones.completarActividad('act-tip-14', primera.datos)
  assert.equal(segunda.tipo, 'ok')
  assert.equal(f.app.requests.filter((r) => r.url.endsWith('/completar-actividad')).length, 1)
  const Finish = f.app.load('src/features/activities/components/FinishScreen.tsx').FinishScreen
  const tree = Finish({
    activity: { ...f.activity, id: 'act-tip-14' },
    onClose() {},
    resultadosGenerados: segunda.datos.resultados_generados,
  })
  assert.match(texto(tree), /Elena tiene algo que mostrarte/)
  botonEn(tree, 'Abrir el libro').props.onClick()
  assert.equal(f.app.navigations.at(-1), '/student/profile/helena')
  assert.equal(
    f.app.requests.some((r) => r.url.includes('marcar-vistos')),
    false,
  )
})

test('perfil plano no inventa dimensiones destacadas, coincidencias ni carreras y ofrece revisión', async () => {
  // DATO DE PRUEBA: representación de perfil plano con los mismos contratos del fixture.
  const resultado = {
    ...jsonServidor('resultado-riasec'),
    perfil_plano: true,
    coincidencias: [],
    carreras_recomendadas: [],
  }
  const f = await iniciarMara({ resultado }),
    a = f.app.load('src/lib/servidor/adaptadores.ts')
  assert.equal(a.areasRiasec(resultado).length, 0)
  assert.equal(a.coincidenciasRiasec(resultado).length, 0)
  const Node = f.app.load('src/features/activities/components/nodes/ResultNode.tsx').ResultNode
  const tree = Node({ activity: f.activity, instrumentId: 'TEST-RIASEC' })
  assert.match(texto(tree), /no distinguen un interés/)
  assert.equal(elementos(tree, (e) => e.props.to === '/student/exploration?punto=mara-test').length, 1)
})

test('isAffine usa código y ajuste del servidor y oculta afinidades antes de revelar', async () => {
  const f = await iniciarMara(),
    s = f.app.load('src/features/discovery/lib/catalogSelectors.ts'),
    resultado = jsonServidor('resultado-riasec')
  assert.equal(s.isAffine('geologist', ['intereses'], { resultado, revelado: false }), undefined)
  assert.equal(s.isAffine('geologist', [], { resultado, revelado: true }), 'Mejor ajuste')
  assert.equal(s.isAffine('civil-engineer', [], { resultado, revelado: true }), 'Gran ajuste')
  assert.equal(s.isAffine('architect', [], { resultado, revelado: true }), 'Buen ajuste')
  assert.equal(s.isAffine('psychologist', ['intereses'], { resultado, revelado: true }), undefined)
  assert.equal(
    s.isAffine('geologist', [], { resultado: { ...resultado, perfil_plano: true }, revelado: true }),
    undefined,
  )
})

test('el catálogo respeta posición y correlación e incluye códigos desconocidos sin enlace', async () => {
  // DATO DE PRUEBA: nurse y código nulo sin detalle del catálogo del front.
  const resultado = jsonServidor('resultado-riasec')
  resultado.coincidencias.push({
    ...resultado.coincidencias[0],
    codigo: 'nurse',
    codigo_onet: '29-1141.00',
    titulo: 'Enfermero/a',
    posicion: 2,
  })
  resultado.coincidencias.reverse()
  const f = await iniciarMara({ resultado, ruta: '/student/catalog/professions?afines=1' })
  const context = f.app.load('src/context/occupationExplorationContext.ts')
  context.useOccupationExplorationContext = () => ({
    profiles: [],
    careerInterestIds: [],
    institutionInterestIds: [],
  })
  const discovery = f.app.load('src/store/discoveryStore.ts')
  discovery.revelarPaginaApi('est-ana', resultado.calculado_en, 'intereses')
  const View = f.app.load('src/pages/student/StudentCatalogView.tsx').StudentCatalogView
  const tree = View({ section: 'professions' }),
    cards = elementos(tree, (e) => e.type === 'article')
  assert.match(texto(cards[0]), /Geólogo/)
  const nurse = cards.find((c) => texto(c).includes('Enfermero/a'))
  assert.ok(nurse)
  assert.match(texto(nurse), /correlación/)
  assert.equal(elementos(nurse, (e) => !!e.props.to).length, 0)
})

test('el libro resume las dimensiones remotas y anuncia contenidos, con enlaces al resultado y la guía', async () => {
  const resultado = jsonServidor('resultado-riasec'),
    f = await iniciarMara({ resultado })
  const d = f.app.load('src/store/discoveryStore.ts')
  d.revelarPaginaApi('est-ana', resultado.calculado_en, 'intereses')
  const Book = f.app.load('src/pages/student/HelenaBookView.tsx').HelenaBookView
  // F4b: render completo de los nuevos componentes; los puntajes/vías viven en el detalle.
  const marcado = renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(Book)))
  assert.match(marcado, /Tu código de interés · IRA/)
  for (const codigo of resultado.codigo_interes.codigo)
    assert.ok(marcado.includes(resultado.dimensiones.find((dimension) => dimension.codigo === codigo).descripcion))
  assert.match(marcado, /10 ocupaciones afines/)
  assert.match(marcado, /3 carreras que conducen a ellas/)
  assert.doesNotMatch(marcado, /100\s*%|Geólogo|Carreras que conducen a ellas/)
  assert.match(marcado, /Disponible en una próxima iteración/)
  assert.match(marcado, /href="\/student\/profile\/helena\/intereses"/)
  assert.match(marcado, /href="\/student\/profile\/helena\/intereses\?guia=1"/)
  assert.doesNotMatch(marcado, /act-tip-final&amp;revision=1|catalog\/careers\/civil-engineering|catalog\/professions\/geologist/)
})

test('act-tip-final muestra el nodo del servidor y la revisión nunca completa el resultado de nuevo', async () => {
  const f = await iniciarMara({ resultado: jsonServidor('resultado-riasec') })
  const Final = f.estado.bloques.flatMap((b) => b.actividades).find((a) => a.codigo === 'act-tip-final')
  Final.estado = 'COMPLETADA'
  await f.almacen.refrescar()
  const Wrapper = f.app.load(
    'src/features/activities/components/MaraInteractionPlayer.tsx',
  ).MaraInteractionPlayer
  const loader = f.app.mount(Wrapper, { codigo: 'act-tip-final', revision: true, onClose() {} })
  loader.render()
  await esperar()
  const props = elementos(loader.render(), (e) => e.type?.name === 'StudentActivityPlayer')[0].props
  assert.equal(props.activity.nodos[0].instrumentoId, 'TEST-RIASEC')
  assert.equal(props.instrumentoServidor.revision, true)
  loader.unmount()
  let cerrada = false
  const player = f.app.mount(
    f.app.load('src/features/activities/components/StudentActivityPlayer.tsx').StudentActivityPlayer,
    {
      ...props,
      onClose() {
        cerrada = true
      },
    },
  )
  botonEn(player.render(), 'Volver a la ciudad').props.onClick()
  assert.equal(cerrada, true)
  assert.equal(f.app.requests.filter((r) => r.method === 'POST').length, 0)
})

test('los adaptadores conservan solo imports de tipos, incluidos los de presentación', () => {
  const source = readFileSync('src/lib/servidor/adaptadores.ts', 'utf8')
  assert.ok([...source.matchAll(/^import\s+(.+)$/gm)].every((m) => m[1].startsWith('type ')))
})
