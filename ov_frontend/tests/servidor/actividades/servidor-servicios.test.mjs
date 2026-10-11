import { escenarioServidor } from '../../soporte/servidor-ayudas.mjs'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'
import { jsonServidor } from '../../soporte/servidor-ayudas.mjs'

function cargarServicios(fetch) {
  const cache = new Map()
  const context = vm.createContext({ fetch })
  function load(file) {
    const full = path.resolve(file)
    if (cache.has(full)) return cache.get(full)
    const exports = {}
    cache.set(full, exports)
    const code = ts.transpileModule(readFileSync(full, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 },
    }).outputText
    const require = (specifier) => {
      const base = specifier.startsWith('@/')
        ? path.resolve('src', specifier.slice(2))
        : path.resolve(path.dirname(full), specifier)
      return load(`${base}.ts`)
    }
    vm.runInContext(`(function(require,exports){${code}\n})`, context, { filename: full })(require, exports)
    return exports
  }
  // Otra base verifica que los servicios respetan la configuración del cliente.
  load('src/config/env.ts').configurarServidor({ VITE_API_URL: '/api-pruebas///' })
  return (modulo) => load(`src/services/api/${modulo}.ts`)
}

const estado = escenarioServidor('inicial')
const completada = jsonServidor('completar-mission-welcome')
const items = jsonServidor('items-act-tip-01')
const resultado = jsonServidor('resultado-riasec')
// DATO DE PRUEBA: códigos con caracteres reservados para comprobar la codificación de segmentos.
const cuenta = `${estado.cuenta.codigo} /ñ?`
const actividad = 'act-tip-01 /ñ?'
const instrumento = `${resultado.instrumento} /ñ?`
const cuentaUrl = 'est-ana%20%2F%C3%B1%3F'
const actividadUrl = 'act-tip-01%20%2F%C3%B1%3F'
const instrumentoUrl = 'TEST-RIASEC%20%2F%C3%B1%3F'
const respuestas = [{ item: items[0].codigo, opcion: items[0].escala.opciones[0].orden }]
// DATO DE PRUEBA: recibos mínimos para endpoints sin fixture propio.
const casos = [
  ...[
    ['actividades', 'obtenerActividades'],
    ['fichas', 'obtenerFichas'],
    ['logros', 'obtenerLogros'],
  ].map(([modulo, funcion]) => ({
    modulo,
    funcion,
    argumentos: [cuenta],
    ruta: `/cuentas/${cuentaUrl}/${modulo}`,
    datos: jsonServidor(modulo + '-inicial'),
  })),
  {
    modulo: 'cuentas',
    funcion: 'listarCuentas',
    argumentos: [],
    ruta: '/cuentas',
    datos: [estado.cuenta],
  },
  {
    modulo: 'cuentas',
    funcion: 'obtenerResumen',
    argumentos: [cuenta],
    ruta: `/cuentas/${cuentaUrl}/resumen`,
    datos: jsonServidor('resumen-inicial'),
  },
  {
    modulo: 'cuentas',
    funcion: 'obtenerProgreso',
    argumentos: [cuenta, 'ACTIVIDAD', actividad],
    ruta: `/cuentas/${cuentaUrl}/progreso/ACTIVIDAD/${actividadUrl}`,
    datos: { objetivo: { tipo: 'ACTIVIDAD', codigo: actividad }, disponible: false, reglas: [] },
  },
  {
    modulo: 'cuentas',
    funcion: 'obtenerDesbloqueosNoVistos',
    argumentos: [cuenta],
    ruta: `/cuentas/${cuentaUrl}/desbloqueos?solo_no_vistos=true`,
    datos: jsonServidor('desbloqueos-no-vistos'),
  },
  {
    modulo: 'cuentas',
    funcion: 'marcarDesbloqueosVistos',
    argumentos: [cuenta],
    ruta: `/cuentas/${cuentaUrl}/desbloqueos/marcar-vistos`,
    cuerpo: {},
    datos: { marcados: 1 },
  },
  {
    modulo: 'acciones',
    funcion: 'ingresar',
    argumentos: [cuenta],
    ruta: '/acciones/ingresar',
    cuerpo: { cuenta },
    datos: {
      eventos_registrados: completada.eventos_registrados,
      nuevos_desbloqueos: completada.nuevos_desbloqueos,
    },
  },
  {
    modulo: 'acciones',
    funcion: 'completarActividad',
    argumentos: [cuenta, actividad],
    ruta: '/acciones/completar-actividad',
    cuerpo: { cuenta, actividad },
    datos: completada,
  },
  {
    modulo: 'acciones',
    funcion: 'responderItems',
    argumentos: [cuenta, actividad, respuestas],
    ruta: '/acciones/responder-items',
    cuerpo: { cuenta, actividad, respuestas },
    datos: {
      cuenta,
      actividad,
      respuestas_guardadas: respuestas,
      progreso: { estado: 'EN_CURSO', respondidos: 1, total: items.length },
    },
  },
  {
    modulo: 'instrumentos',
    funcion: 'obtenerItems',
    argumentos: [actividad],
    ruta: `/actividades/${actividadUrl}/items`,
    datos: items,
  },
  {
    modulo: 'instrumentos',
    funcion: 'obtenerRespuestas',
    argumentos: [cuenta, actividad],
    ruta: `/cuentas/${cuentaUrl}/actividades/${actividadUrl}/respuestas`,
    datos: { cuenta, actividad, respuestas: [] },
  },
  {
    modulo: 'instrumentos',
    funcion: 'obtenerAvance',
    argumentos: [cuenta],
    ruta: `/cuentas/${cuentaUrl}/instrumentos`,
    datos: [{ instrumento: resultado.instrumento, aplicaciones: [] }],
  },
  {
    modulo: 'instrumentos',
    funcion: 'obtenerResultado',
    argumentos: [cuenta, instrumento],
    ruta: `/cuentas/${cuentaUrl}/instrumentos/${instrumentoUrl}/resultado`,
    datos: resultado,
  },
  {
    modulo: 'desarrollo',
    funcion: 'reiniciar',
    argumentos: [],
    ruta: '/desarrollo/reiniciar',
    cuerpo: {},
    datos: { mensaje: 'Datos reiniciados.' },
  },
]

for (const caso of casos) {
  test(`${caso.modulo}.${caso.funcion} conserva el contrato HTTP y la respuesta del cliente`, async () => {
    const peticiones = []
    let responder = () => ({ ok: true, status: 200, json: async () => caso.datos })
    const cargar = cargarServicios(async (url, opciones) => {
      peticiones.push({ url, opciones })
      return responder()
    })
    const llamar = () => cargar(caso.modulo)[caso.funcion](...caso.argumentos)
    const copia = (value) => JSON.parse(JSON.stringify(value))
    assert.deepEqual(copia(await llamar()), { tipo: 'ok', datos: caso.datos })
    const opciones =
      caso.cuerpo === undefined
        ? undefined
        : {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(caso.cuerpo),
          }
    assert.equal(peticiones.length, 1)
    assert.equal(peticiones[0].url, `/api-pruebas${caso.ruta}`)
    if (opciones === undefined) assert.equal(peticiones[0].opciones, undefined)
    else assert.deepEqual(copia(peticiones[0].opciones), opciones)

    // DATO DE PRUEBA: errores del transporte; el servicio no los interpreta ni los pierde.
    const detalle = { mensaje: 'No disponible', items_faltantes: [items[0].codigo] }
    responder = () => ({ ok: false, status: 409, json: async () => ({ detail: detalle }) })
    assert.deepEqual(copia(await llamar()), { tipo: 'bloqueado', detalle })
    responder = () => ({ ok: false, status: 503, json: async () => ({ detail: detalle }) })
    assert.deepEqual(copia(await llamar()), { tipo: 'http', estado: 503, detalle })
    responder = () => {
      throw Error('Sin conexión')
    }
    assert.deepEqual(copia(await llamar()), { tipo: 'sin_conexion' })
    assert.equal(peticiones.length, 4, 'Una petición por llamada, sin reintentos en el servicio')
  })
}

test('actualizar envía PATCH con cabecera y cuerpo JSON', async () => {
  const peticiones = []
  const cargar = cargarServicios(async (url, opciones) => {
    peticiones.push({ url, opciones })
    return { ok: true, status: 200, json: async () => ({ cambiado: true }) }
  })
  // DATO DE PRUEBA: recurso parcial para comprobar el transporte, sin una ruta real nueva.
  const respuesta = await cargar('cliente').actualizar('/recurso', { nombre: 'Actualizado' })
  assert.deepEqual(JSON.parse(JSON.stringify(peticiones)), [{
    url: '/api-pruebas/recurso',
    opciones: {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: 'Actualizado' }),
    },
  }])
  assert.deepEqual(JSON.parse(JSON.stringify(respuesta)), { tipo: 'ok', datos: { cambiado: true } })
})

test('eliminar envía DELETE sin cuerpo ni cabecera', async () => {
  const peticiones = []
  const cargar = cargarServicios(async (url, opciones) => {
    peticiones.push({ url, opciones })
    return { ok: true, status: 200, json: async () => ({ eliminado: true }) }
  })
  const respuesta = await cargar('cliente').eliminar('/recurso')
  assert.deepEqual(JSON.parse(JSON.stringify(peticiones)), [{
    url: '/api-pruebas/recurso',
    opciones: { method: 'DELETE' },
  }])
  assert.equal(Object.hasOwn(peticiones[0].opciones, 'headers'), false)
  assert.equal(Object.hasOwn(peticiones[0].opciones, 'body'), false)
  assert.deepEqual(JSON.parse(JSON.stringify(respuesta)), { tipo: 'ok', datos: { eliminado: true } })
})

// DATO DE PRUEBA: llamadas a los cuatro métodos para comprobar respuestas y errores del cliente.
const metodos = [
  { nombre: 'obtener', argumentos: ['/recurso'] },
  { nombre: 'enviar', argumentos: ['/recurso', { nombre: 'Nuevo' }] },
  { nombre: 'actualizar', argumentos: ['/recurso', { nombre: 'Actualizado' }] },
  { nombre: 'eliminar', argumentos: ['/recurso'] },
]

for (const { nombre, argumentos } of metodos) {
  test(`${nombre}: 204 devuelve datos undefined sin leer JSON`, async () => {
    let lecturas = 0
    const cargar = cargarServicios(async () => ({
      ok: true,
      status: 204,
      json: async () => {
        lecturas += 1
        throw Error('Una respuesta 204 no tiene JSON')
      },
    }))
    assert.deepEqual({ ...await cargar('cliente')[nombre](...argumentos) }, { tipo: 'ok', datos: undefined })
    assert.equal(lecturas, 0)
  })

  test(`${nombre}: 409 conserva el bloqueo y su detalle`, async () => {
    const detalle = { mensaje: 'No disponible', items_faltantes: [items[0].codigo] }
    const cargar = cargarServicios(async () => ({
      ok: false,
      status: 409,
      json: async () => ({ detail: detalle }),
    }))
    const respuesta = await cargar('cliente')[nombre](...argumentos)
    assert.deepEqual(JSON.parse(JSON.stringify(respuesta)), { tipo: 'bloqueado', detalle })
  })

  test(`${nombre}: un error de red devuelve sin_conexion`, async () => {
    let peticiones = 0
    const cargar = cargarServicios(async () => {
      peticiones += 1
      throw Error('Sin conexión')
    })
    assert.deepEqual({ ...await cargar('cliente')[nombre](...argumentos) }, { tipo: 'sin_conexion' })
    assert.equal(peticiones, 1, 'El cliente no reintenta la petición')
  })
}
