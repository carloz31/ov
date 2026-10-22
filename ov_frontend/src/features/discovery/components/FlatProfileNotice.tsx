import type { ReactNode } from 'react'
import { Link } from 'react-router'

// F03: en api, `reinicio` reemplaza el texto y el enlace a los encuentros con Mara por la invitación a repetir
// las misiones (HU-095) y su botón, si el reinicio no se usó.
export function FlatProfileNotice({ reinicio }: { reinicio?: { texto: string; accion: ReactNode } }) {
  return (
    <section className="sx-d-result-flat">
      <h2>Tus respuestas no marcaron un interés por encima de otro</h2>
      {reinicio ? (
        <>
          <p>{reinicio.texto}</p>
          {reinicio.accion}
        </>
      ) : (
        <>
          <p>
            Respondiste de forma muy parecida a todos los tipos de actividad, así que Helena no puede formar tu
            código de interés ni buscar ocupaciones afines. Puedes revisar tus encuentros con Mara y responder
            pensando en lo que de verdad disfrutas.
          </p>
          <Link className="sx-d-action" to="/student/exploration?punto=mara-test">
            Revisar mis encuentros con Mara
          </Link>
        </>
      )}
    </section>
  )
}
