import type { BloqueContenido } from '@/types/activities'
import { Check } from 'lucide-react'
import '../styles/parent-activities.css'

export function ParentContent({ blocks, summary = false }: { blocks: BloqueContenido[]; summary?: boolean }) {
  return (
    <div className="parent-reading">
      {blocks.map((block, index) => {
        switch (block.tipo) {
          case 'parrafo':
            return <p key={index}>{block.texto}</p>
          case 'lista': {
            const List = block.ordenada ? 'ol' : 'ul'
            return (
              <section key={index}>
                {block.titulo && <h3>{block.titulo}</h3>}
                <List className={summary ? 'parent-summary-list' : undefined}>
                  {block.items.map((text, i) => (
                    <li key={i}>
                      {summary && (
                        <span aria-hidden>
                          <Check size={18} />
                        </span>
                      )}
                      <span>{text}</span>
                    </li>
                  ))}
                </List>
              </section>
            )
          }
          case 'destacado':
            return (
              <aside key={index} className={`parent-highlight ${block.variante}`}>
                {block.texto}
              </aside>
            )
          case 'comparacion':
            return (
              <div key={index} className="grid gap-4 sm:grid-cols-2">
                {[block.izquierda, block.derecha].map((side, i) => (
                  <section className="rounded-xl border p-4" key={i}>
                    <h3>{side.titulo}</h3>
                    <p>{side.texto}</p>
                  </section>
                ))}
              </div>
            )
          case 'pasos':
            return (
              <section key={index}>
                {block.titulo && <h3>{block.titulo}</h3>}
                <ol className="parent-steps">
                  {block.pasos.map((step, i) => (
                    <li key={i}>
                      <span>{i + 1}</span>
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
            return <blockquote key={index}>{block.texto}</blockquote>
          case 'fuente':
            return (
              <p className="text-xs text-muted-foreground" key={index}>
                {block.url && /^https?:\/\//.test(block.url) ? (
                  <a href={block.url} target="_blank" rel="noreferrer">
                    {block.texto}
                  </a>
                ) : (
                  block.texto
                )}
              </p>
            )
          case 'tabla':
            return (
              <section key={index}>
                {block.titulo && <h3>{block.titulo}</h3>}
                <div className="parent-table-scroll">
                  <table>
                    <thead>
                      <tr>
                        {block.columnas.map((column, i) => (
                          <th scope="col" key={i}>
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {block.filas.map((row, i) => (
                        <tr key={i}>
                          {row.map((cell, col) => (
                            <td key={col} data-label={block.columnas[col]}>
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {block.nota && <p className="text-xs text-muted-foreground">{block.nota}</p>}
              </section>
            )
        }
      })}
    </div>
  )
}
