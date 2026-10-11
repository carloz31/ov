import { esConsultaDominio, respuestaDominio } from './servidor-ayudas.mjs'
import { cargarAlmacen, escenarioServidor } from './servidor-ayudas.mjs'
import { fixtureServidor, jsonServidor, copia, elementos } from './servidor-ayudas.mjs'

// DATO DE PRUEBA: servidor en memoria derivado de los fixtures exportados por el backend.
export async function iniciarMara({ cantidad = 0, completada = false, resultado = null, ruta } = {}) {
  const app = fixtureServidor({ ruta }),
    estado = escenarioServidor('ciudad'),
    items = jsonServidor('items-act-tip-01')
  const respuestas = new Map(items.slice(0, cantidad).map((i) => [i.codigo, 4]))
  const actividad = estado.bloques.flatMap((b) => b.actividades).find((a) => a.codigo === 'act-tip-01')
  actividad.estado = completada ? 'COMPLETADA' : cantidad ? 'EN_CURSO' : 'DISPONIBLE'
  if (resultado)
    estado.bloques.flatMap((b) => b.actividades).find((a) => a.codigo === 'act-tip-final').estado =
      'DISPONIBLE'
  const publicas = () =>
    [...respuestas].map(([item, orden]) => ({
      item,
      opcion: items.find((i) => i.codigo === item).escala.opciones.find((o) => o.orden === orden),
      creada_en: '2026-10-07T10:00:00',
      actualizada_en: '2026-10-07T10:00:00',
    }))
  const servidor = (req) => {
    if (esConsultaDominio(req)) return respuestaDominio(req, estado)
    if (req.url.includes('/desbloqueos?')) return { body: [] }
    if (req.url.endsWith('/resultado'))
      return resultado
        ? { body: resultado }
        : {
            status: 409,
            body: {
              detail: {
                mensaje: 'No hay resultado vigente',
                avance: {
                  aplicacion: 'APL-RIASEC',
                  actividades: { completadas: 0, total: 14, faltantes: ['act-tip-01'] },
                  items: { respondidos: respuestas.size, total: 60 },
                  hay_resultado_vigente: false,
                  estado: 'EN_PROGRESO',
                },
              },
            },
          }
    if (req.url.endsWith('/items')) return { body: items }
    if (req.url.endsWith('/respuestas'))
      return { body: { cuenta: 'est-ana', actividad: 'act-tip-01', respuestas: publicas() } }
    if (req.url.endsWith('/responder-items')) {
      for (const r of req.body.respuestas) respuestas.set(r.item, r.opcion)
      if (!completada) actividad.estado = 'EN_CURSO'
      return {
        body: {
          cuenta: req.body.cuenta,
          actividad: req.body.actividad,
          respuestas_guardadas: req.body.respuestas,
          progreso: { estado: actividad.estado, respondidos: respuestas.size, total: items.length },
        },
      }
    }
    if (req.url.endsWith('/completar-actividad')) {
      actividad.estado = 'COMPLETADA'
      return { body: { eventos_registrados: [], nuevos_desbloqueos: [], resultados_generados: [] } }
    }
    throw Error(`Solicitud no configurada: ${req.url}`)
  }
  app.fetch(servidor)
  const cuenta = app.load('src/store/servidor/cuenta.ts')
  cuenta.seleccionarCuenta([estado.cuenta])
  const almacen = cargarAlmacen(app)
  // DATO DE PRUEBA: ingreso ya confirmado para aislar reproducción y consultas.
  almacen.publicar({ consultasHabilitadas: true })
  await almacen.refrescar()
  const adaptadores = app.load('src/lib/servidor/adaptadores.ts')
  const activity = adaptadores.construirInteraccionMara(
    actividad,
    items,
    'Saludo de Mara del contenido local',
  )
  let cerrada = 0
  function montar({
    revision = completada,
    soloLectura = !!resultado,
    nodoInicialId = adaptadores.inicioInteraccionMara(activity, publicas(), revision),
  } = {}) {
    const { StudentActivityPlayer } = app.load('src/features/activities/components/StudentActivityPlayer.tsx')
    return app.mount(StudentActivityPlayer, {
      activity,
      instrumentoServidor: { items, respuestas: copia(publicas()), nodoInicialId, revision, soloLectura },
      onClose() {
        cerrada++
      },
    })
  }
  return {
    app,
    estado,
    items,
    respuestas,
    servidor,
    almacen,
    activity,
    montar,
    get cerrada() {
      return cerrada
    },
  }
}
export const itemEn = (player) => elementos(player.render(), (e) => e.type?.name === 'ItemNode')[0]
export const botonEn = (tree, texto) =>
  elementos(tree, (e) => e.type === 'button' && String(e.props.children).includes(texto))[0]
