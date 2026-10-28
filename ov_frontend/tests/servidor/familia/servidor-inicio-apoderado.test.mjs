import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { copia, esperar, fixtureServidor, jsonServidor } from '../../soporte/servidor-ayudas.mjs'
import { fixtureApoderado } from '../../soporte/apoderado-ayudas.mjs'

// Ajuste inicio-apoderado (bocetos A–D): el Inicio del apoderado en api con los fixtures ruta-*.
const html = (Component, props) =>
  renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(Component, props)))
const FAMILIA = jsonServidor('ruta/ruta-familia')
const sinResultados = { habilitado: false, resultados: null, error: '', reintentar() {} }
const bloqueo = { tipo: 'bloqueado', detalle: { mensaje: 'Completa tus actividades para conversar en familia.' } }

test('los estados de la tarjeta de conversaciones salen de la sección del servidor, uno por vez', () => {
  const { estadoConversaciones } = fixtureApoderado().load('src/features/parent/lib/inicio.ts')
  const estado = (datos, error = null) => copia(estadoConversaciones({ datos, error }))
  assert.deepEqual(estado(null), { tipo: 'cargando' })
  assert.deepEqual(estado(null, bloqueo), { tipo: 'bloqueada', mensaje: bloqueo.detalle.mensaje })
  assert.deepEqual(estado(null, { tipo: 'sin_conexion' }), { tipo: 'error' })
  assert.deepEqual(estado(jsonServidor('ruta/ruta-conversaciones-sin-carta')), { tipo: 'carta' })
  assert.deepEqual(estado(jsonServidor('ruta/ruta-conversaciones-te-toca')), {
    tipo: 'te_toca',
    completadas: 0,
    total: 2,
    esperan: 1,
  })
  const esperando = jsonServidor('ruta/ruta-conversaciones-te-toca')
  esperando.conversaciones = esperando.conversaciones.map((c) => ({ ...c, estado: 'esperando_al_otro' }))
  assert.deepEqual(estado(esperando), { tipo: 'en_curso', completadas: 0, total: 2 })
  assert.deepEqual(estado(jsonServidor('ruta/ruta-conversaciones-apoderado-final')), { tipo: 'completas', total: 2 })
  // Con un error, nunca los datos de antes ni de demostración.
  assert.deepEqual(estado(esperando, { tipo: 'sin_conexion' }), { tipo: 'error' })
})

test('los chips dicen el estado con palabras: único, partida y llegada', () => {
  const { chipsCuestionario, tieneResultado } = fixtureApoderado().load('src/features/parent/lib/inicio.ts')
  const fecha = (valor) => valor.slice(0, 10)
  const [riasec] = FAMILIA.estudiantes[0].cuestionarios
  assert.deepEqual(copia(chipsCuestionario(riasec, fecha)), [{ completado: true, texto: 'Completado · 2026-10-07' }])
  const pendiente = { ...riasec, aplicaciones: [{ ...riasec.aplicaciones[0], completado_en: null }] }
  assert.deepEqual(copia(chipsCuestionario(pendiente, fecha)), [{ completado: false, texto: 'Aún no lo completa' }])
  assert.equal(tieneResultado(pendiente), false)
  const partida = {
    instrumento: 'TEST-PARTIDA-LLEGADA',
    nombre: 'Punto de partida y de llegada',
    aplicaciones: [
      { aplicacion: 'APL-PARTIDA', nombre: 'Punto de partida', momento: 'ENTRADA', completado_en: '2026-10-02T09:00:00' },
      { aplicacion: 'APL-LLEGADA', nombre: 'Punto de llegada', momento: 'SALIDA', completado_en: null },
    ],
  }
  assert.deepEqual(copia(chipsCuestionario(partida, fecha)), [
    { completado: true, texto: 'Partida · 2026-10-02' },
    { completado: false, texto: 'Llegada pendiente' },
  ])
  assert.equal(tieneResultado(partida), true)
})

test('el hijo elegido, su nombre y, de partida y llegada, el resultado de llegada si existe', () => {
  const { hijoElegido, resultadoDeInstrumento } = fixtureApoderado().load('src/features/parent/lib/familia.ts')
  assert.equal(hijoElegido(FAMILIA, 'est-luis').nombre, 'Luis')
  assert.equal(hijoElegido(FAMILIA, 'nadie').codigo, 'est-ana')
  assert.equal(hijoElegido({ ...FAMILIA, estudiantes: [] }, 'est-ana'), null)
  const resultados = [
    { instrumento: 'TEST-PARTIDA-LLEGADA', nombre: 'partida' },
    { instrumento: 'TEST-PARTIDA-LLEGADA', nombre: 'llegada' },
    { instrumento: 'TEST-RIASEC', nombre: 'riasec' },
  ]
  assert.equal(resultadoDeInstrumento(resultados, 'TEST-PARTIDA-LLEGADA').nombre, 'llegada')
  assert.equal(resultadoDeInstrumento(resultados.slice(0, 1), 'TEST-PARTIDA-LLEGADA').nombre, 'partida')
  assert.equal(resultadoDeInstrumento(null, 'TEST-RIASEC'), undefined)
})

test('«Mis hijos» lleva el selector solo con más de un hijo y muestra un hijo a la vez', () => {
  const app = fixtureApoderado()
  const { ParentChildServerSummary } = app.load('src/features/parent/components/ParentChildServerSummary.tsx')
  const props = (familia, hijo) => ({ familia, hijo, onElegir() {}, resultados: sinResultados })
  const dos = html(ParentChildServerSummary, props(FAMILIA, FAMILIA.estudiantes[1]))
  assert.match(dos, /aria-label="Elegir hijo"/)
  assert.match(dos, />Ana</)
  assert.match(dos, /<h3>Luis<\/h3>/)
  assert.match(dos, /Avance de Luis/)
  assert.doesNotMatch(dos, /<h3>Ana<\/h3>/)
  const uno = { ...FAMILIA, estudiantes: FAMILIA.estudiantes.slice(0, 1) }
  const solo = html(ParentChildServerSummary, props(uno, uno.estudiantes[0]))
  assert.doesNotMatch(solo, /Elegir hijo/)
  assert.match(solo, /Título actual: /)
  const sinTitulo = { ...uno.estudiantes[0], nivel_actual: null }
  assert.doesNotMatch(html(ParentChildServerSummary, props(uno, sinTitulo)), /Título actual/)
  const vacio = { ...uno.estudiantes[0], cuestionarios: [] }
  assert.match(
    html(ParentChildServerSummary, props(uno, vacio)),
    /Por ahora no hay cuestionarios compartidos con las familias\./,
  )
  // Sin `/familia` todavía, el esqueleto de la tarjeta.
  assert.match(html(ParentChildServerSummary, props(null, null)), /aria-busy="true"/)
})

test('la clave carga dentro de su fila y su error ofrece reintentar', () => {
  const app = fixtureApoderado()
  const { ParentChildServerSummary } = app.load('src/features/parent/components/ParentChildServerSummary.tsx')
  const props = (resultados) => ({ familia: FAMILIA, hijo: FAMILIA.estudiantes[0], onElegir() {}, resultados })
  const cargando = html(ParentChildServerSummary, props({ ...sinResultados, habilitado: true }))
  assert.match(cargando, /Ver resultado/)
  assert.match(cargando, /aria-busy="true"/)
  const error = html(ParentChildServerSummary, props({ ...sinResultados, habilitado: true, error: 'Sin red' }))
  assert.match(error, /role="alert"[^>]*>Sin red/)
  assert.match(error, /Reintentar/)
})

test('«Tus actividades»: lo que falta y «Continuar»; completa, el diploma con un botón secundario', () => {
  const app = fixtureApoderado()
  const { ParentActivitiesCard } = app.load('src/features/parent/components/ParentActivitiesCard.tsx')
  const mitad = html(ParentActivitiesCard, {
    ruta: { completed: 1, total: 2, percent: 50, complete: false, next: { id: 't-apo-2', titulo: 'Segunda' } },
  })
  assert.match(mitad, /Te falta 1/)
  assert.match(mitad, /Siguiente: Segunda/)
  assert.match(mitad, /1 de 2 actividades · hacia tu diploma/)
  assert.match(mitad, /href="\/parent\/activities\/t-apo-2"[^>]*>Continuar/)
  const completa = html(ParentActivitiesCard, { ruta: { completed: 2, total: 2, percent: 100, complete: true } })
  assert.match(completa, /Ruta completada/)
  assert.match(completa, /Completaste tus 2 actividades\. Tu diploma ya está listo\./)
  assert.match(completa, /data-variant="outline"[^>]*href="\/parent\/activities"|href="\/parent\/activities"[^>]*>Ver mis actividades y diploma/)
  assert.doesNotMatch(completa, /Continuar|Te falta/)
})

test('«Conversaciones con {hijo}»: textos y acción de cada estado del boceto C', () => {
  const app = fixtureApoderado()
  const { ParentConversationsCard } = app.load('src/features/parent/components/ParentConversationsCard.tsx')
  const tarjeta = (estado) => html(ParentConversationsCard, { nombre: 'Ana', estado, onReintentar() {} })
  const bloqueada = tarjeta({ tipo: 'bloqueada', mensaje: bloqueo.detalle.mensaje })
  assert.match(bloqueada, /Conversaciones con Ana/)
  assert.match(bloqueada, /Completa tus actividades para conversar en familia\./)
  assert.match(bloqueada, /href="\/parent\/conversations"[^>]*>Ver conversaciones/)
  assert.doesNotMatch(bloqueada, /se habilitarán a medida/)
  assert.match(tarjeta({ tipo: 'carta' }), /Antes de conversar, escríbele una carta a Ana\./)
  assert.match(tarjeta({ tipo: 'carta' }), /href="\/parent\/conversations\/carta"[^>]*>Escribir mi carta/)
  const teToca = tarjeta({ tipo: 'te_toca', completadas: 2, total: 6, esperan: 1 })
  assert.match(teToca, /Ana te espera en 1/)
  assert.match(teToca, /2 de 6 conversaciones</)
  assert.match(teToca, />Seguir conversando/)
  const enCurso = tarjeta({ tipo: 'en_curso', completadas: 2, total: 6 })
  assert.match(enCurso, /2 de 6 conversaciones · ahora le toca a Ana/)
  assert.match(enCurso, />Ver conversaciones/)
  assert.doesNotMatch(enCurso, /te espera/)
  const completas = tarjeta({ tipo: 'completas', total: 6 })
  assert.match(completas, /6 de 6/)
  assert.match(completas, /Conversaron sobre todo\. Hay un regalo esperándolos\./)
  assert.match(completas, /href="\/parent\/conversations\/regalo"[^>]*>Abrir el regalo/)
  const error = tarjeta({ tipo: 'error' })
  assert.match(error, /No pudimos cargar las conversaciones\. Revisa tu conexión e inténtalo de nuevo\./)
  assert.match(error, />Reintentar</)
  assert.match(tarjeta({ tipo: 'cargando' }), /aria-busy="true"/)
})

test('los resultados tienen una sección por hijo y se descarta lo que llega del hijo que dejó de ser el activo', async () => {
  const app = fixtureServidor({ cuenta: 'apo-rosa' })
  const RESULTADOS = jsonServidor('ruta/ruta-familia-resultados')
  const demorados = []
  app.fetch((req) => {
    if (req.url === '/api/acciones/ingresar') return { body: { eventos_registrados: [], nuevos_desbloqueos: [] } }
    if (req.url.endsWith('/apo-rosa/actividades')) return { body: jsonServidor('ruta/ruta-apoderado-actividades-final') }
    if (req.url.endsWith('/apo-rosa/familia')) return { body: FAMILIA }
    if (req.url === '/api/instrumentos') return { body: jsonServidor('ruta/ruta-instrumentos') }
    if (req.url.endsWith('/familia/resultados?estudiante=est-ana'))
      return new Promise((resolve) => demorados.push(() => resolve({ body: RESULTADOS })))
    if (req.url.endsWith('/familia/resultados?estudiante=est-luis')) return { body: [] }
    throw Error(`Solicitud no configurada: ${req.url}`)
  })
  const apoderado = app.load('src/store/servidor/apoderado.ts')
  const almacen = app.load('src/store/servidor/apoderadoResultados.ts')
  assert.equal((await apoderado.ingresarApoderado()).tipo, 'ok')
  const ana = almacen.asegurarResultadosHijo('est-ana')
  await esperar()
  assert.equal(almacen.obtenerResultadosHijoAlmacen().porHijo['est-ana'].estado, 'cargando')
  // Elige a Luis antes de que lleguen los de Ana.
  assert.deepEqual(copia((await almacen.asegurarResultadosHijo('est-luis')).datos.resultados), [])
  demorados.forEach((soltar) => soltar())
  assert.equal((await ana).tipo, 'http')
  const tras = almacen.obtenerResultadosHijoAlmacen()
  assert.equal(tras.activo, 'est-luis')
  assert.deepEqual(copia(tras.porHijo['est-ana']), { datos: null, estado: 'sin_cargar', error: null })
  assert.equal(tras.porHijo['est-luis'].estado, 'listo')
  // Al volver a Ana se pide otra vez y ahora sí se guarda.
  const otraVez = almacen.asegurarResultadosHijo('est-ana')
  await esperar()
  demorados.at(-1)()
  assert.equal((await otraVez).tipo, 'ok')
  assert.deepEqual(copia(almacen.obtenerResultadosHijoAlmacen().porHijo['est-ana'].datos.resultados), RESULTADOS)
  assert.equal(app.requests.filter((r) => r.url.endsWith('?estudiante=est-ana')).length, 2)
})
