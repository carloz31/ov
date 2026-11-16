import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { Textarea } from '@/components/ui/Textarea'
import { BloquePanel, FilaConteo } from '@/features/counselor/components/panel/PanelComun'
import { useNotasPerfil, type ModeloNotasPerfil } from '@/features/counselor/hooks/useNotasPerfil'
import type { ModeloPerfilEstudiante } from '@/features/counselor/hooks/usePerfilEstudiante'
import type { IntensidadMarca } from '@/features/counselor/lib/perfilEstudiante'
import { fechaCorta } from '@/lib/servidor/adaptadoresPanelEstudiante'
import type { NotaPerfil, RespuestasResumen } from '@/types/servidor'
import { MarcaRespuesta } from './MarcaRespuesta'

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

function MisNotas({ notas, estudiante }: { notas: NotaPerfil[]; estudiante: string }) {
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

function SusRespuestas({ datos, onVer }: { datos: RespuestasResumen; onVer: () => void }) {
  // Ajuste respuestas-orientadora §4: la misma marca e intensidad que la pestaña; «aún no lo sabe», sin color.
  const etiquetas: [number, string, IntensidadMarca | null][] = [
    [datos.requiere_atencion, datos.requiere_atencion === 1 ? 'requiere atención' : 'requieren atención', 'fuerte'],
    [
      datos.sin_contenido,
      datos.sin_contenido === 1 ? 'respuesta sin contenido' : 'respuestas sin contenido',
      'suave',
    ],
    [datos.aun_no_lo_sabe, datos.aun_no_lo_sabe === 1 ? 'aún no lo sabe' : 'aún no lo saben', null],
  ]
  return (
    <BloquePanel
      titulo="Sus respuestas"
      subtitulo={
        datos.destacados
          ? 'Lo que escribió en los registros destacados del salón.'
          : 'Lo que escribió en sus registros.'
      }
    >
      <div>
        <FilaConteo
          cantidad={datos.completados}
          tono="neutro"
          titulo={`de ${datos.total} registros ${datos.destacados ? 'destacados ' : ''}completados`}
        />
        {etiquetas
          .filter(([n]) => n > 0)
          .map(([n, texto, intensidad]) => (
            <FilaConteo
              key={texto}
              cantidad={n}
              tono={intensidad ? 'aviso' : 'neutro'}
              titulo={
                intensidad ? (
                  <MarcaRespuesta intensidad={intensidad} className="text-base">
                    {texto}
                  </MarcaRespuesta>
                ) : (
                  <span className="font-normal text-muted-foreground">{texto}</span>
                )
              }
            />
          ))}
      </div>
      <Button variant="outline" className="min-h-11 w-fit" onClick={onVer}>
        Ver respuestas
      </Button>
    </BloquePanel>
  )
}

// Ajuste panel-estudiantes §6: «Sus respuestas» y «Mis notas» (HU-108). Guardar, editar y eliminar llevan su
// cargador y actualizan lo cargado sin volver a pedir el perfil.
export function RespuestasYNotas({
  respuestas,
  notas,
  modelo,
}: {
  respuestas: RespuestasResumen
  notas: NotaPerfil[]
  modelo: ModeloPerfilEstudiante
}) {
  return (
    <div className="grid min-w-0 items-start gap-4 lg:grid-cols-2">
      <SusRespuestas datos={respuestas} onVer={() => modelo.irADestino('RESPUESTAS')} />
      <MisNotas notas={notas} estudiante={modelo.estudiante} />
    </div>
  )
}
