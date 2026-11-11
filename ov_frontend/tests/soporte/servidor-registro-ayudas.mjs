import assert from 'node:assert/strict'
import {
  cargarAlmacen,
  elementos,
  escenarioRuta,
  esConsultaDominio,
  esperar,
  fixtureServidor,
  jsonServidor,
  respuestaDominio,
} from './servidor-ayudas.mjs'

// Ajuste front de registros (lote 1): abre un registro del servidor con lo de la cuenta. `registro` responde el GET
// del registro (o una función); `acciones` responde cada POST /acciones/registro/<accion> con un cuerpo, una lista
// (uno por llamada) o una función de la petición. t-expectativas es de `ruta` (sin LLM); b1-1 es de `contenido`, con
// los fixtures `contenido-*` (pasa por el LLM).
export const contenido = (nombre) => jsonServidor(`contenido/contenido-${nombre}`)

// DATO DE PRUEBA: el registro de una actividad de `ruta` antes de responder, armado desde sus ítems
// (`items-registro-*`, el catálogo público) con la forma de la lectura del registro.
export function registroVacio(actividad = 't-expectativas') {
  const items = jsonServidor(`ruta/ruta-items-registro-${actividad}`).map((i) => ({
    codigo: i.codigo,
    nombre: i.nombre,
    obligatorio: i.obligatorio,
    con_llm: i.con_llm,
    disponible: true,
    marcador_faltante: null,
    consigna: { dialogo: i.dialogo, pregunta_eleccion: i.pregunta_eleccion, pregunta_texto: i.pregunta_texto,
      arranque: i.arranque },
    eleccion: i.eleccion && { minima: i.eleccion.minima, maxima: i.eleccion.maxima, ordenada: i.eleccion.ordenada,
      permite_otra: i.eleccion.permite_otra, etiqueta_otra: i.eleccion.etiqueta_otra ?? null },
    opciones: i.eleccion ? [...i.eleccion.opciones, ...i.eleccion.opciones_propias].map((o) => ({
      codigo: o.codigo, texto: o.texto, origen: null, grupo: null, exclusiva: !!o.exclusiva, sin_llm: !!o.sin_llm,
      pregunta: o.pregunta ?? null, arranque: o.arranque ?? null })) : [],
    ecos: [],
    respuesta: null,
  }))
  return { estado: null, item_actual: items[0].codigo, items }
}

export async function iniciar({
  actividad = 't-expectativas',
  registro,
  acciones = {},
  referencias,
  ruta = '/student/missions',
} = {}) {
  const app = fixtureServidor({ ruta }),
    estado = escenarioRuta('t1')
  const actividades = estado.bloques.flatMap((b) => b.actividades)
  // DATO DE PRUEBA: t-valores disponible, como tras completar t-expectativas.
  for (const codigo of ['t-valores', 't-eco'])
    Object.assign(actividades.find((a) => a.codigo === codigo), { estado: 'DISPONIBLE', visible: true, bloqueo: null })
  // DATO DE PRUEBA: b1-1 (del conjunto `contenido`) en el primer bloque, para recorrerla con sus fixtures.
  const base = actividades.find((a) => a.codigo === 't-expectativas')
  estado.bloques[0].actividades.push({ ...base, codigo: 'b1-1', contenido: 'b1_1', titulo: 'Tu mapa', orden: 99 })
  const colas = Object.fromEntries(Object.entries(acciones).map(([k, v]) => [k, Array.isArray(v) ? [...v] : v]))
  app.fetch((req) => {
    if (esConsultaDominio(req)) return respuestaDominio(req, estado)
    if (req.url.includes('/notificaciones')) return { body: { total: 0, no_vistas: 0, items: [] } }
    if (req.url.endsWith('/registro')) {
      const cuerpo = typeof registro === 'function' ? registro() : registro
      return { body: cuerpo ?? registroVacio(actividad) }
    }
    const accion = req.url.match(/\/acciones\/registro\/([a-z-]+)$/)?.[1]
    if (accion && accion in colas) {
      const respuesta = colas[accion]
      const cuerpo = Array.isArray(respuesta) ? respuesta.shift() : typeof respuesta === 'function' ? respuesta(req) : respuesta
      return cuerpo?.status ? cuerpo : { body: cuerpo }
    }
    if (req.url.endsWith('/referencias')) return { body: referencias ?? { referencias: [] } }
    throw Error(`Solicitud no configurada: ${req.url}`)
  })
  const almacen = cargarAlmacen(app)
  almacen.publicar({ consultasHabilitadas: true })
  await almacen.refrescar()
  return { app }
}

export async function abrir(app, codigo) {
  const Cargador = app.load('src/features/activities/components/RegistroServidorPlayer.tsx').RegistroServidorPlayer
  const cargador = app.mount(Cargador, { codigo, onClose() {} })
  cargador.render()
  await esperar()
  const hijo = elementos(cargador.render(), (e) => e.type?.name === 'StudentActivityPlayer')[0]
  assert.ok(hijo, 'el cargador abre el reproductor')
  // El arnés comparte los hooks entre montajes: el cargador se desmonta antes de montar el reproductor.
  cargador.unmount()
  const Reproductor = app.load('src/features/activities/components/StudentActivityPlayer.tsx').StudentActivityPlayer
  return app.mount(Reproductor, hijo.props)
}

// El ítem que muestra el reproductor: el elemento `RegistroItemServidor`, su vista y lo que pinta (sin hooks propios,
// se llama directo para ver qué componente elige).
export function itemEnPantalla(player) {
  const elemento = elementos(player.render(), (e) => e.type?.name === 'RegistroItemServidor')[0]
  if (!elemento) return undefined
  const { node, registro } = elemento.props
  return { elemento, node, registro, vista: registro.vista(node), hijo: elemento.type(elemento.props) }
}

export const peticiones = (app, accion) => app.requests.filter((r) => r.url.endsWith(`/acciones/registro/${accion}`))
