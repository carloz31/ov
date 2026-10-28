import { soles } from '@/lib/servidor/adaptadoresPlanes'
import { textoAnios } from '@/lib/servidor/adaptadoresPlanesEdicion'

// F07b (§7): la tarjeta oscura del costo. En edición, el total en vivo con «Se recalcula mientras editas» y la
// fórmula; en lectura, los totales del servidor y «Muéstrales este número en casa.».
export function TarjetaTotal({
  primerAnio,
  carrera,
  anios,
  ciclosPorAnio,
  enVivo,
}: {
  primerAnio: number
  carrera: number | null
  anios: number | null
  ciclosPorAnio: number
  enVivo: boolean
}) {
  const carreraTexto =
    carrera !== null &&
    ` · toda la carrera ≈ ${soles(carrera)}${enVivo && anios ? ` (${textoAnios(anios)})` : ''}`
  return (
    <div className="sx-p-costo" data-en-vivo={enVivo}>
      <div>
        <small>{enVivo ? 'Primer año, con lo que tienes ahora' : 'Primer año'}</small>
        <strong>≈ {soles(primerAnio)}</strong>
        <p>
          ≈ {soles(Math.round(primerAnio / 12))} al mes{carreraTexto}
        </p>
        {!enVivo && <p className="sx-p-costo-casa">Muéstrales este número en casa.</p>}
      </div>
      {enVivo && (
        <p className="sx-p-costo-formula">
          Se recalcula mientras editas. Una vez × 1 · Mensual × 12 · Por ciclo × {ciclosPorAnio} · Anual × 1.
        </p>
      )}
    </div>
  )
}
