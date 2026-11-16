import { Fragment, type ReactNode } from 'react'

// Lo que alguien dice va entre comillas “…” y en cursiva, para distinguirlo del resto del texto (pedido del usuario).
// El contenido solo lleva las comillas: esta es la única función que las convierte en cursiva. Acepta un texto a medias
// (el efecto de máquina de escribir corta antes de la comilla de cierre) y deja en cursiva lo que va abierto. Un texto
// sin comillas sale tal cual, con el mismo marcado de antes. Es una función y no un componente para que el texto quede
// en el árbol tal como lo leen las pruebas de render.
export function conDichos(texto: string): ReactNode {
  if (!texto.includes('“')) return texto
  return texto
    .split(/(“[^”]*”?)/g)
    .filter(Boolean)
    .map((parte, i) => (parte.startsWith('“') ? <em key={i}>{parte}</em> : <Fragment key={i}>{parte}</Fragment>))
}
