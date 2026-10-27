import type { GestionInstitucion, TipoInstitucionServidor, TramoIngreso } from '@/types/servidor'

// F06 · Textos de pantalla del catálogo del servidor. Solo importa tipos: las pruebas lo cargan aislado.
export const nombresTipoInstitucion: Record<TipoInstitucionServidor, string> = {
  UNIVERSIDAD: 'Universidad',
  INSTITUTO: 'Instituto',
  FFAA_POLICIA: 'FF. AA. y Policía',
}
// Ajuste catalogo-datos-reales (F6): la etiqueta de tipo de una carrera.
export const nombresTipoCarrera: Record<TipoInstitucionServidor, string> = {
  UNIVERSIDAD: 'Universitaria',
  INSTITUTO: 'Técnica',
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
  return [
    nombresTipoInstitucion[institucion.tipo],
    textoGestion(institucion.gestion),
    institucion.ubicacion.nombre,
  ]
    .filter(Boolean)
    .join(' · ')
}

export const soles = (monto: number) => `S/ ${monto.toLocaleString('es-PE')}`

// Los extremos de un tramo de ingreso, en texto.
export const rangoSoles = (tramo: TramoIngreso) => `de ${soles(tramo.minimo)} a ${soles(tramo.maximo)}`

// Las letras del filtro RIASEC en el orden en que se pulsan, sin repetir y hasta tres; pulsar una elegida la quita.
export function alternarLetra(codigo: string, letra: string) {
  if (codigo.includes(letra)) return codigo.replace(letra, '')
  return codigo.length >= 3 ? codigo : codigo + letra
}
