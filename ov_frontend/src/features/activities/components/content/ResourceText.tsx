export function ResourceText({ text }: { text: string }) {
  return (
    <div className="sx-content-reading">
      {text.split('\n\n').map((part, i) => {
        if (part.startsWith('## ')) return <h3 key={i}>{part.slice(3)}</h3>
        if (part.startsWith('|')) {
          const rows = part.split('\n').filter((row) => !row.includes('|---'))
          return (
            <div key={i} className="sx-content-resource-table">
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
        return (
          <p key={i} className="whitespace-pre-line">
            {part
              .split(/\*\*(.*?)\*\*/g)
              .map((fragment, index) => (index % 2 ? <strong key={index}>{fragment}</strong> : fragment))}
          </p>
        )
      })}
    </div>
  )
}
