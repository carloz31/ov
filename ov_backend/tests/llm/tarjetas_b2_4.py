"""Tarjetas de b2-4. Solo datos: el texto viene de `tarjetas-registros.md` y se copia tal cual.

`filtrar_etiqueta`: si el filtro rechaza una repregunta que contiene la etiqueta de la opción marcada. `podio`: la elección va ordenada, aunque el ítem del backend todavía no lo sea. `pregunta_por_opcion` y `general_por_opcion`: la pregunta mostrada y la base de `general` (y de `fuera_de_tema`, que usa la misma) dependen de la opción marcada. `ecos`: cómo se nombra cada eco y si va ordenado; `lista_ecos`: de dónde salen sus etiquetas. Las demás bases se leen de las líneas `BASE:` de la tarjeta.
"""

TARJETAS = {
    'b2-4-bien': {
        'filtrar_etiqueta': False,
        'podio': True,
        'pregunta': '¿Cómo notas que te va bien en la primera? Puede ser una nota, un trabajo o algo que te dijeron.',
        'tarjeta': '''NÚCLEO: una señal observable de que le va bien en una de las opciones de su podio (la
  pregunta es por la primera): un resultado (una nota, un concurso, un trabajo que le
  salió), lo que otros le piden o le reconocen con algo concreto, o algo que nota en sí
  al hacerlo (entiende rápido, termina antes, le sale sin tanto esfuerzo).
NO EXIGIR: la nota exacta, que sea el mejor del salón, que hable de las tres, ni que le
  guste.
GENERAL SI:
  - repite que le va bien, sin ninguna señal ("me va bien nomás", "soy bueno");
  - solo dice que le gusta o le interesa: es querer, no poder;
  - una opinión de otros sin qué ven en él ("todos dicen que soy bueno");
  - una facilidad sin nada que la muestre ("es lo mío", "se me da").
MATICES: lo escrito en "Otra" es una opción más. Si da una señal de otra opción de su
  podio = propio (no le pidas la primera). "No sé cómo lo noto" = no_sabe. Una
  autovaloración negativa ("no me va bien en nada") = no_sabe. Que en casa le exijan
  notas, sin violencia ni riesgo, NO es sensible.
EJEMPLOS:
  "Gané el concurso de oratoria del colegio" → propio (Comunicación: resultado)
  "Saco 16 o 17 casi siempre" → propio (resultado)
  "Cuando hay trabajo en grupo me buscan para armar las diapositivas" → propio (Computación: lo que otros le piden)
  "Las fórmulas me salen sin estudiar mucho" → propio (algo que nota en sí)
  "Me va bien nomás" → general (sin señal)
  "Me encanta el inglés" → general (gusto, no poder)
  "Todos dicen que soy bueno" → general (opinión sin qué ven)
  "Ni idea de cómo lo noto" → no_sabe
REPREGUNTA
  general · QUÉ PEDIR: una señal de que le va bien en lo que puso primero (u otra de su podio).
    BASE: «¿Cómo te das cuenta de que te va bien en eso? Puede ser una nota, un trabajo o algo que te dijeron.»
    CÓMO ADAPTARLA: nombra la opción de la que habló (si no habló de ninguna, la
    primera), nunca las tres. Si dijo que le gusta, reconócelo en pocas palabras ("que
    te guste ya cuenta") y pregunta cómo nota que le sale bien. Si dijo que otros lo
    dicen, pregunta qué ven ellos o en qué se lo notan. No pidas una nota exacta ni lo
    compares con otros.
  no_sabe / vacio · BASE: «Piensa en la última vez que te fue bien en eso: ¿qué pasó?»
  fuera_de_tema · BASE: «Volvamos a lo que pusiste primero: ¿cómo notas que te va bien ahí?»''',
    },
    'b2-4-cruce': {
        'filtrar_etiqueta': False,
        'pregunta_por_opcion': {
            'COINCIDEN': '¿En qué coinciden?',
            'EN_PARTE': '¿En qué sí y en qué no?',
            'NO_MUCHO': '¿En qué no coinciden? Puede ser algo que te gusta y te cuesta, o algo que te sale y no te gusta.',
        },
        'general_por_opcion': {
            'COINCIDEN': '¿En qué coinciden? Puede ser un curso o algo que haces.',
            'EN_PARTE': '¿Y en qué no coincide? Puede ser algo que te gusta y te cuesta, o algo que te sale y no te gusta.',
            'NO_MUCHO': '¿En qué no coinciden? Puede ser algo que te gusta y te cuesta, o algo que te sale y no te gusta.',
        },
        'ecos': {
            'bien': {'nombre': 'En qué te va mejor', 'ordenado': True},
            'cuesta': {'nombre': 'Lo que te cuesta', 'ordenado': False},
        },
        'lista_ecos': 'CURSOS_ACTIVIDADES',
        'tarjeta': '''NÚCLEO: nombra algo concreto de la relación entre lo que le gusta y lo que le sale (un
  curso, una actividad, un tema), según la opción que marcó:
  - COINCIDEN: algo que le gusta y le sale bien;
  - EN_PARTE: el punto en que NO coincide (algo que le gusta y le cuesta, o algo que
    le sale y no le gusta), con o sin el punto en que sí;
  - NO_MUCHO: un punto en que no coincide.
NO EXIGIR: por qué no coinciden, que lo resuelva, que diga qué hará, ni que lo que nombra
  esté en los ecos.
GENERAL SI:
  - solo el veredicto, sin nada concreto ("más o menos nomás", "sí, igualito");
  - en EN_PARTE, solo el punto en que sí coincide;
  - algo que abarca todo, sin nombrar nada ("todo lo que me gusta me sale", "nada me
    sale").
MATICES: los ecos sirven para entender la respuesta y anclar la repregunta, nunca para
  corregirla: si nombra algo que no marcó, vale. Con COINCIDEN, un gusto que se refiere a
  algo de su podio ya es el punto. Que le guste algo en que le va mal no se juzga ni se
  presenta como un problema. "No sé qué me gusta" = no_sabe. Si expresa sobre todo
  frustración o pena, sin nombrar nada = emocional.
EJEMPLOS:
  "Me encanta dibujar y en arte siempre saco buena nota" → propio (COINCIDEN)
  "Me gusta biología, pero los exámenes de química me matan" → propio (EN_PARTE: el no)
  "Coincide en que me gusta el inglés" → general (EN_PARTE: solo el sí)
  "Soy bueno organizando, pero no me gusta nada" → propio (NO_MUCHO)
  "Más o menos nomás" → general (veredicto)
  "No sé bien qué me gusta" → no_sabe
REPREGUNTA
  general · QUÉ PEDIR: el punto concreto que pide la opción marcada.
    BASE por opción:
      COINCIDEN: «¿En qué coinciden? Puede ser un curso o algo que haces.»
      EN_PARTE: «¿Y en qué no coincide? Puede ser algo que te gusta y te cuesta, o algo que te sale y no te gusta.»
      NO_MUCHO: «¿En qué no coinciden? Puede ser algo que te gusta y te cuesta, o algo que te sale y no te gusta.»
    CÓMO ADAPTARLA: si los ecos ayudan, ofrece un punto como posibilidad, con sus
    palabras, y deja otra opción abierta ("¿es lo de Matemática, o algo más?"); nunca lo
    afirmes. En EN_PARTE, si ya dijo en qué sí, reconócelo y pregunta solo en qué no. No
    preguntes por qué ni qué hará con eso.
  no_sabe / vacio · BASE: «Piensa en algo que esperas con ganas, aunque no te salga tan bien. ¿Cómo te va en eso?»
  fuera_de_tema · BASE: la de `general` de la opción marcada.''',
    },
}
