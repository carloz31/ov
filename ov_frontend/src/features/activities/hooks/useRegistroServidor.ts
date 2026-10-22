import { useRef, useState } from 'react'
import { modoApi } from '@/config/env'
import {
  continuarSinResponder,
  editarRegistro,
  entregarRegistro,
  guardarBorradorRegistro,
  responderSeguimiento,
  type AccionRegistro,
} from '@/store/servidor/registro'
import { mensajeErrorServidor, obtenerEstadoServidor } from '@/store/servidor/sesion'
import { actividadServidor } from '@/lib/servidor/adaptadores'
import { anterioresDe } from '@/lib/servidor/adaptadoresRegistro'
import type { Nodo } from '@/types/activities'
import type {
  ItemRegistroPublico,
  OpcionElegida,
  ReferenciaResuelta,
  RegistroConsultado,
  RespuestaRegistroAccion,
  RespuestaRegistroPublica,
} from '@/types/servidor'
import {
  anotarCambio,
  consolidada,
  consultaDe,
  edicionesDe,
  esConsulta,
  type CambioRegistro,
} from '../lib/edicionRegistro'

export type RegistroServidor = {
  items: ItemRegistroPublico[]
  registro: RegistroConsultado
  // F02: lo que el registro retoma de la cuenta (elecciones anteriores y ecos).
  referencias?: ReferenciaResuelta[]
}
export type TurnoRegistro = { orden: number; pregunta: string; respuesta?: string; omitida: boolean }

// Lo escrito antes de entregar: el primer mensaje de la conversación y las opciones elegidas.
export function borradorRegistro(respuesta: RespuestaRegistroPublica | undefined) {
  const inicial = respuesta?.conversacion[0]
  return {
    texto: inicial?.tipo === 'respuesta' ? inicial.texto : '',
    opciones: respuesta?.opciones_elegidas ?? [],
  }
}

// Hilo del seguimiento: cada pregunta con su respuesta; una pregunta respondida por la siguiente sin
// respuesta en medio quedó omitida. La última sin respuesta (o con solo un borrador) es la pendiente.
export function turnosRegistro(respuesta: RespuestaRegistroPublica) {
  const turnos: TurnoRegistro[] = []
  let borrador = ''
  for (const mensaje of respuesta.conversacion.slice(1)) {
    const ultimo = turnos.at(-1)
    if (mensaje.tipo === 'pregunta') {
      if (ultimo && ultimo.respuesta === undefined) ultimo.omitida = true
      turnos.push({ orden: mensaje.orden, pregunta: mensaje.texto, omitida: false })
      borrador = ''
    } else if (mensaje.borrador) borrador = mensaje.texto
    else if (ultimo) ultimo.respuesta = mensaje.texto
  }
  const pendiente = respuesta.estado === 'PENDIENTE_SEGUIMIENTO' ? turnos.at(-1) : undefined
  if (!pendiente && turnos.at(-1)?.respuesta === undefined && turnos.length) turnos.at(-1)!.omitida = true
  return { textoInicial: borradorRegistro(respuesta).texto, turnos, pendiente, borrador }
}

export function useRegistroServidor({
  actividad,
  registroServidor,
  nodes,
  montado,
  avanzar,
  terminar,
  anterior,
  volver,
}: {
  actividad: string
  registroServidor?: RegistroServidor
  nodes: Nodo[]
  montado: { current: boolean }
  avanzar: (siguiente: Nodo | undefined) => void
  terminar: (cierre: RespuestaRegistroAccion) => void
  anterior?: Nodo
  volver: () => void
}) {
  const [registro, setRegistro] = useState(registroServidor?.registro)
  // F02: un registro ya cerrado se abre como consulta; los textos cambiados viven aquí hasta entregarlos.
  const [consulta] = useState(() => !!registroServidor && esConsulta(registroServidor.registro))
  const [cambios, setCambios] = useState<Record<string, CambioRegistro>>({})
  const [cierre, setCierre] = useState<RespuestaRegistroAccion>()
  const [ocupado, setOcupado] = useState<'' | 'guardando' | 'evaluando'>('')
  const [error, setError] = useState('')
  // Acción que el servidor ya guardó pero cuyo refresco falló: el reintento solo vuelve a refrescar.
  const confirmada = useRef<{ accion: string; datos: RespuestaRegistroAccion }>(undefined)
  const enCurso = useRef(false)
  const ultima = useRef<() => Promise<void>>(undefined)
  const pendiente = registro?.respuestas.find((r) => r.estado === 'PENDIENTE_SEGUIMIENTO')
  const ultimaConsigna = nodes.findLast((n) => n.tipo === 'consigna')?.id

  async function accion(
    clave: string,
    ejecutar: (previa?: RespuestaRegistroAccion) => Promise<AccionRegistro>,
  ) {
    if (enCurso.current) return
    ultima.current = () => accion(clave, ejecutar)
    enCurso.current = true
    setOcupado('evaluando')
    setError('')
    try {
      const previa = confirmada.current?.accion === clave ? confirmada.current.datos : undefined
      const respuesta = await ejecutar(previa)
      if (!montado.current) return
      if (respuesta.tipo === 'ok' || respuesta.tipo === 'guardado_sin_refrescar') {
        setRegistro(respuesta.datos)
        if (respuesta.tipo === 'guardado_sin_refrescar') {
          confirmada.current = { accion: clave, datos: respuesta.datos }
          setError('Tu respuesta se guardó, pero no se pudo actualizar el camino. Reintenta la consulta.')
          return
        }
        confirmada.current = undefined
        if (!respuesta.datos.respuestas.some((r) => r.estado === 'PENDIENTE_SEGUIMIENTO'))
          setCierre(respuesta.datos)
      } else
        setError(
          respuesta.tipo === 'sin_conexion'
            ? 'No se pudo guardar en el servidor'
            : mensajeErrorServidor(respuesta),
        )
    } finally {
      enCurso.current = false
      if (montado.current) setOcupado('')
    }
  }
  const entregar = () => accion('entregar', (previa) => entregarRegistro(actividad, previa))

  // Refleja en el estado local el borrador que el servidor acaba de guardar.
  function anotarBorrador(item: string, texto: string, opciones: OpcionElegida[]) {
    setRegistro(
      (actual) =>
        actual && {
          ...actual,
          respuestas: [
            ...actual.respuestas.filter((r) => r.item !== item),
            {
              item,
              estado: 'BORRADOR',
              opciones_elegidas: opciones,
              conversacion: [{ tipo: 'respuesta', texto }],
            },
          ],
        },
    )
  }

  // En la consulta no hay borradores (el registro está cerrado): se anota el texto y se sigue.
  function anotar(item: string, texto: string, opciones: OpcionElegida[]) {
    const definido = registroServidor?.items.find((i) => i.codigo === item)
    const siguientes =
      registro && definido ? anotarCambio(cambios, registro, definido, texto, opciones) : cambios
    setCambios(siguientes)
    return siguientes
  }

  async function guardar(nodo: Nodo, texto: string, opciones: OpcionElegida[]) {
    if (nodo.tipo !== 'consigna' || !nodo.item || enCurso.current) return
    if (consulta) {
      const siguientes = anotar(nodo.item, texto, opciones)
      if (nodo.id !== ultimaConsigna) avanzar(nodes[nodes.indexOf(nodo) + 1])
      else if (Object.keys(siguientes).length)
        await accion('editar', (previa) => editarRegistro(actividad, edicionesDe(siguientes), previa))
      return
    }
    const ultimo = nodo.id === ultimaConsigna
    const siguiente = nodes[nodes.indexOf(nodo) + 1]
    enCurso.current = true
    setOcupado('guardando')
    setError('')
    let guardado = false
    try {
      const respuesta = await guardarBorradorRegistro(
        actividad,
        nodo.item,
        texto,
        opciones,
        ultimo ? nodo.id : siguiente?.id,
      )
      if (!montado.current) return
      if (respuesta.tipo !== 'ok') {
        setError(
          respuesta.tipo === 'sin_conexion'
            ? 'No se pudo guardar en el servidor'
            : mensajeErrorServidor(respuesta),
        )
        return
      }
      guardado = true
      anotarBorrador(nodo.item, texto, opciones)
    } finally {
      enCurso.current = false
      if (montado.current) setOcupado('')
    }
    if (!guardado) return
    // En api, el registro termina en su última consigna: «Entregar» guarda y entrega.
    if (ultimo) await entregar()
    else avanzar(siguiente)
  }

  // «Anterior» antes de entregar: guarda lo escrito como borrador sin validar, con la posición del nodo al
  // que se vuelve, y retrocede. Una «Otra» sin texto se omite: el servidor la rechaza.
  async function retroceder(nodo: Nodo, texto: string, opciones: OpcionElegida[]) {
    if (nodo.tipo !== 'consigna' || !nodo.item || !anterior || enCurso.current) return
    if (consulta) {
      anotar(nodo.item, texto, opciones)
      volver()
      return
    }
    enCurso.current = true
    setOcupado('guardando')
    setError('')
    const elegidas = opciones.filter((o) => o.codigo !== 'OTRA' || !!o.texto?.trim())
    let guardado = false
    try {
      const respuesta = await guardarBorradorRegistro(actividad, nodo.item, texto, elegidas, anterior.id)
      if (!montado.current) return
      if (respuesta.tipo !== 'ok') {
        setError(
          respuesta.tipo === 'sin_conexion'
            ? 'No se pudo guardar en el servidor'
            : mensajeErrorServidor(respuesta),
        )
        return
      }
      guardado = true
      anotarBorrador(nodo.item, texto, elegidas)
    } finally {
      enCurso.current = false
      if (montado.current) setOcupado('')
    }
    if (guardado) volver()
  }

  return {
    registroEnServidor: !!registroServidor,
    items: registroServidor?.items ?? [],
    registro,
    pendiente,
    cierre,
    ocupado,
    error,
    // Desde la entrega hasta «Continuar», el reproductor muestra el seguimiento en lugar de los nodos.
    // También si el servidor guardó la acción y solo falta refrescar: no se vuelve a la consigna ya entregada.
    enSeguimiento:
      !!registroServidor && (!!pendiente || !!cierre || ocupado === 'evaluando' || !!confirmada.current),
    esUltimaConsigna: (id: string) => id === ultimaConsigna,
    respuestaDe: (item: string) => registro?.respuestas.find((r) => r.item === item),
    // Lo que muestra una consigna al abrirla: el borrador o, en la consulta, el texto cambiado o la consolidada.
    // Sin nada guardado, una elección que retoma otra llega con lo elegido la vez pasada (F02).
    inicialDe: (item: string) => {
      const respuesta = registro?.respuestas.find((r) => r.item === item)
      if (consulta)
        return (
          cambios[item] ?? { texto: consolidada(respuesta), opciones: respuesta?.opciones_elegidas ?? [] }
        )
      const definido = registroServidor?.items.find((i) => i.codigo === item)
      return respuesta || !definido
        ? borradorRegistro(respuesta)
        : { texto: '', opciones: anterioresDe(definido, registroServidor?.referencias ?? []) }
    },
    anterioresDe: (item: ItemRegistroPublico) => anterioresDe(item, registroServidor?.referencias ?? []),
    consultaDe: (item: ItemRegistroPublico) =>
      consulta && registro ? consultaDe(registro, item, cambios) : undefined,
    puedeEditarRegistro: modoApi && consulta,
    // Zona de eco de una consigna (F02): la referencia TEXTO que cita y el título de su actividad de origen.
    ecoDe: (nodo: Nodo) => {
      const codigo = nodo.tipo === 'consigna' ? nodo.eco : undefined
      const referencia = codigo && registroServidor?.referencias?.find((r) => r.codigo === codigo)
      if (!referencia || referencia.estado === 'SIN_DATO') return undefined
      const origen = actividadServidor(obtenerEstadoServidor().actividades.datos, referencia.actividad ?? '')
      return { estado: referencia.estado, texto: referencia.texto ?? '', titulo: origen?.titulo ?? '' }
    },
    guardar,
    retroceder,
    reintentar: () => ultima.current?.(),
    responder: (texto: string) =>
      pendiente &&
      accion(`responder:${pendiente.item}`, (previa) =>
        responderSeguimiento(actividad, pendiente.item, texto, previa),
      ),
    omitir: () =>
      pendiente &&
      accion(`omitir:${pendiente.item}`, (previa) =>
        continuarSinResponder(actividad, pendiente.item, previa),
      ),
    // «Continuar» deja el seguimiento y lleva al fin con los eventos de la acción que cerró.
    continuar: () => {
      if (!cierre) return
      setCierre(undefined)
      terminar(cierre)
    },
  }
}
