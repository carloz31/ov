import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'
import React from 'react'

const nativeRequire = createRequire(import.meta.url)
export const jsonServidor = (name) => JSON.parse(readFileSync(`tests/fixtures/servidor/${name}.json`, 'utf8'))
export const copia = (value) => JSON.parse(JSON.stringify(value))
export const esperar = async () => {
  for (let i = 0; i < 15; i++) await new Promise((resolve) => setImmediate(resolve))
}
export function fixtureServidor({
  api = true,
  desarrollo = true,
  guardado = {},
  ruta = '/student/missions',
} = {}) {
  const cache = new Map(),
    local = new Map(Object.entries(guardado)),
    sesion = new Map(),
    requests = [],
    navigations = []
  const eventos = []
  const observadores = new Set()
  let overlayAbierto = false
  let fallarGuardado = false,
    handler = () => {
      throw Error('Solicitud no configurada')
    },
    query = new URLSearchParams(ruta.split('?')[1]),
    pathname = ruta.split('?')[0]
  let managed = false,
    cursor = 0,
    hooks = [],
    effects = []
  const hooksReact = {
    ...React,
    useContext: (context) => context._currentValue,
    useSyncExternalStore: (_, snapshot) => snapshot(),
    useEffect(callback, deps = []) {
      if (!managed) return
      const i = cursor++,
        previo = hooks[i]
      if (!previo || deps.some((d, n) => d !== previo.deps[n]))
        effects.push(() => {
          previo?.cleanup?.()
          hooks[i] = { deps, cleanup: callback() }
        })
    },
    useRef(value) {
      if (!managed) return { current: value }
      return (hooks[cursor++] ??= { current: value })
    },
    useState(initial) {
      if (!managed) return [typeof initial === 'function' ? initial() : initial, () => {}]
      const i = cursor++
      if (!(i in hooks)) hooks[i] = typeof initial === 'function' ? initial() : initial
      return [
        hooks[i],
        (next) => {
          hooks[i] = typeof next === 'function' ? next(hooks[i]) : next
        },
      ]
    },
    useMemo(fn) {
      return fn()
    },
  }
  const context = vm.createContext({
    console,
    Date,
    Math,
    URL,
    URLSearchParams,
    Map,
    Set,
    AbortController,
    crypto,
    setTimeout,
    clearTimeout,
    MutationObserver: class {
      constructor(callback) {
        this.callback = callback
      }
      observe() {
        observadores.add(this.callback)
      }
      disconnect() {
        observadores.delete(this.callback)
      }
    },
    window: {
      addEventListener: (name, fn) => eventos.push({ name, fn }),
      removeEventListener() {},
      setInterval,
      clearInterval,
      matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
      location: { reload() {} },
    },
    document: {
      visibilityState: 'visible',
      body: {},
      querySelector: () => (overlayAbierto ? {} : null),
      addEventListener() {},
      removeEventListener() {},
    },
    localStorage: {
      getItem: (key) => local.get(key) ?? null,
      setItem(key, value) {
        if (fallarGuardado) throw Error('Sin espacio')
        local.set(key, value)
      },
      removeItem: (key) => local.delete(key),
    },
    sessionStorage: {
      getItem: (key) => sesion.get(key) ?? null,
      setItem: (key, value) => sesion.set(key, value),
      removeItem: (key) => sesion.delete(key),
    },
    fetch: async (url, options) => {
      const request = {
        url,
        method: options?.method ?? 'GET',
        body: options?.body ? JSON.parse(options.body) : undefined,
      }
      requests.push(request)
      const result = await handler(request)
      return {
        ok: (result.status ?? 200) < 400,
        status: result.status ?? 200,
        json: async () => copia(result.body),
      }
    },
  })
  function load(file) {
    const full = path.resolve(file)
    assert.ok(!/[\\/]features[\\/](parent|counselor)[\\/]/.test(full), 'No se leen las áreas protegidas')
    if (cache.has(full)) return cache.get(full)
    if (full.endsWith('.json')) return JSON.parse(readFileSync(full, 'utf8'))
    const exports = {}
    cache.set(full, exports)
    const code = ts.transpileModule(
      readFileSync(full, 'utf8').replaceAll('import.meta.env.BASE_URL', "'/'"),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          jsx: ts.JsxEmit.ReactJSX,
          target: ts.ScriptTarget.ES2023,
        },
      },
    ).outputText
    const require = (specifier) => {
      if (specifier.endsWith('.css')) return {}
      if (specifier === 'react/jsx-runtime') {
        const runtime = nativeRequire(specifier)
        const render = (factory) => (type, props, key) =>
          [
            'NodeRenderer',
            'ForestFireWorkspace',
            'ChallengeStage',
            'ResearchHeader',
            'ResearchGuideSteps',
            'ResearchOccupationPicker',
            'ResearchReplacementDialog',
            'HelenaBookPages',
          ].includes(type?.name)
            ? type(props)
            : factory(type, props, key)
        return { ...runtime, jsx: render(runtime.jsx), jsxs: render(runtime.jsxs) }
      }
      if (specifier === 'react') return hooksReact
      if (specifier === 'react-router')
        return {
          ...nativeRequire(specifier),
          useNavigate: () => (target) => navigations.push(target),
          useLocation: () => ({ pathname, search: `?${query}` }),
          useSearchParams: () => [
            query,
            (next) => {
              query =
                typeof next === 'function'
                  ? next(query)
                  : next instanceof URLSearchParams
                    ? next
                    : new URLSearchParams(next)
            },
          ],
          Outlet: () => null,
        }
      if (!specifier.startsWith('.') && !specifier.startsWith('@/')) return nativeRequire(specifier)
      const base = specifier.startsWith('@/')
        ? path.resolve('src', specifier.slice(2))
        : path.resolve(path.dirname(full), specifier)
      return load([base, `${base}.ts`, `${base}.tsx`].find(existsSync))
    }
    vm.runInContext(`(function(require,exports){${code}\n})`, context, { filename: full })(require, exports)
    return exports
  }
  const config = load('src/config/env.ts')
  config.configurarServidor({ VITE_DATOS: api ? 'api' : 'local', VITE_API_URL: '/api', DEV: desarrollo })
  return {
    load,
    config,
    local,
    sesion,
    requests,
    navigations,
    overlayOpen(abierto) {
      overlayAbierto = abierto
      observadores.forEach((callback) => callback())
    },
    fetch: (fn) => {
      handler = fn
    },
    failWrites: (value) => {
      fallarGuardado = value
    },
    get query() {
      return query
    },
    mount(component, props) {
      return {
        render() {
          managed = true
          cursor = 0
          effects = []
          const tree = component(props)
          managed = false
          const pending = effects
          effects = []
          pending.forEach((fn) => fn())
          return tree
        },
        unmount() {
          hooks.forEach((h) => h?.cleanup?.())
          hooks = []
        },
      }
    },
    storageEvent: (key) => eventos.filter((e) => e.name === 'storage').forEach((e) => e.fn({ key })),
  }
}
export function elementos(tree, predicate) {
  const encontrados = []
  function visit(node) {
    if (Array.isArray(node)) {
      node.forEach(visit)
      return
    }
    if (!React.isValidElement(node)) return
    if (predicate(node)) encontrados.push(node)
    visit(node.props.children)
  }
  visit(tree)
  return encontrados
}
export function servidorInicial(app) {
  const inicial = escenarioServidor('inicial')
  app.fetch((request) => {
    if (request.url === '/api/cuentas')
      return {
        body: [
          inicial.cuenta,
          { codigo: 'est-luis', nombre: 'Luis', rol: 'ESTUDIANTE' },
          { codigo: 'apo-rosa', nombre: 'Rosa', rol: 'APODERADO' },
        ],
      }
    if (request.url === '/api/acciones/ingresar')
      return { body: { eventos_registrados: [], nuevos_desbloqueos: [] } }
    if (esConsultaDominio(request))
      return respuestaDominio(request, {
        ...inicial,
        cuenta: { ...inicial.cuenta, codigo: request.url.split('/')[3] },
      })
    if (request.url.includes('/desbloqueos?')) return { body: [] }
    throw Error(`Solicitud no configurada: ${request.url}`)
  })
}

// DATO DE PRUEBA: escenarios compuestos con los fixtures de las consultas por dominio.
export function escenarioServidor(etapa) {
  const resumen = jsonServidor('resumen-inicial'),
    logros = jsonServidor('logros-' + etapa)
  if (etapa === 'ciudad') {
    const actual = logros.niveles.filter((n) => n.estado === 'OBTENIDO').at(-1)
    resumen.nivel_actual = actual ? { numero: actual.numero, titulo: actual.titulo } : null
  }
  return {
    ...resumen,
    bloques: jsonServidor('actividades-' + etapa),
    fichas: jsonServidor('fichas-' + etapa),
    ...logros,
  }
}
export const esConsultaDominio = (r) => /\/(resumen|actividades|fichas|logros)$/.test(r.url)
export function respuestaDominio(r, escenario) {
  switch (r.url.split('/').at(-1)) {
    case 'resumen':
      return { body: { cuenta: escenario.cuenta, nivel_actual: escenario.nivel_actual } }
    case 'actividades':
      return { body: escenario.bloques }
    case 'fichas':
      return { body: escenario.fichas }
    case 'logros':
      return { body: { insignias: escenario.insignias, niveles: escenario.niveles } }
    default:
      throw Error('Consulta de dominio inesperada: ' + r.url)
  }
}
// Ayuda de pruebas: importa los módulos concretos, sin un barril en la aplicación.
export function cargarAlmacen(app) {
  return Object.assign(
    {},
    ...['sesion', 'secciones', 'avisos', 'resultado', 'consultas', 'refresco'].map((n) =>
      app.load('src/store/servidor/' + n + '.ts'),
    ),
  )
}
