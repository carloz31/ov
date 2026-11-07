import { useState, type ReactNode } from 'react'
import type { NodoConsigna } from '@/types/activities'
import type { ItemRegistroPublico, OpcionElegida } from '@/types/servidor'
import { errorConsulta, pieConsulta, type ConsultaRegistro } from '../../lib/edicionRegistro'
import { RegistroEco } from './RegistroEco'
import { RespuestaConsulta } from './RespuestaConsulta'
import { RankingPodium } from './RankingPodium'
import { RegistroGuiado } from './RegistroGuiado'
import { RegistroExplicacion } from './RegistroExplicacion'
import { completo, faltan, mensajeLumi, preguntaPrimero, puestosDesde, seleccionDe } from '../../lib/podio'
import { errorTexto } from '../../lib/eleccionGuiada'
import { RegistroBloqueEleccion } from './RegistroBloqueEleccion'
import { RegistroPersonaje } from './RegistroPersonaje'
import {
  entradaVigente,
  indicadorEleccion,
  numerales,
  preguntaDeEleccion,
  enOrden,
} from '../../lib/presentacionItem'

const PODIO_POR_DEFECTO = {
  etiquetaPrimero: 'Lo más importante',
  pregunta: '¿Por qué «{opcion}» es lo más importante para ti?',
  unidad: { singular: 'opción', plural: 'opciones' },
}

// Consigna de un registro con elección «top N» (F01): podio + explicación del primer lugar.
// Guarda lo mismo que la elección ordenada: las opciones en orden y el texto.
export function RegistroPodioNode({
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
}) {
  const eleccion = item.eleccion!
  const config = { ...PODIO_POR_DEFECTO, ...node.podio }
  const [puestos, setPuestos] = useState(() =>
    puestosDesde(
      inicial.opciones.map((o) => o.codigo),
      eleccion.maxima,
    ),
  )
  const [text, setText] = useState(inicial.texto)
  // Primer lugar cuando se escribió por última vez: si cambia después, se avisa sin borrar el texto.
  const [primeroAlEscribir, setPrimeroAlEscribir] = useState<string | null | undefined>(
    inicial.opciones[0]?.codigo,
  )
  const [errores, setErrores] = useState<{ podio?: string; texto?: string }>({})
  const primero = puestos[0]
  const textoDelPrimero = eleccion.opciones.find((o) => o.codigo === primero)?.texto ?? ''
  // En la consulta (F02) se empieza leyendo; «Modificar» abre el podio y la explicación de siempre.
  const [modificando, setModificando] = useState(!consulta || consulta.cambiado)
  const lectura = !!consulta && !modificando
  const elegidas = seleccionDe(puestos).map((codigo) => ({ codigo }))
  const numero = numerales(node, true)
  const pie = consulta && pieConsulta(consulta, ultimo, modificando, text, elegidas)
  function submit() {
    if (lectura) return onGuardar(text, elegidas)
    const pendientes = faltan(puestos)
    const siguientes = {
      podio: pendientes
        ? `Completa tu podio: te ${pendientes === 1 ? `falta 1 ${config.unidad.singular}` : `faltan ${pendientes} ${config.unidad.plural}`}.`
        : undefined,
      // Ajuste vista del ítem: el campo se ve siempre y se valida junto con el podio.
      texto: errorTexto(item, text) || (consulta && errorConsulta(consulta, text, elegidas)) || undefined,
    }
    setErrores(siguientes)
    if (!siguientes.podio && !siguientes.texto) onGuardar(text.trim(), elegidas)
  }
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
      onAnterior={onAnterior && (() => onAnterior(text, elegidas))}
    >
      {consulta && <RegistroEco pista={consulta.pista} hablanteId={node.hablanteId ?? 'companero'} />}
      {enOrden(
        node,
        <RegistroBloqueEleccion
          key="eleccion"
          numeral={numero.eleccion}
          pregunta={preguntaDeEleccion(node, item)}
          indicador={indicadorEleccion(eleccion, elegidas.length, true)}
        >
          <RankingPodium
            opciones={eleccion.opciones}
            puestos={puestos}
            etiquetaPrimero={config.etiquetaPrimero}
            error={errores.podio}
            soloLectura={lectura}
            onChange={(siguientes) => {
              setPuestos(siguientes)
              if (completo(siguientes)) setErrores((e) => ({ ...e, podio: undefined }))
            }}
          />
          {!lectura && (
            <RegistroPersonaje
              hablanteId={node.hablanteId}
              texto={mensajeLumi(puestos, config.unidad)}
              reaccion
            />
          )}
        </RegistroBloqueEleccion>,
        <RegistroExplicacion
          key="texto"
          numeral={numero.texto}
          pregunta={node.preguntaTexto ?? preguntaPrimero(config.pregunta, textoDelPrimero || '…')}
          entrada={entradaVigente(node)}
          texto={text}
          aviso={
            !!text.trim() && primero && primeroAlEscribir && primero !== primeroAlEscribir
              ? `Cambiaste tu primer ${node.podio?.unidad ? node.podio.unidad.singular : 'lugar'}. Revisa si tu explicación sigue encajando.`
              : undefined
          }
          error={errores.texto}
          onTexto={(texto) => {
            setText(texto)
            setPrimeroAlEscribir(primero)
          }}
          lectura={lectura && <RespuestaConsulta texto={text} onModificar={() => setModificando(true)} />}
        />,
      )}
    </RegistroGuiado>
  )
}
