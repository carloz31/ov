import { appPaths } from '@/routes/paths'
import type { Actividad, RutaDestino } from '@/types/activities'
import type { OpcionElegida, ReferenciaResuelta, RespuestaRegistroPublica } from '@/types/servidor'

// Ajuste registros: el destino sugerido al cerrar un registro. Los `destinos` del contenido se evalúan en orden y
// gana el primero cuyo ítem tiene la opción («*», cualquiera); sin coincidencia, `destino_por_defecto`. Una ruta
// `null` deja solo «Volver al mapa». Los planes salen de la referencia PLANES de la actividad (A, B).
export type DestinoCierre = { texto: string; ruta: string }

const TEXTOS: Record<Exclude<RutaDestino, null>, string> = {
  familia: 'Ir a Familia',
  catalogo: 'Ir al catálogo',
  'catalogo-familia': 'Ir al catálogo',
  'catalogo-instituciones': 'Ir al catálogo',
  'plan-a': 'Ir a tu Plan A',
  'plan-a-dudas': 'Ir a tu Plan A',
  'plan-b': 'Ir a tu Plan B',
  'mis-planes': 'Ir a Mis planes',
  investigaciones: 'Ir a Investigaciones',
  ciudad: 'Ir a la Ciudad',
}

function rutaDe(ruta: Exclude<RutaDestino, null>, opcion: string | undefined, planes: string[]) {
  const s = appPaths.student
  switch (ruta) {
    case 'familia':
      return s.conversations
    case 'catalogo':
      return s.catalog.careers
    case 'catalogo-familia':
      return opcion ? `${s.catalog.careers}?familia=${encodeURIComponent(opcion)}` : s.catalog.careers
    case 'catalogo-instituciones':
      return s.catalog.institutions
    case 'plan-a':
      return planes[0] ? s.plan(planes[0]) : undefined
    case 'plan-a-dudas':
      return planes[0] ? s.plan(planes[0], 'CONOCIMIENTO') : undefined
    case 'plan-b':
      return planes[1] ? s.plan(planes[1]) : undefined
    case 'mis-planes':
      return s.decisions
    case 'investigaciones':
      return s.investigations
    case 'ciudad':
      return s.exploration
  }
}

export function destinoDe(
  actividad: Pick<Actividad, 'destinos' | 'destino_por_defecto'>,
  respuestas: RespuestaRegistroPublica[],
  referencias: ReferenciaResuelta[] = [],
): DestinoCierre | undefined {
  const elegidas = (item: string): OpcionElegida[] => respuestas.find((r) => r.item === item)?.opciones_elegidas ?? []
  const planes =
    referencias.find((r) => r.tipo === 'PLANES' && r.estado === 'DISPONIBLE')?.opciones?.map((o) => o.codigo) ?? []
  for (const destino of actividad.destinos ?? []) {
    const opciones = elegidas(destino.item)
    const opcion = destino.opcion === '*' ? opciones[0] : opciones.find((o) => o.codigo === destino.opcion)
    if (!opcion) continue
    if (!destino.ruta) return undefined
    const ruta = rutaDe(destino.ruta, opcion.codigo, planes)
    return ruta ? { texto: TEXTOS[destino.ruta], ruta } : undefined
  }
  const porDefecto = actividad.destino_por_defecto
  const ruta = porDefecto ? rutaDe(porDefecto, undefined, planes) : undefined
  return porDefecto && ruta ? { texto: TEXTOS[porDefecto], ruta } : undefined
}
