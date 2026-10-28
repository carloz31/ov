import assert from 'node:assert/strict'
import test from 'node:test'
import {
  cargarAlmacen,
  copia,
  elementos,
  esperar,
  fixtureServidor,
  jsonServidor,
} from '../../soporte/servidor-ayudas.mjs'

// F07b (§8 con su corrección; lienzo de la sección 4): «Mis próximos pasos» en lectura (franja, «Lo hice» y
// hechos), en edición (sugerencias en sitio, pasos y cuerpo) y bloqueada con sugerencias. Con los fixtures ruta-*.
const texto = (n) =>
  Array.isArray(n)
    ? n.map(texto).join('')
    : typeof n === 'string' || typeof n === 'number'
      ? String(n)
      : n?.props
        ? texto(n.props.children)
        : ''
const accion = { eventos_registrados: [], nuevos_desbloqueos: [] }
const completos = jsonServidor('ruta/ruta-planes')
const SECCIONES = [{ codigo: 'PLANES', nombre: 'Planes', estado: 'DISPONIBLE', bloqueo: [] }]
const PSICOLOGIA = 'mtpe-369'
const [listo] = completos.planes
const pendientes = listo.sugerencias.filter((s) => s.estado === 'PENDIENTE')

function planAbierto(planes = completos) {
  const app = fixtureServidor({ ruta: `/student/profile/decisions/${PSICOLOGIA}` })
  app.fetch((r) => {
    if (r.url.endsWith('/planes')) return { body: planes }
    if (r.url.includes('/instrumentos/TEST-RIASEC/resultado'))
      return { body: jsonServidor('ruta/ruta-resultado-riasec') }
    if (r.url.includes('/acciones/')) return { body: accion }
    return { body: [] }
  })
  const almacen = cargarAlmacen(app)
  almacen.publicar({ consultasHabilitadas: true })
  almacen.publicar({
    secciones: { ...almacen.obtenerEstadoServidor().secciones, datos: SECCIONES, estado: 'listo' },
  })
  const { PlanAbierto } = app.load('src/features/plans/components/PlanAbierto.tsx')
  return { app, vista: app.mount(PlanAbierto, { carrera: PSICOLOGIA, seccion: 'PASOS' }) }
}
async function dibujar(vista) {
  for (let i = 0; i < 3; i++) {
    vista.render()
    await esperar()
  }
  return vista.render()
}
const hijo = (arbol, nombre) => elementos(arbol, (e) => e.type?.name === nombre)[0]
const boton = (arbol, etiqueta) =>
  elementos(
    arbol,
    (e) => e.type === 'button' && (texto(e).includes(etiqueta) || e.props['aria-label']?.includes(etiqueta)),
  )[0]

test('lectura: franja de sugerencias que abre la edición, pendientes con «Lo hice» y hechos tachados', async () => {
  const { app, vista } = planAbierto()
  let arbol = await dibujar(vista)
  const { SeccionPasos } = app.load('src/features/plans/components/SeccionPasos.tsx')
  const seccion = hijo(arbol, 'SeccionPasos')
  const lectura = SeccionPasos(seccion.props)
  const m = pendientes.length
  assert.match(texto(lectura), new RegExp(`${m} sugerencias esperan tu decisión\\.Revisarlas`))
  assert.doesNotMatch(texto(lectura), /Ahora no|Sugerencias ·/)
  // Los hechos se dibujan con su ayudante: tachados, con «Hecho · {hallazgo}».
  const hecho = hijo(lectura, 'PasoHecho')
  const dibujo = hecho.type(hecho.props)
  assert.match(texto(dibujo), /Hecho · DATO DE PRUEBA: hay estadística\./)
  assert.equal(elementos(dibujo, (e) => e.type === 's').length, 1)
  boton(lectura, 'Revisarlas').props.onClick()
  arbol = vista.render()
  assert.notEqual(hijo(arbol, 'SeccionPasos').props.borrador, null)
})

test('«Lo hice» abre el diálogo y envía paso-hecho al instante con el hallazgo', async () => {
  const { app, vista } = planAbierto()
  let arbol = await dibujar(vista)
  const { SeccionPasos } = app.load('src/features/plans/components/SeccionPasos.tsx')
  boton(SeccionPasos(hijo(arbol, 'SeccionPasos').props), 'Lo hice').props.onClick()
  arbol = vista.render()
  const dialogo = hijo(arbol, 'DialogoPasoHecho')
  assert.equal(dialogo.props.abierto, true)
  dialogo.props.onEnviar('DATO DE PRUEBA: la feria es el viernes.')
  await esperar()
  const hecho = app.requests.find((r) => r.url.endsWith('/acciones/planes/paso-hecho'))
  assert.deepEqual(copia(hecho.body), {
    cuenta: 'est-ana',
    carrera: PSICOLOGIA,
    paso: 2,
    hallazgo: 'DATO DE PRUEBA: la feria es el viernes.',
  })
  assert.equal(app.requests.filter((r) => r.url.endsWith('/guardar-seccion')).length, 0)
  arbol = vista.render()
  assert.equal(hijo(arbol, 'DialogoPasoHecho').props.abierto, false)
  const aviso = hijo(arbol, 'AvisoPlan').props.aviso
  assert.deepEqual(
    [aviso.titulo, aviso.descripcion],
    ['Paso hecho.', 'Si tenía una duda, ya quedó resuelta.'],
  )
  const { DialogoPasoHecho } = app.load('src/features/plans/components/DialogoPasoHecho.tsx')
  assert.ok(DialogoPasoHecho)
})

test('edición: sugerencias (agregar, editar en sitio, ahora no), pasos tuyos y cuerpo de guardado', async () => {
  const { app, vista } = planAbierto()
  let arbol = await dibujar(vista)
  boton(arbol, 'Editar').props.onClick()
  arbol = vista.render()
  const { SeccionPasos } = app.load('src/features/plans/components/SeccionPasos.tsx')
  const { SugerenciasPasos } = app.load('src/features/plans/components/SugerenciasPasos.tsx')
  let seccion = hijo(arbol, 'SeccionPasos')
  const edicion = SeccionPasos(seccion.props)
  assert.match(texto(edicion), /Mis pasosSin fechas: cada paso está pendiente o hecho\./)
  const hecho = hijo(edicion, 'PasoHecho')
  assert.match(texto(hecho.type(hecho.props)), /Los pasos hechos no se editan ni se borran aquí\./)
  const bloque = hijo(edicion, 'SugerenciasPasos')
  assert.equal(bloque.props.sugerencias.length, pendientes.length)
  const [primera, segunda, tercera] = pendientes
  // El bloque se dibuja con su propio estado (editar en sitio): se prueba con sus callbacks.
  bloque.props.onAgregar(primera.numero)
  bloque.props.onAgregar(segunda.numero, 'conversar', 'DATO DE PRUEBA: pregúntale a tu tutora.')
  bloque.props.onDescartar(tercera.numero)
  seccion = hijo(vista.render(), 'SeccionPasos')
  assert.equal(
    hijo(SeccionPasos(seccion.props), 'SugerenciasPasos').props.sugerencias.length,
    pendientes.length - 3,
  )
  boton(vista.render(), 'Guardar sección').props.onClick()
  await esperar()
  const guardar = app.requests.find((r) => r.url.endsWith('/acciones/planes/guardar-seccion'))
  assert.deepEqual(copia(guardar.body.datos), {
    pasos: [
      { numero: 2, tipo: 'visitar', texto: listo.pasos[1].texto },
      { sugerencia: primera.numero, tipo: primera.tipo, texto: primera.texto },
      { sugerencia: segunda.numero, tipo: 'conversar', texto: 'DATO DE PRUEBA: pregúntale a tu tutora.' },
    ],
    sugerencias_descartadas: [tercera.numero],
  })
  assert.equal(guardar.body.seccion, 'PASOS')
  // El bloque: «Sugerencias · N», cinco visibles y «+ k sugerencias más».
  const vistaBloque = SugerenciasPasos({ ...bloque.props })
  assert.match(texto(vistaBloque), new RegExp(`Sugerencias · ${pendientes.length}`))
  assert.match(texto(vistaBloque), /Agrega las que te sirvan; las demás, «Ahora no»\./)
})

test('bloqueada con sugerencias: la tarjeta de bloqueo y el menú suman «{m} sugerencias te esperan»', async () => {
  const bloqueado = {
    ...completos,
    planes: completos.planes.map((p, i) =>
      i
        ? p
        : {
            ...p,
            secciones: p.secciones.map((s) =>
              s.codigo === 'PASOS'
                ? { ...s, estado: 'BLOQUEADA', bloqueo: [{ mensaje: 'Completa la comparación.' }] }
                : s,
            ),
          },
    ),
  }
  const { vista } = planAbierto(bloqueado)
  const arbol = await dibujar(vista)
  const tarjeta = hijo(arbol, 'SeccionBloqueada')
  assert.equal(tarjeta.props.nota, `${pendientes.length} sugerencias te esperan`)
})
