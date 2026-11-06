import * as React from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

type Opcion = { valor: string; texto: string }
let siguiente = 0

const normal = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('es')

// Una elección entre muchas opciones con buscador (patrón combobox de ARIA, sin dependencias): al enfocar se
// escribe para filtrar (sin tildes ni mayúsculas), las flechas recorren la lista, Enter elige y Escape cierra. Las
// opciones fijas (`fijas`, p. ej. «Todavía no sé») siempre se muestran al final.
export function Combobox({
  etiqueta,
  opciones,
  fijas = [],
  valor,
  placeholder,
  vacio = 'Sin resultados',
  disabled,
  className,
  onCambiar,
}: {
  etiqueta: string
  opciones: Opcion[]
  fijas?: Opcion[]
  valor: string | null
  placeholder?: string
  vacio?: string
  disabled?: boolean
  className?: string
  onCambiar: (valor: string) => void
}) {
  const id = React.useRef(`combobox-${++siguiente}`).current
  const [abierto, setAbierto] = React.useState(false)
  const [consulta, setConsulta] = React.useState('')
  const [activo, setActivo] = React.useState(0)
  const lista = React.useRef<HTMLUListElement>(null)
  const todas = [...opciones, ...fijas]
  const elegida = todas.find((o) => o.valor === valor)
  const filtradas = [
    ...(consulta ? opciones.filter((o) => normal(o.texto).includes(normal(consulta))) : opciones),
    ...fijas,
  ]
  const abrir = () => {
    setConsulta('')
    setActivo(
      Math.max(
        0,
        filtradas.findIndex((o) => o.valor === valor),
      ),
    )
    setAbierto(true)
  }
  const elegir = (o: Opcion) => {
    onCambiar(o.valor)
    setAbierto(false)
  }
  React.useEffect(() => {
    if (abierto) lista.current?.children[activo]?.scrollIntoView({ block: 'nearest' })
  }, [abierto, activo])
  return (
    <div className={cn('relative', className)}>
      <input
        role="combobox"
        aria-label={etiqueta}
        aria-expanded={abierto}
        aria-controls={`${id}-lista`}
        aria-autocomplete="list"
        aria-activedescendant={abierto && filtradas[activo] ? `${id}-${activo}` : undefined}
        autoComplete="off"
        disabled={disabled}
        placeholder={abierto ? 'Escribe para buscar…' : placeholder}
        className="flex h-9 w-full rounded-md border border-input bg-transparent py-2 pl-3 pr-9 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        value={abierto ? consulta : (elegida?.texto ?? '')}
        onFocus={abrir}
        onClick={() => !abierto && abrir()}
        onBlur={() => setAbierto(false)}
        onChange={(e) => {
          setConsulta(e.target.value)
          setActivo(0)
          setAbierto(true)
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault()
            if (!abierto) return abrir()
            const paso = e.key === 'ArrowDown' ? 1 : -1
            setActivo((i) => (filtradas.length ? (i + paso + filtradas.length) % filtradas.length : 0))
          } else if (e.key === 'Enter' && abierto) {
            e.preventDefault()
            if (filtradas[activo]) elegir(filtradas[activo])
          } else if (e.key === 'Escape' && abierto) {
            e.preventDefault()
            setAbierto(false)
          }
        }}
      />
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50"
      />
      {abierto && (
        <ul
          ref={lista}
          id={`${id}-lista`}
          role="listbox"
          aria-label={etiqueta}
          className="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
        >
          {filtradas.length === fijas.length && consulta && (
            <li role="presentation" className="px-2 py-2 text-sm text-muted-foreground">
              {vacio}
            </li>
          )}
          {filtradas.map((o, i) => (
            <li
              key={o.valor}
              id={`${id}-${i}`}
              role="option"
              aria-selected={o.valor === valor}
              className={cn(
                'relative flex min-h-11 cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm',
                i === activo && 'bg-accent text-accent-foreground',
              )}
              // Antes del blur del campo, para que la elección llegue.
              onMouseDown={(e) => {
                e.preventDefault()
                elegir(o)
              }}
              onMouseEnter={() => setActivo(i)}
            >
              {o.texto}
              {o.valor === valor && <Check aria-hidden="true" className="absolute right-2 h-4 w-4" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
