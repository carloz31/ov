import assert from 'node:assert/strict'
import test from 'node:test'
import React, { Fragment } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { cadenas, contenidos, pintor } from '../../soporte/negrita-ayudas.mjs'

// Ajuste recorte-bloque0: la negrita no cambia ningún texto sin «**». Referencia: la lógica de conDichos de main
// (1d74dd8), copiada tal cual.
function conDichosMain(texto) {
  if (!texto.includes('“')) return texto
  return texto
    .split(/(“[^”]*”?)/g)
    .filter(Boolean)
    .map((parte, i) =>
      parte.startsWith('“')
        ? React.createElement('em', { key: i }, parte)
        : React.createElement(Fragment, { key: i }, parte),
    )
}
const pintarMain = (texto) => renderToStaticMarkup(React.createElement('p', null, conDichosMain(texto)))

test('todo texto de plataforma/ sin «**» sale con el mismo marcado que en main', () => {
  const pintar = pintor()
  const archivos = contenidos()
  assert.ok(archivos.length >= 80, `solo ${archivos.length} archivos`)
  let revisados = 0
  for (const { archivo, datos } of archivos)
    for (const { ruta, texto } of cadenas(datos)) {
      if (texto.includes('**')) continue
      assert.equal(pintar(texto), pintarMain(texto), `${archivo} ${ruta.join('.')}`)
      revisados++
    }
  assert.ok(revisados > 1000, `solo ${revisados} textos`)
})

test('un asterisco suelto en medio («O*NET») no cambia nada', () => {
  const pintar = pintor()
  for (const texto of ['Fuente: O*NET Interest Profiler', 'O*NET “dice” algo', 'O*NET'])
    assert.equal(pintar(texto), pintarMain(texto), texto)
  assert.equal(pintar('Fuente: O*NET Interest Profiler'), '<p>Fuente: O*NET Interest Profiler</p>')
})
