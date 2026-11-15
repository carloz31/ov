// Auditoría plataforma (F8): en api, lo que no cambió no se reescribe en localStorage y el borrador que se teclea se
// escribe con espera, sin perderse: se guarda al pedirlo (salir del campo, desmontar, enviar) o con otra escritura.
import assert from 'node:assert/strict'
import test from 'node:test'
import { fixtureServidor } from '../../soporte/servidor-ayudas.mjs'

const CLAVE = 'ov.missions.v2.api'
const borrador = (app) => JSON.parse(app.local.get(CLAVE) ?? 'null')?.por_cuenta?.['est-ana']?.drafts?.['a/n']

test('el borrador espera, se guarda al pedirlo o con otra escritura, y lo igual no se reescribe', async () => {
  const app = fixtureServidor()
  const journey = app.load('src/store/journeyStore.ts')
  journey.configurarJourneyServidor('est-ana')
  journey.updateJourney((s) => ({ ...s, drafts: { ...s.drafts, 'a/n': 'Hola' } }), { diferido: true })
  // En memoria ya está; en el navegador, todavía no.
  assert.equal(journey.getJourneySnapshot().drafts['a/n'], 'Hola')
  assert.equal(borrador(app), undefined)
  assert.equal(journey.guardarJourneyPendiente(), true)
  assert.equal(borrador(app), 'Hola')
  // Una escritura inmediata guarda antes lo pendiente.
  journey.updateJourney((s) => ({ ...s, drafts: { ...s.drafts, 'a/n': 'Hola, Lumi' } }), { diferido: true })
  journey.updateJourney((s) => ({ ...s, submissions: [...s.submissions] }))
  assert.equal(borrador(app), 'Hola, Lumi')
  // Sin cambios no se reescribe: el valor del navegador queda como estaba.
  app.local.set(CLAVE, JSON.stringify({ por_cuenta: { 'est-ana': { marca: 'DATO DE PRUEBA' } } }))
  journey.updateJourney((s) => ({ ...s }))
  assert.equal(JSON.parse(app.local.get(CLAVE)).por_cuenta['est-ana'].marca, 'DATO DE PRUEBA')
  // La espera vence sola.
  journey.updateJourney((s) => ({ ...s, drafts: { ...s.drafts, 'a/n': 'Sin perder nada' } }), { diferido: true })
  await new Promise((r) => setTimeout(r, 350))
  assert.equal(borrador(app), 'Sin perder nada')
})

test('en local cada cambio se escribe al instante, como antes', () => {
  const app = fixtureServidor({ api: false })
  const journey = app.load('src/store/journeyStore.ts')
  journey.updateJourney((s) => ({ ...s, drafts: { ...s.drafts, 'a/n': 'Local' } }), { diferido: true })
  assert.equal(JSON.parse(app.local.get('ov.missions.v2')).drafts['a/n'], 'Local')
})

test('la aventura igual a la guardada no se reescribe en api', () => {
  const app = fixtureServidor()
  const aventura = app.load('src/store/adventureStore.ts')
  aventura.configurarAdventureServidor('est-ana', () => false)
  aventura.hidratarAdventureServidor(['b0-1'])
  const clave = 'ov.student-adventure.v1.api'
  app.local.set(clave, JSON.stringify({ por_cuenta: { 'est-ana': { marca: 'DATO DE PRUEBA' } } }))
  aventura.hidratarAdventureServidor(['b0-1'])
  assert.equal(JSON.parse(app.local.get(clave)).por_cuenta['est-ana'].marca, 'DATO DE PRUEBA')
  aventura.hidratarAdventureServidor(['b0-1', 'b0-2'])
  assert.deepEqual(JSON.parse(app.local.get(clave)).por_cuenta['est-ana'].completedMissionIds, ['b0-1', 'b0-2'])
})
