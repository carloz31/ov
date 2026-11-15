import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Checkbox } from '@/components/ui/Checkbox'
import type { ModeloConfiguracion } from '../../hooks/useConfiguracionColegio'

// Ajuste panel-entrevistas-configuracion §2.5: los registros por tramo, en el orden del camino (la Ciudad al final).
export function RegistrosDestacados({ m }: { m: ModeloConfiguracion }) {
  const bloques = m.datos?.registros ?? []
  return (
    <section className="min-w-0 space-y-3" aria-labelledby="registros-destacados">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="registros-destacados" className="text-lg font-bold">
          Registros destacados
        </h2>
        <span className="text-sm">
          {m.totalDestacados} {m.totalDestacados === 1 ? 'destacado' : 'destacados'}
        </span>
      </div>
      {bloques.map((bloque) => (
        <Card key={bloque.codigo} className="min-w-0 gap-0 overflow-hidden rounded-xl">
          <h3 className="border-b bg-muted px-4 py-3 font-semibold">{bloque.nombre}</h3>
          <div className="divide-y">
            {bloque.registros.map((registro) => (
              <div
                key={registro.codigo}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-2"
              >
                <label
                  htmlFor={`destacado-${registro.codigo}`}
                  className="flex min-h-11 w-fit max-w-full cursor-pointer items-center gap-3"
                >
                  <Checkbox
                    id={`destacado-${registro.codigo}`}
                    aria-label={registro.titulo}
                    disabled={!m.editando || m.guardando}
                    checked={m.esDestacado(registro.codigo)}
                    onCheckedChange={(marcado) => m.cambiarDestacado(registro.codigo, marcado === true)}
                  />
                  <span className="font-medium">{registro.titulo}</span>
                </label>
                {registro.requerida ? (
                  <Badge variant="secondary">Requerido</Badge>
                ) : (
                  <Badge variant="outline">Opcional</Badge>
                )}
              </div>
            ))}
          </div>
        </Card>
      ))}
      <p className="text-sm text-muted-foreground">
        Sin destacados, el perfil muestra los registros requeridos del camino.
      </p>
    </section>
  )
}
