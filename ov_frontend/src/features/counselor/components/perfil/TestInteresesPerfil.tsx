import { Button } from '@/components/ui/Button'
import { BloquePanel } from '@/features/counselor/components/panel/PanelComun'
import { etiquetasCuestionario } from '@/lib/servidor/adaptadoresPanel'
import { fechaCorta, letraPlan, textosTest } from '@/lib/servidor/adaptadoresPanelEstudiante'
import { cn } from '@/lib/utils'
import type { TestIntereses } from '@/types/servidor'
import { ChipPerfil } from './ChipPerfil'

function Titulo({ texto }: { texto: string }) {
  return <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{texto}</h3>
}

// Ajuste panel-estudiantes §7.1 (boceto 07): el test de intereses, siempre primero. Las únicas barras del perfil.
export function TestInteresesPerfil({
  test,
  onVerCompleto,
}: {
  test: TestIntereses
  onVerCompleto: () => void
}) {
  const conResultado = test.barras.length > 0
  const tono = test.estado === 'LISTO' ? 'exito' : test.estado === 'POR_REVISAR' ? 'aviso' : 'neutro'
  return (
    <BloquePanel
      titulo={test.nombre}
      etiqueta={etiquetasCuestionario[test.etiqueta]}
      subtitulo={
        <>
          <ChipPerfil tono={tono}>
            {test.estado === 'LISTO' ? 'Resultado listo' : textosTest[test.estado]}
          </ChipPerfil>{' '}
          {test.fecha && `${fechaCorta(test.fecha, true)}. `}
          {test.mensaje}
        </>
      }
    >
      {test.estado === 'POR_REVISAR' && (
        <p role="note" className="rounded-lg bg-warning-soft p-3 text-sm text-warning-text">
          {test.motivo_revision === 'PLANO'
            ? 'El resultado salió plano: todas las respuestas parecidas. Puede rehacerlo.'
            : 'Lo respondió muy rápido (estimado por tiempo).'}
        </p>
      )}
      {test.rehizo_plano && test.estado !== 'POR_REVISAR' && (
        <p className="text-sm text-muted-foreground">Su primer resultado salió plano y ya rehízo el test.</p>
      )}
      {conResultado ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-2">
            <Titulo texto="Cuánto le atrae cada tipo de actividad (de 0 a 100)" />
            <ul className="space-y-2">
              {test.barras.map((b) => (
                <li key={b.codigo} className="grid grid-cols-[8rem_1fr_2rem] items-center gap-3">
                  <span className={cn(b.en_codigo && 'font-bold')}>{b.nombre}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-track" aria-hidden="true">
                    <span
                      className={cn('block h-full', b.en_codigo ? 'bg-primary' : 'bg-primary/40')}
                      style={{ width: `${b.valor}%` }}
                    />
                  </span>
                  <strong className="text-right tabular-nums">{b.valor}</strong>
                </li>
              ))}
            </ul>
          </div>
          {test.codigo.length > 0 && (
            <div className="space-y-3">
              <Titulo texto="Sus tres intereses más altos" />
              <p className="text-lg font-bold">{test.codigo.map((d) => d.nombre).join(' · ')}</p>
              {test.areas.length > 0 && (
                <>
                  <Titulo texto="Áreas sugeridas a partir de sus intereses" />
                  <div className="flex flex-wrap gap-1.5">
                    {test.areas.map((a) => (
                      <ChipPerfil key={a} tono="primario">
                        {a}
                      </ChipPerfil>
                    ))}
                  </div>
                </>
              )}
              {test.frente_planes.length > 0 && (
                <>
                  <Titulo texto="Frente a sus planes" />
                  <div className="flex flex-wrap gap-1.5">
                    {test.frente_planes.map((p) => (
                      <ChipPerfil key={p.prioridad} tono={p.en_areas ? 'exito' : 'aviso'}>
                        {letraPlan(p.prioridad)} · {p.carrera}:{' '}
                        {p.en_areas ? 'entre sus áreas sugeridas' : 'no está entre sus áreas sugeridas'}
                      </ChipPerfil>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      ) : (
        <p className="text-muted-foreground">
          {test.estado === 'SIN_EMPEZAR' ? 'Aún no lo empieza.' : 'Aún no tiene resultado.'} Respondió{' '}
          {test.partes_respondidas} de {test.partes_total} partes.
        </p>
      )}
      {test.aplicacion && (
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" className="min-h-11" onClick={onVerCompleto}>
            Ver resultado completo
          </Button>
          <span className="text-sm text-muted-foreground">Ocupaciones afines y cómo leer el resultado.</span>
        </div>
      )}
    </BloquePanel>
  )
}
