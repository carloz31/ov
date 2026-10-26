import { activities, catalog } from '@/data/activities/content'
import { modoApi } from '@/config/env'
import { obtenerEstadoServidor } from '@/store/servidor/sesion'
import { fichaDisponible } from '@/lib/servidor/adaptadores'
import type { JourneyState } from '@/types/activities'
import type { Recurso } from '@/types/activities'
import { appPaths } from '@/routes/paths'
import { cityCases, resourceReading } from '@/data/content/adventure'
import { professionalTestimonials } from '@/data/catalog/occupations'
import type { AdventureState } from '@/types/adventure'
import type { FichaCuenta, TestimonioEstado } from '@/types/servidor'
import type { OrigenFicha } from './agruparFichas'

export type TravelResource = {
  id: string
  title: string
  summary: string
  description: string
  kind: 'sheet' | 'testimonial' | 'interview'
  icon: 'compass' | 'scroll' | 'book' | 'sparkles' | 'quote' | 'flame' | 'languages'
  requirement: { activityId: string } | { caseId: string } | { anyCase: true }
  content?: string
  url?: string
  fileFormat?: Recurso['formatoArchivo']
  source?: string
  author?: string
  // Testimonio del servidor (F04): si está disponible, su pista y el caso que lo regala (ajustes, 7).
  servidor?: {
    disponible: boolean
    pista: string | null
    caso: TestimonioEstado['caso']
    casoDisponible?: boolean
    visto?: boolean
  }
  // Ajuste mochila: favorita en el servidor (en local, `adventure.bookmarks`).
  favorita?: boolean
  // Ajuste mochila: ficha del servidor; su contenido lo pide el modal al abrirse (GET de una ficha).
  contenidoRemoto?: boolean
  // Ajuste mochila: tema, origen y si ya se abrió (en local, solo la actividad de origen).
  ficha?: OrigenFicha & { tema?: string; visto?: boolean }
}

const sheetDetails: Record<
  string,
  Pick<TravelResource, 'summary' | 'description' | 'icon'> & { content?: string; title?: string }
> = {
  'ficha-mitos': {
    summary: 'Cuatro creencias sobre tu futuro, vistas con otros ojos.',
    description:
      'Un pergamino para distinguir rumores de información. Repasa cuatro mitos frecuentes sobre estudios y trabajo, y lleva contigo tres preguntas para poner a prueba cualquier creencia vocacional.',
    icon: 'scroll',
  },
  'rec-ponteencarrera': {
    summary: 'Una guía para comparar caminos de formación.',
    description:
      'Consulta la fuente compartida en La plaza de los rumores y reúne información sobre carreras e instituciones. Compara lo que encuentres con tus intereses, tus posibilidades y las preguntas que todavía quieres resolver.',
    icon: 'book',
    content:
      '## Antes de comparar\n\nAnota las carreras que te interesan y qué necesitas conocer de cada una: formación, institución, duración y trabajo cotidiano.\n\n## Mira más de una pista\n\nUn dato de ingresos no describe toda una profesión. Contrasta la información con conversaciones, experiencias y lo que sabes de ti. Revisa siempre la fecha y la fuente de los datos.',
  },
  'rec-unesco-stem': {
    title: 'Ciencia sin etiquetas',
    summary: 'El talento no tiene género. Explora la ciencia sin estereotipos.',
    description:
      'Una ficha de lectura vinculada a la referencia de UNESCO compartida en la actividad. Úsala para reconocer cómo los estereotipos pueden limitar las opciones que consideramos y para abrir preguntas sobre ciencia, tecnología, ingeniería y matemáticas.',
    icon: 'sparkles',
    content:
      '## Explorar sin etiquetas\n\nLas profesiones no pertenecen a un género. Al explorar ciencia, tecnología, ingeniería o matemáticas, observa tus intereses y las oportunidades para aprender.\n\n## Una pregunta para llevar contigo\n\n¿Hay alguna opción que has descartado por lo que otras personas esperan de ti? Busca experiencias de personas con recorridos distintos y pregunta qué habilidades desarrollaron.\n\n## Referencia de la actividad\n\nUNESCO (2017). Descifrar el código: la educación de las niñas y las mujeres en STEM.',
  },
}

function desdeRecurso(resource: Recurso, requirement: TravelResource['requirement']): TravelResource {
  const details = sheetDetails[resource.id]
  return {
    id: resource.id,
    title: details?.title ?? resource.titulo,
    kind: 'sheet',
    icon: details?.icon ?? 'scroll',
    summary: resource.resumen ?? details?.summary ?? 'Una ficha para seguir explorando tu camino.',
    description:
      resource.descripcion ??
      details?.description ??
      resource.resumen ??
      'Revisa las pistas que reuniste durante esta actividad.',
    requirement,
    ficha: origenLocal(requirement),
    content: resource.contenido ?? details?.content,
    url: resource.url,
    fileFormat: resource.formatoArchivo,
    source: resource.fuente,
  }
}
function origenLocal(requirement: TravelResource['requirement']): TravelResource['ficha'] {
  if (!('activityId' in requirement)) return undefined
  const activity = activities.find((item) => item.id === requirement.activityId)
  return { actividad: { codigo: requirement.activityId, titulo: activity?.titulo ?? requirement.activityId } }
}
// F04d: cualquier recurso del catálogo por su código, aunque no lo use una actividad local (las fichas de
// `ruta`, los enlaces de una diapositiva). Con `titulo`, el del servidor.
export function recursoDesdeCatalogo(codigo: string, titulo?: string): TravelResource | undefined {
  const resource = catalog.recursos.find((r) => r.id === codigo)
  if (!resource) return undefined
  const recurso = desdeRecurso(resource, { anyCase: true })
  return titulo ? { ...recurso, title: titulo } : recurso
}

export function getTravelResources(testimonios?: TestimonioEstado[] | null): TravelResource[] {
  const sheets = catalog.recursos
    .filter(
      (resource) => resource.guardableEnRecursos && resource.tipo !== 'video' && resource.tipo !== 'audio',
    )
    .flatMap((resource): TravelResource[] => {
      const activity = activities.find(
        (item) =>
          item.recompensa?.recursoIds?.includes(resource.id) ||
          item.nodos.some((node) => node.tipo === 'diapositiva' && node.recursoIds?.includes(resource.id)),
      )
      return activity ? [desdeRecurso(resource, { activityId: activity.id })] : []
    })
  const resources: TravelResource[] = [
    {
      id: 'first-steps',
      title: 'Tres pistas para comenzar el viaje',
      summary: 'Observar, conversar y probar: tu primera brújula.',
      description:
        'Una guía breve para los primeros pasos de tu aventura. Vuelve a estas ideas cuando necesites recordar que puedes explorar con curiosidad, hacer preguntas y probar una experiencia pequeña antes de decidir.',
      kind: 'sheet',
      icon: 'compass',
      requirement: { activityId: 'mission-welcome' },
      ficha: origenLocal({ activityId: 'mission-welcome' }),
      content: `## Tu primera brújula\n\n${resourceReading}\n\n## Tres pistas\n\n**Observa:** reconoce qué disfrutas, qué te cuesta y qué despierta tu curiosidad.\n\n**Conversa:** pregunta a personas de distintas profesiones cómo viven su trabajo.\n\n**Prueba:** elige una experiencia pequeña que te permita conocer algo nuevo.`,
    },
    ...sheets,
    ...localTestimonials(),
  ]
  // F04d: en api, las fichas de la mochila son las de la cuenta en el servidor (título y estado), con el
  // contenido del catálogo del front; aparecen en cuanto se desbloquean, sin «guardarlas».
  return modoApi
    ? [
        ...(obtenerEstadoServidor().fichas.datos ?? []).flatMap((f) =>
          f.estado === 'DISPONIBLE' ? fichaServidor(f) : (recursoDeFicha(f.codigo, f.titulo) ?? []),
        ),
        ...(testimonios ?? []).map(testimonioServidor),
      ]
    : resources
}
// Ajustes Central (7): como el prototipo local. Disponible: persona, ocupación y años (`author`), la cita
// (`summary`), el texto completo y el video. Bloqueado: la pista como intriga y el caso que lo regala.
export function testimonioServidor(t: TestimonioEstado): TravelResource {
  const disponible = t.estado === 'DISPONIBLE'
  const autor = [
    t.persona,
    t.ocupacion?.titulo,
    t.anios_experiencia !== null ? `${t.anios_experiencia} años de experiencia` : null,
  ].filter(Boolean)
  return {
    id: t.codigo,
    title: t.titulo,
    summary: (disponible ? t.cita : t.pista) ?? '',
    description: t.descripcion ?? '',
    kind: 'testimonial',
    icon: 'quote',
    requirement: { anyCase: true },
    url: t.enlace ?? undefined,
    ...(t.persona ? { author: autor.join(' · ') } : {}),
    favorita: t.es_favorita,
    servidor: { disponible, pista: t.pista, caso: t.caso, casoDisponible: t.caso_disponible, visto: t.visto },
  }
}
function localTestimonials() {
  return professionalTestimonials.map((item): TravelResource => ({
    id: item.id,
    title: item.occupationId === 'paramedic' ? 'Calma y cuidado en una emergencia' : 'Puentes entre idiomas',
    summary: item.summary,
    description: item.story,
    kind: 'testimonial',
    icon: item.occupationId === 'paramedic' ? 'flame' : 'languages',
    requirement: { caseId: item.unlockCaseId },
    url: item.youtubeUrl,
    author: `${item.personName} · ${item.currentRole} · ${item.yearsExperience} años de experiencia`,
  }))
}

export function isTravelResourceUnlocked(
  resource: TravelResource,
  journey: JourneyState,
  adventure: AdventureState,
) {
  if (modoApi)
    return resource.kind === 'sheet'
      ? fichaDisponible(obtenerEstadoServidor().fichas.datos, resource.id)
      : !!resource.servidor?.disponible
  if ('activityId' in resource.requirement)
    return journey.progress[resource.requirement.activityId]?.estado === 'completada'
  if ('caseId' in resource.requirement) return adventure.solvedCaseIds.includes(resource.requirement.caseId)
  return cityCases.some((item) => adventure.solvedCaseIds.includes(item.id))
}

export function resourceRequirement(resource: TravelResource) {
  const caso = resource.servidor?.caso
  if (modoApi && caso)
    return {
      text: `Completa la misión «${caso.titulo}» en Central de Casos.`,
      url: appPaths.student.exploration,
      label: 'Ir a Central de Casos',
    }
  if (modoApi)
    return {
      text: 'Consulta el requisito de esta ficha.',
      url: `${appPaths.student.resources}?requisito=${encodeURIComponent(resource.id)}`,
      label: 'Ver requisito',
    }
  const requirement = resource.requirement
  if ('activityId' in requirement) {
    const activity = activities.find((item) => item.id === requirement.activityId)
    return {
      text: `Completa la actividad «${activity?.titulo ?? requirement.activityId}».`,
      url: `${appPaths.student.missions}?actividad=${encodeURIComponent(requirement.activityId)}`,
      label: 'Ir a la actividad',
    }
  }
  if ('caseId' in requirement) {
    const mission = cityCases.find((item) => item.id === requirement.caseId)
    return {
      text: `Completa la misión «${mission?.title ?? requirement.caseId}» en Central de Casos.`,
      url: appPaths.student.exploration,
      label: 'Ir a Central de Casos',
    }
  }
  return {
    text: 'Completa una misión de Central de Casos, como «Incendio forestal».',
    url: appPaths.student.exploration,
    label: 'Ir a Central de Casos',
  }
}

export function youtubeEmbedUrl(raw: string | undefined) {
  if (!raw) return null
  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:') return null
    const host = url.hostname.toLowerCase()
    const id =
      host === 'youtu.be'
        ? url.pathname.slice(1).split('/')[0]
        : [
              'youtube.com',
              'www.youtube.com',
              'm.youtube.com',
              'youtube-nocookie.com',
              'www.youtube-nocookie.com',
            ].includes(host)
          ? url.pathname === '/watch'
            ? url.searchParams.get('v')
            : /^\/(embed|shorts|live)\//.test(url.pathname)
              ? url.pathname.split('/')[2]
              : null
          : null
    return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null
  } catch {
    return null
  }
}

export function resourceFileUrl(raw: string | undefined) {
  if (!raw) return null
  if (/^\/(?!\/)/.test(raw) && !raw.includes('\\')) return raw
  try {
    const url = new URL(raw)
    return url.protocol === 'https:' ? url.href : null
  } catch {
    return null
  }
}
// Ajuste mochila: una ficha obtenida en api, con su contenido, tema y origen del servidor.
export function fichaServidor(f: FichaCuenta): TravelResource {
  return {
    id: f.codigo,
    title: f.titulo,
    kind: 'sheet',
    icon: 'scroll',
    summary: f.descripcion ?? '',
    description: f.descripcion ?? '',
    requirement: { anyCase: true },
    contenidoRemoto: true,
    favorita: f.es_favorita,
    ficha: {
      tema: f.tema ?? undefined,
      actividad: f.actividad ?? undefined,
      tramo: f.tramo ?? undefined,
      obtenidaEn: f.obtenida_en ?? undefined,
      visto: f.visto,
    },
  }
}
// Una ficha del servidor sin contenido en el front se abre igual: el visor avisa que llegará pronto.
export function recursoDeFicha(codigo: string, titulo?: string): TravelResource | undefined {
  return (
    recursoDesdeCatalogo(codigo, titulo) ??
    (titulo
      ? {
          id: codigo,
          title: titulo,
          kind: 'sheet',
          icon: 'scroll',
          summary: '',
          description: '',
          requirement: { anyCase: true },
        }
      : undefined)
  )
}
