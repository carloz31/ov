#!/usr/bin/env node
// Verifica que src/ respete la estructura y las dependencias definidas en AGENTS.md.
// Uso:
//   node scripts/verificar-estructura.mjs                          comprueba (sale con 1 si hay infracciones nuevas)
//   node scripts/verificar-estructura.mjs --actualizar-excepciones reescribe scripts/estructura-excepciones.json
// Sin dependencias: solo Node.
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const RAIZ = process.cwd()
const SRC = path.join(RAIZ, 'src')
const ARCHIVO_EXCEPCIONES = path.join(RAIZ, 'scripts', 'estructura-excepciones.json')

const CARPETAS_SRC = [
  'assets', 'components', 'config', 'context', 'data', 'features', 'hooks',
  'lib', 'pages', 'routes', 'services', 'store', 'styles', 'types',
]
const ARCHIVOS_SRC = ['main.tsx', 'App.tsx', 'index.css', 'vite-env.d.ts']
const SUBCARPETAS_FEATURE = ['components', 'context', 'data', 'hooks', 'lib', 'store', 'styles']
const ARCHIVOS_FEATURE = ['types.ts']
// Features cuyos componentes pueden usar otras features (ver AGENTS.md).
const FEATURES_COMPARTIDAS = ['family-conversations', 'student-tracking']
const MAX_LINEAS_COMPONENTE = 300
const MAX_LINEAS_MODULO = 400
// Fuera del límite de tamaño: datos y primitivas generadas por shadcn.
const SIN_LIMITE = [/^src\/data\//, /^src\/features\/[^/]+\/data\//, /^src\/components\/ui\//, /\.css$/, /\.json$/]

// Qué capa no puede importar qué. La capa es la primera carpeta bajo src/.
const PROHIBIDO = {
  components: ['features', 'pages', 'store', 'services', 'context'],
  services: ['features', 'pages', 'store', 'components', 'context', 'hooks', 'lib', 'data', 'routes'],
  store: ['features', 'pages', 'components', 'context', 'hooks'],
  lib: ['features', 'pages', 'store', 'components', 'context', 'services', 'hooks'],
  data: ['features', 'pages', 'store', 'components', 'context', 'services', 'hooks'],
  types: ['features', 'pages', 'store', 'components', 'context', 'services', 'hooks', 'lib', 'data'],
  config: ['features', 'pages', 'store', 'components', 'context', 'services', 'hooks', 'lib', 'data'],
  hooks: ['features', 'pages', 'components', 'context', 'services'],
  context: ['features', 'pages', 'components', 'services'],
  features: ['pages', 'services'],
  pages: ['services'],
  routes: ['services', 'store'],
}

const rel = (p) => path.relative(RAIZ, p).split(path.sep).join('/')
const capa = (r) => (r.split('/').length > 2 ? r.split('/')[1] : 'raiz')
const featureDe = (r) => (r.startsWith('src/features/') ? r.split('/')[2] : null)

function recorrer(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = path.join(dir, n)
    return statSync(p).isDirectory() ? recorrer(p) : [p]
  })
}

function resolver(desde, especificador) {
  let base
  if (especificador.startsWith('@/')) base = path.join(SRC, especificador.slice(2))
  else if (especificador.startsWith('.')) base = path.resolve(path.dirname(desde), especificador)
  else return null
  for (const c of [base, `${base}.ts`, `${base}.tsx`]) if (existsSync(c) && statSync(c).isFile()) return c
  return { faltante: rel(base) }
}

const RE_IMPORT = /(?:^|\n)\s*(import|export)\s+(type\s+)?([^'"]*?)\s*from\s*['"]([^'"]+)['"]|(?:^|\n)\s*import\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g

const infracciones = []
const anotar = (regla, archivo, detalle) => infracciones.push({ regla, archivo, detalle })

const archivos = recorrer(SRC).map((p) => ({ p, r: rel(p) }))

// E1. Carpetas y archivos permitidos en src/ y dentro de cada feature.
for (const { r } of archivos) {
  const partes = r.split('/')
  if (partes.length === 2 && !ARCHIVOS_SRC.includes(partes[1])) anotar('E1-ubicacion', r, 'archivo suelto en src/')
  if (partes.length > 2 && !CARPETAS_SRC.includes(partes[1])) anotar('E1-ubicacion', r, `carpeta src/${partes[1]} no permitida`)
  if (partes[1] === 'features') {
    if (partes.length === 4 && !ARCHIVOS_FEATURE.includes(partes[3]))
      anotar('E1-ubicacion', r, 'en la raíz de una feature solo va types.ts')
    if (partes.length > 4 && !SUBCARPETAS_FEATURE.includes(partes[3]))
      anotar('E1-ubicacion', r, `subcarpeta ${partes[3]} no permitida en una feature`)
  }
}

// E2. Nombres: componentes en PascalCase.tsx, módulos en camelCase.ts, sin index.* (sin barriles).
for (const { r } of archivos) {
  const nombre = path.basename(r)
  if (r.split('/').length === 2) continue
  if (/^index\.(ts|tsx)$/.test(nombre)) anotar('E2-nombre', r, 'sin archivos index (barriles)')
  else if (nombre.endsWith('.tsx') && !/^[A-Z][A-Za-z0-9]*\.tsx$/.test(nombre)) anotar('E2-nombre', r, 'un .tsx se nombra en PascalCase')
  else if (nombre.endsWith('.ts') && !nombre.endsWith('.d.ts') && !/^[a-z][A-Za-z0-9]*\.ts$/.test(nombre))
    anotar('E2-nombre', r, 'un .ts se nombra en camelCase')
  else if (nombre.endsWith('.css') && !/^[a-z0-9]+(-[a-z0-9]+)*\.css$/.test(nombre)) anotar('E2-nombre', r, 'un .css se nombra en kebab-case')
}

for (const { p, r } of archivos) {
  if (!/\.(ts|tsx)$/.test(r)) continue
  const texto = readFileSync(p, 'utf8')
  const lineas = texto.split('\n').length

  // E3. Tamaño.
  if (!SIN_LIMITE.some((re) => re.test(r))) {
    const max = r.endsWith('.tsx') ? MAX_LINEAS_COMPONENTE : MAX_LINEAS_MODULO
    if (lineas > max) anotar('E3-tamano', r, `${lineas} líneas (máximo ${max})`)
  }

  // E4. Red: fetch solo en el cliente; pedir() solo en services/api.
  if (/\bfetch\(/.test(texto) && r !== 'src/services/api/cliente.ts') anotar('E4-red', r, 'fetch fuera de src/services/api/cliente.ts')

  // E5. El modo de datos no se decide en la vista.
  const esVista = r.startsWith('src/components/') || r.startsWith('src/pages/') || /^src\/features\/[^/]+\/components\//.test(r)

  const desde = capa(r)
  for (const m of texto.matchAll(RE_IMPORT)) {
    const esTipo = Boolean(m[2])
    const nombres = m[3] ?? ''
    const espec = m[4] ?? m[5] ?? m[6]
    const destino = resolver(p, espec)
    if (destino === null) continue
    if (destino.faltante) {
      if (!/\.(css|json|png|svg)$/.test(espec)) anotar('E0-import', r, `no existe ${destino.faltante}`)
      continue
    }
    const d = rel(destino)
    const hacia = capa(d)
    if (d === 'src/services/api/cliente.ts' && !r.startsWith('src/services/api/')) anotar('E4-red', r, 'importa el cliente HTTP fuera de services/api')
    if (esVista && d === 'src/config/env.ts' && /\b(modoApi|desarrollo)\b/.test(nombres))
      anotar('E5-modo-datos', r, 'usa modoApi/desarrollo en una vista; muévelo a un hook o selector')
    // E6. Capas.
    if (hacia !== desde && (PROHIBIDO[desde] ?? []).includes(hacia))
      anotar('E6-capas', r, `${desde} no importa ${hacia}${esTipo ? ' (ni tipos: súbelos a src/types)' : ''}: ${d}`)
    // E7. Entre features: nunca componentes de otra feature (salvo compartidas).
    const fa = featureDe(r), fb = featureDe(d)
    if (fa && fb && fa !== fb && !FEATURES_COMPARTIDAS.includes(fb) && /^src\/features\/[^/]+\/components\//.test(d))
      anotar('E7-features', r, `usa un componente de la feature ${fb}: ${d}`)
    // E8. Imports relativos solo dentro de la misma unidad (feature o capa).
    if (espec.startsWith('.')) {
      const unidad = (x) => (x.startsWith('src/features/') ? x.split('/').slice(0, 3).join('/') : x.split('/').slice(0, 2).join('/'))
      if (unidad(r) !== unidad(d)) anotar('E8-alias', r, `usa @/ para salir de ${unidad(r)}: ${espec}`)
    }
  }
}

const clave = (i) => `${i.regla}|${i.archivo}|${i.detalle}`
if (process.argv.includes('--actualizar-excepciones')) {
  writeFileSync(ARCHIVO_EXCEPCIONES, `${JSON.stringify(infracciones, null, 2)}\n`)
  console.log(`Excepciones registradas: ${infracciones.length}`)
  process.exit(0)
}
const excepciones = existsSync(ARCHIVO_EXCEPCIONES) ? JSON.parse(readFileSync(ARCHIVO_EXCEPCIONES, 'utf8')) : []
const conocidas = new Set(excepciones.map(clave))
const actuales = new Set(infracciones.map(clave))
const nuevas = infracciones.filter((i) => !conocidas.has(clave(i)))
const resueltas = excepciones.filter((e) => !actuales.has(clave(e)))

for (const i of nuevas) console.error(`✗ [${i.regla}] ${i.archivo}: ${i.detalle}`)
for (const e of resueltas) console.error(`✗ [excepción resuelta] ${e.archivo}: ${e.detalle} — quítala de scripts/estructura-excepciones.json`)
const resumen = `${archivos.length} archivos · ${infracciones.length} infracciones (${excepciones.length} excepciones registradas)`
if (nuevas.length || resueltas.length) {
  console.error(`\nEstructura: ${nuevas.length} infracciones nuevas, ${resueltas.length} excepciones obsoletas. ${resumen}`)
  process.exit(1)
}
console.log(`Estructura correcta. ${resumen}`)
