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
  no_sabe / vacio · BASE: «Puede ser algo pequeño: en lo que pusiste primero, ¿qué te sale un poco mejor que lo demás?»
  fuera_de_tema · BASE: «Volvamos a lo que pusiste primero: ¿cómo notas que te va bien ahí?»''',
    },
    'b2-4-cruce': {
        'filtrar_etiqueta': False,
        'pregunta_por_opcion': {
            'SI': '¿Qué es lo que te gusta de {primera}?',
            'MAS_O_MENOS': '¿Qué parte de {primera} te gusta y qué parte no tanto?',
            'NO_MUCHO': '¿Qué es lo que no te gusta de {primera}?',
        },
        'general_por_opcion': {
            'SI': '¿Qué parte de eso te gusta más? Puede ser algo que haces ahí o un momento en que la pasas bien.',
            'MAS_O_MENOS': '¿Qué parte de eso te gusta y cuál no tanto? Con una basta.',
            'NO_MUCHO': '¿Qué parte de eso no te gusta? Puede ser algo que haces ahí o cómo te sientes haciéndolo.',
        },
        'ecos': {
            'bien': {'nombre': 'Lo que mejor te sale', 'ordenado': False},
        },
        'lista_ecos': 'CURSOS_ACTIVIDADES',
        'tarjeta': '''NÚCLEO: algo concreto de esa actividad (la primera de su podio) que le gusta o no le
  gusta, según la opción que marcó:
  - SI: qué le gusta de ella: una parte, un momento, algo que hace ahí;
  - MAS_O_MENOS: una parte concreta que le gusta o una que no; basta una;
  - NO_MUCHO: qué no le gusta de ella, o qué preferiría hacer en su lugar.
NO EXIGIR: por qué le gusta o no, las dos partes en MAS_O_MENOS, qué hará, ni que lo
  relacione con una carrera.
GENERAL SI:
  - solo confirma la opción o repite el nombre de la actividad ("sí, me gusta harto",
    "me gusta el arte");
  - un gusto o un rechazo sin nada de la actividad ("es bacán", "me aburre", "todo me gusta").
MATICES: que no le guste lo que mejor le sale no se juzga ni se presenta como un
  problema; no le sugieras que debería gustarle. Si habla de otra actividad que
  prefiere, vale en MAS_O_MENOS y NO_MUCHO. "No sé si me gusta" = no_sabe. Que en casa
  lo hagan estudiar eso, sin violencia ni riesgo, NO es sensible. Si expresa sobre todo
  frustración o pena, sin nombrar nada = emocional.
EJEMPLOS:
  "Que puedo inventar mis propios diseños" → propio (SI, Arte)
  "Cuando por fin sale el resultado después de intentarlo varias veces" → propio (SI, Matemática)
  "Exponer sí, preparar las diapositivas me aburre" → propio (MAS_O_MENOS, Exponer)
  "Lo hago porque toca, preferiría estar dibujando" → propio (NO_MUCHO)
  "Es bacán" → general (sin nada de la actividad)
  "Me gusta el arte" → general (repite la actividad)
  "No sé si me gusta" → no_sabe
REPREGUNTA
  general · QUÉ PEDIR: una parte concreta de esa actividad que le gusta, o que no, según la opción.
    BASE por opción:
      SI: «¿Qué parte de eso te gusta más? Puede ser algo que haces ahí o un momento en que la pasas bien.»
      MAS_O_MENOS: «¿Qué parte de eso te gusta y cuál no tanto? Con una basta.»
      NO_MUCHO: «¿Qué parte de eso no te gusta? Puede ser algo que haces ahí o cómo te sientes haciéndolo.»
    CÓMO ADAPTARLA: nombra la actividad y ofrece dos o tres partes posibles de ella
    (comunicación: hablar, escribir, convencer a otros). Si dijo "me gusta" o "me
    aburre" sin más, pregunta qué parte. No le sugieras que debería gustarle ni
    preguntes por qué. Una sola pregunta.
  no_sabe / vacio · BASE: «Piensa en la última vez que lo hiciste: ¿qué parte disfrutaste o cuál te aburrió?»
  fuera_de_tema · BASE: la de `general` de la opción marcada.''',
    },
}
