import type {
  ItemRegistroCuenta,
  OpcionElegida,
  OpcionOfrecida,
  PasoRegistro,
  ReferenciaResuelta,
  RegistroConsultado,
  RespuestaVigente,
} from '@/types/servidor'

// Ajuste front de registros (lote 1): el registro llega del servidor con la consigna de cada ítem ya resuelta, sus
// opciones, sus ecos y la respuesta vigente. Estas funciones son puras: el hook arma el flujo con ellas.

export const itemDe = (registro: RegistroConsultado | null | undefined, codigo: string | undefined) =>
  codigo ? registro?.items.find((i) => i.codigo === codigo) : undefined

// La «Otra» se envía con el código que espera el backend: OTRA en un ítem de una opción, OTRA-1 en los de varias.
export const codigoOtra = (item: ItemRegistroCuenta) => ((item.eleccion?.maxima ?? 1) > 1 ? 'OTRA-1' : 'OTRA')
export const esOtra = (codigo: string) => codigo === 'OTRA' || codigo.startsWith('OTRA-')

// La opción marcada que trae `pregunta` y `arranque` reemplaza a los del ítem (la primera marcada que los traiga).
export function consignaVigente(item: ItemRegistroCuenta, marcadas: OpcionElegida[]) {
  const consigna = item.consigna
  const propia = marcadas
    .map((m) => item.opciones.find((o) => o.codigo === m.codigo))
    .find((o): o is OpcionOfrecida => !!o?.pregunta)
  return {
    dialogo: consigna?.dialogo ?? null,
    preguntaEleccion: consigna?.pregunta_eleccion ?? null,
    preguntaTexto: propia?.pregunta ?? consigna?.pregunta_texto ?? '',
    arranque: (propia ? propia.arranque : null) ?? consigna?.arranque ?? null,
  }
}

// El texto se exige no vacío, salvo que la opción marcada vaya sin LLM. No hay mínimo de caracteres.
export function requiereTexto(item: ItemRegistroCuenta, marcadas: OpcionElegida[]) {
  const primera = marcadas[0] && item.opciones.find((o) => o.codigo === marcadas[0].codigo)
  return !primera?.sin_llm
}

// Lote 2 (§1 y §7): cuando la pregunta de texto depende de lo que se marque (alguna opción trae una pregunta distinta
// de la del ítem, como en b1-7-dia), la pregunta y su caja aparecen al marcar. Lo escrito se conserva igual.
export function textoVisible(item: ItemRegistroCuenta, marcadas: OpcionElegida[]) {
  const propia = (o: OpcionOfrecida) => !!o.pregunta && o.pregunta !== item.consigna?.pregunta_texto
  return marcadas.length > 0 || !item.opciones.some(propia)
}

// El ítem o la opción marcada no pasan por el LLM: la pantalla de Lumi no espera.
export function sinLlm(item: ItemRegistroCuenta, marcadas: OpcionElegida[]) {
  const primera = marcadas[0] && item.opciones.find((o) => o.codigo === marcadas[0].codigo)
  return !item.con_llm || !!primera?.sin_llm
}

// Lo que se valida antes de enviar: un error de selección, o nada.
export type ErrorSeleccion = 'eleccion' | 'otra'
export function errorSeleccion(item: ItemRegistroCuenta, marcadas: OpcionElegida[]): ErrorSeleccion | undefined {
  if (!item.eleccion) return undefined
  if (marcadas.length < Math.max(1, item.eleccion.minima)) return 'eleccion'
  if (marcadas.some((m) => esOtra(m.codigo) && !m.texto?.trim())) return 'otra'
  return undefined
}

// Lo marcado como se envía: una «Otra» con su texto sin espacios de más; una pieza (opción con origen) con el texto
// con que se ofrece, que el backend exige (lote 2: antes se enviaba solo su código y el servidor la rechazaba).
export const paraEnviar = (item: ItemRegistroCuenta, marcadas: OpcionElegida[]): OpcionElegida[] =>
  marcadas.map((o) => {
    if (esOtra(o.codigo)) return { codigo: o.codigo, texto: o.texto?.trim() }
    const pieza = item.opciones.find((x) => x.codigo === o.codigo && x.origen)
    return pieza ? { codigo: o.codigo, texto: pieza.texto } : { codigo: o.codigo }
  })

// La caja de edición: la primera respuesta y, en la línea siguiente, la línea del seguimiento.
export const cajaEdicion = (respuesta: RespuestaVigente) =>
  respuesta.linea_seguimiento
    ? `${respuesta.primera_respuesta}\n${respuesta.linea_seguimiento}`
    : respuesta.primera_respuesta

// Lo marcado al editar: lo guardado, con el texto de la «Otra».
export const marcadasDe = (respuesta: RespuestaVigente): OpcionElegida[] =>
  respuesta.opciones_elegidas.map((o) => (esOtra(o.codigo) ? { codigo: o.codigo, texto: o.texto } : { codigo: o.codigo }))

// Un solo aviso por ítem respondido: sin evaluar, eco cambiado o la pista, en ese orden.
export type AvisoItem = { tipo: 'reenviable' } | { tipo: 'eco_cambiado' } | { tipo: 'pista'; texto: string }
export function avisoDe(respuesta: RespuestaVigente | null | undefined): AvisoItem | undefined {
  if (!respuesta) return undefined
  if (respuesta.reenviable) return { tipo: 'reenviable' }
  if (respuesta.eco_cambiado) return { tipo: 'eco_cambiado' }
  return respuesta.pista ? { tipo: 'pista', texto: respuesta.pista } : undefined
}

// Qué dice Lumi tras un paso. En la primera respuesta, REPREGUNTA abre el campo corto. Tras la repregunta (o al
// reenviar el seguimiento), SIGUIENTE con pista dice que aún queda algo por preguntar. El front nunca recibe el tipo:
// mira `respuesta.pista` del ítem en el registro que devuelve el paso.
export type DesenlaceLumi =
  | { tipo: 'repregunta'; texto: string }
  | { tipo: 'mensaje'; texto: string }
  | { tipo: 'confirmacion' }
  | { tipo: 'con_pista' }
export function desenlace(paso: PasoRegistro, trasRepregunta: boolean): DesenlaceLumi {
  if (paso.paso === 'MENSAJE') return { tipo: 'mensaje', texto: paso.mensaje ?? '' }
  if (paso.paso === 'REPREGUNTA' && !trasRepregunta) return { tipo: 'repregunta', texto: paso.repregunta ?? '' }
  const respuesta = itemDe(paso.registro, paso.item)?.respuesta
  return trasRepregunta && respuesta?.pista ? { tipo: 'con_pista' } : { tipo: 'confirmacion' }
}

// Las referencias que pide un registro: solo las que citan sus diálogos (la apertura).
export const necesitaReferencias = (ecos: (string | string[] | undefined)[]) =>
  ecos.some((eco) => codigosEco(eco).length > 0)

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
