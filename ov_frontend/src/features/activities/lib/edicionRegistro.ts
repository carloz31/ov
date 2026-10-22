import type { Actividad } from '@/types/activities'
import type { ItemEdicion, RegistroConsultado, RespuestaRegistroPublica } from '@/types/servidor'

// Consulta de un registro entregado (F02): el mismo reproductor, precargado con la respuesta consolidada.
// Cambiar el texto de un ítem es editarlo; la elección no se edita.
export type ConsultaRegistro = {
  pista?: string
  // Solo se edita un ítem entregado: uno no obligatorio que quedó sin responder no tiene consolidada.
  editable: boolean
  original: string
  // Algún otro ítem ya tiene un texto cambiado.
  otrosCambios: boolean
}

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

export function consultaDe(
  registro: RegistroConsultado,
  item: string,
  cambios: Record<string, string>,
): ConsultaRegistro {
  const original = consolidada(registro.respuestas.find((r) => r.item === item))
  return {
    pista: registro.items_por_ampliar?.find((p) => p.item === item)?.pista,
    editable: !!original.trim(),
    original,
    otrosCambios: Object.keys(cambios).some((codigo) => codigo !== item),
  }
}

// Anota el texto de un ítem: si vuelve a ser igual a su consolidada, deja de ser un cambio.
export function anotarCambio(
  cambios: Record<string, string>,
  registro: RegistroConsultado,
  item: string,
  texto: string,
) {
  const resto = Object.fromEntries(Object.entries(cambios).filter(([codigo]) => codigo !== item))
  const { editable, original } = consultaDe(registro, item, cambios)
  return editable && texto.trim() && texto !== original ? { ...resto, [item]: texto } : resto
}

export function edicionesDe(cambios: Record<string, string>): ItemEdicion[] {
  return Object.entries(cambios).map(([item, texto]) => ({ item, texto }))
}

// Pie de una consigna en la consulta: «Continuar» entre consignas; en la última, «Entregar cambios» si algo
// cambió (también el texto que se está escribiendo) o, si no, la salida de la pantalla de fin.
export function pieConsulta(consulta: ConsultaRegistro, ultimo: boolean, texto: string) {
  const cambiado = consulta.otrosCambios || (consulta.editable && !!texto.trim() && texto.trim() !== consulta.original)
  return { etiqueta: ultimo ? 'Entregar cambios' : 'Continuar', salir: ultimo && !cambiado }
}
