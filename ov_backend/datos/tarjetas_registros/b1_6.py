"""Tarjetas de b1-6. Solo datos: el texto de cada tarjeta es el de `claude/tarjetas-registros*.md`,
copiado carácter por carácter. `bases` repite, separadas, las líneas `BASE:` de la tarjeta (sin reemplazar los
marcadores); la prueba `test_llm_tarjetas.py` comprueba que están dentro del texto.
"""

TARJETAS = {
    'b1-6-mito': {
        'filtrar_etiqueta': False,
        'pregunta': '¿Cómo llegó a ti esa idea? Puede ser alguien que la dice, un lugar o algo que viste.',
        'tarjeta': '''NÚCLEO: cómo le llegó esa idea: una persona o un grupo cercano (mamá, un tío, sus
  amigos, un profesor), un lugar o medio concreto (el colegio, la academia, redes,
  la tele, el barrio) o algo que vio o vivió.
NO EXIGIR: el nombre de una persona, lo que piensa hoy de la idea, ni si está de acuerdo.
GENERAL SI:
  - un origen difuso, sin persona, lugar ni medio ("es lo que dice la gente",
    "todos lo dicen", "me lo dijeron", "es lo que se escucha");
  - solo su opinión sobre la idea, sin cómo le llegó ("es verdad", "ya no pienso así",
    por qué cree que es cierta);
  - dice que se le ocurrió solo, sin nada que lo llevara a pensarlo.
MATICES: "no sé de dónde" o "no me acuerdo" = no_sabe. Que siga creyendo la idea no se
  juzga. Un familiar que insiste o se enoja, sin violencia ni riesgo, NO es sensible.
EJEMPLOS:
  "Mi abuelo lo dice siempre en los almuerzos" → propio (persona)
  "Lo veo bastante en TikTok" → propio (medio)
  "Mi vecina estudió turismo y ahora vende ropa" → propio (algo que vio)
  "Eso dicen todos" → general (origen difuso)
  "Me lo han dicho" → general (origen difuso)
  "Es la verdad, los ingenieros ganan más" → general (opinión, sin origen)
  "Ni idea de dónde salió" → no_sabe
REPREGUNTA
  general · QUÉ PEDIR: cómo le llegó esa idea.
    BASE: «¿Cómo llegó a ti esa idea? Puede ser alguien que la dice, un lugar o algo que viste.»
    CÓMO ADAPTARLA: si dio un origen difuso ("la gente", "me dijeron"), pregunta quién
    o dónde la escucha más cerca de él o ella. Si dio su opinión, no la discutas, no la
    corrijas ni digas si la idea es cierta o falsa: pregunta cómo le llegó. En el
    seguimiento puedes seguir en el mismo foco con otro ángulo (la primera vez que la
    escuchó, quién la repite más cerca).
  no_sabe / vacio · BASE: «Piensa en la primera vez que la escuchaste o la viste: ¿dónde estabas o quién la decía?»
  fuera_de_tema · BASE: «Volvamos a la idea que marcaste: ¿cómo llegó a ti?»''',
        'bases': {
            'general': '¿Cómo llegó a ti esa idea? Puede ser alguien que la dice, un lugar o algo que viste.',
            'no_sabe': 'Piensa en la primera vez que la escuchaste o la viste: ¿dónde estabas o quién la decía?',
            'vacio': 'Piensa en la primera vez que la escuchaste o la viste: ¿dónde estabas o quién la decía?',
            'fuera_de_tema': 'Volvamos a la idea que marcaste: ¿cómo llegó a ti?',
        },
        'por_opcion': {
            'NINGUNO': {
                'filtrar_etiqueta': False,
                'pregunta': '¿Qué idea sobre carreras has oído mucho en tu casa o colegio?',
                'tarjeta': '''NÚCLEO: una idea o frase sobre carreras, estudios o trabajo que ha oído.
NO EXIGIR: dónde o a quién se la oyó, qué piensa de ella, ni que sea un mito.
GENERAL SI: nombra un tema sin decir la idea ("de la plata", "de la universidad"), o
  dice que se dicen muchas cosas sin decir ninguna.
MATICES: "ninguna" o que en su casa no se habla de carreras = no_sabe.
EJEMPLOS:
  "Que medicina es para los más inteligentes" → propio
  "Que hay que estudiar algo seguro" → propio
  "Hablan de la plata" → general (tema sin idea)
  "Nunca hablamos de carreras" → no_sabe
REPREGUNTA
  general / no_sabe / vacio · QUÉ PEDIR: una idea que haya oído.
    BASE: «Piensa en lo que dicen en tu casa cuando alguien elige carrera. ¿Qué frase se repite, aunque no estés de acuerdo con ella?»
    CÓMO ADAPTARLA: si nombró un tema (la plata, la universidad), pregunta qué dicen
    sobre eso. Si dijo que en su casa no se habla de carreras, ofrece otro lugar: el
    colegio, sus amigos o redes. No pidas de dónde viene la idea ni qué piensa de ella.''',
                'bases': {
                    'general': 'Piensa en lo que dicen en tu casa cuando alguien elige carrera. ¿Qué frase se repite, aunque no estés de acuerdo con ella?',
                    'no_sabe': 'Piensa en lo que dicen en tu casa cuando alguien elige carrera. ¿Qué frase se repite, aunque no estés de acuerdo con ella?',
                    'vacio': 'Piensa en lo que dicen en tu casa cuando alguien elige carrera. ¿Qué frase se repite, aunque no estés de acuerdo con ella?',
                },
            },
        },
    },
}
