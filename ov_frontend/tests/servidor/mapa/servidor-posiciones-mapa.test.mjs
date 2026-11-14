import assert from 'node:assert/strict'
import test from 'node:test'
import { existsSync, readFileSync } from 'node:fs'
import { jsonServidor } from '../../soporte/servidor-ayudas.mjs'

// Ajuste lumi-mensajes (§14): cada punto del camino y de la Ciudad de `contenido` está en un lugar visible, a
// distancia de los demás; las misiones con origen quedan cerca de quien las abre y, en el camino (el único mapa con
// líneas), su línea no cruza el camino ni otra línea ni pasa encima de otro punto. Lienzo lógico de 1080 × 660.
const ANCHO = 1080
const ALTO = 660
const bloques = jsonServidor('contenido/contenido-actividades-inicial')
const zonaDe = (b) => (b.espacio === 'MISIONES_CAMPO' ? 'camino' : b.codigo === 'CIUDAD' ? 'ciudad' : null)

function puntosContenido() {
  const puntos = new Map()
  const requeridas = []
  for (const bloque of bloques) {
    const zona = zonaDe(bloque)
    if (!zona) continue
    for (const actividad of bloque.actividades) {
      const archivo = `src/data/activities/contenidos/plataforma/${actividad.contenido}.json`
      if (!existsSync(archivo) || puntos.has(actividad.contenido)) continue
      const mapa = JSON.parse(readFileSync(archivo, 'utf8')).mapa
      if (!mapa) continue
      puntos.set(actividad.contenido, { codigo: actividad.codigo, zona, ...mapa })
      if (zona === 'camino' && actividad.requerida) requeridas.push(actividad.contenido)
    }
  }
  return { puntos, requeridas }
}

const { puntos, requeridas } = puntosContenido()
const porCodigo = new Map([...puntos].map(([clave, p]) => [p.codigo, clave]))
const distancia = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)
const giro = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
const mismo = (a, b) => a.x === b.x && a.y === b.y
function cruzan([a, b], [c, d]) {
  if (mismo(a, c) || mismo(a, d) || mismo(b, c) || mismo(b, d)) return false
  return giro(a, b, c) * giro(a, b, d) < 0 && giro(c, d, a) * giro(c, d, b) < 0
}
function distanciaSegmento(p, [a, b]) {
  const largo = (b.x - a.x) ** 2 + (b.y - a.y) ** 2
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / largo))
  return Math.hypot(p.x - (a.x + t * (b.x - a.x)), p.y - (a.y + t * (b.y - a.y)))
}
const camino = requeridas.slice(1).map((clave, i) => [puntos.get(requeridas[i]), puntos.get(clave)])
const conOrigen = [...puntos].filter(([, p]) => p.origen)
const lineas = conOrigen
  .filter(([, p]) => p.zona === 'camino')
  .map(([clave, p]) => ({ clave, origen: porCodigo.get(p.origen), linea: [puntos.get(porCodigo.get(p.origen)), p] }))

test('el camino de contenido tiene sus 38 requeridas con posición', () => {
  assert.equal(requeridas.length, 38)
})

test('ningún punto está en (0, 0) ni fuera del lienzo, con 50 de margen', () => {
  const fuera = [...puntos]
    .filter(([, p]) => p.x < 50 || p.y < 50 || p.x > ANCHO - 50 || p.y > ALTO - 50)
    .map(([clave]) => clave)
  assert.deepEqual(fuera, [])
})

test('ningún par de puntos del mismo mapa está a menos de 60', () => {
  const lista = [...puntos]
  const cerca = lista.flatMap(([a, pa], i) =>
    lista
      .slice(i + 1)
      .filter(([, pb]) => pb.zona === pa.zona && distancia(pa, pb) < 60)
      .map(([b]) => `${a}-${b}`),
  )
  assert.deepEqual(cerca, [])
})

test('cada misión con origen queda a 70–160 de la misión que la abre', () => {
  const lejos = conOrigen
    .filter(([, p]) => {
      const d = distancia(p, puntos.get(porCodigo.get(p.origen)))
      return d < 70 || d > 160
    })
    .map(([clave]) => clave)
  assert.deepEqual(lejos, [])
})

test('en el camino, la línea de una misión con origen no cruza el camino, otra línea ni pasa sobre un punto', () => {
  const fallas = []
  for (const { clave, origen, linea } of lineas) {
    if (camino.some((tramo) => cruzan(linea, tramo))) fallas.push(`${clave} cruza el camino`)
    for (const otra of lineas)
      if (otra.clave > clave && cruzan(linea, otra.linea)) fallas.push(`${clave} cruza ${otra.clave}`)
    for (const [k, p] of puntos)
      if (p.zona === 'camino' && k !== clave && k !== origen && distanciaSegmento(p, linea) < 35)
        fallas.push(`${clave} pasa sobre ${k}`)
  }
  assert.deepEqual(fallas, [])
})

test('el camino no se cruza a sí mismo', () => {
  const fallas = camino.flatMap((a, i) =>
    camino.slice(i + 2).filter((b) => cruzan(a, b)).map(() => i),
  )
  assert.deepEqual(fallas, [])
})
