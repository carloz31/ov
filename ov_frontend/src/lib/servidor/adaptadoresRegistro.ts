import type {
  ItemRegistroPublico,
  OpcionElegida,
  ReferenciaResuelta,
  RespuestaRegistroPublica,
} from '@/types/servidor'

// F02: un ítem que retoma una elección elige de su propia lista; su referencia ELECCION solo dice qué se
// eligió la vez pasada (la «otra», con su texto). Sin dato, nada. Ajuste registros: si retoma sobre la misma
// referencia que le da las opciones (PLANES en b5-1-decision), lo marcado es la primera: el Plan A actual.
export function anterioresDe(item: ItemRegistroPublico, referencias: ReferenciaResuelta[]): OpcionElegida[] {
  const codigo = item.eleccion?.referencia
  const referencia = codigo ? referencias.find((r) => r.codigo === codigo) : undefined
  if (referencia?.estado !== 'DISPONIBLE') return []
  if (codigo === item.eleccion?.referencia_opciones)
    return (referencia.opciones ?? []).slice(0, 1).map((o) => ({ codigo: o.codigo }))
  return (referencia.opciones ?? []).map((o) =>
    o.codigo === 'OTRA' ? { codigo: 'OTRA', texto: o.texto } : { codigo: o.codigo },
  )
}

// Las referencias que pide un registro: las de sus elecciones que retoman otra o eligen de una referencia y las
// que citan sus consignas.
export function necesitaReferencias(items: ItemRegistroPublico[], ecos: (string | string[] | undefined)[]) {
  return (
    items.some((i) => !!i.eleccion?.referencia || !!i.eleccion?.referencia_opciones) ||
    ecos.some((eco) => codigosEco(eco).length > 0)
  )
}

// Ajuste registros: las opciones que ofrece un ítem son las de su lista o las de su referencia (resuelta para la
// cuenta, en vivo) más sus opciones propias. Así las vistas de elección siguen leyendo `eleccion.opciones`.
export function itemsConOpciones(items: ItemRegistroPublico[], referencias: ReferenciaResuelta[]) {
  return items.map((item) => {
    const eleccion = item.eleccion
    if (!eleccion) return item
    const referencia = eleccion.referencia_opciones
      ? referencias.find((r) => r.codigo === eleccion.referencia_opciones)
      : undefined
    const base =
      eleccion.fuente === 'REFERENCIA'
        ? referencia?.estado === 'DISPONIBLE'
          ? (referencia.opciones ?? []).map((o) => ({ codigo: o.codigo, texto: o.texto }))
          : []
        : eleccion.opciones
    const propias = (eleccion.opciones_propias ?? []).map((o) => ({ codigo: o.codigo, texto: o.texto }))
    return { ...item, eleccion: { ...eleccion, opciones: [...base, ...propias] } }
  })
}

// Exclusivas, preguntas propias y opciones que cierran el ítem sin seguimiento (texto opcional).
export const exclusivasPropias = (item: ItemRegistroPublico) =>
  (item.eleccion?.opciones_propias ?? []).filter((o) => o.exclusiva).map((o) => o.codigo)
export const preguntasPropias = (item: ItemRegistroPublico): Record<string, string> =>
  Object.fromEntries(
    (item.eleccion?.opciones_propias ?? []).flatMap((o) => (o.pregunta_propia ? [[o.codigo, o.pregunta_propia]] : [])),
  )
export const cierraSinSeguimiento = (item: ItemRegistroPublico, seleccion: OpcionElegida[]) => {
  const sin = new Set((item.eleccion?.opciones_propias ?? []).filter((o) => o.sin_seguimiento).map((o) => o.codigo))
  return seleccion.length > 0 && seleccion.every((o) => sin.has(o.codigo))
}

// Premarcado condicionado (ajuste registros): si en el ítem anterior se eligió `opcion`, este llega con `marca`.
export function premarcadoDe(item: ItemRegistroPublico, respuestas: RespuestaRegistroPublica[]): OpcionElegida[] {
  const regla = item.eleccion?.premarcar_si
  if (!regla) return []
  const anterior = respuestas.find((r) => r.item === regla.item)
  return anterior?.opciones_elegidas.some((o) => o.codigo === regla.opcion) ? [{ codigo: regla.marca }] : []
}

// Una opción guardada que la referencia ya no ofrece (un plan eliminado) se muestra con su texto guardado.
export const YA_NO_ESTA = 'ya no está en tu lista'
export function conGuardadas<T extends { codigo: string; texto: string }>(opciones: T[], guardadas: OpcionElegida[]) {
  const faltan = guardadas.filter((g) => g.codigo !== 'OTRA' && g.texto && !opciones.some((o) => o.codigo === g.codigo))
  return [...opciones, ...faltan.map((g) => ({ codigo: g.codigo, texto: `${g.texto} · ${YA_NO_ESTA}` }) as T)]
}

// Ajuste registros: la frase de la zona de eco para un texto que el estudiante dejó abierto.
export const TEXTO_ABIERTO = 'Esto lo dejaste abierto.'

// F03: `eco` nombra una referencia o una lista de ellas.
export const codigosEco = (eco: string | string[] | undefined) => (eco === undefined ? [] : [eco].flat())

// F03: un resultado revelado o una respuesta de cuestionario se citan con los datos del servidor. Sin dato, o
// sin opciones (perfil plano), no hay cita.
export function citaReferencia(referencia: ReferenciaResuelta | undefined, origen?: string): string | undefined {
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
  // Ajuste registros: los datos de la carrera del Plan A (el ingreso es una referencia de su familia) y lo elegido
  // en otro registro, como «Elegiste: …».
  if (referencia.tipo === 'DATOS_CARRERA_PLAN_A')
    return referencia.texto && textos.length ? `Datos de ${referencia.texto}: ${textos.join(' · ')}` : undefined
  if (referencia.tipo === 'ELECCION')
    return textos.length ? `${origen ? `En «${origen}» elegiste` : 'Elegiste'}: ${textos.join(', ')}` : undefined
  // F09: lo que pensaba de la familia de carreras antes de su primera entrevista (día, lo que se necesita y su duda).
  if (referencia.tipo === 'LO_QUE_PIENSO') {
    const parte = (codigo: string) => referencia.opciones?.find((o) => o.codigo === codigo)?.texto
    const [dia, necesita, duda] = [parte('DIA'), parte('NECESITA'), parte('DUDA')]
    if (!referencia.texto || !dia) return undefined
    return [
      `Antes de tu entrevista, sobre ${referencia.texto} pensabas: «${dia}»`,
      necesita && `Para trabajar en esto: «${necesita}»`,
      duda && `Tu duda: «${duda}»`,
    ]
      .filter(Boolean)
      .join('. ')
  }
  return undefined
}

// Ajuste carga-actividades: un diálogo cita además lo que la cuenta escribió (TEXTO) o eligió (ELECCION) en otro
// registro, entre comillas; sin dato, nada. Las demás, como `citaReferencia`.
export function citaDialogo(referencia: ReferenciaResuelta | undefined): string | undefined {
  if (!referencia || referencia.estado === 'SIN_DATO') return undefined
  if (referencia.estado === 'ABIERTA') return TEXTO_ABIERTO
  if (referencia.tipo === 'TEXTO') return referencia.texto ? `«${referencia.texto}»` : undefined
  if (referencia.tipo === 'ELECCION') {
    const textos = (referencia.opciones ?? []).map((o) => o.texto).filter(Boolean)
    return textos.length ? `«${textos.join(' · ')}»` : undefined
  }
  return citaReferencia(referencia)
}

// Une las citas en una burbuja: punto y espacio entre ellas, solo espacio si la anterior ya cierra con punto
// (también dentro de las comillas: «…mío.» Tus pasos…).
export const unirCitas = (citas: string[]) =>
  citas.reduce((texto, cita) => (!texto ? cita : `${texto}${/[.!?]»?$/.test(texto) ? ' ' : '. '}${cita}`), '')

// F07b: la zona de eco de las referencias que no son TEXTO, en el orden del contenido. Los motivos del plan A van
// como chips justo tras su cita (`cita`), y lo que sigue, después de los chips (`citaTras`). Sin dato, nada.
export function ecoDeReferencias(
  referencias: ReferenciaResuelta[],
  // Ajuste registros: el título de la actividad de donde sale una ELECCION.
  origen: (referencia: ReferenciaResuelta) => string = () => '',
) {
  const corte = referencias.findIndex((r) => chipsReferencia(r).length > 0)
  const citas = (lista: ReferenciaResuelta[]) =>
    unirCitas(lista.map((r) => citaReferencia(r, origen(r))).filter((c): c is string => !!c))
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
