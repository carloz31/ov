import { useState } from 'react'
import type { ItemRegistroCuenta, OpcionElegida } from '@/types/servidor'
import {
  consignaVigente,
  errorSeleccion,
  requiereTexto,
  textoEco,
  type ErrorSeleccion,
} from '@/lib/servidor/adaptadoresRegistro'
import { RegistroGuiado } from './RegistroGuiado'
import { RegistroEleccionNode } from './RegistroEleccionNode'
import { RegistroPodioNode } from './RegistroPodioNode'
import { RegistroExplicacion } from './RegistroExplicacion'
import { esTopN } from '../../lib/podio'
import { ENTRADA_POR_DEFECTO } from '../../lib/presentacionItem'
import { ERROR_ELECCION, ERROR_OTRA, ROTULO_EDICION, ROTULO_PISTA_EDICION } from '../../lib/textosRegistro'

export type BorradorItem = { opciones: OpcionElegida[]; texto: string }

// Un ítem de registro por responder o en edición (ajuste front de registros, lote 1): el personaje del nodo con el
// diálogo, los ecos como texto simple, la elección (podio o chips) y la caja de texto con la pregunta y el arranque
// que tocan (los de la opción marcada, si los trae). En edición, el rótulo arriba y la pista sobre la caja. Lo
// escrito vive en el hook (`borrador`): «Anterior» y cambiar de opción lo conservan.
export function RegistroItemNode({
  item,
  hablanteId,
  borrador,
  onBorrador,
  edicion,
  ocupado,
  error,
  onEnviar,
  onAnterior,
  onCancelar,
}: {
  item: ItemRegistroCuenta
  hablanteId?: string
  borrador: BorradorItem
  onBorrador: (borrador: BorradorItem) => void
  // En edición: la pista del intento vigente, si quedó.
  edicion?: { pista: string | null }
  ocupado: boolean
  error: string
  onEnviar: () => void
  onAnterior?: () => void
  onCancelar?: () => void
}) {
  const [errorEleccion, setErrorEleccion] = useState<ErrorSeleccion>()
  const consigna = consignaVigente(item, borrador.opciones)
  const conTexto = requiereTexto(item, borrador.opciones)
  const Eleccion = esTopN(item) ? RegistroPodioNode : RegistroEleccionNode
  function cambiarOpciones(opciones: OpcionElegida[]) {
    onBorrador({ ...borrador, opciones })
    if (errorEleccion && !errorSeleccion(item, opciones)) setErrorEleccion(undefined)
  }
  function enviar() {
    const siguiente = errorSeleccion(item, borrador.opciones)
    setErrorEleccion(siguiente)
    if (!siguiente) onEnviar()
  }
  return (
    <RegistroGuiado
      hablanteId={hablanteId}
      dialogo={consigna.dialogo}
      ocupado={ocupado}
      error={error}
      onEnviar={enviar}
      deshabilitado={conTexto && !borrador.texto.trim()}
      onAnterior={edicion ? undefined : onAnterior}
      onCancelar={edicion ? onCancelar : undefined}
    >
      {edicion && <p className="sx-item-rotulo">{ROTULO_EDICION}</p>}
      {item.ecos.length > 0 && (
        <ul className="sx-item-ecos">
          {item.ecos.map((eco, i) => (
            <li key={`${eco.codigo ?? ''}-${i}`}>{textoEco(eco)}</li>
          ))}
        </ul>
      )}
      {item.eleccion && (
        <Eleccion
          item={item}
          pregunta={consigna.preguntaEleccion}
          seleccion={borrador.opciones}
          error={errorEleccion === 'eleccion' ? ERROR_ELECCION : undefined}
          errorOtra={errorEleccion === 'otra' ? ERROR_OTRA : undefined}
          onCambiar={cambiarOpciones}
        />
      )}
      {edicion?.pista && (
        <div className="sx-item-pista">
          <span className="sx-item-pista-rotulo">{ROTULO_PISTA_EDICION}</span>
          <p>{edicion.pista}</p>
        </div>
      )}
      <RegistroExplicacion
        pregunta={consigna.preguntaTexto}
        entrada={consigna.arranque ?? ENTRADA_POR_DEFECTO}
        texto={borrador.texto}
        onTexto={(texto) => onBorrador({ ...borrador, texto })}
      />
    </RegistroGuiado>
  )
}
