import { Fragment, type ReactNode } from 'react'

// Lo que alguien dice va entre comillas “…” y en cursiva, para distinguirlo del resto del texto (pedido del usuario), y
// lo que va entre **…** sale en negrita, sin los asteriscos (ajuste recorte-bloque0: personajes, objetos de la historia y
// secciones). El contenido solo lleva las marcas: esta es la única función que las convierte. Acepta un texto a medias
// (el efecto de máquina de escribir corta antes del cierre): lo abierto ya va en cursiva o en negrita, y un `*` suelto
// al final no se ve. Un texto sin `**` sale tal cual, con el mismo marcado de antes. Es una función y no un componente
// para que el texto quede en el árbol tal como lo leen las pruebas de render.
export function conDichos(texto: string): ReactNode {
  const limpio = sinAsteriscoFinal(texto)
  if (!limpio.includes('**')) return dichos(limpio)
  return limpio
    .split('**')
    .map((parte, i) =>
      !parte ? null : i % 2 ? <strong key={i}>{dichos(parte)}</strong> : <Fragment key={i}>{dichos(parte)}</Fragment>,
    )
    .filter(Boolean)
}

function dichos(texto: string): ReactNode {
  if (!texto.includes('“')) return texto
  return texto
    .split(/(“[^”]*”?)/g)
    .filter(Boolean)
    .map((parte, i) => (parte.startsWith('“') ? <em key={i}>{parte}</em> : <Fragment key={i}>{parte}</Fragment>))
}

// Un `*` de un `**` que la máquina de escribir dejó a medias: se quita solo si cierra una corrida impar.
function sinAsteriscoFinal(texto: string): string {
  const corrida = texto.length - texto.replace(/\*+$/, '').length
  return corrida % 2 ? texto.slice(0, -1) : texto
}
