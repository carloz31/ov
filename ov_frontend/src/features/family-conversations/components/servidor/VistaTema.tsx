import { useState } from 'react'
import { Link, Navigate } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import type { ModeloFamilia } from '../../types'
import { EsperandoTema } from './EsperandoTema'
import { ListasTema } from './ListasTema'
import { ResponderTema } from './ResponderTema'

// F08 (E5–E7/A5): una conversación según su estado. Tras guardar, el estado refrescado decide la pantalla:
// esperando (E6) o listas para conversar (E7). «Editar» vuelve a Responder con el texto guardado.
export function VistaTema({ m, codigo }: { m: ModeloFamilia; codigo: string }) {
  const [editando, setEditando] = useState(false)
  const c = m.datos?.conversaciones.find((conversacion) => conversacion.codigo === codigo)
  if (!m.datos) return null
  // Sin carta, un tema bloqueado o inexistente: la sección decide (carta pendiente o lista).
  if (!c || c.estado === 'bloqueada') return <Navigate replace to={m.rutas.lista} />
  const responde = editando || c.estado === 'sin_responder' || c.estado === 'te_toca'
  return (
    <div className="fam-container">
      <Link className="fam-back" to={m.rutas.lista}>
        <ArrowLeft aria-hidden="true" size={18} />
        {m.textos.volverLista}
      </Link>
      {c.estado === 'conversada' ? (
        <ListasTema c={c} m={m} />
      ) : responde ? (
        <ResponderTema key={`${c.codigo}-${c.estado}`} c={c} m={m} onGuardada={() => setEditando(false)} />
      ) : (
        <EsperandoTema c={c} m={m} onEditar={() => setEditando(true)} />
      )}
    </div>
  )
}
