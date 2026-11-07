import type { ReactNode } from 'react'

// Bloque de texto de un ítem de registro (ajuste vista del ítem): numeral (solo con dos bloques), la pregunta
// como `label` del campo, el campo con la entrada como placeholder y, si corresponde, la ayuda, un aviso y el
// error del texto. En la consulta, en lugar del campo va la respuesta (`lectura`).
export function RegistroExplicacion({
  numeral,
  pregunta,
  entrada,
  ayuda,
  texto,
  aviso,
  error,
  onTexto,
  disabled,
  etiqueta,
  lectura,
}: {
  numeral?: number
  pregunta?: string
  entrada: string
  ayuda?: string
  texto: string
  aviso?: string
  error?: string
  onTexto: (texto: string) => void
  disabled?: boolean
  // Sin pregunta visible (elección ordenada de `ruta`), el nombre accesible del campo.
  etiqueta?: string
  lectura?: ReactNode
}) {
  const cabeza = pregunta && (
    <span className="sx-item-pregunta">
      {numeral && <span className="sx-item-numeral">{numeral}</span>}
      {pregunta}
    </span>
  )
  return (
    <div className="sx-item-bloque sx-guided-explain">
      {lectura ? (
        <>
          {cabeza}
          {lectura}
        </>
      ) : (
        <label className="sx-submission-label">
          {cabeza}
          {ayuda && <span className="sx-submission-help">{ayuda}</span>}
          <textarea
            className="sx-submission-textarea"
            value={texto}
            disabled={disabled}
            placeholder={entrada}
            aria-label={pregunta ? undefined : etiqueta}
            onChange={(event) => onTexto(event.target.value)}
          />
        </label>
      )}
      {aviso && (
        <p role="status" className="sx-guided-warning">
          {aviso}
        </p>
      )}
      {error && (
        <p role="alert" className="sx-submission-error">
          {error}
        </p>
      )}
    </div>
  )
}
