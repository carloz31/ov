import type { RolConversacion } from '@/lib/servidor/adaptadoresConversaciones'
import type { PestanaConversacion } from '@/lib/servidor/adaptadoresConversaciones'

// F08 (spec §3–§4): textos de pantalla de Familia (estudiante) y Conversaciones (apoderado). Las preguntas, la guía,
// el puente, los mensajes de bloqueo y los nombres llegan del servidor. `n`: el total de temas en letras.
const NUMEROS = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez']
export const enLetras = (n: number) => NUMEROS[n] ?? String(n)

export type TextosFamilia = ReturnType<typeof textosEstudiante>

export function textosEstudiante() {
  return {
    kicker: 'Familia · Dos miradas',
    kickerPendiente: 'Familia · Dos miradas',
    titulo: 'Conversaciones en familia',
    subtituloPendiente:
      'Acabas de abrir esta puerta. Antes de entrar, hay algo que solo tú puedes dejar aquí.',
    subtituloLista:
      'Cada tema lo responden por separado. Cuando estén las dos respuestas, aparece una guía para conversar fuera de la pantalla, sin apuro y sin exámenes.',
    enlaceCarta: 'Tu carta · ver o editar',
    heroKicker: 'Primer paso',
    heroTitulo: 'Deja una carta para tu familia',
    heroTexto:
      'Estás eligiendo un camino, y ellos quieren acompañarte sin decidir por ti. Cuéntales qué esperas de ellos en esta etapa, qué te ilusiona y qué te asusta un poco. Ellos la van a leer en algún momento del camino, pero tú no sabrás cuándo. Y mientras tanto, algo se va guardando para ti.',
    heroBoton: 'Escribir mi carta',
    heroNota: 'Toma unos 5 minutos',
    pasos: (n: string) => [
      {
        titulo: 'Escribes tu carta',
        texto: 'Puedes volver a editarla cuando quieras. Tu familia hace lo mismo desde su portal.',
      },
      {
        titulo: `Responden ${n} temas por separado`,
        texto: 'Cada uno desde su propia mirada. Se abren mientras avanzas en el camino.',
      },
      {
        titulo: 'Conversan… y al final, un regalo',
        texto: `Con las dos respuestas aparece una guía para hablar en casa. Cuando los ${n} estén conversados, se rompe un sello. Qué hay detrás, aún no lo sabes.`,
      },
    ],
    candado: 'Las conversaciones se abren cuando guardes tu carta',
    cartaVolver: 'Volver a Familia',
    cartaKicker: 'Tu carta para ellos',
    cartaTitulo: 'Lo que quiero decirle a mi familia',
    cartaSubtitulo:
      'Escríbela como les hablarías en la mesa. La van a leer en algún momento del camino, pero no sabrás cuándo. Puedes volver y agregar algo más siempre que quieras.',
    saludo: () => 'Querida familia,',
    cartaPlaceholder: 'En esta etapa me gustaría que ustedes…',
    cartaContador: (n: number) =>
      `${n} ${n === 1 ? 'palabra' : 'palabras'} · sin mínimo, pero que diga algo tuyo`,
    cartaLumiNombre: 'Lumi:',
    cartaLumi:
      'no es una tarea ni la leerá tu orientadora. Es solo para ellos. Escribe lo que de verdad te gustaría que escuchen; si no sabes por dónde empezar, te doy algunas ideas.',
    cartaIdeasBoton: 'Pedirle ideas a Lumi',
    ideas: [
      'Si no sabes por dónde empezar, prueba con una de estas frases. Son solo ideas: escribe con tus palabras.',
      '«Lo que me ilusiona de elegir mi camino es…»',
      '«Lo que me da un poco de miedo es…»',
      '«En esta etapa me gustaría que ustedes…»',
      '«Algo que quiero que recuerden pase lo que pase…»',
    ],
    cartaGuardadaTitulo: 'Tu carta queda guardada aquí',
    cartaGuardadaTexto:
      'Puedes volver a leerla y agregar algo nuevo en cualquier momento del camino. Lo que escribas hoy también lo verán.',
    cartaEntregada: 'Tu carta ya llegó a su destino. Queda aquí para que la vuelvas a leer.',
    cartaNota: null as string | null,
    otro: 'Tu familia',
    pestanas: {
      te_toca: 'Te toca responder',
      esperando: 'Esperando a tu familia',
      listas: 'Listas para conversar',
      por_abrir: 'Por abrir',
    } as Record<PestanaConversacion, string>,
    vacio: 'No hay temas en este estado por ahora.',
    regaloKicker: 'Un regalo sellado para el final',
    regaloConteo: (hechas: number, total: number) => `${hechas} de ${total} conversaciones`,
    // El enlace a la carta: en la cabecera (estudiante) o dentro del regalo (apoderado).
    cartaEnRegalo: false,
    letraEstudiante: 'E',
    temaNoAbierto: null as string | null,
    regaloTexto: (n: string) =>
      `Hay algo guardado para ti, y todavía no sabes qué es. El sello se rompe cuando hayan conversado los ${n} temas.`,
    regaloRoto: 'El sello se rompió',
    regaloRotoTexto: 'Hay algo esperándote aquí desde el primer día. Ya puedes abrirlo.',
    regaloAbrir: 'Abrir el regalo',
    regaloAbriendo: 'Abriendo…',
    porAbrirTitulo: 'Este tema se abre más adelante en tu camino.',
    irAlMapa: 'Ir al mapa',
    nueva: 'Nueva',
    responder: 'Responder',
    adelantar: 'Adelantar mi respuesta',
    ver: 'Ver',
    adelantarNota: null as ((hijo: string) => string) | null,
    volverLista: 'Volver a las conversaciones',
    dosMiradas: (tema: string) => `Dos miradas sobre ${tema.charAt(0).toLowerCase()}${tema.slice(1)}`,
    tuMirada: 'Tu mirada',
    respuestaPlaceholder: 'Escribe desde tu propia mirada… no hay respuestas correctas.',
    respuestaNota: 'Podrás editarla mientras tu familia no haya respondido.',
    guardarRespuesta: 'Guardar mi respuesta',
    otroRespondio: 'Tu familia ya respondió',
    otroRespondioTexto:
      'Su mirada se revela en cuanto guardes la tuya. Así ninguno responde pensando en el otro.',
    // Decorativo: el servidor no entrega la respuesta del otro hasta que respondan los dos.
    borroso: 'Una mirada que todavía no puedes leer, guardada hasta que escribas la tuya con calma.',
    miradaGuardada: 'Tu mirada ya está guardada',
    editar: 'Editar mientras tu familia no responda',
    esperandoTitulo: 'Esperando a tu papá, mamá o apoderado',
    esperandoTexto: 'Su respuesta aparecerá aquí cuando esté lista.',
    listasTitulo: 'Las dos miradas ya están sobre la mesa',
    miradaOtro: 'La mirada de tu familia',
    puente: 'Un puente entre ambas miradas',
    preguntasCasa: 'Preguntas para conversar en casa',
    algoQueSaben: 'Algo que ya saben',
    diarioKicker: 'Se abrió una entrada en tu diario',
    diarioBoton: 'Ir al diario',
    temaListo: (n: number, total: number) => `Tema ${n} de ${total} listo`,
    temaListoTexto: (n: string) =>
      `Cuando los ${n} estén así, se rompe el sello… y descubres qué había guardado. Ahora les toca conversar fuera de la pantalla.`,
    regaloPantallaKicker: (n: string) => `Conversaron los ${n} temas`,
    regaloPantallaTexto:
      'Hay algo esperándote aquí desde el primer día. Todavía no sabes qué es… pero ya puedes abrirlo.',
    eraCarta: 'Era una carta',
    eraCartaTitulo: 'Tu familia la escribió antes de empezar',
    remitente: (nombre: string, parentesco: string | null) =>
      `Escrita por ${nombre}${parentesco ? ` · tu ${parentesco}` : ''}`,
    paraTi: 'Para ti, cuando llegues hasta aquí',
    firma: (nombre: string, parentesco: string | null) => `— ${parentesco ? capital(parentesco) : nombre}`,
    regaloPie: 'Esta carta queda aquí, en Familia. Vuelve a leerla cuando lo necesites.',
    verSobre: 'Ver el sobre otra vez',
    cartaGuardadaAviso: 'Carta guardada',
    respuestaGuardadaAviso: 'Respuesta guardada',
    noSeGuardo: 'No se pudo guardar',
    guardarCarta: 'Guardar mi carta',
    guardando: 'Guardando…',
    cargandoTitulo: 'Abriendo Familia',
    cargandoFrase: 'Lumi está buscando sus conversaciones…',
  }
}

const capital = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1)

export function textosApoderado(hijo: string) {
  const base = textosEstudiante()
  return {
    ...base,
    kicker: 'Conversaciones en familia',
    kickerPendiente: `Conversaciones en familia · con ${hijo}`,
    titulo: 'Dos miradas, una conversación',
    subtituloPendiente: `Antes de los temas, le pedimos escribir unas líneas que ${hijo} leerá en algún momento del camino.`,
    subtituloLista: `Responden por separado. Con las dos respuestas aparece una guía para conversar en casa. ${hijo} va abriendo los temas con su avance; usted puede adelantar los suyos.`,
    enlaceCarta: 'Ver o editar mi carta',
    regaloConteo: (hechas: number, total: number) => `${hechas} de ${total} temas conversados`,
    cartaEnRegalo: true,
    letraEstudiante: hijo.charAt(0).toUpperCase(),
    temaNoAbierto: `Tema aún no abierto para ${hijo}`,
    nueva: `${hijo} respondió`,
    heroTitulo: `Escríbale una carta a ${hijo}`,
    heroTexto: `${hijo} está eligiendo un camino, y usted quiere acompañar sin decidir por él o ella. Cuéntele qué admira de cómo lo está pensando y cómo piensa acompañarle. La leerá en algún momento del camino, pero no sabrá cuándo. Y mientras tanto, algo se va guardando para usted.`,
    heroBoton: 'Escribir mi carta',
    pasos: (n: string) => [
      {
        titulo: 'Escribe su carta',
        texto: `Puede volver a editarla cuando quiera. ${hijo} hace lo mismo desde su camino.`,
      },
      {
        titulo: `Responden ${n} temas por separado`,
        texto:
          'Cada uno desde su propia mirada. Puede adelantar su respuesta aunque su hijo aún no llegue al tema.',
      },
      {
        titulo: 'Conversan… y al final, un regalo',
        texto: `Con las dos respuestas aparece una guía para hablar en casa. Cuando los ${n} estén conversados, se rompe un sello. Qué hay detrás, lo descubrirá entonces.`,
      },
    ],
    candado: 'Las conversaciones se abren cuando guarde su carta',
    cartaVolver: 'Volver a Conversaciones',
    cartaKicker: `Su carta para ${hijo}`,
    cartaTitulo: `Lo que quiero decirle a ${hijo}`,
    cartaSubtitulo: `Escríbala como le hablaría en la mesa. ${hijo} la leerá en algún momento del camino, pero no sabrá cuándo. Puede volver y agregar algo más siempre que quiera.`,
    saludo: () => `Querido/a ${hijo},`,
    cartaPlaceholder: 'Lo que admiro de cómo estás pensando tu futuro…',
    cartaContador: (n: number) => `${n} ${n === 1 ? 'palabra' : 'palabras'} · sin mínimo`,
    cartaLumiNombre: 'Si no sabe por dónde empezar',
    cartaLumi:
      'Le proponemos algunas ideas para arrancar: qué admira de cómo lo está pensando, cómo se compromete a acompañarlo, qué le gustaría que recuerde.',
    cartaIdeasBoton: 'Ver ideas',
    ideas: [
      'Si no sabe por dónde empezar, pruebe con una de estas frases. Son solo ideas: escriba con sus palabras.',
      '«Lo que admiro de cómo estás pensando tu futuro…»',
      '«Me comprometo a acompañarte así…»',
      '«Cuando yo tuve tu edad…»',
      '«Pase lo que pase, quiero que recuerdes…»',
    ],
    cartaGuardadaTitulo: 'Su carta queda guardada aquí',
    cartaGuardadaTexto: 'Puede volver a leerla y agregar algo nuevo en cualquier momento.',
    cartaEntregada: 'Su carta ya llegó a su destino. Queda aquí para que la vuelva a leer.',
    cartaNota: 'Solo la leerá su hijo. Ni la orientadora ni el colegio la ven.',
    otro: hijo,
    pestanas: {
      te_toca: 'Le toca responder',
      esperando: `Esperando a ${hijo}`,
      listas: 'Listas para conversar',
      por_abrir: 'Por abrir',
    } as Record<PestanaConversacion, string>,
    regaloTexto: (n: string) =>
      `Hay algo guardado para usted, y todavía no sabe qué es. El sello se rompe cuando hayan conversado los ${n} temas.`,
    regaloRotoTexto: 'Hay algo esperándole aquí desde el primer día. Ya puede abrirlo.',
    adelantarNota: (h: string) =>
      `${h} aún no llega a este tema en su camino. Puede adelantar su respuesta: lo verá cuando lo abra y responda.`,
    respuestaPlaceholder: 'Escriba desde su propia mirada… no hay respuestas correctas.',
    respuestaNota: `Podrá editarla mientras ${hijo} no haya respondido.`,
    otroRespondio: `${hijo} ya respondió`,
    otroRespondioTexto:
      'Su mirada se revela en cuanto guarde la suya. Así ninguno responde pensando en el otro.',
    borroso: 'Una mirada que todavía no puede leer, guardada hasta que escriba la suya con calma.',
    miradaGuardada: 'Su mirada ya está guardada',
    tuMirada: 'Su mirada',
    editar: `Editar mientras ${hijo} no responda`,
    esperandoTitulo: `Esperando a ${hijo}`,
    miradaOtro: `La mirada de ${hijo}`,
    temaListoTexto: (n: string) =>
      `Ahora les toca hablar en casa. Cuando los ${n} estén así, se rompe el sello… y descubrirá qué había guardado.`,
    regaloPantallaTexto:
      'Hay algo esperándole aquí desde el primer día. Todavía no sabe qué es… pero ya puede abrirlo.',
    eraCartaTitulo: `${hijo} la escribió antes de empezar`,
    remitente: (nombre: string) => `Escrita por ${nombre} · su hijo/hija`,
    firma: (nombre: string) => `— ${nombre}`,
    regaloPie: 'Esta carta queda aquí, en Conversaciones. Vuelva a leerla cuando lo necesite.',
    cargandoTitulo: 'Abriendo Conversaciones',
    cargandoFrase: 'Buscando sus conversaciones…',
  } satisfies TextosFamilia
}

export const textosFamilia = (rol: RolConversacion, hijo: string): TextosFamilia =>
  rol === 'estudiante' ? textosEstudiante() : textosApoderado(hijo)
