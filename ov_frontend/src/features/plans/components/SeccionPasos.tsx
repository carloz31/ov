import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { origenPaso, sugerenciasPendientes } from '@/lib/servidor/adaptadoresPlanes'
import {
  aceptarSugerencia,
  descartarSugerencia,
  nuevoPaso,
  sugerenciasEnEspera,
  type BorradorPasos,
  type PasoBorrador,
} from '@/lib/servidor/adaptadoresPlanesEdicion'
import type { OpcionesTarjeta, PasoPublico, PlanCarrera } from '@/types/servidor'
import { InsigniaPaso } from './InsigniaPaso'
import { SelectTipoPaso } from './SelectTipoPaso'
import { SugerenciasPasos } from './SugerenciasPasos'

const claveDe = (p: PasoBorrador) =>
  'numero' in p ? `n${p.numero}` : 'sugerencia' in p ? `s${p.sugerencia}` : `c${p.clave}`

// Un paso hecho: check, tipo, texto tachado y «Hecho · {hallazgo}».
function PasoHecho({
  paso,
  opciones,
  nota,
}: {
  paso: PasoPublico
  opciones: OpcionesTarjeta
  nota?: string
}) {
  return (
    <li className="sx-p-paso" data-estado="HECHO">
      <span className="sx-p-casilla-paso" aria-hidden="true">
        <Check size={14} />
      </span>
      <div>
        <p>
          <InsigniaPaso tipo={paso.tipo} opciones={opciones} /> <s>{paso.texto}</s>
        </p>
        <small>
          <strong>Hecho</strong>
          {paso.hallazgo && ` · ${paso.hallazgo}`}
        </small>
        {nota && <small>{nota}</small>}
      </div>
    </li>
  )
}

// F07b (§8 con la corrección de lectura; lienzo de la sección 4): «Mis próximos pasos». En lectura, la franja de
// sugerencias que esperan (abre la edición), los pendientes con su casilla «Lo hice» y los hechos tachados; en
// edición, el bloque de sugerencias, los pendientes editables, la fila para escribir uno nuevo y los hechos aparte.
export function SeccionPasos({
  plan,
  opciones,
  borrador,
  onCambiar,
  onRevisar,
  onLoHice,
}: {
  plan: PlanCarrera
  opciones: OpcionesTarjeta
  borrador: BorradorPasos | null
  onCambiar: (cambio: (b: BorradorPasos) => BorradorPasos) => void
  onRevisar: () => void
  onLoHice: (paso: PasoPublico) => void
}) {
  const [nuevo, setNuevo] = useState({ tipo: '', texto: '' })
  const hechos = plan.pasos.filter((p) => p.estado === 'HECHO')
  if (!borrador) {
    const m = sugerenciasPendientes(plan).length
    const pendientes = plan.pasos.filter((p) => p.estado === 'PENDIENTE')
    return (
      <>
        {m > 0 && (
          <div className="sx-p-franja">
            <p>
              <strong>{m === 1 ? '1 sugerencia' : `${m} sugerencias`}</strong>{' '}
              {m === 1 ? 'espera' : 'esperan'} tu decisión.
            </p>
            <button type="button" className="sx-p-mini" onClick={onRevisar}>
              Revisarlas
            </button>
          </div>
        )}
        {plan.pasos.length ? (
          <ul className="sx-p-pasos">
            {pendientes.map((p) => {
              const origen = origenPaso(plan, p, opciones)
              return (
                <li className="sx-p-paso" key={p.numero}>
                  <button
                    type="button"
                    className="sx-p-casilla-paso"
                    title="Lo hice"
                    aria-label={`Lo hice: ${p.texto}`}
                    onClick={() => onLoHice(p)}
                  />
                  <div>
                    <p>
                      <InsigniaPaso tipo={p.tipo} opciones={opciones} /> {p.texto}
                    </p>
                    {origen && <small>para: {origen}</small>}
                  </div>
                </li>
              )
            })}
            {hechos.map((p) => (
              <PasoHecho key={p.numero} paso={p} opciones={opciones} />
            ))}
          </ul>
        ) : (
          <p className="sx-p-ayuda">Todavía no tienes pasos.</p>
        )}
      </>
    )
  }
  const cambiarPaso = (indice: number, cambio: Partial<{ tipo: string; texto: string }>) =>
    onCambiar((b) => ({ ...b, pasos: b.pasos.map((p, i) => (i === indice ? { ...p, ...cambio } : p)) }))
  // La fila nueva se suma al confirmar (Enter o salir con texto); sin tipo elegido, toma el último («Otra»).
  const confirmarNuevo = () => {
    const texto = nuevo.texto.trim()
    if (!texto) return
    const tipo = nuevo.tipo || opciones.pasos.at(-1)?.codigo || ''
    onCambiar((b) => ({ ...b, pasos: [...b.pasos, nuevoPaso(tipo, texto)] }))
    setNuevo({ tipo: '', texto: '' })
  }
  return (
    <>
      <SugerenciasPasos
        sugerencias={sugerenciasEnEspera(plan, borrador)}
        opciones={opciones}
        onAgregar={(numero, tipo, texto) => onCambiar((b) => aceptarSugerencia(b, plan, numero, tipo, texto))}
        onDescartar={(numero) => onCambiar((b) => descartarSugerencia(b, numero))}
      />
      <section className="sx-p-campo" aria-labelledby="sx-p-mis-pasos">
        <strong id="sx-p-mis-pasos">Mis pasos</strong>
        <span className="sx-p-ayuda">Sin fechas: cada paso está pendiente o hecho.</span>
        <ul className="sx-p-pasos">
          {borrador.pasos.map((p, i) => (
            <li className="sx-p-paso" key={claveDe(p)}>
              <div className="sx-p-paso-fila">
                <SelectTipoPaso
                  valor={p.tipo}
                  opciones={opciones}
                  etiqueta="Tipo del paso"
                  onCambiar={(tipo) => cambiarPaso(i, { tipo })}
                />
                <Textarea
                  aria-label="Texto del paso"
                  rows={2}
                  value={p.texto}
                  onChange={(e) => cambiarPaso(i, { texto: e.target.value })}
                />
                <button
                  type="button"
                  className="sx-d-icon"
                  aria-label={`Quitar ${p.texto}`}
                  onClick={() => onCambiar((b) => ({ ...b, pasos: b.pasos.filter((_, j) => j !== i) }))}
                >
                  <X aria-hidden="true" />
                </button>
              </div>
              <small>{'origen' in p && p.origen ? `para: ${p.origen}` : 'paso tuyo'}</small>
            </li>
          ))}
          <li className="sx-p-paso" data-nuevo="true">
            <div className="sx-p-paso-fila">
              <SelectTipoPaso
                valor={nuevo.tipo}
                opciones={opciones}
                etiqueta="Tipo del paso nuevo"
                onCambiar={(tipo) => setNuevo((n) => ({ ...n, tipo }))}
              />
              <Input
                aria-label="Escribir un paso"
                placeholder="+ Escribir un paso"
                value={nuevo.texto}
                onChange={(e) => setNuevo((n) => ({ ...n, texto: e.target.value }))}
                onBlur={confirmarNuevo}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    confirmarNuevo()
                  }
                }}
              />
            </div>
          </li>
          {hechos.map((p) => (
            <PasoHecho
              key={p.numero}
              paso={p}
              opciones={opciones}
              nota="Los pasos hechos no se editan ni se borran aquí."
            />
          ))}
        </ul>
      </section>
    </>
  )
}
