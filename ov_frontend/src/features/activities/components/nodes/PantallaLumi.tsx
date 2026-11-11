import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { InlineDialogue } from '../InlineDialogue'
import { LEYENDA_ITEM } from '../../lib/presentacionItem'
import { BOTONES, TU_RESPUESTA, VER_COMPLETA } from '../../lib/textosRegistro'
import '../../styles/registro-guiado.css'

export type EstadoLumi =
  | { tipo: 'esperando' }
  | { tipo: 'repregunta'; texto: string }
  | { tipo: 'desenlace'; texto: string }

// La pantalla de Lumi (ajuste front de registros, lote 1): cada respuesta pasa por ella, también la que no lleva
// LLM. Arriba, «Tu respuesta» (la elección y el texto, recortado a 3 líneas con «ver completa»); debajo, Lumi: tres
// puntos mientras responde el servidor (sin texto de espera), la repregunta con su campo corto o lo que dice al
// final. Es idéntica en todos los casos y no tiene «Anterior».
export function PantallaLumi({
  eleccion,
  texto,
  estado,
  ocupado,
  error,
  onResponder,
  onSeguir,
  onContinuar,
}: {
  eleccion: string
  texto: string
  estado: EstadoLumi
  ocupado: boolean
  error: string
  onResponder: (texto: string) => void
  onSeguir: () => void
  onContinuar: () => void
}) {
  const [completa, setCompleta] = useState(false)
  const [respuesta, setRespuesta] = useState('')
  const esperando = estado.tipo === 'esperando'
  return (
    <div className="sx-submission-form sx-guided-form sx-pantalla-lumi">
      <div className="sx-item-bloque sx-lumi-tu-respuesta">
        <span className="sx-item-pregunta">{TU_RESPUESTA}</span>
        {eleccion && <p className="sx-item-eleccion-leida">{eleccion}</p>}
        {texto.trim() && (
          <>
            <blockquote className={`sx-followup-original ${completa ? '' : 'sx-lumi-recortada'}`}>{texto}</blockquote>
            {!completa && (
              <button type="button" className="sx-followup-skip" onClick={() => setCompleta(true)}>
                {VER_COMPLETA}
              </button>
            )}
          </>
        )}
      </div>
      <div aria-live="polite">
        {esperando ? (
          <div role="status" className="sx-followup-waiting">
            <span className="sx-followup-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          </div>
        ) : (
          <InlineDialogue speakerId="companero" text={estado.texto} light />
        )}
      </div>
      {error && (
        <p role="alert" className="sx-submission-error">
          {error}
        </p>
      )}
      {estado.tipo === 'repregunta' ? (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            if (respuesta.trim()) onResponder(respuesta.trim())
          }}
        >
          <label className="sr-only" htmlFor="sx-lumi-repregunta">
            {estado.texto}
          </label>
          <textarea
            id="sx-lumi-repregunta"
            className="sx-submission-textarea sx-followup-input"
            value={respuesta}
            onChange={(event) => setRespuesta(event.target.value)}
          />
          <div className="sx-player-actions sx-step-footer sx-item-pie">
            <span className="sx-item-leyenda">{LEYENDA_ITEM}</span>
            <div className="sx-item-acciones">
              <button type="button" className="sx-followup-skip" onClick={onSeguir}>
                {BOTONES.seguirSinResponder}
              </button>
              <button type="submit" className="sx-primary-button" disabled={ocupado || !respuesta.trim()}>
                {BOTONES.responder}
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="sx-player-actions sx-step-footer sx-item-pie">
          <span className="sx-item-leyenda">{LEYENDA_ITEM}</span>
          <div className="sx-item-acciones">
            <button type="button" className="sx-primary-button" disabled={esperando || ocupado} onClick={onContinuar}>
              {BOTONES.continuar}
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
