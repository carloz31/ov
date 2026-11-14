import { useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { BloquePanel } from '@/features/counselor/components/panel/PanelComun'
import { nombresTipoCarrera } from '@/lib/servidor/adaptadoresCatalogo'
import {
  fechaCorta,
  letraPlan,
  textoDudas,
  textoEnAreas,
  textoMedidor,
  textoSoles,
} from '@/lib/servidor/adaptadoresPanelEstudiante'
import { textoIdea } from '@/lib/servidor/adaptadoresPlanes'
import { cn } from '@/lib/utils'
import type { OrigenIdea, PlanCompleto, SeccionCompleta, TipoInstitucionServidor } from '@/types/servidor'
import { ChipPerfil, type TonoChip } from './ChipPerfil'
import { textoInstitucionPerfil } from '@/features/counselor/lib/perfilEstudiante'

const ESTADO: Record<SeccionCompleta['estado'], [string, TonoChip]> = {
  LISTA: ['Lista', 'exito'],
  EN_PROCESO: ['En proceso', 'aviso'],
  POR_EMPEZAR: ['Por empezar', 'neutro'],
  BLOQUEADA: ['Aún no se le abre', 'neutro'],
}
const RESPUESTA: Record<string, [string, TonoChip]> = {
  SI: ['Sí', 'exito'],
  MAS_O_MENOS: ['Más o menos', 'neutro'],
  NO: ['No', 'aviso'],
}
const mayuscula = (texto: string) => texto.charAt(0).toLocaleUpperCase('es') + texto.slice(1)

function Seccion({ numero, s, children }: { numero: number; s: SeccionCompleta; children: ReactNode }) {
  const [texto, tono] = ESTADO[s.estado]
  return (
    <Card className="flex min-w-0 flex-col gap-4 rounded-xl p-5 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">
          {numero}. {s.nombre}
        </h2>
        <ChipPerfil tono={tono}>{texto}</ChipPerfil>
      </header>
      {s.estado !== 'BLOQUEADA' && children}
    </Card>
  )
}

function Rotulo({ children }: { children: ReactNode }) {
  return <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{children}</h3>
}

function Dudas({ plan }: { plan: PlanCompleto }) {
  const [todas, setTodas] = useState(false)
  const dudas = plan.conoce!.dudas
  const visibles = todas ? dudas : dudas.slice(0, plan.conoce!.dudas_visibles)
  const abiertas = dudas.filter((d) => !d.resuelta).length
  return (
    <div className="space-y-1">
      <h3 className="font-bold">
        Sus dudas · {textoDudas(abiertas, dudas.length - abiertas).replace(' · ', ', ')}
      </h3>
      <ul className="divide-y divide-border">
        {visibles.map((d, i) => (
          <li key={i} className="flex items-start justify-between gap-3 py-2">
            <div>
              <p>{d.texto}</p>
              {d.resuelta && d.hallazgo && (
                <p className="text-sm text-muted-foreground">Lo que encontró: {d.hallazgo}</p>
              )}
            </div>
            <ChipPerfil tono={d.resuelta ? 'exito' : 'neutro'}>
              {d.resuelta ? 'Resuelta' : 'Abierta'}
            </ChipPerfil>
          </li>
        ))}
      </ul>
      {!todas && dudas.length > visibles.length && (
        <Button variant="link" className="min-h-11 px-0 font-semibold" onClick={() => setTodas(true)}>
          Ver las {dudas.length - visibles.length} dudas restantes
        </Button>
      )}
    </div>
  )
}

// Ajuste panel-estudiantes §8.2 (boceto 10): el plan completo en lectura, una tarjeta por sección; una sección que
// aún no se le abre no muestra contenido.
export function PlanCompletoPerfil({ plan, nombre }: { plan: PlanCompleto; nombre: string }) {
  const [porQue, conoce, realidad, pasos] = plan.secciones
  const r = plan.realidad
  const medidores: [string, number | null][] = [
    ['Entusiasmo', plan.medidores.entusiasmo],
    ['Se siente capaz', plan.medidores.capacidad],
    ['Recursos para lograrlo', plan.medidores.recursos],
  ]
  return (
    <div className="space-y-4">
      <BloquePanel
        titulo={`${letraPlan(plan.prioridad)} · ${plan.carrera}`}
        etiqueta={nombresTipoCarrera[plan.tipo as TipoInstitucionServidor] ?? plan.tipo}
        subtitulo={`Última actualización: ${fechaCorta(plan.actualizada_en, true)}. Todo lo que sigue lo registró ${nombre}, con sus palabras.`}
      >
        {plan.en_areas !== null && (
          <ChipPerfil tono={plan.en_areas ? 'exito' : 'aviso'}>{textoEnAreas(plan.en_areas)}</ChipPerfil>
        )}
        <Rotulo>Cómo se ve frente a este plan</Rotulo>
        <div className="grid gap-2 sm:grid-cols-3">
          {medidores.map(([titulo, valor]) => (
            <div key={titulo} className={cn('rounded-lg p-3', valor === 1 ? 'bg-warning-soft' : 'bg-muted')}>
              <p className="text-sm">{titulo}</p>
              <p className="font-bold">{textoMedidor(valor)}</p>
            </div>
          ))}
        </div>
      </BloquePanel>
      {porQue && (
        <Seccion numero={1} s={porQue}>
          {plan.por_que && (
            <>
              <Rotulo>¿De quién fue la idea?</Rotulo>
              {plan.por_que.idea_origen && (
                <ChipPerfil tono={plan.por_que.idea_origen === 'MIA' ? 'neutro' : 'aviso'}>
                  {textoIdea(plan.por_que.idea_origen as OrigenIdea) ?? plan.por_que.idea_origen}
                </ChipPerfil>
              )}
              <Rotulo>Qué la mueve, en su orden</Rotulo>
              <ol className="list-decimal pl-5">
                {plan.por_que.motivos.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ol>
              {plan.por_que.relato && (
                <>
                  <Rotulo>En sus palabras</Rotulo>
                  <p className="rounded-lg bg-muted p-3">«{plan.por_que.relato}»</p>
                </>
              )}
            </>
          )}
        </Seccion>
      )}
      {conoce && (
        <Seccion numero={2} s={conoce}>
          {plan.conoce && (
            <>
              <ul className="divide-y divide-border">
                {plan.conoce.preguntas.map((p) => (
                  <li key={p.codigo} className="flex items-center justify-between gap-3 py-2">
                    <span>{mayuscula(p.texto)}</span>
                    {p.respuesta ? (
                      <ChipPerfil tono={RESPUESTA[p.respuesta][1]}>{RESPUESTA[p.respuesta][0]}</ChipPerfil>
                    ) : (
                      <span className="text-sm text-muted-foreground">Sin responder</span>
                    )}
                  </li>
                ))}
              </ul>
              {plan.conoce.dudas.length > 0 && <Dudas plan={plan} />}
            </>
          )}
        </Seccion>
      )}
      {realidad && (
        <Seccion numero={3} s={realidad}>
          {r && (
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Rotulo>Dónde estudiaría</Rotulo>
                <p>
                  {r.institucion
                    ? `${textoInstitucionPerfil(r.institucion)}${r.ciclos ? ` · ${r.ciclos} ciclos` : ''}`
                    : 'Sin elegir'}
                </p>
              </div>
              <div>
                <Rotulo>Cómo llegaría</Rotulo>
                <p>{r.camino ?? 'Sin registrar'}</p>
              </div>
              <div>
                <Rotulo>Costos que registró</Rotulo>
                {r.costo_primer_anio === null ? (
                  <p>Sin registrar</p>
                ) : (
                  <>
                    <p>
                      <strong>{textoSoles(r.costo_primer_anio)}</strong> el primer año
                      {r.costo_carrera !== null && (
                        <>
                          {' '}
                          · <strong>{textoSoles(r.costo_carrera)}</strong> toda la carrera
                        </>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">{r.rubros.join(', ')}.</p>
                  </>
                )}
              </div>
              <div className="sm:col-span-3">
                <Rotulo>Cómo lo pagaría</Rotulo>
                <p>{r.financiamiento.length ? r.financiamiento.join(' · ') : 'Sin registrar'}</p>
              </div>
              <div className="flex flex-wrap gap-1.5 sm:col-span-3">
                <Rotulo>Lo que podría complicarlo</Rotulo>
                {r.complicaciones.map((c) => (
                  <ChipPerfil key={c} tono="aviso">
                    {c}
                  </ChipPerfil>
                ))}
              </div>
            </div>
          )}
        </Seccion>
      )}
      {pasos && (
        <Seccion numero={4} s={pasos}>
          {plan.pasos && (
            <>
              <p className="text-sm text-muted-foreground">
                {plan.pasos.filter((p) => p.hecho).length} de {plan.pasos.length} hechos. Primero los
                pendientes.
              </p>
              <ul className="divide-y divide-border">
                {plan.pasos.map((p, i) => (
                  <li key={i} className="flex items-start justify-between gap-3 py-2">
                    <div>
                      <p>{p.texto}</p>
                      {p.sale_de && (
                        <p className="text-sm text-muted-foreground">Sale de su duda: {p.sale_de}</p>
                      )}
                      {p.hecho && p.hallazgo && (
                        <p className="text-sm text-muted-foreground">Lo que encontró: {p.hallazgo}</p>
                      )}
                    </div>
                    <ChipPerfil tono={p.hecho ? 'exito' : 'neutro'}>
                      {p.hecho ? `Hecho${p.hecho_en ? ` · ${fechaCorta(p.hecho_en)}` : ''}` : 'Pendiente'}
                    </ChipPerfil>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Seccion>
      )}
    </div>
  )
}
