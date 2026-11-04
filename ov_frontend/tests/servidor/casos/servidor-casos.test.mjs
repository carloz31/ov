import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
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

// F04: casos y colección con los fixtures ruta-*. Ajuste carga-casos: t-caso juega hidden-plaza (6 de 8).
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
  assert.equal(caso.puntaje_minimo, 6)
  assert.equal(caso.puntaje_maximo, 8)
  assert.equal(casos.superaCaso(6, caso), true)
  assert.equal(casos.superaCaso(5, caso), false)
  assert.equal(casos.superaCaso(5, { puntaje_minimo: 5 }), true)
  assert.equal(casos.textoPuntajeCaso(7, caso), 'Puntaje: 7 de 8 · mínimo 6')
  assert.equal('dimensiones' in caso, false)
  assert.equal('puntajeCaso' in casos, false)
})

test('el estado del caso sale del servidor, con intentos y mejor puntaje en puntos', () => {
  assert.deepEqual(copia(casos.estadoCaso(caso)), {
    passed: true,
    badge: 'Superado',
    actionLabel: 'Jugar de nuevo',
    intentos: 'Intentos: 2 · Mejor puntaje: 7 de 8',
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
  // Ajuste carga-casos: sin tipos RIASEC; la temática sale del JSON del caso.
  assert.equal('textoTiposCaso' in casos, false)
})

// Ajustes post F04 (6): el drawer del caso en sus tres estados, con la escala del servidor.
test('el progreso del caso para el drawer distingue sin jugar, jugado sin superar y superado', () => {
  const nuevo = { ...caso, intentos: 0, superado: false, mejor_puntaje: null }
  assert.deepEqual(copia(casos.progresoCaso(nuevo)), {
    minimo: 6,
    maximo: 8,
    superado: false,
    invitaReintento: true,
  })
  const fallido = { ...caso, intentos: 1, superado: false, mejor_puntaje: 5 }
  assert.deepEqual(copia(casos.progresoCaso(fallido)), {
    minimo: 6,
    maximo: 8,
    mejor: 5,
    superado: false,
    invitaReintento: true,
  })
  assert.deepEqual(copia(casos.progresoCaso(caso)), {
    minimo: 6,
    maximo: 8,
    mejor: 7,
    superado: true,
    invitaReintento: true,
  })
  assert.deepEqual([resolver.puntaje_minimo, resolver.puntaje_maximo], [6, 8])
})

// Ajuste carga-casos: mantener sincronizado con CONFIGURACION_CASOS de ov_backend/datos/ruta.py (y lo comprueba
// scripts/verificar_contenido_front.py): el máximo del servidor es el total de necesidades del JSON del caso.
const CARPETA_CASOS = 'src/data/cases/plataforma'
const jsonCaso = (id) => JSON.parse(readFileSync(`${CARPETA_CASOS}/${id}.json`, 'utf8'))
const necesidadesDe = (json) => json.fases.flatMap((f) => f.problemas.map((p) => p.necesidades.length))
test('el máximo del servidor es el total de necesidades del caso del front', () => {
  const necesidades = necesidadesDe(jsonCaso('hidden-plaza'))
  assert.deepEqual(necesidades, [2, 1, 2, 2, 1])
  assert.equal(
    necesidades.reduce((a, b) => a + b, 0),
    caso.puntaje_maximo,
  )
  const contenido = JSON.parse(readFileSync('src/data/activities/contenidos/ruta/t_caso.json', 'utf8'))
  assert.equal(contenido.caso, 'hidden-plaza')
})

// Ajuste carga-casos: cada JSON de plataforma/ está registrado y se adapta a las estructuras de la Central.
test('casoDesdeJson adapta cada caso de plataforma/ con el total de necesidades y las ocupaciones del servidor', () => {
  const app = fixtureServidor()
  const { casos: registro, casoPorId } = app.load('src/data/cases/casos.ts')
  const { casoDesdeJson, totalNecesidades, fondoFase } = app.load('src/features/cases/lib/casoDesdeJson.ts')
  const archivos = readdirSync(CARPETA_CASOS).filter((n) => n.endsWith('.json')).map((n) => n.slice(0, -5))
  assert.deepEqual(Object.keys(registro).sort(), archivos.sort())
  const maximos = {
    'hidden-plaza': 8,
    'scholarship-mystery': 10,
    'harvest-race': 8,
    'thousand-voices-festival': 8,
    'impossible-teams-tournament': 8,
    'silent-lagoon': 10,
  }
  for (const id of archivos) {
    const json = jsonCaso(id)
    assert.equal(casoPorId(id), registro[id])
    assert.equal(totalNecesidades(json), maximos[id], id)
    const ocupaciones = json.profesionales.map((p) => ({
      codigo: p.onet,
      titulo: `Cargo ${p.onet}`,
      descripcion: 'Qué hace.',
      conocimientos: ['Uno'],
      aptitudes: ['Dos'],
    }))
    const jugable = casoDesdeJson(json, { titulo: 'Título', minimo: 1, maximo: maximos[id] }, ocupaciones)
    assert.equal(jugable.professionals.length, json.profesionales.length)
    assert.ok(jugable.professionals.every((p) => p.id === p.occupationId && p.name === `Cargo ${p.id}`))
    assert.deepEqual(copia(jugable.professionals[0].knowledge), ['Uno'])
    const total = jugable.phases.flatMap((f) => f.problems).reduce((t, p) => t + p.expectedProfessionalIds.length, 0)
    assert.equal(total, maximos[id])
    assert.ok(
      jugable.phases.every((f) =>
        f.problems.every((p) => p.expectedProfessionalIds.every((o) => p.professionalContributions[o])),
      ),
    )
    assert.deepEqual([jugable.titulo, jugable.tematica, jugable.presupuesto], ['Título', json.tematica, json.presupuesto])
    assert.equal(fondoFase(jugable.phases[0]), `url(${json.fases[0].fondo.imagen}), url(exploration-case-background.png)`)
  }
  assert.equal(casoPorId('forest-fire'), undefined)
  assert.equal(casoPorId('toString'), undefined)
})

test('la colección marca las ocupaciones obtenidas por su código', () => {
  const obtenidas = casos.ocupacionesObtenidas(coleccion)
  assert.ok(obtenidas.has('19-3091.00') && obtenidas.has('25-4013.00'))
  assert.equal(obtenidas.has('19-3033.00'), false)
  assert.equal(casos.ocupacionesObtenidas(null).size, 0)
})

test('resolver un caso envía puntaje y ocupaciones, sin toasts, y refresca', async () => {
  const app = fixtureServidor(),
    estado = escenarioRuta('ciudad')
  app.fetch((req) => {
    if (esConsultaDominio(req)) return respuestaDominio(req, estado)
    if (req.url.includes('/notificaciones')) return { body: { total: 0, no_vistas: 0, items: [] } }
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
  const respuesta = await store.resolverCaso('t-caso', 5, ['19-3091.00'])
  assert.equal(respuesta.tipo, 'ok')
  assert.deepEqual(copia(respuesta.datos.ocupaciones_nuevas), resolver.ocupaciones_nuevas)
  const envio = app.requests.slice(antes).find((r) => r.url.endsWith('/resolver-caso'))
  assert.deepEqual(copia(envio.body), {
    cuenta: 'est-ana',
    actividad: 't-caso',
    puntaje: 5,
    ocupaciones: ['19-3091.00'],
  })
  assert.ok(app.requests.slice(antes).some((r) => r.url.endsWith('/actividades')))
  const desbloqueos = resolver.nuevos_desbloqueos.map((d) => d.objetivo.codigo)
  assert.ok(desbloqueos.includes('t-testimonio-1'))
  // Ajuste notificaciones: el informe final del caso anuncia lo desbloqueado; nada pasa a la cola de toasts.
  assert.deepEqual(copia(almacen.obtenerNotificaciones().colaToast), [])
})

test('el caso del front se juega solo si su actividad CASO está abierta en el servidor', () => {
  const app = fixtureServidor()
  const bloques = jsonServidor('ruta/ruta-actividades-ciudad')
  const contenidos = app.load('src/lib/servidor/contenidos.ts')
  const tCaso = bloques.flatMap((b) => b.actividades).find((a) => a.codigo === 't-caso')
  Object.assign(tCaso, { visible: true, estado: 'BLOQUEADA' })
  assert.equal(contenidos.actividadDeCaso(bloques, 'hidden-plaza'), undefined)
  tCaso.estado = 'EN_CURSO'
  assert.equal(contenidos.actividadDeCaso(bloques, 'hidden-plaza'), 't-caso')
  assert.equal(contenidos.actividadDeCaso(bloques, 'forest-fire'), undefined)
})

// Ajuste carga-casos: el directorio y la hoja de vida salen de una sola petición a ocupaciones-caso, al entrar.
test('las ocupaciones del caso llegan de una vez, en el orden del directorio, con cargo y hoja de vida', async () => {
  const directorio = jsonServidor('ruta/ruta-ocupaciones-caso')
  const json = jsonCaso('hidden-plaza')
  assert.deepEqual(
    directorio.map((o) => o.codigo),
    json.profesionales.map((p) => p.onet),
  )
  for (const ocupacion of directorio) {
    assert.deepEqual(Object.keys(ocupacion).sort(), ['aptitudes', 'codigo', 'conocimientos', 'descripcion', 'titulo'])
    assert.equal(typeof ocupacion.titulo, 'string')
  }
  const app = fixtureServidor(),
    estado = escenarioRuta('ciudad')
  app.fetch((req) => {
    if (esConsultaDominio(req)) return respuestaDominio(req, estado)
    if (req.url.includes('/notificaciones')) return { body: { total: 0, no_vistas: 0, items: [] } }
    if (req.url.includes('/catalogo/ocupaciones-caso')) return { body: directorio }
    throw Error(`Solicitud no configurada: ${req.url}`)
  })
  const almacen = cargarAlmacen(app)
  almacen.publicar({ consultasHabilitadas: true })
  await almacen.refrescar()
  const store = app.load('src/store/servidor/casos.ts')
  const codigos = json.profesionales.map((p) => p.onet)
  const antes = app.requests.length
  store.cargarOcupacionesCaso(codigos)
  store.cargarOcupacionesCaso(codigos)
  await new Promise((listo) => setTimeout(listo, 0))
  const pedidas = app.requests.slice(antes).filter((r) => r.url.includes('/ocupaciones-caso'))
  assert.equal(pedidas.length, 1)
  assert.ok(decodeURIComponent(pedidas[0].url).endsWith(`/catalogo/ocupaciones-caso?codigos=${codigos.join(',')}`))
  // La hoja de vida ya no pide el detalle de la ocupación: usa lo que trae el caso.
  const hook = readFileSync('src/features/cases/hooks/useHojaDeVida.ts', 'utf8')
  assert.doesNotMatch(hook, /consultarOcupacion|useEffect/)
  assert.match(hook, /queHacen: professional\.description/)
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
