import { useEffect, useState, useRef, type PointerEvent, type RefObject } from 'react'
import type { MapTransform } from '../lib/geometry'

// Arrastre del lienzo del mapa con el puntero (no desde un botón, campo o enlace, ni con el mapa bloqueado).
// Ajuste mapa-celular: los movimientos se agrupan en uno por cuadro (requestAnimationFrame); la posición sigue en el
// estado de React, a través de `apply`. Donde no hay requestAnimationFrame, cada movimiento se aplica al momento.
export function useArrastreMapa(
  apply: (next: MapTransform) => void,
  transformRef: RefObject<MapTransform>,
  locked?: boolean,
) {
  const drag = useRef<
    { pointerId: number; x: number; y: number; originX: number; originY: number } | undefined
  >(undefined)
  const pendiente = useRef<MapTransform | undefined>(undefined)
  const cuadro = useRef<number | undefined>(undefined)
  const [dragging, setDragging] = useState(false)
  useEffect(
    () => () => {
      if (cuadro.current !== undefined) cancelAnimationFrame(cuadro.current)
    },
    [],
  )
  function aplicarPendiente() {
    cuadro.current = undefined
    const siguiente = pendiente.current
    pendiente.current = undefined
    if (siguiente) apply(siguiente)
  }
  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || (event.target as HTMLElement).closest('button,input,a') || locked) return
    drag.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      originX: transformRef.current.x,
      originY: transformRef.current.y,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragging(true)
  }
  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const origin = drag.current
    if (!origin || origin.pointerId !== event.pointerId) return
    pendiente.current = {
      ...transformRef.current,
      x: origin.originX + event.clientX - origin.x,
      y: origin.originY + event.clientY - origin.y,
    }
    if (typeof requestAnimationFrame !== 'function') aplicarPendiente()
    else if (cuadro.current === undefined) cuadro.current = requestAnimationFrame(aplicarPendiente)
  }
  function stopDragging() {
    // Lo último que se movió antes de soltar se aplica de inmediato.
    if (cuadro.current !== undefined) {
      cancelAnimationFrame(cuadro.current)
      aplicarPendiente()
    }
    drag.current = undefined
    setDragging(false)
  }
  return { dragging, pointerDown, pointerMove, stopDragging }
}
