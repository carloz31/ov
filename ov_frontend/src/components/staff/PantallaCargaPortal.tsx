import { LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'

// Carga o fallo inicial de un portal del personal (apoderado, orientadora), a pantalla completa.
export function PantallaCargaPortal({
  estado,
  mensaje,
  onReintentar,
  onVolver,
}: {
  estado: 'cargando' | 'error'
  mensaje?: string
  onReintentar: () => void
  onVolver: () => void
}) {
  const error = estado === 'error'
  return (
    <div className="grid min-h-svh place-items-center p-8 text-center" role={error ? 'alert' : 'status'}>
      <div className="max-w-md">
        {!error && (
          <LoaderCircle
            className="mx-auto mb-4 size-8 animate-spin text-primary motion-reduce:animate-none"
            aria-hidden="true"
          />
        )}
        <h1 className="text-xl font-bold">{error ? 'No pudimos cargar la información' : 'Cargando'}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {error ? mensaje : 'Un momento, estamos trayendo tu información.'}
        </p>
        {error && (
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Button className="min-h-11" onClick={onReintentar}>
              Reintentar
            </Button>
            <Button className="min-h-11" variant="outline" onClick={onVolver}>
              Volver a ingresar
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
