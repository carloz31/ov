import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { ESCALA_MEDIDOR, MEDIDORES } from '@/lib/servidor/adaptadoresPlanes'
import type { Medidores } from '@/types/servidor'
import { ICONOS_MEDIDOR } from '../lib/medidores'
const ESCALA = ESCALA_MEDIDOR.map((texto, i) => ({ valor: i + 1, texto }))

// F07b (§10, lienzo «Cómo me siento»): los tres medidores, cada uno con su ícono, su pregunta y Poco · Algo ·
// Mucho. Se guarda al instante.
export function ComoMeSiento({
  medidores,
  ocupado,
  onFijar,
}: {
  medidores: Medidores
  ocupado: { codigo: keyof Medidores; valor: number } | null
  onFijar: (codigo: keyof Medidores, valor: number) => void
}) {
  return (
    <section className="sx-p-panel" aria-labelledby="sx-p-panel-titulo">
      <header>
        <h2 id="sx-p-panel-titulo">Cómo me siento con este plan</h2>
        <small className="sx-p-ayuda">Se guarda al instante</small>
      </header>
      <p className="sx-p-intro">
        Cámbialo cuando quieras. No es una nota: te ayuda a ver qué plan te mueve más y cuál tienes más a la
        mano.
      </p>
      <ul className="sx-p-medidores">
        {MEDIDORES.map((m) => {
          const Icono = ICONOS_MEDIDOR[m.codigo]
          return (
            <li key={m.codigo}>
              <span className="sx-p-medidor-icono" aria-hidden="true">
                <Icono size={16} />
              </span>
              <div>
                <strong>{m.nombre}</strong>
                <small>{m.pregunta}</small>
              </div>
              <SegmentedControl
                etiqueta={m.nombre}
                className="sx-p-segmentado"
                opciones={ESCALA}
                valor={medidores[m.codigo]}
                ocupado={ocupado?.codigo === m.codigo ? ocupado.valor : ocupado ? 0 : null}
                onCambiar={(valor) => onFijar(m.codigo, valor)}
              />
            </li>
          )
        })}
      </ul>
    </section>
  )
}
