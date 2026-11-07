import { INTRO_PISTA, burbujaRegistro, type EcoRegistro } from '../../lib/edicionRegistro'
import { RegistroLumi } from './RegistroLumi'

// Zona del eco de una consigna de registro: el recuerdo del eco (F02) y, en la consulta, la pista del ítem por
// ampliar, resaltada, en una sola burbuja. F07b: los chips del eco (motivos del plan A) van justo tras su cita y antes del resto del recuerdo.
export function RegistroEco({
  eco,
  pista,
  hablanteId,
  abierto,
}: {
  eco?: EcoRegistro
  pista?: string
  hablanteId?: string
  // Ajuste registros: en la consulta, el ítem quedó abierto.
  abierto?: boolean
}) {
  const partes = burbujaRegistro(eco, pista, abierto)
  // Ajuste vista del ítem: sin nada que decir no hay zona de eco (el personaje va en su propio bloque).
  if (!partes) return null
  return (
    <RegistroLumi
      hablanteId={hablanteId}
      texto={
        <>
          {partes.recuerdo}
          {partes.recuerdo && !!eco?.chips?.length && (
            <span className="sx-eco-chips">
              {eco.chips.map((chip) => (
                <span className="sx-eco-chip" key={chip}>
                  {chip}
                </span>
              ))}
            </span>
          )}
          {partes.recuerdo && eco?.citaTras && <span className="sx-eco-tras">{eco.citaTras}</span>}
          {partes.recuerdo && partes.pista && ' '}
          {partes.pista && (
            <>
              {INTRO_PISTA} <strong>{partes.pista}</strong>
            </>
          )}
        </>
      }
    />
  )
}
