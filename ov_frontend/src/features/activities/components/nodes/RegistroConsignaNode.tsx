import { useState, type ReactNode } from 'react'
import type { NodoConsigna } from '@/types/activities'
import type { ItemRegistroPublico, OpcionElegida } from '@/types/servidor'
import {
  errorConsulta,
  pieConsulta,
  type ConsultaRegistro,
  type EcoRegistro,
} from '../../lib/edicionRegistro'
import { errorTexto } from '../../lib/eleccionGuiada'
import {
  entradaVigente,
  indicadorEleccion,
  numerales,
  preguntaDeEleccion,
  enOrden,
} from '../../lib/presentacionItem'
import { RegistroOpciones } from './RegistroOpciones'
import { RegistroEco } from './RegistroEco'
import { RespuestaConsulta } from './RespuestaConsulta'
import { RegistroGuiado } from './RegistroGuiado'
import { RegistroBloqueEleccion } from './RegistroBloqueEleccion'
import { RegistroExplicacion } from './RegistroExplicacion'

// Consigna de un registro del servidor (F01; ajuste vista del ítem): el ítem de solo texto y, en `ruta`, la
// elección ordenada que no es podio. Mismo marco que los registros guiados.
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
  const numero = numerales(node, !!eleccion)
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
  return (
    <RegistroGuiado
      hablanteId={node.hablanteId}
      dialogo={node.dialogo}
      ultimo={ultimo}
      ocupado={ocupado}
      error={aviso || error}
      onEnviar={submit}
      etiqueta={pie?.etiqueta}
      salida={pie?.salir ? salida : undefined}
      onAnterior={onAnterior && (() => onAnterior(text, selection))}
    >
      <RegistroEco
        eco={eco}
        pista={consulta?.pista}
        abierto={consulta?.abierto}
        hablanteId={node.hablanteId}
      />
      {enOrden(
        node,
        eleccion && (
          <RegistroBloqueEleccion
            key="eleccion"
            numeral={numero.eleccion}
            pregunta={preguntaDeEleccion(node, item)}
            indicador={indicadorEleccion(eleccion, selection.length, eleccion.ordenada)}
          >
            <RegistroOpciones
              nodo={node.id}
              eleccion={eleccion}
              selection={selection}
              onChange={setSelection}
              soloLectura={lectura}
            />
          </RegistroBloqueEleccion>
        ),
        <RegistroExplicacion
          key="texto"
          numeral={numero.texto}
          pregunta={node.preguntaTexto ?? (eleccion ? undefined : item.consigna)}
          entrada={entradaVigente(node)}
          ayuda={node.ayuda}
          etiqueta={item.nombre}
          texto={text}
          onTexto={setText}
          lectura={lectura && <RespuestaConsulta texto={text} onModificar={() => setModificando(true)} />}
        />,
      )}
    </RegistroGuiado>
  )
}

function validar(item: ItemRegistroPublico, texto: string, seleccion: OpcionElegida[]) {
  const sinTexto = errorTexto(item, texto)
  if (sinTexto) return sinTexto
  const eleccion = item.eleccion
  if (!eleccion || (!item.obligatorio && !seleccion.length)) return ''
  if (seleccion.length < eleccion.minima)
    return eleccion.minima === eleccion.maxima
      ? `Elige ${eleccion.minima} ${eleccion.minima === 1 ? 'opción' : 'opciones'}.`
      : `Elige al menos ${eleccion.minima} ${eleccion.minima === 1 ? 'opción' : 'opciones'}.`
  if (seleccion.some((o) => o.codigo === 'OTRA' && !o.texto?.trim())) return 'Escribe cuál es tu otra opción.'
  return ''
}
