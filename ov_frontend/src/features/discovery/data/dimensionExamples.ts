// Contenido de presentación del anexo de cierre, perfil y resultados · F2.
export const ejemplosDimension: Record<string, string> = {
  R: 'reparar o armar objetos, cultivar, construir, manejar equipos o trabajar al aire libre.',
  I: 'hacer experimentos, resolver acertijos, investigar un tema o entender cómo funciona algo.',
  A: 'dibujar, escribir, actuar, componer, diseñar o crear contenido.',
  S: 'enseñar a alguien, cuidar, escuchar, hacer voluntariado o trabajar en equipo.',
  E: 'dirigir un grupo, convencer, vender una idea u organizar un evento.',
  C: 'ordenar información, llevar registros, planificar con detalle o trabajar con números.',
  'INT-LIN': 'leer, escribir, debatir o aprender idiomas.',
  'INT-LOG': 'resolver problemas, programar, experimentar o encontrar patrones.',
  'INT-ESP': 'dibujar, armar objetos, leer mapas o diseñar.',
  'INT-CIN': 'practicar deportes, bailar, actuar o construir con las manos.',
  'INT-MUS': 'tocar un instrumento, recordar canciones o notar sonidos que otros no notan.',
  'INT-INTER': 'mediar en un conflicto, organizar un grupo o explicar algo a un amigo.',
  'INT-INTRA': 'escribir sobre lo que vives, fijarte metas propias o reflexionar antes de decidir.',
}

// Solo modo local. En API la descripción viene de DimensionResultado.descripcion.
export const descripcionesLocales: Record<string, string> = {
  R: 'Te atraen las actividades prácticas: trabajar con las manos, usar herramientas o máquinas y estar al aire libre.',
  I: 'Te atrae observar, preguntar y analizar para entender cómo y por qué funcionan las cosas.',
  A: 'Te atrae crear, imaginar y expresarte con libertad, sin reglas rígidas.',
  S: 'Te atrae ayudar, enseñar, cuidar o acompañar a otras personas.',
  E: 'Te atrae liderar, convencer, organizar proyectos y tomar decisiones.',
  C: 'Te atrae ordenar información, seguir procedimientos claros y trabajar con datos de forma precisa.',
}

// Textos aprobados en F2 para la demostración de inteligencias de F4.
export const descripcionesInteligenciasDemo: Record<string, string> = {
  'INT-LIN': 'Usar las palabras para expresarte, contar historias, explicar y convencer.',
  'INT-LOG': 'Razonar con números, patrones y relaciones de causa y efecto.',
  'INT-ESP': 'Imaginar, dibujar y orientarte en el espacio, viendo las cosas en tu mente.',
  'INT-CIN': 'Usar el cuerpo con precisión para moverte, crear o expresarte.',
  'INT-MUS': 'Percibir ritmos, melodías y sonidos, y crear con ellos.',
  'INT-INTER': 'Entender a otras personas, ponerte en su lugar y trabajar en equipo.',
  'INT-INTRA': 'Conocerte, reconocer lo que sientes y saber qué te motiva.',
}

export const fragmentosResumen: Record<string, string> = {
  R: 'trabajas con las manos, con herramientas o al aire libre',
  I: 'investigas y buscas entender cómo funcionan las cosas',
  A: 'creas y te expresas con libertad',
  S: 'ayudas, enseñas o acompañas a otras personas',
  E: 'lideras, convences u organizas proyectos',
  C: 'ordenas información y trabajas con datos de forma precisa',
}
