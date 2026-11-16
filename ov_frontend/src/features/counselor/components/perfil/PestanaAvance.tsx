import type { ReactNode } from 'react'
import { BloquePanel } from '@/features/counselor/components/panel/PanelComun'
import type { ModeloPerfilEstudiante } from '@/features/counselor/hooks/usePerfilEstudiante'
import { fechaCorta, textoOpcionales } from '@/lib/servidor/adaptadoresPanelEstudiante'
import { cn } from '@/lib/utils'
import { useAvancePerfil } from '@/store/servidor/panelEstudiante'
import type { AvanceEstudiantePerfil, Senal, TramoCamino } from '@/types/servidor'
import { ChipPerfil, type TonoChip } from './ChipPerfil'
import { EsperaBloque } from './EsperaBloque'

const ESTADO_TRAMO: Record<TramoCamino['estado'], [string, TonoChip]> = {
  COMPLETO: ['Completo', 'exito'],
  VA_AQUI: ['Va aquí', 'aviso'],
  POR_ABRIR: ['Por abrir', 'neutro'],
}
const FONDO_BANDA: Record<Senal['banda'], string> = {
  BAJA: 'bg-warning-soft',
  MEDIA: 'bg-primary-soft',
  ALTA: 'bg-success-soft',
}
const misiones = (n: number) => `${n} ${n === 1 ? 'misión' : 'misiones'}`

function Fila({ titulo, detalle, chip }: { titulo: string; detalle?: ReactNode; chip: [string, TonoChip] }) {
  return (
    <li className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="font-bold">{titulo}</p>
        {detalle && <p className="text-sm text-muted-foreground">{detalle}</p>}
      </div>
      <ChipPerfil tono={chip[1]}>{chip[0]}</ChipPerfil>
    </li>
  )
}

function ComoSeSiente({ datos }: { datos: AvanceEstudiantePerfil }) {
  const ultima = datos.senales.at(-1)
  const diario = datos.entradas_diario
    ? `Ha escrito ${datos.entradas_diario} ${datos.entradas_diario === 1 ? 'entrada' : 'entradas'} en su diario; la última, ${
        datos.dias_ultima_entrada === 0
          ? 'hoy'
          : datos.dias_ultima_entrada === 1
            ? 'ayer'
            : `hace ${datos.dias_ultima_entrada} días`
      }.`
    : 'Aún no escribe en su diario.'
  return (
    <BloquePanel
      titulo="Cómo se siente con su decisión"
      subtitulo="Sus últimas señales de seguridad, de la más antigua a la más reciente (escala de 1 a 5)."
    >
      {datos.senales.length ? (
        <>
          <ul className="flex flex-wrap gap-2">
            {datos.senales.map((s) => (
              <li key={s.fecha} className={cn('min-w-16 rounded-lg p-2 text-center', FONDO_BANDA[s.banda])}>
                <p className="text-xl font-bold">{s.nivel}</p>
                <p className="text-xs">{fechaCorta(s.fecha)}</p>
              </li>
            ))}
          </ul>
          <p>
            {datos.viene_bajando ? (
              <>
                <strong>Viene bajando:</strong> sus {datos.viene_bajando.senales} últimas señales fueron{' '}
                {datos.viene_bajando.nivel_maximo} o menos.
              </>
            ) : (
              `Su última señal fue ${ultima!.nivel} de 5.`
            )}
          </p>
        </>
      ) : (
        <p className="text-muted-foreground">Aún no registra señales.</p>
      )}
      <p className="text-sm text-muted-foreground">
        {diario} El diario es privado: aquí no se muestra su contenido.
      </p>
    </BloquePanel>
  )
}

// Ajuste panel-estudiantes §10 (boceto 12): su camino, cómo se siente con su decisión y su familia. Nada sobre las
// cartas ni el contenido del diario.
export function PestanaAvance({ modelo, nombre }: { modelo: ModeloPerfilEstudiante; nombre: string }) {
  const { carga, reintentar } = useAvancePerfil(modelo.estudiante)
  if (!carga?.datos) return <EsperaBloque carga={carga} onReintentar={reintentar} />
  const datos = carga.datos
  const familia = datos.familia
  const opcionales = textoOpcionales(datos.opcionales_ciudad, datos.casos_superados)
  return (
    <div className="grid min-w-0 items-start gap-4 lg:grid-cols-2">
      <BloquePanel titulo="Su camino" subtitulo="Las misiones requeridas, tramo por tramo.">
        <ul className="divide-y divide-border">
          {datos.tramos.map((t) => (
            <Fila
              key={t.numero}
              titulo={`${t.numero} · ${t.nombre}`}
              detalle={
                t.estado === 'POR_ABRIR'
                  ? misiones(t.total)
                  : (
                      <>
                        {t.hechas} de {misiones(t.total)}
                        {t.siguiente && (
                          <>
                            {' · sigue: '}
                            <em>{t.siguiente}</em>
                          </>
                        )}
                      </>
                    )
              }
              chip={ESTADO_TRAMO[t.estado]}
            />
          ))}
        </ul>
        {opcionales && <p className="text-sm text-muted-foreground">{opcionales}</p>}
      </BloquePanel>
      <div className="grid min-w-0 gap-4">
        <ComoSeSiente datos={datos} />
        <BloquePanel
          titulo="Su familia"
          subtitulo={familia ? [familia.nombre, familia.parentesco].filter(Boolean).join(' · ') : undefined}
        >
          {familia ? (
            <ul className="divide-y divide-border">
              <Fila
                titulo="Ingreso a la plataforma"
                chip={familia.ingreso === 'INGRESO' ? ['Ingresó', 'exito'] : ['Aún no ingresa', 'aviso']}
              />
              <Fila
                titulo="Ruta del apoderado"
                chip={[`${familia.ruta_hechas} de ${familia.ruta_total} actividades`, 'neutro']}
              />
              <Fila
                titulo={`Conversaciones con ${nombre}`}
                detalle={
                  familia.esperan_apoderado
                    ? `${nombre} ya respondió ${familia.esperan_apoderado} y espera a su apoderado.`
                    : undefined
                }
                chip={[`${familia.conversadas} de ${familia.conversaciones_total} conversadas`, 'neutro']}
              />
            </ul>
          ) : (
            <p className="text-muted-foreground">No tiene un apoderado vinculado.</p>
          )}
        </BloquePanel>
      </div>
    </div>
  )
}
