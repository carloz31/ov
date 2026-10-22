import type { DesbloqueoNuevo } from '@/types/servidor'

export type RecursoCierre = {
  codigo: string
  nombre: string
  persona?: string
  rol?: string
  cita?: string
}
// Filas de «Se abrió para ti». Las secciones van juntas en una fila, con un enlace por nombre.
export type ExtraCierre = {
  tipo: 'SECCIONES' | 'SECCION_PLAN' | 'BLOQUE' | 'ACTIVIDAD' | 'CONVERSACIONES' | 'pieza'
  codigo: string
  texto: string
  secciones?: { codigo: string; nombre: string }[]
}
// Insignias y niveles se muestran como medallas bajo el título, fuera de la lista.
export type MedallaCierre = {
  tipo: 'INSIGNIA' | 'NIVEL'
  codigo: string
  nombre: string
  etiqueta: 'Nueva insignia' | 'Subiste de nivel'
}
export type EntradaCierre = {
  desbloqueos: DesbloqueoNuevo[]
  yaCompletada: boolean
  completada: boolean
  tienePreguntaDiario: boolean
  modoApi?: boolean
  testimonios?: Record<string, Pick<RecursoCierre, 'persona' | 'rol' | 'cita'>>
  pieza?: { nombre: string; codigo: string; obtenidas: number; necesarias: number }
}
export type ResumenCierre = {
  modo: 'consultando' | 'reintento' | 'sinNovedades' | 'soloExtras' | 'recursos'
  titulo: string
  subtitulo: string
  totalRecursos: number
  fichas: RecursoCierre[]
  fichasVisibles: RecursoCierre[]
  fichasOcultas: number
  testimonios: RecursoCierre[]
  testimoniosVisibles: RecursoCierre[]
  testimoniosOcultos: number
  diario: { visible: boolean; nueva: boolean }
  medallas: MedallaCierre[]
  extras: ExtraCierre[]
  // Con mochila: «Se abrió para ti» baja a la columna izquierda si la mochila ocupa mucho alto.
  abiertoAlLado: boolean
}

// «Catálogo, Diario y Planes»: comas y «y» antes del último.
export function enumerar(nombres: string[]) {
  return nombres.length > 1 ? `${nombres.slice(0, -1).join(', ')} y ${nombres.at(-1)}` : (nombres[0] ?? '')
}

export function resumirCierre(entrada: EntradaCierre): ResumenCierre {
  const vistos = new Set<string>()
  const desbloqueos = entrada.desbloqueos.filter((d) => {
    const clave = `${d.tipo_objetivo}:${d.objetivo.codigo}`
    if (vistos.has(clave)) return false
    vistos.add(clave)
    return true
  })
  const recursos = (tipo: 'FICHA' | 'TESTIMONIO'): RecursoCierre[] =>
    desbloqueos
      .filter((d) => d.tipo_objetivo === tipo)
      .map((d) => ({
        ...d.objetivo,
        ...(tipo === 'TESTIMONIO' ? entrada.testimonios?.[d.objetivo.codigo] : {}),
      }))
  const fichas = recursos('FICHA')
  const testimonios = recursos('TESTIMONIO')
  const totalRecursos = fichas.length + testimonios.length
  const de = (tipo: string) => desbloqueos.filter((d) => d.tipo_objetivo === tipo)
  const medallas: MedallaCierre[] = [
    ...de('INSIGNIA').map((d) => ({ tipo: 'INSIGNIA' as const, ...d.objetivo, etiqueta: 'Nueva insignia' as const })),
    ...de('NIVEL').map((d) => ({ tipo: 'NIVEL' as const, ...d.objetivo, etiqueta: 'Subiste de nivel' as const })),
  ]
  const extras: ExtraCierre[] = []
  const secciones = de('SECCION').map((d) => d.objetivo)
  if (secciones.length)
    extras.push({ tipo: 'SECCIONES', codigo: 'secciones', texto: enumerar(secciones.map((s) => s.nombre)), secciones })
  for (const { objetivo } of de('SECCION_PLAN'))
    extras.push({ tipo: 'SECCION_PLAN', codigo: objetivo.codigo, texto: `Nueva sección en tus planes: ${objetivo.nombre}` })
  for (const { objetivo } of de('BLOQUE'))
    extras.push({
      tipo: 'BLOQUE',
      codigo: objetivo.codigo,
      texto: objetivo.codigo === 'CIUDAD' ? 'La ciudad te espera' : `Nueva zona: ${objetivo.nombre}`,
    })
  const actividades = de('ACTIVIDAD').length
  if (actividades)
    extras.push({
      tipo: 'ACTIVIDAD',
      codigo: 'actividades',
      texto: actividades === 1 ? '1 actividad nueva en el mapa' : `${actividades} actividades nuevas en el mapa`,
    })
  if (de('CONVERSACIONES').length)
    extras.push({ tipo: 'CONVERSACIONES', codigo: 'conversaciones', texto: 'Conversaciones disponibles' })
  if (entrada.pieza) {
    const { codigo, nombre, obtenidas, necesarias } = entrada.pieza
    extras.push({
      tipo: 'pieza',
      codigo,
      texto: `Pieza de llave: ${nombre} · ${obtenidas} de ${necesarias} para la ciudad`,
    })
  }
  const hayNovedades = desbloqueos.length > 0 || !!entrada.pieza
  const modo =
    entrada.modoApi && !entrada.completada
      ? 'consultando'
      : totalRecursos > 0
        ? 'recursos'
        : hayNovedades
          ? 'soloExtras'
          : entrada.yaCompletada
            ? 'reintento'
            : 'sinNovedades'
  const titulos = {
    recursos: totalRecursos >= 5 ? '¡Cuántos hallazgos juntos!' : 'Este hallazgo viaja contigo.',
    soloExtras: 'Sigues avanzando.',
    sinNovedades: 'Este hallazgo viaja contigo.',
    reintento: 'Repaso completado.',
    consultando: 'Consultando tu avance.',
  }
  const subtitulos = {
    // La columna de la mochila ya muestra el conteo.
    recursos: 'Tu actividad quedó registrada.',
    soloExtras: 'Tu actividad quedó registrada. Esto es lo que desbloqueaste:',
    sinNovedades: 'Tu actividad quedó registrada.',
    reintento: 'Tu actividad quedó registrada. Esta repetición no trae desbloqueos nuevos.',
    consultando: 'Tu actividad quedó registrada en el servidor.',
  }
  return {
    modo,
    titulo:
      !entrada.modoApi && !entrada.completada && (modo === 'recursos' || modo === 'sinNovedades')
        ? 'Tu avance queda guardado.'
        : titulos[modo],
    subtitulo: subtitulos[modo],
    totalRecursos,
    fichas,
    fichasVisibles: fichas.length > 4 ? fichas.slice(0, 3) : fichas,
    fichasOcultas: fichas.length > 4 ? fichas.length - 3 : 0,
    testimonios,
    testimoniosVisibles: testimonios.slice(0, 2),
    testimoniosOcultos: Math.max(0, testimonios.length - 2),
    diario: {
      visible: entrada.tienePreguntaDiario,
      nueva: desbloqueos.some((d) => d.tipo_objetivo === 'PREGUNTA_DIARIO'),
    },
    medallas,
    extras,
    abiertoAlLado:
      modo === 'recursos' && totalRecursos <= 3 && !(testimonios.length >= 1 && fichas.length >= 2),
  }
}
