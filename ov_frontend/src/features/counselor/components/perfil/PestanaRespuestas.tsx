import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import type { ModeloPerfilEstudiante } from '@/features/counselor/hooks/usePerfilEstudiante'
import { SELECTOR_RESALTADO } from '@/features/counselor/lib/perfilEstudiante'
import { fechaCorta, textosEtiqueta } from '@/lib/servidor/adaptadoresPanelEstudiante'
import { useRegistroPerfil, useRespuestasPerfil } from '@/store/servidor/panelEstudiante'
import type { RegistroFila, RegistroLectura } from '@/types/servidor'
import { ChipPerfil } from './ChipPerfil'
import { EsperaBloque } from './EsperaBloque'
import { ItemRegistroLectura } from './ItemRegistroLectura'

function Estado({ fila }: { fila: RegistroFila }) {
  if (fila.estado === 'COMPLETADO')
    return (
      <>
        <ChipPerfil tono="exito">Completado</ChipPerfil>
        {fila.fecha && <span>{fechaCorta(fila.fecha, true)}</span>}
      </>
    )
  return <ChipPerfil>{fila.estado === 'EN_CURSO' ? 'En curso' : 'Aún no llega'}</ChipPerfil>
}

// Una tarjeta de registro, plegada; sus ítems se piden al desplegarla (los de «Para leer primero» ya llegan).
function Registro({
  fila,
  estudiante,
  leido,
}: {
  fila: RegistroFila
  estudiante: string
  leido?: RegistroLectura
}) {
  const [abierto, setAbierto] = useState(!!leido)
  const { carga, reintentar } = useRegistroPerfil(estudiante, fila.actividad, abierto && !leido)
  const items = leido?.items ?? carga?.datos?.items ?? null
  const respondible = fila.estado !== 'AUN_NO_LLEGA'
  return (
    <Card className="space-y-3 rounded-xl p-5 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h3 className="text-lg font-bold">{fila.titulo}</h3>
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            Tramo <em>{fila.tramo}</em> · <Estado fila={fila} />
            {fila.etiquetas.map((e) => (
              <ChipPerfil key={e.etiqueta} tono={e.etiqueta === 'AUN_NO_LO_SABE' ? 'neutro' : 'aviso'}>
                {e.cantidad} {textosEtiqueta[e.etiqueta].toLocaleLowerCase('es')}
              </ChipPerfil>
            ))}
            {fila.cambio_despues && <ChipPerfil>Lo que tenía a la vista cambió después</ChipPerfil>}
          </p>
        </div>
        {respondible && (
          <Button
            variant="outline"
            className="min-h-11"
            aria-expanded={abierto}
            onClick={() => setAbierto(!abierto)}
          >
            {abierto ? 'Ocultar' : 'Ver respuestas'}
            {abierto ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
          </Button>
        )}
      </header>
      {abierto &&
        (items ? (
          <div className="space-y-4 border-t border-border pt-4">
            {items.map((item) => (
              <ItemRegistroLectura key={item.codigo} item={item} />
            ))}
          </div>
        ) : (
          <EsperaBloque carga={carga} onReintentar={reintentar} filas={2} />
        ))}
    </Card>
  )
}

// Ajuste panel-estudiantes §9 (boceto 11): los registros en el orden del camino y, al final, los de la ciudad;
// destacados del salón o todos.
export function PestanaRespuestas({ modelo }: { modelo: ModeloPerfilEstudiante }) {
  const { carga, reintentar } = useRespuestasPerfil(modelo.estudiante)
  const [soloDestacados, setSoloDestacados] = useState(true)
  if (!carga?.datos) return <EsperaBloque carga={carga} onReintentar={reintentar} />
  const datos = carga.datos
  const leidos = new Map(datos.leer_primero.map((r) => [r.actividad, r]))
  const filtrados =
    datos.hay_destacados && soloDestacados ? datos.registros.filter((r) => r.destacado) : datos.registros
  const primero = filtrados.filter((r) => leidos.has(r.actividad))
  const camino = filtrados.filter((r) => !leidos.has(r.actividad) && !r.ciudad)
  const ciudad = filtrados.filter((r) => !leidos.has(r.actividad) && r.ciudad)
  const tarjetas = (filas: RegistroFila[]) =>
    filas.map((f) => (
      <Registro key={f.actividad} fila={f} estudiante={modelo.estudiante} leido={leidos.get(f.actividad)} />
    ))
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {datos.hay_destacados && (
          <SegmentedControl
            etiqueta="Qué registros ver"
            className={SELECTOR_RESALTADO}
            valor={soloDestacados ? 'destacados' : 'todos'}
            onCambiar={(v) => setSoloDestacados(v === 'destacados')}
            opciones={[
              {
                valor: 'destacados',
                texto: `Destacados · ${datos.registros.filter((r) => r.destacado).length}`,
              },
              { valor: 'todos', texto: `Todos · ${datos.registros.length}` },
            ]}
          />
        )}
        <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          Etiquetas: <ChipPerfil tono="aviso">Requiere atención</ChipPerfil>
          <ChipPerfil tono="aviso">Sin contenido</ChipPerfil>
          <ChipPerfil>Aún no lo sabe</ChipPerfil>
        </p>
      </div>
      {primero.length > 0 && (
        <section className="space-y-3" aria-labelledby="leer-primero">
          <h2 id="leer-primero" className="text-lg font-bold">
            Para leer primero
          </h2>
          {tarjetas(primero)}
        </section>
      )}
      {tarjetas(camino)}
      {ciudad.length > 0 && (
        <section className="space-y-3" aria-labelledby="misiones-opcionales">
          <h2 id="misiones-opcionales" className="text-lg font-bold">
            Misiones opcionales
          </h2>
          {tarjetas(ciudad)}
        </section>
      )}
    </div>
  )
}
