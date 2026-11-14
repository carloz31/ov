import type { PedidoVer } from '@/features/counselor/hooks/usePanelSalon'
import { nombresFormacion, textoDesglose } from '@/lib/servidor/adaptadoresPanel'
import type { InteresesPanel } from '@/types/servidor'
import { BarraApilada, BloquePanel, FilaConteo } from './PanelComun'

const COLORES_FORMACION = ['bg-data-primary', 'bg-data-secondary', 'bg-warning']

// Ajuste panel-salon §5.5: tipo de formación del Plan A, con el desglose por la institución elegida.
export function TipoFormacion({ datos }: { datos: InteresesPanel }) {
  const { con_plan_a: conPlanA, filas } = datos.formacion
  return (
    <BloquePanel
      titulo="Qué tipo de formación buscan"
      subtitulo={`Según el Plan A de ${conPlanA} estudiantes.`}
    >
      <BarraApilada valores={filas.map((f) => f.cantidad)} colores={COLORES_FORMACION} />
      <div>
        {filas.map((fila) => (
          <FilaConteo
            key={fila.tipo}
            cantidad={fila.cantidad}
            titulo={nombresFormacion[fila.tipo]}
            detalle={textoDesglose(fila.desglose) || undefined}
          />
        ))}
      </div>
    </BloquePanel>
  )
}

// Ajuste panel-salon §5.6: las complicaciones más marcadas en el Plan A; las escritas a mano, al final.
export function Complicaciones({ datos }: { datos: InteresesPanel }) {
  const { filas, otra } = datos.complicaciones
  return (
    <BloquePanel
      titulo="Lo que podría complicar sus planes"
      subtitulo="Lo que marcaron en su Plan A. Sirve para elegir temas de taller."
    >
      {filas.length === 0 && otra === 0 ? (
        <p className="text-sm text-muted-foreground">Aún nadie marcó complicaciones en su Plan A.</p>
      ) : (
        <div>
          {filas.map((fila) => (
            <FilaConteo key={fila.texto} cantidad={fila.cantidad} tono="neutro" titulo={fila.texto} />
          ))}
          {otra > 0 && <FilaConteo cantidad={otra} tono="neutro" titulo="Otra (escrita por el estudiante)" />}
        </div>
      )}
    </BloquePanel>
  )
}

// Ajuste panel-salon §5.7: Plan A frente a lo sugerido por el test, y los intereses más frecuentes.
export function PlanesFrenteTest({
  datos,
  onVer,
}: {
  datos: InteresesPanel
  onVer: (pedido: PedidoVer) => void
}) {
  const f = datos.frente_test
  return (
    <BloquePanel
      titulo="Planes frente al test de intereses"
      subtitulo={`De los ${f.base} estudiantes que tienen Plan A y resultado del test.`}
    >
      <div>
        <FilaConteo cantidad={f.coinciden} titulo="Su Plan A está entre lo sugerido por el test" />
        <FilaConteo
          cantidad={f.no_coinciden}
          tono="aviso"
          titulo="Su Plan A no aparece en lo sugerido"
          detalle="No es un error: es un tema para conversar."
          onVer={() => onVer({ titulo: 'Su Plan A no aparece en lo sugerido', conjunto: 'plan_fuera_test' })}
        />
      </div>
      <div className="space-y-1 border-t border-border pt-3">
        <h3 className="text-sm font-bold">Intereses más frecuentes del salón</h3>
        <p className="text-sm text-muted-foreground">
          {f.codigos.length
            ? `${f.codigos.map((c) => `${c.nombre} (${c.cantidad})`).join(' · ')}, de ${f.resultados_listos} resultados listos.`
            : `Aún no hay resultados listos.`}
        </p>
      </div>
    </BloquePanel>
  )
}
