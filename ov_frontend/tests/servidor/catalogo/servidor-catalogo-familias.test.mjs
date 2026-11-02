import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { cargarAlmacen, esperar, fixtureServidor, jsonServidor } from '../../soporte/servidor-ayudas.mjs'

// Ajuste resultados-intereses: el catálogo organizado por familias de carreras (bocetos 04 y 06), con los
// fixtures ruta-* (est-ana con su test de intereses revelado).
const html = (Component, props) =>
  renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(Component, props)))
const FICHA = jsonServidor('ruta/ruta-catalogo-familia')
const RUTAS_ESTUDIANTE = {
  catalog: {
    careers: '/student/catalog/careers',
    professions: '/student/catalog/professions',
    institutions: '/student/catalog/institutions',
  },
  career: (c) => `/student/catalog/careers/${c}`,
  occupation: (c) => `/student/catalog/professions/${c}`,
  institution: (c) => `/student/catalog/institutions/${c}`,
}

function conFicha(error = false) {
  const app = fixtureServidor({ ruta: '/student/catalog/careers' })
  app.fetch((r) =>
    r.url.includes(`/catalogo/familias/${FICHA.codigo}`)
      ? error
        ? { status: 500, body: { detail: { mensaje: 'Falló' } } }
        : { body: FICHA }
      : { body: [] },
  )
  cargarAlmacen(app).publicar({ consultasHabilitadas: true })
  return app
}

test('la ficha de la familia muestra su área, conteos, ingresos, ocupaciones y vecinas, y la recomendación al estudiante', async () => {
  const app = conFicha()
  const { FichaFamilia } = app.load('src/features/discovery/components/FichaFamilia.tsx')
  const vista = app.mount(FichaFamilia, {
    codigo: FICHA.codigo,
    rutas: RUTAS_ESTUDIANTE,
    conRecomendacion: true,
  })
  // Mientras carga, la ficha espera con su esqueleto.
  assert.equal(vista.render().props['aria-busy'], 'true')
  await esperar()
  const marcado = renderToStaticMarkup(React.createElement(MemoryRouter, null, vista.render()))
  assert.ok(
    marcado.includes(FICHA.nombre) &&
      marcado.includes(`Área: ${FICHA.area_nombre} · código CINE ${FICHA.codigo}`),
  )
  assert.ok(marcado.includes(`${FICHA.total_carreras} carrera`))
  assert.match(marcado, /Recomendada por tu test · 1\.ª de 5/)
  const ocupaciones = FICHA.ocupaciones_principales + FICHA.ocupaciones_secundarias
  assert.ok(marcado.includes(`href="/student/catalog/professions?familia=${FICHA.codigo}"`))
  assert.ok(marcado.includes(ocupaciones === 1 ? 'Ver su ocupación' : `Ver sus ${ocupaciones} ocupaciones`))
  if (FICHA.ingresos.length) assert.match(marcado, /Egresados jóvenes/)
  for (const v of FICHA.vecinas) assert.ok(marcado.includes(v.nombre))
  vista.unmount()
  // En el portal (modo lectura) no hay recomendación del test.
  const portal = conFicha()
  const { FichaFamilia: FichaPortal } = portal.load('src/features/discovery/components/FichaFamilia.tsx')
  const lectura = portal.mount(FichaPortal, {
    codigo: FICHA.codigo,
    rutas: RUTAS_ESTUDIANTE,
    conRecomendacion: false,
  })
  lectura.render()
  await esperar()
  assert.doesNotMatch(
    renderToStaticMarkup(React.createElement(MemoryRouter, null, lectura.render())),
    /Recomendada/,
  )
  lectura.unmount()
})

test('la ficha de la familia con error ofrece reintentar', async () => {
  const app = conFicha(true)
  const { FichaFamilia } = app.load('src/features/discovery/components/FichaFamilia.tsx')
  const vista = app.mount(FichaFamilia, {
    codigo: FICHA.codigo,
    rutas: RUTAS_ESTUDIANTE,
    conRecomendacion: true,
  })
  vista.render()
  await esperar()
  const marcado = renderToStaticMarkup(React.createElement(MemoryRouter, null, vista.render()))
  assert.match(marcado, /role="alert"/)
  assert.match(marcado, /Reintentar/)
  vista.unmount()
})

test('las profesiones filtradas por familia marcan la vía alternativa', () => {
  const app = fixtureServidor()
  const { TarjetaCatalogo } = app.load('src/features/discovery/components/TarjetaCatalogo.tsx')
  const pagina = jsonServidor('ruta/ruta-catalogo-ocupaciones-familia')
  const secundaria = pagina.items.find((o) => o.via_familia === 'SECUNDARIA')
  const principal = pagina.items.find((o) => o.via_familia === 'PRINCIPAL')
  const props = { obtenido: false, conFavorito: false, pendiente: false, onFavorito() {} }
  assert.doesNotMatch(html(TarjetaCatalogo, { ...props, item: principal }), /Vía alternativa/)
  if (secundaria) assert.match(html(TarjetaCatalogo, { ...props, item: secundaria }), /Vía alternativa/)
})

test('el detalle de carrera lista las ocupaciones de su familia por vía y marca las afines del estudiante', () => {
  const app = fixtureServidor()
  const { OcupacionesDeLaFamilia } = app.load('src/features/discovery/components/OcupacionesDeLaFamilia.tsx')
  const carrera = jsonServidor('ruta/ruta-catalogo-carrera-psychology')
  const ocupaciones = structuredClone(carrera.ocupaciones_de_la_familia)
  // DATO DE PRUEBA: una principal afín al estudiante.
  ocupaciones.principales[0].afinidad = { parecido: 91, banda: 'MUY_AFIN' }
  const marcado = html(OcupacionesDeLaFamilia, {
    ocupaciones,
    familia: carrera.familia,
    rutas: RUTAS_ESTUDIANTE,
  })
  const total = ocupaciones.principales.length + ocupaciones.secundarias.length
  assert.match(marcado, /Ocupaciones a las que lleva su familia/)
  assert.ok(marcado.includes(`Vía principal · ${ocupaciones.principales.length}`))
  assert.ok(marcado.includes(`Vía alternativa · ${ocupaciones.secundarias.length}`))
  assert.ok(marcado.includes(`Ver estas ${total} ocupaciones en el catálogo`))
  assert.equal((marcado.match(/Muy afín a ti/g) ?? []).length, 1)
  assert.doesNotMatch(marcado, /Profesiones a las que conduce/)
})

test('profesiones filtra por área y familia; el grupo ya no es un parámetro', () => {
  const { PARAMETROS, leerFiltros } = fixtureServidor().load('src/features/discovery/lib/filtrosCatalogo.ts')
  assert.deepEqual(
    [...PARAMETROS.professions],
    ['buscar', 'area', 'familia', 'riasec', 'afines', 'favoritos'],
  )
  assert.deepEqual(
    { ...leerFiltros('professions', new URLSearchParams('grupo=29&familia=313&area=31')) },
    {
      area: '31',
      familia: '313',
    },
  )
})
