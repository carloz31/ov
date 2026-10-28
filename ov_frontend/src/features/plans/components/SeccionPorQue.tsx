import { Textarea } from '@/components/ui/Textarea'
import {
  IDEAS_ORIGEN,
  pideMasRelato,
  textoIdea,
  textoMotivo,
  type BorradorPorQue,
  type MotivoBorrador,
} from '@/lib/servidor/adaptadoresPlanes'
import type { OpcionesTarjeta, PlanCarrera } from '@/types/servidor'
import { ChipsElegibles } from './ChipsElegibles'

type Encaje = { carrera: string; principal: string; segundo: string } | null

const mismoMotivo = (a: MotivoBorrador, codigo: string) => 'opcion' in a && a.opcion === codigo
const normal = (texto: string) => texto.trim().toLocaleLowerCase('es')

// F07a (F07b-pantallas §4.2): «Por qué la elijo». En lectura, idea, motivos (el principal primero) y lo que vivió,
// con la repregunta fija si quedó en proceso; en edición, los tres campos. Arriba, «Cómo encaja contigo».
export function SeccionPorQue({
  plan,
  opciones,
  encaje,
  borrador,
  onCambiar,
  onEditar,
}: {
  plan: PlanCarrera
  opciones: OpcionesTarjeta
  encaje: Encaje
  borrador: BorradorPorQue | null
  onCambiar: (cambio: (b: BorradorPorQue) => BorradorPorQue) => void
  onEditar: () => void
}) {
  const bloqueEncaje = encaje && (
    <div className="sx-p-encaje">
      <strong>Cómo encaja contigo</strong>
      <p>
        {plan.carrera.nombre} es de tipo <strong>{encaje.carrera}</strong>. Tu tipo principal es{' '}
        <strong>{encaje.principal}</strong> y el segundo, <strong>{encaje.segundo}</strong>. Es una pista, no
        una regla.
      </p>
    </div>
  )
  if (!borrador)
    return (
      <>
        {bloqueEncaje}
        <dl className="sx-p-lectura">
          <div>
            <dt>Idea</dt>
            <dd className="sx-p-dato">{textoIdea(plan.idea_origen) ?? 'Todavía nada'}</dd>
          </div>
          <div>
            <dt>Motivos</dt>
            <dd className="sx-p-chips">
              {plan.motivos.length
                ? plan.motivos.map((m, i) => (
                    <span className="sx-p-chip" data-elegido="true" key={m.posicion}>
                      <span className="sx-p-orden">{i + 1}</span>
                      {textoMotivo(m, opciones)}
                    </span>
                  ))
                : 'Todavía nada'}
            </dd>
          </div>
          <div className="sx-p-ancho">
            <dt>Lo que viví</dt>
            <dd className="sx-p-dato">{plan.relato ? <em>«{plan.relato}»</em> : 'Todavía nada'}</dd>
          </div>
        </dl>
        {pideMasRelato(plan) && (
          <div className="sx-p-repregunta">
            <p>¿Puedes contar un poco más? ¿Qué pasó, con quién estabas?</p>
            <button type="button" className="sx-d-action sx-d-action-ghost" onClick={onEditar}>
              Agregar
            </button>
          </div>
        )}
      </>
    )
  // Un motivo propio repetido (sin importar mayúsculas ni espacios) no se agrega: el servidor lo rechazaría (422).
  const agregarOtro = (texto: string) =>
    onCambiar((b) =>
      b.motivos.some((m) => 'otro' in m && normal(m.otro) === normal(texto))
        ? b
        : { ...b, motivos: [...b.motivos, { otro: texto }] },
    )
  return (
    <>
      {bloqueEncaje}
      <fieldset className="sx-p-campo">
        <legend>¿De quién fue la idea?</legend>
        <div className="sx-p-opciones">
          {IDEAS_ORIGEN.map(([codigo, texto]) => (
            <button
              type="button"
              key={codigo}
              aria-pressed={borrador.idea === codigo}
              onClick={() => onCambiar((b) => ({ ...b, idea: codigo }))}
            >
              {texto}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="sx-p-campo">
        <legend>¿Qué te mueve a elegirla?</legend>
        <ChipsElegibles
          titulo="Tus motivos · el 1 es el principal"
          vacio="Todavía no marcas ninguno. El primero que marques será el principal."
          numerado
          elegidos={borrador.motivos.map((m) =>
            'otro' in m
              ? { clave: `otro-${m.otro}`, texto: m.otro }
              : { clave: m.opcion, texto: textoMotivo({ opcion: m.opcion, otro: null }, opciones) },
          )}
          disponibles={opciones.valores.filter(
            (v) => !borrador.motivos.some((m) => mismoMotivo(m, v.codigo)),
          )}
          textoOtro="Otro motivo"
          ayuda="Marcar sube el motivo a «Tus motivos»; la ✕ lo baja. Un motivo tuyo con ✕ desaparece. Escribe otro y pulsa Enter para sumarlo."
          onMarcar={(codigo) => onCambiar((b) => ({ ...b, motivos: [...b.motivos, { opcion: codigo }] }))}
          onQuitar={(indice) =>
            onCambiar((b) => ({ ...b, motivos: b.motivos.filter((_, k) => k !== indice) }))
          }
          onOtro={agregarOtro}
        />
      </fieldset>
      <label className="sx-p-campo">
        <strong>¿Qué viviste que te hizo pensar en esta carrera?</strong>
        <span className="sx-p-ayuda">Un momento, una persona, algo que te llamó la atención.</span>
        <Textarea
          value={borrador.relato}
          onChange={(e) => onCambiar((b) => ({ ...b, relato: e.target.value }))}
        />
      </label>
    </>
  )
}
