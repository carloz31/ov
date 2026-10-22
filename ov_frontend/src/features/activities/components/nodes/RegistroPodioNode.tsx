import { useState } from 'react'
import { Check } from 'lucide-react'
import type { NodoConsigna } from '@/types/activities'
import type { ItemRegistroPublico, OpcionElegida } from '@/types/servidor'
import { InlineDialogue } from '../InlineDialogue'
import { RankingPodium } from './RankingPodium'
import { completo, faltan, mensajeLumi, preguntaPrimero, puestosDesde, seleccionDe } from '../../lib/podio'

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
}: {
  node: NodoConsigna
  item: ItemRegistroPublico
  inicial: { texto: string; opciones: OpcionElegida[] }
  ultimo: boolean
  ocupado: boolean
  error: string
  onGuardar: (texto: string, opciones: OpcionElegida[]) => void
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
  const lleno = completo(puestos)
  const primero = puestos[0]
  const textoPrimero = eleccion.opciones.find((o) => o.codigo === primero)?.texto ?? ''
  const minimo = item.min_caracteres ?? (item.obligatorio ? 1 : 0)
  function submit() {
    const pendientes = faltan(puestos)
    const siguientes = {
      podio: pendientes
        ? `Completa tu podio: te ${pendientes === 1 ? `falta 1 ${config.unidad.singular}` : `faltan ${pendientes} ${config.unidad.plural}`}.`
        : undefined,
      texto:
        !pendientes && text.trim().length < minimo ? `Escribe al menos ${minimo} caracteres.` : undefined,
    }
    setErrores(siguientes)
    if (!siguientes.podio && !siguientes.texto)
      onGuardar(
        text.trim(),
        seleccionDe(puestos).map((codigo) => ({ codigo })),
      )
  }
  return (
    <form
      className="sx-submission-form sx-podium-form"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <InlineDialogue
        speakerId={node.hablanteId ?? 'companero'}
        text={mensajeLumi(puestos, config.unidad)}
        light
      />
      <p className="sx-submission-label">
        <span className="sx-submission-premise">{item.consigna}</span>
        <span className="sx-submission-visibility">
          Visible para ti y tu orientadora. Se guarda en tu cuenta.
        </span>
      </p>
      <RankingPodium
        opciones={eleccion.opciones}
        puestos={puestos}
        etiquetaPrimero={config.etiquetaPrimero}
        iconos={config.iconos}
        error={errores.podio}
        onChange={(siguientes) => {
          setPuestos(siguientes)
          if (completo(siguientes)) setErrores((e) => ({ ...e, podio: undefined }))
        }}
      />
      {lleno && primero && (
        <div className="sx-podium-explain">
          <label className="sx-submission-label">
            <span className="sx-submission-premise">{preguntaPrimero(config.pregunta, textoPrimero)}</span>
            <textarea
              className="sx-submission-textarea"
              value={text}
              placeholder="Escribe con tus palabras, no hay respuestas incorrectas"
              onChange={(event) => {
                setText(event.target.value)
                setPrimeroAlEscribir(primero)
              }}
            />
          </label>
          {!!text.trim() && primero !== primeroAlEscribir && (
            <p role="status" className="sx-podium-warning">
              Cambiaste tu primer {node.podio?.unidad ? node.podio.unidad.singular : 'lugar'}. Revisa si tu
              explicación sigue encajando.
            </p>
          )}
          {errores.texto && (
            <p role="alert" className="sx-submission-error">
              {errores.texto}
            </p>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="sx-submission-error">
          {error}
        </p>
      )}
      <div className="sx-player-actions">
        <button type="submit" className="sx-primary-button" disabled={ocupado}>
          {ocupado ? 'Guardando…' : ultimo ? 'Entregar' : 'Guardar y continuar'}
          <Check size={18} />
        </button>
      </div>
    </form>
  )
}
