import { Input } from '@/components/ui/Input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { TODOS_LOS_SALONES } from '@/features/counselor/hooks/usePanelSalon'
import type { ModeloEstudiantesLista } from '@/features/counselor/hooks/useEstudiantesLista'
import { textosTest } from '@/lib/servidor/adaptadoresPanelEstudiante'
import type { EstadoTestPanel, OpcionAviso } from '@/types/servidor'

const TODOS = 'todos'

function Filtro({
  etiqueta,
  valor,
  texto,
  opciones,
  onCambiar,
}: {
  etiqueta: string
  valor: string
  texto: string
  opciones: { valor: string; texto: string }[]
  onCambiar: (valor: string) => void
}) {
  return (
    <Select value={valor || TODOS} onValueChange={(v) => onCambiar(v === TODOS ? '' : v)}>
      <SelectTrigger aria-label={etiqueta} className="min-h-11 w-full bg-card sm:w-auto sm:min-w-44">
        <SelectValue>{texto}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {opciones.map((o) => (
          <SelectItem key={o.valor} value={o.valor}>
            {o.texto}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// Ajuste panel-estudiantes §4: buscador por nombre, salón, aviso y estado del test; todo en la URL.
export function FiltrosEstudiantes({
  modelo,
  avisos,
}: {
  modelo: ModeloEstudiantesLista
  avisos: OpcionAviso[]
}) {
  const { filtros } = modelo
  const aviso = avisos.find((a) => a.codigo === filtros.aviso)
  const test = filtros.test as EstadoTestPanel | ''
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        type="search"
        aria-label="Buscar estudiante"
        placeholder="Buscar estudiante"
        defaultValue={filtros.buscar}
        onChange={(e) => modelo.buscar(e.target.value)}
        className="min-h-11 min-w-0 flex-1 basis-60"
      />
      <Filtro
        etiqueta="Salón"
        valor={modelo.salon}
        texto={`Salón: ${modelo.nombreSalon}`}
        opciones={[
          ...modelo.salones.map((s) => ({ valor: s.codigo, texto: s.nombre })),
          ...(modelo.salones.length > 1 ? [{ valor: TODOS_LOS_SALONES, texto: 'Todos mis salones' }] : []),
        ]}
        onCambiar={(v) => modelo.elegirSalon(v || TODOS_LOS_SALONES)}
      />
      <Filtro
        etiqueta="Aviso"
        valor={filtros.aviso}
        texto={`Aviso: ${aviso?.nombre ?? 'todos'}`}
        opciones={[
          { valor: TODOS, texto: 'Todos' },
          ...avisos.map((a) => ({ valor: a.codigo, texto: a.nombre })),
        ]}
        onCambiar={modelo.elegirAviso}
      />
      <Filtro
        etiqueta="Test de intereses"
        valor={test}
        texto={`Test de intereses: ${test ? textosTest[test] : 'todos'}`}
        opciones={[
          { valor: TODOS, texto: 'Todos' },
          ...Object.entries(textosTest).map(([valor, texto]) => ({ valor, texto })),
        ]}
        onCambiar={modelo.elegirTest}
      />
    </div>
  )
}
