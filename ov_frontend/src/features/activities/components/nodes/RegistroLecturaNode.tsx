import { PenLine, RotateCw } from 'lucide-react'
import type { ItemRegistroCuenta } from '@/types/servidor'
import { avisoDe, textoEco } from '@/lib/servidor/adaptadoresRegistro'
import { RegistroGuiado } from './RegistroGuiado'
import {
  AVISO_ECO_CAMBIADO,
  AVISO_SIN_EVALUAR,
  BOTONES,
  ROTULO_PISTA_LECTURA,
} from '../../lib/textosRegistro'

// Un ítem con respuesta vigente, en lectura (ajuste front de registros, lote 1): igual al retroceder en una
// actividad a medias que al volver a una completada. Nada se puede mover: la elección va como texto, la primera
// respuesta y, debajo, la línea del seguimiento; «Modificar» junto a la respuesta. Un solo aviso: sin evaluar (con
// «Volver a enviar»), eco cambiado o la pista. Abajo solo se navega.
export function RegistroLecturaNode({
  item,
  hablanteId,
  ocupado,
  error,
  onModificar,
  onReenviar,
  onContinuar,
  onAnterior,
}: {
  item: ItemRegistroCuenta
  hablanteId?: string
  ocupado: boolean
  error: string
  onModificar: () => void
  onReenviar: () => void
  onContinuar: () => void
  onAnterior?: () => void
}) {
  const respuesta = item.respuesta!
  const aviso = avisoDe(respuesta)
  const consigna = item.consigna
  return (
    <RegistroGuiado
      hablanteId={hablanteId}
      dialogo={consigna?.dialogo}
      ocupado={ocupado}
      error={error}
      onEnviar={onContinuar}
      onAnterior={onAnterior}
      etiqueta={BOTONES.continuar}
    >
      {item.ecos.length > 0 && (
        <ul className="sx-item-ecos">
          {item.ecos.map((eco, i) => (
            <li key={`${eco.codigo ?? ''}-${i}`}>{textoEco(eco)}</li>
          ))}
        </ul>
      )}
      <div className="sx-item-bloque sx-registro-lectura">
        {respuesta.opciones_elegidas.length > 0 && (
          <>
            {consigna?.pregunta_eleccion && <span className="sx-item-pregunta">{consigna.pregunta_eleccion}</span>}
            <p className="sx-item-eleccion-leida">{respuesta.opciones_elegidas.map((o) => o.texto).join(' · ')}</p>
          </>
        )}
        {consigna && <span className="sx-item-pregunta">{consigna.pregunta_texto}</span>}
        <div className="sx-item-respuesta">
          {respuesta.primera_respuesta.trim() && (
            <blockquote className="sx-followup-original">{respuesta.primera_respuesta}</blockquote>
          )}
          {respuesta.linea_seguimiento && (
            <p className="sx-item-linea-seguimiento">{respuesta.linea_seguimiento}</p>
          )}
          <button type="button" className="sx-secondary-button" disabled={ocupado} onClick={onModificar}>
            <PenLine size={16} aria-hidden="true" />
            {BOTONES.modificar}
          </button>
        </div>
      </div>
      {aviso?.tipo === 'reenviable' && (
        <div className="sx-item-aviso" role="status">
          <p>{AVISO_SIN_EVALUAR}</p>
          <button type="button" className="sx-secondary-button" disabled={ocupado} onClick={onReenviar}>
            <RotateCw size={16} aria-hidden="true" />
            {BOTONES.volverAEnviar}
          </button>
        </div>
      )}
      {aviso?.tipo === 'eco_cambiado' && (
        <div className="sx-item-aviso" role="status">
          <p>{AVISO_ECO_CAMBIADO}</p>
        </div>
      )}
      {aviso?.tipo === 'pista' && (
        <div className="sx-item-pista">
          <span className="sx-item-pista-rotulo">{ROTULO_PISTA_LECTURA}</span>
          <p>{aviso.texto}</p>
        </div>
      )}
    </RegistroGuiado>
  )
}
