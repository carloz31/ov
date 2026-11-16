import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { importarAislado, jsonServidor } from '../../soporte/servidor-ayudas.mjs'
import { fixtureApoderado } from '../../soporte/apoderado-ayudas.mjs'

// Ajuste partida-llegada-liviano (bocetos 19 a 22): marcadores en texto en lugar de chips, la frase del conteo y la
// tarjeta del Resumen, con los fixtures de los casos 5 (solo partida) y 7 (con llegada).
const fx = (nombre) => jsonServidor(`contenido/contenido-panel-${nombre}`)
const html = (Component, props) =>
  renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(Component, props)))
const texto = (marcado) => marcado.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
const app = () => fixtureApoderado({ cuenta: 'ori-carmen', ruta: '/counselor/students' })

test('MarcaTexto: cada clase con su palabra, su marcador oculto al lector y su estilo', () => {
  const { MarcaTexto } = app().load('src/features/counselor/components/perfil/MarcaTexto.tsx')
  const casos = {
    BAJO: ['↓', 'Bajó', 'font-bold text-warning-text'],
    SIGUE_BAJA: ['•', 'Sigue baja', 'font-medium text-warning-text'],
    SIGUE_POR_TRABAJAR: ['•', 'Sigue por trabajar', 'font-medium text-warning-text'],
    SUBIO: ['↑', 'Subió', 'font-semibold text-success-text'],
    MEJORO: ['↑', 'Mejoró', 'font-semibold text-success-text'],
    IGUAL: ['=', 'Igual', 'text-muted-foreground'],
    POR_TRABAJAR: ['•', 'Por trabajar', 'font-medium text-warning-text'],
  }
  for (const [clase, [marcador, palabra, estilo]] of Object.entries(casos)) {
    const marcado = html(MarcaTexto, { clase })
    assert.match(marcado, new RegExp(`<span aria-hidden="true">${marcador}</span><span>${palabra}</span>`), clase)
    assert.ok(marcado.includes(estilo), clase)
    assert.doesNotMatch(marcado, /bg-/, clase)
  }
  const baja = html(MarcaTexto, { clase: 'BAJA', children: 'Bastante de acuerdo' })
  assert.match(baja, /<span aria-hidden="true">•<\/span><span>Bastante de acuerdo<\/span>/)
})

test('la frase del conteo: un grupo, uno de cada uno, ceros omitidos, singular y plural, en los dos estados', async () => {
  const a = await importarAislado('src/lib/servidor/adaptadoresPanelEstudiante.ts')
  const frase = (conteo) => a.fraseConteo(conteo).map((p) => p.texto).join('')
  const tonos = (conteo) => a.fraseConteo(conteo).filter((p) => p.tono).map((p) => p.tono)
  const con = [
    { codigo: 'BAJO', cantidad: 1 },
    { codigo: 'SIGUE_POR_TRABAJAR', cantidad: 1 },
    { codigo: 'SUBIO', cantidad: 3 },
  ]
  assert.equal(frase(con), '1 dimensión bajó, 1 sigue por trabajar y 3 subieron.')
  assert.deepEqual(tonos(con), ['aviso', 'aviso', 'exito'])
  assert.equal(
    frase([
      { codigo: 'BAJO', cantidad: 1 },
      { codigo: 'SUBIO', cantidad: 4 },
    ]),
    '1 dimensión bajó y 4 subieron.',
  )
  assert.equal(frase([{ codigo: 'SUBIO', cantidad: 5 }]), 'Las 5 dimensiones subieron.')
  assert.equal(
    frase([
      { codigo: 'BAJO', cantidad: 2 },
      { codigo: 'IGUAL', cantidad: 1 },
    ]),
    '2 dimensiones bajaron y 1 sigue igual.',
  )
  const solo = [
    { codigo: 'POR_TRABAJAR', cantidad: 2 },
    { codigo: 'EN_CAMINO', cantidad: 2 },
    { codigo: 'FUERTE', cantidad: 1 },
  ]
  assert.equal(frase(solo), '2 dimensiones por trabajar, 2 en camino y 1 fuerte.')
  assert.deepEqual(tonos(solo), ['aviso'])
  assert.equal(frase([{ codigo: 'EN_CAMINO', cantidad: 5 }]), 'Las 5 dimensiones están en camino.')
  assert.equal(frase([{ codigo: 'FUERTE', cantidad: 1 }]), '1 dimensión fuerte.')
  assert.deepEqual(a.fraseConteo([]), [])
})

test('la tarjeta del Resumen sin chips, con el título del grupo en el color del cambio o de la zona', () => {
  const { TarjetasResumen } = app().load('src/features/counselor/components/perfil/TarjetasResumen.tsx')
  const sinChips = (marcado) => {
    const inicio = marcado.indexOf('Cómo empezó') >= 0 ? marcado.indexOf('Cómo empezó') : marcado.indexOf('De la partida')
    return marcado.slice(inicio)
  }
  const llegada = sinChips(html(TarjetasResumen, { datos: fx('7-perfil'), onIr() {} }))
  assert.match(texto(llegada), /De la partida a la llegada .*Bajó/)
  assert.match(texto(llegada), /\w+ : (Fuerte|En camino|Por trabajar) → (Fuerte|En camino|Por trabajar)/)
  assert.doesNotMatch(llegada, /rounded-md px-2 py-0\.5/)
  assert.match(llegada, /text-warning-text">Bajó</)
  const partida = sinChips(html(TarjetasResumen, { datos: fx('5-perfil'), onIr() {} }))
  assert.match(texto(partida), /Cómo empezó/)
  assert.doesNotMatch(partida, /rounded-md px-2 py-0\.5/)
  assert.doesNotMatch(partida, /text-success-text">Fuerte</) // con solo partida, ámbar solo en Por trabajar
})

test('la etiqueta del instrumento va en texto gris, sin fondo', () => {
  const { BloquePanel } = app().load('src/features/counselor/components/panel/PanelComun.tsx')
  const marcado = html(BloquePanel, { titulo: 'Punto de partida', etiqueta: 'Requisito del salón', children: null })
  assert.match(marcado, /<span class="text-sm font-medium text-muted-foreground">Requisito del salón<\/span>/)
})
