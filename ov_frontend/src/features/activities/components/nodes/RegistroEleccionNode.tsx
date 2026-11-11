import type { ItemRegistroCuenta, OpcionElegida } from '@/types/servidor'
import { ChoiceReveal } from './ChoiceReveal'
import { RegistroBloqueEleccion } from './RegistroBloqueEleccion'
import { SelectorPiezas } from './SelectorPiezas'
import { agregarOtra, alternar, conTextoOtra, siguienteOtra } from '../../lib/eleccionGuiada'
import { esItemPiezas } from '../../lib/formasEco'
import { indicadorEleccion } from '../../lib/presentacionItem'
import { ETIQUETA_OTRA } from '../../lib/textosRegistro'

// Bloque de elección de un ítem de registro (F01; ajuste front de registros, lotes 1 y 2): las opciones que el
// servidor ofrece a la cuenta como chips; las exclusivas aparte, y las «Otra» que el ítem permita, cada una con su
// campo (`OTRA` con una opción; `OTRA-1`… con varias, hasta el máximo). En un ítem de piezas (b4-1, b5-3), las
// piezas van en un selector que abre una ventana; debajo, la «Otra» y la exclusiva. Se marca una sola cosa.
export function RegistroEleccionNode({
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
  const exclusivas = item.opciones.filter((o) => o.exclusiva).map((o) => o.codigo)
  const reglas = { maxima: eleccion.maxima, exclusivas }
  const piezas = esItemPiezas(item)
  const elegidas = seleccion.filter((o) => !exclusivas.includes(o.codigo)).length
  const otra = eleccion.permite_otra
    ? {
        etiqueta: eleccion.etiqueta_otra ?? ETIQUETA_OTRA,
        puedeAgregar:
          !!siguienteOtra(seleccion, eleccion.maxima) && (eleccion.maxima === 1 || elegidas < eleccion.maxima),
        onAgregar: () => onCambiar(agregarOtra(seleccion, reglas)),
        onTexto: (codigo: string, texto: string) => onCambiar(conTextoOtra(seleccion, texto, codigo)),
      }
    : undefined
  return (
    <RegistroBloqueEleccion
      numeral={numeral}
      pregunta={pregunta ?? ''}
      indicador={indicadorEleccion(eleccion, elegidas)}
    >
      {piezas && (
        <SelectorPiezas
          titulo={pregunta ?? ''}
          piezas={item.opciones.filter((o) => o.origen)}
          elegida={seleccion[0]?.codigo}
          onElegir={(codigo) => onCambiar([{ codigo }])}
        />
      )}
      <ChoiceReveal
        opciones={piezas ? item.opciones.filter((o) => !o.origen) : item.opciones}
        seleccion={seleccion}
        reglas={reglas}
        error={error}
        errorOtra={errorOtra}
        onAlternar={(codigo) => onCambiar(alternar(seleccion, codigo, reglas))}
        otra={otra}
      />
    </RegistroBloqueEleccion>
  )
}
