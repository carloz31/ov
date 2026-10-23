import assert from 'node:assert/strict'
import test from 'node:test'
import { fixtureServidor, jsonServidor } from '../../soporte/servidor-ayudas.mjs'

// F05: la afinidad con la ciudad sale de `logros` en el perfil y en el anillo de la Ciudad.
const logros = jsonServidor('ruta/ruta-logros-final')
const listo = (datos) => ({ datos, estado: 'listo', error: null })

test('el anillo de la Ciudad se llama «Afinidad con la ciudad» y toma logros.afinidad', () => {
  const app = fixtureServidor()
  app.load('src/store/servidor/sesion.ts').publicar({
    actividades: listo(jsonServidor('ruta/ruta-actividades-ciudad')),
    logros: listo({ ...logros, afinidad: 40 }),
  })
  const { getZoneProgress } = app.load('src/features/adventure/lib/mapPoints.ts')
  assert.deepEqual({ ...getZoneProgress('central', {}, {}) }, { label: 'Afinidad con la ciudad', value: 40 })
})

test('el Capítulo I del perfil muestra la afinidad del servidor', () => {
  const app = fixtureServidor()
  app.load('src/store/servidor/sesion.ts').publicar({
    actividades: listo(jsonServidor('ruta/ruta-actividades-ciudad')),
    logros: listo(logros),
  })
  const contexto = { decisionSheets: [], careerInterestIds: [], institutionInterestIds: [], profiles: [] }
  app.load('src/context/occupationExplorationContext.ts').useOccupationExplorationContext = () => contexto
  const { useStudentProfile } = app.load('src/features/discovery/hooks/useStudentProfile.ts')
  assert.equal(useStudentProfile().afinidadCiudad, logros.afinidad)
})
