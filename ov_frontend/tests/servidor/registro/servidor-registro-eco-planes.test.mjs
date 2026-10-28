import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { copia, fixtureServidor, jsonServidor } from '../../soporte/servidor-ayudas.mjs'

// F07b (§11): t-comparar cita PLANES; t-proyecto cita PLAN (relato y motivos como chips), PASOS_PLAN_A y
// OPCION_INICIAL. Sin dato, no hay cita. Los contenidos nombran esas referencias en su consigna.
const COMPARAR = jsonServidor('ruta/ruta-referencias-t-comparar')
const PROYECTO = jsonServidor('ruta/ruta-referencias-t-proyecto')
const contenido = (clave) => JSON.parse(readFileSync(`src/data/activities/contenidos/${clave}.json`, 'utf8'))
const ref = (respuesta, codigo) => respuesta.referencias.find((r) => r.codigo === codigo)

test('las citas de los planes salen de las referencias del servidor', () => {
  const { citaReferencia, chipsReferencia } = fixtureServidor().load(
    'src/lib/servidor/adaptadoresRegistro.ts',
  )
  assert.equal(
    citaReferencia(ref(COMPARAR, 't-ref-planes')),
    'Tus planes: A · Psicología, B · Ciencias de la Comunicación',
  )
  const plan = ref(PROYECTO, 't-ref-plan-a')
  assert.equal(citaReferencia(plan), `Tu plan A, Psicología: «${plan.cita}»`)
  assert.deepEqual(copia(chipsReferencia(plan)), ['Ayudar a otros', 'Me gusta explicar'])
  const pasos = ref(PROYECTO, 't-ref-pasos-plan-a')
  assert.equal(citaReferencia(pasos), `Tus pasos: ${pasos.opciones.map((o) => `«${o.texto}»`).join(', ')}`)
  assert.equal(citaReferencia(ref(PROYECTO, 't-ref-opcion-inicial')), 'Tu primer interés: Psicología')
  // Sin dato: ni cita ni chips; los chips solo son de PLAN.
  for (const r of [...COMPARAR.referencias, ...PROYECTO.referencias]) {
    assert.equal(citaReferencia({ ...r, estado: 'SIN_DATO' }), undefined)
    assert.deepEqual(copia(chipsReferencia({ ...r, estado: 'SIN_DATO' })), [])
  }
  assert.deepEqual(copia(chipsReferencia(pasos)), [])
})

test('t_comparar y t_proyecto tienen su consigna con el eco de sus referencias', () => {
  const comparar = contenido('t_comparar'),
    proyecto = contenido('t_proyecto')
  assert.equal(comparar._dato_de_prueba, true)
  const consignaComparar = comparar.nodos.find((n) => n.tipo === 'consigna')
  assert.deepEqual([consignaComparar.item, consignaComparar.eco], ['t-comparar-eleccion', 't-ref-planes'])
  const consignaProyecto = proyecto.nodos.find((n) => n.tipo === 'consigna')
  assert.equal(consignaProyecto.item, 't-proyecto-paso')
  assert.deepEqual([...consignaProyecto.eco].sort(), PROYECTO.referencias.map((r) => r.codigo).sort())
})

test('t-proyecto: los motivos van justo tras la cita del plan y las citas se unen sin punto doble', () => {
  const { ecoDeReferencias, unirCitas } = fixtureServidor().load('src/lib/servidor/adaptadoresRegistro.ts')
  const eco = contenido('t_proyecto').nodos.find((n) => n.tipo === 'consigna').eco
  const referencias = eco.map((codigo) => ref(PROYECTO, codigo))
  const plan = ref(PROYECTO, 't-ref-plan-a')
  const pasos = ref(PROYECTO, 't-ref-pasos-plan-a')
  assert.deepEqual(copia(ecoDeReferencias(referencias)), {
    cita: `Tu plan A, Psicología: «${plan.cita}»`,
    chips: ['Ayudar a otros', 'Me gusta explicar'],
    citaTras: `Tus pasos: ${pasos.opciones.map((o) => `«${o.texto}»`).join(', ')} Tu primer interés: Psicología`,
  })
  assert.doesNotMatch(JSON.stringify(ecoDeReferencias(referencias)), /\.»\./)
  // Sin chips (t-comparar), una sola cita; sin dato, nada.
  assert.deepEqual(copia(ecoDeReferencias(COMPARAR.referencias)), {
    cita: 'Tus planes: A · Psicología, B · Ciencias de la Comunicación',
  })
  assert.equal(ecoDeReferencias(referencias.map((r) => ({ ...r, estado: 'SIN_DATO' }))), undefined)
  assert.equal(unirCitas(['Uno', 'Dos.', '«Tres.»', 'Cuatro']), 'Uno. Dos. «Tres.» Cuatro')
})
