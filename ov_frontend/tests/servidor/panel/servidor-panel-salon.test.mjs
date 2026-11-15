import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { copia, esperar, fixtureServidor, jsonServidor } from '../../soporte/servidor-ayudas.mjs'
import { fixtureApoderado } from '../../soporte/apoderado-ayudas.mjs'

// Ajuste panel-salon (bocetos 01–04): el panel del salón de la orientadora en api, con los fixtures ruta-panel-*.
const SEGUIMIENTO = jsonServidor('ruta/ruta-panel-seguimiento')
const INTERESES = jsonServidor('ruta/ruta-panel-intereses')
const html = (Component, props) =>
  renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(Component, props)))
const texto = (marcado) => marcado.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

// El entorno de los portales (`fixtureApoderado`) es el que permite cargar features/ y pages/ de la orientadora.
function orientadora(opciones = {}, fixture = fixtureApoderado) {
  const app = fixture({ cuenta: 'ori-carmen', ruta: '/counselor/home', ...opciones })
  app.fetch((req) => {
    if (req.url.includes('/panel/seguimiento')) return { body: SEGUIMIENTO }
    if (req.url.includes('/panel/intereses')) return { body: INTERESES }
    if (req.url.includes('/panel/areas')) return { body: jsonServidor('ruta/ruta-panel-areas') }
    if (req.url.includes('/panel/instituciones'))
      return { body: jsonServidor('ruta/ruta-panel-instituciones') }
    if (req.url.includes('/panel/estudiantes')) return { body: jsonServidor('ruta/ruta-panel-estudiantes') }
    throw Error(`Solicitud no configurada: ${req.url}`)
  })
  return app
}

test('los textos del panel se arman con lo que llega: nombres, bandas, instituciones, fecha y orden', () => {
  const a = orientadora().load('src/lib/servidor/adaptadoresPanel.ts')
  assert.equal(a.nombreCorto('Camila Rojas Pérez'), 'Camila R.')
  assert.equal(a.nombreCorto('Ana'), 'Ana')
  assert.deepEqual(
    [
      { desde: 1, hasta: 2 },
      { desde: 3, hasta: 3 },
      { desde: 2, hasta: 5 },
    ].map(a.textoBanda),
    ['1 o 2', '3', 'de 2 a 5'],
  )
  assert.equal(a.textoInstitucion('UNIVERSIDAD', 'PUBLICA'), 'Universidad pública')
  assert.equal(a.textoInstitucion('INSTITUTO', 'PRIVADA'), 'Instituto privado')
  assert.equal(a.textoInstitucion('FFAA_POLICIA', 'PUBLICA'), 'Fuerzas Armadas y Policía')
  assert.equal(
    a.textoDesglose([
      { tipo: 'UNIVERSIDAD', gestion: 'PUBLICA', cantidad: 3 },
      { tipo: 'UNIVERSIDAD', gestion: 'PRIVADA', cantidad: 3 },
      { tipo: null, gestion: null, cantidad: 1 },
    ]),
    '3 en universidad pública · 3 en privada · 1 sin institución',
  )
  assert.equal(a.fechaPanel('2026-11-13'), 'viernes 13 de noviembre')
  assert.equal(a.alternarOrden('-en_planes', 'en_planes'), 'en_planes')
  assert.equal(a.alternarOrden('en_planes', 'en_planes'), '-en_planes')
  assert.equal(a.alternarOrden('-en_planes', 'solo_favoritos'), '-solo_favoritos')
  assert.equal(a.alternarOrden('-en_planes', 'nombre'), 'nombre')
  assert.equal(a.ordenValido('-otra'), '-en_planes')
  assert.equal(a.etiquetasCuestionario.CAMINO, 'Parte del camino')
})

test('el almacén pide cada lectura con el salón y la revalida al volver a montarla, mostrando lo cargado', async () => {
  // El almacén se monta con los hooks del entorno base (store/ no es una vista).
  const app = orientadora({}, fixtureServidor)
  const panel = app.load('src/store/servidor/panel.ts')
  const vista = (salon) => app.mount(() => panel.useSeguimientoPanel(salon).carga)
  const primera = vista('5A')
  assert.equal(primera.render(), null) // el efecto pide al montar
  assert.equal(primera.render().estado, 'cargando')
  await esperar()
  assert.equal(primera.render().datos.total_estudiantes, 5)
  primera.unmount()
  // Al volver a montarla se pide de nuevo, sin dejar de mostrar lo que había.
  const segunda = vista('5A')
  segunda.render()
  assert.equal(segunda.render().estado, 'listo')
  await esperar()
  segunda.unmount()
  const todos = vista('')
  todos.render()
  await esperar()
  todos.unmount()
  await panel.cargarListaPanel('areas', { salon: '5A', orden: 'nombre', buscar: 'psi', tipo: '' })
  app.mount(() => panel.useEstudiantesPanel('5A', 'alerta', 'sin-ingreso')).render()
  await esperar()
  assert.deepEqual(copia(app.requests.map((r) => r.url)), [
    '/api/cuentas/ori-carmen/panel/seguimiento?salon=5A',
    '/api/cuentas/ori-carmen/panel/seguimiento?salon=5A',
    '/api/cuentas/ori-carmen/panel/seguimiento',
    '/api/cuentas/ori-carmen/panel/areas?salon=5A&orden=nombre&buscar=psi&limite=20&desde=0',
    '/api/cuentas/ori-carmen/panel/estudiantes?salon=5A&conjunto=alerta&valor=sin-ingreso',
  ])
})

test('Seguimiento pinta lo que llega del servidor: indicadores, avisos, test, camino y seguridad', () => {
  const app = orientadora()
  const cargar = (archivo) => app.load(`src/features/counselor/components/panel/${archivo}.tsx`)
  const onVer = () => {}
  const indicadores = texto(html(cargar('IndicadoresPanel').IndicadoresPanel, { datos: SEGUIMIENTO }))
  assert.match(indicadores, /Ingresaron esta semana 0 de 5/)
  assert.match(indicadores, /5 no entran hace 7 días o más/)
  assert.match(indicadores, /Test de intereses listo 1 de 5/)
  assert.match(indicadores, /0 terminaron su ruta|2 terminaron su ruta/)
  const avisos = texto(html(cargar('AQuienBuscar').AQuienBuscar, { datos: SEGUIMIENTO, onVer }))
  assert.match(avisos, /5 de 5 estudiantes tienen al menos un aviso/)
  assert.match(avisos, /Se están quedando atrás/)
  assert.match(avisos, /No ingresan hace 7 días o más/)
  assert.match(avisos, /Ver los 5 estudiantes con avisos/)
  assert.doesNotMatch(avisos, /Conversar pronto/)
  const sinAvisos = { ...SEGUIMIENTO, avisos: { con_avisos: 0, grupos: [] } }
  assert.match(
    texto(html(cargar('AQuienBuscar').AQuienBuscar, { datos: sinAvisos, onVer })),
    /Ningún estudiante tiene avisos por ahora/,
  )
  const cuestionarios = cargar('CuestionariosPanel')
  const test_ = texto(html(cuestionarios.BloqueTest, { datos: SEGUIMIENTO, onVer }))
  assert.match(test_, /Test de intereses Requisito del salón/)
  assert.match(test_, /Es la base de su informe\. Aquí ve quién/)
  const otros = texto(html(cuestionarios.OtrosCuestionarios, { datos: SEGUIMIENTO }))
  assert.match(otros, /Punto de partida Parte del camino 2 de 5/)
  const camino = cargar('CaminoPanel')
  assert.match(texto(html(camino.PorDondeVa, { datos: SEGUIMIENTO, onVer })), /3 Sin empezar/)
  const detenidos = { actividad: 't-llegada', titulo: 'Punto de llegada', cantidad: 2, dias: 7 }
  const tramos = texto(html(camino.PorDondeVa, { datos: { ...SEGUIMIENTO, detenidos }, onVer }))
  assert.match(tramos, /Donde más se detienen: «Punto de llegada»\. 2 estudiantes llevan más de 7 días ahí/)
  const seguridad = texto(html(camino.ComoSeSienten, { datos: SEGUIMIENTO, onVer }))
  assert.match(seguridad, /Poco seguros \(1 o 2\)/)
  assert.match(seguridad, /Intermedio \(3\)/)
  assert.match(seguridad, /Seguros \(4 o 5\)/)
  assert.match(seguridad, /El diario es privado/)
})

test('Intereses: tablas ordenables, formación, complicaciones y planes frente al test', () => {
  const app = orientadora()
  const { TablaInteres } = app.load('src/features/counselor/components/panel/TablaInteres.tsx')
  const tabla = html(TablaInteres, {
    filas: INTERESES.areas.filas,
    columnas: ['en_planes', 'plan_a', 'solo_favoritos'],
    tituloNombre: 'Área y carreras',
    orden: '-en_planes',
    onOrdenar() {},
    onVer() {},
  })
  assert.match(tabla, /aria-sort="descending"/)
  assert.match(texto(tabla), /Psicología Psicología \(2\) 2 2 0/)
  assert.match(texto(tabla), /Sin planes todavía/)
  const resumen = app.load('src/features/counselor/components/panel/ResumenIntereses.tsx')
  const formacion = texto(html(resumen.TipoFormacion, { datos: INTERESES }))
  assert.match(formacion, /Según el Plan A de 2 estudiantes/)
  assert.match(formacion, /Universitaria 1 en universidad pública · 1 sin institución/)
  assert.match(texto(html(resumen.Complicaciones, { datos: INTERESES })), /1 Económicas/)
  const frente = texto(html(resumen.PlanesFrenteTest, { datos: INTERESES, onVer() {} }))
  assert.match(frente, /De los 1 estudiantes que tienen Plan A y resultado del test/)
  assert.match(frente, /No es un error: es un tema para conversar/)
  assert.match(frente, /Investigativa \(1\), de 1 resultados listos/)
})

test('en local el Inicio sigue siendo el panel congelado y las listas vuelven al Inicio', () => {
  const rutas = readFileSync('src/routes/SubrutasPanelSalon.tsx', 'utf8')
  assert.match(rutas, /<SegunModo api=\{<PanelSalonView \/>\} local=\{<CounselorDashboardView \/>\} \/>/)
  assert.match(rutas, /api=\{<PanelAreasView \/>\} local=\{alInicio\}/)
  assert.match(rutas, /api=\{<PanelInstitucionesView \/>\} local=\{alInicio\}/)
  const local = fixtureServidor({ api: false, cuenta: null }).load('src/routes/SegunModo.tsx')
  assert.equal(local.SegunModo({ api: 'api', local: 'local' }), 'local')
  assert.equal(
    orientadora().load('src/routes/SegunModo.tsx').SegunModo({ api: 'api', local: 'local' }),
    'api',
  )
})

test('auditoría H8: reordenar una tabla de Intereses pide solo esa lista con el tope de Inicio', async () => {
  const app = orientadora({}, fixtureServidor)
  const panel = app.load('src/store/servidor/panel.ts')
  const orden = { areas: '-en_planes', instituciones: '-en_planes' }
  const vista = app.mount(() => panel.useInteresesPanel('5A', orden.areas, orden.instituciones))
  vista.render()
  await esperar()
  let modelo = vista.render()
  assert.deepEqual(copia(modelo.areas.filas), copia(INTERESES.areas.filas))
  const tope = INTERESES.areas.filas.length
  const antes = app.requests.length
  orden.areas = 'nombre'
  modelo = vista.render()
  // Mientras llega el nuevo orden, la tabla conserva sus filas.
  assert.deepEqual(copia(modelo.areas.filas), copia(INTERESES.areas.filas))
  await esperar()
  modelo = vista.render()
  const nuevas = app.requests.slice(antes).map((r) => r.url)
  assert.deepEqual(nuevas, [`/api/cuentas/ori-carmen/panel/areas?salon=5A&orden=nombre&limite=${tope}&desde=0`])
  assert.deepEqual(copia(modelo.areas.filas), copia(jsonServidor('ruta/ruta-panel-areas').items))
  assert.deepEqual(copia(modelo.instituciones.filas), copia(INTERESES.instituciones.filas))
  assert.equal(modelo.areas.total, INTERESES.areas.total)
  vista.unmount()
})

test('auditoría F4–F5: una lectura en camino no se repite y el almacén poda lo viejo que nadie mira', async () => {
  const app = orientadora({}, fixtureServidor)
  const panel = app.load('src/store/servidor/panel.ts')
  const api = app.load('src/services/api/panel.ts')
  const sesion = app.load('src/store/servidor/sesion.ts').sesionServidor()
  const llave = (salon) => `${sesion}:${panel.llaveSeguimiento(salon)}`
  const pedir = (salon) => (cuenta) => api.obtenerSeguimiento(cuenta, salon)
  const seguimientos = () => app.requests.filter((r) => r.url.includes('/panel/seguimiento')).length
  await Promise.all([panel.cargarPanel(llave('5A'), pedir('5A')), panel.cargarPanel(llave('5A'), pedir('5A'))])
  assert.equal(seguimientos(), 1)
  await panel.cargarPanel(llave('5A'), pedir('5A'), true)
  assert.equal(seguimientos(), 2)
  // «5A» queda a la vista; otras llaves llenan el almacén.
  const vista = app.mount(() => panel.useSeguimientoPanel('5A').carga)
  vista.render()
  await esperar()
  await panel.cargarPanel(llave('S-0'), pedir('S-0'))
  for (let i = 1; i <= panel.MAXIMO_LLAVES + 5; i++) await panel.cargarPanel(llave(`S-${i}`), pedir(`S-${i}`))
  // Lo que está a la vista no se poda (antes de montar otros lectores: el arnés comparte sus hooks).
  assert.equal(vista.render().estado, 'listo')
  vista.unmount()
  const leer = (salon) => app.mount(() => panel.useSeguimientoPanel(salon).carga).render()
  assert.equal(leer('S-0'), null)
  assert.equal(leer(`S-${panel.MAXIMO_LLAVES + 5}`).estado, 'listo')
})
