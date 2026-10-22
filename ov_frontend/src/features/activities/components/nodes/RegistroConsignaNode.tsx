import { useState, type ReactNode } from 'react'
import { Check } from 'lucide-react'
import type { NodoConsigna } from '@/types/activities'
import type { ItemRegistroPublico, OpcionElegida } from '@/types/servidor'
import {
  errorConsulta,
  pieConsulta,
  type ConsultaRegistro,
  type EcoRegistro,
} from '../../lib/edicionRegistro'
import { RegistroOpciones } from './RegistroOpciones'
import { RegistroEco } from './RegistroEco'
import { RespuestaConsulta } from './RespuestaConsulta'
import { PasoAnterior } from '../PasoAnterior'
import '../../styles/registro-guiado.css'

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
  consulta,
  salida,
  eco,
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
  // Consulta de un registro entregado (F02) y la salida de la pantalla de fin para su última consigna.
  consulta?: ConsultaRegistro
  salida?: ReactNode
  // Lo que esta consigna retoma de otra actividad (F02); sin dato, no llega.
  eco?: EcoRegistro
}) {
  const [text, setText] = useState(inicial.texto)
  const [selection, setSelection] = useState(inicial.opciones)
  const [aviso, setAviso] = useState('')
  // En la consulta (F02) se empieza leyendo; «Modificar» abre el formulario de siempre.
  const [modificando, setModificando] = useState(!consulta || consulta.cambiado)
  const lectura = !!consulta && !modificando
  const eleccion = item.eleccion
  const pie = consulta && pieConsulta(consulta, ultimo, modificando, text, selection)
  function submit() {
    const mensaje = lectura
      ? ''
      : validar(item, text, selection) || (consulta ? errorConsulta(consulta, text, selection) : '')
    setAviso(mensaje)
    if (!mensaje)
      onGuardar(
        text.trim(),
        selection.map((o) => (o.codigo === 'OTRA' ? { ...o, texto: o.texto?.trim() } : o)),
      )
  }
  // Como en los registros guiados, el rótulo de visibilidad va bajo la pregunta.
  const premisa = (
    <>
      <span className="sx-submission-premise">{item.consigna}</span>
      <span className="sx-submission-visibility">
        Visible para ti y tu orientadora. Se guarda en tu cuenta.
      </span>
    </>
  )
  const campo = lectura ? (
    <RespuestaConsulta
      texto={text}
      onModificar={consulta?.editable ? () => setModificando(true) : undefined}
    />
  ) : (
    <textarea
      className="sx-submission-textarea"
      value={text}
      disabled={consulta && !consulta.editable}
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
      <RegistroEco eco={eco} pista={consulta?.pista} hablanteId={node.hablanteId} />
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
            soloLectura={lectura}
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
      <div className="sx-player-actions sx-step-footer">
        {onAnterior && <PasoAnterior disabled={ocupado} onClick={() => onAnterior(text, selection)} />}
        {pie?.salir ? (
          salida
        ) : (
          <button type="submit" className="sx-primary-button" disabled={ocupado}>
            {ocupado ? 'Guardando…' : (pie?.etiqueta ?? (ultimo ? 'Entregar' : 'Guardar y continuar'))}
            <Check size={18} />
          </button>
        )}
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
