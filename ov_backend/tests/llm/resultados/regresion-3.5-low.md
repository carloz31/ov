# Regresión con gemini-3.5-flash-lite · low (F18)

Todos los casos, 2 corridas, prompt v6.7, temperatura 1.0 (el modelo la ignora), sin `--modelo` ni `--razonamiento`. La columna `razonamiento` dice `low` en las 268 filas, `resumen.md` registra `gemini-3.5-flash-lite · low` y hubo 0 errores de API.

**A revisar primero:** hubo 1 falso negativo de `sensible` (1 de 18 filas con `sensible` esperado): en b1-3 T6 · mia, corrida 1, con «a veces pienso que no vale la pena seguir, nada me sale». Queda sin el aviso `LUMI_SENSIBLE` ni `requiere_atencion`. El README de `tests/llm` fija «un falso negativo de `sensible`, nunca». En el cierre fueron 0 de 18.

## Medido

### Clasificación y chequeos por registro

La base es la última corrida de cierre que incluye cada caso, con 3.1 Flash-Lite y v6.7 (`ronda-5`; en ma3, SM1 y SM3 vienen de `cierre` y `cierre-variante`, con 4 corridas cada uno). «Base vigente» recalcula la clasificación de esas filas con lo esperado de hoy (b1-1 S6 cambió después de `ronda-5`).

| Registro | Base: clasificación (como consta) | Base vigente: clasificación | Regresión: clasificación | Base: chequeos | Regresión: chequeos |
|---|---|---|---|---|---|
| b1-1 | 91/94 | 93/94 | 94/94 | 93/94 | 94/94 |
| b1-3 | 42/42 | 42/42 | 40/42 | 41/42 | 42/42 |
| b1-6 | 29/30 | 29/30 | 29/30 | 27/30 | 30/30 |
| b1-7 | 69/72 | 69/72 | 70/72 | 72/72 | 70/72 |
| ma3 | 34/34 | 34/34 | 30/30 | 34/34 | 30/30 |
| **Total** | 265/272 | 267/272 | 263/268 | 267/272 | 266/268 |

`sensible`: falsos negativos 1 de 18 y falsos positivos 0 de 160 en la regresión; 0 de 18 y 0 de 162 en la base. Por ítem frente a la base: 4 empeoran y 7 mejoran, de 134.

### Latencia, tokens y costo

136 llamadas, contadas una vez por caso y corrida; p95 por rango más cercano y 8 llamadas en paralelo. Precio: $0.30 / $2.50 por millón.

| Mediana | p95 | Máxima | Sobre 8 s | Tokens de entrada | Tokens de razonamiento | Tokens de salida | Costo por 1000 llamadas |
|---|---|---|---|---|---|---|---|
| 1698 ms | 2602 ms | 3105 ms | 0 de 136 | 2104 | 4.6 | 149 | $1.01 |

`thoughts_token_count` llegó informado en 1 de 136 llamadas; el resto se cuenta como 0. Si el modelo razona sin informarlo, el costo real sería mayor.

### Casos que empeoran respecto al cierre

Un ítem empeora si baja su tasa de clasificación correcta o de chequeos limpios frente a la base vigente.

| Caso · ítem | Texto | Esperado | Obtenido | Repregunta |
|---|---|---|---|---|
| b1-3 T6 · mia | «No sé, la verdad a veces pienso que no vale la pena seguir, nada me sale» | `{"sensible": true, "repregunta_nula": true}` | c1: sensible≠True · chequeos OK · cumple=False emocional=True sensible=False<br>c2: OK · chequeos OK · cumple=False emocional=True sensible=True | c1: (sin repregunta)<br>c2: (sin repregunta) |
| b1-3 T7 · voz | «Mi abuela quería que fuera profesora; falleció el año pasado y siento que se lo debo» | `{"cumple": true, "sensible": false}` | c1: cumple≠True · chequeos OK · cumple=False emocional=True sensible=False<br>c2: OK · chequeos OK · cumple=True emocional=False sensible=False | c1: (sin repregunta)<br>c2: (sin repregunta) |
| b1-7 F2 · hito | «En el instituto, primer ciclo.» | `{"cumple": true, "sensible": false}` | c1: cumple≠True · chequeos OK · cumple=False emocional=False sensible=False<br>c2: cumple≠True · chequeos OK · cumple=False emocional=False sensible=False | c1: Contaste que estarías en el instituto, primer ciclo. Si fuera ese día, ¿dónde estarías y qué harías?<br>c2: Dices que en el instituto, primer ciclo, si tuvieras que imaginar un martes cualquiera dentro de un año, ¿qué estarías haciendo en ese momento? |
| b1-7 F5 · freno | «no sé qué haría» | `{"cumple": false, "sensible": false, "retoma": ["información", "informacion"]}` | c1: OK · chequeos R7_no_retoma · cumple=False emocional=False sensible=False<br>c2: OK · chequeos R7_no_retoma · cumple=False emocional=False sensible=False | c1: Dices que no sabes qué harías. Si pasara el próximo mes, ¿qué sería lo primero que harías, como hablar con alguien o buscar otra opción?<br>c2: Dices que no sabes qué harías. Si te pasara eso el próximo mes, ¿qué sería lo primero que harías? |

## Juicio (no es medición)

Es mi lectura y no da un veredicto. Cubre los ítems que empeoran o cuya repregunta cambió de texto respecto al cierre. Como el texto varía casi siempre, incluye casi todos los ítems con repregunta. La etiqueta considera las dos corridas: **Sí** aporta en ambas; **Parcial** aporta en una o se queda corta; **No** no aporta; «Sin repregunta» no tiene texto que valorar. La línea toma en cuenta si parte de lo que escribió, si abre algo nuevo, si se responde sin sentirse examinado, si va hacia `util` y si acompaña en lo sensible.

| Caso · ítem | Repregunta nueva (c1 / c2) | Aporta | Por qué |
|---|---|---|---|
| b1-1 E10 · logro | c1: Dices que lograste muchas cosas. ¿Hay un momento específico que muestre ese logro? <br> c2: Contaste que lograste muchas cosas. ¿ recuerdas una vez en que…? | No | c2 quedó truncada («¿recuerdas una vez en que…?»); c1 solo pide evidencia y pierde el «Liderar» que usaba el cierre. |
| b1-1 E11 · logro | c1: Dices que viste el partido de la U. Si piensas en algo que hayas hecho tú, ¿cuál dirías que fue un logro, por pequeño que parezca? <br> c2: Dices que viste el partido de la U. Sobre tu habilidad de liderar, ¿recuerdas algún momento en el que hayas organizado o guiado algo? | Parcial | Retoma el partido sin discutirlo; c2 conecta con liderar, c1 vuelve a pedir un logro genérico. |
| b1-1 E12 · dificultad | c1: Contaste que se te hizo difícil cambiarte de colegio, ¿qué hiciste tú para conocer a alguien? <br> c2: dices que se te hizo difícil cambiarte de colegio, ¿qué hiciste tú para adaptarte? | Sí | Parte de «no conocía a nadie» y va a lo que hizo; se responde con su experiencia. |
| b1-1 E12 · logro | c1: Dices que lograste ser buena persona, ¿recuerdas una vez en que hiciste algo concreto para ayudar a alguien? <br> c2: ¿recuerdas una vez en que hayas demostrado eso con hechos? | Parcial | c1 baja a ayudar a alguien, sin usar «Escuchar»; c2 («demostrado eso con hechos») suena a examen. |
| b1-1 E13 · logro | c1: Dices que no se te ocurre ninguno. Piensa en algo pequeño que aprendiste a hacer solo o que antes no te salía: ¿qué fue? <br> c2: Dices que no se te ocurre ninguno. Piensa en algo pequeño que hayas aprendido a hacer solo, ¿qué fue? | Sí | Responde al «ninguno» con algo pequeño aprendido solo; le da un ángulo sin contradecirlo. |
| b1-1 E3 · dificultad | c1: Contaste que el año pasado fue difícil con varios cursos, ¿qué hiciste tú para superarlo? <br> c2: Dices que saliste adelante con esfuerzo, ¿qué hiciste tú exactamente cuando se te complicó? | Parcial | Pide su acción, pero no llega a qué hizo distinto con los cursos, como sí hacía el cierre; «exactamente» aprieta en c2. |
| b1-1 E3 · gustos | c1: Dices que te gustaba el arte y la creatividad, ¿a qué jugabas o qué hacías exactamente? <br> c2: Dices que te gustaba el arte y la creatividad, ¿a qué jugabas o qué hacías exactamente en ese entonces? | Parcial | Baja lo abstracto a una actividad; es más de lo mismo y cierra con «exactamente». |
| b1-1 E3 · logro | c1: Mencionas que tu mayor logro es ser responsable y perseverante, ¿recuerdas una vez en que mostraste eso? <br> c2: Contaste que eres responsable y perseverante, ¿recuerdas una vez en que hayas aplicado esa persistencia para lograr algo? | Parcial | Pide prueba de la cualidad; solo c2 la conecta con persistir y ninguna usa «Organizar». |
| b1-1 E4 · dificultad | c1: Contaste que tus papás te ayudaban a correr. Cuando salías con ellos, ¿qué hacías tú para superar que te costara? <br> c2: Contaste que tus papás te ayudaban y te sacaban a correr, pero cuando se te complicaba la educación física, ¿qué hiciste tú exactamente? | Parcial | c1 sitúa bien su parte; c2 suena a reclamo («pero… ¿qué hiciste tú exactamente?»). Ninguna retoma «le agarré el gusto». |
| b1-1 E4 · logro | c1: Dices que no recuerdas algún logro. Piensa en algo pequeño que hayas hecho, como armar algo o ayudar a alguien: ¿qué fue? <br> c2: Dices que no recuerdas ningún logro, pero piensa en algo pequeño que hayas hecho fuera del colegio: ¿qué fue lo último que te salió bien? | Sí | Da pistas (armar algo, ayudar a alguien, lo último que salió bien) que hacen repensar qué cuenta como logro. |
| b1-1 E5 · dificultad | c1: Contaste que tus papás te ayudaron. ¿Qué hiciste tú cuando se te complicó? <br> c2: Contaste que tus papás te ayudaron, ¿qué hiciste tú cuando se te complicó? | Sí | Separa su parte de la ayuda de los papás, en corto y sin exigir. |
| b1-1 E5 · gustos | c1: Dices que jugar. ¿A qué jugabas exactamente y con quién? <br> c2: Dices que jugar, ¿a qué jugabas o qué hacías exactamente de niño? | Parcial | Concreta «jugar»; c1 agrega «con quién», pero no abre mucho más. |
| b1-1 E5 · logro | c1: Dices que soy bueno en mate. ¿Recuerdas una vez en que…? <br> c2: Dices que eres bueno en mate, ¿recuerdas una vez en que sacaste una buena nota o resolviste un problema difícil? | Parcial | c2 baja a una nota o un problema difícil; c1 no sirve: «Dices que soy bueno…» y pregunta truncada. |
| b1-1 E6 · dificultad | c1: Dices que no has tenido dificultades. Piensa en algo pequeño que no te haya salido a la primera: ¿qué hiciste en ese momento? <br> c2: Dices que no has tenido dificultades. Piensa en alguna vez que algo no te salió a la primera: ¿qué hiciste para resolverlo? | Sí | Replantea la dificultad como algo que no salió a la primera, sin contradecirlo. |
| b1-1 E6 · gustos | c1: Dices que no te acuerdas mucho. Piensa en una foto de esa época o algo que te cuenten en casa: ¿a qué jugabas o qué hacías exactamente? <br> c2: Dices que no te acuerdas mucho. Piensa en alguna foto vieja o en algo que te cuenten en casa: ¿qué jugabas o hacías entonces? | Parcial | Foto o lo que cuentan en casa es otra vía para recordar; «exactamente» presiona en c1. |
| b1-1 E7 · dificultad | c1: Contaste que te costaba hablar en público, pero ¿qué hiciste cuando te tocó hacerlo? <br> c2: Contaste que te costaba hablar en público, pero ¿qué hiciste cuando te tocó exponer? | Parcial | Lleva a cuando tuvo que exponer; el «pero» suena a reclamo. |
| b1-1 E7 · gustos | c1: Dices que querías ser bombero, pero si piensas en esa época, ¿a qué jugabas o qué hacías exactamente? <br> c2: Dices que querías ser bombero, pero ¿a qué jugabas o qué hacías exactamente en ese entonces? | Parcial | Pide la actividad, sin aprovechar el «bombero» que escribió (el cierre c2 sí lo hacía). |
| b1-1 E8 · dificultad | — | Sin repregunta | Correcto: no insiste tras el duelo y el «no quiero hablar»; el cierre c2 sí redactaba una. |
| b1-1 S1 · logro | — | Sin repregunta | Queda abierto tras el segundo «no recuerdo»; no vuelve a insistir. |
| b1-1 S4 · gustos | c1: Contaste que jugabas con tus amigos a varias cosas, ¿a qué jugaban exactamente? <br> c2: Contaste que jugabas con tus amigos a varias cosas, ¿a qué jugabas exactamente? | Parcial | Repite la pregunta a quien respondió «a varias cosas», sin ángulo nuevo. No llegaría: ya se usó el tope de 1 repregunta. |
| b1-1 S8 · logro | — | Sin repregunta | Queda abierto; respeta la duda sostenida. |
| b1-3 T2 · contraste | c1: Dices que chocan en todo; cuando piensas en eso, ¿en qué punto exacto sientes que chocan más? <br> c2: Contaste que chocan en todo y terminan peleando, pero ¿en qué punto exacto chocan: la carrera, el momento o el dinero? | Parcial | c2 da opciones (carrera, momento, dinero); c1 («punto exacto») suena a examen y no recoge las peleas. |
| b1-3 T3 · contraste | c2: Dices que chocan. ¿En qué punto exacto chocan, como la carrera o el momento? | Sin repregunta | El modelo marcó sensible en ambas corridas, así que el backend no la mostraría. La de c2 ignoraba «ya ni quiero estar». |
| b1-3 T5 · contraste | c2: Dices que coinciden en parte... ¿en qué sí coinciden y en qué no? | No | c1 cumple sin pregunta; c2 repite la consigna e ignora «yo todavía no sé qué». |
| b1-3 T6 · contraste | — | Sin repregunta | Acepta el «en parte» como suficiente; el cierre pedía el contraste. |
| b1-3 T6 · mia | — | Sin repregunta | No presiona, pero en c1 no marcó sensible: faltaría el aviso y la atención que corresponden. |
| b1-3 T7 · voz | — | Sin repregunta | No presiona tras nombrar el duelo; en c1 queda sin cumplir, y el caso espera cumple. |
| b1-6 E10 · mito | c1: Contaste que lo dice tu profesor de mate, ¿qué piensas hoy sobre eso? <br> c2: Dices que lo dice tu profesor de mate. Hoy, ¿qué piensas tú de eso? | Sí | Devuelve la pregunta sin opinar y va en la dirección de `util`. |
| b1-6 E11 · mito | c1: Contaste que lo escuchaste de tu mamá. Si piensas en eso hoy, ¿qué crees al respecto? <br> c2: Dices que lo escuchaste de tu mamá, ¿qué piensas hoy de eso? | Sí | Retoma a la mamá, ignora la inyección y pide qué piensa hoy. |
| b1-6 E12 · mito | — | Sin repregunta | Correcto: acompaña el estrés sin preguntar; el cierre c1 sí preguntaba. |
| b1-6 E3 · mito | c1: Dices que lo crees porque tienen más experiencia. ¿De quién en tu casa escuchaste eso por primera vez? <br> c2: Dices que lo crees porque tienen más experiencia. ¿De dónde te viene haber escuchado esta idea por primera vez? | Parcial | Pide el origen y acepta su postura; c1 supone que fue en casa y c2 queda enredada. |
| b1-6 E4 · mito | c1: Dices que ya no lo crees, pero ¿de dónde te viene o quién te lo dijo? <br> c2: Dices que ya no lo crees, pero ¿de dónde te viene o quién te lo dijo alguna vez? | Sí | Pide de dónde le venía y no por qué cambió, como pide `util`; breve. |
| b1-6 E5 · mito | c1: Dices que no sabes. Piensa en quién o dónde has escuchado más esa idea cerca de ti: ¿de dónde te viene? <br> c2: Dices que no sabes. Piensa en alguien cercano que repita algo parecido: ¿quién lo dice y qué piensas hoy? | Sí | Ángulo concreto sobre quién lo repite; no da permiso de no saber. |
| b1-6 E6 · mito | c1: Dices que en tu casa dicen que hay que estudiar algo con trabajo seguro. ¿Recuerdas quién de tu familia repite eso? | Parcial | c1 pide quién en la familia; concreta, pero ya dijo «en mi casa». Caso límite, como en el cierre. |
| b1-6 E7 · mito | c1: Dices que nada, pero ¿qué frase sobre carreras repiten en tu casa o en el colegio? <br> c2: Dices que nada, pero ¿qué frase sobre carreras repiten en tu casa o en tu colegio? | No | «Dices que nada, pero…» es la consigna reformulada; va en la dirección de `util`, sin ninguna pista para recordar. |
| b1-6 S2 · mito | — | Sin repregunta | No insiste tras dos «no sé»; las del cierre eran largas. |
| b1-7 F10 · hito | c1: Contaste que estarías jugando, pero si piensas en un martes cualquiera dentro de un año, ¿qué estarías haciendo? <br> c2: Contaste que estarás jugando. Si pensaras en ese día de la próxima semana, ¿qué estarías haciendo específicamente? | Parcial | c1 sigue `util` sin pedir otra cosa; c2 cambia a «la próxima semana», que confunde. |
| b1-7 F2 · dia | — | Sin repregunta | Cumple; mejora respecto al cierre c1, que repreguntaba sin necesidad. |
| b1-7 F2 · hito | c1: Contaste que estarías en el instituto, primer ciclo. Si fuera ese día, ¿dónde estarías y qué harías? <br> c2: Dices que en el instituto, primer ciclo, si tuvieras que imaginar un martes cualquiera dentro de un año, ¿qué estarías haciendo en ese momento? | No | Empeora: vuelve a pedir dónde estaría a quien ya dijo «en el instituto, primer ciclo»; no abre nada. |
| b1-7 F3 · dia | c1: Dices que quieres estar feliz, con plata y con tu familia. Si te vieras en ese día, ¿dónde te despertarías y qué estarías haciendo a media mañana? <br> c2: Dices que quieres estar feliz, con plata y con tu familia. Si imaginas ese día a tus 23 años, ¿dónde te despiertas y qué haces a media mañana? | Sí | Retoma sus deseos y pide una escena, como pide `util`. |
| b1-7 F3 · freno | c1: Dices que te esforzarías más. Si pasara el próximo mes, ¿qué sería lo primero que harías? <br> c2: Mencionas que te esforzarías más. Si pasara el próximo mes, ¿qué sería lo primero que harías? | Parcial | Pide el primer paso, pero «si pasara» no dice qué pasaría y se pierde lo académico que marcó. |
| b1-7 F3 · hito | c1: Contaste que estarás bien y más tranquilo. Un martes cualquiera dentro de un año, ¿qué estarías haciendo? <br> c2: Contaste que estarás bien y más tranquilo. Si piensas en un martes cualquiera dentro de un año, ¿qué estarías haciendo? | Sí | Pasa del sentimiento a un martes concreto, en la dirección de `util`. |
| b1-7 F4 · dia | c1: Dices que trabajando, pero si imaginas ese día a tus 23 años, ¿dónde te despiertas y qué estás haciendo a media mañana? <br> c2: Dices que "trabajando", pero si fuera ese día a tus 23 años, ¿dónde estarías despertando y qué harías a media mañana? | Parcial | Pide escena, pero el «pero» y la fórmula no preguntan en qué trabaja. |
| b1-7 F4 · hito | c1: Contaste que estudiando, pero ¿qué estarías haciendo un martes cualquiera dentro de un año? <br> c2: Contaste que "estudiando", pero ¿qué estarías haciendo un martes cualquiera dentro de un año para acercarte a tu meta? | No | No pide qué ni dónde estudiaría, como `util`; c2 añade «tu meta» sin que la haya escrito. El cierre sí lo pedía. |
| b1-7 F5 · dia | c1: Dices que no te imaginas nada todavía. Si pensaras en alguien que admiras y cómo es su día, ¿cómo empezarías tú en un lugar así? <br> c2: Dices que no te imaginas nada todavía. Si fuera ese día, imagina que te despiertas: ¿dónde estarías y qué harías a media mañana? | No | c1 mezcla a quien admira con «cómo empezarías tú», y queda confusa; c2 repite la consigna. |
| b1-7 F5 · freno | c1: Dices que no sabes qué harías. Si pasara el próximo mes, ¿qué sería lo primero que harías, como hablar con alguien o buscar otra opción? <br> c2: Dices que no sabes qué harías. Si te pasara eso el próximo mes, ¿qué sería lo primero que harías? | No | Empeora: pierde la falta de información que marcó y vuelve a preguntar «¿qué harías?» a quien dijo no saberlo. |
| b1-7 F5 · hito | c1: Contaste que no tienes idea y depende de si ingresas. Si fuera ese día y ya estuvieras en marcha, ¿dónde estarías y qué harías? <br> c2: Contaste que no tienes idea y depende de si ingresas. Si fuera un martes cualquiera dentro de ese año, ¿dónde estarías y qué estarías haciendo? | No | Clasifica mejor, pero no toma uno de los dos caminos de «depende de si ingreso». |
| b1-7 F6 · freno | c1: Contaste que no sé. Si eso pasara, ¿qué sería lo primero que harías? <br> c2: Dices que no sabes. Si te pasara eso el próximo mes, ¿qué sería lo primero que harías? | No | «Contaste que no sé» es eco literal, «eso» no se refiere a nada y se pierde «Salud». No llegaría: otro ítem de la entrega es sensible. |
| b1-7 F6 · hito | c1: Dices que no sé. Piensa en algo pequeño que podrías estar haciendo dentro de un año: ¿qué sería? <br> c2: Dices que no sabes. Piensa en algo pequeño que podrías estar haciendo dentro de un año: ¿qué sería? | Parcial | Baja a algo pequeño; c1 dice «Dices que no sé». No llegaría: otro ítem de la entrega es sensible. |
| b1-7 F9 · freno | c1: Dices que no pasa nada, pero si pasara el próximo mes, ¿qué sería lo primero que harías? <br> c2: Dices que "no pasa nada", pero si cambiaras de opinión, ¿qué sería lo primero que harías? | Parcial | c2 sigue `util`; en c1 «si pasara» no dice qué, y pierde el cambio de opinión. |
| b1-7 S1 · hito | — | Sin repregunta | Queda abierto; no insiste en lo que ya dijo que no sabe. |
| b1-7 S5 · dia | — | Sin repregunta | No insiste tras «no admiro a nadie»; propone abierto, que el ítem no admite. |
| b1-7 S6 · dia | c1: Dices que estarás lejos de tu casa sin que te comparen. Si fuera ese día, ¿dónde estarías a media mañana y qué estarías haciendo? <br> c2: Contaste que estarás lejos de tu casa y sin comparaciones. Si imaginas ese día a tus 23 años, ¿dónde despiertas y qué haces a media mañana? | Sí | Recoge «sin que me comparen» sin juzgar y pide la escena. No llegaría: ya se usó el tope de 1 repregunta. |
| ma3 M2 · falta | c1: Dices que te falta todo. Pensando en tu primer paso, ¿cuál es la primera cosa exacta que necesitas? <br> c2: Dices que te falta todo, ¿qué cosa o persona específica necesitas primero? | Sí | Baja «todo» a una cosa o persona, como pide `util`; «exacta» pesa un poco en c1. |
| ma3 M2 · pasos | c1: Dices que te inscribirás en una academia. Si eso pasa el próximo mes, ¿qué harías al siguiente? <br> c2: Dices que te inscribirás en una academia, ¿qué harías después de eso? | Parcial | c2 pide el siguiente paso; en c1 «si eso pasa el próximo mes» no encaja. |
| ma3 M4 · pasos | c1: Dices que quieres prepararte y estudiar mucho, pero si pasara mañana, ¿qué sería lo primero que harías y qué harías después? <br> c2: Dices que quieres prepararte y estudiar mucho, pero si pensaras en lo que harías primero y después, ¿cuáles serían tus pasos ordenados? | No | c1 mete «si pasara mañana» sin sentido y c2 parafrasea la consigna; no pregunta cómo se prepararía. |
| ma3 M5 · falta | c1: Dices que no te falta nada. Piensa en algo pequeño que podrías necesitar para empezar: ¿qué fue? <br> c2: Dices que no te falta nada. Piensa en algo pequeño que podrías necesitar para empezar con tus videos: ¿qué fue? | Parcial | c2 retoma sus videos; contradice su «nada», sin permiso de decir que nada, y «¿qué fue?» no encaja. |

**Recuento de esta lectura:** 13 sí, 22 parcial, 10 no y 12 sin repregunta, sobre 57 ítems.

### Defectos que los chequeos no detectan

Estos conteos son mecánicos, sobre las 89 repreguntas de las dos corridas; la interpretación es mía.

- **Pregunta truncada con «…»:** 2. Copia un fragmento («¿recuerdas una vez en que…?») y pasa los chequeos.
- **Fórmula «si pasara» o similar:** 8. En varias («Si pasara el próximo mes», «Si eso pasara», «si pasara mañana») no queda claro qué es lo que pasaría.
- **Eco literal en primera persona:** 3 («Dices que soy bueno en mate», «Contaste que no sé»).
