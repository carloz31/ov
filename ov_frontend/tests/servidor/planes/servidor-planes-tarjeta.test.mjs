import assert from 'node:assert/strict'
import test from 'node:test'
import { cargarAlmacen, copia, elementos, esperar, fixtureServidor, jsonServidor } from '../../soporte/servidor-ayudas.mjs'

// F07a (F07-pantallas §4): el plan abierto con menú de secciones, lectura y edición de POR_QUE y CONOCIMIENTO,
// sección bloqueada, sección por defecto y plan inexistente, con los fixtures ruta-*.
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
const familia = jsonServidor('ruta/ruta-planes-misma-familia')
const SECCIONES = [{ codigo: 'PLANES', nombre: 'Planes', estado: 'DISPONIBLE', bloqueo: [] }]
const PSICOLOGIA = 'mtpe-369'

function planAbierto({ planes = familia, carrera = PSICOLOGIA, seccion = null, responder } = {}) {
  const app = fixtureServidor({ ruta: `/student/profile/decisions/${carrera}` })
  app.fetch((r) => {
    const respuesta = responder?.(r)
    if (respuesta) return respuesta
    if (r.url.endsWith('/planes')) return { body: planes }
    if (r.url.includes('/instrumentos/TEST-RIASEC/resultado')) return { body: jsonServidor('ruta/ruta-resultado-riasec') }
    if (r.url.includes('/acciones/')) return { body: accion }
    return { body: [] }
  })
  const almacen = cargarAlmacen(app)
  almacen.publicar({ consultasHabilitadas: true })
  almacen.publicar({ secciones: { ...almacen.obtenerEstadoServidor().secciones, datos: SECCIONES, estado: 'listo' } })
  const { PlanAbierto } = app.load('src/features/plans/components/PlanAbierto.tsx')
  const vista = app.mount(PlanAbierto, { carrera, seccion })
  return { app, vista }
}
async function dibujar(vista) {
  vista.render()
  await esperar()
  vista.render()
  await esperar()
  return vista.render()
}
const hijo = (arbol, nombre) => elementos(arbol, (e) => e.type?.name === nombre)[0]
const boton = (arbol, etiqueta) => elementos(arbol, (e) => e.type === 'button' && texto(e).includes(etiqueta))[0]

test('sin ?seccion= abre la primera abierta no lista; el menú lleva títulos del front, píldoras y resúmenes', async () => {
  const { app, vista } = planAbierto()
  const arbol = await dibujar(vista)
  assert.match(texto(arbol), /Mis planes.*Plan A · Psicología/)
  const menu = hijo(arbol, 'MenuSeccionesPlan')
  assert.equal(menu.props.seccion, 'POR_QUE')
  const { MenuSeccionesPlan } = app.load('src/features/plans/components/MenuSeccionesPlan.tsx')
  const marcado = texto(MenuSeccionesPlan(menu.props))
  assert.match(marcado, /1 · Por qué la elijo.*2 · Qué tanto la conozco.*3 · Cómo lo haría realidad.*4 · Mis próximos pasos/)
  assert.match(marcado, /De un test · Ayudar a otros · «DATO DE PRUEBA: corto\.»/)
  assert.match(marcado, new RegExp(familia.planes[0].secciones[3].bloqueo[0].mensaje))
  const barra = elementos(MenuSeccionesPlan(menu.props), (e) => e.type?.name === 'TrailBar')[0]
  assert.equal(barra.props.label, '0 de 4 secciones listas')
  assert.doesNotMatch(marcado, /Qué tan real es|Mis pasos(?! )/)
})

test('POR_QUE en lectura con la repregunta fija; «Cómo encaja contigo» con el resultado revelado', async () => {
  const { app, vista } = planAbierto()
  const arbol = await dibujar(vista)
  const porQue = hijo(arbol, 'SeccionPorQue')
  assert.equal(porQue.props.borrador, null)
  const { SeccionPorQue } = app.load('src/features/plans/components/SeccionPorQue.tsx')
  const marcado = texto(SeccionPorQue(porQue.props))
  assert.match(marcado, /IdeaDe un test/)
  assert.match(marcado, /¿Puedes contar un poco más\? ¿Qué pasó, con quién estabas\?Agregar/)
  // ruta-resultado-riasec: código IRA; Psicología es S, I, A.
  assert.deepEqual(copia(porQue.props.encaje), { carrera: 'Social', principal: 'Investigador', segundo: 'Realista' })
  assert.match(marcado, /Cómo encaja contigoPsicología es de tipo Social\. Tu tipo principal es Investigador y el segundo, Realista\. Es una pista, no una regla\./)
  assert.ok(boton(arbol, 'Editar'))
})

test('editar POR_QUE: cambios en memoria, «Guardar sección» envía la sección entera y vuelve a lectura', async () => {
  const { app, vista } = planAbierto()
  let arbol = await dibujar(vista)
  boton(arbol, 'Editar').props.onClick()
  arbol = vista.render()
  assert.match(texto(arbol), /Editando/)
  const porQue = hijo(arbol, 'SeccionPorQue')
  assert.equal(porQue.props.borrador.idea, 'TEST')
  porQue.props.onCambiar((b) => ({ ...b, idea: 'MIA', relato: 'DATO DE PRUEBA: un relato más largo que el anterior.' }))
  arbol = vista.render()
  boton(arbol, 'Guardar sección').props.onClick()
  await esperar()
  const guardar = app.requests.find((r) => r.url.endsWith('/acciones/planes/guardar-seccion'))
  assert.deepEqual(copia(guardar.body), {
    cuenta: 'est-ana',
    carrera: PSICOLOGIA,
    seccion: 'POR_QUE',
    datos: { idea_origen: 'MIA', motivos: [{ opcion: 'AYUDAR' }], relato: 'DATO DE PRUEBA: un relato más largo que el anterior.' },
  })
  arbol = vista.render()
  assert.equal(hijo(arbol, 'SeccionPorQue').props.borrador, null)
  const aviso = hijo(arbol, 'AvisoPlan').props.aviso
  assert.deepEqual([aviso.titulo, aviso.descripcion], ['Lo anoté.', 'Volverá cuando compares tus planes.'])
})

test('«Cancelar» descarta los cambios sin enviar nada', async () => {
  const { app, vista } = planAbierto()
  let arbol = await dibujar(vista)
  boton(arbol, 'Editar').props.onClick()
  arbol = vista.render()
  hijo(arbol, 'SeccionPorQue').props.onCambiar((b) => ({ ...b, idea: 'FAMILIA' }))
  boton(vista.render(), 'Cancelar').props.onClick()
  arbol = vista.render()
  assert.equal(hijo(arbol, 'SeccionPorQue').props.borrador, null)
  assert.equal(app.requests.filter((r) => r.url.includes('/acciones/')).length, 0)
})

test('una sección bloqueada muestra solo su título y el mensaje del servidor', async () => {
  const { vista } = planAbierto({ seccion: 'PASOS' })
  const arbol = await dibujar(vista)
  const bloqueada = hijo(arbol, 'SeccionBloqueada')
  assert.deepEqual(copia(bloqueada.props), {
    titulo: '4 · Mis próximos pasos',
    mensaje: familia.planes[0].secciones[3].bloqueo[0].mensaje,
  })
  assert.equal(boton(arbol, 'Editar'), undefined)
})

test('CONOCIMIENTO: lectura con «Sí · averiguado» y dudas; edición con vista previa y cuerpo de guardado', async () => {
  const { app, vista } = planAbierto({ planes: completos, seccion: 'CONOCIMIENTO' })
  let arbol = await dibujar(vista)
  const { SeccionConocimiento } = app.load('src/features/plans/components/SeccionConocimiento.tsx')
  let seccion = hijo(arbol, 'SeccionConocimiento')
  const lectura = texto(SeccionConocimiento(seccion.props))
  assert.match(lectura, /Sí · averiguado/)
  assert.match(lectura, /Mis dudas\d+ abiertas? · 1 resuelta/)
  assert.match(lectura, /Resuelta.*DATO DE PRUEBA: hay estadística\./)
  boton(arbol, 'Editar').props.onClick()
  arbol = vista.render()
  seccion = hijo(arbol, 'SeccionConocimiento')
  // CURSOS tenía «No» con su duda abierta: al pasar a «Sí», la vista previa dice que se resolverá.
  seccion.props.onCambiar((b) => ({ ...b, respuestas: { ...b.respuestas, CURSOS: 'SI' } }))
  seccion = hijo(vista.render(), 'SeccionConocimiento')
  const edicion = SeccionConocimiento(seccion.props)
  assert.match(texto(edicion), /Responde con sinceridad\..*Ver la ficha de la carrera/)
  assert.match(texto(edicion), /se resolverá al guardar/)
  assert.match(texto(edicion), /Guardar puede tardar unos segundos\./)
  boton(edicion, '¿Cuánto gana alguien que recién termina?').props.onClick()
  boton(vista.render(), 'Guardar sección').props.onClick()
  await esperar()
  const guardar = app.requests.find((r) => r.url.endsWith('/acciones/planes/guardar-seccion'))
  assert.equal(guardar.body.seccion, 'CONOCIMIENTO')
  assert.equal(guardar.body.datos.respuestas.CURSOS, 'SI')
  assert.deepEqual(copia(guardar.body.datos.dudas.at(-1)), { origen: 'SUGERIDA', opcion: 'SUELDO_INICIAL' })
  assert.ok(guardar.body.datos.dudas.slice(0, -1).every((d) => Object.keys(d).join() === 'numero'))
  assert.equal(hijo(vista.render(), 'AvisoPlan').props.aviso.descripcion, 'Tus dudas quedaron anotadas.')
})

test('un 409 de sección bloqueada al guardar avisa con el mensaje del servidor y vuelve a lectura', async () => {
  const bloqueada = jsonServidor('ruta/ruta-guardar-seccion-bloqueada')
  const { vista } = planAbierto({
    responder: (r) => (r.url.endsWith('/guardar-seccion') ? { status: 409, body: bloqueada } : null),
  })
  let arbol = await dibujar(vista)
  boton(arbol, 'Editar').props.onClick()
  boton(vista.render(), 'Guardar sección').props.onClick()
  await esperar()
  arbol = vista.render()
  assert.equal(hijo(arbol, 'SeccionPorQue').props.borrador, null)
  const aviso = hijo(arbol, 'AvisoPlan').props.aviso
  assert.deepEqual([aviso.error, aviso.descripcion], [true, bloqueada.detail.mensaje])
})

test('una carrera sin plan vuelve a Mis planes', async () => {
  const { app, vista } = planAbierto({ carrera: 'mtpe-1' })
  await dibujar(vista)
  // El navigate del arnés cambia en cada render (en React es estable): basta con que todo lleve a Mis planes.
  assert.ok(app.navigations.length >= 1)
  assert.ok(app.navigations.every((destino) => destino === '/student/profile/decisions'))
})
