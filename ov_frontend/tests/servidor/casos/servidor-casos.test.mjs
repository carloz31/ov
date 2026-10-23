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

test('el puntaje es el porcentaje de la satisfacción máxima y el umbral lo da el servidor', () => {
  assert.equal(casos.puntajeCaso(9, 14), 64.3)
  assert.equal(casos.puntajeCaso(14, 14), 100)
  assert.equal(casos.puntajeCaso(0, 14), 0)
  assert.equal(caso.puntaje_minimo, 60)
  assert.equal(casos.superaCaso(64.3, caso), true)
  assert.equal(casos.superaCaso(59.9, caso), false)
  assert.equal(casos.superaCaso(59.9, { puntaje_minimo: 50 }), true)
  assert.equal(casos.textoPuntajeCaso(64.3, caso), 'Puntaje: 64 % · mínimo 60 %')
})

test('el estado del caso sale del servidor, con intentos y mejor puntaje en porcentaje', () => {
  assert.deepEqual(copia(casos.estadoCaso(caso)), {
    passed: true,
    badge: 'Superado',
    actionLabel: 'Jugar de nuevo',
    intentos: 'Intentos: 2 · Mejor puntaje: 80 %',
  })
  const fallido = { ...caso, estado: 'EN_CURSO', superado: false, intentos: 1, mejor_puntaje: 10 }
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
  const respuesta = await store.resolverCaso('t-caso', 64.3, ['firefighter'])
  assert.equal(respuesta.tipo, 'ok')
  assert.deepEqual(copia(respuesta.datos.ocupaciones_nuevas), resolver.ocupaciones_nuevas)
  const envio = app.requests.slice(antes).find((r) => r.url.endsWith('/resolver-caso'))
  assert.deepEqual(copia(envio.body), {
    cuenta: 'est-ana',
    actividad: 't-caso',
    puntaje: 64.3,
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
test('la hoja de vida usa título, descripción, conocimientos y habilidades del detalle de ocupación', () => {
  const ocupacion = jsonServidor('ruta/ruta-catalogo-ocupacion-psychologist')
  assert.equal(ocupacion.codigo, 'psychologist')
  assert.equal(typeof ocupacion.titulo, 'string')
  assert.equal(typeof ocupacion.descripcion, 'string')
  assert.ok(Array.isArray(ocupacion.conocimientos) && ocupacion.conocimientos.length > 0)
  assert.ok(Array.isArray(ocupacion.habilidades) && ocupacion.habilidades.length > 0)
  const hook = readFileSync('src/features/cases/hooks/useHojaDeVida.ts', 'utf8')
  assert.match(hook, /consultarOcupacion\(professional\.occupationId\)/)
  assert.match(readFileSync('src/services/api/catalogo.ts', 'utf8'), /\/catalogo\/ocupaciones\//)
})

// Ajustes post F04 (5): los íconos nuevos llegan con su título y el cierre vuelve al mapa de origen.
test('resolver-caso entrega los íconos nuevos con código y título', () => {
  assert.ok(resolver.ocupaciones_nuevas.length > 0)
  for (const icono of resolver.ocupaciones_nuevas) assert.deepEqual(Object.keys(icono).sort(), ['codigo', 'titulo'])
  const retorno = readFileSync('src/features/cases/hooks/useRetornoCaso.ts', 'utf8')
  assert.match(retorno, /'Volver al mapa', ruta: appPaths\.student\.missions/)
  assert.match(retorno, /'Volver a la Ciudad', ruta: appPaths\.student\.exploration/)
  assert.match(readFileSync('src/features/adventure/hooks/useMapInteraction.ts', 'utf8'), /navigate\(detail\.href, \{ state: origen \}\)/)
})
