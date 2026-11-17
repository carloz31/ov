import assert from 'node:assert/strict'
import test from 'node:test'
import { cadenas, contenidos, marcas } from '../../soporte/negrita-ayudas.mjs'

// Ajuste recorte-bloque0: «**» solo donde conDichos lo convierte (texto de un diálogo, incluidas reacciones y pistas, o
// de un bloque parrafo, destacado, comparacion o pasos), en pares cerrados y sin anidarse con un dicho “…”.
const BLOQUES = new Set(['parrafo', 'destacado'])
const en = (datos, ruta) => ruta.reduce((v, k) => v?.[k], datos)

function admitido(datos, ruta) {
  const n = ruta.length
  if (ruta[n - 1] !== 'texto') return false
  const padre = en(datos, ruta.slice(0, -1))
  if (padre?.tipo === 'dialogo') return true
  if (BLOQUES.has(padre?.tipo) && ruta[n - 3] === 'bloques') return true
  // Un lado de una comparacion (bloques.i.izquierda.texto) o un paso (bloques.i.pasos.j.texto).
  if (['izquierda', 'derecha'].includes(ruta[n - 2]) && en(datos, ruta.slice(0, n - 2))?.tipo === 'comparacion')
    return ruta[n - 4] === 'bloques'
  if (ruta[n - 3] === 'pasos' && en(datos, ruta.slice(0, n - 3))?.tipo === 'pasos') return ruta[n - 5] === 'bloques'
  return false
}

test('«**» solo aparece en textos que conDichos convierte, en pares y sin anidarse con un dicho', () => {
  for (const { archivo, datos } of contenidos())
    for (const { ruta, texto } of cadenas(datos)) {
      if (!texto.includes('**')) continue
      const donde = `${archivo} ${ruta.join('.')}`
      assert.ok(admitido(datos, ruta), `${donde}: «**» fuera de un texto que se convierte`)
      assert.equal(marcas(texto) % 2, 0, `${donde}: «**» sin cerrar`)
      for (const dicho of texto.match(/“[^”]*”?/g) ?? [])
        assert.ok(!dicho.includes('**'), `${donde}: negrita dentro de un dicho`)
      texto.split('**').forEach((parte, i) => {
        if (i % 2) assert.ok(!/[“”]/.test(parte), `${donde}: negrita que envuelve un dicho`)
      })
    }
})

test('los «O*NET» sueltos de las fuentes siguen pasando: se cuentan pares de «**», no asteriscos', () => {
  const sueltos = contenidos().flatMap(({ archivo, datos }) =>
    cadenas(datos)
      .filter(({ texto }) => /(^|[^*])\*([^*]|$)/.test(texto))
      .map(() => archivo),
  )
  assert.ok(sueltos.includes('b2_5.json') && sueltos.includes('b3_2.json'), sueltos.join(', '))
})
