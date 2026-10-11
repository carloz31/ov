import { ParentContent } from '@/features/parent/components/ParentContent'
import { ParentInlineText } from '@/features/parent/components/ParentInlineText'

export function ParentResourceText({ text }: { text: string }) {
  return (
    <div className="parent-reading">
      {text.split('\n\n').map((part, index) => {
        if (part.startsWith('## ')) return <h3 key={index}>{part.slice(3)}</h3>
        if (part.startsWith('|')) {
          const rows = part
            .split('\n')
            .filter((row) => !/^\|[\s:|-]+\|$/.test(row))
            .map((row) =>
              row
                .split('|')
                .slice(1, -1)
                .map((cell) => cell.trim()),
            )
          return (
            <ParentContent
              key={index}
              blocks={[{ tipo: 'tabla', columnas: rows[0], filas: rows.slice(1) }]}
            />
          )
        }
        const lines = part.split('\n')
        if (lines.every((line) => /^\d+\. /.test(line)))
          return (
            <ol key={index}>
              {lines.map((line, i) => (
                <li key={i}><ParentInlineText text={line.replace(/^\d+\. /, '')} /></li>
              ))}
            </ol>
          )
        return (
          <p className="whitespace-pre-line" key={index}>
            {<ParentInlineText text={part} />}
          </p>
        )
      })}
    </div>
  )
}
