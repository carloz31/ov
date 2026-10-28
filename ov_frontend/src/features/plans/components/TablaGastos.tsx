import { useState } from 'react'
import { ExternalLink, X } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { FRECUENCIAS, textoElegida } from '@/lib/servidor/adaptadoresPlanes'
import {
  agregarGasto,
  notaGasto,
  rubrosSinFila,
  type BorradorRealidad,
  type GastoBorrador,
} from '@/lib/servidor/adaptadoresPlanesEdicion'
import type { FrecuenciaGasto, OpcionesTarjeta } from '@/types/servidor'

type Gestion = 'PUBLICA' | 'PRIVADA' | null

// F07b (§7, lienzo «sección 3 en edición»): «Cuánto costaría». Tabla rubro · monto · frecuencia con la nota de
// referencia bajo el rubro; debajo, los rubros sin referencia como chips («+ Alimentación», «+ Vivienda») y
// «+ Otro gasto», que despliega los demás rubros sin fila u «Otro» con su texto.
export function TablaGastos({
  borrador,
  opciones,
  gestion,
  institucion,
  paginaWeb,
  onCambiar,
}: {
  borrador: BorradorRealidad
  opciones: OpcionesTarjeta
  gestion: Gestion
  institucion: string | null
  paginaWeb: string | null
  onCambiar: (cambio: (b: BorradorRealidad) => BorradorRealidad) => void
}) {
  const [otros, setOtros] = useState(false)
  const libres = rubrosSinFila(borrador, opciones)
  const aMano = libres.filter((r) => r.frecuencia_recomendada === null)
  const restantes = libres.filter((r) => r.frecuencia_recomendada !== null)
  const cambiarFila = (clave: number, cambio: Partial<GastoBorrador>) =>
    onCambiar((b) => ({ ...b, gastos: b.gastos.map((g) => (g.clave === clave ? { ...g, ...cambio } : g)) }))
  const agregar = (rubro: string | null) => {
    setOtros(false)
    onCambiar((b) => agregarGasto(b, rubro, opciones, gestion))
  }
  const pensionEnCero = gestion === 'PUBLICA' && opciones.rubros.some((r) => r.cero_si_publica)
  return (
    <section className="sx-p-campo" aria-labelledby="sx-p-costos">
      <strong id="sx-p-costos">Cuánto costaría</strong>
      <span className="sx-p-ayuda">
        Montos de referencia; cámbialos por los de tu institución.
        {pensionEnCero && institucion && ` La ${institucion} es pública: la pensión va en 0.`}{' '}
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
            const nota = notaGasto(g, borrador, opciones, gestion)
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
                  {nota && <small>{nota}</small>}
                </th>
                <td>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    aria-label={`Monto de ${nombre}`}
                    value={g.monto}
                    onChange={(e) =>
                      cambiarFila(g.clave, { monto: Math.max(0, Math.round(Number(e.target.value) || 0)) })
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
                    onClick={() =>
                      onCambiar((b) => ({ ...b, gastos: b.gastos.filter((x) => x.clave !== g.clave) }))
                    }
                  >
                    <X aria-hidden="true" />
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="sx-p-chips">
        {aMano.map((r) => (
          <button type="button" className="sx-p-chip" key={r.codigo} onClick={() => agregar(r.codigo)}>
            + {r.texto}
          </button>
        ))}
        {otros ? (
          <>
            {restantes.map((r) => (
              <button type="button" className="sx-p-chip" key={r.codigo} onClick={() => agregar(r.codigo)}>
                + {r.texto}
              </button>
            ))}
            <button type="button" className="sx-p-chip sx-p-chip-nuevo" onClick={() => agregar(null)}>
              + Otro
            </button>
          </>
        ) : (
          <button type="button" className="sx-p-chip sx-p-chip-nuevo" onClick={() => setOtros(true)}>
            + Otro gasto
          </button>
        )}
      </div>
    </section>
  )
}
