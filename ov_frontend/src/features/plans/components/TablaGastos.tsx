import { ExternalLink, X } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { FRECUENCIAS, soles, textoElegida } from '@/lib/servidor/adaptadoresPlanes'
import {
  agregarGasto,
  faltanPredeterminados,
  pistaGasto,
  quitarGasto,
  restablecerGastos,
  rubrosSinFila,
  type BorradorRealidad,
  type GastoBorrador,
} from '@/lib/servidor/adaptadoresPlanesEdicion'
import type { FrecuenciaGasto, OpcionesTarjeta } from '@/types/servidor'

type Gestion = 'PUBLICA' | 'PRIVADA' | null

// F07b (§7 con el ajuste de «Cuánto costaría»): la tabla rubro · monto · frecuencia con los gastos propuestos y
// el monto vacío (pista bajo el rubro: su referencia, «Consúltalo en su página» o «0 por ser pública»). La «✕»
// manda la fila a los chips de abajo; «+ Otro gasto» agrega uno con su texto y «Restablecer predeterminados»
// repone los propuestos que falten, sin borrar montos.
export function TablaGastos({
  borrador,
  opciones,
  gestion,
  paginaWeb,
  onCambiar,
}: {
  borrador: BorradorRealidad
  opciones: OpcionesTarjeta
  gestion: Gestion
  paginaWeb: string | null
  onCambiar: (cambio: (b: BorradorRealidad) => BorradorRealidad) => void
}) {
  const cambiarFila = (clave: number, cambio: Partial<GastoBorrador>) =>
    onCambiar((b) => ({ ...b, gastos: b.gastos.map((g) => (g.clave === clave ? { ...g, ...cambio } : g)) }))
  const agregar = (rubro: string | null) => onCambiar((b) => agregarGasto(b, rubro, opciones, gestion))
  const camino = borrador.camino && textoElegida(borrador.camino, opciones.caminos)
  return (
    <section className="sx-p-campo" aria-labelledby="sx-p-costos">
      <strong id="sx-p-costos">Cuánto costaría</strong>
      <span className="sx-p-ayuda">
        Los gastos propuestos dependen de cómo llegarías
        {camino && (
          <>
            {' '}
            (<strong>{camino}</strong>)
          </>
        )}{' '}
        y de la institución. Escribe los montos que averigües; puedes quitar o agregar rubros.{' '}
        {paginaWeb && (
          <a href={paginaWeb} target="_blank" rel="noopener noreferrer">
            Ver costos en su página <ExternalLink aria-hidden="true" size={12} />
          </a>
        )}
      </span>
      <table className="sx-p-gastos">
        <thead>
          <tr>
            <th scope="col">Rubro</th>
            <th scope="col">Monto (S/)</th>
            <th scope="col">Frecuencia</th>
            <th scope="col">
              <span className="sr-only">Quitar</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {borrador.gastos.map((g) => {
            const nombre = g.rubro
              ? textoElegida({ opcion: g.rubro }, opciones.rubros)
              : g.otro || 'Otro gasto'
            const pista = pistaGasto(g, opciones, gestion)
            return (
              <tr key={g.clave}>
                <th scope="row">
                  {g.rubro ? (
                    <strong>{nombre}</strong>
                  ) : (
                    <Input
                      aria-label="Otro gasto"
                      placeholder="¿Qué gasto?"
                      value={g.otro}
                      onChange={(e) => cambiarFila(g.clave, { otro: e.target.value })}
                    />
                  )}
                  {pista && (
                    <small>
                      {'referencia' in pista ? `Referencia: ${soles(pista.referencia)}` : pista.texto}
                    </small>
                  )}
                </th>
                <td>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    placeholder="S/"
                    aria-label={`Monto de ${nombre}`}
                    value={g.monto ?? ''}
                    onChange={(e) =>
                      cambiarFila(g.clave, {
                        monto:
                          e.target.value === '' ? null : Math.max(0, Math.round(Number(e.target.value) || 0)),
                      })
                    }
                  />
                </td>
                <td>
                  <Select
                    value={g.frecuencia}
                    onValueChange={(f) => cambiarFila(g.clave, { frecuencia: f as FrecuenciaGasto })}
                  >
                    <SelectTrigger aria-label={`Frecuencia de ${nombre}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FRECUENCIAS.map(([codigo, texto]) => (
                        <SelectItem key={codigo} value={codigo}>
                          {texto}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td>
                  <button
                    type="button"
                    className="sx-d-icon"
                    aria-label={`Quitar ${nombre}`}
                    onClick={() => onCambiar((b) => quitarGasto(b, g.clave))}
                  >
                    <X aria-hidden="true" />
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="sx-p-gastos-pie">
        <div className="sx-p-chips">
          {rubrosSinFila(borrador, opciones).map((r) => (
            <button type="button" className="sx-p-chip" key={r.codigo} onClick={() => agregar(r.codigo)}>
              + {r.texto}
            </button>
          ))}
          <button type="button" className="sx-p-chip sx-p-chip-nuevo" onClick={() => agregar(null)}>
            + Otro gasto
          </button>
        </div>
        <button
          type="button"
          className="sx-p-restablecer"
          disabled={!faltanPredeterminados(borrador, opciones)}
          onClick={() => onCambiar((b) => restablecerGastos(b, opciones, gestion))}
        >
          Restablecer predeterminados
        </button>
      </div>
    </section>
  )
}
