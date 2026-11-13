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
  // Ajuste resultados-intereses: el resumen no lleva puntajes; el resultado completo (`remoto`) sí, porque la
  // vista de intereses del apoderado muestra las barras (boceto 02).
  const { remoto } = vista
  assert.ok(vista.dimensiones.every((d) => !('puntaje' in d || 'puntaje_visual' in d)))
  assert.equal(remoto, RESULTADOS[0])
  assert.match(vista.mensaje, /Ana/)
  assert.ok(vista.lectura && !vista.lectura.includes('{nombre}'))
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
  assert.match(marcado, /Test de intereses</)
  assert.match(marcado, /Lo que más destaca: <strong>Investigativa · Realista · Artística<\/strong>/)
  assert.match(
    marcado,
    new RegExp(`href="/parent/children/${conDiploma.estudiantes[0].codigo}/questionnaires/TEST-RIASEC"`),
  )
  assert.match(marcado, /Estos resultados son exploratorios/)
  assert.doesNotMatch(marcado, /Verá su resultado|puntaje|correlaci/)
  const sinDiploma = familia(false)
  const bloqueado = html(ParentChildServerSummary, {
    familia: sinDiploma,
    hijo: sinDiploma.estudiantes[0],
    onElegir() {},
    resultados: { habilitado: false, resultados: null, error: '', reintentar() {} },
  })
  assert.match(bloqueado, /Completado · /)
  assert.match(bloqueado, /Verá su resultado cuando complete sus actividades/)
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
  // Ajuste resultados-intereses: «Cómo leer» trae el encuadre y la lectura del apoderado; sin valores numéricos.
  assert.match(marcado, /conversar con Ana/)
  assert.ok(marcado.includes(vista.lectura.slice(0, 40)))
  assert.doesNotMatch(marcado, /\d+ ?%|puntaje_visual/)
})

// Ajuste resultados-intereses: el resultado de intereses del hijo en el portal (boceto 02).
test('el apoderado ve su texto, el código, la tabla de ocupaciones afines y las familias, sin favoritos ni planes', () => {
  const app = fixtureServidor()
  const { ResultadoInteresesPortal } = app.load('src/features/discovery/components/ResultadoInteresesPortal.tsx')
  const { appPaths } = app.load('src/routes/paths.ts')
  const remoto = RESULTADOS[0]
  const marcado = html(ResultadoInteresesPortal, { remoto, nombre: 'Ana', rutas: appPaths.parent.explorar })
  assert.match(marcado, /Qué mide este test y cómo leerlo/)
  assert.ok(marcado.includes(remoto.lectura.replace(/«/g, '&laquo;')) || marcado.includes('Muestra gusto, no capacidad'))
  assert.match(marcado, /Su código de interés/)
  assert.match(marcado, /Qué significa cada tipo/)
  // Corrección del ajuste: abre en preparación Amplia (o Todas sin ninguna), con los rótulos de cada control.
  const amplias = remoto.ocupaciones.filter((o) => o.preparacion === 'AMPLIA')
  const visibles = amplias.length ? amplias : remoto.ocupaciones
  assert.match(marcado, /Cómo verlas/)
  assert.match(marcado, /Preparación que suele pedir el trabajo/)
  assert.equal((marcado.match(/Ver ficha/g) ?? []).length, Math.min(8, visibles.length))
  if (visibles.length > 8) assert.ok(marcado.includes(`Mostrar las ${visibles.length - 8} restantes`))
  assert.ok(marcado.includes(`href="/parent/explorar/professions/${visibles[0].codigo}"`))
  assert.match(marcado, /de la ocupación al suyo/)
  assert.equal((marcado.match(/Ver en el catálogo/g) ?? []).length, remoto.familias.length)
  assert.match(marcado, /href="\/parent\/explorar\/careers\?area=\d{2}&amp;familia=\d{3}"/)
  assert.match(marcado, /Para conversar en casa/)
  assert.doesNotMatch(marcado, /Guardar|Hacer mi plan|Recomendada por tu test|favorit[ao]s? (?!ni)/)
})
