import assert from 'node:assert/strict'
import test from 'node:test'
import { fixtureServidor, jsonServidor } from '../../soporte/servidor-ayudas.mjs'

// F05: la afinidad con la ciudad. Desde el ajuste del panel sale de `/avance` (el mismo cálculo que `logros`)
// en el perfil y en el anillo de la Ciudad.
const logros = jsonServidor('ruta/ruta-logros-final')
const listo = (datos) => ({ datos, estado: 'listo', error: null })

const avance = jsonServidor('ruta/ruta-avance-final')

test('el anillo de la Ciudad se llama «Afinidad con la ciudad» y toma avance.ciudad', () => {
  const app = fixtureServidor()
  app.load('src/store/servidor/sesion.ts').publicar({
    actividades: listo(jsonServidor('ruta/ruta-actividades-ciudad')),
    // logros.afinidad ya no se lee: si se leyera, el anillo diría 40.
    logros: listo({ ...logros, afinidad: 40 }),
    avance: listo(avance),
  })
  const { getZoneProgress } = app.load('src/features/adventure/lib/mapPoints.ts')
  assert.deepEqual(
    { ...getZoneProgress('central', {}, {}) },
    { label: 'Afinidad con la ciudad', porcentaje: avance.ciudad.porcentaje },
  )
  // El fixture lo garantiza: es el mismo valor que entrega `/logros`.
  assert.equal(avance.ciudad.porcentaje, logros.afinidad)
})

test('sin avance (falló su consulta) el anillo no inventa un valor', () => {
  const app = fixtureServidor()
  app.load('src/store/servidor/sesion.ts').publicar({ actividades: listo(jsonServidor('ruta/ruta-actividades-ciudad')) })
  const { getZoneProgress } = app.load('src/features/adventure/lib/mapPoints.ts')
  assert.equal(getZoneProgress('central', {}, {}).porcentaje, null)
  assert.deepEqual(
    [getZoneProgress('missions', {}, {}).porcentaje, getZoneProgress('missions', {}, {}).tramo],
    [null, null],
  )
})

// Ajuste pasaporte-perfil: el perfil ya no muestra la afinidad; su ruta son los tramos de `/avance`.
test('la ruta del perfil sale de los tramos de avance, sin afinidad', () => {
  const app = fixtureServidor()
  app.load('src/store/servidor/sesion.ts').publicar({
    actividades: listo(jsonServidor('ruta/ruta-actividades-ciudad')),
    logros: listo(logros),
    avance: listo(avance),
  })
  const contexto = { decisionSheets: [], careerInterestIds: [], institutionInterestIds: [], profiles: [] }
  app.load('src/context/occupationExplorationContext.ts').useOccupationExplorationContext = () => contexto
  const { useStudentProfile } = app.load('src/features/discovery/hooks/useStudentProfile.ts')
  const perfil = useStudentProfile()
  assert.equal('afinidadCiudad' in perfil, false)
  assert.deepEqual(
    perfil.tramos.map((t) => [t.nombre, t.estado]),
    avance.tramos.map((t) => [t.nombre, t.estado]),
  )
  assert.equal(perfil.requeridas, avance.requeridas)
})
