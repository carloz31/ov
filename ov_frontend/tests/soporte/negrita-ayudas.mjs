import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { fixtureApoderado } from './apoderado-ayudas.mjs'

// Ajuste recorte-bloque0: ayudantes de las pruebas de negrita (conDichos y el contenido de plataforma/).
export const CARPETA = 'src/data/activities/contenidos/plataforma'

export const contenidos = () =>
  readdirSync(CARPETA)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((archivo) => ({ archivo, datos: JSON.parse(readFileSync(path.join(CARPETA, archivo), 'utf8')) }))

// Todas las cadenas de un valor, con la ruta de claves que lleva a cada una.
export function cadenas(valor, ruta = []) {
  if (typeof valor === 'string') return [{ ruta, texto: valor }]
  if (Array.isArray(valor)) return valor.flatMap((v, i) => cadenas(v, [...ruta, i]))
  if (valor && typeof valor === 'object') return Object.entries(valor).flatMap(([k, v]) => cadenas(v, [...ruta, k]))
  return []
}

export const pintor = () => {
  const { conDichos } = fixtureApoderado().load('src/components/common/ConDichos.tsx')
  return (texto) => renderToStaticMarkup(React.createElement('p', null, conDichos(texto)))
}

// Cuántas marcas «**» trae un texto (no cuenta asteriscos sueltos).
export const marcas = (texto) => texto.split('**').length - 1
