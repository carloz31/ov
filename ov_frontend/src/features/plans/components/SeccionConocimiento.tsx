import { Link } from 'react-router'
import { CircleCheck, CircleHelp, X } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import {
  conCarrera,
  dudasDePregunta,
  ORIGENES_DUDA,
  respuestaLeida,
  RESPUESTAS_CONOCIMIENTO,
  resumenDudas,
  type BorradorConocimiento,
} from '@/lib/servidor/adaptadoresPlanes'
import { discoveryPaths } from '@/routes/discoveryPaths'
import type { OpcionesTarjeta, PlanCarrera } from '@/types/servidor'

const NOTA_RESPUESTA = { SI: '«Sí»', MAS_O_MENOS: '«Más o menos»', NO: '«No»' }

// F07a (F07b-pantallas §4.3): «Qué tanto la conozco». En edición, las cinco preguntas y «Mis dudas» con la vista
// previa de lo que hará el servidor al guardar (las de respuesta se crean, se conservan o se resuelven solas); las
// sugeridas y las propias se agregan y se quitan. En lectura, cada respuesta y las dudas con su origen y estado.
export function SeccionConocimiento({
  plan,
  opciones,
  borrador,
  onCambiar,
}: {
  plan: PlanCarrera
  opciones: OpcionesTarjeta
  borrador: BorradorConocimiento | null
  onCambiar: (cambio: (b: BorradorConocimiento) => BorradorConocimiento) => void
}) {
  const carrera = plan.carrera.nombre
  if (!borrador)
    return (
      <>
        <ul className="sx-p-preguntas">
          {opciones.preguntas.map((p) => (
            <li key={p.codigo}>
              <span>{conCarrera(p.texto, carrera)}</span>
              {respuestaLeida(plan, p.codigo) && (
                <span className="sx-p-respuesta">{respuestaLeida(plan, p.codigo)}</span>
              )}
            </li>
          ))}
        </ul>
        <h3 className="sx-p-subtitulo">Mis dudas</h3>
        <p className="sx-p-ayuda">{resumenDudas(plan.dudas)}</p>
        <ul className="sx-p-dudas">
          {plan.dudas.map((d) => (
            <li key={d.numero} data-estado={d.estado}>
              {d.estado === 'CERRADA' ? <CircleCheck aria-hidden="true" /> : <CircleHelp aria-hidden="true" />}
              <div>
                {d.estado === 'CERRADA' ? <s>{d.texto}</s> : <span>{d.texto}</span>}
                <small>{d.estado === 'CERRADA' ? 'Resuelta' : ORIGENES_DUDA[d.origen]}</small>
                {d.estado === 'CERRADA' && d.hallazgo && <p>{d.hallazgo}</p>}
              </div>
            </li>
          ))}
        </ul>
      </>
    )
  const previa = dudasDePregunta(plan, borrador, opciones)
  const sugeridasLibres = opciones.dudas_sugeridas.filter(
    (s) => !borrador.dudas.some((d) => d.origen === 'SUGERIDA' && ('opcion' in d ? d.opcion === s.codigo : d.texto === s.texto)),
  )
  const quitar = (indice: number) => onCambiar((b) => ({ ...b, dudas: b.dudas.filter((_, i) => i !== indice) }))
  return (
    <>
      <p className="sx-p-intro">
        Responde con sinceridad. Si no podrías explicarlo en una frase, marca <em>Más o menos</em>. Lo que no sepas se
        convierte en una duda, y cada duda te puede dar un próximo paso.{' '}
        <Link to={discoveryPaths.career(plan.carrera.codigo)}>Ver la ficha de la carrera</Link>
      </p>
      <ul className="sx-p-preguntas">
        {opciones.preguntas.map((p) => (
          <li key={p.codigo} data-falta={!borrador.respuestas[p.codigo]}>
            <span>
              {conCarrera(p.texto, carrera)}
              {!borrador.respuestas[p.codigo] && (
                <small>Falta responder esta para que la sección quede lista.</small>
              )}
            </span>
            <span className="sx-p-opciones" role="group" aria-label={conCarrera(p.texto, carrera)}>
              {RESPUESTAS_CONOCIMIENTO.map(([codigo, texto]) => (
                <button
                  type="button"
                  key={codigo}
                  aria-pressed={borrador.respuestas[p.codigo] === codigo}
                  onClick={() => onCambiar((b) => ({ ...b, respuestas: { ...b.respuestas, [p.codigo]: codigo } }))}
                >
                  {texto}
                </button>
              ))}
            </span>
          </li>
        ))}
      </ul>
      <h3 className="sx-p-subtitulo">Mis dudas</h3>
      <p className="sx-p-ayuda">Las que salen de tus respuestas y las que tú agregues.</p>
      <ul className="sx-p-dudas">
        {previa.map((d) => (
          <li key={d.pregunta} data-efecto={d.efecto}>
            <CircleHelp aria-hidden="true" />
            <div>
              {d.efecto === 'resolver' ? <s>{d.texto}</s> : <span>{d.texto}</span>}
              <small>
                De tu respuesta {NOTA_RESPUESTA[d.respuesta]}
                {d.efecto === 'crear' && ' · se creará al guardar'}
                {d.efecto === 'resolver' && ' · se resolverá al guardar'}
              </small>
            </div>
          </li>
        ))}
        {borrador.dudas.map((d, i) => (
          <li key={'numero' in d ? `n${d.numero}` : 'clave' in d ? `p${d.clave}` : `s${d.opcion}`}>
            <CircleHelp aria-hidden="true" />
            <div>
              {d.origen === 'PROPIA' && !('numero' in d) ? (
                <Input
                  aria-label="Tu duda"
                  value={d.texto}
                  onChange={(e) =>
                    onCambiar((b) => ({
                      ...b,
                      dudas: b.dudas.map((x, j) => (j === i ? { ...d, texto: e.target.value } : x)),
                    }))
                  }
                />
              ) : (
                <span>{d.texto}</span>
              )}
              <small>
                {ORIGENES_DUDA[d.origen]}
                {!('numero' in d) && ' · se creará al guardar'}
              </small>
            </div>
            <button type="button" className="sx-d-icon" aria-label="Quitar duda" onClick={() => quitar(i)}>
              <X aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      <div className="sx-p-chips">
        {sugeridasLibres.map((s) => (
          <button
            type="button"
            className="sx-p-chip sx-p-chip-nuevo"
            key={s.codigo}
            onClick={() =>
              onCambiar((b) => ({ ...b, dudas: [...b.dudas, { origen: 'SUGERIDA', opcion: s.codigo, texto: s.texto }] }))
            }
          >
            + {s.texto}
          </button>
        ))}
        <button
          type="button"
          className="sx-p-chip sx-p-chip-nuevo"
          onClick={() =>
            onCambiar((b) => ({ ...b, dudas: [...b.dudas, { origen: 'PROPIA', texto: '', clave: Date.now() }] }))
          }
        >
          + Escribir otra duda
        </button>
      </div>
      <p className="sx-p-ayuda">Guardar puede tardar unos segundos.</p>
    </>
  )
}
