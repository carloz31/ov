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
// DATO DE PRUEBA: contenidos mínimos de la ruta de prueba (F00); se reemplazan al cargar la ruta real.
import tInicio from './contenidos/t_inicio.json'
import tPartida from './contenidos/t_partida.json'
import tCierreInicio from './contenidos/t_cierre_inicio.json'
import tOpcional from './contenidos/t_opcional.json'
import tExpectativas from './contenidos/t_expectativas.json'
import tValores from './contenidos/t_valores.json'
import tAdicional from './contenidos/t_adicional.json'
import tEco from './contenidos/t_eco.json'
import tLeeCuestionario from './contenidos/t_lee_cuestionario.json'
import tBatalla from './contenidos/t_batalla.json'
import tExplorar from './contenidos/t_explorar.json'
import tLlegada from './contenidos/t_llegada.json'
import tComparar from './contenidos/t_comparar.json'
import tProyecto from './contenidos/t_proyecto.json'
import tMisionIntereses from './contenidos/t_mision_intereses.json'
import tMisionIntereses2 from './contenidos/t_mision_intereses_2.json'
import tCaso from './contenidos/t_caso.json'
import tContraste from './contenidos/t_contraste.json'
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
  t_inicio: tInicio,
  t_partida: tPartida,
  t_cierre_inicio: tCierreInicio,
  t_opcional: tOpcional,
  t_expectativas: tExpectativas,
  t_valores: tValores,
  t_adicional: tAdicional,
  t_eco: tEco,
  t_lee_cuestionario: tLeeCuestionario,
  t_batalla: tBatalla,
  t_explorar: tExplorar,
  t_llegada: tLlegada,
  t_comparar: tComparar,
  t_proyecto: tProyecto,
  t_mision_intereses: tMisionIntereses,
  t_mision_intereses_2: tMisionIntereses2,
  t_caso: tCaso,
  t_contraste: tContraste,
} as Record<string, ContenidoActividad>

export function contenidoPorClave(clave: string): ContenidoActividad | undefined {
  return Object.hasOwn(contenidos, clave) ? contenidos[clave] : undefined
}
