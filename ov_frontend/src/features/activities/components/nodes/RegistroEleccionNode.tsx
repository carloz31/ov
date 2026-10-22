import { useState, type ReactNode } from 'react'
import type { NodoConsigna } from '@/types/activities'
import type { ItemRegistroPublico, OpcionElegida } from '@/types/servidor'
import { pieConsulta, type ConsultaRegistro } from '../../lib/edicionRegistro'
import { ChoiceReveal } from './ChoiceReveal'
import { RegistroGuiado } from './RegistroGuiado'
import { RegistroExplicacion } from './RegistroExplicacion'
import {
  alternar,
  conTextoOtra,
  errorTexto,
  mensajeEleccion,
  preguntaEleccion,
} from '../../lib/eleccionGuiada'

const ELECCION_POR_DEFECTO = {
  mensajes: { inicio: 'Elige la opción que más se acerque a lo que piensas.', una: 'Cuéntame un poco más.' },
  pregunta: '¿Por qué elegiste {opciones}?',
  errorSeleccion: 'Elige una opción para continuar.',
  errorOtra: 'Escribe cuál es tu otra opción.',
}

// Consigna de un registro con elección guiada sin orden (F01): tarjetas + explicación revelada.
// Guarda lo mismo que antes: las opciones elegidas (con el texto de «Otra») y el texto.
export function RegistroEleccionNode({
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
  anteriores = [],
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
  // F02: lo elegido la vez pasada, cuando el ítem retoma una elección.
  anteriores?: OpcionElegida[]
}) {
  const eleccion = item.eleccion!
  const config = { ...ELECCION_POR_DEFECTO, ...node.eleccion }
  const mensajes = { ...ELECCION_POR_DEFECTO.mensajes, ...node.eleccion?.mensajes }
  const reglas = { maxima: eleccion.maxima, exclusivas: config.exclusivas ?? [] }
  const opciones = [
    ...eleccion.opciones,
    ...(eleccion.permite_otra ? [{ codigo: 'OTRA', texto: 'Otra' }] : []),
  ]
  const [seleccion, setSeleccion] = useState(inicial.opciones)
  const [text, setText] = useState(inicial.texto)
  const [bloqueada, setBloqueada] = useState(false)
  const [errores, setErrores] = useState<{ seleccion?: string; otra?: string; texto?: string }>({})
  const otra = seleccion.find((o) => o.codigo === 'OTRA')
  const codigosAnteriores = anteriores.map((o) => o.codigo)
  const pie = consulta && pieConsulta(consulta, ultimo, text)
  function submit() {
    const siguientes = {
      seleccion: seleccion.length < Math.max(1, eleccion.minima) ? config.errorSeleccion : undefined,
      otra: otra && !otra.texto?.trim() ? config.errorOtra : undefined,
      texto: seleccion.length ? errorTexto(item, text) : undefined,
    }
    setErrores(siguientes)
    if (!siguientes.seleccion && !siguientes.otra && !siguientes.texto)
      onGuardar(
        text.trim(),
        seleccion.map((o) => (o.codigo === 'OTRA' ? { codigo: 'OTRA', texto: o.texto?.trim() } : o)),
      )
  }
  return (
    <RegistroGuiado
      hablanteId={node.hablanteId}
      mensaje={mensajeEleccion(mensajes, seleccion, reglas, bloqueada, codigosAnteriores)}
      consigna={item.consigna}
      ultimo={ultimo}
      ocupado={ocupado}
      error={error}
      onEnviar={submit}
      pista={consulta?.pista}
      etiqueta={pie?.etiqueta}
      salida={pie?.salir ? salida : undefined}
      onAnterior={onAnterior && (() => onAnterior(text, seleccion))}
    >
      <ChoiceReveal
        opciones={opciones}
        seleccion={seleccion}
        reglas={reglas}
        etiquetaElegida={config.etiquetaElegida}
        iconos={config.iconos}
        error={errores.seleccion}
        errorOtra={errores.otra}
        soloLectura={!!consulta}
        anteriores={codigosAnteriores}
        etiquetaAnterior={config.etiquetaAnterior}
        onAlternar={(codigo) => {
          const resultado = alternar(seleccion, codigo, reglas)
          setSeleccion(resultado.seleccion)
          setBloqueada(resultado.bloqueada)
          if (resultado.seleccion.length) setErrores((e) => ({ ...e, seleccion: undefined }))
        }}
        onTextoOtra={(texto) => {
          setSeleccion(conTextoOtra(seleccion, texto))
          setBloqueada(false)
        }}
      />
      {seleccion.length > 0 && (
        <RegistroExplicacion
          pregunta={preguntaEleccion(config, seleccion, opciones, reglas.exclusivas, codigosAnteriores)}
          texto={text}
          error={errores.texto}
          disabled={consulta && !consulta.editable}
          onTexto={setText}
        />
      )}
    </RegistroGuiado>
  )
}
