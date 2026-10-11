import { escenarioServidor } from '../../soporte/servidor-ayudas.mjs'
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
const inicial = escenarioServidor('inicial'),
  ciudad = escenarioServidor('ciudad')

test('los adaptadores solo importan tipos y usan el contrato real de los fixtures', () => {
  assert.ok([...source.matchAll(/^import\s+(.+)$/gm)].every((match) => match[1].startsWith('type ')))
  assert.equal(
    adaptadores.estadoPunto(adaptadores.actividadServidor(inicial.bloques, 'mission-welcome')),
    'available',
  )
  assert.equal(adaptadores.estadoPunto(adaptadores.actividadServidor(inicial.bloques, 'enc-mitos')), 'locked')
  assert.equal(
    adaptadores.estadoPunto(adaptadores.actividadServidor(ciudad.bloques, 'mission-next-step')),
    'completed',
  )
  assert.equal(adaptadores.estadoPunto(), 'locked')
  assert.equal(adaptadores.siguienteActividad(inicial.bloques).codigo, 'mission-welcome')
  assert.equal(adaptadores.siguienteActividad(ciudad.bloques), undefined)
  assert.equal(adaptadores.ciudadDisponible(inicial.bloques), false)
  assert.equal(adaptadores.ciudadDisponible(ciudad.bloques), true)
  assert.equal(adaptadores.progresoCamino(ciudad.bloques).porcentaje, 100)
})
test('las fichas solo están obtenidas si la BD lo indica y Mara usa su interacción pendiente', () => {
  assert.equal(adaptadores.fichaDisponible(inicial.fichas, 'first-steps'), false)
  assert.equal(adaptadores.fichaDisponible(ciudad.fichas, 'first-steps'), true)
  assert.equal(adaptadores.fichaDisponible(ciudad.fichas, 'no-existe'), false)
  assert.equal(adaptadores.interaccionMara(ciudad.bloques).actividad.codigo, 'act-tip-01')
  // DATO DE PRUEBA: avance parcial para comprobar EN_CURSO, sin alterar fixtures.
  const parcial = copia(ciudad)
  parcial.bloques[1].actividades[0].estado = 'COMPLETADA'
  parcial.bloques[1].actividades[1].estado = 'EN_CURSO'
  assert.equal(adaptadores.interaccionMara(parcial.bloques).numero, 2)
  assert.equal(adaptadores.estadoPunto(adaptadores.interaccionMara(parcial.bloques).actividad), 'available')
})
test('la hidratación conserva respuestas y nodos y corrige finalizaciones obsoletas sin mutar', () => {
  const actual = {
    version: 2,
    progress: {
      'mission-welcome': {
        estudianteId: 'anterior',
        actividadId: 'mission-welcome',
        estado: 'completada',
        nodoActualId: 'welcome-03',
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
  assert.equal(proyeccion.progress['mission-welcome'].estado, 'no_iniciada')
  assert.equal(proyeccion.progress['mission-welcome'].nodoActualId, 'welcome-03')
  assert.equal(proyeccion.progress['mission-welcome'].completadaEn, undefined)
  assert.equal(proyeccion.drafts, actual.drafts)
  assert.equal(proyeccion.submissions, actual.submissions)
  assert.equal(
    adaptadores.proyectarJourney(ciudad.bloques, actual, ciudad.cuenta.codigo).progress['mission-welcome']
      .estado,
    'completada',
  )
})
test('los cierres enumeran únicamente los desbloqueos del servidor, incluidos nivel y ciudad', () => {
  const welcome = adaptadores.textosDesbloqueos(jsonServidor('completar-mission-welcome').nuevos_desbloqueos)
  assert.equal(welcome.length, 3)
  assert.ok(welcome.some((d) => d.texto === 'Se abrió: La plaza de los rumores'))
  assert.ok(welcome.some((d) => d.tipo === 'FICHA' && d.codigo === 'first-steps'))
  assert.ok(welcome.some((d) => d.codigo === 'I1'))
  const fin = adaptadores.textosDesbloqueos(jsonServidor('completar-mission-next-step').nuevos_desbloqueos)
  assert.ok(fin.some((d) => d.texto === 'La ciudad te espera'))
  assert.ok(fin.some((d) => d.tipo === 'NIVEL' && d.texto.startsWith('Subiste a ')))
  assert.ok(!fin.some((d) => d.tipo === 'CONVERSACIONES'))
  assert.deepEqual(adaptadores.textosDesbloqueos([]), [])
})
test('los requisitos y conflictos se explican usando el progreso recibido', () => {
  // DATO DE PRUEBA: respuesta de progreso equivalente a P1/P13; el contrato ya existe.
  const progreso = {
    objetivo: { tipo: 'ACTIVIDAD', codigo: 'enc-mitos' },
    disponible: false,
    reglas: [
      {
        cumplida: false,
        condiciones: [
          {
            tipo_evento: 'COMPLETA_ACTIVIDAD',
            referencia: 'mission-welcome',
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
    'Requisito: completa “El inicio del viaje”.',
  )
  assert.match(
    adaptadores.textoRequisito(
      { ...progreso, objetivo: { tipo: 'BLOQUE', codigo: 'CIUDAD' } },
      inicial.bloques,
    ),
    /0 de 9/,
  )
  assert.match(adaptadores.textoBloqueo({ items_faltantes: ['RIA-1', 'RIA-2'] }, inicial.bloques), /2 ítems/)
})
