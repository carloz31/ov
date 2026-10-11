import type { DesbloqueoNuevo } from '@/types/servidor'

export type RecursoCierre = {
  codigo: string
  nombre: string
  persona?: string
  rol?: string
  cita?: string
}
export type ExtraCierre = {
  tipo: 'NIVEL' | 'INSIGNIA' | 'BLOQUE' | 'ACTIVIDAD' | 'CONVERSACIONES' | 'pieza'
  codigo: string
  texto: string
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
  extras: ExtraCierre[]
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
  const extras: ExtraCierre[] = []
  const tipos = ['NIVEL', 'INSIGNIA', 'BLOQUE', 'ACTIVIDAD', 'CONVERSACIONES'] as const
  for (const tipo of tipos) {
    const grupo = desbloqueos.filter((d) => d.tipo_objetivo === tipo)
    if (tipo === 'ACTIVIDAD' && grupo.length > 1) {
      extras.push({ tipo, codigo: 'actividades', texto: `${grupo.length} actividades nuevas` })
      continue
    }
    for (const {
      objetivo: { codigo, nombre },
    } of grupo) {
      const textos = {
        NIVEL: `Subiste a ${nombre}`,
        INSIGNIA: `Nueva insignia: ${nombre}`,
        BLOQUE: codigo === 'CIUDAD' ? 'La ciudad te espera' : `Nueva zona: ${nombre}`,
        ACTIVIDAD: `Se abrió: ${nombre}`,
        CONVERSACIONES: 'Conversaciones disponibles',
      }
      extras.push({ tipo, codigo, texto: textos[tipo] })
    }
  }
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
    recursos: `Tu actividad quedó registrada. Guardamos ${totalRecursos} ${totalRecursos === 1 ? 'recurso nuevo' : 'recursos nuevos'} en tu mochila.`,
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
    extras,
  }
}
