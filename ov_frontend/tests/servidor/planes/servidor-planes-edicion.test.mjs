import assert from 'node:assert/strict'
import test from 'node:test'
import { copia, importarAislado, jsonServidor } from '../../soporte/servidor-ayudas.mjs'

// F07b: borradores de REALIDAD y PASOS, precarga, totales en vivo, resúmenes del menú y avisos (§7–§10), con los
// fixtures ruta-*. Los adaptadores se cargan aislados (solo importan tipos y `fechas.ts`).
const cargar = importarAislado
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

test('gastos propuestos en cada edición: guardados más predeterminados vacíos, con su pista y Pensión pública en 0', () => {
  const b = edicion.borradorRealidad(listo, opciones)
  // Guardados: Preparación 1300, Pensión 0, Matrícula 600; faltan Admisión, Materiales y Transporte (vacíos).
  assert.deepEqual(filas(b), [
    ['PREPARACION', 1300, 'UNICA'],
    ['ADMISION', null, 'UNICA'],
    ['MATRICULA', 600, 'POR_CICLO'],
    ['PENSION', 0, 'MENSUAL'],
    ['MATERIALES', null, 'POR_CICLO'],
    ['TRANSPORTE', null, 'MENSUAL'],
  ])
  const pista = (rubro, gestion = 'PUBLICA') =>
    copia(
      edicion.pistaGasto(
        b.gastos.find((g) => g.rubro === rubro),
        opciones,
        gestion,
      ),
    )
  assert.deepEqual(pista('ADMISION'), { referencia: 350 })
  assert.deepEqual(pista('MATRICULA'), { texto: 'Consúltalo en su página' })
  assert.deepEqual(pista('PENSION'), { texto: '0 por ser pública' })
  assert.deepEqual(pista('PENSION', 'PRIVADA'), { texto: 'Consúltalo en su página' })
  // Sin nada guardado ni institución: todos vacíos, sin Preparación, Alimentación ni Vivienda.
  const nuevo = edicion.borradorRealidad(
    { ...porEmpezar(listo), institucion: null, camino: null, gastos: [] },
    opciones,
  )
  assert.deepEqual(filas(nuevo), [
    ['ADMISION', null, 'UNICA'],
    ['MATRICULA', null, 'POR_CICLO'],
    ['PENSION', null, 'MENSUAL'],
    ['MATERIALES', null, 'POR_CICLO'],
    ['TRANSPORTE', null, 'MENSUAL'],
  ])
  // Una fila vacía no se envía.
  assert.deepEqual(
    copia(edicion.datosRealidad(b).gastos).map((g) => g.rubro),
    ['PREPARACION', 'MATRICULA', 'PENSION'],
  )
})

test('camino, institución, «✕», chips y «Restablecer predeterminados» conservan lo escrito', () => {
  let b = edicion.borradorRealidad(listo, opciones)
  b = { ...b, gastos: b.gastos.map((g) => (g.rubro === 'ADMISION' ? { ...g, monto: 400 } : g)) }
  // El camino rehace el conjunto: sin preparación se va Preparación; con ella vuelve vacía. Lo escrito sigue.
  const directo = edicion.cambiarCamino(b, { opcion: 'POSTULAR_DIRECTO' }, opciones, 'PUBLICA')
  assert.ok(!directo.gastos.some((g) => g.rubro === 'PREPARACION'))
  const otraVez = edicion.cambiarCamino(directo, { opcion: 'PREPARARME' }, opciones, 'PUBLICA')
  assert.deepEqual(filas(otraVez).slice(0, 2), [
    ['PREPARACION', null, 'UNICA'],
    ['ADMISION', 400, 'UNICA'],
  ])
  // La institución solo toca la pensión: en 0 vuelve a vacía con una privada, y vacía pasa a 0 con una pública.
  const privada = edicion.cambiarInstitucion(b, 'otra', 'PRIVADA', opciones)
  assert.equal(privada.gastos.find((g) => g.rubro === 'PENSION').monto, null)
  assert.equal(privada.gastos.find((g) => g.rubro === 'ADMISION').monto, 400)
  assert.equal(
    edicion
      .cambiarInstitucion(privada, 'inst-63', 'PUBLICA', opciones)
      .gastos.find((g) => g.rubro === 'PENSION').monto,
    0,
  )
  // La «✕» manda la fila a los chips; «Restablecer» la repone vacía sin borrar montos.
  const transporte = b.gastos.find((g) => g.rubro === 'TRANSPORTE')
  const sinTransporte = edicion.quitarGasto(b, transporte.clave)
  assert.ok(edicion.rubrosSinFila(sinTransporte, opciones).some((r) => r.codigo === 'TRANSPORTE'))
  assert.equal(edicion.faltanPredeterminados(sinTransporte, opciones), true)
  const repuesto = edicion.restablecerGastos(sinTransporte, opciones, 'PUBLICA')
  assert.deepEqual(filas(repuesto), filas(b))
  assert.equal(edicion.faltanPredeterminados(repuesto, opciones), false)
  // Alimentación entra por su chip, vacía; «+ Otro gasto» va al final.
  const conOtro = edicion.agregarGasto(
    edicion.agregarGasto(b, null, opciones, 'PUBLICA'),
    'ALIMENTACION',
    opciones,
    'PUBLICA',
  )
  assert.deepEqual(filas(conOtro).slice(-2), [
    ['ALIMENTACION', null, 'MENSUAL'],
    [null, null, 'MENSUAL'],
  ])
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
  // Sin complicaciones (las sugerencias vienen de CONOCIMIENTO), solo los pasos.
  assert.equal(planes.avisoGuardado('REALIDAD', { ...listo, complicaciones: [] }).titulo, `${m} pasos sugeridos`)
  const sin = { ...listo, sugerencias: [] }
  assert.deepEqual(copia(planes.avisoGuardado('CONOCIMIENTO', sin)), {
    titulo: 'Guardado.',
    descripcion: 'Tus dudas quedaron anotadas.',
  })
  assert.equal(planes.avisoGuardado('POR_QUE', listo).titulo, 'Lo anoté.')
})

test('los totales en vivo suman solo lo escrito y cuentan los montos que faltan', () => {
  const gastos = [
    { monto: 350, frecuencia: 'UNICA' },
    { monto: null, frecuencia: 'MENSUAL' },
    { monto: 600, frecuencia: 'POR_CICLO' },
    { monto: null, frecuencia: 'POR_CICLO' },
  ]
  const t = edicion.totalesGastos(gastos, 2, 10)
  assert.deepEqual([t.primerAnio, t.carrera, t.faltan], [350 + 2 * 600, 350 + 10 * 600, 2])
})
