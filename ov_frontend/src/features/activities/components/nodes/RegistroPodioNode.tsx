import { useState } from 'react'
import type { ItemRegistroCuenta, OpcionElegida } from '@/types/servidor'
import { RankingPodium } from './RankingPodium'
import { RegistroBloqueEleccion } from './RegistroBloqueEleccion'
import { puestosDesde, seleccionDe } from '../../lib/podio'
import { indicadorEleccion } from '../../lib/presentacionItem'

const ETIQUETA_PRIMERO = 'Lo más importante'

// Bloque de elección «top N» de un ítem de registro (F01; ajuste front de registros, lote 1): el podio con las
// opciones que ofrece el servidor. Lo marcado va en el orden del podio. Sin reacción del personaje.
export function RegistroPodioNode({
  item,
  pregunta,
  seleccion,
  error,
  onCambiar,
}: {
  item: ItemRegistroCuenta
  pregunta?: string | null
  seleccion: OpcionElegida[]
  error?: string
  // El podio no tiene «Otra»: la firma es la del bloque de chips.
  errorOtra?: string
  onCambiar: (seleccion: OpcionElegida[]) => void
}) {
  const eleccion = item.eleccion!
  // Los puestos vacíos se conservan mientras se arma el podio; hacia afuera va lo marcado, en su orden.
  const [puestos, setPuestos] = useState(() =>
    puestosDesde(
      seleccion.map((o) => o.codigo),
      eleccion.maxima,
    ),
  )
  return (
    <RegistroBloqueEleccion
      pregunta={pregunta ?? ''}
      indicador={indicadorEleccion(eleccion, seleccion.length, true)}
    >
      <RankingPodium
        opciones={item.opciones}
        puestos={puestos}
        etiquetaPrimero={ETIQUETA_PRIMERO}
        error={error}
        onChange={(siguientes) => {
          setPuestos(siguientes)
          onCambiar(seleccionDe(siguientes).map((codigo) => ({ codigo })))
        }}
      />
    </RegistroBloqueEleccion>
  )
}
