import type { ItemRegistroPublico, OpcionElegida, ReferenciaResuelta } from '@/types/servidor'

// F02: un ítem que retoma una elección elige de su propia lista; su referencia ELECCION solo dice qué se
// eligió la vez pasada (la «otra», con su texto). Sin dato, nada.
export function anterioresDe(item: ItemRegistroPublico, referencias: ReferenciaResuelta[]): OpcionElegida[] {
  const codigo = item.eleccion?.referencia
  const referencia = codigo ? referencias.find((r) => r.codigo === codigo) : undefined
  if (referencia?.estado !== 'DISPONIBLE') return []
  return (referencia.opciones ?? []).map((o) =>
    o.codigo === 'OTRA' ? { codigo: 'OTRA', texto: o.texto } : { codigo: o.codigo },
  )
}

// Las referencias que pide un registro: las de sus elecciones que retoman otra y las que citan sus consignas.
export function necesitaReferencias(items: ItemRegistroPublico[], ecos: (string | string[] | undefined)[]) {
  return items.some((i) => !!i.eleccion?.referencia) || ecos.some((eco) => codigosEco(eco).length > 0)
}

// F03: `eco` nombra una referencia o una lista de ellas.
export const codigosEco = (eco: string | string[] | undefined) => (eco === undefined ? [] : [eco].flat())

// F03: un resultado revelado o una respuesta de cuestionario se citan con los datos del servidor. Sin dato, o
// sin opciones (perfil plano), no hay cita.
export function citaReferencia(referencia: ReferenciaResuelta | undefined): string | undefined {
  if (referencia?.estado !== 'DISPONIBLE') return undefined
  const textos = (referencia.opciones ?? []).map((o) => o.texto)
  if (referencia.tipo === 'RESULTADO')
    return textos.length ? `Tu código de interés: ${textos.join(' · ')}` : undefined
  if (referencia.tipo === 'COINCIDENCIAS')
    return textos.length ? `Ocupaciones afines: ${textos.slice(0, 3).join(', ')}` : undefined
  if (referencia.tipo === 'RESPUESTA_CUESTIONARIO')
    return referencia.texto ? `«${referencia.texto}»` : undefined
  // F07b: las referencias de los planes. PLANES por prioridad (A, B, C); PLAN, la carrera del plan A con su relato
  // (sus motivos van como chips, `chipsReferencia`); PASOS_PLAN_A, sus pasos; OPCION_INICIAL, la carrera.
  if (referencia.tipo === 'PLANES')
    return textos.length
      ? `Tus planes: ${textos.map((t, i) => `${'ABC'[i] ?? ''} · ${t}`).join(', ')}`
      : undefined
  if (referencia.tipo === 'PLAN') {
    if (!referencia.texto) return undefined
    return referencia.cita
      ? `Tu plan A, ${referencia.texto}: «${referencia.cita}»`
      : `Tu plan A, ${referencia.texto}`
  }
  if (referencia.tipo === 'PASOS_PLAN_A')
    return textos.length ? `Tus pasos: ${textos.map((t) => `«${t}»`).join(', ')}` : undefined
  if (referencia.tipo === 'OPCION_INICIAL')
    return referencia.texto ? `Tu primer interés: ${referencia.texto}` : undefined
  return undefined
}

// Une las citas en una burbuja: punto y espacio entre ellas, solo espacio si la anterior ya cierra con punto
// (también dentro de las comillas: «…mío.» Tus pasos…).
export const unirCitas = (citas: string[]) =>
  citas.reduce((texto, cita) => (!texto ? cita : `${texto}${/[.!?]»?$/.test(texto) ? ' ' : '. '}${cita}`), '')

// F07b: la zona de eco de las referencias que no son TEXTO, en el orden del contenido. Los motivos del plan A van
// como chips justo tras su cita (`cita`), y lo que sigue, después de los chips (`citaTras`). Sin dato, nada.
export function ecoDeReferencias(referencias: ReferenciaResuelta[]) {
  const corte = referencias.findIndex((r) => chipsReferencia(r).length > 0)
  const citas = (lista: ReferenciaResuelta[]) =>
    unirCitas(lista.map(citaReferencia).filter((c): c is string => !!c))
  const cita = citas(corte < 0 ? referencias : referencias.slice(0, corte + 1))
  const citaTras = corte < 0 ? '' : citas(referencias.slice(corte + 1))
  if (!cita && !citaTras) return undefined
  const chips = corte < 0 ? [] : chipsReferencia(referencias[corte])
  return {
    cita: cita || citaTras,
    ...(chips.length && cita ? { chips } : {}),
    ...(citaTras && cita ? { citaTras } : {}),
  }
}

// F07b: los motivos del plan A (referencia PLAN), que la zona de eco muestra como chips.
export function chipsReferencia(referencia: ReferenciaResuelta | undefined): string[] {
  if (referencia?.estado !== 'DISPONIBLE' || referencia.tipo !== 'PLAN') return []
  return (referencia.opciones ?? []).map((o) => o.texto)
}
