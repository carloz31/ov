import type { ReactNode } from 'react'

// Markdown de lectura sin HTML crudo: subtítulos (`##`, `###`), tablas, listas, citas, **negrita** y
// [enlaces](https://…) (ajuste mochila: el contenido de las fichas llega así del servidor).
export function ResourceText({ text }: { text: string }) {
  return (
    <div className="journey-reading">
      {text.split('\n\n').map((part, i) => {
        if (part.startsWith('### ')) return <h3 key={i}>{enLinea(part.slice(4))}</h3>
        if (part.startsWith('## ')) return <h3 key={i}>{part.slice(3)}</h3>
        if (part.startsWith('|')) {
          const rows = part.split('\n').filter((row) => !row.includes('|---'))
          return (
            <div key={i} className="journey-resource-table">
              <table>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={index}>
                      {row
                        .split('|')
                        .slice(1, -1)
                        .map((cell, col) =>
                          index === 0 ? <th key={col}>{cell.trim()}</th> : <td key={col}>{cell.trim()}</td>,
                        )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
        const lineas = part.split('\n')
        if (lineas.every((linea) => /^[-*] /.test(linea)))
          return <ul key={i}>{lineas.map((linea, n) => <li key={n}>{enLinea(linea.slice(2))}</li>)}</ul>
        if (lineas.every((linea) => /^\d+\. /.test(linea)))
          return <ol key={i}>{lineas.map((linea, n) => <li key={n}>{enLinea(linea.replace(/^\d+\. /, ''))}</li>)}</ol>
        if (lineas.every((linea) => linea.startsWith('>')))
          return <blockquote key={i}>{enLinea(lineas.map((linea) => linea.replace(/^> ?/, '')).join('\n'))}</blockquote>
        return (
          <p key={i} className="whitespace-pre-line">
            {enLinea(part)}
          </p>
        )
      })}
    </div>
  )
}

// Negrita y enlaces dentro de un bloque. Solo se enlaza a https.
function enLinea(texto: string): ReactNode[] {
  return texto.split(/(\*\*.*?\*\*|\[[^\]]+\]\([^)\s]+\))/g).map((fragmento, index) => {
    const negrita = /^\*\*(.*)\*\*$/.exec(fragmento)
    if (negrita) return <strong key={index}>{negrita[1]}</strong>
    const enlace = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(fragmento)
    if (enlace && enlace[2].startsWith('https://'))
      return (
        <a key={index} href={enlace[2]} target="_blank" rel="noopener noreferrer">
          {enlace[1]}
        </a>
      )
    return enlace ? enlace[1] : fragmento
  })
}
