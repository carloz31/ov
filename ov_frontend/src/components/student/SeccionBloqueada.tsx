import { LockKeyhole } from 'lucide-react'

// Tarjeta de una sección todavía cerrada: candado, título y el motivo.
export function SeccionBloqueada({
  titulo,
  mensaje,
  nota,
}: {
  titulo: string
  mensaje: string
  nota?: string
}) {
  return (
    <div className="p-5 sm:p-8">
      <section className="mx-auto max-w-2xl rounded-3xl border bg-card p-8">
        <LockKeyhole className="mb-4 size-10 text-primary" />
        <h1 className="text-2xl font-bold">{titulo}</h1>
        <p className="my-4 text-sm leading-7 text-muted-foreground">{mensaje}</p>
        {nota && <p className="text-sm font-semibold">{nota}</p>}
      </section>
    </div>
  )
}
