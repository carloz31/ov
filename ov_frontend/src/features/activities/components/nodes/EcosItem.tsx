import type { EcoMostrado } from '@/types/servidor'
import { citado, formasEco, type EleccionEco, type PlanEco, type TextoEco } from '../../lib/formasEco'
import { ECOS } from '../../lib/textosRegistro'
import { EcoPlan } from './EcoPlan'
import { EcoProyecto } from './EcoProyecto'
import { TextoRecortable } from './TextoRecortable'
import '../../styles/registro-ecos.css'

// Ajuste front de registros (lote 2, §6): los ecos de un ítem, cada uno con su forma. Son bloques de datos: sin
// avatar ni burbuja. Un eco que no viene no se muestra.
export function EcosItem({ ecos }: { ecos: EcoMostrado[] }) {
  const bloques = formasEco(ecos)
  if (!bloques.length) return null
  return (
    <div className="sx-ecos">
      {bloques.map((b, i) => {
        const clave = `${b.forma}-${i}`
        if (b.forma === 'plan') return <EcoPlan key={clave} plan={b.plan} />
        if (b.forma === 'planes') return <Par key={clave} planes={b.planes} />
        if (b.forma === 'proyecto') return <EcoProyecto key={clave} {...b} />
        if (b.forma === 'textos') return <Textos key={clave} textos={b.textos} />
        if (b.forma === 'eleccion') return <Eleccion key={clave} eco={b} />
        if (b.forma === 'resultado')
          return (
            <div key={clave} className="sx-eco">
              {b.nombre && <span className="sx-eco-rotulo">{b.nombre}</span>}
              <p className="sx-eco-linea">{b.linea}</p>
              <div className="sx-eco-etiquetas">
                {b.dimensiones.map((d) => (
                  <span key={d} className="sx-eco-etiqueta">
                    {d}
                  </span>
                ))}
              </div>
            </div>
          )
        return (
          <div key={clave} className="sx-ecos-hoy">
            <span className="sx-eco-rotulo">{ECOS.hoy}</span>
            <Par planes={b.planes} />
            {b.eleccion && <Eleccion eco={b.eleccion} />}
          </div>
        )
      })}
    </div>
  )
}

// Dos planes lado a lado, en dos columnas iguales (en pantallas angostas, uno debajo del otro).
function Par({ planes }: { planes: PlanEco[] }) {
  return (
    <div className="sx-ecos-par">
      {planes.map((p) => (
        <EcoPlan key={p.rotulo} plan={p} />
      ))}
    </div>
  )
}

// Varios ecos de texto en un solo bloque, separados por una línea fina, cada uno con su origen.
function Textos({ textos }: { textos: TextoEco[] }) {
  return (
    <div className="sx-eco sx-eco-textos">
      {textos.map((t, i) => (
        <div key={`${i}-${t.origen ?? ''}`} className="sx-eco-texto">
          {t.lineas.map((linea, j) => (
            <TextoRecortable
              key={j}
              className="sx-eco-linea"
              texto={citado(linea)}
              maximo={110}
              enlace={ECOS.verCompleto}
            />
          ))}
          {t.origen && <p className="sx-eco-origen">{t.origen}</p>}
        </div>
      ))}
    </div>
  )
}

// La elección en negrita, su texto entre «» si lo trae y, debajo, su origen.
function Eleccion({ eco }: { eco: EleccionEco }) {
  return (
    <div className="sx-eco">
      <p className="sx-eco-linea">
        <b>{eco.valor}</b>
      </p>
      {eco.texto?.map((linea, j) => (
        <TextoRecortable key={j} className="sx-eco-linea" texto={citado(linea)} maximo={110} enlace={ECOS.verCompleto} />
      ))}
      {eco.origen && <p className="sx-eco-origen">{eco.origen}</p>}
    </div>
  )
}
