export type SceneSize = { width: number; height: number }
export type SceneOffset = { x: number; y: number }

export function coverScene(viewport: SceneSize, image: SceneSize) {
  const scale = Math.max(viewport.width / image.width, viewport.height / image.height)
  return { width: image.width * scale, height: image.height * scale }
}

// Same bounds as the student map, without zoom: the illustration always covers the window.
export function clampSceneOffset(offset: SceneOffset, viewport: SceneSize, scene: SceneSize) {
  return {
    x: Math.min(0, Math.max(viewport.width - scene.width, offset.x)),
    y: Math.min(0, Math.max(viewport.height - scene.height, offset.y)),
  }
}

export function centerScene(viewport: SceneSize, scene: SceneSize) {
  return clampSceneOffset(
    { x: (viewport.width - scene.width) / 2, y: (viewport.height - scene.height) / 2 },
    viewport,
    scene,
  )
}

export function revealScenePoint(
  offset: SceneOffset,
  position: SceneOffset,
  viewport: SceneSize,
  scene: SceneSize,
) {
  const margin = 44
  const point = { x: (position.x / 100) * scene.width, y: (position.y / 100) * scene.height }
  const next = { ...offset }
  for (const axis of ['x', 'y'] as const) {
    const extent = axis === 'x' ? viewport.width : viewport.height
    const visible = point[axis] + offset[axis]
    if (visible < margin) next[axis] = margin - point[axis]
    else if (visible > extent - margin) next[axis] = extent - margin - point[axis]
  }
  return clampSceneOffset(next, viewport, scene)
}

export function isSceneDrag(start: SceneOffset, current: SceneOffset) {
  return Math.hypot(current.x - start.x, current.y - start.y) > 6
}
