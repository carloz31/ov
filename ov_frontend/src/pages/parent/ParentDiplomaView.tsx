import { useState } from 'react'
import { Link, Navigate } from 'react-router'
import { ArrowLeft, Download, Printer } from 'lucide-react'
import { HojaDiploma } from '@/features/parent/components/servidor/HojaDiploma'
import { useParentPortalContext } from '@/features/parent/context/parentPortalContext'
import { useParentProfile } from '@/features/parent/hooks/useParentProfile'
import { appPaths } from '@/routes/paths'
import '@/features/parent/styles/mis-actividades.css'

// F08 (A9): el diploma en Mis actividades. «Descargar PDF» abre la impresión del navegador (guardar como PDF) con
// los estilos de impresión: solo el diploma, en una página horizontal. Sin diploma, vuelve a Mis actividades.
export function ParentDiplomaView() {
  const { familia } = useParentPortalContext()
  const { name } = useParentProfile()
  const [generando, setGenerando] = useState(false)
  const diploma = familia?.diploma
  if (!diploma?.obtenido || !diploma.obtenido_en || !diploma.codigo)
    return <Navigate replace to={appPaths.parent.activities} />
  const total = familia?.avance.total ?? 0
  function descargar() {
    setGenerando(true)
    setTimeout(() => {
      window.print()
      setGenerando(false)
    }, 50)
  }
  return (
    <div className="pa-vista pa-diploma-vista">
      <Link className="pa-volver" to={appPaths.parent.activities}>
        <ArrowLeft aria-hidden="true" size={18} />
        Volver a Mis actividades
      </Link>
      <header className="pa-diploma-cabecera">
        <div>
          <p className="pa-kicker">
            Ruta completada · {total} de {total} actividades
          </p>
          <h1>Su diploma de compromiso</h1>
          <p>Emitido por la plataforma a su nombre. Puede descargarlo o imprimirlo.</p>
        </div>
        <div className="pa-diploma-acciones">
          <button className="pa-boton pa-boton--claro" type="button" onClick={() => window.print()}>
            <Printer aria-hidden="true" size={18} />
            Imprimir
          </button>
          <button className="pa-boton" disabled={generando} type="button" onClick={descargar}>
            <Download aria-hidden="true" size={18} />
            {generando ? 'Generando…' : 'Descargar PDF'}
          </button>
        </div>
      </header>
      <HojaDiploma codigo={diploma.codigo} emitidoEn={diploma.obtenido_en} nombre={name} />
    </div>
  )
}
