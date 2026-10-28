import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { copia, fixtureServidor, jsonServidor } from '../../soporte/servidor-ayudas.mjs'
import { fixtureApoderado } from '../../soporte/apoderado-ayudas.mjs'

// F03 (HU-022, HU-023): el apoderado ve, con el diploma, la vista resumida de los resultados del hijo que el
// salón comparte y la explicada, con los nombres y descripciones del servidor y sin puntajes.
const html = (Component, props) =>
  renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(Component, props)))
const RESULTADOS = jsonServidor('ruta/ruta-familia-resultados')
const CATALOGO = jsonServidor('ruta/ruta-instrumentos')
const familia = (obtenido) => ({
  ...jsonServidor('ruta/ruta-familia'),
  diploma: { obtenido, obtenido_en: obtenido ? '2026-10-07T10:00:00' : null },
})

test('el adaptador usa el nombre del catálogo y el código de interés en su orden, sin puntajes', () => {
  const { resultadoFamilia } = fixtureServidor().load('src/lib/servidor/adaptadoresInstrumentos.ts')
  const vista = resultadoFamilia(RESULTADOS[0], CATALOGO)
  assert.equal(vista.nombre, CATALOGO.find((i) => i.codigo === 'TEST-RIASEC').nombre)
  assert.deepEqual(copia(vista.protagonistas.map((d) => d.nombre)), ['Investigativa', 'Realista', 'Artística'])
  assert.equal(vista.dimensiones.length, 6)
  assert.ok(!JSON.stringify(vista).includes('puntaje'))
  const plano = resultadoFamilia({ ...RESULTADOS[0], perfil_plano: true, codigo_interes: null }, CATALOGO)
  assert.deepEqual(copia(plano.protagonistas), [])
})

test('la consulta usa la cuenta del apoderado y pide el catálogo; sin diploma devuelve el 409 del servidor', async () => {
  const app = fixtureServidor({ cuenta: 'apo-rosa' })
  let conDiploma = true
  app.fetch((req) => {
    if (req.url === '/api/acciones/ingresar') return { body: { eventos_registrados: [], nuevos_desbloqueos: [] } }
    if (req.url.endsWith('/apo-rosa/actividades')) return { body: jsonServidor('ruta/ruta-apoderado-actividades-final') }
    if (req.url.endsWith('/apo-rosa/familia')) return { body: familia(conDiploma) }
    if (req.url.endsWith('/familia/resultados'))
      return conDiploma
        ? { body: RESULTADOS }
        : { status: 409, body: jsonServidor('ruta/ruta-familia-resultados-sin-diploma') }
    if (req.url === '/api/instrumentos') return { body: CATALOGO }
    throw Error(`Solicitud no configurada: ${req.url}`)
  })
  const store = app.load('src/store/servidor/apoderado.ts')
  assert.equal((await store.ingresarApoderado()).tipo, 'ok')
  const respuesta = await store.consultarResultadosHijo()
  assert.equal(respuesta.tipo, 'ok')
  assert.deepEqual(copia(respuesta.datos.resultados), RESULTADOS)
  assert.ok(app.requests.some((r) => r.url === '/api/cuentas/apo-rosa/familia/resultados'))
  conDiploma = false
  const sinDiploma = await store.consultarResultadosHijo()
  assert.equal(sinDiploma.tipo, 'bloqueado')
  assert.equal(sinDiploma.detalle.mensaje, 'Completa tus actividades para ver los resultados de tu hijo')
})

// Ajuste inicio-apoderado: los cuestionarios se ven siempre; con el diploma, la clave y «Ver resultado» hacia la
// explicada; sin él, el candado en lugar del botón.
test('la tarjeta del hijo muestra la clave y el enlace a la explicada con el diploma; sin él, el candado', () => {
  const app = fixtureApoderado()
  const { ParentChildServerSummary } = app.load('src/features/parent/components/ParentChildServerSummary.tsx')
  const { resultadoFamilia } = app.load('src/lib/servidor/adaptadoresInstrumentos.ts')
  const conDiploma = familia(true)
  const marcado = html(ParentChildServerSummary, {
    familia: conDiploma,
    hijo: conDiploma.estudiantes[0],
    onElegir() {},
    resultados: {
      habilitado: true,
      resultados: RESULTADOS.map((r) => resultadoFamilia(r, CATALOGO)),
      error: '',
      reintentar() {},
    },
  })
  assert.match(marcado, /Test de intereses \(RIASEC\)/)
  assert.match(marcado, /Lo que más destaca: <strong>Investigativa · Realista · Artística<\/strong>/)
  assert.match(
    marcado,
    new RegExp(`href="/parent/children/${conDiploma.estudiantes[0].codigo}/questionnaires/TEST-RIASEC"`),
  )
  assert.match(marcado, /Estos resultados son exploratorios/)
  assert.doesNotMatch(marcado, /Verás su resultado|puntaje|correlaci/)
  const sinDiploma = familia(false)
  const bloqueado = html(ParentChildServerSummary, {
    familia: sinDiploma,
    hijo: sinDiploma.estudiantes[0],
    onElegir() {},
    resultados: { habilitado: false, resultados: null, error: '', reintentar() {} },
  })
  assert.match(bloqueado, /Completado · /)
  assert.match(bloqueado, /Verás su resultado cuando completes tus actividades/)
  assert.doesNotMatch(bloqueado, /questionnaires|Lo que más destaca|exploratorios/)
})

test('la explicada del apoderado muestra qué mide, el código de interés y cada dimensión con su descripción', () => {
  const app = fixtureServidor({ cuenta: 'apo-rosa' })
  const { QuestionnaireDetailContent } = app.load(
    'src/features/student-tracking/components/QuestionnaireDetailContent.tsx',
  )
  const { resultadoFamilia } = app.load('src/lib/servidor/adaptadoresInstrumentos.ts')
  const vista = resultadoFamilia(RESULTADOS[0], CATALOGO)
  const marcado = html(QuestionnaireDetailContent, { servidor: vista, nombre: 'Ana' })
  assert.ok(marcado.includes(vista.descripcion))
  assert.match(marcado, /Investigativa · Realista · Artística/)
  for (const d of RESULTADOS[0].dimensiones) assert.ok(marcado.includes(d.descripcion))
  assert.match(marcado, /conversar con Ana/)
  assert.doesNotMatch(marcado, /%|puntaje/)
})
