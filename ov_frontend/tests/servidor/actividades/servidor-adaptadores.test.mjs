import { escenarioRuta, escenarioServidor } from '../../soporte/servidor-ayudas.mjs'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'
import { copia, jsonServidor } from '../../soporte/servidor-ayudas.mjs'

const source = readFileSync('src/lib/servidor/adaptadores.ts', 'utf8')
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 },
}).outputText
const adaptadores = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
const inicial = escenarioRuta('inicial'),
  ciudad = escenarioRuta('ciudad')
// Hasta F03, Mara y sus fichas se prueban con los fixtures de plataforma.
const plataforma = escenarioServidor('ciudad')

test('los adaptadores solo importan tipos y usan el contrato real de los fixtures', () => {
  assert.ok([...source.matchAll(/^import\s+(.+)$/gm)].every((match) => match[1].startsWith('type ')))
  assert.equal(adaptadores.estadoPunto(adaptadores.actividadServidor(inicial.bloques, 't-inicio')), 'available')
  assert.equal(
    adaptadores.estadoPunto(adaptadores.actividadServidor(inicial.bloques, 't-cierre-inicio')),
    'locked',
  )
  assert.equal(
    adaptadores.estadoPunto(adaptadores.actividadServidor(ciudad.bloques, 't-expectativas')),
    'completed',
  )
  assert.equal(adaptadores.estadoPunto(), 'locked')
  // El Camino reúne los bloques de MISIONES_CAMPO (T0, T1 y T2).
  assert.deepEqual(
    copia(adaptadores.bloquesZona(inicial.bloques, 'CAMINO').map((b) => b.codigo)),
    ['T0', 'T1', 'T2'],
  )
  assert.equal(adaptadores.siguienteActividad(inicial.bloques).codigo, 't-inicio')
  assert.equal(adaptadores.siguienteActividad(ciudad.bloques, 'CIUDAD').codigo, 't-mision-intereses')
  assert.equal(adaptadores.ciudadDisponible(inicial.bloques), false)
  assert.equal(adaptadores.ciudadDisponible(ciudad.bloques), true)
  // Como el servidor, el avance cuenta solo las requeridas: T0 (3), t-expectativas y T2 (3).
  assert.deepEqual(copia(adaptadores.progresoCamino(ciudad.bloques)), {
    completadas: 4,
    total: 7,
    porcentaje: (4 / 7) * 100,
  })
})
test('las fichas solo están obtenidas si la BD lo indica y Mara usa su interacción pendiente', () => {
  assert.equal(adaptadores.fichaDisponible(escenarioServidor('inicial').fichas, 'first-steps'), false)
  assert.equal(adaptadores.fichaDisponible(plataforma.fichas, 'first-steps'), true)
  assert.equal(adaptadores.fichaDisponible(plataforma.fichas, 'no-existe'), false)
  assert.equal(adaptadores.interaccionMara(plataforma.bloques).actividad.codigo, 'act-tip-01')
  // DATO DE PRUEBA: avance parcial para comprobar EN_CURSO, sin alterar fixtures.
  const parcial = copia(plataforma)
  parcial.bloques[1].actividades[0].estado = 'COMPLETADA'
  parcial.bloques[1].actividades[1].estado = 'EN_CURSO'
  assert.equal(adaptadores.interaccionMara(parcial.bloques).numero, 2)
  assert.equal(adaptadores.estadoPunto(adaptadores.interaccionMara(parcial.bloques).actividad), 'available')
})
test('la hidratación conserva respuestas y nodos y corrige finalizaciones obsoletas sin mutar', () => {
  const actual = {
    version: 2,
    progress: {
      't-inicio': {
        estudianteId: 'anterior',
        actividadId: 't-inicio',
        estado: 'completada',
        nodoActualId: 't-inicio-slide',
        completadaEn: 'fecha',
      },
    },
    drafts: { uno: 'borrador' },
    submissions: [{ texto: 'respuesta' }],
    items: [],
    choices: [],
    attempts: [],
    results: [],
    rewards: [],
    pieces: [],
    resources: [],
  }
  const snapshot = copia(actual),
    proyeccion = adaptadores.proyectarJourney(inicial.bloques, actual, inicial.cuenta.codigo)
  assert.deepEqual(actual, snapshot)
  assert.equal(proyeccion.progress['t-inicio'].estado, 'no_iniciada')
  assert.equal(proyeccion.progress['t-inicio'].nodoActualId, 't-inicio-slide')
  assert.equal(proyeccion.progress['t-inicio'].completadaEn, undefined)
  assert.equal(proyeccion.drafts, actual.drafts)
  assert.equal(proyeccion.submissions, actual.submissions)
  assert.equal(
    adaptadores.proyectarJourney(ciudad.bloques, actual, ciudad.cuenta.codigo).progress['t-inicio']
      .estado,
    'completada',
  )
})
test('los cierres enumeran únicamente los desbloqueos del servidor, incluidos nivel y ciudad', () => {
  const inicio = adaptadores.textosDesbloqueos(jsonServidor('ruta/ruta-completar-t-inicio').nuevos_desbloqueos)
  assert.equal(inicio.length, 4)
  assert.ok(inicio.some((d) => d.texto === 'Se abrió: Cierre del inicio'))
  assert.ok(inicio.some((d) => d.tipo === 'FICHA' && d.codigo === 't-ficha'))
  assert.ok(inicio.some((d) => d.codigo === 't-ins-1'))
  assert.ok(!inicio.some((d) => d.tipo === 'SECCION' || d.tipo === 'SECCION_PLAN'))
  const cierre = adaptadores.textosDesbloqueos(
    jsonServidor('ruta/ruta-completar-t-cierre-inicio').nuevos_desbloqueos,
  )
  assert.ok(cierre.some((d) => d.tipo === 'NIVEL' && d.texto.startsWith('Subiste a ')))
  assert.ok(!cierre.some((d) => d.tipo === 'BLOQUE'))
  const ciudadAbierta = jsonServidor('ruta/ruta-desbloqueos-no-vistos').filter((d) => d.tipo_objetivo === 'BLOQUE')
  assert.deepEqual(
    copia(adaptadores.textosDesbloqueos(ciudadAbierta).map((d) => d.texto)),
    ['La ciudad te espera'],
  )
  assert.deepEqual(adaptadores.textosDesbloqueos([]), [])
})
test('los requisitos y conflictos se explican usando el progreso recibido', () => {
  // DATO DE PRUEBA: respuesta de progreso equivalente a P1/P13; el contrato ya existe.
  const progreso = {
    objetivo: { tipo: 'ACTIVIDAD', codigo: 't-cierre-inicio' },
    disponible: false,
    reglas: [
      {
        cumplida: false,
        condiciones: [
          {
            tipo_evento: 'COMPLETA_ACTIVIDAD',
            referencia: 't-inicio',
            actual: 0,
            requerido: 1,
            cumplida: false,
          },
        ],
      },
    ],
  }
  assert.equal(
    adaptadores.textoRequisito(progreso, inicial.bloques),
    'Requisito: completa “Inicio de prueba”.',
  )
  assert.match(adaptadores.textoBloqueo({ items_faltantes: ['RIA-1', 'RIA-2'] }, inicial.bloques), /2 ítems/)
})
