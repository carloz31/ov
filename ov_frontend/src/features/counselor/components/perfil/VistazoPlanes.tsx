import type { ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { BloquePanel } from '@/features/counselor/components/panel/PanelComun'
import { nombresTipoCarrera } from '@/lib/servidor/adaptadoresCatalogo'
import {
  letraPlan,
  textoConoce,
  textoDudas,
  textoEnAreas,
  textoSoles,
} from '@/lib/servidor/adaptadoresPanelEstudiante'
import { MEDIDORES, nivelMedidor, textoIdea } from '@/lib/servidor/adaptadoresPlanes'
import type { OrigenIdea, PlanesEstudiante, PlanVistazo, TipoInstitucionServidor } from '@/types/servidor'
import { ChipPerfil } from './ChipPerfil'
import { textoInstitucionPerfil } from '@/features/counselor/lib/perfilEstudiante'

const SIN = <ChipPerfil>Sin registrar</ChipPerfil>
const FILAS: [string, (p: PlanVistazo) => ReactNode][] = [
  ['Tipo de carrera', (p) => nombresTipoCarrera[p.tipo as TipoInstitucionServidor] ?? p.tipo],
  [
    'Áreas sugeridas',
    (p) =>
      p.en_areas === null ? (
        '—'
      ) : (
        <ChipPerfil tono={p.en_areas ? 'exito' : 'aviso'}>{textoEnAreas(p.en_areas)}</ChipPerfil>
      ),
  ],
  [
    'Dónde estudiaría',
    (p) => (p.institucion ? textoInstitucionPerfil(p.institucion) : <ChipPerfil>Sin elegir</ChipPerfil>),
  ],
  [
    '¿De quién fue la idea?',
    (p) =>
      p.idea_origen ? (
        <ChipPerfil tono={p.idea_origen === 'MIA' ? 'neutro' : 'aviso'}>
          {textoIdea(p.idea_origen as OrigenIdea) ?? p.idea_origen}
        </ChipPerfil>
      ) : (
        SIN
      ),
  ],
  ['Motivo principal', (p) => p.motivo_principal ?? SIN],
  ['Qué tanto la conoce', (p) => (p.conoce_respondidas ? textoConoce(p.conoce_si, p.conoce_total) : SIN)],
  ['Dudas', (p) => textoDudas(p.dudas_abiertas, p.dudas_resueltas)],
  [
    'Costo del primer año',
    (p) =>
      p.costo_primer_anio === null
        ? SIN
        : [
            textoSoles(p.costo_primer_anio),
            p.financiamiento.length
              ? `lo pagaría con ${p.financiamiento.join(' y ').toLocaleLowerCase('es')}`
              : null,
          ]
            .filter(Boolean)
            .join(' · '),
  ],
  [
    'Lo que podría complicarlo',
    (p) =>
      p.complicaciones.length ? (
        <span className="flex flex-wrap gap-1">
          {p.complicaciones.map((c) => (
            <ChipPerfil key={c} tono="aviso">
              {c}
            </ChipPerfil>
          ))}
        </span>
      ) : (
        SIN
      ),
  ],
  [
    'Próximos pasos',
    (p) =>
      p.pasos_total ? `${p.pasos_hechos} de ${p.pasos_total} hechos` : <ChipPerfil>Sin pasos</ChipPerfil>,
  ],
  [
    'Cómo se ve frente al plan',
    (p) => MEDIDORES.map((m) => `${m.nombre}: ${nivelMedidor(p.medidores[m.codigo])}`).join(' · '),
  ],
  ['Partes llenas', (p) => `${p.secciones_listas} de ${p.secciones_total}`],
]

// Ajuste panel-estudiantes §8.1 (boceto 09): sus planes lado a lado y «Antes de sus planes».
export function VistazoPlanes({
  datos,
  onAbrir,
}: {
  datos: PlanesEstudiante
  onAbrir: (prioridad: number) => void
}) {
  const columnas = Array.from(
    { length: datos.maximo_planes },
    (_, i) => datos.planes.find((p) => p.prioridad === i + 1) ?? i + 1,
  )
  const a = datos.antes
  return (
    <div className="space-y-4">
      <BloquePanel
        titulo="Sus planes, de un vistazo"
        subtitulo="Lo esencial de cada plan, lado a lado. Abra un plan para leer todo lo que registró."
      >
        {datos.planes.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-muted text-left">
                <tr>
                  <td />
                  {columnas.map((c) => (
                    <th key={typeof c === 'number' ? c : c.prioridad} scope="col" className="px-3 py-2">
                      {typeof c === 'number' ? (
                        <span className="text-muted-foreground">{letraPlan(c)}</span>
                      ) : (
                        `${letraPlan(c.prioridad)} · ${c.carrera}`
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FILAS.map(([titulo, valor]) => (
                  <tr key={titulo} className="border-t border-border align-top">
                    <th
                      scope="row"
                      className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground"
                    >
                      {titulo}
                    </th>
                    {columnas.map((c) => (
                      <td key={typeof c === 'number' ? c : c.prioridad} className="px-3 py-2">
                        {typeof c === 'number' ? '—' : valor(c)}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="border-t border-border">
                  <td />
                  {columnas.map((c) => (
                    <td key={typeof c === 'number' ? c : c.prioridad} className="px-3 py-2">
                      {typeof c === 'number' ? (
                        <span className="text-muted-foreground">Sin registrar</span>
                      ) : (
                        <Button variant="outline" className="min-h-11" onClick={() => onAbrir(c.prioridad)}>
                          Ver {letraPlan(c.prioridad)} completo
                        </Button>
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted-foreground">Todavía no registra planes.</p>
        )}
      </BloquePanel>
      <BloquePanel titulo="Antes de sus planes">
        {a.opcion_inicial && (
          <p>
            {a.plan_a && a.plan_a !== a.opcion_inicial ? (
              <>
                Al empezar la ruta pensaba en <strong>{a.opcion_inicial}</strong>. Hoy su Plan A es{' '}
                <strong>{a.plan_a}</strong>.
              </>
            ) : a.plan_a ? (
              <>
                Mantiene como Plan A la carrera en la que pensaba al empezar: <strong>{a.plan_a}</strong>.
              </>
            ) : (
              <>
                Al empezar la ruta pensaba en <strong>{a.opcion_inicial}</strong>.
              </>
            )}
          </p>
        )}
        {[
          ['Carreras que guardó como favoritas', a.carreras_favoritas],
          ['Instituciones que guardó como favoritas', a.instituciones_favoritas],
        ].map(([titulo, nombres]) => (
          <div key={titulo as string} className="space-y-1 border-t border-border pt-3">
            <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{titulo}</h3>
            {(nombres as string[]).length ? (
              <div className="flex flex-wrap gap-1.5">
                {(nombres as string[]).map((n) => (
                  <ChipPerfil key={n} tono="primario">
                    {n}
                  </ChipPerfil>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Ninguna todavía.</p>
            )}
          </div>
        ))}
      </BloquePanel>
    </div>
  )
}
