// Ajuste mochila: lo que el modal y la tarjeta de ficha calculan en el front.

// Minutos de lectura: una palabra cada 200 por minuto, como mínimo uno.
export function tiempoLectura(texto: string | undefined) {
  const palabras = (texto ?? '').split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(palabras / 200))
}

// Paleta fija del chip de tema: fondo claro y tinta oscura, con contraste de al menos 4.5:1.
export const paletaTemas = [
  { fondo: '#eceffc', tinta: '#2c3a9a' },
  { fondo: '#e3f3e8', tinta: '#1d6337' },
  { fondo: '#fde7e2', tinta: '#a02f1b' },
  { fondo: '#f9eed4', tinta: '#6e4a00' },
  { fondo: '#f0e6fa', tinta: '#62289a' },
  { fondo: '#ddf1f1', tinta: '#0d5a5a' },
] as const

// El color sale de un hash del nombre del tema: el mismo tema tiene siempre el mismo color.
export function colorTema(tema: string) {
  let hash = 0
  for (const letra of tema) hash = (hash * 31 + letra.charCodeAt(0)) >>> 0
  return paletaTemas[hash % paletaTemas.length]
}
