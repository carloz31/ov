import { Card } from '@/components/ui/Card'
import { nombreSalon } from '@/lib/nombreSalon'
import { avanceCabecera, textoIngreso, textosApoderado } from '@/lib/servidor/adaptadoresPanelEstudiante'
import type { CabeceraEstudiante } from '@/types/servidor'

// Ajuste panel-estudiantes §5: nombre, salón, último ingreso y apoderado con su estado; a la derecha, un solo dato
// de avance. Sin «Imprimir ficha» (§11).
export function CabeceraPerfil({ cabecera }: { cabecera: CabeceraEstudiante }) {
  const avance = avanceCabecera(cabecera.tramo)
  const apoderado = cabecera.apoderado
    ? `Apoderado: ${cabecera.apoderado.nombre} (${textosApoderado[cabecera.apoderado.estado]})`
    : 'Sin apoderado vinculado'
  const ingreso = textoIngreso(cabecera.dias_sin_ingreso)
  return (
    <Card className="flex flex-wrap items-center justify-between gap-4 rounded-xl border-t-4 border-t-primary p-5 sm:p-6">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold">{cabecera.nombre}</h1>
        <p className="text-sm text-muted-foreground">
          {nombreSalon(cabecera.salon)} ·{' '}
          {cabecera.dias_sin_ingreso === null ? ingreso : `Último ingreso: ${ingreso}`} · {apoderado}
        </p>
      </div>
      <div className="rounded-xl bg-primary-soft px-4 py-2">
        {avance.linea && <p className="text-xs text-primary">{avance.linea}</p>}
        <p className="font-bold">{avance.nombre}</p>
      </div>
    </Card>
  )
}
