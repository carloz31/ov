import { Link } from 'react-router'
import type { FamiliaRecomendadaPublica } from '@/types/servidor'
import { nombresTipos, ocupacionesDeFamilia, textoCarreras, verboLlegar } from '../lib/resultadoIntereses'

// Ajuste resultados-intereses: las familias recomendadas del hijo en el portal (boceto 02), en dos columnas, con
// «Ver en el catálogo» del portal y la tarjeta final de preguntas «Para conversar en casa».
const mayuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1)

export function FamiliasPortal({
  familias,
  nombre,
  carreras,
}: {
  familias: FamiliaRecomendadaPublica[]
  nombre: string
  carreras: string
}) {
  return (
    <section className="sx-p-panel" aria-labelledby="titulo-familias-portal">
      <div className="sx-p-cabecera">
        <div>
          <h2 id="titulo-familias-portal">Familias de carreras por las que puede empezar a explorar</h2>
          <p>
            Calculadas a partir de las familias principales de sus ocupaciones afines. Cada familia agrupa
            carreras parecidas que se dictan en el Perú; en el catálogo puede ver cuáles son, dónde se
            estudian y cuánto ganan sus egresados.
          </p>
        </div>
      </div>
      <div className="sx-p-familias">
        {familias.map((f) => (
          <article key={f.codigo} className="sx-p-familia">
            <h3>
              <span className="sx-p-numero" aria-hidden="true">
                {f.posicion}
              </span>
              {f.nombre}
            </h3>
            {f.descripcion && <p>{f.descripcion}</p>}
            <p>
              {mayuscula(verboLlegar(f))} {ocupacionesDeFamilia(f)}.
              {f.unica_ocupacion && ' Es la única ocupación afín de esta familia.'}
            </p>
            <p className="sx-p-chips">
              {nombresTipos(f).map((t) => (
                <span key={t.tipo} className="sx-p-chip" data-tipo={t.tipo}>
                  {t.nombre}
                </span>
              ))}
              <span className="sx-p-chip">{textoCarreras(f.total_carreras)}</span>
            </p>
            <Link
              className="sx-p-enlace"
              to={`${carreras}?${new URLSearchParams({ area: f.area_codigo, familia: f.codigo })}`}
            >
              Ver en el catálogo ›
            </Link>
          </article>
        ))}
        <aside className="sx-p-conversar">
          <h3>Para conversar en casa</h3>
          <p>
            ¿Cuál de estas familias le sonaba antes de hacer el test y cuál la sorprendió? ¿Qué ocupación de
            la lista le gustaría conocer de cerca? El catálogo muestra las mismas carreras que ve {nombre},
            sin favoritos ni planes: esos son suyos.
          </p>
        </aside>
      </div>
    </section>
  )
}
