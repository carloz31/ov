import { useState, useRef, type PointerEvent, type RefObject } from 'react'
import type { MapTransform } from '../lib/geometry'

// Arrastre del lienzo del mapa con el puntero (no desde un botón, campo o enlace, ni con el mapa bloqueado).
export function useArrastreMapa(
  apply: (next: MapTransform) => void,
  transformRef: RefObject<MapTransform>,
  locked?: boolean,
) {
  const drag = useRef<
    { pointerId: number; x: number; y: number; originX: number; originY: number } | undefined
  >(undefined)
  const [dragging, setDragging] = useState(false)
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
    apply({
      ...transformRef.current,
      x: origin.originX + event.clientX - origin.x,
      y: origin.originY + event.clientY - origin.y,
    })
  }
  function stopDragging() {
    drag.current = undefined
    setDragging(false)
  }
  return { dragging, pointerDown, pointerMove, stopDragging }
}
