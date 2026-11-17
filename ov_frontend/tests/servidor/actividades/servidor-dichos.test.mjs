import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { fixtureApoderado } from '../../soporte/apoderado-ayudas.mjs'

// Pedido del usuario: lo que alguien dice va entre “…” y en cursiva; `conDichos` es el único lugar que lo pinta.
const pintar = (texto) => {
  const { conDichos } = fixtureApoderado().load('src/components/common/ConDichos.tsx')
  return renderToStaticMarkup(React.createElement('p', null, conDichos(texto)))
}

test('los dichos entre “…” van en cursiva; el resto, tal cual', () => {
  assert.equal(pintar('Sin comillas.'), '<p>Sin comillas.</p>')
  assert.equal(
    pintar('Tu mamá dice: “Tienes que ser ingeniera”. Y tú, ¿qué piensas?'),
    '<p>Tu mamá dice: <em>“Tienes que ser ingeniera”</em>. Y tú, ¿qué piensas?</p>',
  )
  assert.equal(pintar('“Uno” y “dos”'), '<p><em>“Uno”</em> y <em>“dos”</em></p>')
  // A medias (máquina de escribir): lo abierto ya va en cursiva.
  assert.equal(pintar('Dijo: “Mañana'), '<p>Dijo: <em>“Mañana</em></p>')
  // Los nombres entre «» no cambian.
  assert.equal(pintar('Abre «Mis planes».'), '<p>Abre «Mis planes».</p>')
})

// Ajuste recorte-bloque0: lo que va entre **…** sale en negrita, sin asteriscos, también a medias.
test('la negrita entre **…** va en <strong>; a medias, sin asteriscos; junto a un dicho', () => {
  assert.equal(pintar('Soy **Lumi**.'), '<p>Soy <strong>Lumi</strong>.</p>')
  assert.equal(pintar('Soy **Lu'), '<p>Soy <strong>Lu</strong></p>')
  assert.equal(pintar('Soy *'), '<p>Soy </p>')
  assert.equal(pintar('Soy **Lumi*'), '<p>Soy <strong>Lumi</strong></p>')
  assert.equal(pintar('**Mara** dice: “Léanla”.'), '<p><strong>Mara</strong> dice: <em>“Léanla”</em>.</p>')
})
