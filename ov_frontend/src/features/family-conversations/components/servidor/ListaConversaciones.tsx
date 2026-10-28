import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Mail } from 'lucide-react'
import {
  conversacionesDePestana,
  pestanaInicial,
  pestanasConversaciones,
  type PestanaConversacion,
} from '@/lib/servidor/adaptadoresConversaciones'
import type { ModeloFamilia } from '../../types'
import { CabeceraFamilia } from './CabeceraFamilia'
import { TarjetaRegalo } from './TarjetaRegalo'
import { TarjetaTema } from './TarjetaTema'

// F08 (E4/A4): la lista con la carta a la derecha de la cabecera, el regalo y las pestañas con contador (la primera
// con contenido va seleccionada); grilla de dos columnas.
export function ListaConversaciones({ m, selector }: { m: ModeloFamilia; selector?: ReactNode }) {
  const { textos: t, datos } = m
  const pestanas = pestanasConversaciones(datos?.conversaciones ?? [], m.rol)
  const [elegida, setElegida] = useState<PestanaConversacion | null>(null)
  if (!datos) return null
  const activa = elegida ?? pestanaInicial(pestanas)
  const temas = conversacionesDePestana(datos.conversaciones, m.rol, activa)
  return (
    <div className="fam-container">
      <CabeceraFamilia
        kicker={t.kicker}
        titulo={t.titulo}
        subtitulo={t.subtituloLista}
        accion={
          <div className="fam-header-acciones">
            {selector}
            <Link className="fam-link" to={m.rutas.carta}>
              <Mail aria-hidden="true" size={20} />
              {t.enlaceCarta}
            </Link>
          </div>
        }
      />
      <TarjetaRegalo m={m} />
      <div aria-label={t.titulo} className="fam-tabs" role="tablist">
        {pestanas.map((p) => (
          <button
            key={p.pestana}
            aria-selected={p.pestana === activa}
            className="fam-tab"
            role="tab"
            type="button"
            onClick={() => setElegida(p.pestana)}
          >
            {t.pestanas[p.pestana]}
            <span className="fam-tab-contador">{p.cantidad}</span>
          </button>
        ))}
      </div>
      {temas.length ? (
        <div className="fam-grid-2">
          {temas.map((c) => (
            <TarjetaTema key={c.codigo} c={c} m={m} />
          ))}
        </div>
      ) : (
        <p className="fam-vacio">{t.vacio}</p>
      )}
    </div>
  )
}
