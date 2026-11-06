# Ajuste · conversaciones

Carga de las diez conversaciones familiares reales en el conjunto `contenido`, con sus reglas de apertura y cuatro reflexiones de diario; ajuste de los textos de pantalla que hoy afirman que la familia «conversó», y corrección de dos cifras del contenido real (inadecuación e informalidad) que se citan sin población, periodo ni fuente precisos. Sale de `main`. Solo datos y textos: **sin cambio de modelo, de contrato ni de interfaz** (la pantalla de F08 ya muestra todos los campos).

Fuente del contenido: el doc «Conversaciones familiares» del proyecto; aquí ya está transcrito tal como se carga. **Donde este documento y el doc choquen, gana este documento.**

## Criterio general

- **Responder no es conversar.** El sistema solo comprueba que los dos respondieron (`COMPLETA_CONVERSACION`, estado `conversada`); no sabe si después hablaron en casa. Ningún texto nuevo afirma que conversaron: los nombres internos (`conversada`, `COMPLETA_CONVERSACION`) no cambian, solo los textos de pantalla.
- **`contenido` deja de tomar las conversaciones de `ruta`.** `ruta` conserva `t-conv-1`, `t-conv-2` y `t-diario-tras-conversar` tal cual (banco de pruebas y fixtures): ninguna prueba de `ruta` cambia por los datos.
- **Toda conversación se abre con la carta y, salvo las dos de apertura, con una actividad requerida del camino.** Ninguna cuelga de una opcional: si el estudiante no la hiciera, las cartas no se entregarían nunca (hoy `R-t-conv-2` de `contenido` cuelga de h2, que es opcional; se retira).
- **El número de conversaciones no está fijo en el front**: las pantallas usan `total` del servidor. Con diez cargadas, el regalo pide las diez.
- **Una cifra va con población, periodo y fuente, o sin número.** Donde la cifra sostiene el argumento (fichas, batallas), se deja con los tres datos; donde basta la idea (diálogos), se dice redondeada y sin fuente.
- **Modo local congelado.** `textosFamilia.ts` solo lo usan las pantallas de `components/servidor/` (api).

## Fase 1 · Datos de conversaciones (`datos/contenido.py`)

### 1.1 Las diez conversaciones

`CONVERSACIONES` propio de `contenido` (reemplaza `CONVERSACIONES = ruta.CONVERSACIONES`), con el formato de `ruta.CONVERSACIONES`: (código, orden, título, tema, pregunta del estudiante, pregunta del apoderado, preguntas guía, mensaje de diferencias, algo que saben). Código `conv-<orden>`. En cada una, «Puente» va a `mensaje_diferencias`, «Para conversar en casa» a `preguntas_guia` (tres textos, en orden; el tercero empieza con «Actividad:») y «Conectando nuestros caminos» a `algo_que_saben`. Todas tienen pregunta propia para el apoderado.

#### conv-1 · Lo que me hace perder la noción del tiempo

- **Tema:** Intereses
- **Estudiante:** ¿Qué actividad disfrutas tanto que, cuando la haces, pierdes la noción del tiempo? ¿Qué es lo que más te gusta de ella?
- **Apoderado:** ¿En qué actividades ha visto que su hijo o hija se entusiasma y participa por iniciativa propia? Cuente un ejemplo.
- **Puente:** Puede que hayan pensado en lo mismo o en cosas distintas. Si coinciden, vale la pena descubrir qué hay detrás de ese gusto; si no, quizá cada uno conoce momentos que el otro no ha visto. Ninguna respuesta invalida la otra. Lo importante es entender qué disfruta y por qué, sin apurarse a convertirlo en una carrera.
- **Guía:**
  1. ¿Qué parte de esa actividad atrae más: crear, investigar, ayudar, competir, organizar, aprender o estar con otros?
  2. ¿Hay algún interés que se practique fuera de casa y del que todavía no hayan hablado?
  3. Actividad: cada uno cuenta una anécdota concreta de uno de los intereses que mencionaron.
- **Conectando:** En su recorrido, el estudiante trazó su punto de origen con lo que le gustaba de niño. Mientras tanto, la ruta familiar propuso empezar con preguntas que abren. Más adelante, el estudiante verá con qué ambientes de trabajo se relacionan sus intereses; por ahora, un interés no tiene que ser útil para valer.

#### conv-2 · El cambio que me gustaría aportar

- **Tema:** Valores
- **Estudiante:** Si pudieras mejorar algo de tu colegio, tu barrio, tu comunidad o el país, ¿qué elegirías y por qué te importa?
- **Apoderado:** ¿Qué situación de su entorno le gustaría ver mejorar? ¿Por qué le parece importante?
- **Puente:** Tal vez eligieron el mismo problema o temas muy distintos. Las dos respuestas dicen algo de lo que cada uno considera valioso. No hace falta compartir una causa para respetarse, ni convertirla de inmediato en una profesión: a un mismo problema se puede aportar desde ocupaciones muy distintas.
- **Guía:**
  1. ¿Qué experiencia hizo que cada uno se fijara en ese problema?
  2. ¿Qué tipo de aporte atrae más a cada uno: investigar, diseñar, enseñar, organizar, cuidar, construir, comunicar u otro?
  3. Actividad: elijan uno de los problemas y piensen en tres ocupaciones distintas que podrían ayudar a resolverlo, cada una a su manera.
- **Conectando:** Esta conversación anticipa un tema del camino: más adelante, el estudiante ordenará lo que valora en un trabajo, y lo que conversen aquí puede aparecer ahí. Una carrera no tiene que ser «de ayuda» para aportar, y aportar no está reñido con ganar bien.

#### conv-3 · Profesiones sin etiquetas

- **Tema:** Ideas heredadas
- **Estudiante:** ¿Has escuchado alguna frase sobre una profesión que te hizo dudar de explorarla, aunque te diera curiosidad? ¿Qué te gustaría comprobar antes de creerla?
- **Apoderado:** Cuando usted era joven, ¿qué se decía sobre las profesiones «apropiadas», «seguras» o «de prestigio»? ¿Hay alguna idea que hoy mire de otra manera?
- **Puente:** Puede que hayan oído etiquetas parecidas o que cada generación conozca otras. Reconocerlas no significa que alguien haya hecho algo mal. Lo importante es separar las opiniones aprendidas de la información que se puede verificar, y no descartar una ocupación que da curiosidad solo por una etiqueta.
- **Guía:**
  1. ¿De dónde salió esa idea: la familia, el colegio, las redes, una experiencia?
  2. ¿Qué dato haría falta para saber si es cierta o si ya está desactualizada?
  3. Actividad: elijan una ocupación sobre la que hayan oído una etiqueta y busquen en el catálogo qué se hace en ella y cómo se estudia.
- **Conectando:** En su recorrido, el estudiante revisó mitos sobre el futuro profesional con cuatro preguntas: quién lo dice, con qué dato, de qué año es y si aplica a su caso. Mientras tanto, la ruta familiar abordó cuánto cambió el panorama desde que la familia eligió. Las mismas cuatro preguntas sirven para las ideas de casa.

#### conv-4 · El futuro que imaginamos

- **Tema:** Expectativas
- **Estudiante:** ¿Qué te gustaría poder explorar o construir en tu futuro, y qué quisieras que tu familia entendiera de ese deseo?
- **Apoderado:** Más allá de la carrera que elija, ¿qué le gustaría que su hijo o hija pueda vivir, aprender o lograr en su vida adulta? ¿Por qué?
- **Puente:** Puede que compartan un deseo de fondo, como la independencia o el bienestar, aunque imaginen caminos distintos para llegar. Si sus respuestas difieren, conozcan qué hay detrás de cada una antes de hablar de profesiones. Las expectativas se pueden decir como deseos y conversarse; no son compromisos que el estudiante tenga que cumplir.
- **Guía:**
  1. Cuando usted tenía su edad, ¿cómo imaginaba su vida adulta? ¿Qué se cumplió y qué cambió?
  2. ¿Qué parte de lo que imaginan viene de lo que les gusta, y qué parte de lo que les preocupa o de lo que esperan otros?
  3. Actividad: en dos columnas, «deseos para el futuro» y «caminos para llegar». Noten que un mismo deseo puede tener varios caminos.
- **Conectando:** En su recorrido, el estudiante separó lo que esperan de él de lo que espera él, y se imaginó a cinco años. Mientras tanto, la ruta familiar invitó a reconocer las propias expectativas y temores, y a decirlos como deseos y preocupaciones propias, no como veredictos.

#### conv-5 · ¿Qué significa vivir bien?

- **Tema:** Valores
- **Estudiante:** Imagina una vida adulta con la que te sientas satisfecho. ¿Qué tres cosas te gustaría que estuvieran en ella?
- **Apoderado:** Hoy, ¿qué tres cosas considera importantes para sentir que lleva una buena vida? ¿Alguna ha cambiado con los años?
- **Puente:** Si eligieron cosas parecidas, vale la pena ver qué significan para cada uno: usar la misma palabra no siempre es pensar lo mismo. Si eligieron cosas distintas, no hace falta convencer al otro. Entender los valores de cada uno ayuda al estudiante a saber qué quiere para su vida y a la familia a entenderlo mejor.
- **Guía:**
  1. ¿Qué significa para cada uno «estabilidad», «libertad», «ayudar» o la palabra que hayan usado?
  2. ¿Qué valor ha cambiado más con los años en la forma de pensar de cada uno?
  3. Actividad: cada uno elige sus tres; busquen una que compartan y una distinta, sin ordenarlas como mejores o peores.
- **Conectando:** En su recorrido, el estudiante ordenó lo que valora en un trabajo y vio que dos hermanos pueden valorar cosas distintas y tener razón los dos. Si ya conversaron sobre el cambio que les gustaría aportar, ahí tienen una primera pista de lo que valoran.

#### conv-6 · Fortalezas que quizá no vemos

- **Tema:** Fortalezas
- **Estudiante:** Piensa en una vez en que resolviste algo, aprendiste rápido o ayudaste a alguien. ¿Qué habilidad tuya apareció en ese momento?
- **Apoderado:** ¿Recuerda una ocasión en que su hijo o hija mostró una habilidad, una iniciativa o una perseverancia que le sorprendió? ¿Qué hizo concretamente?
- **Puente:** Si los dos reconocieron una fortaleza parecida, tienen una experiencia que vale la pena mirar más de cerca. Si nombraron fortalezas distintas, puede ser porque cada uno vio situaciones diferentes. No hace falta decidir cuál es «la verdadera»: las habilidades se muestran de muchas formas y crecen con la práctica.
- **Guía:**
  1. ¿Qué hizo posible ese logro: práctica, paciencia, curiosidad, trabajo con otros u otra cosa?
  2. ¿En qué otro lugar se podría usar esa habilidad?
  3. Actividad: piensen en una habilidad que el estudiante quiera desarrollar y en una oportunidad pequeña para practicarla esta semana.
- **Conectando:** En su recorrido, el estudiante exploró que hay muchas formas de ser inteligente y que las habilidades sociales se aprenden. Una fortaleza no es una nota: se ve en lo que alguien hace y crece con la práctica. Comparar con hermanos o compañeros no ayuda a verla.

#### conv-7 · Lo que no conocía de tu trabajo

- **Tema:** Historia familiar
- **Estudiante:** ¿Qué crees que le ocupa más tiempo o esfuerzo a tu papá, mamá o apoderado en su trabajo o en sus responsabilidades de cada día? ¿Qué te gustaría entender mejor?
- **Apoderado:** ¿Qué parte de su trabajo, sus estudios, su negocio, el cuidado de la casa u otras responsabilidades cree que su hijo o hija conoce menos? ¿Qué le gustaría contarle de ella?
- **Puente:** La imagen que uno tiene de lo que hace otra persona puede ser parcial, aunque convivan todos los días. Si coincidieron, pueden ir a lo que pasa detrás de lo visible. Si no, pregunten sin vergüenza: no es una prueba de cuánto se conocen, sino una oportunidad para saber cómo es de verdad un trabajo.
- **Guía:**
  1. ¿Qué parte es la más satisfactoria y cuál exige más esfuerzo?
  2. ¿Qué aprendió haciéndolo que no sabía al empezar?
  3. Actividad: una mini entrevista de cinco minutos sobre un día habitual, con las preguntas que elija el estudiante.
- **Conectando:** En su recorrido, el estudiante exploró cómo leer los datos del mercado laboral y que las tablas de salario solo describen el empleo formal, que en el Perú es una parte del trabajo. Cualquier trabajo enseña cómo es trabajar de verdad, tenga o no título, contrato o sueldo fijo.

#### conv-8 · Los caminos también cambian

- **Tema:** Trayectorias
- **Estudiante:** Si al empezar una carrera descubrieras que no era lo que esperabas, ¿qué te gustaría hacer antes de decidir si sigues o cambias de rumbo?
- **Apoderado:** ¿Alguna vez cambió un plan importante de estudios, de trabajo o de otra actividad? ¿Qué lo llevó a cambiar y qué le ayudó a decidir cómo seguir?
- **Puente:** Tal vez uno ve el cambio como una oportunidad y el otro como una decisión difícil; las dos miradas pueden tener razones. Algunos cambios se eligen y otros los imponen el tiempo, el dinero o la familia, y los dos enseñan algo. Una experiencia pasada da pistas, pero no se vuelve regla para el futuro del estudiante.
- **Guía:**
  1. ¿Qué señales le hicieron ver que tenía que revisar su plan?
  2. ¿A quién consultó, o a quién consultaría el estudiante, antes de decidir?
  3. Actividad: imaginen que el estudiante quiere cambiar de carrera en el segundo ciclo y anoten tres datos que convendría averiguar antes de hacerlo.
- **Conectando:** En su recorrido, el estudiante conoció a Alejandra, que cambió dos veces de rumbo sin empezar de cero. Mientras tanto, la ruta familiar abordó que dudar o cambiar de opinión es parte del proceso. Las trayectorias laborales no siempre coinciden con la formación inicial.

#### conv-9 · Lo que hace posible un plan

- **Tema:** Condiciones del plan
- **Estudiante:** Piensa en tu plan principal. Además de las ganas, ¿qué condiciones necesitarías para llevarlo adelante? ¿Cuál te gustaría investigar o conversar primero con tu familia?
- **Apoderado:** Pensando en los estudios de su hijo o hija, ¿qué puede ofrecerle hoy la familia (tiempo, acompañamiento, un lugar para estudiar, recursos) y qué le gustaría averiguar junto con él o ella?
- **Puente:** Un plan no depende solo de querer. Si coinciden en lo que quieren averiguar, ya tienen por dónde empezar; si no, quizá uno ve una condición que el otro no tenía en cuenta. Si alguna condición todavía no está resuelta, pueden investigar alternativas como becas, distintas rutas de formación o planes por etapas. No necesitan resolver todo hoy; lo importante es identificar qué información les falta para evaluar sus opciones. Tampoco hace falta hablar de cifras si no quieren.
- **Guía:**
  1. ¿Qué parte de lo que hace falta puede averiguar o hacer el estudiante, y qué parte toca conversar en familia?
  2. Si alguna condición no está resuelta, ¿qué alternativas podrían averiguar, y dónde?
  3. Actividad: el estudiante muestra a su familia la tarjeta de su plan principal y revisan juntos un dato: una beca, el costo de un año o una ruta alternativa.
- **Conectando:** En su recorrido, el estudiante revisó lo que cuesta estudiar además de la pensión y qué opciones existen para financiarlo: becas, crédito y rutas por etapas. Mientras tanto, la ruta familiar abordó el panorama de hoy, incluidos los costos y las becas. Las dos rutas recomiendan revisar primero las becas y dejar el crédito al final, con la cuota calculada.

#### conv-10 · Ayúdame como lo necesito

- **Tema:** Acompañamiento
- **Estudiante:** Ya tienes un plan, por ahora. ¿Cómo te gustaría que tu familia te acompañe en tus próximos pasos? ¿Qué quieres decidir por tu cuenta?
- **Apoderado:** ¿Cómo cree que su hijo o hija prefiere recibir su ayuda cuando tiene dudas sobre su futuro? ¿Qué apoyo concreto y realista podría ofrecerle en los próximos meses, sin decidir por él o ella?
- **Puente:** Si sus respuestas se parecen, conviértanlas en un acuerdo concreto. Si son distintas, eso no significa necesariamente que falte interés o cariño. Quizá cada uno entiende el apoyo de una manera diferente. Conversar sobre lo que esperan puede ayudarlos a encontrar formas de acompañarse que resulten útiles para ambos.
- **Guía:**
  1. Cuando el estudiante comparta una duda, ¿cómo sabrán si necesita que lo escuchen, un consejo o ayuda para averiguar?
  2. ¿Qué decisiones le corresponden al estudiante y qué aspectos prácticos conviene conversar en familia?
  3. Actividad: elijan uno de los pasos del plan y acuerden cómo lo acompañará la familia, con una fecha para revisarlo.
- **Conectando:** En su recorrido, el estudiante escribió su proyecto con tres pasos y plazos. Mientras tanto, la ruta familiar abordó la diferencia entre acompañar y presionar, y que la decisión es de su hijo o hija. Acompañar, aquí, es estar en esos pasos.

### 1.2 Reglas de apertura (estudiante)

Una regla `CONVERSACION` por conversación, en `REGLAS` de `contenido`. Todas con `('ESCRIBE_CARTA', None, 'EVENTOS', 1)` más la actividad de la tabla (`COMPLETA_ACTIVIDAD`, `EVENTOS`, 1). Las dos de apertura usan b1-3, la misma actividad que abre Familia, así que en la práctica solo esperan la carta. Para el apoderado no cambia nada: ve todas desde que completa su ruta y escribe su carta.

| Regla | Conversación | Actividad | Mensaje de bloqueo |
|---|---|---|---|
| `R-conv-1` | conv-1 | b1-3 | Escribe tu carta para abrir este tema. |
| `R-conv-2` | conv-2 | b1-3 | Escribe tu carta para abrir este tema. |
| `R-conv-3` | conv-3 | b1-6 | Se abre al tomar postura frente a los mitos, del otro lado del puente. |
| `R-conv-4` | conv-4 | b1-7 | Se abre al trazar tu línea de tiempo con el guardián. |
| `R-conv-5` | conv-5 | b2-3 | Se abre al ordenar lo que valoras en un trabajo, con Rosa. |
| `R-conv-6` | conv-6 | b2-4 | Se abre al separar, con Nico, lo que se te da bien de lo que te gusta. |
| `R-conv-7` | conv-7 | b3-3 | Se abre al escuchar a Doña Cifra en el mercado. |
| `R-conv-8` | conv-8 | b3-10 | Se abre al escuchar a Alejandra en el malecón. |
| `R-conv-9` | conv-9 | b4-3 | Se abre cuando Iván pone tus rutas sobre la mesa. |
| `R-conv-10` | conv-10 | b5-1 | Se abre al escribir tu proyecto con la vigía del faro. |

Se retiran de `contenido` `R-t-conv-1` y `R-t-conv-2`.

### 1.3 Reflexiones de diario

Cuatro preguntas de diario nuevas, `DESBLOQUEABLE`, no personalizadas y sin dimensión, con una regla `PREGUNTA_DIARIO` sobre `COMPLETA_CONVERSACION` de su conversación (el mismo mecanismo que hoy usa `t-diario-tras-conversar`; el backend ya entrega `entrada_diario` cuando ambos respondieron y la pantalla ya la muestra). Parten de lo que el estudiante leyó, no de una conversación que el sistema no puede comprobar.

| Código | Nombre | Pregunta | Regla (conversación) | Mensaje de bloqueo |
|---|---|---|---|---|
| `d-conv-futuro` | Lo que todavía no les he dicho | Después de leer lo que tu familia imagina para ti, ¿qué te llamó la atención? ¿Hay algo que todavía no les has dicho y te gustaría conversar? | `R-d-conv-futuro` (conv-4) | Se abre cuando tú y tu familia respondan «El futuro que imaginamos». |
| `d-conv-fortalezas` | Lo que vieron en mí | Al leer lo que tu familia vio en ti, ¿qué te llamó la atención? ¿Te reconoces en eso? | `R-d-conv-fortalezas` (conv-6) | Se abre cuando tú y tu familia respondan «Fortalezas que quizá no vemos». |
| `d-conv-condiciones` | Lo que sí está en mis manos | Después de leer lo que tu familia puede ofrecer, ¿qué te llamó la atención? ¿Qué parte de tu plan sientes que sí está en tus manos? | `R-d-conv-condiciones` (conv-9) | Se abre cuando tú y tu familia respondan «Lo que hace posible un plan». |
| `d-conv-acompanar` | Cómo quiero que me acompañen | Después de conocer cómo tu familia quisiera acompañarte, ¿qué te llamó la atención? ¿Hay algo que te gustaría conversar con ella? | `R-d-conv-acompanar` (conv-10) | Se abre cuando tú y tu familia respondan «Ayúdame como lo necesito». |

`PREGUNTAS_DIARIO` de `contenido` sigue tomando las de `ruta` sin `t-diario-personal` y ahora también sin `t-diario-tras-conversar`, más estas cuatro. Se retira `R-t-diario-tras-conversar` de `contenido`.

### 1.4 `PROVISIONALES`

- Se quita la fila «Conversaciones t-conv-1 y t-conv-2».
- La fila del diario pasa a «Diario: t-diario-fija y las DIARIA».

### 1.5 Ficha FP06

En el contenido de FP06, el párrafo de «Las conversaciones guiadas» pasa a:

> La plataforma le propone diez conversaciones con su hijo o hija, una por tema: lo que disfruta, lo que les gustaría mejorar a su alrededor, las ideas sobre las profesiones, el futuro que imaginan, lo que significa vivir bien, sus fortalezas, su trabajo, los cambios de rumbo, lo que hace posible un plan y cómo acompañarlo. Cada una tiene una pregunta para usted y una para su hijo o hija, que cada uno responde por su lado en la plataforma; luego ven la respuesta del otro y una guía para conversarla en casa. Se habilitan conforme su hijo o hija avanza en su camino, y usted las encuentra en Conversaciones.

El mismo cambio en el nodo de `p6.json` que repite ese párrafo. `claude/fichas-plataforma.md` del proyecto se actualiza igual.

## Fase 2 · Front de conversaciones (modo api)

### 2.1 Textos de pantalla (`features/family-conversations/data/textosFamilia.ts`)

| Clave | Hoy | Queda |
|---|---|---|
| `dosMiradas` (título al responder) | «Dos miradas sobre {título}» | «Dos miradas al respecto» (texto fijo; `ResponderTema` deja de pasarle el título) |
| `pasos(n)[2].texto`, estudiante | …Cuando los {n} estén conversados, se rompe un sello… | …Cuando respondan los {n}, se rompe un sello… |
| `pasos(n)[2].texto`, apoderado | …Cuando los {n} estén conversados, se rompe un sello… | …Cuando respondan los {n}, se rompe un sello… |
| `regaloTexto(n)`, estudiante | …El sello se rompe cuando hayan conversado los {n} temas. | …El sello se rompe cuando hayan respondido los {n} temas. |
| `regaloTexto(n)`, apoderado | igual | igual que el estudiante, con su trato de usted |
| `regaloPantallaKicker(n)` | Conversaron los {n} temas | Respondieron los {n} temas |
| `regaloConteo`, apoderado | {hechas} de {total} temas conversados | {hechas} de {total} temas respondidos |
| `algoQueSaben` | Algo que ya saben | Conectando nuestros caminos |

Se quedan, porque invitan sin afirmar: «Listas para conversar», «Conversan… y al final, un regalo», «Ahora les toca conversar fuera de la pantalla» y «Ahora les toca hablar en casa». No cambian marcado ni estilos.

### 2.2 Cierres de actividad que nombran conversaciones (`contenidos/plataforma/`)

| Archivo | Hoy | Queda |
|---|---|---|
| `h2.json`, `_nota` | …Desbloquea la conversación 2 con la familia… | se quita esa frase (h2 ya no abre una conversación) |
| `h2.json`, diálogo | …y vuelve cuando cruces tu perfil con tus opciones. Además abre una conversación con tu familia: lo que ellos ven en ti. | …y vuelve cuando cruces tu perfil con tus opciones. |
| `h2.json`, `mensajeFin` | …Tú acabas de ponerla a prueba. Se abrió la conversación «Lo que veo en ti». | …Tú acabas de ponerla a prueba. |
| `b3_10.json`, diálogo | …Y en casa hay una conversación esperando: los trabajos de tu familia. | …Y en casa hay una conversación esperando: los cambios de rumbo de tu familia. |
| `b3_10.json`, `mensajeFin` | …Se abrió la voz T05 y la conversación «Los trabajos de nuestra familia». | …Se abrió la voz T05 y la conversación «Los caminos también cambian». |
| `b5_1.json`, `mensajeFin` | …Se abrió la conversación «Mi plan y cómo puedes apoyarme». | …Se abrió la conversación «Ayúdame como lo necesito». |

`b4_a.json` ya nombra «la conversación de las fortalezas» (conv-6): no cambia.

## Fase 3 · Cifras del contenido

Dos cifras del contenido real se citan hoy sin población, periodo ni fuente precisos, o con una fuente desactualizada. Se reemplazan en las fichas, las preguntas de batalla y los JSON de actividad que las repiten.

### 3.1 Las cifras y su fuente vigente

| Cifra de hoy | Problema | Cifra vigente | Fuente |
|---|---|---|---|
| «Siete de cada diez personas con estudios superiores trabajan en algo distinto a lo que estudiaron (MTPE, 2022)» | Viene de declaraciones del ministro de Trabajo (2023 y 2025), sin encuesta, población ni periodo. Otra comunicación del MTPE dio seis de cada diez. | 44 % de los egresados de formación técnica y 38,4 % de los universitarios trabajan en ocupaciones vinculadas a lo que estudiaron: menos de la mitad en ambos casos. | Minedu y UNESCO (2026), *Revisión de la Política de Educación y Formación Técnica y Profesional del Perú*, presentada el 18 jun 2026 ([Andina](https://andina.pe/agencia/noticia-peru-tecnicos-superan-a-universitarios-trabajos-afines-a-sus-estudios-revela-unesco-1080082.aspx), [Radio Nacional](https://www.radionacional.gob.pe/noticias/nacional/profesionales-tecnicos-registran-mayor-insercion-laboral-en-ocupaciones-afines-a-su-formacion-segun-minedu-y-unesco)). |
| «Más del 85 % de los menores de 25 años trabaja informal / sin contrato ni seguro (Inei)» | El dato era del III trimestre de 2023 (85,4 %), la población real es «ocupados de 14 a 24 años» y «informal» no es lo mismo que «sin contrato». | 84,8 % de los ocupados de 14 a 24 años tiene empleo informal; 69,8 % del total de ocupados. | INEI, *Comportamiento de los indicadores de mercado laboral a nivel nacional*, periodo abril 2025–marzo 2026, cuadros 1.20 y 1.21 ([PDF](https://www.inei.gob.pe/media/MenuRecursivo/boletines/empleo-nacional-i-trimestre-2026.pdf)). |
| «El 75,7 % de los trabajadores era informal en 2022 (MTPE)» | Desactualizado. | 69,8 % de la población ocupada (abril 2025–marzo 2026). | INEI, mismo informe. |

**Qué es empleo informal (INEI):** el de un asalariado sin seguro de salud pagado por su empleador, el de quien trabaja en un negocio no registrado y el trabajo familiar no remunerado. Suele venir sin contrato, sin pensión y sin vacaciones pagadas, pero «informal» no se define por el contrato. Donde el texto hoy dice «sin contrato ni seguro», pasa a «empleo informal».

### 3.2 Reemplazos de inadecuación (siete de cada diez)

Un reemplazo por fila; el resto del texto no cambia. «Backend» = `ov_backend/datos/contenido.py`; «JSON» = `ov_frontend/src/data/activities/contenidos/plataforma/`.

| Dónde | Hoy | Queda |
|---|---|---|
| Backend, ficha F02 | Un dato para tomar en serio: según el Ministerio de Trabajo, en 2022 cerca de siete de cada diez personas con estudios superiores en el Perú no trabajaban en lo que habían estudiado. | Un dato para tomar en serio: según un estudio del Minedu y la UNESCO (2026), solo el 44 % de los egresados técnicos y el 38,4 % de los universitarios trabajan en ocupaciones vinculadas a lo que estudiaron. |
| JSON `b0_5.json` (diálogo de Mara) | Según el Ministerio de Trabajo, en 2022 cerca de siete de cada diez personas con estudios superiores en el Perú no trabajaban en lo que habían estudiado. | Según un estudio reciente, menos de la mitad de los egresados en el Perú trabaja en algo vinculado a lo que estudió. |
| Backend, ficha F05 | Siete de cada diez peruanos con estudios superiores trabajan en algo distinto a lo que estudiaron (MTPE, 2022). | Menos de la mitad de los egresados, técnicos o universitarios, trabaja en una ocupación vinculada a lo que estudió (Minedu y UNESCO, 2026). |
| JSON `b1_4.json` | Siete de cada diez peruanos con estudios superiores trabajan en algo distinto a lo que estudiaron (MTPE, 2022). | Menos de la mitad de los egresados en el Perú trabaja en algo vinculado a lo que estudió. |
| Backend, ficha F13 | Además, cerca de siete de cada diez personas con estudios superiores no trabajan en lo que estudiaron (MTPE, 2022). | Además, menos de la mitad de los egresados trabaja en ocupaciones vinculadas a lo que estudió: el 44 % de los técnicos y el 38,4 % de los universitarios (Minedu y UNESCO, 2026). |
| Backend, ficha F17 | Siete de cada diez peruanos con estudios superiores trabajan en algo distinto a lo que estudiaron (MTPE, 2022). | Menos de la mitad de los egresados en el Perú trabaja en una ocupación vinculada a lo que estudió (Minedu y UNESCO, 2026). |
| JSON `b3_10.json` | Siete de cada diez peruanos con estudios superiores trabajan en algo distinto a lo que estudiaron (MTPE, 2022). | Menos de la mitad de los egresados en el Perú trabaja en algo vinculado a lo que estudió. |
| Backend, ficha FP05 (tabla) | Siete de cada diez profesionales trabajan en algo distinto a lo que estudiaron (MTPE, 2022) | Menos de la mitad de los egresados trabaja en una ocupación vinculada a lo que estudió (Minedu y UNESCO, 2026) |
| JSON `p5.json` (diálogo) | Hoy siete de cada diez profesionales trabajan en algo distinto a lo que estudiaron. | Hoy menos de la mitad de los egresados trabaja en algo vinculado a lo que estudió. |
| JSON `p5.json` (tabla) | Siete de cada diez profesionales trabajan en algo distinto a lo que estudiaron (MTPE, 2022) | Menos de la mitad de los egresados trabaja en una ocupación vinculada a lo que estudió (Minedu y UNESCO, 2026) |
| Backend, batalla `b1-5-p05`, opción correcta | Siete de cada diez peruanos con estudios superiores trabajan en algo distinto a lo que estudiaron (MTPE, 2022) | Menos de la mitad de los egresados trabaja en una ocupación vinculada a lo que estudió (Minedu y UNESCO, 2026) |
| Backend, batalla `b3-5-p08`, enunciado | «Cerca de siete de cada diez personas con estudios superiores no trabajan en lo que estudiaron.» ¿Qué conviene concluir? | «Menos de la mitad de los egresados trabaja en una ocupación vinculada a lo que estudió.» ¿Qué conviene concluir? |

### 3.3 Reemplazos de informalidad (85 % y 75,7 %)

| Dónde | Hoy | Queda |
|---|---|---|
| Backend, ficha F13 | En el Perú, el 75,7 % de los trabajadores era informal en 2022 (MTPE) y, entre los menores de 25 años, más del 85 % (Inei). Trabajar informal significa sin contrato, sin seguro de salud, sin aporte para pensión y sin vacaciones pagadas. | En el Perú, el 69,8 % de la población ocupada tenía empleo informal entre abril de 2025 y marzo de 2026 y, entre los ocupados de 14 a 24 años, el 84,8 % (INEI). Un empleo es informal cuando no da seguridad social: un asalariado sin seguro de salud pagado por su empleador, o quien trabaja en un negocio no registrado. Suele venir sin contrato, sin pensión y sin vacaciones pagadas. |
| JSON `b3_3.json` (diapositiva) | En el Perú, el 75,7 % de los trabajadores era informal en 2022 (MTPE) y, entre los menores de 25 años, más del 85 % (Inei). Trabajar informal es sin contrato, sin seguro, sin aporte para pensión y sin vacaciones pagadas. | En el Perú, cerca de siete de cada diez personas que trabajan tienen empleo informal y, entre los de 14 a 24 años, más de ocho de cada diez (INEI, 2025–2026). Informal es sin seguridad social; suele venir sin contrato, sin pensión y sin vacaciones pagadas. |
| JSON `b3_3.json` (pregunta) | «Si el 85 % de los jóvenes trabaja informal, ¿para qué estudiar…?» | «Si más de ocho de cada diez jóvenes que trabajan lo hacen en la informalidad, ¿para qué estudiar…?» |
| JSON `ma7.json` | Las tablas son de la minoría en planilla; más del 85 % de los menores de 25 trabaja informal | Las tablas son de la minoría en planilla; más de ocho de cada diez ocupados de 14 a 24 años tienen empleo informal |
| Backend, ficha FP05 (tabla) | Más del 85 % de los menores de 25 años trabaja sin contrato ni seguro (Inei); el título ayuda a entrar al empleo formal, pero no lo garantiza | El 84,8 % de los ocupados de 14 a 24 años tiene empleo informal (INEI, abril 2025–marzo 2026); el título ayuda a entrar al empleo formal, pero no lo garantiza |
| JSON `p5.json` (tabla) | igual que FP05 | igual que FP05 |
| Backend, batalla `b3-5-p06`, enunciado | En el Perú, más del 85 % de los menores de 25 años trabaja de manera informal. | En el Perú, el 84,8 % de los ocupados de 14 a 24 años tiene empleo informal (INEI, abril 2025–marzo 2026). |
| Backend, batalla `b3-5-p06`, opción D | Que el 85 % gana el promedio de la tabla | Que la mayoría gana el promedio de la tabla |
| Backend, batalla `b3-5-p06`, explicación | Informal es sin contrato, sin seguro, sin pensión ni vacaciones. | Informal es sin seguridad social; casi siempre, también sin contrato, pensión ni vacaciones pagadas. |
| Backend, batalla `ma7-b-p03`, explicación | Entre los menores de 25, más del 85 % trabaja informal. | Entre los ocupados de 14 a 24 años, el 84,8 % tiene empleo informal (INEI, abril 2025–marzo 2026). |
| Backend, batalla `ma7-b-p07`, explicación | Formal es lo que el 85 % de los jóvenes no tiene. | Formal es lo que más de ocho de cada diez jóvenes que trabajan no tienen. |

### 3.4 Fuentes de las fichas

En F02, F05, F13, F17 y FP05, la línea «Fuentes» cambia las referencias al MTPE (2022) y a las notas de Andina de 2025 sobre inadecuación por las fuentes de 3.1. F13 y FP05 suman el informe del INEI. `claude/fichas-plataforma.md` del proyecto se actualiza con los mismos reemplazos.

### 3.5 Fuera de este ajuste

No se tocan; quedan anotados en `decisiones.md` para revisarlos aparte:

- «En el Perú siete de cada diez emprendedores empiezan por falta de empleo» (ficha F17 y la tabla de giros de `b3_10.json`): sin fuente en el texto.
- «Solo tres de cada diez jóvenes pasan a educación superior» (`b3-5-p12`, `b3-b-p08`): la misma revisión de población, periodo y fuente.

## Fase 4 · Pruebas

Backend (`tests/integration/datos/` y `tests/integration/escenarios/contenido/`):

1. `contenido` carga las diez conversaciones `conv-1`…`conv-10`, con orden 1–10, tema, las dos preguntas, tres preguntas guía, mensaje de diferencias y algo que saben no vacíos; no carga `t-conv-1` ni `t-conv-2`.
2. Reglas: cada conversación tiene exactamente una regla `CONVERSACION` con `ESCRIBE_CARTA` (la prueba que ya existe) y, además, la actividad de la tabla 1.2; esa actividad es requerida. Ninguna regla de `contenido` nombra `t-conv-*` ni `t-diario-tras-conversar`.
3. Recorrido: con la carta y b1-3, conv-1 y conv-2 están disponibles para el estudiante y conv-3…conv-10 bloqueadas con su mensaje; al completar b1-6 se abre conv-3. Cuando el estudiante y el apoderado responden conv-4, el estudiante recibe `d-conv-futuro` en `entrada_diario`; en conv-1 no hay entrada.
4. Las cartas se entregan con las diez respondidas y no con nueve.
5. Cifras: ningún texto del conjunto `contenido` (fichas, preguntas de batalla, JSON de `plataforma/`) contiene «siete de cada diez» en el sentido de inadecuación, «85 %» ni «75,7 %». Las preguntas de batalla tocadas mantienen la correcta en la misma posición y una sola explicación.

`ruta` no cambia: sus pruebas y fixtures siguen igual. Si alguna prueba del front fija los textos de 2.1 (`tests/servidor/familia`) o los de fichas y batallas de la fase 3, se actualiza su esperado (autorizado). `tests/local/` no cambia (su «temas conversados» es del modo local).

## Fase 5 · Cierre

- Suites completas; `verificar_contenido_front.py` sin errores.
- `integracion.md` (§ conjuntos): las conversaciones salen de la lista de lo provisional de `contenido`; se describen las diez y sus cuatro reflexiones de diario.
- `motor.md` («Conversaciones»): toda regla `CONVERSACION` de `contenido` pide la carta y una actividad requerida.
- `AGENTS.md` del front, punto «Familia y Conversaciones (F08)»: el sistema solo sabe que respondieron; los textos de pantalla no dicen que conversaron, y el título al responder es fijo («Dos miradas al respecto»).
- `decisiones.md`: una viñeta por cada decisión de abajo y las dos cifras de 3.5.

## Decisiones del usuario

- Diez conversaciones, tomadas de su catálogo de doce: la 3 pasa a pregunta guía de conv-4, la 7 sale, la 12 se une a conv-10 y se agrega conv-9 (condiciones del plan, sin hablar de dinero de frente).
- conv-1 y conv-2 se abren al escribir la carta; las demás, con el registro del camino que trabaja su tema.
- La tarjeta muestra la temática como chip; conv-2 y conv-5 comparten «Valores».
- Responder no es conversar: ningún texto afirma que conversaron, y las reflexiones del diario parten de lo leído.
- La caja «Algo que ya saben» pasa a «Conectando nuestros caminos» y no depende del momento de lectura.
- El título al responder es fijo: «Dos miradas al respecto».
- Las cifras de inadecuación e informalidad van con población, periodo y fuente vigentes (Minedu y UNESCO, 2026; INEI, abril 2025–marzo 2026), o sin número donde basta la idea.

## Preguntas abiertas

Ninguna. Documento listo para `/ajuste conversaciones`.

## Precisiones del plan (lo que el documento no decía o no coincide con el código)

Aprobadas por el usuario en las preguntas de este plan, salvo la 1 y la 6, que son la opción más simple:

1. **`b3_10.json`, `mensajeFin`:** el documento cita «Se abrió la voz T05…», pero el ajuste testimonios ya lo cambió. Queda: «…Se abrió una voz nueva en tu mochila y la conversación «Los caminos también cambian».»
2. **`b4_5.json`, `mensajeFin`:** se quita «Se abrió la conversación «Lo que cuesta y cómo lo haremos».» (no existe y b4-5 no abre ninguna).
3. **FP02 y `p2.json`:** «La primera conversación guiada…» → «Una de las conversaciones guiadas con su hijo o hija trata justamente de lo que cada uno espera del futuro.»; `p2.json` línea 38 → «Lo va a necesitar más adelante, en las conversaciones guiadas.»
4. **Modo api:** `ParentConversationsCard.tsx`: «Respondieron todos los temas. Hay un regalo esperándolos.» (se adapta su esperado en `tests/servidor/familia/servidor-inicio-apoderado.test.mjs`); `PuntosRegalo.tsx`, aria-label: «N de M temas respondidos». Mismo marcado.
5. **F17 y `b3_10.json`:** tras la cifra, «Parte de ellos cambió…» / «Parte cambió…» → «Entre los demás, parte cambió de rumbo a propósito; otra parte no encontró trabajo en su campo.»
6. **`claude/fichas-plataforma.md` no está en el repo** (solo una copia en `docs/historico/`, que no se toca). No se actualiza aquí; se avisa al usuario para que lo cambie en su proyecto.

## Prueba en la aplicación real (pedida por el usuario, al final)

Backend con `contenido` sobre una base temporal en el scratchpad (`DATABASE_URL`, `ENTORNO=desarrollo`, `EVALUADOR=falso`; no se toca `ov.db` ni `.env`), front con `VITE_DATOS=api` por variable de entorno (sin escribir `.env.local`), en el navegador integrado y con las cuentas de prueba de `datos/usuarios_prueba.txt`. El avance largo del camino se prepara por API; lo que se revisa se hace en pantalla, con capturas. Lo que falle se corrige (si es de este ajuste) o se informa.

1. **Desbloqueo desde las actividades (`est-ana`):** antes de b1-3, Familia cerrada. Al completar b1-3, Familia abierta y el cierre lo anuncia.
2. **Primero la carta:** sin carta se ve la carta pendiente, nunca la lista, y los temas no se pueden abrir. Con la carta guardada aparece la lista: conv-1 y conv-2 disponibles; conv-3…10 en «Por abrir» con su mensaje de bloqueo y su chip.
3. **Desbloqueo progresivo:** completar b1-6 abre conv-3, y b1-7 abre conv-4; el cierre de cada actividad lo anuncia.
4. **Responder y ver al otro:** Ana responde conv-1 (título fijo «Dos miradas al respecto», sin ver la respuesta del otro, editable mientras tanto) y queda «Esperando». `apo-rosa`, con su ruta y su carta, responde: ambos ven las dos miradas, el puente, las preguntas para conversar en casa y «Conectando nuestros caminos». Caso inverso con conv-2: responde primero Rosa y Ana ve «Tu familia ya respondió» con la respuesta oculta hasta guardar la suya.
5. **Respuestas sin mezclarse:** Rosa tiene dos hijos (`est-ana` y `est-luis`). Responde con textos distintos a cada uno, y se comprueba al cambiar de hijo, y entrando como cada estudiante, que cada uno ve solo lo suyo: respuestas, cartas, conteo y estado de cada vínculo.
6. **Diario:** al responder los dos conv-4, Ana recibe `d-conv-futuro` y lo ve en la pantalla del tema y en el diario; conv-1 no da entrada.
7. **Regalo:** con nueve respondidas, sigue sellado («9 de 10»); con las diez, se rompe el sello, los textos dicen «Respondieron los diez temas» y la carta del otro llega solo a ese vínculo (Luis, sin completar, sigue sellado).
8. **Apoderado:** tarjeta de Inicio y Conversaciones con los textos nuevos, en celular y en escritorio.

Se usa una configuración temporal en `.claude/launch.json` si hace falta, sin versionarla, y al terminar se apagan los servidores y se borra lo temporal.

## Ajuste · entrevistas por familia

### Contexto

Hoy cada investigación y entrevista apunta a una **ocupación**. Pasarán a apuntar a una **familia de carreras** (código de 3 dígitos), para que más estudiantes coincidan en un tema y tengan más profesionales a quienes buscar. Las entrevistas dejan de verse en el detalle de la ocupación y se ven en el detalle de la carrera, como «Entrevistas de esta familia».

Va como fases F6–F9 de la spec en curso (`ajuste-conversaciones.md`), en la rama `ajuste/conversaciones`, porque esa spec sigue sin cerrar. Es un **cambio de modelo**: se sigue `/cambio-modelo`.

### Decisiones tomadas por el usuario

- **Oficio:** familia más un campo obligatorio «a qué se dedica» en la ficha.
- **Datos actuales:** se eliminan y se generan entrevistas de ejemplo.
- **Buscador:** solo por nombre de familia.
- **Detalle de carrera:** salón y Leyendas, limitado a unas pocas, con enlace «ver completo» a la sección de entrevistas.

### Implicaciones que encontré

Además de las dos que ya viste (texto de la actividad y catálogo):

| Implicación | Hoy | Pasará a |
|---|---|---|
| **Migración destructiva** | — | Vacía entrevistas e investigaciones y **también tu base de desarrollo** al correr `alembic upgrade head`: guion, sugerencias, reacciones, reportes, favoritos de entrevista, sus notificaciones y sus eventos. |
| **Eventos** | `INICIA_INVESTIGACION` y `TERMINA_GUION` referencian una ocupación (`motor/referencias.py`) | Referencian una familia. Los anteriores se borran: su id significaría otra cosa. |
| **Sugerencias del LLM** | «una persona que trabaja como {ocupacion}» | `PROMPT_GUION_V2`: trabaja en el campo de {familia}, a partir de lo que escribió el estudiante. |
| **Coautores y aliados** | Misma ocupación; `aliados.misma_ocupacion` | Misma familia; `aliados.misma_familia`. Pueden publicar juntos aunque entrevisten oficios distintos de la familia. |
| **Búsqueda de entrevistas** | `busqueda`: título, profesional y ocupación | Título, profesional, a qué se dedica y familia. Así «contador» sigue encontrando entrevistas. |
| **Registro de cierre (`LO_QUE_PIENSO`)** | «Antes de tu entrevista, sobre {ocupación} pensabas» | Dice el nombre de la familia (`referencias.py`). |
| **Portal de la orientadora** | Tabla, detalle y búsqueda con ocupación | Con familia y a qué se dedica. |
| **Enlace de la cabecera de la entrevista** | Lleva al detalle de la ocupación | Lleva al catálogo de carreras filtrado por esa familia, que ya muestra `FichaFamilia` (`?area=&familia=`). |
| **Técnicas y universitarias juntas** | — | Una familia cruza los dos tipos: una entrevista a un técnico también sale en la carrera universitaria de esa familia, y al revés. |
| **«Investigarla» desde la ocupación** | Atajo en el detalle de ocupación | Desaparece con el bloque. El atajo pasa al detalle de carrera («Investigar esta familia»). |
| **Contrato** | `ocupacion` en respuestas y acciones | `familia` (`codigo`, `nombre`, `area_codigo`) en esquemas, `types/servidorInvestigaciones.ts`, `services/api/`, adaptadores y unos 10 componentes. Se regeneran fixtures. |

**Qué no se pierde:** los textos que hablan de «su ocupación» dentro de la entrevista siguen siendo ciertos (la persona entrevistada tiene un oficio), así que la tabla de preguntas no cambia.

### Ficha F18 «Cómo entrevistar a un profesional»

La revisé completa. **Necesita un solo cambio**, en «Para tu viaje»:

> Puedes hacerla con compañeros que investigan la misma ~~ocupación~~ **familia de carreras**.

Va en `datos/contenido.py` y lo tendrás que replicar en `fichas-plataforma.md`. Se quedan igual, porque hablan del oficio de la persona: «Verás dos etapas de la misma ocupación», «por qué te interesa su ocupación», «Futuro de la ocupación», «te da miedo de esa ocupación» y «algunas ocupaciones».

**Inconsistencia que ya existía, y que no toco:** la ficha y `investigador.json` hablan de «cinco preguntas base», pero el guion usa 3 (`PREGUNTAS_BASE_GUION`). Te la dejo anotada para que decidas aparte.

### Qué no cambia

- `Leyenda`, reacciones, reportes, reglas `PUBLICA_ENTREVISTA`, sección INVESTIGACIONES y `t-ins-leyenda`.
- El modo local: `EntrevistasOcupacion`, `StudentResearchView` y `data/content/research.ts` siguen por ocupación. Tampoco cambian `ocupacion_familia` ni el catálogo de ocupaciones.
- `ov_frontend` `OcupacionesDeLaFamilia`: el detalle de carrera sigue mostrando sus ocupaciones.

### Modelo de datos (decisión aprobada por el usuario)

Migración `0046`, revisada a mano:

- `investigacion.ocupacion_id` → `familia_id` (FK `familia_carrera`).
- `entrevista.ocupacion_id` → `familia_id`, y columna nueva `dedicacion` (texto, obligatoria).
- Antes de cambiar columnas, vacía: `reporte`, `reaccion`, `sugerencia_guion`, `pregunta_guion`, `investigacion`, `entrevista_autor`, `entrevista`; los `favorito` de tipo ENTREVISTA; los `evento_uso` de eventos de investigación y entrevista, y las notificaciones de entrevistas. Los desbloqueos ya obtenidos se conservan, porque son permanentes.
- Una entrada sobre el motivo en `decisiones.md`, y el documento `investigaciones.md` actualizado en el mismo commit.

### Backend

| Dónde | Cambio |
|---|---|
| `POST /acciones/guardar-lo-que-pienso` | Recibe `familia` en lugar de `ocupacion`. |
| `POST /acciones/publicar-entrevista`, `editar-entrevista` | Agregan `dedicacion` (no vacía, 422). Coautores por familia. |
| `GET /cuentas/{c}/entrevistas` | `ocupacion` → `familia`. Nuevo `vista=SALON_Y_LEYENDAS`: las del salón y las Leyendas sin repetir, para el detalle de carrera. |
| `GET /cuentas/{c}/investigaciones` | `aliados.misma_familia`; `en_curso.familia`. |
| `GET /cuentas/{c}/publicaciones`, `/{e}` | `familia` y `dedicacion`; `buscar` los incluye. |
| `consultas.py`, `orientadora.py`, `acciones.py`, `sugerencias.py`, `referencias.py`, `motor/referencias.py` | `ocupaciones_breves` → `familias_breves`, y lo que se lista arriba. |

### Entrevistas de ejemplo

Script manual `ov_backend/scripts/sembrar_entrevistas_ejemplo.py`, no parte del conjunto `contenido`: ese conjunto es el que se despliega y `POST /desarrollo/reiniciar` borraría las entrevistas igualmente. Se puede volver a correr tras un reinicio.

- 6 entrevistas `DATO DE PRUEBA`, con personas inventadas: 4 de `5A` (Ana y Luis, una de ellas con coautor, para ver la familia repetida) y 2 de `5B` (Beto), que son Leyendas para que el salón `5A` las vea. Dos entrevistas en la misma familia (Psicología, 313) para probar el límite y «ver completo».
- Con reacciones y los favoritos de Mía, Teo y Sol, para que las Leyendas sean coherentes.
- **Video:** reusa los `video_id` de los testimonios de `contenido`, para que el reproductor funcione. Los videos no corresponderán a las personas inventadas: es solo para ver la pantalla.

### Frontend (modo api)

- **Paso 1 del guion:** `BuscadorOcupacion` → `BuscadorFamilia`, sobre `GET /catalogo/familias`, filtrando en el navegador sin tildes. `?ocupacion=` → `?familia=`. Etiqueta: «¿En qué familia de carreras trabaja la persona que vas a entrevistar?».
- **Publicar y editar:** campo nuevo «¿A qué se dedica?» en `FormularioPublicar`, debajo de quién es la persona entrevistada.
- **Tarjeta y cabecera:** «Entrevista · {familia}» y «Entrevista a {profesional} · {dedicacion}».
- **Detalle de carrera:** `EntrevistasFamilia`, en la **columna derecha** (`aside` de `DetalleCarreraServidor`, después de «Carreras parecidas»), como estaba en ocupaciones, con el mismo `Parchment` y `sx-d-related`. Títulos largos cortan línea, sin desbordar:
  - Título «Entrevistas de esta familia». Muestra las **3** más recientes de salón y Leyendas; solo con la sección INVESTIGACIONES abierta y fuera del modo lectura.
  - Con más de 3: enlace «Ver las {total} entrevistas», a Investigaciones filtrado por esa familia.
  - Sin entrevistas: «Todavía no hay entrevistas de esta familia.» y «Investigar esta familia».
- **Investigaciones:** el buscador encuentra por nombre de familia («Buscar por título, familia o profesional…»). Además acepta `?familia=` y lo aplica a las tres vistas, con un chip «Familia: {nombre}» y una X para quitarlo; es el único elemento nuevo del listado.
- **Detalle de ocupación:** se quita `EntrevistasOcupacionServidor` y su hook.
- **Orientadora:** la columna y la ficha pasan a familia y a qué se dedica.

### Textos

- `investigador.json`: línea 65 («cómo se investiga una ocupación» → «cómo se investiga una familia de carreras»: se le pregunta a alguien que trabaja en ella); línea 225 («elige una ocupación de tus favoritos» → «elige una familia de carreras que te interese»).
- `guideTexts.ts`, solo lo que usa el modo api: `INVESTIGACIONES`, `investigacionesGuideSteps`, el paso de «lo que pienso» y las presentaciones de `investigations`. Si un texto lo comparten los dos modos y habla de elegir una ocupación, lo cambio en ambos y lo anoto, como en el ajuste testimonios; las vistas solo locales no se tocan.
- `PanelAliados`, `PasoGuiaLista`, `TarjetaEnCurso`, `ConfirmarInvestigacion`: «investiga lo mismo» sigue valiendo; lo demás, a familia.
- `F18`: el cambio de arriba.

### Fases (un commit por fase, `Ajuste conversaciones · F<n>: …`)

1. **F6 · Modelo y backend:** migración, modelos, esquemas, servicios, `sugerencias.py`, `referencias`, documento `investigaciones.md`, pruebas adaptadas (autorizado). Pruebas: `tests/integration/investigaciones`, `migraciones`, `datos`, `contrato`, `escenarios`, `tests/unit/motor`. Fixtures regenerados.
2. **F7 · Front de investigaciones:** contrato, guion, publicar, tarjeta, cabecera, orientadora y filtro `?familia=`. Pruebas: `npm run test:servidor`, `tests/local/aventura`, `tests/local/portales`.
3. **F8 · Catálogo y textos:** bloque del detalle de carrera, salida del detalle de ocupación, textos. Pruebas: `tests/servidor/catalogo`, `investigaciones`, `actividades`, `verificar_contenido_front.py`.
4. **F9 · Ejemplos y cierre:** script de ejemplos, `integracion.md`, `origen-de-datos.md`, `ov_frontend/AGENTS.md`, `decisiones.md`. Suite completa.

### Verificación

- `uv run alembic heads` con un solo head; migración probada también sobre una base con entrevistas previas.
- Suite completa: `uv run pytest -n auto -q`; `npm test`, `npm run build`, `npm run lint`, `npm run check:estructura`.
- **En la aplicación real**, en puertos propios (8010 y 5180) y con base temporal, sin tocar tus servidores, con capturas:
  1. **Buscar por familia:** en Investigaciones, escribir el nombre de una familia encuentra sus entrevistas en las vistas de salón, Leyendas y mías; el chip filtra y se puede quitar.
  2. **Guion sin rastro de ocupación:** paso 1 (buscar y elegir familia), «lo que pienso», mis preguntas y guía lista, incluidos aliados, tarjeta en curso y confirmaciones. Reviso el texto de cada pantalla buscando «ocupación»; donde quede, debe referirse al oficio de la persona.
  3. **Publicación sin rastro de ocupación:** formulario de publicar y editar con «¿A qué se dedica?», y que sea obligatorio.
  4. **Catálogo:** el bloque sale en la columna derecha del detalle de carrera; hasta 3 entrevistas con salón y Leyendas; «Ver las N entrevistas» lleva al listado filtrado. Sin desborde en escritorio ni en celular, con títulos largos y comprobando que no haya scroll horizontal. Una carrera técnica y una universitaria de la misma familia muestran las mismas. El detalle de ocupación ya no muestra entrevistas.
  5. **Ciclo completo:** Ana publica con Luis como coautor (uno de otra familia no puede serlo); se ve en tarjeta y detalle con video; Mía reacciona y comenta; la orientadora ve familia y a qué se dedica, comenta y destaca; se edita y se retira.
- Los textos de prueba serán legibles, sin marcas tipo `RESPUESTA-ANA-CONV1`.
- Sin push. **No se corre Gemini real:** el prompt nuevo se prueba con el evaluador falso, así que no veré la calidad real de sus sugerencias.

### Lo que te tocará a ti

Al subir tu servidor con esta rama, `alembic upgrade head` borrará las entrevistas de tu base de desarrollo; después puedes correr el script de ejemplos.
