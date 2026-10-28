import { useEffect, useState, type ReactNode } from 'react'
import { Link, Navigate } from 'react-router'
import { ArrowRight } from 'lucide-react'
import { puntosRegalo } from '@/lib/servidor/adaptadoresConversaciones'
import { enLetras } from '../../data/textosFamilia'
import type { ModeloFamilia } from '../../types'
import { PuntosRegalo } from './PuntosRegalo'
import { SobreSellado } from './SobreSellado'

// Las chispas que salen del sobre al abrirlo (CSS); posiciones fijas para que el marcado sea estable.
const CHISPAS = [
  [-120, -80],
  [110, -95],
  [-60, -140],
  [70, -150],
  [-150, 10],
  [150, 0],
  [0, -170],
  [-100, 60],
  [100, 70],
]

// F08 (E8/A6): pantalla propia del regalo. Sellado: el sobre flota y el sello late; «Abrir el regalo» lanza las
// chispas y la carta se eleva. Solo lectura. La animación se repite cada vez que se abre desde el sobre.
export function RegaloCarta({ m, selector }: { m: ModeloFamilia; selector?: ReactNode }) {
  const { textos: t, datos } = m
  const [fase, setFase] = useState<'sellado' | 'abriendo' | 'abierto'>('sellado')
  useEffect(() => {
    if (fase !== 'abriendo') return
    const espera = setTimeout(() => setFase('abierto'), 700)
    return () => clearTimeout(espera)
  }, [fase])
  if (!datos) return null
  if (!datos.cartas_disponibles) return <Navigate replace to={m.rutas.lista} />
  const n = enLetras(datos.total)
  if (fase !== 'abierto')
    return (
      <div className="fam-regalo-pantalla">
        {selector}
        <p className="fam-kicker">{t.regaloPantallaKicker(n)}</p>
        <h1>{t.regaloRoto}</h1>
        <p>{t.regaloPantallaTexto}</p>
        <div className="fam-chispas">
          <SobreSellado flota />
          {fase === 'abriendo' &&
            CHISPAS.map(([dx, dy]) => (
              <span
                key={`${dx}:${dy}`}
                aria-hidden="true"
                className="fam-chispa"
                style={{ left: '50%', top: '50%', ['--dx' as string]: `${dx}px`, ['--dy' as string]: `${dy}px` }}
              />
            ))}
        </div>
        <button
          className="fam-btn fam-btn--oro"
          disabled={fase === 'abriendo'}
          type="button"
          onClick={() => setFase('abriendo')}
        >
          {fase === 'abriendo' ? t.regaloAbriendo : t.regaloAbrir}
          <ArrowRight aria-hidden="true" size={18} />
        </button>
        <PuntosRegalo chicos puntos={puntosRegalo(datos)} />
      </div>
    )
  const { nombre, parentesco } = datos.otro
  return (
    <div className="fam-regalo-pantalla">
      {selector}
      <p className="fam-kicker">{t.eraCarta}</p>
      <h1>{t.eraCartaTitulo}</h1>
      <article className="fam-papel fam-carta-abierta">
        <p className="fam-kicker">{t.remitente(nombre, parentesco)}</p>
        <h2>{t.paraTi}</h2>
        <p className="fam-carta-texto fam-caligrafia">{datos.carta_recibida}</p>
        <p className="fam-firma fam-caligrafia">{t.firma(nombre, parentesco)}</p>
      </article>
      <div className="fam-regalo-pie">
        <p>{t.regaloPie}</p>
        <div>
          <button className="fam-btn fam-btn--borde" type="button" onClick={() => setFase('sellado')}>
            {t.verSobre}
          </button>
          <Link className="fam-btn fam-btn--borde" to={m.rutas.lista}>
            {t.volverLista}
          </Link>
        </div>
      </div>
    </div>
  )
}
