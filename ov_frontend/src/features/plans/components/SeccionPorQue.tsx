import { useState } from 'react'
import { Input } from '@/components/ui/Input'
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

type Encaje = { carrera: string; principal: string; segundo: string } | null

const mismoMotivo = (a: MotivoBorrador, codigo: string) => 'opcion' in a && a.opcion === codigo

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
  const [otro, setOtro] = useState(false)
  const bloqueEncaje = encaje && (
    <div className="sx-p-encaje">
      <strong>Cómo encaja contigo</strong>
      <p>
        {plan.carrera.nombre} es de tipo <strong>{encaje.carrera}</strong>. Tu tipo principal es{' '}
        <strong>{encaje.principal}</strong> y el segundo, <strong>{encaje.segundo}</strong>. Es una pista, no una
        regla.
      </p>
    </div>
  )
  if (!borrador)
    return (
      <>
        {bloqueEncaje}
        <dl className="sx-p-lectura">
          <dt>Idea</dt>
          <dd>{textoIdea(plan.idea_origen) ?? 'Todavía nada'}</dd>
          <dt>Motivos</dt>
          <dd className="sx-p-chips">
            {plan.motivos.length
              ? plan.motivos.map((m, i) => (
                  <span className="sx-p-chip" data-elegido="true" key={m.posicion}>
                    {i === 0 && <span className="sx-p-orden">1</span>}
                    {textoMotivo(m, opciones)}
                  </span>
                ))
              : 'Todavía nada'}
          </dd>
          <dt>Lo que viví</dt>
          <dd>{plan.relato ? <em>«{plan.relato}»</em> : 'Todavía nada'}</dd>
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
  const otroMotivo = borrador.motivos.find((m) => 'otro' in m) as { otro: string } | undefined
  const alternar = (codigo: string) =>
    onCambiar((b) => ({
      ...b,
      motivos: b.motivos.some((m) => mismoMotivo(m, codigo))
        ? b.motivos.filter((m) => !mismoMotivo(m, codigo))
        : [...b.motivos, { opcion: codigo }],
    }))
  const cambiarOtro = (texto: string) =>
    onCambiar((b) => ({
      ...b,
      motivos: b.motivos.some((m) => 'otro' in m)
        ? b.motivos.map((m) => ('otro' in m ? { otro: texto } : m))
        : [...b.motivos, { otro: texto }],
    }))
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
        <p className="sx-p-ayuda">Marca todos los que pesen. El primero que marques será el principal.</p>
        <div className="sx-p-chips">
          {opciones.valores.map((v) => {
            const posicion = borrador.motivos.findIndex((m) => mismoMotivo(m, v.codigo))
            return (
              <button
                type="button"
                className="sx-p-chip"
                key={v.codigo}
                aria-pressed={posicion >= 0}
                data-elegido={posicion >= 0}
                onClick={() => alternar(v.codigo)}
              >
                {posicion >= 0 && <span className="sx-p-orden">{posicion + 1}</span>}
                {v.texto}
              </button>
            )
          })}
          {otro || otroMotivo ? (
            <Input
              className="sx-p-otro"
              aria-label="Otro motivo"
              value={otroMotivo?.otro ?? ''}
              onChange={(e) => cambiarOtro(e.target.value)}
            />
          ) : (
            <button type="button" className="sx-p-chip sx-p-chip-nuevo" onClick={() => setOtro(true)}>
              + Otro motivo
            </button>
          )}
        </div>
      </fieldset>
      <label className="sx-p-campo">
        <strong>¿Qué viviste que te hizo pensar en esta carrera?</strong>
        <span className="sx-p-ayuda">Un momento, una persona, algo que te llamó la atención.</span>
        <Textarea value={borrador.relato} onChange={(e) => onCambiar((b) => ({ ...b, relato: e.target.value }))} />
      </label>
    </>
  )
}
