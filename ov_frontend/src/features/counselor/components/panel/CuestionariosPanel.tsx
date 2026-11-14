import type { PedidoVer } from '@/features/counselor/hooks/usePanelSalon'
import { etiquetasCuestionario } from '@/lib/servidor/adaptadoresPanel'
import type { SeguimientoPanel } from '@/types/servidor'
import { BarraApilada, BloquePanel, EtiquetaPanel, FilaConteo } from './PanelComun'

const COLORES_ESTADOS = ['bg-data-primary', 'bg-warning', 'bg-data-secondary', 'bg-track']

// Ajuste panel-salon §4.3: el instrumento principal, cada estudiante en un solo estado.
export function BloqueTest({
  datos,
  onVer,
}: {
  datos: SeguimientoPanel
  onVer: (pedido: PedidoVer) => void
}) {
  const t = datos.test
  const ver = (titulo: string, valor: string) => () => onVer({ titulo, conjunto: 'test', valor })
  return (
    <BloquePanel
      titulo={t.nombre}
      etiqueta={etiquetasCuestionario[t.etiqueta]}
      subtitulo="Es la base de su informe. Aquí ve quién ya tiene un resultado confiable."
    >
      <BarraApilada valores={[t.listo, t.por_revisar, t.en_curso, t.sin_empezar]} colores={COLORES_ESTADOS} />
      <div>
        <FilaConteo cantidad={t.listo} titulo="Resultado listo" onVer={ver('Resultado listo', 'LISTO')} />
        <FilaConteo
          cantidad={t.por_revisar}
          tono="aviso"
          titulo="Por revisar"
          detalle={`${t.perfil_plano} perfil plano (todas las respuestas parecidas) · ${t.prisa} respondidos muy rápido (estimado por tiempo)`}
          onVer={ver('Por revisar', 'POR_REVISAR')}
        />
        <FilaConteo
          cantidad={t.en_curso}
          titulo="En curso"
          detalle="Les faltan partes o revelar su resultado"
          onVer={ver('En curso', 'EN_CURSO')}
        />
        <FilaConteo
          cantidad={t.sin_empezar}
          tono="neutro"
          titulo="Sin empezar"
          onVer={ver('Sin empezar', 'SIN_EMPEZAR')}
        />
      </div>
    </BloquePanel>
  )
}

// Ajuste panel-salon §4.4: una fila por aplicación de los demás instrumentos, con su etiqueta y «N de M».
export function OtrosCuestionarios({ datos }: { datos: SeguimientoPanel }) {
  return (
    <BloquePanel titulo="Otros cuestionarios">
      <ul>
        {datos.cuestionarios.map((c) => (
          <li
            key={c.aplicacion}
            className="flex flex-wrap items-center justify-between gap-2 border-t border-border py-3 first:border-t-0"
          >
            <span className="flex flex-wrap items-center gap-2 font-semibold">
              {c.nombre}
              <EtiquetaPanel>{etiquetasCuestionario[c.etiqueta]}</EtiquetaPanel>
            </span>
            <span className="font-bold tabular-nums">
              {c.n} de {datos.total_estudiantes}
            </span>
          </li>
        ))}
      </ul>
    </BloquePanel>
  )
}
