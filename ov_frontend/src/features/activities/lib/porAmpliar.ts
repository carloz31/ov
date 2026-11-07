import type { ItemPorAmpliar, ItemRegistroPublico } from '@/types/servidor'
import { enPalabras } from './podio'
import { enumerar } from './finishSummary'

// Ítems por ampliar de un registro cerrado (F01): textos y nombres que comparten el cierre del registro y
// el drawer de la actividad, para que siempre digan lo mismo. «Ampliar» llega con la edición (F02).
export const TITULO_CIERRE_REGISTRO = '¡Listo! Tu registro quedó guardado.'
const LARGO_NOMBRE = 48

export type FilaPorAmpliar = { item: string; nombre: string; pista: string; conEleccion: boolean }

// «Me quedé con ganas de saber un poco más de {una cosa | N cosas} que escribiste.» En el cierre se suma
// la invitación a volver; en el drawer, no.
export function textoPorAmpliar(cantidad: number, { volver }: { volver: boolean }) {
  const cosas = cantidad === 1 ? 'una cosa' : `${enPalabras(cantidad)} cosas`
  return [
    `Me quedé con ganas de saber un poco más de ${cosas} que escribiste.`,
    volver && `Puedes volver a ${cantidad === 1 ? 'ella' : 'ellas'} ahora o cuando quieras.`,
    'Quién sabe, quizá se abra algo nuevo en el camino.',
  ]
    .filter(Boolean)
    .join(' ')
}

// Nombre humano: la etiqueta corta del ítem; si no hay, la consigna recortada; nunca el código interno.
export function nombreItem(item: Pick<ItemRegistroPublico, 'nombre' | 'consigna'> | undefined) {
  const nombre = item?.nombre?.trim()
  if (nombre) return nombre
  const consigna = item?.consigna?.trim() ?? ''
  if (!consigna) return 'Una de tus respuestas'
  if (consigna.length <= LARGO_NOMBRE) return consigna
  const corte = consigna.slice(0, LARGO_NOMBRE)
  return `${corte.slice(0, corte.lastIndexOf(' ') > 0 ? corte.lastIndexOf(' ') : LARGO_NOMBRE)}…`
}

// Ajuste registros: la pista es lo que le faltó (`falta`); sin ella, basta el nombre del ítem.
export function filasPorAmpliar(
  porAmpliar: ItemPorAmpliar[],
  items: ItemRegistroPublico[],
): FilaPorAmpliar[] {
  return porAmpliar.map((p) => {
    const item = items.find((i) => i.codigo === p.item)
    return {
      item: p.item,
      nombre: nombreItem(item),
      pista: p.falta?.trim() ?? '',
      conEleccion: !!item?.eleccion,
    }
  })
}

// Ajuste registros: los ítems que dejó abiertos, nombrados aparte al cerrar.
export function textoAbiertos(abiertos: string[], items: ItemRegistroPublico[]) {
  if (!abiertos.length) return undefined
  const nombres = abiertos.map((codigo) => nombreItem(items.find((i) => i.codigo === codigo)))
  return `Lo dejaste abierto: ${enumerar(nombres)}. Puedes volver cuando lo tengas.`
}
