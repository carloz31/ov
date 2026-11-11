import type { ItemRegistroCuenta } from '@/types/servidor'
import { avisoDe } from '@/lib/servidor/adaptadoresRegistro'
import { RegistroGuiado } from './RegistroGuiado'
import { EcosItem } from './EcosItem'
import { PistaLumi } from './PistaLumi'
import { ElegidoLectura } from './ElegidoLectura'
import {
  AVISO_ECO_CAMBIADO,
  AVISO_SIN_EVALUAR,
  BOTONES,
  ROTULO_PISTA_LECTURA,
  TU_RESPUESTA,
} from '../../lib/textosRegistro'

// Un ítem con respuesta vigente, en lectura (ajuste front de registros, lotes 1 y 2): igual al retroceder en una
// actividad a medias que al volver a una completada. Los ecos, la burbuja del personaje, la cabecera «Tu respuesta»
// con «Modificar», lo elegido (sin nada que mover: fichas sin acción, el podio con lo escrito en sus «Otra», o la
// pieza con su origen), la pregunta de texto con un solo bloque (la primera respuesta y, debajo, la línea del
// seguimiento) y un solo aviso: sin evaluar (con «Volver a enviar»), eco cambiado o la pista. Abajo solo se navega.
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
  const elegidas = respuesta.opciones_elegidas
  const numerar = elegidas.length > 0 && !!consigna?.pregunta_texto
  const pregunta = (numeral: number, texto: string) => (
    <span className="sx-item-pregunta">
      {numerar && <span className="sx-item-numeral">{numeral}</span>}
      {texto}
    </span>
  )
  return (
    <RegistroGuiado
      hablanteId={hablanteId}
      dialogo={consigna?.dialogo}
      ocupado={ocupado}
      error={error}
      ecos={<EcosItem ecos={item.ecos} />}
      onEnviar={onContinuar}
      onAnterior={onAnterior}
      etiqueta={BOTONES.continuar}
    >
      <div className="sx-item-cabecera-respuesta">
        <span className="sx-item-rotulo">{TU_RESPUESTA}</span>
        <button type="button" className="sx-secondary-button sx-boton-pequeno" disabled={ocupado} onClick={onModificar}>
          {BOTONES.modificar}
        </button>
      </div>
      {elegidas.length > 0 && (
        <div className="sx-item-bloque sx-registro-lectura">
          {consigna?.pregunta_eleccion && pregunta(1, consigna.pregunta_eleccion)}
          <ElegidoLectura item={item} />
        </div>
      )}
      <div className="sx-item-bloque sx-registro-lectura">
        {consigna && pregunta(2, consigna.pregunta_texto)}
        <div className="sx-item-respuesta">
          {respuesta.primera_respuesta.trim() && <p>{respuesta.primera_respuesta}</p>}
          {respuesta.linea_seguimiento && <p className="sx-item-linea-seguimiento">{respuesta.linea_seguimiento}</p>}
        </div>
      </div>
      {aviso?.tipo === 'reenviable' && (
        <div className="sx-item-aviso" role="status">
          <p>{AVISO_SIN_EVALUAR}</p>
          <button type="button" className="sx-secondary-button sx-boton-pequeno" disabled={ocupado} onClick={onReenviar}>
            {BOTONES.volverAEnviar}
          </button>
        </div>
      )}
      {aviso?.tipo === 'eco_cambiado' && (
        <div className="sx-item-aviso" role="status">
          <p>{AVISO_ECO_CAMBIADO}</p>
        </div>
      )}
      {aviso?.tipo === 'pista' && <PistaLumi rotulo={ROTULO_PISTA_LECTURA} texto={aviso.texto} />}
    </RegistroGuiado>
  )
}
