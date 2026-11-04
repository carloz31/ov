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
// DATO DE PRUEBA: contenidos mínimos de la ruta de prueba (F00), en `contenidos/ruta/`; los usa el conjunto `ruta`
// del backend, congelado como banco de pruebas de mecánicas.
import tInicio from './contenidos/ruta/t_inicio.json'
import tPartida from './contenidos/ruta/t_partida.json'
import tCierreInicio from './contenidos/ruta/t_cierre_inicio.json'
import tLumi1 from './contenidos/ruta/t_lumi_1.json'
import tLumi2 from './contenidos/ruta/t_lumi_2.json'
import tLumi3 from './contenidos/ruta/t_lumi_3.json'
import tLumi4 from './contenidos/ruta/t_lumi_4.json'
import tLumi5 from './contenidos/ruta/t_lumi_5.json'
import tOpcional from './contenidos/ruta/t_opcional.json'
import tExpectativas from './contenidos/ruta/t_expectativas.json'
import tValores from './contenidos/ruta/t_valores.json'
import tAdicional from './contenidos/ruta/t_adicional.json'
import tEco from './contenidos/ruta/t_eco.json'
import tLeeCuestionario from './contenidos/ruta/t_lee_cuestionario.json'
import tBatalla from './contenidos/ruta/t_batalla.json'
import tExplorar from './contenidos/ruta/t_explorar.json'
import tLlegada from './contenidos/ruta/t_llegada.json'
import tComparar from './contenidos/ruta/t_comparar.json'
import tProyecto from './contenidos/ruta/t_proyecto.json'
import tInvestigador from './contenidos/ruta/t_investigador.json'
import tInvestigadorCierre from './contenidos/ruta/t_investigador_cierre.json'
import tApo1 from './contenidos/ruta/t_apo_1.json'
import tApo2 from './contenidos/ruta/t_apo_2.json'
import tMisionIntereses from './contenidos/ruta/t_mision_intereses.json'
import tMisionIntereses2 from './contenidos/ruta/t_mision_intereses_2.json'
import tMisionInteligencias from './contenidos/ruta/t_mision_inteligencias.json'
import tMisionHabilidades from './contenidos/ruta/t_mision_habilidades.json'
import tCaso from './contenidos/ruta/t_caso.json'
import tCaso2 from './contenidos/ruta/t_caso_2.json'
import tContraste from './contenidos/ruta/t_contraste.json'
// Ajuste carga-actividades: contenido real de la plataforma (conjunto `contenido` del backend).
import b0_1 from './contenidos/plataforma/b0_1.json'
import b0_2 from './contenidos/plataforma/b0_2.json'
import b0_3 from './contenidos/plataforma/b0_3.json'
import b0_4 from './contenidos/plataforma/b0_4.json'
import b0_5 from './contenidos/plataforma/b0_5.json'
import b0_6 from './contenidos/plataforma/b0_6.json'
import b1_1 from './contenidos/plataforma/b1_1.json'
import b1_2 from './contenidos/plataforma/b1_2.json'
import b1_3 from './contenidos/plataforma/b1_3.json'
import b1_4 from './contenidos/plataforma/b1_4.json'
import b1_5 from './contenidos/plataforma/b1_5.json'
import b1_6 from './contenidos/plataforma/b1_6.json'
import b1_7 from './contenidos/plataforma/b1_7.json'
import b2_1 from './contenidos/plataforma/b2_1.json'
import b2_2 from './contenidos/plataforma/b2_2.json'
import b2_3 from './contenidos/plataforma/b2_3.json'
import b2_4 from './contenidos/plataforma/b2_4.json'
import b2_5 from './contenidos/plataforma/b2_5.json'
import b2_6 from './contenidos/plataforma/b2_6.json'
import b3_1 from './contenidos/plataforma/b3_1.json'
import b3_2 from './contenidos/plataforma/b3_2.json'
import b3_3 from './contenidos/plataforma/b3_3.json'
import b3_4 from './contenidos/plataforma/b3_4.json'
import b3_5 from './contenidos/plataforma/b3_5.json'
import b3_6 from './contenidos/plataforma/b3_6.json'
import b3_7 from './contenidos/plataforma/b3_7.json'
import b3_8 from './contenidos/plataforma/b3_8.json'
import b3_9 from './contenidos/plataforma/b3_9.json'
import b3_10 from './contenidos/plataforma/b3_10.json'
import b3_a from './contenidos/plataforma/b3_a.json'
import b3_b from './contenidos/plataforma/b3_b.json'
import b4_1 from './contenidos/plataforma/b4_1.json'
import b4_2 from './contenidos/plataforma/b4_2.json'
import b4_3 from './contenidos/plataforma/b4_3.json'
import b4_4 from './contenidos/plataforma/b4_4.json'
import b4_5 from './contenidos/plataforma/b4_5.json'
import b4_a from './contenidos/plataforma/b4_a.json'
import b5_1 from './contenidos/plataforma/b5_1.json'
import b5_2 from './contenidos/plataforma/b5_2.json'
import b5_3 from './contenidos/plataforma/b5_3.json'
import b5_4 from './contenidos/plataforma/b5_4.json'
import b5_5 from './contenidos/plataforma/b5_5.json'
import feria from './contenidos/plataforma/feria.json'
import h1 from './contenidos/plataforma/h1.json'
import h2 from './contenidos/plataforma/h2.json'
import h3 from './contenidos/plataforma/h3.json'
import h_habilidades_1 from './contenidos/plataforma/h_habilidades_1.json'
import h_habilidades_2 from './contenidos/plataforma/h_habilidades_2.json'
import h_habilidades_3 from './contenidos/plataforma/h_habilidades_3.json'
import h_habilidades_4 from './contenidos/plataforma/h_habilidades_4.json'
import h_inteligencias_1 from './contenidos/plataforma/h_inteligencias_1.json'
import h_inteligencias_2 from './contenidos/plataforma/h_inteligencias_2.json'
import h_inteligencias_3 from './contenidos/plataforma/h_inteligencias_3.json'
import h_inteligencias_4 from './contenidos/plataforma/h_inteligencias_4.json'
import h_inteligencias_5 from './contenidos/plataforma/h_inteligencias_5.json'
import h_intereses_1 from './contenidos/plataforma/h_intereses_1.json'
import h_intereses_2 from './contenidos/plataforma/h_intereses_2.json'
import h_intereses_3 from './contenidos/plataforma/h_intereses_3.json'
import h_intereses_4 from './contenidos/plataforma/h_intereses_4.json'
import h_intereses_5 from './contenidos/plataforma/h_intereses_5.json'
import h_intereses_6 from './contenidos/plataforma/h_intereses_6.json'
import investigador from './contenidos/plataforma/investigador.json'
import investigador_cierre from './contenidos/plataforma/investigador_cierre.json'
import ma1 from './contenidos/plataforma/ma1.json'
import ma2 from './contenidos/plataforma/ma2.json'
import ma3 from './contenidos/plataforma/ma3.json'
import ma4 from './contenidos/plataforma/ma4.json'
import ma5 from './contenidos/plataforma/ma5.json'
import ma6 from './contenidos/plataforma/ma6.json'
import ma7 from './contenidos/plataforma/ma7.json'
import ma7_b from './contenidos/plataforma/ma7_b.json'
import ma8 from './contenidos/plataforma/ma8.json'
import ma9 from './contenidos/plataforma/ma9.json'
import p1 from './contenidos/plataforma/p1.json'
import p2 from './contenidos/plataforma/p2.json'
import p3 from './contenidos/plataforma/p3.json'
import p4 from './contenidos/plataforma/p4.json'
import p5 from './contenidos/plataforma/p5.json'
import p6 from './contenidos/plataforma/p6.json'
import p7 from './contenidos/plataforma/p7.json'
import p8 from './contenidos/plataforma/p8.json'
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
  t_lumi_1: tLumi1,
  t_lumi_2: tLumi2,
  t_lumi_3: tLumi3,
  t_lumi_4: tLumi4,
  t_lumi_5: tLumi5,
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
  t_investigador: tInvestigador,
  t_investigador_cierre: tInvestigadorCierre,
  t_apo_1: tApo1,
  t_apo_2: tApo2,
  t_mision_intereses: tMisionIntereses,
  t_mision_intereses_2: tMisionIntereses2,
  t_mision_inteligencias: tMisionInteligencias,
  t_mision_habilidades: tMisionHabilidades,
  t_caso: tCaso,
  t_caso_2: tCaso2,
  t_contraste: tContraste,
  b0_1,
  b0_2,
  b0_3,
  b0_4,
  b0_5,
  b0_6,
  b1_1,
  b1_2,
  b1_3,
  b1_4,
  b1_5,
  b1_6,
  b1_7,
  b2_1,
  b2_2,
  b2_3,
  b2_4,
  b2_5,
  b2_6,
  b3_1,
  b3_2,
  b3_3,
  b3_4,
  b3_5,
  b3_6,
  b3_7,
  b3_8,
  b3_9,
  b3_10,
  b3_a,
  b3_b,
  b4_1,
  b4_2,
  b4_3,
  b4_4,
  b4_5,
  b4_a,
  b5_1,
  b5_2,
  b5_3,
  b5_4,
  b5_5,
  feria,
  h1,
  h2,
  h3,
  h_habilidades_1,
  h_habilidades_2,
  h_habilidades_3,
  h_habilidades_4,
  h_inteligencias_1,
  h_inteligencias_2,
  h_inteligencias_3,
  h_inteligencias_4,
  h_inteligencias_5,
  h_intereses_1,
  h_intereses_2,
  h_intereses_3,
  h_intereses_4,
  h_intereses_5,
  h_intereses_6,
  investigador,
  investigador_cierre,
  ma1,
  ma2,
  ma3,
  ma4,
  ma5,
  ma6,
  ma7,
  ma7_b,
  ma8,
  ma9,
  p1,
  p2,
  p3,
  p4,
  p5,
  p6,
  p7,
  p8,
} as Record<string, ContenidoActividad>

export function contenidoPorClave(clave: string): ContenidoActividad | undefined {
  return Object.hasOwn(contenidos, clave) ? contenidos[clave] : undefined
}
