import { ParAvatares } from './ParAvatares'

// F08 (E6): la caja punteada donde aparecerá la mirada del otro.
export function CajaEsperando({
  avatares,
  titulo,
  texto,
  letra,
}: {
  avatares: { estudiante: boolean; familia: boolean }
  titulo: string
  texto: string
  letra: string
}) {
  return (
    <div className="fam-caja-punteada">
      <span className="mx-auto">
        <ParAvatares estudiante={avatares.estudiante} familia={avatares.familia} letra={letra} />
      </span>
      <h3>{titulo}</h3>
      <p>{texto}</p>
    </div>
  )
}
