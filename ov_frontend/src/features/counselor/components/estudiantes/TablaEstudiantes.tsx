import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/Button'
import { ChipPerfil, type TonoChip } from '@/features/counselor/components/perfil/ChipPerfil'
import {
  COLUMNAS_LISTA,
  type ColumnaLista,
  type ModeloEstudiantesLista,
} from '@/features/counselor/hooks/useEstudiantesLista'
import { textoIngreso, textosTest, textoTramo } from '@/lib/servidor/adaptadoresPanelEstudiante'
import { cn } from '@/lib/utils'
import type { EstadoTestPanel, FilaEstudiante } from '@/types/servidor'

const TITULOS: Record<ColumnaLista, string> = {
  estudiante: 'Estudiante',
  tramo: 'Por dónde va',
  test: 'Test de intereses',
  plan_a: 'Plan A',
  ingreso: 'Último ingreso',
  avisos: 'Avisos',
}
const TONO_TEST: Record<EstadoTestPanel, TonoChip> = {
  LISTO: 'exito',
  POR_REVISAR: 'aviso',
  EN_CURSO: 'neutro',
  SIN_EMPEZAR: 'neutro',
}

function Cabecera({ columna, modelo }: { columna: ColumnaLista; modelo: ModeloEstudiantesLista }) {
  const activa = modelo.columnaActiva === columna
  const Icono = !activa ? ArrowUpDown : modelo.descendente ? ArrowUp : ArrowDown
  return (
    <th
      scope="col"
      aria-sort={activa ? (modelo.descendente ? 'descending' : 'ascending') : 'none'}
      className="px-2 py-2 text-left text-xs font-semibold"
    >
      <button
        type="button"
        onClick={() => modelo.ordenar(columna)}
        className={cn(
          'inline-flex min-h-11 items-center gap-1 rounded-md px-1',
          activa ? 'text-primary' : 'text-muted-foreground',
        )}
      >
        {TITULOS[columna]}
        <Icono className="size-3.5" aria-hidden="true" />
      </button>
    </th>
  )
}

// Ajuste panel-estudiantes §4 (boceto 05): una fila por estudiante; las cabeceras ordenan toda la lista en el
// servidor. De los avisos, solo el más importante y «y N más».
export function TablaEstudiantes({
  filas,
  modelo,
}: {
  filas: FilaEstudiante[]
  modelo: ModeloEstudiantesLista
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="bg-muted">
          <tr>
            {COLUMNAS_LISTA.map((c) => (
              <Cabecera key={c} columna={c} modelo={modelo} />
            ))}
            <th scope="col" className="px-2 py-2">
              <span className="sr-only">Perfil</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.codigo} className="border-t border-border align-top">
              <th scope="row" className="px-3 py-3 text-left font-bold">
                {f.nombre}
              </th>
              <td className="px-3 py-3">{textoTramo(f.tramo)}</td>
              <td className="px-3 py-3">
                <ChipPerfil tono={TONO_TEST[f.test]}>{textosTest[f.test]}</ChipPerfil>
              </td>
              <td className="px-3 py-3">{f.plan_a ?? 'Sin plan'}</td>
              <td className="px-3 py-3">{textoIngreso(f.dias_sin_ingreso)}</td>
              <td className="px-3 py-3">
                {f.aviso ? (
                  <span>
                    <ChipPerfil tono="aviso">{f.aviso}</ChipPerfil>
                    {f.avisos_mas > 0 && (
                      <span className="ml-1 text-muted-foreground">y {f.avisos_mas} más</span>
                    )}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Sin avisos</span>
                )}
              </td>
              <td className="px-3 py-2 text-right">
                <Button asChild variant="outline" className="min-h-11">
                  <Link to={modelo.enlacePerfil(f.codigo)} state={{ lista: modelo.consulta }}>
                    Ver perfil
                  </Link>
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
