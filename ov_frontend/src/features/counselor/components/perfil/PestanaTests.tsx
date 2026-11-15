import type { ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { BloquePanel } from '@/features/counselor/components/panel/PanelComun'
import type { ModeloPerfilEstudiante } from '@/features/counselor/hooks/usePerfilEstudiante'
import { etiquetasCuestionario } from '@/lib/servidor/adaptadoresPanel'
import { textosTest } from '@/lib/servidor/adaptadoresPanelEstudiante'
import { usePartidaLlegadaPerfil, useTestsPerfil } from '@/store/servidor/panelEstudiante'
import type { OtroCuestionario } from '@/types/servidor'
import { ChipPerfil } from './ChipPerfil'
import { DetallePartidaLlegada } from './DetallePartidaLlegada'
import { EsperaBloque } from './EsperaBloque'
import { PartidaLlegadaPerfil } from './PartidaLlegadaPerfil'
import { TestInteresesPerfil } from './TestInteresesPerfil'

function Volver({ texto, onClick }: { texto: string; onClick: () => void }) {
  return (
    <Button variant="link" className="min-h-11 px-0 font-semibold" onClick={onClick}>
      ← {texto}
    </Button>
  )
}

// Ajuste color-partida-llegada: «Ver detalle por dimensión»; se pide al abrirlo.
function DetalleDimensiones({ modelo }: { modelo: ModeloPerfilEstudiante }) {
  const { carga, reintentar } = usePartidaLlegadaPerfil(modelo.estudiante)
  return (
    <div className="space-y-4">
      <Volver texto="Tests" onClick={() => modelo.verTodas(false)} />
      {!carga?.datos ? (
        <EsperaBloque carga={carga} onReintentar={reintentar} />
      ) : (
        <DetallePartidaLlegada datos={carga.datos} />
      )}
    </div>
  )
}

function OtrosCuestionarios({
  otros,
  onVer,
}: {
  otros: OtroCuestionario[]
  onVer: (aplicacion: string) => void
}) {
  return (
    <BloquePanel titulo="Otros cuestionarios">
      <ul className="divide-y divide-border">
        {otros.map((o) => (
          <li key={o.instrumento} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="min-w-0 space-y-1">
              <p className="flex flex-wrap items-center gap-2 font-bold">
                {o.nombre} <ChipPerfil>{etiquetasCuestionario[o.etiqueta]}</ChipPerfil>
              </p>
              <p className="text-sm text-muted-foreground">
                <ChipPerfil tono={o.estado === 'LISTO' ? 'exito' : 'neutro'}>
                  {o.estado === 'LISTO' ? 'Resultado listo' : textosTest[o.estado]}
                </ChipPerfil>{' '}
                {o.aplicacion
                  ? [
                      o.destaca.length ? `Destaca: ${o.destaca.join(', ')}.` : null,
                      o.para_practicar ? `Para practicar: ${o.para_practicar}.` : null,
                    ]
                      .filter(Boolean)
                      .join(' ')
                  : `Respondió ${o.partes_respondidas} de ${o.partes_total} partes.`}
              </p>
            </div>
            {o.aplicacion && (
              <Button variant="outline" className="min-h-11" onClick={() => onVer(o.aplicacion!)}>
                Ver resultado
              </Button>
            )}
          </li>
        ))}
      </ul>
    </BloquePanel>
  )
}

// Ajuste panel-estudiantes §7: la pestaña Tests, pedida al abrirla. El resultado completo lo compone la vista de
// ruta (reutiliza la del apoderado) y llega como `resultado`.
export function PestanaTests({
  modelo,
  resultado,
}: {
  modelo: ModeloPerfilEstudiante
  resultado: ReactNode
}) {
  // Entrar directo a un resultado o a «Ver todas» no pide la pestaña (auditoría del panel, F6).
  const { carga, reintentar } = useTestsPerfil(modelo.estudiante, !modelo.resultado && !modelo.todas)
  if (modelo.resultado)
    return (
      <div className="space-y-4">
        <Volver texto="Tests" onClick={() => modelo.abrirResultado(null)} />
        {resultado}
      </div>
    )
  if (modelo.todas) return <DetalleDimensiones modelo={modelo} />
  if (!carga?.datos) return <EsperaBloque carga={carga} onReintentar={reintentar} />
  const datos = carga.datos
  return (
    <div className="space-y-4">
      {datos.intereses && (
        <TestInteresesPerfil
          test={datos.intereses}
          onVerCompleto={() => modelo.abrirResultado(datos.intereses!.aplicacion)}
        />
      )}
      {datos.partida_llegada && (
        <PartidaLlegadaPerfil datos={datos.partida_llegada} onVerTodas={() => modelo.verTodas(true)} />
      )}
      {datos.otros.length > 0 && <OtrosCuestionarios otros={datos.otros} onVer={modelo.abrirResultado} />}
    </div>
  )
}
