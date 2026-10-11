import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type PointerEvent,
} from 'react'
import { BlockSign } from './BlockSign'
import { MapNode } from './MapNode'
import { MapPath } from './MapPath'
import type { StudentMapPoint } from '../lib/mapPoints'

import {
  canvasSize,
  initialScale,
  getMinimumScale,
  visibleCenter,
  clampTransform,
  zoomTransform,
  focusTransform,
  mapPosition,
  type MapTransform,
  type MapSize,
} from '../lib/geometry'

export type MapCanvasHandle = {
  centerMap: () => void
  zoom: (factor: number) => void
  setScale: (scale: number) => void
  focusPoint: (id: string) => void
  focusNode: (id?: string) => void
  framePoints: (ids: string[]) => void
}
type Props = {
  points: StudentMapPoint[]
  variant: 'route' | 'open'
  panelOpen: boolean
  panelInset?: number
  selectedId?: string
  recommendedId?: string
  onSelect: (id: string) => void
  onScaleChange: (scale: number) => void
  onMinimumScaleChange?: (scale: number) => void
  mapSize?: MapSize
  backgroundImage: string
  label: string
  locked?: boolean
}

export const MapCanvas = forwardRef<MapCanvasHandle, Props>(function MapCanvas(
  {
    points,
    variant,
    panelOpen,
    panelInset = panelOpen ? 304 : 0,
    selectedId,
    recommendedId,
    onSelect,
    onScaleChange,
    onMinimumScaleChange,
    mapSize = canvasSize,
    backgroundImage,
    label,
    locked,
  },
  ref,
) {
  const viewport = useRef<HTMLDivElement>(null)
  const panelMetrics = useRef({ panelOpen, panelInset })
  panelMetrics.current = { panelOpen, panelInset }
  const drag = useRef<
    { pointerId: number; x: number; y: number; originX: number; originY: number } | undefined
  >(undefined)
  const animationTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const transformRef = useRef<MapTransform>({ x: 0, y: 0, scale: initialScale })
  const [transform, setTransform] = useState(transformRef.current)
  const [dragging, setDragging] = useState(false)
  const [moving, setMoving] = useState(false)
  const apply = useCallback(
    (next: MapTransform, animate = false) => {
      const bounds = viewport.current?.getBoundingClientRect()
      if (!bounds) return
      clearTimeout(animationTimer.current)
      const clamped = clampTransform(next, bounds, mapSize)
      transformRef.current = clamped
      setTransform(clamped)
      setMoving(animate)
      if (animate) animationTimer.current = setTimeout(() => setMoving(false), 400)
    },
    [mapSize],
  )

  const centerMap = useCallback(() => {
    const bounds = viewport.current?.getBoundingClientRect()
    if (!bounds) return
    const center = visibleCenter(bounds, panelMetrics.current.panelOpen, panelMetrics.current.panelInset)
    const scale = Math.max(initialScale, getMinimumScale(bounds, mapSize))
    apply({
      scale,
      x: center.x - (mapSize.width * scale) / 2,
      y: center.y - (mapSize.height * scale) / 2,
    })
  }, [apply, mapSize])
  const setScale = useCallback(
    (scale: number, anchor?: { x: number; y: number }) => {
      const bounds = viewport.current?.getBoundingClientRect()
      if (bounds)
        apply(
          zoomTransform(
            transformRef.current,
            scale,
            anchor ?? visibleCenter(bounds, panelMetrics.current.panelOpen, panelMetrics.current.panelInset),
            bounds,
            mapSize,
          ),
        )
    },
    [apply, mapSize],
  )

  useImperativeHandle(
    ref,
    () => ({
      centerMap,
      setScale,
      zoom: (factor) => setScale(transformRef.current.scale * factor),
      framePoints: (ids) => {
        const positions = points.filter((p) => ids.includes(p.id)).map((p) => mapPosition(p, mapSize))
        const bounds = viewport.current?.getBoundingClientRect()
        if (!bounds || !positions.length) return
        const minX = Math.min(...positions.map((p) => p.x)),
          maxX = Math.max(...positions.map((p) => p.x))
        const minY = Math.min(...positions.map((p) => p.y)),
          maxY = Math.max(...positions.map((p) => p.y))
        const center = visibleCenter(bounds, panelOpen, panelInset)
        const scale = Math.min(
          transformRef.current.scale,
          (bounds.width - panelInset - 64) / (maxX - minX + 240),
          (bounds.height - 140) / (maxY - minY + 220),
        )
        apply(
          { scale, x: center.x - ((minX + maxX) / 2) * scale, y: center.y - ((minY + maxY) / 2) * scale },
          !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        )
      },
      focusNode: (id) => {
        const nodes = viewport.current?.querySelectorAll<HTMLButtonElement>('[data-point-id]')
        Array.from(nodes ?? [])
          .find((node) => node.dataset.pointId === id)
          ?.focus()
      },
      focusPoint: (id) => {
        const point = points.find((item) => item.id === id)
        const bounds = viewport.current?.getBoundingClientRect()
        if (point && bounds)
          apply(focusTransform(transformRef.current, point, bounds, panelOpen, mapSize, panelInset), true)
      },
    }),
    [centerMap, setScale, points, apply, panelOpen, panelInset, mapSize],
  )

  useEffect(() => {
    onScaleChange(transform.scale)
  }, [transform.scale, onScaleChange])
  useEffect(() => {
    centerMap()
    const bounds = viewport.current?.getBoundingClientRect()
    if (bounds) onMinimumScaleChange?.(getMinimumScale(bounds, mapSize))
    let previousBounds = viewport.current?.getBoundingClientRect()
    const observer = new ResizeObserver(() => {
      const bounds = viewport.current?.getBoundingClientRect()
      if (bounds && (bounds.width !== previousBounds?.width || bounds.height !== previousBounds?.height)) {
        previousBounds = bounds
        onMinimumScaleChange?.(getMinimumScale(bounds, mapSize))
        centerMap()
      }
    })
    if (viewport.current) observer.observe(viewport.current)
    return () => {
      observer.disconnect()
      clearTimeout(animationTimer.current)
    }
  }, [centerMap, mapSize, onMinimumScaleChange])
  useEffect(() => {
    const element = viewport.current
    if (!element) return
    const wheel = (event: WheelEvent) => {
      if (event.deltaY === 0) return
      event.preventDefault()
      const bounds = element.getBoundingClientRect()
      setScale(transformRef.current.scale * (event.deltaY > 0 ? 0.9 : 1.1), {
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      })
    }
    element.addEventListener('wheel', wheel, { passive: false })
    return () => element.removeEventListener('wheel', wheel)
  }, [setScale])

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

  return (
    <section
      className={`sx-map-viewport${locked ? ' sx-map-locked' : ''}`}
      ref={viewport}
      aria-label={label}
      data-dragging={dragging || undefined}
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={stopDragging}
      onPointerCancel={stopDragging}
      onLostPointerCapture={stopDragging}
    >
      <div
        className="sx-map-canvas"
        data-moving={moving || undefined}
        style={{
          width: mapSize.width,
          height: mapSize.height,
          transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`,
          transformOrigin: '0 0',
        }}
      >
        <img className="sx-map-image" src={backgroundImage} alt="" aria-hidden="true" draggable={false} />
        <div className="sx-map-vignette" />
        {!locked && (
          <>
            {variant === 'route' && (
              <>
                <MapPath points={points} mapSize={mapSize} />
                <BlockSign points={points} mapSize={mapSize} />
              </>
            )}
            {points
              .filter((p) => !p.revealQueued)
              .map((point) => (
                <MapNode
                  key={point.id}
                  point={point}
                  mapSize={mapSize}
                  recommended={recommendedId === point.id}
                  selected={selectedId === point.id}
                  onSelect={onSelect}
                  onFocus={(id) => {
                    const point = points.find((item) => item.id === id)
                    const bounds = viewport.current?.getBoundingClientRect()
                    if (point && bounds)
                      apply(
                        focusTransform(transformRef.current, point, bounds, panelOpen, mapSize, panelInset),
                        true,
                      )
                  }}
                />
              ))}
          </>
        )}
      </div>
    </section>
  )
})
