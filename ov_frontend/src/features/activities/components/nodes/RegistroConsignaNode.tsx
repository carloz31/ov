import { useState } from 'react'
import { Check } from 'lucide-react'
import type { NodoConsigna } from '@/types/activities'
import type { ItemRegistroPublico, OpcionElegida } from '@/types/servidor'
import { CharacterAvatar } from '@/components/student/CharacterAvatar'
import { RegistroOpciones } from './RegistroOpciones'
import { PasoAnterior } from '../PasoAnterior'

// Consigna de un registro del servidor (F01): mismo formulario que SubmissionNode, con la elección del ítem.
export function RegistroConsignaNode({
  node,
  item,
  inicial,
  ultimo,
  ocupado,
  error,
  onGuardar,
  onAnterior,
}: {
  node: NodoConsigna
  item: ItemRegistroPublico
  inicial: { texto: string; opciones: OpcionElegida[] }
  ultimo: boolean
  ocupado: boolean
  error: string
  onGuardar: (texto: string, opciones: OpcionElegida[]) => void
  // Vuelve a la consigna anterior guardando lo escrito como borrador, sin validar.
  onAnterior?: (texto: string, opciones: OpcionElegida[]) => void
}) {
  const [text, setText] = useState(inicial.texto)
  const [selection, setSelection] = useState(inicial.opciones)
  const [aviso, setAviso] = useState('')
  const eleccion = item.eleccion
  function submit() {
    const mensaje = validar(item, text, selection)
    setAviso(mensaje)
    if (!mensaje)
      onGuardar(
        text.trim(),
        selection.map((o) => (o.codigo === 'OTRA' ? { ...o, texto: o.texto?.trim() } : o)),
      )
  }
  const premisa = <span className="sx-submission-premise">{item.consigna}</span>
  const campo = (
    <textarea
      className="sx-submission-textarea"
      value={text}
      placeholder={node.placeholder}
      aria-label={eleccion ? item.nombre : undefined}
      onChange={(event) => setText(event.target.value)}
    />
  )
  return (
    <form
      className="sx-submission-form"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      {node.hablanteId && <CharacterAvatar id={node.hablanteId} size="sm" />}
      <p className="sx-submission-visibility">Visible para ti y tu orientadora. Se guarda en tu cuenta.</p>
      {eleccion ? (
        <>
          <p className="sx-submission-label">
            {premisa}
            {node.ayuda && <span className="sx-submission-help">{node.ayuda}</span>}
          </p>
          <RegistroOpciones
            nodo={node.id}
            eleccion={eleccion}
            selection={selection}
            onChange={setSelection}
          />
          {campo}
        </>
      ) : (
        <label className="sx-submission-label">
          {premisa}
          {node.ayuda && <span className="sx-submission-help">{node.ayuda}</span>}
          {campo}
        </label>
      )}
      {(aviso || error) && (
        <p role="alert" className="sx-submission-error">
          {aviso || error}
        </p>
      )}
      <div className="sx-player-actions">
        {onAnterior && <PasoAnterior disabled={ocupado} onClick={() => onAnterior(text, selection)} />}
        <button type="submit" className="sx-primary-button" disabled={ocupado}>
          {ocupado ? 'Guardando…' : ultimo ? 'Entregar' : 'Guardar y continuar'}
          <Check size={18} />
        </button>
      </div>
    </form>
  )
}

function validar(item: ItemRegistroPublico, texto: string, seleccion: OpcionElegida[]) {
  if (item.obligatorio && !texto.trim()) return 'Escribe al menos 1 caracteres.'
  const eleccion = item.eleccion
  if (!eleccion || (!item.obligatorio && !seleccion.length)) return ''
  if (seleccion.length < eleccion.minima)
    return eleccion.minima === eleccion.maxima
      ? `Elige ${eleccion.minima} ${eleccion.minima === 1 ? 'opción' : 'opciones'}.`
      : `Elige al menos ${eleccion.minima} ${eleccion.minima === 1 ? 'opción' : 'opciones'}.`
  if (seleccion.some((o) => o.codigo === 'OTRA' && !o.texto?.trim())) return 'Escribe cuál es tu otra opción.'
  return ''
}
