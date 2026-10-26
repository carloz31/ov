import type { GestionInstitucion, IngresoPublico, TipoInstitucionServidor } from '@/types/servidor'

// F06 · Textos de pantalla del catálogo del servidor. Solo importa tipos: las pruebas lo cargan aislado.
export const nombresTipoInstitucion: Record<TipoInstitucionServidor, string> = {
  UNIVERSIDAD: 'Universidad',
  INSTITUTO: 'Instituto',
  FFAA_POLICIA: 'FF. AA. y Policía',
}
export const textoGestion = (gestion: GestionInstitucion | null) =>
  gestion === 'PUBLICA' ? 'Pública' : gestion === 'PRIVADA' ? 'Privada' : null

// «Tipo · Gestión · Ubicación», sin la gestión si no se conoce.
export function lineaInstitucion(institucion: {
  tipo: TipoInstitucionServidor
  gestion: GestionInstitucion | null
  ubicacion: { nombre: string }
}) {
  return [nombresTipoInstitucion[institucion.tipo], textoGestion(institucion.gestion), institucion.ubicacion.nombre]
    .filter(Boolean)
    .join(' · ')
}

export const soles = (monto: number) => `S/ ${monto.toLocaleString('es-PE')}`

// Los tramos del ingreso con su etiqueta y su ancho relativo al tramo más poblado.
export function tramosIngreso(ingreso: IngresoPublico) {
  const mayor = Math.max(1, ...ingreso.rangos.map((r) => r.porcentaje))
  return ingreso.rangos.map((rango) => ({
    etiqueta:
      rango.maximo === null
        ? `Desde ${soles(rango.minimo)}`
        : rango.minimo === 0
          ? `Hasta ${soles(rango.maximo)}`
          : `De ${soles(rango.minimo)} a ${soles(rango.maximo)}`,
    porcentaje: rango.porcentaje,
    ancho: (rango.porcentaje / mayor) * 100,
  }))
}

// Las letras del filtro RIASEC en el orden en que se pulsan, sin repetir y hasta tres; pulsar una elegida la quita.
export function alternarLetra(codigo: string, letra: string) {
  if (codigo.includes(letra)) return codigo.replace(letra, '')
  return codigo.length >= 3 ? codigo : codigo + letra
}
