import { Parchment } from '@/components/student/Parchment'
import { rangoSoles, soles } from '@/lib/servidor/adaptadoresCatalogo'
import type { IngresoCarreraPublico } from '@/types/servidor'

// Ajuste catalogo-datos-reales (F5a): el promedio nacional de la familia y el tipo de la carrera, para jóvenes y
// adultos, con su fuente. El diseño final (lugar e institución) es de F6.
export function IngresoCarrera({ ingreso }: { ingreso: IngresoCarreraPublico }) {
  const tramos = [
    ['Jóvenes', ingreso.nacional.jovenes],
    ['Adultos', ingreso.nacional.adultos],
  ] as const
  return (
    <Parchment title="Cuánto ganan sus egresados">
      <div className="sx-d-stack">
        {tramos.map(([etiqueta, tramo]) => (
          <div className="sx-d-income-card" key={etiqueta}>
            <p>{etiqueta}</p>
            <strong>{soles(tramo.promedio)}</strong>
            <small>{rangoSoles(tramo)}</small>
          </div>
        ))}
      </div>
      <small>{ingreso.fuente}</small>
    </Parchment>
  )
}
