import { useState, type ReactNode } from 'react'
import type { NodoConsigna } from '@/types/activities'
import type { ItemRegistroPublico, OpcionElegida } from '@/types/servidor'
import { pieConsulta, type ConsultaRegistro } from '../../lib/edicionRegistro'
import { RankingPodium } from './RankingPodium'
import { RegistroGuiado } from './RegistroGuiado'
import { RegistroExplicacion } from './RegistroExplicacion'
import { completo, faltan, mensajeLumi, preguntaPrimero, puestosDesde, seleccionDe } from '../../lib/podio'
import { errorTexto } from '../../lib/eleccionGuiada'

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
  const [primeroAlEscribir, setPrimeroAlEscribir] = useState(inicial.opciones[0]?.codigo)
  const [errores, setErrores] = useState<{ podio?: string; texto?: string }>({})
  const primero = puestos[0]
  const textoPrimero = eleccion.opciones.find((o) => o.codigo === primero)?.texto ?? ''
  const pie = consulta && pieConsulta(consulta, ultimo, text)
  function submit() {
    const pendientes = faltan(puestos)
    const siguientes = {
      podio: pendientes
        ? `Completa tu podio: te ${pendientes === 1 ? `falta 1 ${config.unidad.singular}` : `faltan ${pendientes} ${config.unidad.plural}`}.`
        : undefined,
      texto: pendientes ? undefined : errorTexto(item, text),
    }
    setErrores(siguientes)
    if (!siguientes.podio && !siguientes.texto)
      onGuardar(
        text.trim(),
        seleccionDe(puestos).map((codigo) => ({ codigo })),
      )
  }
  return (
    <RegistroGuiado
      hablanteId={node.hablanteId}
      mensaje={mensajeLumi(puestos, config.unidad)}
      consigna={item.consigna}
      ultimo={ultimo}
      ocupado={ocupado}
      error={error}
      onEnviar={submit}
      pista={consulta?.pista}
      etiqueta={pie?.etiqueta}
      salida={pie?.salir ? salida : undefined}
      onAnterior={
        onAnterior &&
        (() =>
          onAnterior(
            text,
            seleccionDe(puestos).map((codigo) => ({ codigo })),
          ))
      }
    >
      <RankingPodium
        opciones={eleccion.opciones}
        puestos={puestos}
        etiquetaPrimero={config.etiquetaPrimero}
        iconos={config.iconos}
        error={errores.podio}
        soloLectura={!!consulta}
        onChange={(siguientes) => {
          setPuestos(siguientes)
          if (completo(siguientes)) setErrores((e) => ({ ...e, podio: undefined }))
        }}
      />
      {completo(puestos) && primero && (
        <RegistroExplicacion
          pregunta={preguntaPrimero(config.pregunta, textoPrimero)}
          texto={text}
          aviso={
            !!text.trim() && primero !== primeroAlEscribir
              ? `Cambiaste tu primer ${node.podio?.unidad ? node.podio.unidad.singular : 'lugar'}. Revisa si tu explicación sigue encajando.`
              : undefined
          }
          error={errores.texto}
          disabled={consulta && !consulta.editable}
          onTexto={(texto) => {
            setText(texto)
            setPrimeroAlEscribir(primero)
          }}
        />
      )}
    </RegistroGuiado>
  )
}
