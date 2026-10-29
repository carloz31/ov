import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  cargarAlmacen,
  copia,
  escenarioRuta,
  esConsultaDominio,
  fixtureServidor,
  jsonServidor,
  respuestaDominio,
} from '../../soporte/servidor-ayudas.mjs'

// F09: contrato de Investigaciones (adaptadores, eco LO_QUE_PIENSO, contenidos y almacén) con los fixtures ruta-*.
const adaptadores = () => fixtureServidor().load('src/lib/servidor/adaptadoresInvestigaciones.ts')
const contenido = (clave) => JSON.parse(readFileSync(`src/data/activities/contenidos/${clave}.json`, 'utf8'))
const sinRespuestas = { eventos_registrados: [], nuevos_desbloqueos: [] }

test('el paso del asistente sale de la investigación en curso', () => {
  const { pasoInvestigacion } = adaptadores()
  assert.equal(pasoInvestigacion(jsonServidor('ruta/ruta-investigaciones-inicial').en_curso), 1)
  assert.equal(pasoInvestigacion(jsonServidor('ruta/ruta-investigaciones-en-curso').en_curso), 2)
  assert.equal(pasoInvestigacion(jsonServidor('ruta/ruta-investigaciones-guia-lista').en_curso), 3)
})

test('el guion se numera seguido (base 1–3) y termina con una pregunta propia o la duda', () => {
  const { numerarGuion, puedeTerminarGuion, avisoMuchasPreguntas } = adaptadores()
  const datos = jsonServidor('ruta/ruta-investigaciones-guia-lista')
  const guion = numerarGuion(datos.preguntas_base, datos.en_curso.preguntas)
  assert.deepEqual(
    guion.base.map((p) => p.numero),
    [1, 2, 3],
  )
  assert.deepEqual(copia(guion.propias.map((p) => [p.numero, p.origen])), [
    [4, 'DUDA'],
    [5, 'SUGERIDA'],
  ])
  assert.equal(guion.total, 5)
  assert.equal(puedeTerminarGuion(datos.en_curso.preguntas), true)
  assert.equal(puedeTerminarGuion([{ origen: 'SUGERIDA', texto: 'x' }]), false)
  assert.equal(avisoMuchasPreguntas(10), false)
  assert.equal(avisoMuchasPreguntas(11), true)
})

test('la tarjeta: conteos sin desglose, desglose por tipo en el catálogo y medidor de Leyenda', () => {
  const { lineaConteos, desglosePorTipo, medidorLeyenda } = adaptadores()
  const tipos = jsonServidor('ruta/ruta-investigaciones-inicial').tipos_reaccion
  const [mia] = jsonServidor('ruta/ruta-entrevistas-mias').items
  assert.equal(lineaConteos(mia.reacciones, mia.favoritos), '1 reacción · Favoritos 1')
  assert.deepEqual(copia(desglosePorTipo(mia.reacciones_por_tipo, tipos)), ['Aprendí algo 1'])
  assert.deepEqual(
    copia(medidorLeyenda({ favoritos: 3, favoritosLeyenda: 5, destacada: true, leyenda: false })),
    { porcentaje: 80, favoritos: 3, requeridos: 5, destacada: true },
  )
  assert.equal(
    medidorLeyenda({ favoritos: 9, favoritosLeyenda: 3, destacada: false, leyenda: false }).porcentaje,
    50,
  )
  assert.equal(
    medidorLeyenda({ favoritos: 3, favoritosLeyenda: 3, destacada: true, leyenda: true }).porcentaje,
    100,
  )
})

test('YouTube, reportes y fechas', () => {
  const { esEnlaceYoutube, embedYoutube, lineaReportes, fechaRelativa, fechaNumerica } = adaptadores()
  const detalle = jsonServidor('ruta/ruta-entrevista-detalle')
  assert.equal(esEnlaceYoutube(detalle.enlace), true)
  assert.equal(embedYoutube(detalle.enlace), 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')
  assert.equal(esEnlaceYoutube('https://vimeo.com/123'), false)
  assert.equal(embedYoutube('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=3'), embedYoutube(detalle.enlace))
  assert.equal(lineaReportes([]), null)
  assert.equal(lineaReportes(['OFENSIVO']), 'Reportado: ofensivo · por 1 estudiante')
  // Las fechas del servidor están en hora de Lima: las 12:00 de Lima son las 17:00 UTC.
  const ahora = new Date('2026-10-29T17:00:00Z')
  assert.equal(fechaRelativa('2026-10-29T10:00:00', ahora), 'hace 2 h')
  assert.equal(fechaRelativa('2026-10-28T18:00:00', ahora), 'ayer')
  assert.equal(fechaRelativa('2026-10-26T18:00:00', ahora), 'hace 3 días')
  assert.equal(fechaRelativa('2026-10-12T18:00:00', ahora), '12 oct')
  assert.equal(fechaNumerica('2026-10-25T09:00:00'), '25/10/2026')
  // A las 21:00 de Lima ya es el día siguiente en UTC, pero sigue siendo el mismo día.
  assert.equal(fechaNumerica('2026-10-25T21:00:00'), '25/10/2026')
  assert.equal(fechaRelativa('2026-10-28T21:00:00', new Date('2026-10-29T03:00:00Z')), 'hace 1 h')
})

test('la orientadora: reacción reportada primero, con el salón de su autor', () => {
  const detalle = jsonServidor('ruta/ruta-publicacion-detalle')
  const [primera] = detalle.reacciones
  assert.equal(primera.reportes.length, 1)
  assert.equal(primera.autor.salon, '5A')
})

test('«Lo que cambió» cita lo que pensaba antes, y sus contenidos existen con su eco', () => {
  const { citaReferencia } = fixtureServidor().load('src/lib/servidor/adaptadoresRegistro.ts')
  const [ref] = jsonServidor('ruta/ruta-referencias-investigador-cierre').referencias
  assert.equal(
    citaReferencia(ref),
    'Antes de tu entrevista, sobre Electricistas pensabas: «DATO DE PRUEBA: revisa instalaciones de casas y ' +
      'edificios.». Para ejercerla: «DATO DE PRUEBA: estudiar en un instituto y practicar.». Tu duda: «¿Es peligroso?»',
  )
  assert.equal(citaReferencia({ ...ref, estado: 'SIN_DATO' }), undefined)
  const cierre = contenido('t_investigador_cierre')
  assert.equal(cierre._dato_de_prueba, true)
  const consignas = cierre.nodos.filter((n) => n.tipo === 'consigna')
  assert.deepEqual(copia(consignas.map((n) => [n.item, n.eco ?? null])), [
    ['t-cierre-cambio', ['t-ref-lo-que-pienso']],
    ['t-cierre-lista', null],
  ])
  assert.equal(contenido('t_investigador')._dato_de_prueba, true)
})

function almacenInvestigaciones() {
  const app = fixtureServidor(),
    estado = escenarioRuta('t1')
  app.fetch((req) => {
    if (esConsultaDominio(req)) return respuestaDominio(req, estado)
    if (req.url.includes('/desbloqueos?')) return { body: [] }
    if (req.url.endsWith('/investigaciones'))
      return { body: jsonServidor('ruta/ruta-investigaciones-en-curso') }
    if (req.url.includes('/entrevistas?')) return { body: jsonServidor('ruta/ruta-entrevistas-salon') }
    if (req.url.endsWith('/acciones/pedir-sugerencias-guion'))
      return { body: jsonServidor('ruta/ruta-sugerencias-guion') }
    if (req.url.endsWith('/acciones/publicar-entrevista'))
      return { body: { por_cuenta: { 'est-ana': sinRespuestas, 'est-luis': sinRespuestas } } }
    if (req.url.includes('/acciones/')) return { body: sinRespuestas }
    throw Error(`Solicitud no configurada: ${req.url}`)
  })
  const almacen = cargarAlmacen(app)
  almacen.publicar({ consultasHabilitadas: true })
  return {
    app,
    almacen,
    store: app.load('src/store/servidor/investigaciones.ts'),
    entrevistas: app.load('src/store/servidor/entrevistas.ts'),
  }
}

test('el almacén pide la sección y las listas con sus filtros; las acciones usan las rutas del backend y vencen', async () => {
  const { app, almacen, store, entrevistas } = almacenInvestigaciones()
  await almacen.refrescar()
  assert.equal((await almacen.asegurarSeccion('investigaciones')).tipo, 'ok')
  assert.equal(almacen.obtenerEstadoServidor().investigaciones.datos.en_curso.estado, 'EN_CURSO')
  app.requests.length = 0
  await entrevistas.cargarListaEntrevistas('entrevistas', {
    vista: 'SALON',
    buscar: ' luz ',
    favoritas: true,
  })
  assert.deepEqual(
    app.requests.map((r) => r.url),
    ['/api/cuentas/est-ana/entrevistas?buscar=luz&favoritas=true&vista=SALON&limite=20&desde=0'],
  )
  app.requests.length = 0
  assert.equal((await store.guardarLoQuePienso('electrician', 'a', 'b', 'c')).tipo, 'ok')
  assert.equal(almacen.obtenerEstadoServidor().investigaciones.estado, 'vencido')
  assert.equal((await store.pedirSugerenciasGuion()).datos.estado, 'LISTAS')
  const ficha = {
    titulo: 't',
    profesional: 'p',
    duracion: '5 min',
    enlace: 'https://youtu.be/dQw4w9WgXcQ',
    resumen: 'r',
  }
  assert.equal((await store.publicarEntrevista(ficha, ['est-luis'], true)).tipo, 'ok')
  assert.equal((await store.alternarFavoritoEntrevista('ENT-1', true)).tipo, 'ok')
  assert.equal((await store.reportarContenido({ reaccion: 'REA-1' }, 'OFENSIVO', null)).tipo, 'ok')
  const acciones = app.requests.filter((r) => r.url.includes('/acciones/'))
  assert.deepEqual(copia(acciones.map((r) => [r.url, r.body])), [
    [
      '/api/acciones/guardar-lo-que-pienso',
      { cuenta: 'est-ana', ocupacion: 'electrician', dia: 'a', necesita: 'b', duda: 'c' },
    ],
    ['/api/acciones/pedir-sugerencias-guion', { cuenta: 'est-ana' }],
    [
      '/api/acciones/publicar-entrevista',
      { cuenta: 'est-ana', ...ficha, coautores: ['est-luis'], permiso: true },
    ],
    ['/api/acciones/marcar-favorito', { cuenta: 'est-ana', tipo: 'ENTREVISTA', codigo: 'ENT-1' }],
    ['/api/acciones/reportar', { cuenta: 'est-ana', reaccion: 'REA-1', motivo: 'OFENSIVO', detalle: null }],
  ])
})

test('la orientadora: la tabla pide sus filtros y las acciones usan las rutas del backend con su cuenta', async () => {
  const app = fixtureServidor({ cuenta: 'ori-carmen', ruta: '/counselor/publications' })
  app.fetch((req) => {
    if (req.url.includes('/publicaciones?')) return { body: jsonServidor('ruta/ruta-publicaciones') }
    if (req.url.includes('/publicaciones/')) return { body: jsonServidor('ruta/ruta-publicacion-detalle') }
    if (req.url.includes('/acciones/')) return { body: sinRespuestas }
    throw Error(`Solicitud no configurada: ${req.url}`)
  })
  const entrevistas = app.load('src/store/servidor/entrevistas.ts')
  const store = app.load('src/store/servidor/investigaciones.ts')
  await entrevistas.cargarListaEntrevistas('publicaciones', {
    salon: '5A',
    con_reportes: true,
    buscar: 'ana',
  })
  assert.equal(await entrevistas.contarConReportes(), 1)
  const detalle = await entrevistas.cargarDetalleEntrevista('publicacion', 'ENT-1')
  assert.deepEqual(
    detalle.datos.tipos_reaccion.map((t) => t.codigo),
    ['APRENDI', 'ME_GUSTO', 'CURIOSIDAD', 'MI_CAMINO'],
  )
  assert.equal((await store.destacarEntrevista('ENT-1', false)).tipo, 'ok')
  assert.equal((await store.comentarEntrevista('ENT-1', 'Bien', 'REA-9')).tipo, 'ok')
  assert.equal((await store.descartarReporte('REP-1')).tipo, 'ok')
  assert.deepEqual(copia(app.requests.map((r) => [r.url, r.body ?? null])), [
    ['/api/cuentas/ori-carmen/publicaciones?buscar=ana&con_reportes=true&salon=5A&limite=20&desde=0', null],
    ['/api/cuentas/ori-carmen/publicaciones?con_reportes=true&limite=1&desde=0', null],
    ['/api/cuentas/ori-carmen/publicaciones/ENT-1', null],
    ['/api/acciones/destacar-entrevista', { cuenta: 'ori-carmen', entrevista: 'ENT-1', destacada: false }],
    [
      '/api/acciones/comentar-entrevista',
      { cuenta: 'ori-carmen', entrevista: 'ENT-1', texto: 'Bien', reaccion: 'REA-9' },
    ],
    ['/api/acciones/descartar-reporte', { cuenta: 'ori-carmen', reporte: 'REP-1' }],
  ])
})
