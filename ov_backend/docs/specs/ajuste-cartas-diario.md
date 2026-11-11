# Ajuste · cartas-diario

Las cartas del diario dejan de usar el LLM y pasan a su contenido definitivo en el conjunto `contenido`: cuatro cartas adaptadas a lo que el estudiante marcó, cinco fijas, un pool de doce preguntas del día y los textos de conversaciones que quedaron desactualizados con los registros nuevos. Sale de `main` (revisado sobre el commit `e8ee6136`, 11 nov 2026). Cambia el modelo de datos del diario, el contrato y las pantallas del diario en modo api.

Este documento es autocontenido: todos los textos que se cargan están aquí. **Donde este documento y cualquier otro choquen, gana este documento.**

## Criterio general

- **El diario no usa el LLM.** Ni las cartas ni la pregunta del día se redactan con un modelo. Todo texto del diario está escrito de antemano.
- **Una carta es fija o adaptada.** La adaptada es un texto fijo con variantes: el backend elige la variante por lo que el estudiante marcó y llena unos huecos. Tiene además un texto de respaldo, sin huecos.
- **La variante depende de datos, nunca de textos.** Usa opciones marcadas, los planes y la opción inicial. No lee lo que el estudiante escribió ni la clasificación del LLM de registros (salvo la regla de respaldo de 1.1).
- **La carta se arma al desbloquearse y se guarda armada.** Si después el estudiante edita el registro o mueve sus planes, la carta no cambia.
- **Nada del front decide ni nombra una carta.** En modo api, qué carta se abre y cómo se llama sale solo del backend. Los JSON de actividad dejan de llevar `promptDiario`.
- **Lo más simple.** El piloto no va a poder probar mucho el diario: donde haya dos caminos, va el que menos cambia.
- **Mecánica primero.** La carta adaptada se prueba con un dato de prueba en `ruta` antes de usarse en `contenido`.
- **Las reglas de apertura de las conversaciones no cambian.** Solo cambian sus textos y salen dos cartas de diario que colgaban de ellas.

## Qué hay hoy (para ubicar el cambio)

- `app/services/diario/asistente.py`: `PROMPT_DIARIO_V1`, `PROMPT_CARTA_V1`, `resolver_contexto`, `referencias_resolubles`, `redactar`. Una pregunta `personalizada` guarda su contexto al desbloquearse y se redacta con el LLM al abrirla (`abrir_pregunta`) o al sortearla (`pregunta_del_dia`).
- `app/services/diario/acciones.py`: `crear_desbloqueadas` (la llama `app/services/motor/reglas.py` en la misma transacción del desbloqueo), `abrir_pregunta`, `_leer_dia` y `pregunta_del_dia`.
- `app/services/diario/sorteo.py`: sortea la dimensión según el resultado de partida o llegada y, dentro, una pregunta DIARIA.
- `app/models/contenido.py`, `PreguntaDiario`: `personalizada`, `respaldo_si`. `app/models/progreso.py`, `Recomendacion`: `contexto`, `texto` (nulo = por redactar), `origen` (FIJA o LLM).
- `datos/contenido.py`: `PREGUNTAS_DIARIO` toma de `ruta` la fija `t-diario-fija` y las cinco DIARIA (una personalizada, `t-dia-favoritos`), y suma cuatro `d-conv-*`. Las cartas C1 a C6 ya no están cargadas.
- Front: `features/journal/` (`FilaCarta`, `useBuzonLumi`, `JournalEditor`, `DailyQuestionCard`) maneja la carta sellada, «Abrir» y «Lumi está escribiendo…». Diecisiete JSON de `contenidos/plataforma/` llevan `promptDiario`.

## Fase 1 · Mecánica del backend

### 1.1 Carta adaptada

**Hoy:** una pregunta `personalizada` lleva referencias y, opcionalmente, `respaldo_si` (`{item, opcion}`: si eligió esa opción, va la base sin LLM).

**Pasará a:** una pregunta DESBLOQUEABLE puede llevar **variantes**. Al desbloquearse, `crear_desbloqueadas` evalúa las variantes en orden y guarda en la recomendación el texto de la primera que cumple, con sus huecos llenos. Si ninguna cumple o falta un dato, guarda `pregunta` (el respaldo). No hay llamada a ningún modelo.

Cada variante tiene un código, sus condiciones (deben cumplirse todas) y su texto. Hacen falta tres tipos de condición:

| Condición | Se cumple cuando |
|---|---|
| Eligió | El intento vigente de un ítem tiene marcada alguna de las opciones indicadas |
| No eligió | El intento vigente de un ítem tiene alguna opción marcada y ninguna es de las indicadas |
| Opción inicial | Compara la carrera de `cuenta.opcion_inicial_id` con la carrera del Plan A: `MISMA`, `OTRA` o `SIN_OPCION` (la cuenta no tiene opción inicial). Sin Plan A no se cumple ninguna |

Y cuatro tipos de hueco:

| Hueco | De dónde sale |
|---|---|
| Nombre de una opción | La primera opción marcada en un ítem, traducida con una tabla de nombres del contenido (`{persona}` en 2.2) |
| Marcador con que respondió | Un marcador guardado en `valores_contexto['marcadores']` del intento vigente de un ítem (`{primera}`, `{plan_a}`, `{plan_b}`). Así la carta dice lo mismo que vio al responder |
| Plan A de hoy | El nombre de la carrera del Plan A al desbloquearse |
| Opción inicial | El nombre de la carrera de `cuenta.opcion_inicial_id` |

**Cuándo va el respaldo.**
- Ninguna variante cumple.
- Falta el valor de un hueco de la variante que cumple.
- Algún ítem que la carta lee (en una condición o en un hueco) tiene su intento vigente con `sensible` verdadero o `tipo_final = 'emocional'`. Es la regla que ya vale para los ecos: de un ítem así no se referencia nada, ni la elección.

Un ítem en `SIN_EVALUAR` o `ABIERTO` no lleva al respaldo: la carta solo usa lo marcado.

**Qué se guarda.** La recomendación guarda el texto ya armado y el código de la variante que tocó (nulo si fue el respaldo). Ese código no se expone al estudiante: sirve para el análisis del piloto.

La forma exacta de las variantes en los datos y en el modelo la propone Claude Code en su plan, con la opción más simple que cubra las cuatro cartas de 2.2.

### 1.2 Sale el LLM del diario

- **Salen** de `app/services/diario/asistente.py` los dos prompts, `redactar`, `resolver_contexto`, `referencias_resolubles`, `ContextoCarta`, `ContextoPersonalizacion`, `validar_personalizacion` y `carta_valida`. Si el archivo queda vacío, se borra.
- **Sale** `personalizar_entrada` de los evaluadores (`app/services/registro/gemini.py`, `app/services/registro/evaluacion.py` y el evaluador falso).
- **Sale** la acción `abrir-pregunta` (`app/api/diario.py`, `acciones.abrir_pregunta`): toda carta llega con su texto.
- **`pregunta-del-dia` se queda,** sin evaluador ni tiempo máximo: sortea y guarda el texto de la pregunta.
- **Salen** las referencias cuyo dueño es una pregunta de diario. Si con eso un tipo de referencia (`FAVORITOS` u otro) queda sin ningún uso, Claude Code lo lista en el plan y el usuario decide si se retira.

### 1.3 Modelo de datos (sigue `/cambio-modelo`)

El usuario ya decidió retirar del modelo lo que era del LLM del diario.

| Tabla | Cambio |
|---|---|
| `pregunta_diario` | Entra `variantes` (nula = carta fija). Salen `personalizada` y `respaldo_si` |
| `recomendacion` | Entra `variante` (código, nulo). Salen `contexto` y `origen`. `texto` pasa a obligatorio |

La migración deja con el texto base toda recomendación que hoy tenga `texto` nulo. `OrigenRedaccion` sale si nada más lo usa.

### 1.4 Pregunta del día

No se rediseña. Sigue saliendo una por día, se crea al pedirla y vale ese día.

- **El sorteo no cambia de mecanismo.** Las doce preguntas del pool van **sin dimensión**, así que todas pesan igual.
- **No se repite hasta agotar el pool:** `N_SIN_REPETIR_DIARIA` (`app/core/parametros.py`) pasa de 3 a 11.
- **Cuando una pregunta vuelve a salir,** llega como una pregunta nueva, en blanco. Lo que respondió la vez anterior sigue en su cuaderno como una entrada más. No se enlazan ni se muestra la respuesta vieja junto a la pregunta.
- **El mismo día,** al volver a entrar ve la misma pregunta, marcada como respondida si ya la respondió (como hoy).
- Sale la exclusión de preguntas «sin dato» (`sin_dato` en `_leer_dia`): ya no hay DIARIA personalizadas.

### 1.5 Dato de prueba en `ruta`

- `t-diario-personal` pasa a carta adaptada con dos variantes sobre `t-exp-ruta` (una con la opción `EMPRENDER`, que reemplaza a `RESPALDOS_DIARIO`, y otra con las demás), y un hueco de nombre de opción. Sale `RESPALDOS_DIARIO` del cargador.
- `t-dia-favoritos` pasa a fija y sale su referencia.
- Marcar lo nuevo como `DATO DE PRUEBA`.
- **Se autoriza adaptar las pruebas del diario de `ruta`** (`tests/integration/diario/`, `tests/unit/diario/`, `tests/integration/referencias/test_referencia_favoritos.py` y las que fijen `personalizada`, `contexto`, `origen` o el valor anterior de `N_SIN_REPETIR_DIARIA`), porque cambia la mecánica. Las demás pruebas de `ruta` no cambian.

## Fase 2 · Datos de `contenido`

### 2.1 Las nueve cartas desbloqueables

`PREGUNTAS_DIARIO` de `contenido` deja de tomar nada de `ruta`. Cada carta tiene un nombre corto, que es el que se ve en el buzón y en el cuaderno.

| Código | Nombre | Tipo | Regla: se abre al completar | Mensaje de bloqueo |
|---|---|---|---|---|
| `d-llego` | Cómo llego | Fija | b0-2 | Lumi te abre el diario en el bosque de las voces. |
| `d-voces` | Las voces | Adaptada | b1-3 | Se abre al poner frente a frente lo que esperan de ti y lo que tú quieres. |
| `d-nino` | Carta al niño que fui | Fija | ma1 | Se abre con la misión de Nadia sobre el niño o la niña que fuiste. |
| `d-sale-gusta` | Lo que me sale y lo que me gusta | Adaptada | b2-4 | Se abre al ver, con Nico, si te gusta lo que mejor te sale. |
| `d-no-se` | Lo que todavía no sé | Fija | b3-4 | Se abre al anotar lo que necesitas saber antes de elegir. |
| `d-moneda` | La moneda | Adaptada | b4-5 | Se abre cuando Iván tira la moneda por ti. |
| `d-antes-de-salir` | Antes de salir | Adaptada | b5-3 | Se abre al mirar el camino completo, antes de salir de la isla. |
| `d-conv-fortalezas` | Lo que vieron en mí | Fija | conversación conv-6 respondida por los dos | Se abre cuando tú y tu familia respondan «Fortalezas que quizá no vemos». |
| `d-conv-acompanar` | Cómo quiero que me acompañen | Fija | conversación conv-10 respondida por los dos | Se abre cuando tú y tu familia respondan «Ayúdame como lo necesito». |

Las siete primeras llevan una regla `PREGUNTA_DIARIO` con `COMPLETA_ACTIVIDAD` de su actividad (`R-d-llego`, `R-d-voces`…). Las dos últimas conservan sus reglas `R-d-conv-fortalezas` y `R-d-conv-acompanar`.

**Salen:**
- `t-diario-fija` y `R-t-diario-fija` (las reemplaza `d-llego`);
- `d-conv-futuro` y `d-conv-condiciones`, con `R-d-conv-futuro` y `R-d-conv-condiciones`;
- las cinco DIARIA heredadas de `ruta` y la referencia de `t-dia-favoritos` en `REFERENCIAS`;
- la fila «Diario: t-diario-fija y las DIARIA» de `PROVISIONALES`.

### 2.2 Textos de las cartas

#### Fijas

**`d-llego` · Cómo llego**
> Esta es la primera carta que te dejo. Ya sabes cómo va: tú escribes, yo leo y no juzgo. Empecemos por lo más simple. Se acaba el colegio: ¿qué es lo primero que sientes cuando lo piensas?

**`d-nino` · Carta al niño que fui**
> Esta carta no es para mí: es para el niño o la niña que fuiste. Yo solo te presto el papel. ¿Qué le contarías de quien eres hoy?

**`d-no-se` · Lo que todavía no sé**
> Hoy anotaste lo que necesitas saber antes de elegir. A veces no saber da curiosidad, y a veces da miedo lo que uno pueda encontrar. De eso que te falta averiguar, ¿hay algo que prefieres no saber todavía?

**`d-conv-fortalezas` · Lo que vieron en mí**
> Tu familia te contó lo que ve en ti. A veces uno se reconoce, y a veces se sorprende. ¿Qué sentiste al leerlo?

**`d-conv-acompanar` · Cómo quiero que me acompañen**
> Ya sabes cómo quisiera acompañarte tu familia. ¿Hay alguna ayuda que necesitas y que te cuesta pedir?

#### `d-voces` · Las voces (adaptada)

Lee `b1-3-voz` y `b1-3-mia`. No usa `b1-3-contraste`.

| Variante | Condiciones | Texto |
|---|---|---|
| `PERSONA_RUTA` | No eligió `NADIE` en b1-3-voz · no eligió `AUN_NO` en b1-3-mia | Hoy me contaste lo que {persona} espera de ti y lo que tú quieres. Eso ya quedó en tu registro; aquí te pregunto otra cosa. De todo eso, ¿hay algo que sientes y que todavía no le has dicho a {persona}? |
| `PERSONA_DUDA` | No eligió `NADIE` en b1-3-voz · eligió `AUN_NO` en b1-3-mia | Hoy me contaste lo que {persona} espera de ti, y que tú todavía no sabes qué quieres. No hay apuro. ¿Cómo llevas no saberlo todavía, sabiendo lo que {persona} espera? |
| `NADIE_RUTA` | Eligió `NADIE` en b1-3-voz · no eligió `AUN_NO` en b1-3-mia | Hoy me contaste que nadie te ha dicho claramente qué espera de ti, y que tú ya tienes una idea de lo que quieres. Decidir sin que nadie diga nada a veces alivia y a veces pesa. ¿A ti qué te pasa con eso? |
| `NADIE_DUDA` | Eligió `NADIE` en b1-3-voz · eligió `AUN_NO` en b1-3-mia | Hoy me contaste que nadie te ha dicho claramente qué espera de ti, y que tú todavía no sabes qué quieres. No hay apuro: yo también tengo mis dudas. Cuando piensas que eso lo decides tú, ¿qué sientes primero? |

**Respaldo:**
> Hoy hablamos de lo que se espera de ti y de lo que tú quieres. De todo eso, ¿hay algo que sientes y que todavía no le has dicho a nadie?

**`{persona}`:** la opción marcada en `b1-3-voz`, con esta tabla (lista `PERSONAS`):

| Opción | Texto |
|---|---|
| `MAMA` | tu mamá |
| `PAPA` | tu papá |
| `HERMANO` | tu hermano o hermana |
| `ABUELO` | tu abuelo o abuela |
| `OTRO_FAMILIAR` | ese familiar |
| `PROFESOR` | tu profesor o profesora |
| `AMIGO` | tu amigo o amiga |
| `PAREJA` | tu pareja |

#### `d-sale-gusta` · Lo que me sale y lo que me gusta (adaptada)

Lee `b2-4-cruce` (y, por la regla de respaldo, `b2-4-bien`, de donde sale `{primera}`).

| Variante | Condición | Texto |
|---|---|---|
| `SI` | Eligió `SI` en b2-4-cruce | Hoy vimos que lo que mejor te sale es {primera}, y me contaste que además te gusta. No siempre van juntas las dos cosas. ¿Hay algo que te gusta todavía más, aunque no te salga tan bien? |
| `MAS_O_MENOS` | Eligió `MAS_O_MENOS` | Hoy vimos que lo que mejor te sale es {primera}, y me contaste que te gusta más o menos. Que algo salga bien no obliga a quererlo. ¿Sientes que tendrías que seguir por ahí solo porque te sale? |
| `NO_MUCHO` | Eligió `NO_MUCHO` | Hoy vimos que lo que mejor te sale es {primera}, y me contaste que no te gusta mucho. Que algo salga bien no obliga a quererlo. ¿Qué es lo que sí te gusta hacer, aunque no te salga tan bien o casi nadie lo sepa? |

**Respaldo:**
> Hoy vimos lo que mejor te sale y cuánto te gusta. No siempre van juntas las dos cosas. ¿Hay algo que te gusta mucho, aunque no te salga tan bien?

**`{primera}`:** el marcador `primera` con que respondió `b2-4-cruce`, tal como lo guardó el registro (en minúscula; una «Otra», tal cual).

#### `d-moneda` · La moneda (adaptada)

Lee `b4-5-moneda`.

| Variante | Condición | Texto |
|---|---|---|
| `DESANIME` | Eligió `DESANIME` | Hoy la moneda cayó en {plan_b} y me contaste que te desanimaste. Aquí no hace falta explicarlo bien. ¿Qué fue lo primero que pensaste cuando la viste caer? |
| `TAMBIEN` | Eligió `TAMBIEN` | Hoy la moneda cayó en {plan_b} y me contaste que también te gustaría. Ahora imagina que la lanzo otra vez y sale {plan_a}. ¿Sientes lo mismo, o algo cambia? |
| `NO_SE` | Eligió `NO_SE` | Hoy la moneda cayó en {plan_b} y no supiste bien qué sentiste. Pasa mucho, y no hay que apurarlo. Mientras la moneda estaba en el aire, ¿hubo un lado que querías que saliera? |

**Respaldo:**
> Hoy dejamos que una moneda decidiera por un momento. Mientras estaba en el aire, ¿hubo un lado que querías que saliera?

**`{plan_a}` y `{plan_b}`:** los marcadores con que respondió `b4-5-moneda`.

#### `d-antes-de-salir` · Antes de salir (adaptada)

No lee ningún ítem de registro.

| Variante | Condición | Texto |
|---|---|---|
| `MISMA` | Opción inicial `MISMA` | Llegaste al muelle con {plan_a} en mente y hoy sigue siendo lo que tienes delante. No es lo mismo traer una idea que irse con ella después de todo este camino. Si pudieras hablarle a quien llegó ese primer día, ¿qué le dirías? |
| `OTRA` | Opción inicial `OTRA` | Llegaste al muelle pensando en {primera_opcion} y hoy lo que tienes delante es {plan_a}. Si pudieras hablarle a quien llegó ese primer día, ¿qué le dirías? |
| `SIN_OPCION` | Opción inicial `SIN_OPCION` | Llegaste al muelle sin una opción en mente y hoy lo que tienes delante es {plan_a}. Si pudieras hablarle a quien llegó ese primer día, ¿qué le dirías? |

**Respaldo** (sin Plan A):
> Ya casi terminas este camino. Si pudieras hablarle a quien llegó al muelle el primer día, ¿qué le dirías?

**`{plan_a}`:** la carrera del Plan A de hoy. **`{primera_opcion}`:** la carrera de la opción inicial.

### 2.3 Pool de la pregunta del día

Doce preguntas DIARIA, todas fijas y sin dimensión.

| Código | Nombre | Texto |
|---|---|---|
| `d-dia-admiraba` | A quién admiraba | Todos admiramos a alguien de chicos. ¿A quién admirabas tú, alguien real o de una historia? Cuéntame qué era lo que admirabas. |
| `d-dia-historia` | La historia del momento | Cuéntame de la serie, la película, el libro o el juego que te tiene enganchado ahora. ¿Qué personaje te gustaría ser? |
| `d-dia-frase` | Mi frase | Cuando algo se me pone difícil, yo me repito una frase. ¿Cuál es la tuya? Cuéntame de dónde la sacaste. |
| `d-dia-curiosidad` | Lo que me dio curiosidad | No todo lo que da curiosidad tiene que servir para algo. ¿Qué te dio curiosidad esta semana, aunque no tenga nada que ver con una carrera? |
| `d-dia-pude` | Lo que no creí que podía | A veces uno hace algo y recién después se da cuenta de que pudo. ¿Qué hiciste hace poco que no te creías capaz de hacer? |
| `d-dia-no-planee` | Lo que no planeé | En esta isla casi nada sale como uno lo planea, y no siempre es malo. ¿Qué cosa buena te pasó sin que la planearas? Cuéntame qué hiciste tú para que terminara bien. |
| `d-dia-importa` | Lo que me importa | Hoy no te pregunto por carreras. Aparte del estudio y el trabajo, ¿qué es lo más importante para ti en este momento? Cuéntame por qué. |
| `d-dia-tiempo` | El tiempo volando | Hay cosas que uno hace y el tiempo se pasa sin darse cuenta. ¿Te pasó hoy con algo? |
| `d-dia-pesa` | Lo que más me pesa | Yo tengo mis propias dudas, así que no te voy a apurar. De todo lo que tienes por decidir, ¿qué es lo que más te pesa hoy? |
| `d-dia-lejos` | Mirar lejos | A algunos mirar unos años adelante les da ganas, a otros les aprieta un poco el pecho, y a muchos las dos cosas. ¿A ti qué te provoca hoy? |
| `d-dia-rumbo` | Cambiar de rumbo | Hay gente que cambia de rumbo y no empieza de cero. Si un día te tocara a ti, ¿qué es lo que más te costaría? |
| `d-dia-no-puse` | Lo que no puse | A tu orientadora le cuentas lo que piensas. Aquí solo leo yo. ¿Hay algo que te quite seguridad y que no hayas puesto en ningún registro? |

### 2.4 Conversaciones

Las diez reglas `R-conv-*` no cambian: cada una pide la carta y completar una actividad requerida que sigue existiendo (b1-3, b1-6, b1-7, b2-3, b2-4, b3-3, b3-10, b4-3 y b5-1). Solo cambian estos textos de `datos/contenido.py`:

| Dónde | Hoy | Queda |
|---|---|---|
| Mensaje de `R-conv-3` | Se abre al tomar postura frente a los mitos, del otro lado del puente. | Se abre al contar de dónde te viene un mito, del otro lado del puente. |
| Mensaje de `R-conv-4` | Se abre al trazar tu línea de tiempo con el guardián. | Se abre al imaginar tu futuro con el guardián. |
| Mensaje de `R-conv-10` | Se abre al escribir tu proyecto con la vigía del faro. | Se abre al mirar tu proyecto con la vigía del faro. |
| conv-4, «algo que saben» | …separó lo que esperan de él de lo que espera él, y se imaginó a cinco años. Mientras tanto… | …separó lo que esperan de él de lo que espera él, e imaginó un día de su vida a los 23. Mientras tanto… |
| conv-10, «algo que saben» | En su recorrido, el estudiante escribió su proyecto con tres pasos y plazos. Mientras tanto… | En su recorrido, el estudiante armó su plan con sus primeros pasos y miró qué le da seguridad en su proyecto. Mientras tanto… |

El resto de cada texto no cambia.

## Fase 3 · Front (modo api)

### 3.1 Diario

- Toda carta llega con su texto. Salen la carta sellada, el botón «Abrir», «Lumi está escribiendo…» y lo que solo servía para esperar la redacción en `features/journal/` (`FilaCarta`, `useBuzonLumi`, `JournalEditor`, `DailyQuestionCard`), y `abrirPregunta` de `services/api/diario.ts`.
- Sale `personalizada` de los tipos (`types/servidor.ts`), del almacén (`store/servidor/diario.ts`) y de los adaptadores (`lib/servidor/adaptadoresDiario.ts`).
- Una carta lista lleva «Responder», como hoy.
- **En el cierre de una actividad** (`useActivityFinish`, `FinishJournalSection`) solo va un enlace: «Lumi te dejó una carta en tu diario», que lleva al diario con esa carta. No muestra el nombre ni el texto de la carta.
- No cambian el buzón, el archivo, el cuaderno ni la pantalla de la pregunta del día.

### 3.2 JSON de actividad (`src/data/activities/contenidos/plataforma/`)

**Sale `promptDiario`** de los diecisiete que lo llevan: `b0_2`, `b0_6`, `b1_1`, `b1_2`, `b1_3`, `b1_4`, `b1_6`, `b3_4`, `b3_10`, `b4_5`, `b5_1`, `b5_3`, `feria`, `h1`, `h2`, `h3` y `ma1`. Si el modo local mostraba esa pregunta para alguna de esas actividades, deja de mostrarla (se acepta como excepción al modo local congelado). Los JSON fuera de `plataforma/` no se tocan.

**Diálogos que nombran una carta:**

| Archivo | Hoy | Queda |
|---|---|---|
| `b0_2.json` | Al terminar este tramo vas a encontrar tu primera carta lista: «Cómo llego a este mundo». No hace falta que sea larga. Ahora sí, sigamos… | …tu primera carta lista: «Cómo llego». No hace falta que sea larga. Ahora sí, sigamos… |
| `b0_6.json` | Con esto cerramos el primer tramo. Arriba está el nevado, y después de él, la ciudad. Tu diario tiene una carta nueva esperándote: «Lo que siento ante la decisión». | Con esto cerramos el primer tramo. Arriba está el nevado, y después de él, la ciudad. |
| `b1_2.json` | Te dejé una carta en el diario: «Lo que siento al pensar en mi futuro». Si quieres contarme lo que te provocó el mirador, ahí está. | Si quieres contarme lo que te provocó el mirador, tu diario está abierto. |
| `b3_10.json` | …la ficha de los caminos que no van en línea recta y otra voz, la del cocinero. En tu diario: «Un viajero que ya pasó por aquí». | …la ficha de los caminos que no van en línea recta y otra voz, la del cocinero. |
| `feria.json` | La guía quedó en tu mochila. Y en tu diario, por si vas a una feria de verdad: «Después de la feria». | La guía quedó en tu mochila. |

`ma1.json` ya nombra «Carta al niño que fui» y no cambia.

## Fase 4 · Pruebas

Backend:

1. **Mecánica** (`ruta`): la primera variante que cumple gana; sin variante que cumpla va el respaldo; un ítem leído con `sensible` o `tipo_final = 'emocional'` lleva al respaldo; un hueco sin valor lleva al respaldo; la recomendación guarda el texto armado y el código de la variante; editar después el registro no cambia la carta.
2. **Carga** (`contenido`): las nueve desbloqueables y las doce DIARIA con nombre y texto; cada variante nombra ítems y opciones que existen, y sus huecos tienen de dónde salir; `{persona}` cubre las ocho opciones de `PERSONAS`; `contenido` no carga ninguna pregunta de `ruta` ni `d-conv-futuro` ni `d-conv-condiciones`.
3. **Recorrido** (`contenido`): al completar b0-2 llega `d-llego`; al completar b1-3 con «Mamá» y una ruta, `d-voces` trae la variante `PERSONA_RUTA` con «tu mamá»; con `NADIE` y `AUN_NO`, la `NADIE_DUDA`; al completar b4-5 con `TAMBIEN`, `d-moneda` trae los dos planes con que respondió; al completar b5-3, `d-antes-de-salir` trae `MISMA`, `OTRA` o `SIN_OPCION` según la opción inicial, y el respaldo sin Plan A.
4. **Conversaciones:** al responder los dos conv-6 llega `d-conv-fortalezas`; al responder conv-4 no llega ninguna carta. Se adapta la prueba que hoy espera `d-conv-futuro` con conv-4 (`tests/integration/datos/test_conversaciones_contenido.py`, `tests/integration/conversaciones/`).
5. **Pregunta del día:** sortea entre las doce sin llamar a ningún evaluador; en doce días seguidos no repite ninguna.
6. **Sin LLM:** ningún módulo de `app/services/diario/` importa un evaluador; no existe la ruta `abrir-pregunta`.

Front: se adaptan las pruebas de `tests/servidor/diario/` y las de cierre de actividad que fijan la carta sellada, `personalizada` o el texto de la carta en el cierre; se regeneran los fixtures (`scripts/exportar_fixtures_front.py`). `verificar_contenido_front.py` sin errores.

## Fase 5 · Cierre

- `docs/sistema/motor.md`, sección «Diario»: carta fija o adaptada, variantes, respaldo, pregunta del día sin redacción.
- `docs/sistema/registro.md`: sale «Asistente del diario».
- `docs/sistema/integracion.md`: el contrato del diario sin `personalizada` ni `abrir-pregunta`; las preguntas de `contenido` y las de `ruta`.
- `docs/sistema/referencias.md`: sin dueño `PREGUNTA_DIARIO`, si salió.
- `ov_frontend/AGENTS.md`, punto «Diario y señal (F05)»: toda carta llega con texto; nada del front nombra una carta; el cierre solo enlaza.
- `decisiones.md`: una viñeta por decisión de abajo.

## Decisiones del usuario

- El diario no usa el LLM: ni las cartas ni la pregunta del día. Se retiran del modelo las columnas que eran del LLM.
- Las cartas «personalizadas» son textos fijos con variantes según lo que el estudiante marcó; eso cuenta como la personalización.
- Son cuatro adaptadas: tras b1-3, b2-4, b4-5 y b5-3. No hay carta tras b4-1 ni tras b5-1.
- La carta de b1-3 no usa el contraste (coinciden, en parte, chocan), porque podría forzar una coincidencia que sus textos no muestran.
- Quedan nueve cartas desbloqueables y doce preguntas del día. Las de conv-4 y conv-9 salen.
- La pregunta del día no se complica: sin dimensiones y sin repetir hasta agotar las doce. El piloto no va a poder probarla mucho.
- En el cierre de una actividad solo va un enlace a la carta que Lumi dejó.
- Ninguna carta se desbloquea ni se nombra desde una consigna del front.
- Las conversaciones se abren con actividades que siguen existiendo; solo se corrigen sus textos.

## Fuera de este ajuste

- **Los mensajes de cierre (`mensajeFin`) de los registros,** entre ellos el de `b5_1.json` («…con pasos y plazos. Lumi te invita a actualizar tu línea de tiempo del desierto…»): van con el ajuste de contenido de los registros.
- **El mensaje de `R-b1-7`** («Toma postura frente a los mitos antes de seguir.»): es de las reglas de actividades, no de conversaciones.
- **Citar en `d-nino` lo que el estudiante escribió en b1-1:** no entra.
- **El regalo de las cartas de familia** sigue pidiendo las diez conversaciones respondidas.


## Ajuste · cartas-diario (plan aprobado)

### Contexto

El texto de observaciones es `ajuste-cartas-diario.md`. Lo que ese texto ya decide no se discute aquí.

- **Qué pide:** el diario deja de usar el LLM. Las cartas pasan a ser fijas o adaptadas: una adaptada es un texto con variantes, elegidas por lo que el estudiante marcó. La pregunta del día sale de un pool de doce, sin dimensión y sin repetir hasta agotarlas. Se corrigen además los textos de las conversaciones.
- **Spec y rama:** no hay spec en curso (`docs/specs/` está vacía), así que el ajuste tendrá la suya, `ov_backend/docs/specs/ajuste-cartas-diario.md`. La rama `ajuste/cartas-diario` ya está creada desde `main`.
- **Decidido en esta sesión:**
  - `FAVORITOS` **se queda**.
  - El dueño `PREGUNTA_DIARIO` de las referencias **se retira**.

### Qué cambia y por qué (hoy → pasará a)

- **`app/services/diario/asistente.py`.**
  - Hoy: `resolver_contexto`, `redactar` y los prompts redactan con el evaluador.
  - Pasará a: **se borra**. Entra `app/services/diario/cartas.py` con `armar_carta(sesion, cuenta, pregunta) -> (texto, variante | None)`, pura lectura y sin LLM.
- **`acciones.crear_desbloqueadas`.**
  - Hoy: guarda `contexto` y `texto=None` para una personalizada.
  - Pasará a: guarda siempre `texto` armado y `variante` con `armar_carta`, en la misma transacción del desbloqueo.
- **`acciones.abrir_pregunta`, `_leer_desbloqueada`, `_guardar_texto` y `_pregunta_abierta`; ruta `POST /acciones/diario/abrir-pregunta`; esquema `PreguntaAbierta`.** Salen.
  - `AbrirPreguntaEntrada` se queda: la usan archivar y desarchivar.
- **`acciones.pregunta_del_dia` y `_leer_dia`.**
  - Hoy: excluyen las «sin dato» (`referencias_resolubles`), redactan con el evaluador y tienen tiempo máximo.
  - Pasará a: sin evaluador ni `tiempo_maximo_segundos`. Se conservan el sorteo y las dos fases con `IntegrityError`, y se guarda `texto = pregunta.pregunta`.
  - En `app/api/diario.py`, `_con_asistente` pasa a llamar solo con `fabrica_sesiones`.
- **`app/core/parametros.py`.** `N_SIN_REPETIR_DIARIA` pasa de 3 a 11.
- **Evaluadores.** Sale `personalizar_entrada` de `registro/evaluacion.py` (el falso, con `contextos_diario`, `llamadas_diario` y `falla_diario`) y de `registro/gemini.py`, junto con su prompt si es exclusivo.
- **Esquemas y servicios del diario.**
  - Sale `personalizada` de `PreguntaDiarioEstado` y `EntradaDesbloqueada` (`app/schemas/diario.py`, `services/comun.py:entradas_desbloqueadas` y `diario/consultas.py:_estado`).
  - `EntradaDesbloqueada.texto` pasa a `str`.
  - `redactada` se queda en el contrato: ahora vale lo mismo que «recibida». Es el cambio menor, porque el front la usa.
- **Referencias.**
  - Sale el dueño `PREGUNTA_DIARIO`: la rama del cargador (`_validar_referencias`) y `referencias_por_pregunta` (`core/definiciones.py`).
  - `FAVORITOS` sigue en `TipoReferencia` y en `services/referencias.py`, sin ningún uso en los datos.

### Qué no cambia

- El sorteo (`sorteo.py`, pesos por dimensión): con todas las DIARIA sin dimensión, todas pesan `PESO_BASE_DIMENSION`.
- La vigencia, la regla «misma pregunta el mismo día» y el cierre al borrar.
- Archivar y desarchivar, las bandejas, el remitente (`actividad_id`), la amistad y el check-in.
- Las reglas de apertura de las conversaciones, y el regalo de las cartas de familia.
- Los ecos y marcadores de registro: `cartas.py` solo lee `valores_contexto['marcadores']` y reutiliza `referencias.referenciable`. No los recalcula.
- El buzón, el archivo, el cuaderno y la pantalla de la pregunta del día en el front, y los JSON fuera de `plataforma/`.

### Modelo de datos (sigue `/cambio-modelo`; una migración)

| Tabla | Cambio |
|---|---|
| `pregunta_diario` | Entra `variantes` (JSON, nula = fija). Salen `personalizada` y `respaldo_si` |
| `recomendacion` | Entra `variante` (str, nula). Salen `contexto`, `origen` y el CHECK `texto_con_origen`. `texto` pasa a NOT NULL |
| `referencia` | **Decisión de diseño aprobada:** sale `pregunta_diario_id` y el CHECK `un_dueno`. `actividad_id` pasa a NOT NULL |
| enum | Sale `OrigenRedaccion` (no tiene otro uso) |

Migración, en este orden:

1. `UPDATE recomendacion SET texto = (SELECT pregunta FROM pregunta_diario WHERE id = pregunta_diario_id) WHERE texto IS NULL`.
2. Borrar las filas de `referencia` con `pregunta_diario_id` no nulo, después de revisar que nada las apunte.
3. Los cambios de columnas en batch. Se revisa a mano con `render_as_batch`.

**Forma de `variantes`** (la propongo como la más simple que cubre las cuatro cartas):

```json
{"huecos": {"persona": {"tipo": "OPCION", "item": "b1-3-voz", "nombres": {"MAMA": "tu mamá"}},
            "primera": {"tipo": "MARCADOR", "item": "b2-4-cruce", "marcador": "primera", "origen": "b2-4-bien"},
            "plan_a":  {"tipo": "PLAN_A"},
            "primera_opcion": {"tipo": "OPCION_INICIAL"}},
 "variantes": [{"codigo": "PERSONA_RUTA",
                "condiciones": [{"tipo": "NO_ELIGIO", "item": "b1-3-voz", "opciones": ["NADIE"]},
                                {"tipo": "OPCION_INICIAL", "valor": "MISMA"}],
                "texto": "… {persona} …"}]}
```

Una condición es de tipo `ELIGIO`, `NO_ELIGIO` u `OPCION_INICIAL`. Un hueco es de tipo `OPCION`, `MARCADOR`, `PLAN_A` u `OPCION_INICIAL`.

- **Los ítems que la carta lee** son los de las condiciones, más el `item` y el `origen` de los huecos. Si alguno está `sensible` o tiene `tipo_final='emocional'`, va el respaldo.
- **El campo `origen` de un hueco `MARCADOR`** cubre lo que pide el texto: «por la regla de respaldo, `b2-4-bien`».
- **En `d-moneda`,** `{plan_a}` y `{plan_b}` son huecos de tipo `MARCADOR` sobre `b4-5-moneda`, con los valores guardados al responder. El tipo `PLAN_A` se usa solo en `d-antes-de-salir`.
- **El Plan A** (tipo `PLAN_A`) es la primera `TarjetaCarrera` activa por `prioridad`, con su `Carrera.nombre`.
- **La opción inicial** es la carrera de `cuenta.opcion_inicial_id`.
- **En los datos,** `PREGUNTAS_DIARIO` pierde el campo `personalizada`: queda `(código, nombre, pregunta, uso, dimensión)`. Entra `VARIANTES_DIARIO = {código: {...}}`, y sale `RESPALDOS_DIARIO`.
- **El cargador (`_preguntas_diario`) valida:**
  - que solo una DESBLOQUEABLE lleve variantes;
  - que cada ítem exista y cada opción exista en su lista o en sus opciones propias;
  - que las claves de `nombres` sean opciones del ítem y que cubran **todas** las opciones de su lista (en `d-voces`, las ocho de `PERSONAS`);
  - que el marcador aparezca en los textos del ítem (`contexto.marcadores_de` / `_textos_del_item`);
  - que todo `{hueco}` de un texto esté declarado;
  - que el respaldo no tenga huecos.

**Base ya cargada con `contenido`.**

- **El problema:** el cargador no actualiza fila por fila. Si una base no se recarga, conserva las preguntas que salen (`t-diario-fija`, `d-conv-futuro`, `d-conv-condiciones` y las cinco DIARIA de `ruta`), con sus reglas, recomendaciones y entradas. Además, la migración solo cambia columnas, no datos de catálogo.
- **Qué se hace:** como todavía no hay estudiantes reales, se reinicia todo.
  1. `uv run alembic upgrade head`.
  2. `uv run python -m datos.cargar contenido --vaciar`. Esto vacía todas las tablas, estado y cuentas incluidos, y vuelve a cargar.
- **Resultado:** las recomendaciones y entradas que apuntaban a las preguntas retiradas se pierden con el resto del estado. No se escribe una migración de datos para conservarlas.

### Backend · fases

**F1 · Mecánica, modelo y `ruta`** (1.1–1.5)

- Modelo, migración, `cartas.py` y los cambios de acciones, API, esquemas y evaluadores de arriba.
- `datos/ruta.py` (`DATO DE PRUEBA`):
  - `t-diario-personal` pasa a adaptada sobre `t-exp-ruta`, con dos variantes: `EMPRENDER` (eligió) y `OTRA_RUTA` (no eligió `EMPRENDER`). Lleva un hueco `{ruta}` de tipo `OPCION`, con la tabla de nombres de `RUTAS_DESPUES_COLEGIO`.
  - Sale `t-ref-diario-espera`.
  - `t-dia-favoritos` pasa a fija y sale `t-ref-diario-favoritos`.
- Pruebas que se adaptan (autorizado en 1.5 y en Fase 4):
  - `tests/unit/diario/`, `tests/integration/diario/` y `test_referencia_favoritos.py`. Esta última crea su propia referencia `FAVORITOS` con dueño actividad.
  - Las que fijan `personalizada`, `abrir-pregunta`, `origen` o `contexto`:
    - `contrato/test_consultas_dominio.py` y `test_exportar_fixtures_front.py`;
    - `escenarios/ruta/test_ruta_corta.py` y `soporte/soporte_escenarios_ruta.py`;
    - `secciones/test_secciones.py`;
    - `migraciones/test_restricciones_estado.py`;
    - `datos/test_carga_registros_definitivos.py` (`respaldo_si`);
    - `unit/registro/test_evaluador_gemini.py` (`personalizar_entrada`).
- Pruebas nuevas (Fase 4.1): la primera variante que cumple gana; sin variante, el respaldo; un ítem sensible o emocional lleva al respaldo; un hueco sin valor también; se guardan el texto y el código; editar el registro después no cambia la carta.
- Se agregan también 4.6 y 4.5 en `ruta`: el sorteo no llama a ningún evaluador y no existe `abrir-pregunta`.
- `scripts/exportar_fixtures_front.py`: sale `abrir-pregunta-personal`.
- Commit: `Ajuste cartas-diario · F1: cartas adaptadas sin LLM`.

**F2 · Datos de `contenido`** (2.1–2.4)

- `PREGUNTAS_DIARIO` propio, que ya no toma nada de `ruta`:
  - las nueve desbloqueables y las doce DIARIA, sin dimensión;
  - `VARIANTES_DIARIO` de `d-voces`, `d-sale-gusta`, `d-moneda` y `d-antes-de-salir`, con los textos tal cual.
- Reglas:
  - entran `R-d-llego`, `R-d-voces`, `R-d-nino`, `R-d-sale-gusta`, `R-d-no-se`, `R-d-moneda` y `R-d-antes-de-salir`;
  - salen `R-t-diario-fija`, `d-conv-futuro`, `d-conv-condiciones` y sus reglas, la referencia de `t-dia-favoritos` y la fila de `PROVISIONALES`.
- Se cambian los cinco textos de conversaciones de 2.4.
- Pruebas:
  - de carga (4.2), en `tests/integration/datos/`;
  - de recorrido (4.3), en `escenarios/contenido/`;
  - de conversaciones (4.4): se adaptan `test_conversaciones_contenido.py` y el `d-conv-futuro` de `test_recorrido_contenido.py`;
  - del pool (4.5): doce días seguidos sin repetir.
- Se regeneran los fixtures y se corre `verificar_contenido_front.py`.
- Commit: `F2: cartas y pool de contenido`.

### Frontend · F3 (modo api)

- **`types/servidor.ts`:**
  - sale `personalizada` de `EntradaDesbloqueada` y de `PreguntaDiarioEstado`;
  - `EntradaDesbloqueada.texto` pasa a `string`;
  - sale `PreguntaAbierta`.
- **`services/api/diario.ts` y `store/servidor/diario.ts`:** salen `enviarAbrirPregunta` y `abrirPregunta`.
- **`lib/servidor/adaptadoresDiario.ts`:** `cartasDiario` deja de calcular «sellada»: `texto` pasa a `p.texto` y el estado queda siempre `'lista'`. Sale `'sellada'` del tipo `CartaLumi`.
- **`features/journal/`:**
  - `FilaCarta`: salen las ramas «sellada» y «redaccion», la prop `redactando` y «Abrir»;
  - `BuzonLumi`: salen `onAbrir` y `enRedaccion`;
  - `useBuzonLumi`: salen `abrir` y `enRedaccion`; `actualizar` se queda para «Cartas de Lumi»;
  - `useJournalPage`: `?pregunta=` abre la carta pendiente sin mirar `estado`;
  - `JournalEditor`: sale `escribiendo`;
  - se borra el CSS huérfano (`.sx-j-carta-seal` y `[data-estado='redaccion']`).
- **`StudentJournalView` y `StudentLumiLettersView`:** quitan las props anteriores. En la portada, «Actualizar» deja de mostrarse, porque solo salía con cartas en redacción.
- **`useMapScreen.ts:81`:** sale el respaldo «Lumi tiene una carta para ti».
- **Cierre de actividad (`useActivityFinish` y `FinishJournalSection`):**
  - En api solo va el enlace «Lumi te dejó una carta en tu diario», hacia `/student/journal?pregunta=<codigo>`, sin el nombre ni el texto.
  - En local se queda igual con `promptDiario`. Como los 17 JSON de `plataforma/` lo pierden, esas actividades dejan de mostrarlo (es la excepción aceptada).
- **JSON:** sale `promptDiario` de los 17 de `plataforma/` y se cambian los cinco diálogos de 3.2.
- **Pruebas que se adaptan (autorizado en Fase 4):**
  - `tests/servidor/diario/`: `servidor-cartas-redaccion` se reduce a lo que sigue vigente; `servidor-diario-vista`, `servidor-cartas-lumi` y `servidor-diario-contrato`;
  - en `tests/servidor/actividades/`: `servidor-cierre-diario`, que pasa a fijar solo el enlace, y `servidor-cierre`;
  - `servidor-historia-lumi`, si fija el texto del cierre.
  - Las de `tests/local/` no se tocan.
- Commit: `F3: diario del front sin carta sellada`.

### F4 · Cierre

- Las suites completas de ambos repos, con el subagente `pruebas`.
- Documentos:
  - `docs/sistema/motor.md`, «Diario»: carta fija o adaptada, variantes, respaldo y pregunta del día sin redacción;
  - `registro.md`: sale «Asistente del diario»;
  - `integracion.md`: el contrato y las preguntas de cada conjunto;
  - `referencias.md`: sin dueño `PREGUNTA_DIARIO`;
  - `ov_frontend/AGENTS.md`: el punto «Diario y señal».
- `decisiones.md`: una viñeta por cada decisión del usuario y por estas:
  - la forma de `variantes`;
  - `origen` en el hueco `MARCADOR`;
  - `redactada` se conserva;
  - se retira el dueño `PREGUNTA_DIARIO`;
  - `FAVORITOS` se queda sin uso;
  - las pruebas adaptadas.
- Commit: `F4: documentos`. No se cierra la spec ni se hace push.

### Verificación

- **Por fase:** las carpetas de impacto más `tests/integration/escenarios` (back) o `npm run test:servidor` (front).
- **Además:** `uv run alembic heads` debe mostrar un solo head, y `test_migraciones` debe seguir en verde.
- **Al final:**
  - en el back, `uv run pytest -n auto -q`;
  - en el front, `npm test`, `npm run build`, `npm run lint` y `npm run check:estructura`;
  - `scripts/verificar_contenido_front.py`, sin errores.
