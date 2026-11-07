import { useState, type ReactNode } from 'react'
import type { NodoConsigna } from '@/types/activities'
import type { ItemRegistroPublico, OpcionElegida } from '@/types/servidor'
import {
  errorConsulta,
  pieConsulta,
  type ConsultaRegistro,
  type EcoRegistro,
} from '../../lib/edicionRegistro'
import {
  cierraSinSeguimiento,
  conGuardadas,
  exclusivasPropias,
  preguntasPropias,
} from '@/lib/servidor/adaptadoresRegistro'
import { RegistroEco } from './RegistroEco'
import { RespuestaConsulta } from './RespuestaConsulta'
import { ChoiceReveal } from './ChoiceReveal'
import { RegistroGuiado } from './RegistroGuiado'
import { RegistroExplicacion } from './RegistroExplicacion'
import { RegistroBloqueEleccion } from './RegistroBloqueEleccion'
import { RegistroPersonaje } from './RegistroPersonaje'
import {
  alternar,
  conTextoOtra,
  errorTexto,
  mensajeEleccion,
  preguntaEleccion,
} from '../../lib/eleccionGuiada'
import {
  entradaVigente,
  indicadorEleccion,
  numerales,
  preguntaDeEleccion,
  preguntaSinSeguimiento,
  enOrden,
} from '../../lib/presentacionItem'

const ELECCION_POR_DEFECTO = {
  mensajes: { inicio: 'Elige la opción que más se acerque a lo que piensas.', una: 'Cuéntame un poco más.' },
  pregunta: '¿Por qué elegiste {opciones}?',
  errorSeleccion: 'Elige una opción para continuar.',
  errorOtra: 'Escribe cuál es tu otra opción.',
}

// Consigna de un registro con elección guiada sin orden (F01; ajuste vista del ítem): bloque de elección (chips
// y reacción del personaje) y bloque de texto, en el orden del nodo. Guarda las opciones elegidas (con el texto
// de «Otra») y el texto.
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
  premarcadas = [],
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
  // F02: lo elegido la vez pasada, cuando el ítem retoma una elección.
  anteriores?: OpcionElegida[]
  // Lo que llegó marcado al abrir (la vez pasada o el premarcado): mientras no cambie, el personaje lo saluda.
  premarcadas?: OpcionElegida[]
  // Ajuste registros: lo que esta consigna retoma de otra actividad.
  eco?: EcoRegistro
}) {
  const eleccion = item.eleccion!
  // Ajuste registros: las exclusivas y las preguntas propias de las opciones del servidor se suman a las del contenido.
  const config = {
    ...ELECCION_POR_DEFECTO,
    ...node.eleccion,
    // Ajuste vista del ítem: con `preguntaTexto`, esa es la pregunta del campo salvo la propia de una opción.
    pregunta: node.preguntaTexto ?? node.eleccion?.pregunta ?? ELECCION_POR_DEFECTO.pregunta,
    preguntas: { ...preguntasPropias(item), ...node.eleccion?.preguntas },
  }
  const mensajes = { ...ELECCION_POR_DEFECTO.mensajes, ...node.eleccion?.mensajes }
  const reglas = {
    maxima: eleccion.maxima,
    exclusivas: [...new Set([...(config.exclusivas ?? []), ...exclusivasPropias(item)])],
  }
  // Una opción guardada que la referencia ya no ofrece se ve con su texto y «ya no está en tu lista».
  const opciones = conGuardadas(
    [...eleccion.opciones, ...(eleccion.permite_otra ? [{ codigo: 'OTRA', texto: 'Otra' }] : [])],
    inicial.opciones,
  )
  const [seleccion, setSeleccion] = useState(inicial.opciones)
  const [text, setText] = useState(inicial.texto)
  const [bloqueada, setBloqueada] = useState(false)
  const [errores, setErrores] = useState<{ seleccion?: string; otra?: string; texto?: string }>({})
  const otra = seleccion.find((o) => o.codigo === 'OTRA')
  const codigosAnteriores = anteriores.map((o) => o.codigo)
  // En la consulta (F02) se empieza leyendo; «Modificar» abre los chips y el campo de siempre.
  const [modificando, setModificando] = useState(!consulta || consulta.cambiado)
  const lectura = !!consulta && !modificando
  const pie = consulta && pieConsulta(consulta, ultimo, modificando, text, seleccion)
  const sinSeguimiento = cierraSinSeguimiento(item, seleccion)
  const numero = numerales(node, true)
  function submit() {
    if (lectura) return onGuardar(text, seleccion)
    const siguientes = {
      seleccion: seleccion.length < Math.max(1, eleccion.minima) ? config.errorSeleccion : undefined,
      otra: otra && !otra.texto?.trim() ? config.errorOtra : undefined,
      // Ningún ítem se guarda vacío; una opción que cierra el ítem sin seguimiento deja el texto opcional.
      texto: sinSeguimiento
        ? undefined
        : errorTexto(item, text) || (consulta && errorConsulta(consulta, text, seleccion)) || undefined,
    }
    setErrores(siguientes)
    if (!siguientes.seleccion && !siguientes.otra && !siguientes.texto)
      onGuardar(
        text.trim(),
        seleccion.map((o) => (o.codigo === 'OTRA' ? { codigo: 'OTRA', texto: o.texto?.trim() } : o)),
      )
  }
  const preguntaTexto =
    preguntaSinSeguimiento(item, seleccion) ??
    preguntaEleccion(config, seleccion, opciones, reglas.exclusivas, codigosAnteriores)
  const reaccion = mensajeEleccion(
    mensajes,
    seleccion,
    reglas,
    bloqueada,
    premarcadas.map((o) => o.codigo),
  )
  return (
    <RegistroGuiado
      hablanteId={node.hablanteId}
      dialogo={node.dialogo}
      ultimo={ultimo}
      ocupado={ocupado}
      error={error}
      onEnviar={submit}
      etiqueta={pie?.etiqueta}
      salida={pie?.salir ? salida : undefined}
      onAnterior={onAnterior && (() => onAnterior(text, seleccion))}
    >
      {(consulta || eco) && (
        <RegistroEco
          eco={eco}
          pista={consulta?.pista}
          abierto={consulta?.abierto}
          hablanteId={node.hablanteId ?? 'companero'}
        />
      )}
      {enOrden(
        node,
        <RegistroBloqueEleccion
          key="eleccion"
          numeral={numero.eleccion}
          pregunta={preguntaDeEleccion(node, item)}
          indicador={indicadorEleccion(
            eleccion,
            seleccion.filter((o) => !reglas.exclusivas.includes(o.codigo)).length,
          )}
        >
          <ChoiceReveal
            opciones={opciones}
            seleccion={seleccion}
            reglas={reglas}
            error={errores.seleccion}
            errorOtra={errores.otra}
            soloLectura={lectura}
            anteriores={codigosAnteriores}
            etiquetaAnterior={config.etiquetaAnterior}
            reaccion={
              !lectura && <RegistroPersonaje hablanteId={node.hablanteId} texto={reaccion} reaccion />
            }
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
        </RegistroBloqueEleccion>,
        <RegistroExplicacion
          key="texto"
          numeral={numero.texto}
          pregunta={preguntaTexto}
          entrada={entradaVigente(node, seleccion, !!node.preguntaTexto && preguntaTexto !== node.preguntaTexto)}
          texto={text}
          error={errores.texto}
          onTexto={setText}
          lectura={lectura && <RespuestaConsulta texto={text} onModificar={() => setModificando(true)} />}
        />,
      )}
    </RegistroGuiado>
  )
}
