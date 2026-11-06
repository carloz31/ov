import { CharacterAvatar } from '@/components/student/CharacterAvatar'
import { INTRO_PISTA, burbujaRegistro, type EcoRegistro } from '../../lib/edicionRegistro'
import { RegistroLumi } from './RegistroLumi'

// Lumi sobre una consigna de registro, con la burbuja de los registros guiados: el recuerdo del eco (F02)
// y, en la consulta, la pista del ítem por ampliar, resaltada, en una sola burbuja. Sin nada que decir, solo
// el avatar. F07b: los chips del eco (motivos del plan A) van justo tras su cita y antes del resto del recuerdo.
export function RegistroEco({
  eco,
  pista,
  hablanteId,
}: {
  eco?: EcoRegistro
  pista?: string
  hablanteId?: string
}) {
  const partes = burbujaRegistro(eco, pista)
  if (!partes) return hablanteId ? <CharacterAvatar id={hablanteId} size="sm" /> : null
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
