import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { getCharacterVisual } from '@/data/content/characters'
import { LEYENDA_ITEM } from '../../lib/presentacionItem'
import { BOTONES, TU_RESPUESTA, VER_COMPLETA } from '../../lib/textosRegistro'
import '../../styles/registro-guiado.css'

export type EstadoLumi =
  | { tipo: 'esperando' }
  | { tipo: 'repregunta'; texto: string }
  | { tipo: 'desenlace'; texto: string }

// La pantalla de Lumi (ajuste front de registros, lotes 1 y 2): cada respuesta pasa por ella, también la que no lleva
// LLM. Arriba, «Tu respuesta» en un bloque suave: la elección como etiqueta y el texto, recortado a 3 líneas con «ver
// completa» (y, si respondió la repregunta, esa respuesta debajo). Luego Lumi, con su avatar, su nombre y una
// burbuja: tres puntos mientras responde el servidor (sin texto de espera), la repregunta, el mensaje o la frase de
// confirmación. Con repregunta, un campo más bajo que la caja del ítem y, en el pie, «Seguir sin responder» como
// enlace a la izquierda de «Responder». Es idéntica en todos los casos y no tiene «Anterior».
export function PantallaLumi({
  eleccion,
  texto,
  seguimiento,
  estado,
  ocupado,
  error,
  onResponder,
  onSeguir,
  onContinuar,
}: {
  eleccion: string
  texto: string
  seguimiento?: string
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
  const lumi = getCharacterVisual('companero')
  const leyenda = <span className="sx-item-leyenda">{LEYENDA_ITEM}</span>
  return (
    <div className="sx-submission-form sx-guided-form sx-pantalla-lumi">
      <div className="sx-lumi-tu-respuesta">
        <span className="sx-item-rotulo">{TU_RESPUESTA}</span>
        {eleccion && <span className="sx-eco-etiqueta">{eleccion}</span>}
        {texto.trim() && (
          <p className={completa ? '' : 'sx-lumi-recortada'}>
            {texto}
          </p>
        )}
        {texto.trim() && !completa && texto.length > 180 && (
          <button type="button" className="sx-eco-enlace" onClick={() => setCompleta(true)}>
            {VER_COMPLETA}
          </button>
        )}
        {seguimiento?.trim() && <p>{seguimiento}</p>}
      </div>
      <div className="sx-item-personaje" aria-live="polite">
        <span aria-hidden="true" className="sx-item-avatar">
          {lumi.emoji}
        </span>
        <div className="sx-item-dice">
          <span className="sx-item-nombre">{lumi.name}</span>
          {esperando ? (
            <div role="status" className="sx-item-globo sx-followup-waiting">
              <span className="sx-followup-dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
            </div>
          ) : (
            <p className="sx-item-globo">{estado.texto}</p>
          )}
        </div>
      </div>
      {error && (
        <p role="alert" className="sx-submission-error">
          {error}
        </p>
      )}
      {estado.tipo === 'repregunta' ? (
        <form
          className="sx-lumi-repregunta"
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
            <span className="sx-item-volver" />
            <span className="sx-item-acciones">
              <button type="button" className="sx-followup-skip" onClick={onSeguir}>
                {BOTONES.seguirSinResponder}
              </button>
              <button type="submit" className="sx-primary-button" disabled={ocupado || !respuesta.trim()}>
                {BOTONES.responder}
                <ArrowRight size={18} />
              </button>
            </span>
          </div>
          {leyenda}
        </form>
      ) : (
        <>
          <div className="sx-player-actions sx-step-footer sx-item-pie">
            <span className="sx-item-volver" />
            <button type="button" className="sx-primary-button" disabled={esperando || ocupado} onClick={onContinuar}>
              {BOTONES.continuar}
              <ArrowRight size={18} />
            </button>
          </div>
          {leyenda}
        </>
      )}
    </div>
  )
}
