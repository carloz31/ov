import { Button } from '@/components/ui/Button'
import { BloquePanel } from '@/features/counselor/components/panel/PanelComun'
import {
  fechaCorta,
  gruposComoEmpezo,
  letraPlan,
  textoEnAreas,
  textosTest,
  textosZona,
} from '@/lib/servidor/adaptadoresPanelEstudiante'
import type { DestinoPerfil, PerfilEstudiante } from '@/types/servidor'
import { ChipPerfil } from './ChipPerfil'
import { textoInstitucionPerfil } from '@/features/counselor/lib/perfilEstudiante'
// Ajuste partida-llegada-liviano §5: el título del grupo lleva el color del cambio (o ámbar solo en Por trabajar).
const COLOR_GRUPO: Record<string, string> = {
  'Por trabajar': 'text-warning-text',
  Bajó: 'text-warning-text',
  'Sigue por trabajar': 'text-warning-text',
  Subió: 'text-success-text',
}

function Ir({ etiqueta, onClick }: { etiqueta: string; onClick: () => void }) {
  return (
    <Button variant="outline" className="mt-auto min-h-11 w-fit" onClick={onClick}>
      {etiqueta}
    </Button>
  )
}

function LoQueLeInteresa({ datos, onIr }: { datos: PerfilEstudiante; onIr: (d: DestinoPerfil) => void }) {
  const i = datos.intereses
  return (
    <BloquePanel
      titulo="Lo que le interesa"
      subtitulo={
        i && (
          <>
            Test de intereses ·{' '}
            <ChipPerfil
              tono={i.estado === 'LISTO' ? 'exito' : i.estado === 'POR_REVISAR' ? 'aviso' : 'neutro'}
            >
              {i.estado === 'LISTO' ? 'Resultado listo' : textosTest[i.estado]}
            </ChipPerfil>{' '}
            {i.fecha && fechaCorta(i.fecha)}
          </>
        )
      }
    >
      {i?.codigo.length ? (
        <>
          <p className="text-lg font-bold">{i.codigo.map((d) => d.nombre).join(' · ')}</p>
          {i.areas.length > 0 && (
            <div className="space-y-1">
              <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Áreas sugeridas
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {i.areas.map((a) => (
                  <ChipPerfil key={a} tono="primario">
                    {a}
                  </ChipPerfil>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="text-muted-foreground">
          {i?.motivo_revision === 'PLANO'
            ? 'El resultado salió plano.'
            : `Aún no tiene resultado${i ? `. Respondió ${i.partes_respondidas} de ${i.partes_total} partes.` : '.'}`}
        </p>
      )}
      {i?.motivo_revision === 'PRISA' && (
        <p className="text-sm text-warning-text">Lo respondió muy rápido (estimado por tiempo).</p>
      )}
      <Ir etiqueta="Ver tests" onClick={() => onIr('TESTS')} />
    </BloquePanel>
  )
}

function LoQueEstaPensando({ datos, onIr }: { datos: PerfilEstudiante; onIr: (d: DestinoPerfil) => void }) {
  const faltan = datos.planes.length
    ? [1, 2, 3].filter((p) => !datos.planes.some((x) => x.prioridad === p))
    : []
  return (
    <BloquePanel titulo="Lo que está pensando" subtitulo="Sus planes de carrera, en su orden.">
      {datos.planes.length ? (
        <ul className="divide-y divide-border">
          {datos.planes.map((p) => (
            <li key={p.prioridad} className="space-y-1 py-2">
              <p className="font-bold">
                {letraPlan(p.prioridad)} · {p.carrera}
              </p>
              <p className="text-sm text-muted-foreground">
                {p.institucion ? textoInstitucionPerfil(p.institucion) : 'Aún sin institución'}
              </p>
              {p.en_areas !== null && (
                <ChipPerfil tono={p.en_areas ? 'exito' : 'aviso'}>{textoEnAreas(p.en_areas)}</ChipPerfil>
              )}
            </li>
          ))}
          {faltan.map((p) => (
            <li key={p} className="py-2 text-muted-foreground">
              {letraPlan(p)} sin registrar
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">Todavía no registra planes.</p>
      )}
      <Ir etiqueta="Ver planes" onClick={() => onIr('PLANES')} />
    </BloquePanel>
  )
}

function ComoEmpezo({ datos, onIr }: { datos: PerfilEstudiante; onIr: (d: DestinoPerfil) => void }) {
  const p = datos.partida
  const conLlegada = p.estado === 'CON_LLEGADA'
  return (
    <BloquePanel
      titulo={conLlegada ? 'De la partida a la llegada' : 'Cómo empezó'}
      subtitulo={
        p.fecha_partida
          ? `Mi punto de partida · ${fechaCorta(p.fecha_partida)}.${conLlegada && p.fecha_llegada ? ` Llegada · ${fechaCorta(p.fecha_llegada)}.` : ' Aún no responde el de llegada.'}`
          : undefined
      }
    >
      {p.estado === 'SIN_PARTIDA' ? (
        <p className="text-muted-foreground">Aún no responde su punto de partida.</p>
      ) : (
        gruposComoEmpezo(p).map((g) => (
          <div key={g.titulo} className="space-y-1">
            <h3
              className={`text-xs font-bold uppercase tracking-wide ${COLOR_GRUPO[g.titulo] ?? 'text-muted-foreground'}`}
            >
              {g.titulo}
            </h3>
            <ul className="text-sm">
              {g.dimensiones.map((d) => (
                <li key={d.codigo}>
                  {d.nombre}
                  {conLlegada && d.zona_partida && d.zona_llegada && (
                    <span className="text-muted-foreground">
                      : {textosZona[d.zona_partida]} → {textosZona[d.zona_llegada]}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
      <Ir etiqueta="Ver tests" onClick={() => onIr('TESTS')} />
    </BloquePanel>
  )
}

// Ajuste panel-estudiantes §6: las tres tarjetas del Resumen, cada una con su botón a la pestaña.
export function TarjetasResumen({
  datos,
  onIr,
}: {
  datos: PerfilEstudiante
  onIr: (d: DestinoPerfil) => void
}) {
  return (
    <div className="grid min-w-0 items-start gap-4 lg:grid-cols-3">
      <LoQueLeInteresa datos={datos} onIr={onIr} />
      <LoQueEstaPensando datos={datos} onIr={onIr} />
      <ComoEmpezo datos={datos} onIr={onIr} />
    </div>
  )
}
