import { ExternalLink } from 'lucide-react'
import type { BloqueContenido } from '@/types/activities'
export function ContentBlocks({ blocks }: { blocks: BloqueContenido[] }) {
  return (
    <div className="sx-content-reading">
      {blocks.map((block, i) => {
        switch (block.tipo) {
          case 'parrafo':
            return <p key={i}>{block.texto}</p>
          case 'lista': {
            const List = block.ordenada ? 'ol' : 'ul'
            return (
              <section key={i}>
                {block.titulo && <h3>{block.titulo}</h3>}
                <List>
                  {block.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </List>
              </section>
            )
          }
          case 'destacado':
            return (
              <aside key={i} className={`sx-content-highlight ${block.variante}`}>
                {block.texto}
              </aside>
            )
          case 'comparacion':
            return (
              <div key={i} className="sx-content-comparison">
                {[block.izquierda, block.derecha].map((side) => (
                  <section key={side.titulo}>
                    <h3>{side.titulo}</h3>
                    <p>{side.texto}</p>
                  </section>
                ))}
              </div>
            )
          case 'pasos':
            return (
              <section key={i}>
                {block.titulo && <h3>{block.titulo}</h3>}
                <ol className="sx-content-method">
                  {block.pasos.map((step, index) => (
                    <li key={index}>
                      <span>{index + 1}</span>
                      <div>
                        <h3>{step.titulo}</h3>
                        <p>{step.texto}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            )
          case 'reflexion':
            return <blockquote key={i}>{block.texto}</blockquote>
          case 'tabla':
            return (
              <section key={i}>
                {block.titulo && <h3>{block.titulo}</h3>}
                <div className="sx-content-table">
                  <table>
                    <thead>
                      <tr>
                        {block.columnas.map((column, col) => (
                          <th scope="col" key={col}>
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {block.filas.map((row, index) => (
                        <tr key={index}>
                          {row.map((cell, col) => (
                            <td data-label={block.columnas[col]} key={col}>
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {block.nota && <p className="text-sm">{block.nota}</p>}
              </section>
            )
          case 'fuente':
            return (
              <p key={i} className="sx-content-source">
                {block.url && /^https?:\/\//.test(block.url) ? (
                  <a href={block.url} target="_blank" rel="noreferrer">
                    {block.texto} <ExternalLink size={12} />
                  </a>
                ) : (
                  block.texto
                )}
              </p>
            )
        }
      })}
    </div>
  )
}
