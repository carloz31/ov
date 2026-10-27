import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'
import {
  cargarAlmacen,
  copia,
  escenarioRuta,
  esConsultaDominio,
  fixtureServidor,
  jsonServidor,
  respuestaDominio,
} from '../../soporte/servidor-ayudas.mjs'

// F04: casos y colección con los fixtures ruta-*.
const source = readFileSync('src/lib/servidor/adaptadoresCasos.ts', 'utf8')
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 },
}).outputText
const casos = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
const [caso] = jsonServidor('ruta/ruta-casos')
const resolver = jsonServidor('ruta/ruta-resolver-caso')
const coleccion = jsonServidor('ruta/ruta-coleccion')

test('los adaptadores de casos solo importan tipos', () => {
  assert.ok([...source.matchAll(/^import\s+(.+)$/gm)].every((match) => match[1].startsWith('type ')))
})

test('el puntaje es en puntos de satisfacción y el umbral y el máximo los da el servidor', () => {
  assert.equal(caso.puntaje_minimo, 10)
  assert.equal(caso.puntaje_maximo, 14)
  assert.equal(casos.superaCaso(10, caso), true)
  assert.equal(casos.superaCaso(9, caso), false)
  assert.equal(casos.superaCaso(5, { puntaje_minimo: 5 }), true)
  assert.equal(casos.textoPuntajeCaso(12, caso), 'Puntaje: 12 de 14 · mínimo 10')
  assert.equal('puntajeCaso' in casos, false)
})

test('el estado del caso sale del servidor, con intentos y mejor puntaje en puntos', () => {
  assert.deepEqual(copia(casos.estadoCaso(caso)), {
    passed: true,
    badge: 'Superado',
    actionLabel: 'Jugar de nuevo',
    intentos: 'Intentos: 2 · Mejor puntaje: 12 de 14',
  })
  const fallido = { ...caso, estado: 'EN_CURSO', superado: false, intentos: 1, mejor_puntaje: 1 }
  assert.equal(casos.estadoCaso(fallido).badge, 'En progreso')
  assert.equal(casos.estadoCaso(fallido).actionLabel, 'Intentar de nuevo')
  const nuevo = { ...caso, estado: 'DISPONIBLE', superado: false, intentos: 0, mejor_puntaje: null }
  assert.deepEqual(copia(casos.estadoCaso(nuevo)), {
    passed: false,
    badge: 'Disponible',
    actionLabel: 'Iniciar',
    intentos: null,
  })
  assert.equal(casos.textoTiposCaso(caso, { R: 'Realista', S: 'Social' }), 'Tipo del caso: Realista · Social')
})

// Ajustes post F04 (6): el drawer del caso en sus tres estados, con la escala del servidor.
test('el progreso del caso para el drawer distingue sin jugar, jugado sin superar y superado', () => {
  const nuevo = { ...caso, intentos: 0, superado: false, mejor_puntaje: null }
  assert.deepEqual(copia(casos.progresoCaso(nuevo)), {
    minimo: 10,
    maximo: 14,
    superado: false,
    invitaReintento: true,
  })
  const fallido = { ...caso, intentos: 1, superado: false, mejor_puntaje: 6 }
  assert.deepEqual(copia(casos.progresoCaso(fallido)), {
    minimo: 10,
    maximo: 14,
    mejor: 6,
    superado: false,
    invitaReintento: true,
  })
  assert.deepEqual(copia(casos.progresoCaso(caso)), {
    minimo: 10,
    maximo: 14,
    mejor: 12,
    superado: true,
    invitaReintento: true,
  })
  assert.deepEqual([resolver.puntaje_minimo, resolver.puntaje_maximo], [10, 14])
})

// Mantener sincronizado con CONFIGURACION_CASOS de ov_backend/datos/ruta.py: el máximo del servidor es
// el total de necesidades del contenido del caso (expectedProfessionalIds por problema).
test('el máximo del servidor es el total de necesidades del caso del front', () => {
  const app = fixtureServidor()
  const { forestFirePhases } = app.load('src/data/content/forestFireCase.ts')
  const necesidades = forestFirePhases.flatMap((f) => f.problems.map((p) => p.expectedProfessionalIds.length))
  assert.deepEqual(copia(necesidades), [2, 3, 3, 1, 2, 3])
  assert.equal(
    necesidades.reduce((a, b) => a + b, 0),
    caso.puntaje_maximo,
  )
  const { FOREST_FIRE_MAX_SATISFACTION } = app.load('src/features/cases/lib/forestFireCaseLogic.ts')
  assert.equal(FOREST_FIRE_MAX_SATISFACTION, caso.puntaje_maximo)
})

test('la colección marca las ocupaciones obtenidas por su código', () => {
  const obtenidas = casos.ocupacionesObtenidas(coleccion)
  assert.ok(obtenidas.has('firefighter') && obtenidas.has('paramedic'))
  assert.equal(obtenidas.has('psychologist'), false)
  assert.equal(casos.ocupacionesObtenidas(null).size, 0)
})

test('resolver un caso envía puntaje y ocupaciones, incorpora sus desbloqueos y refresca', async () => {
  const app = fixtureServidor(),
    estado = escenarioRuta('ciudad')
  app.fetch((req) => {
    if (esConsultaDominio(req)) return respuestaDominio(req, estado)
    if (req.url.includes('/desbloqueos?')) return { body: [] }
    if (req.url.endsWith('/casos')) return { body: [caso] }
    if (req.url.endsWith('/coleccion')) return { body: coleccion }
    if (req.url.endsWith('/resolver-caso')) return { body: resolver }
    throw Error(`Solicitud no configurada: ${req.url}`)
  })
  const almacen = cargarAlmacen(app)
  almacen.publicar({ consultasHabilitadas: true })
  await almacen.refrescar()
  const store = app.load('src/store/servidor/casos.ts')
  assert.deepEqual(copia(await store.consultarCasos()), { tipo: 'ok', datos: [caso] })
  assert.deepEqual(copia(await store.consultarColeccion()), { tipo: 'ok', datos: coleccion })
  const antes = app.requests.length
  const respuesta = await store.resolverCaso('t-caso', 9, ['firefighter'])
  assert.equal(respuesta.tipo, 'ok')
  assert.deepEqual(copia(respuesta.datos.ocupaciones_nuevas), resolver.ocupaciones_nuevas)
  const envio = app.requests.slice(antes).find((r) => r.url.endsWith('/resolver-caso'))
  assert.deepEqual(copia(envio.body), {
    cuenta: 'est-ana',
    actividad: 't-caso',
    puntaje: 9,
    ocupaciones: ['firefighter'],
  })
  assert.ok(app.requests.slice(antes).some((r) => r.url.endsWith('/actividades')))
  const desbloqueos = resolver.nuevos_desbloqueos.map((d) => d.objetivo.codigo)
  assert.ok(desbloqueos.includes('t-testimonio-1'))
  assert.ok(
    desbloqueos.every((codigo) =>
      almacen.obtenerEstadoServidor().desbloqueosAccion.some((d) => d.objetivo.codigo === codigo),
    ),
  )
})

test('el caso del front se juega solo si su actividad CASO está abierta en el servidor', () => {
  const app = fixtureServidor()
  const bloques = jsonServidor('ruta/ruta-actividades-ciudad')
  const contenidos = app.load('src/lib/servidor/contenidos.ts')
  const tCaso = bloques.flatMap((b) => b.actividades).find((a) => a.codigo === 't-caso')
  Object.assign(tCaso, { visible: true, estado: 'BLOQUEADA' })
  assert.equal(contenidos.actividadDeCaso(bloques, 'forest-fire'), undefined)
  tCaso.estado = 'EN_CURSO'
  assert.equal(contenidos.actividadDeCaso(bloques, 'forest-fire'), 't-caso')
  assert.equal(contenidos.actividadDeCaso(bloques, 'neighborhood-radio'), undefined)
})

// Ajustes post F04 (2): la hoja de vida de la Central lee la ocupación del catálogo del servidor.
test('la hoja de vida usa título, descripción, conocimientos y aptitudes del detalle de ocupación', () => {
  const ocupacion = jsonServidor('ruta/ruta-catalogo-ocupacion-psychologist')
  assert.equal(ocupacion.codigo, 'psychologist')
  assert.equal(typeof ocupacion.titulo, 'string')
  assert.equal(typeof ocupacion.descripcion, 'string')
  assert.ok(Array.isArray(ocupacion.conocimientos) && ocupacion.conocimientos.length > 0)
  assert.ok(Array.isArray(ocupacion.aptitudes) && ocupacion.aptitudes.length > 0)
  const hook = readFileSync('src/features/cases/hooks/useHojaDeVida.ts', 'utf8')
  assert.match(hook, /consultarOcupacion\(professional\.occupationId\)/)
  assert.match(readFileSync('src/services/api/catalogo.ts', 'utf8'), /\/catalogo\/ocupaciones\//)
})

// Ajustes post F04 (7): el cierre del caso muestra sus desbloqueos como el de una batalla; el testimonio va a
// Recursos (`?kind=testimonial&ficha=`) y se abre allí, no encima del cierre.
test('los desbloqueos del intento superado incluyen el testimonio que regala el caso', () => {
  const app = fixtureServidor()
  const { resumirCierre } = app.load('src/features/activities/lib/finishSummary.ts')
  const resumen = resumirCierre({
    desbloqueos: resolver.nuevos_desbloqueos,
    yaCompletada: false,
    completada: true,
    tienePreguntaDiario: false,
    modoApi: true,
  })
  // Ajuste mochila: el segundo testimonio pide además el proyecto; el caso regala solo el primero.
  assert.deepEqual(copia(resumen.testimonios.map((t) => [t.codigo, t.nombre])), [
    ['t-testimonio-1', 'Calma y cuidado en una emergencia'],
  ])
  const pagina = readFileSync('src/pages/student/ForestFireCasePage.tsx', 'utf8')
  assert.match(
    pagina,
    /renderDesbloqueos=\{\(desbloqueos\) => <DesbloqueosCierre desbloqueos=\{desbloqueos\} \/>\}/,
  )
  assert.doesNotMatch(pagina, /VisorRecursoHost/)
  assert.match(
    readFileSync('src/features/activities/components/FinishBackpackSection.tsx', 'utf8'),
    /kind: 'testimonial', ficha: t\.codigo/,
  )
})

// Ajustes post F04 (5): los íconos nuevos llegan con su título y el cierre vuelve al mapa de origen.
test('resolver-caso entrega los íconos nuevos con código y título', () => {
  assert.ok(resolver.ocupaciones_nuevas.length > 0)
  for (const icono of resolver.ocupaciones_nuevas)
    assert.deepEqual(Object.keys(icono).sort(), ['codigo', 'titulo'])
  const retorno = readFileSync('src/features/cases/hooks/useRetornoCaso.ts', 'utf8')
  assert.match(retorno, /'Volver al mapa', ruta: appPaths\.student\.missions/)
  assert.match(retorno, /'Volver a la Ciudad', ruta: appPaths\.student\.exploration/)
  assert.match(
    readFileSync('src/features/adventure/hooks/useMapInteraction.ts', 'utf8'),
    /navigate\(detail\.href, \{ state: origen \}\)/,
  )
})
