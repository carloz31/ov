import { Star } from 'lucide-react'
import { ZONA_SERVIDOR, fechaServidor } from '@/lib/servidor/fechas'

const fechaLarga = (iso: string) =>
  fechaServidor(iso).toLocaleDateString('es-PE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: ZONA_SERVIDOR,
  })

// F08 (A9, §8.1): el diploma de compromiso, emitido por la plataforma a nombre del apoderado. Sin nombre de hijo.
// Es lo único que se imprime (estilos de impresión en mis-actividades.css).
export function HojaDiploma({
  nombre,
  emitidoEn,
  codigo,
}: {
  nombre: string
  emitidoEn: string
  codigo: string
}) {
  const anio = fechaServidor(emitidoEn).toLocaleDateString('es-PE', {
    year: 'numeric',
    timeZone: ZONA_SERVIDOR,
  })
  return (
    <article aria-label="Diploma de compromiso" className="pa-hoja">
      <span aria-hidden="true" className="pa-hoja-esquina is-1" />
      <span aria-hidden="true" className="pa-hoja-esquina is-2" />
      <span aria-hidden="true" className="pa-hoja-esquina is-3" />
      <span aria-hidden="true" className="pa-hoja-esquina is-4" />
      <p className="pa-hoja-plataforma">Plataforma de orientación vocacional</p>
      <p className="pa-hoja-marca">Explora</p>
      <p className="pa-hoja-otorga">otorga el presente</p>
      <h2 className="pa-hoja-titulo">Diploma</h2>
      <p className="pa-hoja-sub">de compromiso</p>
      <p className="pa-hoja-nombre">{nombre}</p>
      <p className="pa-hoja-texto">
        por completar la ruta de acompañamiento familiar y comprometerse a acompañar, con escucha y sin
        decidir por ellos, la orientación vocacional de su familia.
      </p>
      <div className="pa-hoja-firmas">
        <div>
          <p className="pa-hoja-firma">Equipo de orientación</p>
          <p className="pa-hoja-rol">Orientación Explora</p>
        </div>
        <div aria-hidden="true" className="pa-hoja-sello">
          <Star size={30} />
          <span>Explora · {anio}</span>
        </div>
        <div>
          <p className="pa-hoja-firma">{fechaLarga(emitidoEn)}</p>
          <p className="pa-hoja-rol">Fecha de emisión</p>
        </div>
      </div>
      <p className="pa-hoja-codigo">N.º {codigo} · Documento generado por la plataforma</p>
    </article>
  )
}
