import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'
import { copia, jsonServidor } from '../../soporte/servidor-ayudas.mjs'

// F07b: borradores de REALIDAD y PASOS, precarga, totales en vivo, resúmenes del menú y avisos (§7–§10), con los
// fixtures ruta-*. Los adaptadores se cargan aislados (solo importan tipos).
async function cargar(ruta) {
  const code = ts.transpileModule(readFileSync(ruta, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 },
  }).outputText
  return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
}
const edicion = await cargar('src/lib/servidor/adaptadoresPlanesEdicion.ts')
const planes = await cargar('src/lib/servidor/adaptadoresPlanes.ts')
const completos = jsonServidor('ruta/ruta-planes')
const familia = jsonServidor('ruta/ruta-planes-misma-familia')
const { opciones } = completos
const [listo] = completos.planes
const porEmpezar = (plan) => ({
  ...plan,
  secciones: plan.secciones.map((s) => (s.codigo === 'REALIDAD' ? { ...s, estado: 'POR_EMPEZAR' } : s)),
})
const filas = (b) => b.gastos.map((g) => [g.rubro, g.monto, g.frecuencia])
const ref = (codigo) => opciones.rubros.find((r) => r.codigo === codigo)

test('precarga solo la primera vez: rubros con referencia, pensión en 0 si es pública, sin alimentación ni vivienda', () => {
  const sinNada = { ...porEmpezar(listo), institucion: null, camino: null }
  const b = edicion.borradorRealidad(sinNada, opciones)
  const codigos = b.gastos.map((g) => g.rubro)
  assert.ok(
    !codigos.includes('PREPARACION') && !codigos.includes('ALIMENTACION') && !codigos.includes('VIVIENDA'),
  )
  assert.equal(b.gastos.find((g) => g.rubro === 'PENSION').monto, ref('PENSION').monto_referencia)
  assert.ok(b.precargando)
  // Con una institución pública y un camino que prepara: Pensión en 0 y Preparación con su referencia.
  const publica = edicion.borradorRealidad(porEmpezar(listo), opciones)
  assert.equal(publica.gastos.find((g) => g.rubro === 'PENSION').monto, 0)
  assert.deepEqual(filas(publica)[0], ['PREPARACION', ref('PREPARACION').monto_referencia, 'UNICA'])
  // Ya guardada, se edita lo del servidor tal cual.
  const guardada = edicion.borradorRealidad(listo, opciones)
  assert.deepEqual(
    filas(guardada),
    listo.gastos.map((g) => [g.rubro, g.monto, g.frecuencia]),
  )
  assert.equal(guardada.precargando, false)
})

test('el camino agrega o quita Preparación; la institución no toca los montos salvo la pensión precargada', () => {
  const b = edicion.borradorRealidad(listo, opciones)
  const sinPreparar = edicion.cambiarCamino(b, { opcion: 'DIRECTO' }, opciones)
  assert.ok(!sinPreparar.gastos.some((g) => g.rubro === 'PREPARACION'))
  const otraVez = edicion.cambiarCamino(sinPreparar, { opcion: 'PREPARARME' }, opciones)
  assert.deepEqual(filas(otraVez)[0], ['PREPARACION', ref('PREPARACION').monto_referencia, 'UNICA'])
  assert.equal(
    edicion.notaGasto(otraVez.gastos[0], otraVez, opciones, 'PUBLICA'),
    'porque eliges prepararte primero',
  )
  assert.deepEqual(filas(edicion.cambiarInstitucion(b, 'otra', 'PRIVADA', opciones)), filas(b))
  const primera = edicion.borradorRealidad({ ...porEmpezar(listo), institucion: null }, opciones)
  const publica = edicion.cambiarInstitucion(primera, 'inst-63', 'PUBLICA', opciones)
  const pension = publica.gastos.find((g) => g.rubro === 'PENSION')
  assert.equal(pension.monto, 0)
  assert.equal(edicion.notaGasto(pension, publica, opciones, 'PUBLICA'), '0 por ser pública')
  const agregado = edicion.agregarGasto(b, 'VIVIENDA', opciones, 'PUBLICA')
  assert.deepEqual(filas(agregado).at(-1), ['VIVIENDA', 0, 'MENSUAL'])
})

test('los totales en vivo coinciden con los del servidor', () => {
  const t = edicion.totalesGastos(listo.gastos, opciones.ciclos_por_anio, listo.institucion.duracion_ciclos)
  assert.equal(t.primerAnio, listo.total_primer_anio)
  assert.equal(t.carrera, listo.total_carrera)
  assert.equal(edicion.textoAnios(t.anios), '5 años')
  // 11 ciclos son 5,5 años y la mitad se redondea hacia arriba (como test_hu045: 17 405,5 → 17 406).
  const gastos = [
    { monto: 350, frecuencia: 'UNICA' },
    { monto: 150, frecuencia: 'MENSUAL' },
    { monto: 600, frecuencia: 'POR_CICLO' },
    { monto: 101, frecuencia: 'ANUAL' },
  ]
  assert.equal(edicion.totalesGastos(gastos, 2, 11).carrera, 17406)
  assert.equal(edicion.totalesGastos(gastos, 2, null).carrera, null)
  assert.equal(planes.soles(6250), 'S/ 6 250')
})

test('el cuerpo de REALIDAD conserva complicaciones por número y agrega las nuevas', () => {
  const b = edicion.borradorRealidad(listo, opciones)
  const datos = edicion.datosRealidad({
    ...b,
    complicaciones: [...b.complicaciones, { opcion: 'DISTANCIA' }, { otro: 'Mi papá' }],
  })
  assert.deepEqual(copia(datos.complicaciones), [{ numero: 1 }, { opcion: 'DISTANCIA' }, { otro: 'Mi papá' }])
  assert.deepEqual(copia(datos.financiamiento), [{ opcion: 'FAMILIA' }, { otro: 'Trabajo de verano' }])
  assert.equal(datos.institucion, 'inst-63')
  assert.deepEqual(copia(datos.camino), { opcion: 'PREPARARME' })
  assert.deepEqual(copia(datos.gastos[0]), { rubro: 'PREPARACION', monto: 1300, frecuencia: 'UNICA' })
})

test('PASOS: aceptar (editada), descartar y nuevos; los hechos no se envían', () => {
  const b = edicion.borradorPasos(listo, () => null)
  assert.deepEqual(
    b.pasos.map((p) => p.numero),
    [2],
  )
  const [primera, segunda] = edicion.sugerenciasEnEspera(listo, b)
  let siguiente = edicion.aceptarSugerencia(
    b,
    listo,
    primera.numero,
    'conversar',
    'Pregúntale a tu profesora',
  )
  siguiente = edicion.descartarSugerencia(siguiente, segunda.numero)
  siguiente = {
    ...siguiente,
    pasos: [...siguiente.pasos, edicion.nuevoPaso('curso', 'Un curso'), edicion.nuevoPaso('', '')],
  }
  assert.equal(
    edicion.sugerenciasEnEspera(listo, siguiente).length,
    edicion.sugerenciasEnEspera(listo, b).length - 2,
  )
  assert.deepEqual(copia(edicion.datosPasos(siguiente)), {
    pasos: [
      { numero: 2, tipo: 'visitar', texto: listo.pasos[1].texto },
      { sugerencia: primera.numero, tipo: 'conversar', texto: 'Pregúntale a tu profesora' },
      { tipo: 'curso', texto: 'Un curso' },
    ],
    sugerencias_descartadas: [segunda.numero],
  })
})

test('resúmenes del menú: REALIDAD, PASOS, PASOS bloqueada con sugerencias y medidores', () => {
  const [, realidad, pasos] = [null, ...listo.secciones.slice(2)]
  assert.equal(
    planes.resumenSeccion(listo, realidad, opciones),
    `Universidad Nacional Federico Villarreal · Prepararme primero · 1.er año ≈ S/ 2 500`,
  )
  const m = planes.sugerenciasPendientes(listo).length
  assert.equal(
    planes.resumenSeccion(listo, pasos, opciones),
    `2 pasos, 1 hecho · ${m} ${m === 1 ? 'sugerencia' : 'sugerencias'}`,
  )
  const bloqueada = { ...pasos, estado: 'BLOQUEADA', bloqueo: [{ mensaje: 'Completa la comparación.' }] }
  assert.equal(
    planes.resumenSeccion(listo, bloqueada, opciones),
    `Completa la comparación. · ${m} sugerencias te esperan`,
  )
  assert.equal(planes.resumenMedidores(listo.medidores), 'Mucho · Algo · Algo')
  assert.equal(
    planes.resumenMedidores({ entusiasmo: 3, capacidad: null, recursos: null }),
    'Mucho · Sin valorar · Sin valorar',
  )
  assert.equal(planes.resumenMedidores(familia.planes[0].medidores), 'Sin valorar')
})

test('§9: el aviso al guardar 2 y 3 cuenta dudas o complicaciones y pasos sugeridos; sin sugerencias, el simple', () => {
  const m = planes.sugerenciasPendientes(listo).length
  const abiertas = listo.dudas.filter((d) => d.estado === 'ABIERTA').length
  const conocimiento = planes.avisoGuardado('CONOCIMIENTO', listo)
  assert.equal(conocimiento.titulo, `${abiertas} dudas y ${m} pasos sugeridos`)
  assert.equal(conocimiento.descripcion, 'te esperan en Mis próximos pasos.')
  assert.equal(planes.avisoGuardado('REALIDAD', listo).titulo, `1 complicación y ${m} pasos sugeridos`)
  const sin = { ...listo, sugerencias: [] }
  assert.deepEqual(copia(planes.avisoGuardado('CONOCIMIENTO', sin)), {
    titulo: 'Guardado.',
    descripcion: 'Tus dudas quedaron anotadas.',
  })
  assert.equal(planes.avisoGuardado('POR_QUE', listo).titulo, 'Lo anoté.')
})
