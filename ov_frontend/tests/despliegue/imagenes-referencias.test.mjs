// Auditoría plataforma (imágenes en WebP): toda referencia a una imagen en el código, los JSON, los estilos e
// index.html apunta a un archivo que existe en public/, también los fondos que se arman con el `escenario` de cada
// contenido. Y no queda ningún PNG en public/images.
import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const RAIZ = process.cwd()
const PUBLICO = path.join(RAIZ, 'public')
const EXTENSIONES = /\.(ts|tsx|json|css|html)$/

function archivos(carpeta) {
  return readdirSync(carpeta).flatMap((nombre) => {
    const ruta = path.join(carpeta, nombre)
    return statSync(ruta).isDirectory() ? archivos(ruta) : EXTENSIONES.test(nombre) ? [ruta] : []
  })
}

// Una referencia con «/» al inicio es desde public/; sin él, es un nombre de `getExplorationImagePath` o de un caso,
// que vive en public/images/.
function existe(referencia) {
  const limpia = referencia.split('?')[0]
  if (limpia.startsWith('/')) return existsSync(path.join(PUBLICO, limpia))
  return existsSync(path.join(PUBLICO, 'images', limpia)) || existsSync(path.join(PUBLICO, limpia))
}

const fuentes = [...archivos(path.join(RAIZ, 'src')), path.join(RAIZ, 'index.html')]

test('toda imagen referenciada en el código, los JSON, los estilos e index.html existe en public/', () => {
  const imagen = /["'`(]([^"'`()\s${}<>]*?\.(?:png|jpe?g|webp|gif|svg|avif)(?:\?[^"'`()\s]*)?)["'`)]/g
  const faltan = []
  let total = 0
  for (const archivo of fuentes) {
    for (const [, referencia] of readFileSync(archivo, 'utf8').matchAll(imagen)) {
      if (/^(https?:|data:)/.test(referencia)) continue
      total++
      if (!existe(referencia)) faltan.push(`${path.relative(RAIZ, archivo)}: ${referencia}`)
    }
  }
  assert.ok(total > 100, `se esperaban más de 100 referencias y hay ${total}`)
  assert.deepEqual(faltan, [])
})

test('cada `escenario` de los contenidos tiene su fondo en public/images/background', () => {
  const contenidos = archivos(path.join(RAIZ, 'src/data/activities/contenidos')).filter((a) => a.endsWith('.json'))
  const escenarios = new Set(
    contenidos.flatMap((a) => [...readFileSync(a, 'utf8').matchAll(/"escenario"\s*:\s*"([^"]+)"/g)].map((m) => m[1])),
  )
  assert.ok(escenarios.size > 3)
  const faltan = [...escenarios].filter((e) => !existsSync(path.join(PUBLICO, 'images/background', `${e}.webp`)))
  assert.deepEqual(faltan, [])
})

test('no queda ningún PNG en public/images ni una referencia a .png en el código', () => {
  const png = (carpeta) =>
    readdirSync(carpeta).flatMap((nombre) => {
      const ruta = path.join(carpeta, nombre)
      return statSync(ruta).isDirectory() ? png(ruta) : nombre.toLowerCase().endsWith('.png') ? [ruta] : []
    })
  assert.deepEqual(png(path.join(PUBLICO, 'images')), [])
  const conPng = fuentes.filter((a) => /\.png\b/.test(readFileSync(a, 'utf8')))
  assert.deepEqual(conPng.map((a) => path.relative(RAIZ, a)), [])
})
