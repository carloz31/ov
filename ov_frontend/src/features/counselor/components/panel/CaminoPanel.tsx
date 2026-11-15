import type { PedidoVer } from '@/features/counselor/hooks/usePanelSalon'
import { cn } from '@/lib/utils'
import { textoBanda } from '@/lib/servidor/adaptadoresPanel'
import type { SeguimientoPanel } from '@/types/servidor'
import { BloquePanel, BotonVer, FilaConteo } from './PanelComun'

// Ajuste panel-salon §4.5: una casilla por posición en el camino; las de más estudiantes, en un tono más intenso.
export function PorDondeVa({
  datos,
  onVer,
}: {
  datos: SeguimientoPanel
  onVer: (pedido: PedidoVer) => void
}) {
  const maximo = Math.max(0, ...datos.tramos.map((t) => t.cantidad))
  const detenidos = datos.detenidos
  return (
    <BloquePanel
      titulo="Por dónde va el salón"
      subtitulo="Cuántos estudiantes están hoy en cada tramo del camino."
    >
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {datos.tramos.map((tramo) => {
          const intenso = maximo > 0 && tramo.cantidad * 3 >= maximo * 2
          return (
            <li key={tramo.codigo}>
              <button
                type="button"
                className={cn(
                  'flex min-h-20 w-full flex-col items-center justify-center rounded-lg p-2 text-center',
                  intenso ? 'bg-primary-soft text-primary' : 'bg-track text-muted-foreground',
                )}
                onClick={() => onVer({ titulo: tramo.nombre, conjunto: 'tramo', valor: tramo.codigo })}
                aria-label={`Ver: ${tramo.cantidad} estudiantes en ${tramo.nombre}`}
              >
                <span className="text-2xl font-bold text-foreground tabular-nums">{tramo.cantidad}</span>
                <span className="text-sm">{tramo.nombre}</span>
              </button>
            </li>
          )
        })}
      </ul>
      {detenidos && (
        <div className="flex items-center gap-3 border-t border-border pt-3">
          <p className="min-w-0 flex-1 text-sm">
            <strong>Donde más se detienen:</strong> «{detenidos.titulo}». {detenidos.cantidad} estudiantes
            llevan más de {detenidos.dias} días ahí.
          </p>
          <BotonVer
            descripcion="Donde más se detienen"
            onClick={() => onVer({ titulo: `Detenidos en «${detenidos.titulo}»`, conjunto: 'detenidos' })}
          />
        </div>
      )}
    </BloquePanel>
  )
}

const NOMBRES_BANDA = { BAJA: 'Poco seguros', MEDIA: 'Intermedio', ALTA: 'Seguros' } as const

// Ajuste panel-salon §4.6: la última señal de cada estudiante, en bandas armadas con los parámetros.
export function ComoSeSienten({
  datos,
  onVer,
}: {
  datos: SeguimientoPanel
  onVer: (pedido: PedidoVer) => void
}) {
  const { bandas, sin_senales: sinSenales } = datos.seguridad
  return (
    <BloquePanel
      titulo="Cómo se sienten con su decisión"
      subtitulo="La última señal de seguridad que registró cada estudiante (escala de 1 a 5)."
    >
      <div>
        {bandas.map((banda) => (
          <FilaConteo
            key={banda.codigo}
            cantidad={banda.cantidad}
            tono={banda.codigo === 'BAJA' ? 'aviso' : 'neutro'}
            titulo={
              <>
                {NOMBRES_BANDA[banda.codigo]}{' '}
                <span className="font-normal text-muted-foreground">({textoBanda(banda)})</span>
              </>
            }
            onVer={
              banda.codigo === 'BAJA'
                ? () => onVer({ titulo: NOMBRES_BANDA.BAJA, conjunto: 'seguridad_baja' })
                : undefined
            }
          />
        ))}
        <FilaConteo cantidad={sinSenales} tono="neutro" titulo="Aún sin señales" />
      </div>
      <p className="text-sm text-muted-foreground">
        El diario es privado: aquí no se muestra nada de lo que escriben.
      </p>
    </BloquePanel>
  )
}
