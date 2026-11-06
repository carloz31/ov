// F08: los puntos numerados del regalo; llenos = temas respondidos por los dos.
export function PuntosRegalo({
  puntos,
  chicos = false,
}: {
  puntos: { numero: number; lleno: boolean }[]
  chicos?: boolean
}) {
  const conversados = puntos.filter((p) => p.lleno).length
  return (
    <ol
      aria-label={`${conversados} de ${puntos.length} temas respondidos`}
      className={`fam-puntos${chicos ? ' fam-puntos--chicos' : ''}`}
    >
      {puntos.map((p) => (
        <li key={p.numero} className={`fam-punto${p.lleno ? ' is-lleno' : ''}`}>
          {p.numero}
        </li>
      ))}
    </ol>
  )
}
