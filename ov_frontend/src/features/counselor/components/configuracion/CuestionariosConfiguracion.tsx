import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Checkbox } from '@/components/ui/Checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import type { CuestionarioConfiguracion } from '@/types/servidor'
import type { ModeloConfiguracion } from '../../hooks/useConfiguracionColegio'

function Tipo({ cuestionario }: { cuestionario: CuestionarioConfiguracion }) {
  return cuestionario.obligatorio ? <Badge>Obligatorio</Badge> : <Badge variant="outline">Opcional</Badge>
}

// Siempre y nunca son fijos; solo un cuestionario «según el colegio» se marca.
function Visibilidad({
  m,
  cuestionario,
  movil = false,
}: {
  m: ModeloConfiguracion
  cuestionario: CuestionarioConfiguracion
  movil?: boolean
}) {
  if (cuestionario.visibilidad_apoderado === 'SIEMPRE') return <p className="py-2">Siempre</p>
  if (cuestionario.visibilidad_apoderado === 'NUNCA')
    return <p className="py-2 text-muted-foreground">No se comparte</p>
  const id = `visible-${movil ? 'movil-' : ''}${cuestionario.codigo}`
  return (
    <label htmlFor={id} className="flex min-h-11 w-fit max-w-full cursor-pointer items-center gap-3">
      <Checkbox
        id={id}
        aria-label={`Visible para el apoderado: ${cuestionario.nombre}`}
        disabled={!m.editando || m.guardando}
        checked={m.esVisible(cuestionario)}
        onCheckedChange={(marcado) => m.cambiarVisible(cuestionario.codigo, marcado === true)}
      />
      <span>Visible para el apoderado</span>
    </label>
  )
}

// Ajuste panel-entrevistas-configuracion §2.5: tabla en escritorio y tarjetas en el celular.
export function CuestionariosConfiguracion({ m }: { m: ModeloConfiguracion }) {
  const cuestionarios = m.datos?.cuestionarios ?? []
  return (
    <section className="min-w-0 space-y-3" aria-labelledby="cuestionarios-configuracion">
      <h2 id="cuestionarios-configuracion" className="text-lg font-bold">
        Cuestionarios
      </h2>
      <Card className="hidden overflow-hidden rounded-xl lg:block">
        <Table className="table-fixed [&_th:first-child]:pl-4 [&_td:first-child]:pl-4 [&_th:last-child]:pr-4 [&_td:last-child]:pr-4">
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead scope="col" className="w-[50%] text-sm font-semibold">
                Cuestionario
              </TableHead>
              <TableHead scope="col" className="w-[17%] text-sm font-semibold">
                Tipo
              </TableHead>
              <TableHead scope="col" className="w-[33%] text-sm font-semibold">
                Visible para el apoderado
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cuestionarios.map((c) => (
              <TableRow key={c.codigo}>
                <TableCell className="whitespace-normal">
                  <p className="font-medium">{c.nombre}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{c.descripcion}</p>
                </TableCell>
                <TableCell>
                  <Tipo cuestionario={c} />
                </TableCell>
                <TableCell>
                  <Visibilidad m={m} cuestionario={c} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <div className="space-y-3 lg:hidden">
        {cuestionarios.map((c) => (
          <Card key={c.codigo} className="min-w-0 gap-3 rounded-xl p-4">
            <div className="space-y-1">
              <Tipo cuestionario={c} />
              <h3 className="font-semibold">{c.nombre}</h3>
              <p className="text-sm text-muted-foreground">{c.descripcion}</p>
            </div>
            <div className="text-sm">
              <Visibilidad m={m} cuestionario={c} movil />
            </div>
          </Card>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        <strong className="font-medium text-foreground">Visible para el apoderado:</strong> el apoderado ve el
        resultado de su hijo en su portal.
      </p>
    </section>
  )
}
