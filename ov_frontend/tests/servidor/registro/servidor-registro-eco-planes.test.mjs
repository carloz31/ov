import assert from 'node:assert/strict'
import test from 'node:test'
import { fixtureServidor, jsonServidor } from '../../soporte/servidor-ayudas.mjs'

// F07b (§11): t-comparar cita PLANES; t-proyecto cita PLAN (relato y motivos como chips), PASOS_PLAN_A y
// OPCION_INICIAL. Sin dato, no hay cita. Los contenidos nombran esas referencias en su consigna.
const COMPARAR = jsonServidor('ruta/ruta-referencias-t-comparar')
const PROYECTO = jsonServidor('ruta/ruta-referencias-t-proyecto')
const ref = (respuesta, codigo) => respuesta.referencias.find((r) => r.codigo === codigo)

test('las citas de los planes salen de las referencias del servidor', () => {
  const { citaReferencia, unirCitas } = fixtureServidor().load(
    'src/lib/servidor/adaptadoresRegistro.ts',
  )
  assert.equal(
    citaReferencia(ref(COMPARAR, 't-ref-planes')),
    'Tus planes: A · Psicología, B · Ciencias de la Comunicación',
  )
  const plan = ref(PROYECTO, 't-ref-plan-a')
  assert.equal(citaReferencia(plan), `Tu plan A, Psicología: «${plan.cita}»`)
  const pasos = ref(PROYECTO, 't-ref-pasos-plan-a')
  assert.equal(citaReferencia(pasos), `Tus pasos: ${pasos.opciones.map((o) => `«${o.texto}»`).join(', ')}`)
  assert.equal(citaReferencia(ref(PROYECTO, 't-ref-opcion-inicial')), 'Tu primer interés: Psicología')
  // Sin dato, no hay cita.
  for (const r of [...COMPARAR.referencias, ...PROYECTO.referencias])
    assert.equal(citaReferencia({ ...r, estado: 'SIN_DATO' }), undefined)
  assert.equal(unirCitas(['Uno', 'Dos.', '«Tres.»', 'Cuatro']), 'Uno. Dos. «Tres.» Cuatro')
})
// Ajuste front de registros (lote 1): los ecos de las consignas vienen del servidor (`ecos` del ítem); la zona de
// eco armada con las referencias del front (y sus chips) ya no existe. Las citas de arriba siguen sirviendo a los
// diálogos.
