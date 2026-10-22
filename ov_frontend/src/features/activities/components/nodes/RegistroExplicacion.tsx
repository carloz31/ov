// Bloque de explicación que se revela en los registros guiados (podio y elección): la pregunta, el
// campo y, si corresponde, un aviso y el error del texto.
export function RegistroExplicacion({
  pregunta,
  texto,
  aviso,
  error,
  onTexto,
}: {
  pregunta: string
  texto: string
  aviso?: string
  error?: string
  onTexto: (texto: string) => void
}) {
  return (
    <div className="sx-guided-explain">
      <label className="sx-submission-label">
        <span className="sx-submission-premise">{pregunta}</span>
        <textarea
          className="sx-submission-textarea"
          value={texto}
          placeholder="Escribe con tus palabras, no hay respuestas incorrectas"
          onChange={(event) => onTexto(event.target.value)}
        />
      </label>
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
