import bienvenida from './contenidos/mision_bienvenida.json'
import mitos from './contenidos/encuentro_mitos.json'
import pregones from './contenidos/registro_mis_pregones.json'
import huellas from './contenidos/registro_huellas.json'
import horizonte from './contenidos/registro_horizonte.json'
import brujula from './contenidos/mision_brujula.json'
import lineaTiempo from './contenidos/registro_linea_tiempo.json'
import mochila from './contenidos/registro_mochila.json'
import siguientePaso from './contenidos/registro_siguiente_paso.json'
import mara from './contenidos/instrumento_mara.json'
import elena from './contenidos/encuentro_resultado_elena.json'
import acompanar from './contenidos/pad_01_acompanar.json'
import informacion from './contenidos/pad_02_informacion.json'
import type { ContenidoActividad } from '@/types/activities'

export const contenidos: Record<string, ContenidoActividad> = {
  mision_bienvenida: bienvenida,
  encuentro_mitos: mitos,
  registro_mis_pregones: pregones,
  registro_huellas: huellas,
  registro_horizonte: horizonte,
  mision_brujula: brujula,
  registro_linea_tiempo: lineaTiempo,
  registro_mochila: mochila,
  registro_siguiente_paso: siguientePaso,
  instrumento_mara: mara,
  encuentro_resultado_elena: elena,
  pad_01_acompanar: acompanar,
  pad_02_informacion: informacion,
} as Record<string, ContenidoActividad>

export function contenidoPorClave(clave: string): ContenidoActividad | undefined {
  return Object.hasOwn(contenidos, clave) ? contenidos[clave] : undefined
}
