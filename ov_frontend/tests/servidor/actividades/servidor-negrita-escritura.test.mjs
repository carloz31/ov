import assert from 'node:assert/strict'
import test from 'node:test'
import { cadenas, contenidos, marcas, pintor } from '../../soporte/negrita-ayudas.mjs'

// Ajuste recorte-bloque0: la máquina de escribir corta el texto en cualquier punto; ningún prefijo deja ver un «*».
const ENTIDADES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#x27;': "'", '&#39;': "'" }
const sinEtiquetas = (html) => html.replace(/<[^>]+>/g, '').replace(/&(amp|lt|gt|quot|#x27|#39);/g, (e) => ENTIDADES[e])

const conNegrita = () =>
  contenidos().flatMap(({ archivo, datos }) =>
    cadenas(datos)
      .filter(({ texto }) => texto.includes('**'))
      .map((c) => ({ archivo, ...c })),
  )

test('plataforma/ tiene 18 textos con negrita y 21 pares en total', () => {
  const textos = conNegrita()
  assert.equal(textos.length, 18)
  assert.equal(textos.reduce((n, { texto }) => n + marcas(texto) / 2, 0), 21)
})

test('cada prefijo de un texto con negrita se pinta sin asteriscos y con el mismo texto', () => {
  const pintar = pintor()
  for (const { archivo, ruta, texto } of conNegrita())
    for (let n = 1; n <= texto.length; n++) {
      const prefijo = texto.slice(0, n)
      const html = pintar(prefijo)
      const donde = `${archivo} ${ruta.join('.')} [${n}]`
      assert.ok(!html.includes('*'), donde)
      assert.equal(sinEtiquetas(html), prefijo.replaceAll('*', ''), donde)
    }
})
