import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { jsonServidor, fixtureServidor } from '../../soporte/servidor-ayudas.mjs'

// Ajuste cartas-diario: el diario no usa el LLM. Toda carta llega con su texto; no hay carta sellada, «Abrir» ni
// «Lumi está escribiendo…», y nada del front llama a `abrir-pregunta`.
test('toda carta recibida llega con su texto y se lista lista para responder', () => {
  const app = fixtureServidor()
  const { cartasDiario } = app.load('src/lib/servidor/adaptadoresDiario.ts')
  const cartas = cartasDiario(jsonServidor('ruta/ruta-diario-preguntas'))
  assert.ok(cartas.length > 0)
  for (const carta of cartas) {
    assert.equal(typeof carta.texto, 'string')
    assert.ok(carta.texto.length > 0)
    assert.equal('estado' in carta, false)
  }
})

test('nada del front pide la redacción de una carta', () => {
  const archivos = [
    'src/services/api/diario.ts',
    'src/store/servidor/diario.ts',
    'src/features/journal/hooks/useBuzonLumi.ts',
    'src/features/journal/components/FilaCarta.tsx',
    'src/features/activities/hooks/useActivityFinish.ts',
  ]
  for (const archivo of archivos)
    assert.doesNotMatch(readFileSync(archivo, 'utf8'), /abrirPregunta|abrir-pregunta|sellada|redaccion/, archivo)
  assert.doesNotMatch(readFileSync('src/features/journal/components/FilaCarta.tsx', 'utf8'), /Lumi está escribiendo/)
})
