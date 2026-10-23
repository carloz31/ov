import { LockKeyhole } from 'lucide-react'

// Testimonio bloqueado de la mochila: silueta difuminada, título, intriga y requisito (ajustes Central, 7).
// La acción (ir a la Central, «llega pronto» o el pop up de requisito) la pone quien la usa.
export function VozPorDescubrir({
  titulo,
  intriga,
  requisito,
}: {
  titulo: string
  intriga: string
  requisito: string
}) {
  return (
    <>
      <div className="sx-b-voice-mist" aria-hidden="true">
        <span className="sx-b-silhouette" />
        <LockKeyhole size={56} />
      </div>
      <p className="sx-b-voice-label">Una voz por descubrir</p>
      <h3>{titulo}</h3>
      {intriga && <p>{intriga}</p>}
      <div className="sx-b-requirement">{requisito}</div>
    </>
  )
}
