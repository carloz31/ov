import type { ItemRegistroCuenta, OpcionElegida } from '@/types/servidor'
import { codigoOtra } from '@/lib/servidor/adaptadoresRegistro'
import { ChoiceReveal } from './ChoiceReveal'
import { RegistroBloqueEleccion } from './RegistroBloqueEleccion'
import { alternar, conTextoOtra } from '../../lib/eleccionGuiada'
import { indicadorEleccion } from '../../lib/presentacionItem'
import { ETIQUETA_OTRA } from '../../lib/textosRegistro'

// Bloque de elección de un ítem de registro (F01; ajuste front de registros, lote 1): las opciones que el servidor
// ofrece a la cuenta como chips, con su origen si son piezas; las exclusivas aparte, y una «Otra» con su campo si el
// ítem la permite (`OTRA` con una opción, `OTRA-1` con varias). Sin reacción del personaje.
export function RegistroEleccionNode({
  item,
  pregunta,
  seleccion,
  error,
  errorOtra,
  onCambiar,
}: {
  item: ItemRegistroCuenta
  pregunta?: string | null
  seleccion: OpcionElegida[]
  error?: string
  errorOtra?: string
  onCambiar: (seleccion: OpcionElegida[]) => void
}) {
  const eleccion = item.eleccion!
  const exclusivas = item.opciones.filter((o) => o.exclusiva).map((o) => o.codigo)
  const reglas = { maxima: eleccion.maxima, exclusivas }
  const opciones = [
    ...item.opciones,
    ...(eleccion.permite_otra ? [{ codigo: codigoOtra(item), texto: eleccion.etiqueta_otra ?? ETIQUETA_OTRA }] : []),
  ]
  return (
    <RegistroBloqueEleccion
      pregunta={pregunta ?? ''}
      indicador={indicadorEleccion(eleccion, seleccion.filter((o) => !exclusivas.includes(o.codigo)).length)}
    >
      <ChoiceReveal
        opciones={opciones}
        seleccion={seleccion}
        reglas={reglas}
        error={error}
        errorOtra={errorOtra}
        onAlternar={(codigo) => onCambiar(alternar(seleccion, codigo, reglas))}
        onTextoOtra={(texto) => onCambiar(conTextoOtra(seleccion, texto))}
      />
    </RegistroBloqueEleccion>
  )
}
