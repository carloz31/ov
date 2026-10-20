// B17 · HU-001 en modo local: usuarios de prueba, contraseña errada, portal por rol, guardas y cierre de sesión.
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'

function crearEntorno() {
  const valores = new Map()
  const localStorage = {
    getItem: (clave) => valores.get(clave) ?? null,
    setItem: (clave, valor) => valores.set(clave, String(valor)),
    removeItem: (clave) => valores.delete(clave),
  }
  const navegaciones = []
  const estado = { pathname: '/', estados: [] }
  const Navigate = (props) => ({ type: 'Navigate', props })
  const mocks = {
    react: {
      useSyncExternalStore: (_suscribir, instantanea) => instantanea(),
      useState: (inicial) => {
        const celda = { valor: inicial }
        estado.estados.push(celda)
        return [celda.valor, (siguiente) => { celda.valor = siguiente }]
      },
    },
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    'react-router': {
      Navigate,
      useLocation: () => ({ pathname: estado.pathname }),
      useNavigate: () => (ruta, opciones) => navegaciones.push([ruta, opciones]),
    },
  }
  const cache = new Map()
  const contexto = vm.createContext({
    console,
    JSON,
    window: { localStorage, addEventListener() {}, removeEventListener() {} },
    localStorage,
  })
  function cargar(archivo) {
    if (cache.has(archivo)) return cache.get(archivo)
    const exports = {}
    cache.set(archivo, exports)
    const js = ts.transpileModule(readFileSync(archivo, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    }).outputText
    const requerir = (especificador) => {
      if (especificador in mocks) return mocks[especificador]
      const base = especificador.startsWith('@/')
        ? path.resolve('src', especificador.slice(2))
        : path.resolve(path.dirname(archivo), especificador)
      return cargar([base, `${base}.ts`, `${base}.tsx`].find((candidato) => existsSync(candidato)))
    }
    vm.runInContext(`(function(require, exports) { ${js}\n})`, contexto, { filename: archivo })(requerir, exports)
    return exports
  }
  return { cargar, valores, navegaciones, estado }
}

const USUARIOS = [
  ['ana.estudiante@example.com', 'Ana2026!', 'est-ana', '/student/missions'],
  ['rosa.apoderada@example.com', 'Rosa2026!', 'apo-rosa', '/parent'],
  ['carmen.orientadora@example.com', 'Carmen2026!', 'ori-carmen', '/counselor'],
]

test('los tres usuarios de prueba ingresan sin servidor y la sesión queda en ov.acceso.v1', () => {
  for (const [usuario, contrasena, codigo] of USUARIOS) {
    const { cargar, valores } = crearEntorno()
    const acceso = cargar(path.resolve('src/store/accesoStore.ts'))
    const resultado = acceso.iniciarSesionLocal(`  ${usuario.toUpperCase()} `, contrasena)
    assert.equal(resultado.ok, true)
    assert.equal(resultado.cuenta.codigo, codigo)
    const guardada = JSON.parse(valores.get('ov.acceso.v1'))
    assert.deepEqual({ token: guardada.token, codigo: guardada.cuenta.codigo }, { token: null, codigo })
    assert.equal([...valores.keys()].some((clave) => clave.includes('demo-access') || clave.includes('cuenta-servidor')), false)
  }
})

test('contraseña errada o usuario desconocido: mensaje único y sin sesión', () => {
  const { cargar, valores } = crearEntorno()
  const acceso = cargar(path.resolve('src/store/accesoStore.ts'))
  for (const [usuario, contrasena] of [['ana.estudiante@example.com', 'otra'], ['nadie@example.com', 'Ana2026!']]) {
    const resultado = acceso.iniciarSesionLocal(usuario, contrasena)
    assert.deepEqual({ ...resultado }, { ok: false, mensaje: 'Usuario o contraseña incorrectos' })
  }
  assert.equal(acceso.sesionActual(), null)
  assert.equal(valores.has('ov.acceso.v1'), false)
})

test('cerrar sesión borra la clave; una sesión guardada sobrevive a recargar; un 401 deja el aviso', () => {
  const primero = crearEntorno()
  const acceso = primero.cargar(path.resolve('src/store/accesoStore.ts'))
  acceso.iniciarSesionLocal(...USUARIOS[1].slice(0, 2))
  const recargado = crearEntorno()
  recargado.valores.set('ov.acceso.v1', primero.valores.get('ov.acceso.v1'))
  assert.equal(recargado.cargar(path.resolve('src/store/accesoStore.ts')).sesionActual().cuenta.codigo, 'apo-rosa')
  acceso.cerrarSesion()
  assert.equal(primero.valores.has('ov.acceso.v1'), false)
  assert.equal(acceso.avisoSesion(), null)
  acceso.iniciarSesionLocal(...USUARIOS[0].slice(0, 2))
  acceso.terminarSesion()
  assert.equal(acceso.sesionActual(), null)
  assert.equal(acceso.avisoSesion(), 'Tu sesión terminó. Vuelve a ingresar.')
  const invalida = crearEntorno()
  invalida.valores.set('ov.acceso.v1', '{"token":null,"cuenta":{"codigo":"x","rol":"OTRO"}}')
  assert.equal(invalida.cargar(path.resolve('src/store/accesoStore.ts')).sesionActual(), null)
})

test('al ingresar, cada rol va a su portal; con contraseña errada queda el error', async () => {
  for (const [usuario, contrasena, , portal] of USUARIOS) {
    const { cargar, navegaciones } = crearEntorno()
    const { useLogin } = cargar(path.resolve('src/features/auth/hooks/useLogin.ts'))
    const login = useLogin()
    assert.equal(login.mostrarAvisoDemo, true)
    await login.enter(usuario, contrasena)
    assert.equal(JSON.stringify(navegaciones), JSON.stringify([[portal, { replace: true }]]))
  }
  const { cargar, navegaciones, estado } = crearEntorno()
  const { useLogin } = cargar(path.resolve('src/features/auth/hooks/useLogin.ts'))
  await useLogin().enter('ana.estudiante@example.com', 'otra')
  assert.deepEqual(navegaciones, [])
  assert.equal(estado.estados[0].valor, 'Usuario o contraseña incorrectos')
})

test('guardas: sin sesión todo va al login; con sesión, cruzar de portal lleva al propio', () => {
  const { cargar, estado } = crearEntorno()
  const acceso = cargar(path.resolve('src/store/accesoStore.ts'))
  const { GuardaAcceso } = cargar(path.resolve('src/routes/GuardaAcceso.tsx'))
  const { PortalDeCuenta } = cargar(path.resolve('src/routes/PortalDeCuenta.tsx'))
  const hijos = { type: 'span', props: {} }
  const destino = (ruta) => {
    estado.pathname = ruta
    const resultado = GuardaAcceso({ children: hijos })
    return resultado === hijos ? 'pasa' : resultado.props.to
  }
  for (const ruta of ['/profiles', '/student/missions', '/parent/overview', '/counselor/home']) {
    assert.equal(destino(ruta), '/login')
  }
  assert.equal(destino('/'), 'pasa')
  assert.equal(destino('/login'), 'pasa')
  assert.equal(PortalDeCuenta().props.to, '/login')
  const esperados = {
    'ana.estudiante@example.com': { '/student/journal': 'pasa', '/parent/overview': '/student/missions', '/counselor/home': '/student/missions' },
    'rosa.apoderada@example.com': { '/parent/overview': 'pasa', '/student/missions': '/parent', '/counselor': '/parent' },
    'carmen.orientadora@example.com': { '/counselor/home': 'pasa', '/parent': '/counselor', '/student': '/counselor' },
  }
  for (const [usuario, contrasena, , portal] of USUARIOS) {
    acceso.iniciarSesionLocal(usuario, contrasena)
    for (const [ruta, esperado] of Object.entries(esperados[usuario])) assert.equal(destino(ruta), esperado, `${usuario} ${ruta}`)
    assert.equal(destino('/profiles'), 'pasa')
    assert.equal(PortalDeCuenta().props.to, portal)
    acceso.cerrarSesion()
    assert.equal(destino(portal), '/login')
  }
})

test('los tres botones de cerrar sesión borran la sesión y vuelven al login', () => {
  for (const archivo of [
    'src/features/adventure/components/StudentUserMenu.tsx',
    'src/pages/parent/ParentPortalModule.tsx',
    'src/pages/counselor/CounselorPortalModule.tsx',
  ]) {
    const fuente = readFileSync(archivo, 'utf8')
    assert.match(fuente, /cerrarSesion\(\)\s*\n\s*navigate\(appPaths\.login, \{ replace: true \}\)/, archivo)
    assert.doesNotMatch(fuente, /navigate\(appPaths\.home\)/, archivo)
  }
})
