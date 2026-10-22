import type { Actividad } from '@/types/activities'
import type {
  ItemEdicion,
  ItemRegistroPublico,
  OpcionElegida,
  RegistroConsultado,
  RespuestaRegistroPublica,
} from '@/types/servidor'
import { reflectionCopy } from '@/data/activities/reflectionConfig'

// Consulta de un registro entregado (F02): el mismo reproductor, precargado con la respuesta consolidada y
// en modo lectura; «Modificar» abre el componente de siempre. Cambiar el texto o la elección es editar; si
// cambia la elección, la justificación se reescribe.
export type ConsultaRegistro = {
  pista?: string
  original: string
  opcionesOriginales: OpcionElegida[]
  // Sin orden, elegir lo mismo en otro orden no es un cambio.
  ordenada: boolean
  // Este ítem ya tiene un cambio guardado en memoria (se abre modificando) y algún otro ítem también.
  cambiado: boolean
  otrosCambios: boolean
}
export type CambioRegistro = { texto: string; opciones: OpcionElegida[]; eleccionCambiada: boolean }

// Se consulta un registro cerrado sin pregunta pendiente; con una pendiente, se sigue el seguimiento.
export function esConsulta(registro: RegistroConsultado) {
  return (
    registro.estado === 'COMPLETADA' && !registro.respuestas.some((r) => r.estado === 'PENDIENTE_SEGUIMIENTO')
  )
}

// En la consulta solo se recorren las consignas: los diálogos de Lumi no se repiten.
export function actividadConsulta(activity: Actividad): Actividad {
  return { ...activity, nodos: activity.nodos.filter((n) => n.tipo === 'consigna') }
}

export function consolidada(respuesta: RespuestaRegistroPublica | undefined) {
  return respuesta?.texto_consolidado ?? ''
}

const clave = (opciones: OpcionElegida[], ordenada: boolean) => {
  const partes = opciones.map((o) => `${o.codigo}:${o.codigo === 'OTRA' ? (o.texto ?? '').trim() : ''}`)
  return JSON.stringify(ordenada ? partes : partes.sort())
}
export const mismaEleccion = (a: OpcionElegida[], b: OpcionElegida[], ordenada = false) =>
  clave(a, ordenada) === clave(b, ordenada)

export function consultaDe(
  registro: RegistroConsultado,
  definido: ItemRegistroPublico,
  cambios: Record<string, CambioRegistro>,
): ConsultaRegistro {
  const item = definido.codigo
  const respuesta = registro.respuestas.find((r) => r.item === item)
  const original = consolidada(respuesta)
  return {
    pista: registro.items_por_ampliar?.find((p) => p.item === item)?.pista,
    original,
    opcionesOriginales: respuesta?.opciones_elegidas ?? [],
    ordenada: !!definido.eleccion?.ordenada,
    cambiado: item in cambios,
    otrosCambios: Object.keys(cambios).some((codigo) => codigo !== item),
  }
}

// Anota lo escrito y elegido en un ítem: si vuelve a ser igual a lo entregado, deja de ser un cambio.
export function anotarCambio(
  cambios: Record<string, CambioRegistro>,
  registro: RegistroConsultado,
  definido: ItemRegistroPublico,
  texto: string,
  opciones: OpcionElegida[],
) {
  const item = definido.codigo
  const resto = Object.fromEntries(Object.entries(cambios).filter(([codigo]) => codigo !== item))
  const { original, opcionesOriginales, ordenada } = consultaDe(registro, definido, cambios)
  const eleccionCambiada = !mismaEleccion(opciones, opcionesOriginales, ordenada)
  // Un ítem que quedó en blanco también se modifica: su primer texto es un cambio (F02).
  return texto.trim() && (texto !== original || eleccionCambiada)
    ? { ...resto, [item]: { texto, opciones, eleccionCambiada } }
    : resto
}

// Solo se envía la elección de los ítems en que cambió; sin ella, el servidor conserva la entregada.
export function edicionesDe(cambios: Record<string, CambioRegistro>): ItemEdicion[] {
  return Object.entries(cambios).map(([item, { texto, opciones, eleccionCambiada }]) =>
    eleccionCambiada ? { item, texto, opciones } : { item, texto },
  )
}

// Si cambia la elección, la justificación se reescribe (el servidor responde 422 si no). Un ítem que quedó en
// blanco necesita su texto para guardarse.
export function errorConsulta(consulta: ConsultaRegistro, texto: string, opciones: OpcionElegida[]) {
  if (!consulta.original.trim() && opciones.length && !texto.trim())
    return 'Escribe tu respuesta para guardar lo que elegiste.'
  return !mismaEleccion(opciones, consulta.opcionesOriginales, consulta.ordenada) &&
    texto.trim() === consulta.original.trim()
    ? 'Cambiaste tu elección: reescribe tu respuesta para que la explique.'
    : ''
}

// Pie de una consigna en la consulta: «Continuar» en lectura y «Guardar y continuar» al modificar; en la
// última, «Entregar cambios» si algo cambió (también lo que se está escribiendo) o, si no, la salida de la
// pantalla de fin.
export function pieConsulta(
  consulta: ConsultaRegistro,
  ultimo: boolean,
  modificando: boolean,
  texto: string,
  opciones: OpcionElegida[],
) {
  const propio =
    modificando &&
    !!texto.trim() &&
    (texto.trim() !== consulta.original ||
      !mismaEleccion(opciones, consulta.opcionesOriginales, consulta.ordenada))
  const cambiado = consulta.otrosCambios || propio
  return {
    etiqueta: ultimo ? 'Entregar cambios' : modificando ? 'Guardar y continuar' : 'Continuar',
    salir: ultimo && !cambiado,
  }
}

// Lo que dice Lumi en la burbuja de una consigna: el recuerdo del eco y, en la consulta, la pista del ítem por
// ampliar (que se resalta), en una sola burbuja. Sin ninguno de los dos, Lumi no habla.
// F03: `cita` es el recuerdo completo de un resultado (código de interés, ocupaciones), sin registro de origen.
export type EcoRegistro = { estado: 'DISPONIBLE' | 'POR_DESARROLLAR'; texto: string; titulo: string; cita?: string }
export const INTRO_PISTA = 'Aquí podrías contar un poco más:'
export function burbujaRegistro(eco?: EcoRegistro, pista?: string) {
  const recuerdo = !eco
    ? undefined
    : eco.cita
      ? eco.cita
      : eco.estado === 'POR_DESARROLLAR'
        ? 'La vez pasada lo contaste en pocas palabras. Aquí puedes tomarte tu tiempo.'
        : `${reflectionCopy.memory(eco.titulo)}: «${eco.texto}»`
  return recuerdo || pista ? { recuerdo, pista: pista || undefined } : undefined
}
