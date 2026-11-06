// F08: avatares E (estudiante) y F (familia); relleno = ya respondió. Con texto, la línea de estado a su lado.
export function ParAvatares({
  estudiante,
  familia,
  texto,
  letra = 'E',
}: {
  estudiante: boolean
  familia: boolean
  texto?: string
  // El apoderado ve la inicial de su hijo.
  letra?: string
}) {
  return (
    <span className="fam-avatares">
      <span>
        <span className={`fam-avatar${estudiante ? ' is-lleno' : ''}`}>{letra}</span>
        <span className={`fam-avatar${familia ? ' is-lleno' : ''}`}>F</span>
      </span>
      {texto && <span>{texto}</span>}
    </span>
  )
}
