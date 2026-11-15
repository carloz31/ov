import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import {
  copia,
  esperar,
  fixtureServidor,
  importarAislado,
  jsonServidor,
} from '../../soporte/servidor-ayudas.mjs'
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
      return {
        body: {
          numero: 1,
          texto: 'Hablamos del examen.',
          creada_en: '2026-11-12T10:00:00',
          actualizada_en: '2026-11-12T10:00:00',
        },
      }
    throw Error(`Solicitud no configurada: ${req.url}`)
  })
  return app
}
const modelo = (estudiante, extra = {}) => ({ estudiante, irADestino() {}, ...extra })

test('las palabras del perfil salen de lo que llega: ingreso, tramo, zonas agrupadas y ecos', async () => {
  const a = await importarAislado('src/lib/servidor/adaptadoresPanelEstudiante.ts')
  assert.deepEqual([0, 1, 9, null].map(a.textoIngreso), ['hoy', 'ayer', 'hace 9 días', 'Nunca ingresó'])
  assert.equal(a.textoTramo({ codigo: 'SIN_EMPEZAR', numero: 0, total: 6, nombre: null }), 'Sin empezar')
  assert.deepEqual(a.avanceCabecera(fx('5-perfil').cabecera.tramo), {
    linea: 'Va en el tramo 6 de 6',
    nombre: 'Mi decisión',
  })
  // Caso 7: con llegada, primero lo que bajó.
  const grupos = a.gruposComoEmpezo(fx('7-perfil').partida)
  assert.equal(grupos[0].titulo, 'Bajó')
  assert.deepEqual(
    grupos.map((g) => g.titulo).filter((t) => t === 'Subió'),
    ['Subió'],
  )
  assert.deepEqual(a.gruposComoEmpezo(fx('5-perfil').partida).map((g) => g.titulo)[0], 'Por trabajar')
  // Ajuste pendientes-orientadora: las palabras del estudiante, las mismas de los temas.
  const planes = await importarAislado('src/lib/servidor/adaptadoresPlanes.ts')
  assert.deepEqual([1, 2, 3, null].map(planes.nivelMedidor), ['Poco', 'Algo', 'Mucho', 'Sin marcar'])
  assert.equal(
    a.lineaEco({
      forma: 'plan_a_b',
      planes: [{ carrera: 'Enfermería', institucion: 'UNMSM' }, { carrera: 'Obstetricia' }],
    }).texto,
    'Plan A · Enfermería · UNMSM — Plan B · Obstetricia',
  )
  assert.equal(
    a.textoOpcionales(4, 1),
    'Además completó 4 misiones opcionales de la ciudad y superó 1 caso de la Central.',
  )
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
  assert.deepEqual(copia(app.requests.at(-1).body), {
    cuenta: 'ori-carmen',
    estudiante: 'est-panel-5',
    texto: 'Hablamos del examen.',
  })
})

test('la lista pinta solo sus columnas: el aviso más importante, «y N más», el test y el ingreso', () => {
  const app = orientadora()
  const { TablaEstudiantes } = app.load('src/features/counselor/components/estudiantes/TablaEstudiantes.tsx')
  const lista = fx('lista')
  const m = {
    columnaActiva: 'avisos',
    descendente: false,
    ordenar() {},
    enlacePerfil: (c) => `/counselor/students/${c}`,
    consulta: '',
  }
  const tabla = texto(html(TablaEstudiantes, { filas: lista.items, modelo: m }))
  assert.match(tabla, /Estudiante .*Por dónde va .*Test de intereses .*Plan A .*Último ingreso .*Avisos/)
  assert.match(
    tabla,
    /Elena Espinoza León Sin empezar Sin empezar Sin plan Nunca ingresó No ingresa hace 7 días o más y 1 más/,
  )
  assert.match(tabla, /Ver perfil/)
  assert.doesNotMatch(tabla, /%/)
  const { AccesosEstudiantes } = app.load(
    'src/features/counselor/components/estudiantes/AccesosEstudiantes.tsx',
  )
  const accesos = texto(html(AccesosEstudiantes, { accesos: lista.accesos, activo: '', onElegir() {} }))
  assert.match(accesos, /Todos · \d+ .*Con avisos · \d+ .*Conversar pronto · \d+ .*Sin avisos · \d+/)
})

test('el Resumen: avisos con su texto de perfil, temas para conversar, las tres tarjetas y mis notas', () => {
  const app = orientadora()
  const perfil = fx('5-perfil')
  const { AvisosParaConversar } = app.load('src/features/counselor/components/perfil/AvisosParaConversar.tsx')
  const props = {
    avisos: perfil.avisos,
    temas: perfil.temas,
    temasVisibles: perfil.temas_visibles,
    nombre: 'Luciana',
    onIr() {},
  }
  const avisos = texto(html(AvisosParaConversar, props))
  assert.match(avisos, /Conversar pronto Poca seguridad en sus últimas señales Marcó 2, 2 y 1 de 5/)
  assert.match(avisos, /Puntos que la plataforma encontró en lo que Luciana registró/)
  assert.match(avisos, /La voz que eligió: Mamá\. Ver respuesta /)
  assert.match(
    avisos,
    /Dice conocer poco su Plan A: respondió «No» a 3 de 5 preguntas\. Tiene \d+ dudas abiertas\. Ver plan/,
  )
  // Ajuste pendientes-orientadora: el tope. El caso 5 tiene cinco temas; se ven cuatro y el enlace.
  assert.equal(perfil.temas.length, 5)
  assert.equal(perfil.temas_visibles, 4)
  assert.doesNotMatch(avisos, new RegExp(perfil.temas[4].texto.slice(0, 30)))
  assert.match(avisos, /Ver el tema restante/)
  const siete = fx('7-perfil')
  assert.match(
    texto(html(AvisosParaConversar, { ...props, temas: siete.temas })),
    /Ver los 2 temas restantes/,
  )
  const todos = texto(html(AvisosParaConversar, { ...props, temasVisibles: 5 }))
  assert.doesNotMatch(todos, /restante/)
  assert.match(todos, new RegExp(perfil.temas[4].texto.slice(0, 30)))
  assert.match(texto(html(AvisosParaConversar, { ...props, temasVisibles: 2 })), /Ver los 3 temas restantes/)
  const vacio = texto(
    html(AvisosParaConversar, { avisos: [], temas: [], temasVisibles: 4, nombre: 'Elena', onIr() {} }),
  )
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
  const notas = texto(
    html(RespuestasYNotas, {
      respuestas: perfil.respuestas,
      notas: [],
      modelo: modelo('est-panel-5', { enviando: null }),
    }),
  )
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
  const { PartidaLlegadaPerfil } = app.load(
    'src/features/counselor/components/perfil/PartidaLlegadaPerfil.tsx',
  )
  const llegada = html(PartidaLlegadaPerfil, { datos: fx('7-tests').partida_llegada, onVerTodas() {} })
  assert.match(texto(llegada), /Cambio .*Bajó/)
  assert.match(texto(llegada), /Bajaron .*→/)
  assert.doesNotMatch(llegada, /puntaje/i)
  const partida = texto(html(PartidaLlegadaPerfil, { datos: tests.partida_llegada, onVerTodas() {} }))
  assert.match(partida, /Aún no responde/)
  assert.match(partida, /Cuando responda la llegada, aquí irán primero las que bajaron/)
  assert.match(partida, /Ver detalle por dimensión/)
})

test('detalle por dimensión: sin partida, solo partida y con llegada, en el orden y con los tonos del servidor', () => {
  // Ajuste color-partida-llegada §2.
  const app = orientadora()
  const { DetallePartidaLlegada } = app.load(
    'src/features/counselor/components/perfil/DetallePartidaLlegada.tsx',
  )
  const sin = texto(html(DetallePartidaLlegada, { datos: fx('1-partida-llegada') }))
  assert.match(sin, /detalle por dimensión .*Aún no responde su punto de partida\./)
  assert.doesNotMatch(sin, /Afirmación/)

  const datosPartida = fx('5-partida-llegada')
  const partidaHtml = html(DetallePartidaLlegada, { datos: datosPartida })
  const partida = texto(partidaHtml)
  assert.match(partida, /Partida respondida el \d+ \w+\. Aún no responde la llegada\./)
  assert.ok(partida.includes(datosPartida.lectura.slice(0, 40)))
  assert.match(partida, /Respuesta baja es una de las dos opciones menos favorables/)
  for (const c of datosPartida.conteo) assert.match(partida, new RegExp(`${c.cantidad} (por trabajar|en camino|fuertes?)`))
  // Los bloques salen en el orden del servidor, con la rejilla de dos columnas.
  const posiciones = datosPartida.dimensiones.map((d) => partidaHtml.indexOf(`>${d.nombre}<`))
  assert.deepEqual(posiciones, [...posiciones].sort((a, b) => a - b))
  assert.match(partidaHtml, /lg:grid-cols-2/)
  const baja = datosPartida.dimensiones.flatMap((d) => d.afirmaciones).find((a) => a.partida_baja)
  assert.ok(baja, 'el caso 5 tiene alguna respuesta baja')
  assert.match(partidaHtml, new RegExp(`bg-warning-soft text-warning-text">${baja.partida}<`))
  assert.doesNotMatch(partidaHtml, /puntaje|Cambio</i)

  const datosLlegada = fx('7-partida-llegada')
  const llegadaHtml = html(DetallePartidaLlegada, { datos: datosLlegada })
  const llegada = texto(llegadaHtml)
  assert.match(llegada, /Partida respondida el \d+ \w+ y llegada el \d+ \w+\./)
  assert.match(llegada, /\d+ bajó|\d+ bajaron/)
  assert.match(llegada, /Bajó Sigue baja Mejoró Igual/)
  assert.match(llegada, /Afirmación Partida · .* Llegada · .* Cambio/)
  assert.doesNotMatch(llegadaHtml, /lg:grid-cols-2/)
  const sigue = datosLlegada.dimensiones.flatMap((d) => d.afirmaciones).find((a) => a.cambio === 'SIGUE_BAJA')
  assert.ok(sigue, 'el caso 7 tiene una afirmación que sube y sigue baja')
  assert.match(llegadaHtml, /bg-warning-soft text-warning-text">Sigue baja</)
  assert.match(llegadaHtml, /bg-success-soft text-success-text">Mejoró</)
  assert.match(llegada, new RegExp(`${datosLlegada.dimensiones[0].nombre} .*→`))
  assert.doesNotMatch(llegadaHtml, /puntaje/i)
})

test('Planes de un vistazo, plan completo y Avance sin cartas ni diario', async () => {
  const app = orientadora()
  const { VistazoPlanes } = app.load('src/features/counselor/components/perfil/VistazoPlanes.tsx')
  const planes = texto(html(VistazoPlanes, { datos: fx('7-planes'), onAbrir() {} }))
  assert.match(planes, /Sus planes, de un vistazo/)
  assert.match(planes, /No está entre sus áreas sugeridas/)
  assert.match(planes, /De mi familia/)
  assert.match(planes, /Me entusiasma: Poco · Me siento capaz: \S+/)
  assert.doesNotMatch(planes, /Entusiasmo (bajo|medio|alto)/)
  assert.match(planes, /Ver Plan A completo/)
  const { PlanCompletoPerfil } = app.load('src/features/counselor/components/perfil/PlanCompletoPerfil.tsx')
  const plan = texto(html(PlanCompletoPerfil, { plan: fx('5-plan-a'), nombre: 'Luciana' }))
  assert.match(plan, /Todo lo que sigue lo registró Luciana, con sus palabras/)
  assert.match(plan, /Cómo es un día normal No/)
  assert.match(plan, /Ver las \d+ dudas restantes/)
  assert.match(plan, /Me entusiasma Mucho Me siento capaz Algo Tengo cómo lograrlo Poco/)
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

test('auditoría F1: el buscador de la lista espera 300 ms sin escribir antes de pasar el texto a la URL', async () => {
  const app = orientadora()
  const { useEstudiantesLista, ESPERA_BUSQUEDA } = app.load(
    'src/features/counselor/hooks/useEstudiantesLista.ts',
  )
  assert.equal(ESPERA_BUSQUEDA, 300)
  const vista = app.mount(() => useEstudiantesLista())
  let modelo = vista.render()
  for (const texto of ['a', 'an', 'ana']) {
    modelo.buscar(texto)
    modelo = vista.render()
  }
  assert.equal(app.cambiosQuery.length, 0)
  await new Promise((resolve) => setTimeout(resolve, ESPERA_BUSQUEDA + 50))
  assert.equal(app.cambiosQuery.length, 1)
  assert.equal(app.cambiosQuery[0](new URLSearchParams('salon=5A')).toString(), 'salon=5A&q=ana')
  vista.unmount()
})

// Auditoría del panel: la lista con una página de 13 de 26 (como si hubiera más), para «Mostrar más».
function conPaginas() {
  const app = orientadora(fixtureServidor)
  app.fetch((req) => {
    if (req.url.includes('/panel/lista-estudiantes')) return { body: { ...fx('lista'), total: 26 } }
    const caso = req.url.match(/estudiantes\/est-panel-(\d)/)?.[1]
    if (caso && /\/estudiantes\/est-panel-\d$/.test(req.url)) return { body: fx(`${caso}-perfil`) }
    if (req.url.endsWith('/acciones/escribir-nota'))
      return {
        body: {
          numero: 9,
          texto: 'N',
          creada_en: '2026-11-12T10:00:00',
          actualizada_en: '2026-11-12T10:00:00',
        },
      }
    throw Error(`Solicitud no configurada: ${req.url}`)
  })
  return app
}
const listas = (app) => app.requests.map((r) => r.url).filter((u) => u.includes('lista-estudiantes'))

test('auditoría F2–F4: la lista no repite lo que está en camino, espera con la última página y revalida lo ampliado', async () => {
  const app = conPaginas()
  const s = app.load('src/store/servidor/panelEstudiante.ts')
  const A = { salon: '5A', orden: '' }
  const B = { salon: '5A', orden: 'estudiante' }
  // F4: dos pedidos de la misma lista, una sola petición; «Reintentar» (forzar) sí pide.
  await Promise.all([s.cargarListaEstudiantes(A), s.cargarListaEstudiantes(A)])
  assert.equal(listas(app).length, 1)
  await s.cargarListaEstudiantes(A, false, true)
  assert.equal(listas(app).length, 2)
  // F3: con «Mostrar más», revalidar pide de una vez las filas que ya mostraba.
  await s.cargarListaEstudiantes(A, true)
  const leer = (filtros) => app.mount(() => s.useListaEstudiantes(filtros, false).lista).render()
  const filas = leer(A).pagina.items.length
  assert.ok(filas > fx('lista').items.length)
  await s.cargarListaEstudiantes(A)
  assert.match(listas(app).at(-1), new RegExp(`limite=${filas}&desde=0$`))
  assert.equal(leer(A).pagina.items.length, fx('lista').items.length)
  // F2: con otro orden, la vista espera con la última página; la nueva la reemplaza al llegar.
  const ultima = leer(A).pagina
  const enCamino = s.cargarListaEstudiantes(B)
  assert.equal(leer(B).pagina, null)
  assert.equal(leer(B).anterior, ultima)
  assert.equal(leer(B).estado, 'cargando')
  await enCamino
  assert.equal(leer(B).anterior, null)
  assert.equal(leer(B).estado, 'listo')
  assert.doesNotMatch(listas(app).at(-1), /limite=/)
})

test('auditoría F7: el borrador de la nota nueva sigue con la visita del perfil y se descarta al guardar o salir', async () => {
  const app = conPaginas()
  const s = app.load('src/store/servidor/panelEstudiante.ts')
  const api = app.load('src/services/api/panelEstudiante.ts')
  await s.cargarSeccion('est-panel-5', 'perfil', (c) => api.obtenerPerfil(c, 'est-panel-5'))
  s.guardarBorrador('est-panel-5', 'Hablar del examen')
  assert.equal(s.borradorNota('est-panel-5'), 'Hablar del examen')
  assert.equal(s.borradorNota('est-panel-7'), '')
  await s.escribirNota('est-panel-5', 'Hablar del examen')
  assert.equal(s.borradorNota('est-panel-5'), '')
  s.guardarBorrador('est-panel-5', 'Otra')
  s.descartarPerfil('est-panel-5')
  assert.equal(s.borradorNota('est-panel-5'), '')
})
