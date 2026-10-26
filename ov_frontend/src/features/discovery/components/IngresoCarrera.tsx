import { Parchment } from '@/components/student/Parchment'
import { soles, tramosIngreso } from '@/lib/servidor/adaptadoresCatalogo'
import type { IngresoPublico } from '@/types/servidor'

// F06: el ingreso de la carrera tal como lo entrega el servidor: promedio, fuente y año, y cuántos ganan en cada
// tramo (barras relativas al tramo más poblado).
export function IngresoCarrera({ ingreso }: { ingreso: IngresoPublico }) {
  return (
    <Parchment title="Cuánto se gana">
      <p>Ingreso promedio mensual: {soles(ingreso.promedio_mensual)}</p>
      <div className="sx-d-stack">
        {tramosIngreso(ingreso).map((tramo) => (
          <div className="sx-d-income-card" key={tramo.etiqueta}>
            <p>{tramo.etiqueta}</p>
            <div
              className="sx-d-income-range"
              role="img"
              aria-label={`${tramo.porcentaje} % gana ${tramo.etiqueta.toLowerCase()} al mes`}
            >
              <span style={{ left: 0, width: `${tramo.ancho}%` }} />
            </div>
            <strong>{tramo.porcentaje} %</strong>
          </div>
        ))}
      </div>
      <small>
        {ingreso.fuente} · {ingreso.anio}
      </small>
    </Parchment>
  )
}
