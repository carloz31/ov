export const logicalCanvasSize = { width: 1080, height: 660 }
export const imageSize = { width: 1672, height: 941 }
export const canvasSize = { width: imageSize.width * 3, height: imageSize.height * 3 }
export const initialScale = 0.5
export const maxScale = 1.4
export type MapTransform = { x: number; y: number; scale: number }
export type MapSize = { width: number; height: number }
type Bounds = MapSize

export function getMinimumScale(bounds: Bounds, size: MapSize = canvasSize) {
  return Math.min(
    maxScale,
    Math.max(Math.max(1, bounds.width) / size.width, Math.max(1, bounds.height) / size.height),
  )
}

export function mapPosition(point: { x: number; y: number }, size: MapSize = canvasSize) {
  return {
    x: (point.x / logicalCanvasSize.width) * size.width,
    y: (point.y / logicalCanvasSize.height) * size.height,
  }
}
export function visibleCenter(bounds: Bounds, panelOpen: boolean, panelInset = panelOpen ? 304 : 0) {
  const left = Math.min(Math.max(0, panelInset), bounds.width)
  return { x: left + (bounds.width - left) / 2, y: bounds.height / 2 }
}
export function clampTransform(next: MapTransform, bounds: Bounds, size: MapSize = canvasSize): MapTransform {
  const scale = Math.min(maxScale, Math.max(getMinimumScale(bounds, size), next.scale))
  const imageWidth = size.width * scale
  const imageHeight = size.height * scale
  const minX = imageWidth > bounds.width ? bounds.width - imageWidth : (bounds.width - imageWidth) / 2
  // Focus and drag share the same limits so neither can expose an empty strip.
  const maxX = imageWidth > bounds.width ? 0 : minX
  const minY = imageHeight > bounds.height ? bounds.height - imageHeight : (bounds.height - imageHeight) / 2
  const maxY = imageHeight > bounds.height ? 0 : minY
  return { scale, x: Math.min(maxX, Math.max(minX, next.x)), y: Math.min(maxY, Math.max(minY, next.y)) }
}
export function zoomTransform(
  current: MapTransform,
  scale: number,
  anchor: { x: number; y: number },
  bounds: Bounds,
  size: MapSize = canvasSize,
) {
  const nextScale = Math.min(maxScale, Math.max(getMinimumScale(bounds, size), scale))
  const ratio = nextScale / current.scale
  return clampTransform(
    {
      scale: nextScale,
      x: anchor.x - (anchor.x - current.x) * ratio,
      y: anchor.y - (anchor.y - current.y) * ratio,
    },
    bounds,
    size,
  )
}
export function focusTransform(
  current: MapTransform,
  point: { x: number; y: number },
  bounds: Bounds,
  panelOpen = false,
  size: MapSize = canvasSize,
  panelInset = panelOpen ? 304 : 0,
) {
  const position = mapPosition(point, size)
  const center = visibleCenter(bounds, panelOpen, panelInset)
  return clampTransform(
    { ...current, x: center.x - position.x * current.scale, y: center.y - position.y * current.scale },
    bounds,
    size,
  )
}
