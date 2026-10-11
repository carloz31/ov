import { useInstrumentResult } from '../../hooks/useInstrumentResult'

import { Link } from 'react-router'

import type { Actividad } from '@/types/activities'

import { CharacterAvatar } from '@/components/student/CharacterAvatar'

export function ResultNode({ activity, instrumentId }: { activity: Actividad; instrumentId: string }) {
  const { instrument, result, resultado } = useInstrumentResult(activity, instrumentId)
  if (resultado)
    return (
      <>
        <CharacterAvatar id="elena" size="md" />
        <h2 className="sx-result-title">Las pistas que hablan de ti</h2>
        {resultado.error !== undefined ? (
          <>
            <p role="alert">{resultado.error}</p>
            <button className="sx-secondary-button" onClick={() => void resultado.reintentar()}>
              Reintentar consulta
            </button>
          </>
        ) : !resultado.datos ? (
          <p>Elena te espera al completar los 14 encuentros con Mara.</p>
        ) : resultado.datos.perfil_plano ? (
          <>
            <p>Tus respuestas todavía no distinguen un interés. Puedes revisar tus encuentros con Mara.</p>
            <Link className="sx-secondary-button" to="/student/exploration?punto=mara-test">
              Revisar mis encuentros
            </Link>
          </>
        ) : (
          <>
            {resultado.areas.map((d) => (
              <p key={d.codigo}>
                <strong>{d.nombre}</strong>: {d.porcentaje}%
              </p>
            ))}
            <p>
              Estos intereses describen actividades que despiertan tu curiosidad, sin calificar tus
              capacidades.
            </p>
            <Link className="sx-secondary-button" to="/student/profile/helena">
              Abrir el libro de Helena
            </Link>
          </>
        )}
      </>
    )
  return (
    <>
      <CharacterAvatar id="elena" size="md" />
      <h2 className="sx-result-title">Las pistas que hablan de ti</h2>
      {result ? (
        result.puntajes.map((score) => (
          <p key={score.dimensionId}>
            {instrument?.clave.dimensiones.find((dim) => dim.id === score.dimensionId)?.nombre}:{' '}
            {score.puntaje}
          </p>
        ))
      ) : (
        <p>
          Elena te espera al completar los 14 encuentros y cuando esté disponible la clave oficial del
          instrumento.
        </p>
      )}
    </>
  )
}
