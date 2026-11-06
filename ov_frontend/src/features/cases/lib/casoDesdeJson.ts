import type { CasoJson, CasoJugable, ForestFirePhase, ForestFireProfessional } from '@/types/cases'
import type { OcupacionCaso } from '@/types/servidor'

// Ajuste carga-casos: un fondo o una intro sin imagen entregada caen a esta (ver pendientes-interfaz.md).
export const IMAGEN_RESPALDO_CASO = 'exploration-case-background.png'

type Escala = { titulo: string; minimo: number; maximo: number }

// El caso del JSON con lo que pone el servidor: el título de la actividad, la escala del caso y el cargo y la hoja de
// vida de cada ocupación del directorio (`ocupaciones`, en cualquier orden). Las estructuras son las de la Central:
// cada profesional se identifica por su `onet`. `ruta` arma la ruta pública de una imagen.
export function casoDesdeJson(
  json: CasoJson,
  escala: Escala,
  ocupaciones: OcupacionCaso[],
  ruta: (imagen: string) => string = (imagen) => imagen,
): CasoJugable {
  const porCodigo = new Map(ocupaciones.map((ocupacion) => [ocupacion.codigo, ocupacion]))
  const professionals: ForestFireProfessional[] = json.profesionales.map(({ onet, persona }) => {
    const ocupacion = porCodigo.get(onet)
    return {
      id: onet,
      occupationId: onet,
      personName: persona,
      name: ocupacion?.titulo ?? onet,
      description: ocupacion?.descripcion ?? '',
      skills: ocupacion?.aptitudes ?? [],
      knowledge: ocupacion?.conocimientos ?? [],
    }
  })
  const phases: ForestFirePhase[] = json.fases.map((fase, indice) => ({
    id: fase.id,
    number: indice + 1,
    name: fase.nombre,
    subtitle: fase.subtitulo,
    listenPrompt: fase.escuchar.texto,
    listenPromptMobile: fase.escuchar.textoMovil,
    backgroundImage: ruta(fase.fondo.imagen),
    backgroundFallback: ruta(IMAGEN_RESPALDO_CASO),
    backgroundPosition: fase.fondo.posicion,
    messages: fase.mensajes.map((m) => ({
      id: m.id,
      speaker: m.quien,
      context: m.contexto,
      message: m.mensaje,
      summary: m.resumen,
      position: m.posicion,
    })),
    problems: fase.problemas.map((p) => ({
      id: p.id,
      title: p.titulo,
      detail: p.detalle,
      resultNarrative: p.resultado,
      expectedProfessionalIds: p.necesidades.map((n) => n.onet),
      professionalContributions: Object.fromEntries(p.necesidades.map((n) => [n.onet, n.aporte])),
      missingContributionNarratives: Object.fromEntries(p.necesidades.map((n) => [n.onet, n.siFalta])),
    })),
  }))
  return {
    id: json.id,
    titulo: escala.titulo,
    tematica: json.tematica,
    intro: {
      narrativa: json.intro.narrativa,
      imagen: ruta(json.intro.imagen),
      imagenRespaldo: ruta(IMAGEN_RESPALDO_CASO),
      alerta: json.intro.alerta,
    },
    presupuesto: json.presupuesto,
    minimo: escala.minimo,
    maximo: escala.maximo,
    phases,
    professionals,
  }
}

// El total de necesidades del caso: su puntaje máximo.
export function totalNecesidades(json: CasoJson) {
  return json.fases.reduce(
    (total, fase) => total + fase.problemas.reduce((t, p) => t + p.necesidades.length, 0),
    0,
  )
}

// El `background-image` de una fase: con respaldo, se ve si la imagen de la fase no existe.
export function fondoFase(phase: Pick<ForestFirePhase, 'backgroundImage' | 'backgroundFallback'>) {
  return phase.backgroundFallback
    ? `url(${phase.backgroundImage}), url(${phase.backgroundFallback})`
    : `url(${phase.backgroundImage})`
}
