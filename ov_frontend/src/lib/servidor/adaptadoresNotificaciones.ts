import type { NotificacionPublica } from '@/types/servidor'

// Ajuste notificaciones: una notificación del servidor, lista para el toast y la campana. Los textos son del
// front; el servidor manda `nombre` (foto del nombre del objetivo, la entrevista o la conversación) y `detalle`.
export type TipoAviso =
  | 'badge'
  | 'ficha'
  | 'ciudad'
  | 'nivel'
  | 'conversacion'
  | 'destacada'
  | 'leyenda'
  | 'reaccion'
export type AvisoServidor = {
  id: string
  kind: TipoAviso
  title: string
  description: string
  href: string
  // Llega de otra cuenta: nunca es toast y en la campana va primero, con su propio acento.
  asincrona: boolean
  vista: boolean
  // Apoderado: el hijo que se elige antes de abrir la conversación.
  hijo?: string
}
export type PortalNotificaciones = 'estudiante' | 'apoderado'

const enlace = (base: string, codigo: string) => `${base}${encodeURIComponent(codigo)}`

function desbloqueo(n: NotificacionPublica, portal: PortalNotificaciones) {
  switch (n.detalle) {
    case 'INSIGNIA':
      return {
        kind: 'badge' as const,
        description: 'Un nuevo sello cuenta una parte de tu viaje.',
        href: '/student/profile?section=passport',
      }
    case 'FICHA':
      return portal === 'apoderado'
        ? { kind: 'ficha' as const, description: 'Una nueva ficha para usted.', href: '/parent/activities' }
        : {
            kind: 'ficha' as const,
            description: 'Una nueva ficha viaja en tu mochila.',
            href: enlace('/student/resources?ficha=', n.referencia),
          }
    case 'NIVEL':
      return {
        kind: 'nivel' as const,
        description: `Subiste a ${n.nombre}.`,
        href: '/student/profile?section=passport#nivel',
      }
    case 'BLOQUE':
      return {
        kind: 'ciudad' as const,
        title: 'La ciudad te espera',
        description: 'Tu camino abrió nuevas posibilidades.',
        href: '/student/exploration',
      }
    default:
      return null
  }
}

export function notificacionLegible(
  n: NotificacionPublica,
  portal: PortalNotificaciones = 'estudiante',
): AvisoServidor | null {
  const base = { id: n.codigo, title: n.nombre, vista: n.vista }
  const entrevista = enlace('/student/investigations/', n.referencia)
  switch (n.tipo) {
    case 'DESBLOQUEO': {
      const logro = desbloqueo(n, portal)
      return logro && { ...base, asincrona: false, ...logro }
    }
    case 'RESPUESTA_CONVERSACION':
      return {
        ...base,
        kind: 'conversacion',
        asincrona: true,
        description: `Respondieron «${n.nombre}». Es tu turno de leer.`,
        href:
          portal === 'apoderado'
            ? enlace('/parent/conversations/tema/', n.referencia)
            : enlace('/student/conversations/tema/', n.referencia),
        ...(n.estudiante ? { hijo: n.estudiante } : {}),
      }
    case 'ENTREVISTA_DESTACADA':
      return {
        ...base,
        kind: 'destacada',
        asincrona: true,
        description: `Tu orientadora destacó «${n.nombre}».`,
        href: entrevista,
      }
    case 'ENTREVISTA_LEYENDA':
      return {
        ...base,
        kind: 'leyenda',
        asincrona: true,
        description: `«${n.nombre}» ya es Leyenda.`,
        href: entrevista,
      }
    case 'REACCION_ENTREVISTA':
      return {
        ...base,
        kind: 'reaccion',
        asincrona: true,
        description: n.detalle ? `«${n.detalle}» en «${n.nombre}».` : `Reaccionaron a «${n.nombre}».`,
        href: entrevista,
      }
    default:
      return null
  }
}

// La campana: las asíncronas sin ver primero, luego el resto sin ver y al final las vistas; cada grupo conserva
// el orden del servidor (de la más reciente a la más antigua).
export function ordenCampana(avisos: AvisoServidor[]): AvisoServidor[] {
  const peso = (a: AvisoServidor) => (a.vista ? 2 : a.asincrona ? 0 : 1)
  return avisos.map((a, i) => ({ a, i })).sort((x, y) => peso(x.a) - peso(y.a) || x.i - y.i).map(({ a }) => a)
}
