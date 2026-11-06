import { Link } from 'react-router'
import type { FamiliaRecomendadaPublica } from '@/types/servidor'
import {
  nombresTipos,
  ocupacionesDeFamilia,
  textoCarreras,
  textoVerOcupaciones,
  verboLlegar,
} from '../lib/resultadoIntereses'

// Ajuste resultados-intereses: paso 2 del resultado del estudiante (boceto 01): las familias recomendadas en
// orden, con lo que las explica, y el cierre «¿Y después?». Sin guardar ni planes.
const NUMEROS = ['', 'Esta', 'Estas dos', 'Estas tres', 'Estas cuatro', 'Estas cinco']

function TarjetaFamilia({
  familia,
  carreras,
  ocupaciones,
}: {
  familia: FamiliaRecomendadaPublica
  carreras: string
  ocupaciones: string
}) {
  return (
    <article className="sx-r-familia-tarjeta">
      <div>
        <h3>
          <span className="sx-r-numero" aria-hidden="true">
            {familia.posicion}
          </span>
          {familia.nombre}
          <small>Área: {familia.area_nombre}</small>
        </h3>
        {familia.descripcion && <p>{familia.descripcion}</p>}
        <p className="sx-r-por-que">
          <strong>Por qué te la recomendamos:</strong> {verboLlegar(familia)} {ocupacionesDeFamilia(familia)}.
          {familia.unica_ocupacion &&
            ' Es la única ocupación afín de esta familia; por eso va después de las que tienen varias.'}
        </p>
        <p className="sx-r-chips">
          {nombresTipos(familia).map((t) => (
            <span key={t.tipo} className="sx-r-chip" data-tipo={t.tipo}>
              {t.nombre}
            </span>
          ))}
          <span className="sx-r-chip">{textoCarreras(familia.total_carreras, ' en el catálogo')}</span>
        </p>
      </div>
      <div className="sx-r-familia-acciones">
        <Link className="sx-r-boton" to={carreras}>
          Explorar sus carreras
        </Link>
        {familia.total_ocupaciones > 0 && (
          <Link className="sx-r-enlace" to={ocupaciones}>
            {textoVerOcupaciones(familia.total_ocupaciones)} ›
          </Link>
        )}
      </div>
    </article>
  )
}

export function FamiliasRecomendadas({
  familias,
  catalogo,
}: {
  familias: FamiliaRecomendadaPublica[]
  catalogo: { carreras: string; profesiones: string }
}) {
  const filtro = (base: string, f: FamiliaRecomendadaPublica) =>
    `${base}?${new URLSearchParams({ area: f.area_codigo, familia: f.codigo })}`
  return (
    <section id="familias" className="sx-r-panel sx-r-oscuro" aria-labelledby="titulo-familias">
      <p className="sx-r-rotulo">Paso 2 · Familias de carreras</p>
      <h2 id="titulo-familias">Por dónde empezar a explorar carreras</h2>
      <p className="sx-r-intro">
        Cada familia agrupa carreras parecidas que se dictan en el Perú. {NUMEROS[familias.length] ?? 'Estas'}{' '}
        {familias.length === 1 ? 'es la que conduce' : 'son las que conducen'} a tus ocupaciones más afines.
        Entra a una para ver sus carreras, dónde se estudian y cuánto ganan sus egresados; ahí podrás guardar
        las que te interesen.
      </p>
      <div className="sx-r-familias">
        {familias.map((f) => (
          <TarjetaFamilia
            key={f.codigo}
            familia={f}
            carreras={filtro(catalogo.carreras, f)}
            ocupaciones={`${catalogo.profesiones}?${new URLSearchParams({ familia: f.codigo })}`}
          />
        ))}
      </div>
      <footer className="sx-r-cierre">
        <p>
          <strong>¿Y después?</strong> En el catálogo puedes guardar en favoritos las carreras que te
          interesen; con tus favoritas armarás más adelante tus planes A, B y C. Las familias de aquí son un
          punto de partida, no una lista cerrada: el filtro por área te deja mirar también las vecinas.
        </p>
        <Link className="sx-r-boton-dorado" to={catalogo.carreras}>
          Ir al catálogo de carreras
        </Link>
      </footer>
    </section>
  )
}
