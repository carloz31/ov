import { Link } from 'react-router'
import { BookOpen, MessageCircle } from 'lucide-react'
import { puntosRegalo } from '@/lib/servidor/adaptadoresConversaciones'
import type { ConversacionCuenta } from '@/types/servidor'
import { enLetras } from '../../data/textosFamilia'
import type { ModeloFamilia } from '../../types'
import { PuntosRegalo } from './PuntosRegalo'

// F08 (E7/A5): las dos miradas, el puente, las preguntas para conversar en casa y «Algo que ya saben» (todo del
// servidor). Cierre sin marca: la entrada del diario (solo el estudiante, si el servidor la abrió) y el avance del
// regalo. El apoderado vuelve a la lista con un botón.
export function ListasTema({ m, c }: { m: ModeloFamilia; c: ConversacionCuenta }) {
  const { textos: t, datos } = m
  if (!datos) return null
  const estudiante = m.rol === 'estudiante'
  const propia = (
    <div className="fam-mirada">
      <p className="fam-mirada-titulo">{t.tuMirada}</p>
      <h3>{c.pregunta}</h3>
      <p className="fam-mirada-texto">{c.mi_respuesta}</p>
    </div>
  )
  const delOtro = (
    <div className="fam-mirada fam-mirada--otro">
      <p className="fam-mirada-titulo">{t.miradaOtro}</p>
      <h3>{c.pregunta_otro}</h3>
      <p className="fam-mirada-texto">{c.respuesta_otro}</p>
    </div>
  )
  return (
    <section className="fam-card fam-tema-detalle">
      {c.tema && <span className="fam-chip">{c.tema}</span>}
      <p className="fam-kicker">{c.titulo}</p>
      <h2>{t.listasTitulo}</h2>
      <div className="fam-grid-2">
        {propia}
        {delOtro}
      </div>
      {c.mensaje_diferencias && (
        <div className="fam-puente">
          <h3>{t.puente}</h3>
          <p>{c.mensaje_diferencias}</p>
        </div>
      )}
      <div className="fam-guia">
        <div className="fam-mirada fam-guia-lista">
          <h3>{t.preguntasCasa}</h3>
          <ul>
            {(c.preguntas_guia ?? []).map((pregunta) => (
              <li key={pregunta}>
                <MessageCircle aria-hidden="true" size={18} />
                {pregunta}
              </li>
            ))}
          </ul>
        </div>
        {c.algo_que_saben && (
          <div className="fam-saben">
            <h3>{t.algoQueSaben}</h3>
            <p>{c.algo_que_saben}</p>
          </div>
        )}
      </div>
      <div className="fam-cierre">
        {estudiante && c.entrada_diario && m.rutas.diario && (
          <div className="fam-diario">
            <span className="fam-lumi-icono">
              <BookOpen aria-hidden="true" size={24} />
            </span>
            <div>
              <p className="fam-kicker">{t.diarioKicker}</p>
              <h3>{c.entrada_diario.nombre}</h3>
              <p>{c.entrada_diario.pregunta}</p>
            </div>
            <Link className="fam-btn fam-btn--oro" to={m.rutas.diario}>
              {t.diarioBoton}
            </Link>
          </div>
        )}
        <div className="fam-tema-listo">
          <PuntosRegalo chicos puntos={puntosRegalo(datos)} />
          <div>
            <h3>{t.temaListo(c.orden, datos.total)}</h3>
            <p>{t.temaListoTexto(enLetras(datos.total))}</p>
          </div>
        </div>
      </div>
      {!estudiante && (
        <Link className="fam-btn" to={m.rutas.lista}>
          {t.volverLista}
        </Link>
      )}
    </section>
  )
}
