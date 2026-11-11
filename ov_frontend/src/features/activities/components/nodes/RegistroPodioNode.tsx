import { useState } from 'react'
import type { ItemRegistroCuenta, OpcionElegida } from '@/types/servidor'
import { esOtra } from '@/lib/servidor/adaptadoresRegistro'
import { RankingPodium } from './RankingPodium'
import { RegistroBloqueEleccion } from './RegistroBloqueEleccion'
import { codigosOtra } from '../../lib/eleccionGuiada'
import { puestosDesde, seleccionDe, type Puestos } from '../../lib/podio'
import { indicadorEleccion } from '../../lib/presentacionItem'
import { ELECCION, ETIQUETA_OTRA } from '../../lib/textosRegistro'

const ETIQUETA_PRIMERO = 'Lo más importante'

// Bloque de elección «top N» de un ítem de registro (F01; ajuste front de registros, lotes 1 y 2): el podio con las
// opciones que ofrece el servidor. Lo marcado va en el orden del podio. Lote 2: con «Otra» (b2-4-bien), cada «Otra»
// (`OTRA-1`…`OTRA-3`) ocupa el siguiente puesto libre y su campo va debajo del podio, etiquetado con su puesto; al
// intercambiar, la etiqueta sigue al puesto, y al devolver la ficha su texto se borra.
export function RegistroPodioNode({
  item,
  numeral,
  pregunta,
  seleccion,
  error,
  errorOtra,
  onCambiar,
}: {
  item: ItemRegistroCuenta
  numeral?: number
  pregunta?: string | null
  seleccion: OpcionElegida[]
  error?: string
  errorOtra?: string
  onCambiar: (seleccion: OpcionElegida[]) => void
}) {
  const eleccion = item.eleccion!
  const etiquetaOtra = eleccion.etiqueta_otra ?? ETIQUETA_OTRA
  // Los puestos vacíos se conservan mientras se arma el podio; hacia afuera va lo marcado, en su orden.
  const [puestos, setPuestos] = useState(() =>
    puestosDesde(
      seleccion.map((o) => o.codigo),
      eleccion.maxima,
    ),
  )
  const textoDe = (codigo: string) => seleccion.find((o) => o.codigo === codigo)?.texto ?? ''
  const opciones = [
    ...item.opciones,
    ...seleccionDe(puestos)
      .filter(esOtra)
      .map((codigo) => ({ codigo, texto: etiquetaOtra })),
  ]
  // Lo enviado lleva el orden del podio y el texto de cada «Otra» que sigue colocada.
  const marcadas = (siguientes: Puestos) =>
    seleccionDe(siguientes).map((codigo) => (esOtra(codigo) ? { codigo, texto: textoDe(codigo) } : { codigo }))
  return (
    <RegistroBloqueEleccion
      numeral={numeral}
      pregunta={pregunta ?? ''}
      indicador={indicadorEleccion(eleccion, seleccion.length, true)}
    >
      <RankingPodium
        opciones={opciones}
        puestos={puestos}
        etiquetaPrimero={ETIQUETA_PRIMERO}
        error={error}
        onChange={(siguientes) => {
          setPuestos(siguientes)
          onCambiar(marcadas(siguientes))
        }}
        otra={
          eleccion.permite_otra
            ? {
                etiqueta: etiquetaOtra,
                codigo: () => codigosOtra(eleccion.maxima).find((c) => !puestos.includes(c)),
              }
            : undefined
        }
        bajoPodio={puestos.map((codigo, i) =>
          codigo && esOtra(codigo) ? (
            <label key={codigo} className="sx-choice-other">
              <span className="sx-podium-cual">{ELECCION.cualPuesto(i + 1)}</span>
              <input
                className="sx-submission-textarea"
                value={textoDe(codigo)}
                placeholder={ELECCION.cual}
                onChange={(event) =>
                  onCambiar(
                    marcadas(puestos).map((o) => (o.codigo === codigo ? { codigo, texto: event.target.value } : o)),
                  )
                }
              />
            </label>
          ) : null,
        )}
      />
      {errorOtra && (
        <span role="alert" className="sx-submission-error">
          {errorOtra}
        </span>
      )}
    </RegistroBloqueEleccion>
  )
}
