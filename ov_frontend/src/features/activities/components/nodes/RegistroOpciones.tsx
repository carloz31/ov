import type { EleccionPublica, OpcionElegida } from '@/types/servidor'

// Opciones de la lista, «Otra» si el ítem la permite y, en la elección ordenada, el número de cada elegida.
export function RegistroOpciones({
  nodo,
  eleccion,
  selection,
  onChange,
}: {
  nodo: string
  eleccion: EleccionPublica
  selection: OpcionElegida[]
  onChange: (next: OpcionElegida[]) => void
}) {
  const unica = eleccion.maxima === 1
  const opciones = [
    ...eleccion.opciones,
    ...(eleccion.permite_otra ? [{ codigo: 'OTRA', texto: 'Otra' }] : []),
  ]
  const otra = selection.find((o) => o.codigo === 'OTRA')
  function alternar(codigo: string) {
    const elegida = selection.some((o) => o.codigo === codigo)
    if (unica) onChange(elegida ? [] : [{ codigo }])
    else if (elegida) onChange(selection.filter((o) => o.codigo !== codigo))
    else if (selection.length < eleccion.maxima) onChange([...selection, { codigo }])
  }
  return (
    <fieldset className="sx-submission-options">
      <legend className="sr-only">
        {eleccion.ordenada ? `Elige y ordena ${eleccion.maxima}` : 'Elige tu respuesta'}
      </legend>
      {opciones.map((opcion) => {
        const posicion = selection.findIndex((o) => o.codigo === opcion.codigo)
        return (
          <label className={`sx-submission-option ${posicion >= 0 ? 'is-selected' : ''}`} key={opcion.codigo}>
            <input
              type={unica ? 'radio' : 'checkbox'}
              name={nodo}
              checked={posicion >= 0}
              disabled={!unica && posicion < 0 && selection.length >= eleccion.maxima}
              onChange={() => alternar(opcion.codigo)}
            />
            {eleccion.ordenada && posicion >= 0 && (
              <span className="sx-submission-order" aria-label={`Puesto ${posicion + 1}`}>
                {posicion + 1}
              </span>
            )}
            {opcion.texto}
          </label>
        )
      })}
      {otra && (
        <input
          className="sx-submission-textarea"
          aria-label="¿Cuál?"
          placeholder="¿Cuál?"
          value={otra.texto ?? ''}
          onChange={(event) =>
            onChange(
              selection.map((o) => (o.codigo === 'OTRA' ? { codigo: 'OTRA', texto: event.target.value } : o)),
            )
          }
        />
      )}
    </fieldset>
  )
}
