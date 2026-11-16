import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { Textarea } from '@/components/ui/Textarea'
import { BloquePanel } from '@/features/counselor/components/panel/PanelComun'
import { useNotasPerfil, type ModeloNotasPerfil } from '@/features/counselor/hooks/useNotasPerfil'
import { fechaCorta } from '@/lib/servidor/adaptadoresPanelEstudiante'
import type { NotaPerfil } from '@/types/servidor'

function Cargando({ activo }: { activo: boolean }) {
  return activo ? <Loader2 className="animate-spin" aria-hidden="true" /> : null
}

function Nota({ nota, modelo }: { nota: NotaPerfil; modelo: ModeloNotasPerfil }) {
  const [editando, setEditando] = useState(false)
  const [texto, setTexto] = useState(nota.texto)
  const [confirmar, setConfirmar] = useState(false)
  const guardando = modelo.enviando === `editar-${nota.numero}`
  const borrando = modelo.enviando === `borrar-${nota.numero}`
  return (
    <li className="space-y-2 rounded-lg bg-muted p-3">
      {editando ? (
        <>
          <Textarea aria-label="Editar nota" value={texto} onChange={(e) => setTexto(e.target.value)} />
          <div className="flex gap-2">
            <Button
              className="min-h-11"
              disabled={!texto.trim() || guardando}
              onClick={async () => (await modelo.editarNota(nota.numero, texto)) && setEditando(false)}
            >
              <Cargando activo={guardando} />
              Guardar
            </Button>
            <Button variant="outline" className="min-h-11" onClick={() => setEditando(false)}>
              Cancelar
            </Button>
          </div>
        </>
      ) : (
        <>
          <p>
            <strong>{fechaCorta(nota.creada_en)}.</strong> {nota.texto}
          </p>
          <div className="flex gap-2">
            <Button variant="link" className="min-h-11 px-0" onClick={() => setEditando(true)}>
              Editar
            </Button>
            <Button
              variant="link"
              className="min-h-11 px-2 text-danger-text"
              onClick={() => setConfirmar(true)}
            >
              Eliminar
            </Button>
          </div>
        </>
      )}
      <Dialog open={confirmar} onOpenChange={setConfirmar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar esta nota?</DialogTitle>
            <DialogDescription>No se puede recuperar.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" className="min-h-11" onClick={() => setConfirmar(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              className="min-h-11"
              disabled={borrando}
              onClick={async () => (await modelo.borrarNota(nota.numero)) && setConfirmar(false)}
            >
              <Cargando activo={borrando} />
              Eliminar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </li>
  )
}

// Ajuste panel-estudiantes §6 (HU-108): «Mis notas». Guardar, editar y eliminar llevan su cargador y actualizan lo
// cargado sin volver a pedir el perfil. Desde el reordenamiento del Resumen, es la última fila, a todo el ancho.
export function NotasPerfil({ notas, estudiante }: { notas: NotaPerfil[]; estudiante: string }) {
  const modelo = useNotasPerfil(estudiante)
  const guardando = modelo.enviando === 'nueva'
  return (
    <BloquePanel titulo="Mis notas" subtitulo="Solo usted las ve. Sirven para recordar lo conversado.">
      {notas.length > 0 && (
        <ul className="space-y-2">
          {notas.map((n) => (
            <Nota key={n.numero} nota={n} modelo={modelo} />
          ))}
        </ul>
      )}
      <label className="space-y-1">
        <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Nueva nota</span>
        <Textarea value={modelo.nueva} onChange={(e) => modelo.escribirNueva(e.target.value)} />
      </label>
      {modelo.errorNota && (
        <p role="alert" className="text-sm text-danger-text">
          {modelo.errorNota}
        </p>
      )}
      <Button
        variant="outline"
        className="min-h-11 w-fit"
        disabled={!modelo.nueva.trim() || guardando}
        onClick={() => void modelo.guardarNueva()}
      >
        <Cargando activo={guardando} />
        Guardar nota
      </Button>
    </BloquePanel>
  )
}
