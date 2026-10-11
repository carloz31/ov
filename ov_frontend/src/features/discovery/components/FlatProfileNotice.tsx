import { Link } from 'react-router'

export function FlatProfileNotice() {
  return (
    <section className="sx-d-result-flat">
      <h2>Tus respuestas no marcaron un interés por encima de otro</h2>
      <p>
        Respondiste de forma muy parecida a todos los tipos de actividad, así que Helena no puede formar tu
        código de interés ni buscar ocupaciones afines. Puedes revisar tus encuentros con Mara y responder
        pensando en lo que de verdad disfrutas.
      </p>
      <Link className="sx-d-action" to="/student/exploration?punto=mara-test">
        Revisar mis encuentros con Mara
      </Link>
    </section>
  )
}
