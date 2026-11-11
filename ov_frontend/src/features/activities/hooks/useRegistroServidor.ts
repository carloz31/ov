import { useRef, useState, type RefObject } from 'react'
import {
  entregarRegistro,
  reenviarItemRegistro,
  responderItemRegistro,
  responderSeguimientoRegistro,
  type AccionRegistro,
  type PasoConRefresco,
} from '@/store/servidor/registro'
import { mensajeErrorServidor } from '@/store/servidor/sesion'
import {
  cajaEdicion,
  desenlace,
  esOtra,
  paraEnviar,
  textoElegidas,
  itemDe,
  marcadasDe,
  sinLlm,
} from '@/lib/servidor/adaptadoresRegistro'
import type { Nodo } from '@/types/activities'
import type {
  ItemRegistroCuenta,
  OpcionElegida,
  PasoRegistro,
  ReferenciaResuelta,
  RegistroConsultado,
  RespuestaRegistroAccion,
} from '@/types/servidor'
import type { BorradorItem } from '../components/nodes/RegistroItemNode'
import type { EstadoLumi } from '../components/nodes/PantallaLumi'
import { QUEDO_CON_PISTA, confirmacion } from '../lib/textosRegistro'

export type RegistroServidor = {
  registro: RegistroConsultado
  // Lo que citan los diálogos de la apertura (se resuelve al abrir el registro).
  referencias?: ReferenciaResuelta[]
}
export type VistaItem = 'por_responder' | 'lectura' | 'edicion' | 'lumi'
// `seguimiento`: lo respondido a la repregunta, que va debajo de la primera respuesta (lote 2, §2).
type Lumi = { item: string; eleccion: string; texto: string; seguimiento?: string; estado: EstadoLumi }

const VACIO: BorradorItem = { opciones: [], texto: '' }
const textoEleccion = (item: ItemRegistroCuenta, opciones: OpcionElegida[]) =>
  textoElegidas(
    item,
    opciones
      .map((o) => (esOtra(o.codigo) ? o.texto : item.opciones.find((x) => x.codigo === o.codigo)?.texto) ?? '')
      .filter(Boolean),
  )
// Un paso guardado aunque el refresco del camino haya fallado sigue siendo un paso.
const pasoDe = (respuesta: PasoConRefresco): PasoRegistro | undefined =>
  respuesta.tipo === 'ok' || respuesta.tipo === 'guardado_sin_refrescar' ? respuesta.datos : undefined
const errorDe = (respuesta: PasoConRefresco) =>
  mensajeErrorServidor(respuesta.tipo === 'ok' || respuesta.tipo === 'guardado_sin_refrescar' ? null : respuesta)

// Ajuste front de registros (lote 1): el flujo ítem por ítem de un registro del servidor. Cada ítem se envía solo
// y pasa por la pantalla de Lumi, que puede traer una repregunta; un ítem respondido se ve en lectura y se edita con
// «Modificar». Lo escrito y no enviado vive aquí (no hay borradores en el servidor). Tras el último ítem, «Continuar»
// llama a `entregar` (repetible) y muestra el cierre.
export function useRegistroServidor({
  actividad,
  registroServidor,
  nodes,
  montado,
  avanzar,
  terminar,
}: {
  actividad: string
  registroServidor?: RegistroServidor
  nodes: Nodo[]
  montado: RefObject<boolean>
  avanzar: (siguiente: Nodo | undefined) => void
  terminar: (cierre: RespuestaRegistroAccion) => void
}) {
  const [registro, setRegistro] = useState(registroServidor?.registro)
  const [borradores, setBorradores] = useState<Record<string, BorradorItem>>({})
  const [editando, setEditando] = useState<string>()
  const [lumi, setLumi] = useState<Lumi>()
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')
  const enCurso = useRef(false)
  const confirmaciones = useRef(0)
  const entrega = useRef<RespuestaRegistroAccion | undefined>(undefined)
  const ultimaConsigna = nodes.findLast((n) => n.tipo === 'consigna')

  const item = (nodo: Nodo | undefined) =>
    nodo?.tipo === 'consigna' ? itemDe(registro, nodo.item) : undefined
  function vista(nodo: Nodo | undefined): VistaItem | undefined {
    const actual = item(nodo)
    if (!actual) return undefined
    if (lumi?.item === actual.codigo) return 'lumi'
    if (editando === actual.codigo) return 'edicion'
    return actual.respuesta ? 'lectura' : 'por_responder'
  }
  const borradorDe = (codigo: string) => borradores[codigo] ?? VACIO
  const guardarBorrador = (codigo: string, borrador: BorradorItem) =>
    setBorradores((actuales) => ({ ...actuales, [codigo]: borrador }))
  const olvidarBorrador = (codigo: string) =>
    setBorradores(({ [codigo]: _olvidado, ...resto }) => resto)

  // Dos peticiones seguidas sobre el mismo ítem serían una edición: una a la vez.
  async function pedir<T>(accion: () => Promise<T>): Promise<T | undefined> {
    if (enCurso.current) return undefined
    enCurso.current = true
    setOcupado(true)
    setError('')
    try {
      return await accion()
    } finally {
      enCurso.current = false
      if (montado.current) setOcupado(false)
    }
  }
  const frase = (paso: PasoRegistro, trasRepregunta: boolean): EstadoLumi => {
    const fin = desenlace(paso, trasRepregunta)
    if (fin.tipo === 'repregunta') return { tipo: 'repregunta', texto: fin.texto }
    if (fin.tipo === 'mensaje') return { tipo: 'desenlace', texto: fin.texto }
    if (fin.tipo === 'con_pista') return { tipo: 'desenlace', texto: QUEDO_CON_PISTA }
    return { tipo: 'desenlace', texto: confirmacion(confirmaciones.current++) }
  }

  async function enviar(nodo: Nodo) {
    const actual = item(nodo)
    if (!actual) return
    const { opciones, texto } = borradorDe(actual.codigo)
    const limpias = paraEnviar(actual, opciones)
    // Ítem u opción sin LLM: la misma pantalla, sin espera, con la frase de confirmación.
    const espera: EstadoLumi = sinLlm(actual, limpias)
      ? { tipo: 'desenlace', texto: confirmacion(confirmaciones.current++) }
      : { tipo: 'esperando' }
    setLumi({ item: actual.codigo, eleccion: textoEleccion(actual, limpias), texto: texto.trim(), estado: espera })
    const respuesta = await pedir(() => responderItemRegistro(actividad, actual.codigo, limpias, texto.trim()))
    if (!respuesta || !montado.current) return
    const paso = pasoDe(respuesta)
    if (!paso) {
      // Error de red o del servidor (también el tope de ediciones): vuelve al ítem con el mensaje del servidor.
      setLumi(undefined)
      setError(errorDe(respuesta))
      return
    }
    setRegistro(paso.registro)
    olvidarBorrador(actual.codigo)
    setEditando(undefined)
    if (espera.tipo === 'esperando') setLumi((l) => l && { ...l, estado: frase(paso, false) })
  }

  async function responderRepregunta(texto: string) {
    if (!lumi || lumi.estado.tipo !== 'repregunta') return
    const repregunta = lumi.estado
    setLumi({ ...lumi, seguimiento: texto, estado: { tipo: 'esperando' } })
    const respuesta = await pedir(() => responderSeguimientoRegistro(actividad, lumi.item, texto))
    if (!respuesta || !montado.current) return
    const paso = pasoDe(respuesta)
    if (!paso) {
      setLumi((l) => l && { ...l, seguimiento: undefined, estado: repregunta })
      setError(errorDe(respuesta))
      return
    }
    setRegistro(paso.registro)
    setLumi((l) => l && { ...l, estado: frase(paso, true) })
  }

  async function reenviar(nodo: Nodo) {
    const actual = item(nodo)
    const vigente = actual?.respuesta
    if (!actual || !vigente) return
    setLumi({
      item: actual.codigo,
      eleccion: textoElegidas(actual, vigente.opciones_elegidas.map((o) => o.texto)),
      texto: cajaEdicion(vigente),
      estado: { tipo: 'esperando' },
    })
    const respuesta = await pedir(() => reenviarItemRegistro(actividad, actual.codigo))
    if (!respuesta || !montado.current) return
    const paso = pasoDe(respuesta)
    if (!paso) {
      setLumi(undefined)
      setError(errorDe(respuesta))
      return
    }
    setRegistro(paso.registro)
    // Si el que quedó sin evaluar era el seguimiento, lo que vuelve es el desenlace tras la repregunta.
    setLumi((l) => l && { ...l, estado: frase(paso, !!vigente.linea_seguimiento) })
  }

  // «Continuar» (lectura o pantalla de Lumi) y «Seguir sin responder», que no llama a nada: la repregunta ya quedó
  // como pista. Tras la última consigna, terminar el registro.
  async function continuar(nodo: Nodo) {
    if (enCurso.current) return
    setLumi(undefined)
    setError('')
    if (nodo.id !== ultimaConsigna?.id) return avanzar(nodes[nodes.indexOf(nodo) + 1])
    const confirmada = entrega.current
    const respuesta: AccionRegistro | undefined = await pedir(() => entregarRegistro(actividad, confirmada))
    if (!respuesta || !montado.current) return
    if (respuesta.tipo === 'ok') {
      entrega.current = undefined
      return terminar(respuesta.datos)
    }
    if (respuesta.tipo === 'guardado_sin_refrescar') entrega.current = respuesta.datos
    setError(mensajeErrorServidor(respuesta.tipo === 'guardado_sin_refrescar' ? respuesta.error : respuesta))
  }

  function modificar(nodo: Nodo) {
    const actual = item(nodo)
    if (!actual?.respuesta) return
    setError('')
    guardarBorrador(actual.codigo, { opciones: marcadasDe(actual.respuesta), texto: cajaEdicion(actual.respuesta) })
    setEditando(actual.codigo)
  }
  function cancelar(nodo: Nodo) {
    const actual = item(nodo)
    if (actual) olvidarBorrador(actual.codigo)
    setError('')
    setEditando(undefined)
  }

  return {
    registroEnServidor: !!registroServidor,
    registro,
    item,
    vista,
    lumi,
    ocupado,
    error,
    borradorDe,
    guardarBorrador,
    enviar: (nodo: Nodo) => void enviar(nodo),
    responderRepregunta: (texto: string) => void responderRepregunta(texto),
    reenviar: (nodo: Nodo) => void reenviar(nodo),
    continuar: (nodo: Nodo) => void continuar(nodo),
    modificar,
    cancelar,
    limpiarError: () => setError(''),
  }
}
