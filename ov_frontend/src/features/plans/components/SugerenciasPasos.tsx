import { useState } from 'react'
import { Input } from '@/components/ui/Input'
import type { SugerenciaPublica, OpcionesTarjeta } from '@/types/servidor'
import { InsigniaPaso } from './InsigniaPaso'
import { SelectTipoPaso } from './SelectTipoPaso'

const VISIBLES = 5

// F07b (§8, lienzo de la sección 4 en edición): «Sugerencias · N», las que esperan decisión. «Agregar» la pasa a
// Mis pasos; «Editar» la abre en sitio (tipo + texto, «Agregar así» / «Cancelar»); «Ahora no» la descarta. Las de
// respaldo se ven igual. Se ven cinco y «+ k sugerencias más» despliega el resto.
export function SugerenciasPasos({
  sugerencias,
  opciones,
  onAgregar,
  onDescartar,
}: {
  sugerencias: SugerenciaPublica[]
  opciones: OpcionesTarjeta
  onAgregar: (numero: number, tipo?: string, texto?: string) => void
  onDescartar: (numero: number) => void
}) {
  const [editando, setEditando] = useState<{ numero: number; tipo: string; texto: string } | null>(null)
  const [todas, setTodas] = useState(false)
  if (!sugerencias.length) return null
  const visibles = todas ? sugerencias : sugerencias.slice(0, VISIBLES)
  const ocultas = sugerencias.length - visibles.length
  return (
    <section className="sx-p-campo" aria-labelledby="sx-p-sugerencias">
      <strong id="sx-p-sugerencias">Sugerencias · {sugerencias.length}</strong>
      <span className="sx-p-ayuda">
        Salen de tus dudas y de lo que podría complicarlo. Agrega las que te sirvan; las demás, «Ahora no».
      </span>
      <ul className="sx-p-pasos">
        {visibles.map((s) =>
          editando?.numero === s.numero ? (
            <li key={s.numero} className="sx-p-paso" data-editando="true">
              <div className="sx-p-paso-fila">
                <SelectTipoPaso
                  valor={editando.tipo}
                  opciones={opciones}
                  etiqueta="Tipo de la sugerencia"
                  onCambiar={(tipo) => setEditando({ ...editando, tipo })}
                />
                <Input
                  aria-label="Texto de la sugerencia"
                  value={editando.texto}
                  onChange={(e) => setEditando({ ...editando, texto: e.target.value })}
                />
                <span className="sx-p-paso-botones">
                  <button
                    type="button"
                    className="sx-p-mini"
                    data-principal="true"
                    disabled={!editando.texto.trim()}
                    onClick={() => {
                      onAgregar(s.numero, editando.tipo, editando.texto.trim())
                      setEditando(null)
                    }}
                  >
                    Agregar así
                  </button>
                  <button type="button" className="sx-p-mini" onClick={() => setEditando(null)}>
                    Cancelar
                  </button>
                </span>
              </div>
              <small>para: {s.origen.texto} · editando antes de agregar</small>
            </li>
          ) : (
            <li key={s.numero} className="sx-p-paso">
              <div className="sx-p-paso-fila">
                <p>
                  <InsigniaPaso tipo={s.tipo} opciones={opciones} /> {s.texto}
                </p>
                <span className="sx-p-paso-botones">
                  <button
                    type="button"
                    className="sx-p-mini"
                    data-principal="true"
                    onClick={() => onAgregar(s.numero)}
                  >
                    Agregar
                  </button>
                  <button
                    type="button"
                    className="sx-p-mini"
                    onClick={() => setEditando({ numero: s.numero, tipo: s.tipo, texto: s.texto })}
                  >
                    Editar
                  </button>
                  <button type="button" className="sx-p-mini" onClick={() => onDescartar(s.numero)}>
                    Ahora no
                  </button>
                </span>
              </div>
              <small>para: {s.origen.texto}</small>
            </li>
          ),
        )}
      </ul>
      {ocultas > 0 && (
        <button type="button" className="sx-p-mas" onClick={() => setTodas(true)}>
          + {ocultas} {ocultas === 1 ? 'sugerencia más' : 'sugerencias más'}
        </button>
      )}
    </section>
  )
}
