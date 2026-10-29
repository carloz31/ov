import { useState } from 'react'
import { ClipboardCheck, Copy, Crown } from 'lucide-react'
import { Link } from 'react-router'
import { lineaNivel, numerarGuion } from '@/lib/servidor/adaptadoresInvestigaciones'
import { appPaths } from '@/routes/paths'
import type { InvestigacionesCuenta } from '@/types/servidor'
import { AutorEntrevista } from './AutorEntrevista'

const CONSEJOS: [string, string][] = [
  ['Rompe el hielo:', 'cuéntale por qué te interesa su trabajo antes de la primera pregunta.'],
  ['Repregunta:', '«¿Y cómo fue eso?», «¿Me das un ejemplo?». Ahí salen las mejores historias.'],
  ['Pide lo malo también:', 'qué no le gusta, qué le costó. Eso es lo que nadie te cuenta.'],
  ['Corto y claro:', 'entre 5 y 10 minutos de video alcanzan; recorta los silencios.'],
  ['Cierra agradeciendo', 'y pregunta si puedes compartirlo con tu salón.'],
]

// F09 (boceto 11): la guía lista, con los cuatro pasos (los aliados de la misma ocupación en línea), las preguntas
// que llevará (con copiar), los consejos y la regla de la Leyenda.
export function PasoGuiaLista({ datos, onEditar }: { datos: InvestigacionesCuenta; onEditar: () => void }) {
  const enCurso = datos.en_curso!
  const guion = numerarGuion(datos.preguntas_base, enCurso.preguntas)
  const lineas = [...guion.base, ...guion.propias].map((p) => `${p.numero}. ${p.texto}`)
  const [copiado, setCopiado] = useState(false)
  const copiar = () =>
    void navigator.clipboard?.writeText(lineas.join('\n')).then(
      () => setCopiado(true),
      () => setCopiado(false),
    )
  const otras = datos.aliados.otras.length
  return (
    <div className="sx-i-asistente" data-columnas="dos">
      <section className="sx-i-panel">
        <div className="sx-i-confirmacion">
          <span className="sx-i-sello" aria-hidden="true">
            <ClipboardCheck size={26} />
          </span>
          <div>
            <h2>Tu guía de entrevista está lista</h2>
            <p className="sx-i-meta">
              {enCurso.ocupacion.titulo} · {guion.total} preguntas · guardada, la encuentras en «Ver mi guion»
            </p>
          </div>
        </div>
        <ol className="sx-i-pasos-guia">
          <li>
            <span className="sx-i-numero-redondo">1</span>
            <div>
              <p>
                <strong>Mira si alguien de tu salón investiga lo mismo.</strong> Pueden entrevistar juntos y
                publicar como coautores. Se coordinan fuera de la plataforma.
              </p>
              {datos.aliados.misma_ocupacion.length > 0 ? (
                <div className="sx-i-autores">
                  <small className="sx-i-meta">Ahora mismo:</small>
                  {datos.aliados.misma_ocupacion.map((a) => (
                    <AutorEntrevista key={a.codigo} autor={a} nota={lineaNivel(a.nivel, false)} />
                  ))}
                </div>
              ) : (
                <small className="sx-i-meta">
                  Ahora mismo nadie más investiga {enCurso.ocupacion.titulo}.
                </small>
              )}
              {otras > 0 && (
                <small className="sx-i-meta">
                  {' '}
                  Y {otras}{' '}
                  {otras === 1
                    ? 'compañero más investiga otra ocupación'
                    : 'compañeros más investigan otras ocupaciones'}
                  .
                </small>
              )}
            </div>
          </li>
          <li>
            <span className="sx-i-numero-redondo">2</span>
            <p>
              <strong>Busca a alguien que ejerza esta ocupación:</strong> un familiar, un conocido o alguien
              que te recomienden. Pídele unos 15 minutos.
            </p>
          </li>
          <li>
            <span className="sx-i-numero-redondo">3</span>
            <p>
              <strong>Conversa, no interrogues.</strong> Lleva tus preguntas, pero sigue lo que te cuente.
              Graba en video con su permiso.
            </p>
          </li>
          <li>
            <span className="sx-i-numero-redondo">4</span>
            <p>
              <strong>Súbela a YouTube como «No listado»</strong> y vuelve aquí para publicarla con un resumen
              y el enlace. Solo tu salón y tu orientadora la verán.
            </p>
          </li>
        </ol>
        <div className="sx-i-acciones">
          <Link className="sx-i-boton" data-tono="azul" to={appPaths.student.investigations}>
            Ir a Investigaciones
          </Link>
          <button type="button" className="sx-i-boton" onClick={onEditar}>
            Editar mi guion
          </button>
        </div>
        <details className="sx-i-desplegable">
          <summary>Preguntas que llevarás a la entrevista</summary>
          <ol className="sx-i-lista-guion">
            {lineas.map((linea) => (
              <li key={linea}>{linea}</li>
            ))}
          </ol>
          <button type="button" className="sx-i-boton" data-tono="claro" onClick={copiar}>
            <Copy aria-hidden="true" size={16} /> {copiado ? 'Copiadas' : 'Copiar preguntas'}
          </button>
        </details>
      </section>
      <aside className="sx-i-lateral">
        <section className="sx-i-panel">
          <h3>Consejos para una buena entrevista</h3>
          <ul className="sx-i-consejos">
            {CONSEJOS.map(([titulo, texto]) => (
              <li key={titulo}>
                <strong>{titulo}</strong> {texto}
              </li>
            ))}
          </ul>
        </section>
        <section className="sx-i-panel sx-i-panel-leyenda">
          <h3>
            <Crown aria-hidden="true" size={18} /> Camino a Leyenda
          </h3>
          <p>
            Si tu orientadora la destaca y al menos <strong>{datos.favoritos_leyenda} compañeros</strong> la
            guardan en favoritos, pasa al Salón de Leyendas: la verán todos los salones y las promociones que
            vienen, y tendrás un sello en tu pasaporte.
          </p>
          <p>
            Lo que hace Leyenda a una entrevista no es la cámara: es que se sienta como una conversación de
            verdad y que quien la vea aprenda algo que no sabía de esa ocupación.
          </p>
        </section>
      </aside>
    </div>
  )
}
