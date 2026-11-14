import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { copia, esperar, fixtureServidor, importarAislado, jsonServidor } from '../../soporte/servidor-ayudas.mjs'
import { fixtureApoderado } from '../../soporte/apoderado-ayudas.mjs'

// Ajuste panel-estudiantes (bocetos 05–12): lista y perfil del estudiante en api, con los fixtures contenido-panel-*
// de los estudiantes de ejemplo (casos 1, 5 y 7 de `sembrar_panel_ejemplo.py`).
const fx = (nombre) => jsonServidor(`contenido/contenido-panel-${nombre}`)
const html = (Component, props) =>
  renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(Component, props)))
const texto = (marcado) => marcado.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

function orientadora(fixture = fixtureApoderado) {
  const app = fixture({ cuenta: 'ori-carmen', ruta: '/counselor/students' })
  app.fetch((req) => {
    const caso = req.url.match(/estudiantes\/est-panel-(\d)/)?.[1]
    if (req.url.includes('/panel/lista-estudiantes')) return { body: fx('lista') }
    if (caso && req.url.endsWith('/tests')) return { body: fx(`${caso}-tests`) }
    if (caso && req.url.endsWith('/planes')) return { body: fx(`${caso}-planes`) }
    if (caso && req.url.endsWith('/avance')) return { body: fx(`${caso}-avance`) }
    if (caso && req.url.endsWith('/respuestas')) return { body: fx(`${caso}-respuestas`) }
    if (caso && /\/estudiantes\/est-panel-\d$/.test(req.url)) return { body: fx(`${caso}-perfil`) }
    if (req.url.endsWith('/acciones/escribir-nota'))
      return { body: { numero: 1, texto: 'Hablamos del examen.', creada_en: '2026-11-12T10:00:00', actualizada_en: '2026-11-12T10:00:00' } }
    throw Error(`Solicitud no configurada: ${req.url}`)
  })
  return app
}
const modelo = (estudiante, extra = {}) => ({ estudiante, irADestino() {}, ...extra })

test('las palabras del perfil salen de lo que llega: ingreso, tramo, zonas agrupadas y ecos', async () => {
  const a = await importarAislado('src/lib/servidor/adaptadoresPanelEstudiante.ts')
  assert.deepEqual([0, 1, 9, null].map(a.textoIngreso), ['hoy', 'ayer', 'hace 9 días', 'Nunca ingresó'])
  assert.equal(a.textoTramo({ codigo: 'SIN_EMPEZAR', numero: 0, total: 6, nombre: null }), 'Sin empezar')
  assert.deepEqual(a.avanceCabecera(fx('5-perfil').cabecera.tramo), { linea: 'Va en el tramo 6 de 6', nombre: 'Mi decisión' })
  // Caso 7: con llegada, primero lo que bajó.
  const grupos = a.gruposComoEmpezo(fx('7-perfil').partida)
  assert.equal(grupos[0].titulo, 'Bajó')
  assert.deepEqual(grupos.map((g) => g.titulo).filter((t) => t === 'Subió'), ['Subió'])
  assert.deepEqual(a.gruposComoEmpezo(fx('5-perfil').partida).map((g) => g.titulo)[0], 'Por trabajar')
  assert.equal(a.textoMedidor(1), 'Bajo')
  assert.equal(a.textoMedidor(null), 'Sin marcar')
  assert.equal(
    a.lineaEco({ forma: 'plan_a_b', planes: [{ carrera: 'Enfermería', institucion: 'UNMSM' }, { carrera: 'Obstetricia' }] }).texto,
    'Plan A · Enfermería · UNMSM — Plan B · Obstetricia',
  )
  assert.equal(a.textoOpcionales(4, 1), 'Además completó 4 misiones opcionales de la ciudad y superó 1 caso de la Central.')
  assert.equal(a.textoOpcionales(0, 0), null)
})

test('abrir el perfil hace una sola petición; cada pestaña pide la suya al abrirse y una vez por visita', async () => {
  const app = orientadora(fixtureServidor)
  const s = app.load('src/store/servidor/panelEstudiante.ts')
  const perfil = app.mount(() => s.usePerfilEstudiante('est-panel-5').carga)
  perfil.render()
  perfil.render()
  await esperar()
  assert.equal(perfil.render().datos.cabecera.codigo, 'est-panel-5')
  assert.equal(app.requests.length, 1)
  // La pestaña Tests se pide al abrirla; volver a ella en la misma visita no la pide otra vez.
  const tests = () => app.mount(() => s.useTestsPerfil('est-panel-5').carga)
  const primera = tests()
  primera.render()
  primera.render()
  await esperar()
  primera.unmount()
  const segunda = tests()
  segunda.render()
  segunda.render()
  await esperar()
  assert.equal(segunda.render().estado, 'listo')
  segunda.unmount()
  // Una pestaña cerrada no se pide.
  app.mount(() => s.usePlanesPerfil('est-panel-5', false).carga).render()
  await esperar()
  assert.deepEqual(copia(app.requests.map((r) => r.url)), [
    '/api/cuentas/ori-carmen/panel/estudiantes/est-panel-5',
    '/api/cuentas/ori-carmen/panel/estudiantes/est-panel-5/tests',
  ])
  // Otro estudiante descarta el anterior con sus pestañas.
  perfil.unmount()
  const otro = app.mount(() => s.usePerfilEstudiante('est-panel-7').carga)
  otro.render()
  otro.render()
  await esperar()
  assert.equal(otro.render().datos.cabecera.codigo, 'est-panel-7')
  assert.equal(app.mount(() => s.useTestsPerfil('est-panel-5', false).carga).render(), null)
})

test('la nota guardada se agrega al perfil cargado sin volver a pedirlo', async () => {
  const app = orientadora(fixtureServidor)
  const s = app.load('src/store/servidor/panelEstudiante.ts')
  const perfil = app.mount(() => s.usePerfilEstudiante('est-panel-5').carga)
  perfil.render()
  perfil.render()
  await esperar()
  const respuesta = await s.escribirNota('est-panel-5', 'Hablamos del examen.')
  assert.equal(respuesta.tipo, 'ok')
  assert.equal(perfil.render().datos.notas[0].texto, 'Hablamos del examen.')
  assert.equal(app.requests.filter((r) => r.url.includes('/panel/')).length, 1)
  assert.deepEqual(copia(app.requests.at(-1).body), { cuenta: 'ori-carmen', estudiante: 'est-panel-5', texto: 'Hablamos del examen.' })
})

test('la lista pinta solo sus columnas: el aviso más importante, «y N más», el test y el ingreso', () => {
  const app = orientadora()
  const { TablaEstudiantes } = app.load('src/features/counselor/components/estudiantes/TablaEstudiantes.tsx')
  const lista = fx('lista')
  const m = { columnaActiva: 'avisos', descendente: false, ordenar() {}, enlacePerfil: (c) => `/counselor/students/${c}`, consulta: '' }
  const tabla = texto(html(TablaEstudiantes, { filas: lista.items, modelo: m }))
  assert.match(tabla, /Estudiante .*Por dónde va .*Test de intereses .*Plan A .*Último ingreso .*Avisos/)
  assert.match(tabla, /Elena Espinoza León Sin empezar Sin empezar Sin plan Nunca ingresó No ingresa hace 7 días o más y 1 más/)
  assert.match(tabla, /Ver perfil/)
  assert.doesNotMatch(tabla, /%/)
  const { AccesosEstudiantes } = app.load('src/features/counselor/components/estudiantes/AccesosEstudiantes.tsx')
  const accesos = texto(html(AccesosEstudiantes, { accesos: lista.accesos, activo: '', onElegir() {} }))
  assert.match(accesos, /Todos · \d+ .*Con avisos · \d+ .*Conversar pronto · \d+ .*Sin avisos · \d+/)
})

test('el Resumen: avisos con su texto de perfil, temas para conversar, las tres tarjetas y mis notas', () => {
  const app = orientadora()
  const perfil = fx('5-perfil')
  const { AvisosParaConversar } = app.load('src/features/counselor/components/perfil/AvisosParaConversar.tsx')
  const avisos = texto(html(AvisosParaConversar, { avisos: perfil.avisos, temas: perfil.temas, nombre: 'Luciana', onIr() {} }))
  assert.match(avisos, /Conversar pronto Poca seguridad en sus últimas señales Marcó 2, 2 y 1 de 5/)
  assert.match(avisos, /Puntos que la plataforma encontró en lo que Luciana registró/)
  assert.match(avisos, /Dice conocer poco su Plan A: respondió «No» a 3 de 5 preguntas .* Ver plan/)
  assert.match(avisos, /En su punto de partida, «Confianza» quedó por trabajar\. Ver test/)
  const vacio = texto(html(AvisosParaConversar, { avisos: [], temas: [], nombre: 'Elena', onIr() {} }))
  assert.match(vacio, /Todavía no hay puntos para conversar/)
  assert.doesNotMatch(vacio, /Avisos/)
  const { TarjetasResumen } = app.load('src/features/counselor/components/perfil/TarjetasResumen.tsx')
  const tarjetas = texto(html(TarjetasResumen, { datos: perfil, onIr() {} }))
  assert.match(tarjetas, /Lo que le interesa .*Resultado listo/)
  assert.match(tarjetas, /Plan A · Psicología .*Entre sus áreas sugeridas .*Plan B · .*Plan C sin registrar/)
  assert.match(tarjetas, /Cómo empezó .*Por trabajar Confianza/)
  const llegada = texto(html(TarjetasResumen, { datos: fx('7-perfil'), onIr() {} }))
  assert.match(llegada, /De la partida a la llegada .*Bajó/)
  const nada = texto(html(TarjetasResumen, { datos: fx('1-perfil'), onIr() {} }))
  assert.match(nada, /Todavía no registra planes/)
  assert.match(nada, /Aún no responde su punto de partida/)
  const { RespuestasYNotas } = app.load('src/features/counselor/components/perfil/RespuestasYNotas.tsx')
  const notas = texto(html(RespuestasYNotas, { respuestas: perfil.respuestas, notas: [], modelo: modelo('est-panel-5', { enviando: null }) }))
  assert.match(notas, /1 de 1 registros destacados completados/)
  assert.match(notas, /1 respuesta sin contenido/)
  assert.match(notas, /Solo usted las ve\. Sirven para recordar lo conversado\..*Nueva nota.*Guardar nota/)
})

test('Tests: barras de intereses, partida y llegada en palabras con sus grupos y otros cuestionarios', () => {
  const app = orientadora()
  const { TestInteresesPerfil } = app.load('src/features/counselor/components/perfil/TestInteresesPerfil.tsx')
  const tests = fx('5-tests')
  const intereses = texto(html(TestInteresesPerfil, { test: tests.intereses, onVerCompleto() {} }))
  assert.match(intereses, /Cuánto le atrae cada tipo de actividad \(de 0 a 100\)/)
  assert.match(intereses, /Sus tres intereses más altos/)
  assert.match(intereses, /Ver resultado completo/)
  const { PartidaLlegadaPerfil } = app.load('src/features/counselor/components/perfil/PartidaLlegadaPerfil.tsx')
  const llegada = html(PartidaLlegadaPerfil, { datos: fx('7-tests').partida_llegada, onVerTodas() {} })
  assert.match(texto(llegada), /Cambio .*Bajó/)
  assert.match(texto(llegada), /Bajaron .*→/)
  assert.doesNotMatch(llegada, /puntaje/i)
  const partida = texto(html(PartidaLlegadaPerfil, { datos: tests.partida_llegada, onVerTodas() {} }))
  assert.match(partida, /Aún no responde/)
  assert.match(partida, /Cuando responda la llegada, aquí irán primero las que bajaron/)
})

test('Planes de un vistazo, plan completo y Avance sin cartas ni diario', async () => {
  const app = orientadora()
  const { VistazoPlanes } = app.load('src/features/counselor/components/perfil/VistazoPlanes.tsx')
  const planes = texto(html(VistazoPlanes, { datos: fx('7-planes'), onAbrir() {} }))
  assert.match(planes, /Sus planes, de un vistazo/)
  assert.match(planes, /No está entre sus áreas sugeridas/)
  assert.match(planes, /De mi familia/)
  assert.match(planes, /Ver Plan A completo/)
  const { PlanCompletoPerfil } = app.load('src/features/counselor/components/perfil/PlanCompletoPerfil.tsx')
  const plan = texto(html(PlanCompletoPerfil, { plan: fx('5-plan-a'), nombre: 'Luciana' }))
  assert.match(plan, /Todo lo que sigue lo registró Luciana, con sus palabras/)
  assert.match(plan, /Cómo es un día normal No/)
  assert.match(plan, /Ver las \d+ dudas restantes/)
  assert.match(plan, /Primero los pendientes/)
  const { ItemRegistroLectura } = app.load('src/features/counselor/components/perfil/ItemRegistroLectura.tsx')
  const registro = fx('5-registro')
  const items = registro.items.map((item) => texto(html(ItemRegistroLectura, { item }))).join(' ')
  assert.match(items, /Pregunta 1 · /)
  assert.match(items, /DATO DE PRUEBA: lo cuento con un ejemplo/)
  for (const nombre of ['1-avance', '5-avance', '7-avance', '5-perfil', '5-respuestas']) {
    assert.doesNotMatch(JSON.stringify(fx(nombre)), /carta|entrada privada|puntaje/i, nombre)
  }
})

test('en local, la lista y el detalle siguen siendo los de siempre', () => {
  const rutas = readFileSync('src/routes/SubrutasEstudiantes.tsx', 'utf8')
  assert.match(rutas, /<SegunModo api=\{<EstudiantesView \/>\} local=\{<StudentsView \/>\} \/>/)
  assert.match(rutas, /<SegunModo api=\{<PerfilEstudianteView \/>\} local=\{<StudentDetailView \/>\} \/>/)
})
