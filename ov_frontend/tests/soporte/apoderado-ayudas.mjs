import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import vm from 'node:vm'
import React from 'react'
import ts from 'typescript'
import { fixtureServidor } from './servidor-ayudas.mjs'

const nativeRequire = createRequire(import.meta.url)

// Entorno específico del portal: los demás tests de servidor conservan sus áreas protegidas.
export function fixtureApoderado(opciones = {}) {
  const app = fixtureServidor(opciones)
  const cache = new Map()
  let activo = null,
    activityId = 'pad-01-rol'
  function posicion() {
    return activo ? activo.cursor++ : -1
  }
  const react = {
    ...React,
    useSyncExternalStore: (_, snapshot) => snapshot(),
    useMemo: (fn) => fn(),
    useRef(value) {
      const i = posicion()
      return i < 0 ? { current: value } : (activo.hooks[i] ??= { current: value })
    },
    useState(initial) {
      const i = posicion(),
        marco = activo
      if (i < 0) return [typeof initial === 'function' ? initial() : initial, () => {}]
      if (!(i in marco.hooks)) marco.hooks[i] = typeof initial === 'function' ? initial() : initial
      return [
        marco.hooks[i],
        (value) => {
          marco.hooks[i] = typeof value === 'function' ? value(marco.hooks[i]) : value
        },
      ]
    },
    useEffect(callback, deps = []) {
      const i = posicion(),
        marco = activo
      if (i < 0) return
      const previo = marco.hooks[i]
      if (!previo || deps.some((d, n) => d !== previo.deps[n]))
        marco.effects.push(() => {
          previo?.cleanup?.()
          marco.hooks[i] = { deps, cleanup: callback() }
        })
    },
  }
  const contexto = vm.createContext({
    console,
    Date,
    Map,
    Set,
    URL,
    URLSearchParams,
    crypto,
    setTimeout,
    clearTimeout,
    window: { addEventListener() {}, setTimeout, clearTimeout },
    localStorage: {
      getItem: (key) => app.local.get(key) ?? null,
      setItem: (key, value) => app.local.set(key, value),
    },
  })
  function load(file) {
    const full = path.resolve(file)
    if (!/[\\/](features|pages)[\\/]/.test(full)) return app.load(file)
    if (cache.has(full)) return cache.get(full)
    if (full.endsWith('.json')) return JSON.parse(readFileSync(full, 'utf8'))
    const exports = {}
    cache.set(full, exports)
    const code = ts.transpileModule(readFileSync(full, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2023,
      },
    }).outputText
    function require(specifier) {
      if (specifier.endsWith('.css')) return {}
      if (specifier === 'react') return react
      if (specifier === 'react-router')
        return {
          ...nativeRequire(specifier),
          useNavigate: () => (url) => app.navigations.push(url),
          useLocation: () => ({ pathname: `/parent/activities/${activityId}` }),
          useParams: () => ({ activityId }),
          useSearchParams: () => [app.query, () => {}],
          useOutletContext: () => {
            const { completedIds: completedActivityIds, ...source } = load(
              'src/features/parent/hooks/useParentActivities.ts',
            ).useParentActivities()
            return { ...source, completedActivityIds }
          },
        }
      if (!specifier.startsWith('.') && !specifier.startsWith('@/')) return nativeRequire(specifier)
      const base = specifier.startsWith('@/')
        ? path.resolve('src', specifier.slice(2))
        : path.resolve(path.dirname(full), specifier)
      return load([base, `${base}.ts`, `${base}.tsx`].find(existsSync))
    }
    vm.runInContext(`(function(require,exports){${code}\n})`, contexto, { filename: full })(require, exports)
    return exports
  }
  return {
    ...app,
    load,
    setActivityId: (codigo) => {
      activityId = codigo
    },
    mount(component, ...args) {
      const marco = { cursor: 0, hooks: [], effects: [] }
      return {
        render() {
          activo = marco
          marco.cursor = 0
          marco.effects = []
          const resultado = component(...args)
          activo = null
          marco.effects.forEach((fn) => fn())
          return resultado
        },
        unmount() {
          marco.hooks.forEach((hook) => hook?.cleanup?.())
        },
      }
    },
  }
}
