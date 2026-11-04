<!-- Exportado del doc «Fichas de la plataforma» (https://claude.ai/artifact/Hp1h5YxA15nwbNdwg9YViK), 3 nov 2026.
Uso previsto: base para plantear las actividades informativas y las batallas en otra sesión, y luego el ajuste de carga en datos/contenido.py.
Cada ficha: cabecera (tema, actividad que la desbloquea, batalla que la usa, descripción) y contenido en markdown; al cargar, los #### pasan a ###. -->

# Fichas de la plataforma

Nov 2, 2026 · @Carlos Sanchez

## 1. Criterios

La plataforma tiene 23 fichas del estudiante (F01–F23) y 8 del apoderado (FP01–FP08), una por actividad informativa que la desbloquea, con el formato que ya usa el backend (`Ficha`: código, título, descripción, tema, contenido en markdown, audiencia) y una regla `FICHA` por cada una.

| Campo | Regla |
| --- | --- |
| Código | Numeración de la ruta base: `F01`…`F23`, `FP01`…`FP08` |
| Título | Hasta 45 caracteres |
| Descripción | Una línea para la tarjeta de la mochila, hasta 110 caracteres |
| Tema (chip) | Seis valores fijos: Decidir · Conocerme · Mundo del trabajo · Estudiar · Dinero · Familia |
| Contenido | Markdown que admite el renderizador del front: `###`, listas ` -  ` o ` 1.  `, citas `>`, tablas \` |
| Extensión | Estudiante: 500–900 palabras (3 a 5 minutos a 200 palabras/min). Apoderado: 300–500 palabras |
| Estructura | Párrafo de entrada con el punto de la ficha · 2 a 4 secciones `###` con datos y listas · una cita con la idea para llevarse · «Para tu viaje» (una o dos líneas, solo acciones que la plataforma sí tiene) · «Fuentes» |
| Fuentes | La cartilla del MINEDU y el catálogo de contenidos (FU-01 a FU-24) como base; fuentes oficiales o académicas recientes donde el tema lo pide (género, ansiedad e indecisión, rol de la familia, mercado, licenciamiento, becas) |
| Batallas | Las fichas que alimentan una batalla llevan explícitos los datos y distinciones que las preguntas van a comprobar |

Tres criterios de contenido: la ficha no repite lo que el estudiante ya ve en otra parte (la vista explicada de un test, el detalle de una carrera, el presupuesto de la tarjeta), sino que explica el concepto y cómo usarlo; usa datos y listas antes que adjetivos; y no promete acciones que la plataforma no hace.

Nota sobre inteligencias: el instrumento cargado mide 7 inteligencias (sin la naturalista), así que F09 presenta esas siete.

## 2. Índice

Respecto a la ruta base hay dos cambios: F07 pasa a explicar qué es un test y para qué sirve, y se agrega F23 (carreras del futuro y emprender), desbloqueada por la misión adicional MA5, para no cargar la ficha de ingresos. Las fichas del apoderado son nuevas, una por actividad P1 a P8.

### Estudiante

| Código | Título | Tema | La desbloquea | La usa | Fuentes principales |
| --- | --- | --- | --- | --- | --- |
| F01 | Vocación, profesión y ocupación | Decidir | 0.1 | — | FU-01 |
| F02 | Lo que pesa cuando decides | Decidir | 0.5 | 4.4 | FU-01, FU-17, FU-24 |
| F03 | Dudar también es avanzar | Decidir | 0.6 | — | FU-01, FU-18, FU-19, FU-20, Minsa |
| F04 | Tu historia te da pistas | Conocerme | 1.1 | — | FU-01 (Horna, Super) |
| F05 | Mitos sobre el futuro profesional | Decidir | 1.4 | 1.5, MA2 | FU-01, Sunedu 2023, Mi Carrera |
| F06 | El plan de vida | Decidir | 1.7 | — | FU-01 (MDP, Oliveros) |
| F07 | Qué es un test y para qué sirve | Conocerme | 2.1 | — | FU-01, FU-12, FU-13 |
| F08 | Las habilidades sociales | Conocerme | 2.1 | — | FU-01 (Burga), FU-10 |
| F09 | Siete formas de ser inteligente | Conocerme | 2.2 | — | FU-01 (Gardner), FU-16 |
| F10 | Seis tipos de intereses | Conocerme | 2.5 | — | FU-01 (Holland), FU-11, FU-13 |
| F11 | Caminos después del colegio | Estudiar | 3.1 | 3.5, 3.B | FU-01, FU-02, FU-08, INEI/Minedu |
| F12 | Cómo leer una ficha del catálogo | Mundo del trabajo | 3.2 | — | Catálogo de la plataforma, FU-11 |
| F13 | Salarios, demanda e informalidad | Mundo del trabajo | 3.3 | 3.5, MA7 | FU-02, FU-09, MTPE |
| F14 | Licenciamiento y acreditación | Estudiar | 3.6 | 3.7 | FU-04, FU-05, FU-06, FU-07 |
| F15 | Cómo se ingresa | Estudiar | 3.6 | 3.7 | FU-07, FU-08 |
| F16 | Cuánto cuesta y cómo pagarlo | Dinero | 3.8 | 3.9, MA9 | FU-02, FU-22, FU-23, Pronabec |
| F17 | Caminos que no van en línea recta | Mundo del trabajo | 3.10 | — | FU-01 (A10, Anexo 12.2) |
| F18 | Cómo entrevistar a un profesional | Mundo del trabajo | Misión del investigador | — | FU-01 (A8, A15), FU-15 |
| F19 | Cruzar tu perfil con tus opciones | Decidir | 4.1 | 4.4 | FU-01 (A14) |
| F20 | Criterios para decidir | Decidir | 4.4 | 4.4 | FU-01 (A17), FU-17 |
| F21 | Después de decidir | Decidir | 5.1 | — | FU-01 (estación 5), Pronabec, admisión |
| F22 | Cómo aprovechar una feria | Estudiar | Feria (ciudad) | — | FU-01 (A11), FU-04, FU-05 |
| F23 | Carreras del futuro y emprender | Mundo del trabajo | MA5 | — | FU-02, FU-21, Santander |

### Apoderado

| Código | Título | Tema | La desbloquea | Fuentes principales |
| --- | --- | --- | --- | --- |
| FP01 | Acompañar no es decidir | Familia | P1 | FU-01 (A3), Whiston y Keller 2004, Söner y Gültekin 2024 |
| FP02 | Lo que usted espera y lo que teme | Familia | P2 | FU-01 (A3) |
| FP03 | Apoyar sin presionar | Familia | P3 | FU-01, Dietrich y Kracke 2009 |
| FP04 | Cuando la familia descubre tarde | Familia | P4 | FU-01 (A12) |
| FP05 | Lo que cambió desde que usted eligió | Mundo del trabajo | P5 | FU-02, FU-04, FU-05, FU-09, Pronabec |
| FP06 | Cómo conversar con su hijo o hija | Familia | P6 | FU-01 (A3, A12) |
| FP07 | Si duda o cambia de opinión | Familia | P7 | FU-01, FU-19 |
| FP08 | Su carta y lo que sigue | Familia | P8 | FU-01 (A3, cierre) |

## 3. Fichas del estudiante · Bloques 0 a 2

Cada ficha va con su cabecera (código, título, tema, descripción, actividad) y debajo el contenido tal como se cargará. En este documento las secciones internas de cada ficha usan `####`; al cargar pasan a `###`.

### F01 · Vocación, profesión y ocupación

**Tema:** Decidir · **Desbloquea:** 0.1 · **Descripción:** Tres palabras que se confunden y por qué la vocación se construye, no se descubre.

Mucha gente espera «descubrir» su vocación como si estuviera escondida en algún lugar. No funciona así: la vocación se va armando con lo que haces, lo que aprendes y lo que vas conociendo del mundo.

#### Tres palabras, tres cosas distintas

| Palabra | Qué es | Ejemplo |
| --- | --- | --- |
| Vocación | El conjunto de motivos e intereses que te orientan hacia lo que quieres ser y hacer | Querer ayudar a que la gente se sienta mejor |
| Profesión | Una actividad laboral que se ejerce después de un periodo de formación y especialización | Enfermería, psicología, fisioterapia |
| Ocupación | La actividad concreta que realiza una persona para trabajar | Enfermero de emergencias, psicóloga escolar |

Una misma vocación puede expresarse en varias profesiones, y una profesión lleva a muchas ocupaciones. Por eso la pregunta «¿qué quiero estudiar?» llega después de otra más grande: «¿qué quiero hacer en la vida y por qué?».

#### La vocación no nace contigo

El programa de orientación vocacional del MINEDU lo dice así: la vocación no es un aspecto innato ni predeterminado de la persona, ni algo que se decide en un momento puntual. Se forma a lo largo de la vida, a través del reconocimiento de habilidades y de las situaciones que uno va resolviendo.

Eso tiene tres consecuencias prácticas:

- Nadie puede «no tener vocación». Lo que puede faltar es información sobre uno mismo o sobre las opciones.
- Ningún test te la revela. Un test ordena información que ya tienes; no agrega lo que no has vivido.
- Cambia con el tiempo. Lo que te atrae a los 17 puede ampliarse o girar a los 25, y eso no es un error.

#### Toda ocupación puede profesionalizarse

Profesión y ocupación no son opuestas sino complementarias. Una persona puede empezar en una ocupación (atender un negocio, reparar equipos, cocinar) y, con preparación, ir profesionalizando esa actividad: cursos, un instituto, una carrera universitaria, una especialización. La profesionalización no exige entrar a la universidad al día siguiente de terminar el colegio.

> La vocación no se encuentra: se construye conociéndote y conociendo lo que existe afuera.

**Para tu viaje.** En el catálogo de la plataforma verás por separado carreras (lo que se estudia), ocupaciones (lo que se hace) e instituciones (dónde se estudia). Esa separación es la de esta ficha: una carrera lleva a varias ocupaciones, y una ocupación recibe gente de varias carreras.

**Fuentes:** Ministerio de Educación (2013), *Orientación vocacional: cartilla para tutores*, parte 1 (MED, 2007b y 2007c).

### F02 · Lo que pesa cuando decides

**Tema:** Decidir · **Desbloquea:** 0.5 · **La usa:** batalla 4.4 · **Descripción:** Los factores internos y externos de una decisión vocacional, y las señales de una decisión apurada.

Alejandra eligió Contabilidad porque sus amigas le dijeron que era fácil conseguir trabajo. En el primer ciclo se aburría, sus notas bajaron y pensó en dejarlo. No le faltó capacidad: le faltó considerar casi todo lo demás.

#### Lo que viene de ti y lo que viene de afuera

| Factores internos | Factores externos |
| --- | --- |
| Identidad, autoconcepto y autoestima | Relaciones sociales: familia, amigos, docentes |
| Personalidad: tu forma de actuar y de decidir | Contexto sociocultural: qué se valora en tu entorno |
| Aptitudes, capacidades e intereses | Estereotipos de género |
| Valores: qué te importa de verdad | Información sobre el mercado laboral y la oferta educativa |

Ninguno de los dos lados es «el malo». Decidir solo con los internos (me gusta) ignora si existe trabajo o dónde se estudia. Decidir solo con los externos (hay trabajo, lo dicen mis padres) es lo que le pasó a Alejandra.

#### Motivación que empuja y motivación que arrastra

En psicología se distingue la motivación intrínseca (eliges porque la actividad en sí te interesa y te reta) de la extrínseca (eliges por lo que viene después: dinero, estatus, aprobación). Las dos existen en toda decisión. El problema aparece cuando solo hay extrínseca: ahí la carrera se vuelve un medio que se abandona en cuanto el premio tarda en llegar.

Un dato para tomar en serio: según el Ministerio de Trabajo, en 2022 cerca de siete de cada diez personas con estudios superiores en el Perú no trabajaban en lo que habían estudiado. Parte de eso es el mercado, y parte son decisiones tomadas con poca información.

#### Cinco señales de una decisión apurada

1. La razón principal es lo que otros dicen («mis papás quieren», «mis amigos van a estudiar eso»).
2. Solo conoces el nombre de la carrera, no qué se hace en ella día a día.
3. Eliges por el sueldo o el prestigio sin saber si el trabajo te va a gustar.
4. Descartas una opción por un prejuicio («eso es de hombres», «eso no da plata») sin un dato.
5. No sabes cuánto cuesta ni dónde se estudia.

Cada señal apunta a un factor que faltó. Reconocerlas en los casos de otros es más fácil que en el propio; por eso conviene practicar con ellos.

#### Las redes sociales también pesan

Los influencers de carreras, los videos de «un día en la vida de…» y los rankings virales son hoy una fuente de información real para muchos jóvenes. Sirven para descubrir que una ocupación existe, pero muestran la parte vistosa y rara vez el sueldo del primer año, las horas o la rutina. Trátalos como una pista que hay que verificar, no como una prueba.

> Una buena decisión no es la que acierta: es la que consideró los factores que importaban.

**Para tu viaje.** El camino revisa esos factores en orden: primero los internos (Bloques 1 y 2) y luego los externos (Bloque 3). Cuando llegues a la batalla «Decidir con criterio», estas cinco señales serán lo que tengas que reconocer.

**Fuentes:** MINEDU (2013), cartilla, parte 1 y actividad 2. Cano Celestino (2008), *Motivación y elección de carrera*, Revista Mexicana de Orientación Educativa. [Andina (2025), inadecuación ocupacional según el MTPE](https://andina.pe/agencia/noticia-jovenes-estan-escogiendo-mejor-sus-carreras-que-favorecera-adecuacion-ocupacional-1032314.aspx). [Gestión (2024), redes sociales y elección de carrera](https://gestion.pe/economia/management-empleo/educacion-superior-generacion-z-se-puede-decidir-estudiar-una-carrera-utilizando-redes-sociales-noticia).

### F03 · Dudar también es avanzar

**Tema:** Decidir · **Desbloquea:** 0.6 · **Descripción:** Por qué no saber todavía es parte del proceso, de dónde vienen las dudas y qué hacer con ellas.

Casi nadie termina el colegio con una respuesta cerrada. Lo que sí se puede tener es una forma de avanzar mientras la respuesta se arma.

#### La indecisión es una fase, no un problema

El programa del MINEDU es claro: la indecisión es una fase normal del proceso de decidir, incluso necesaria, porque es cuando uno explora. Un estudio reciente con estudiantes de secundaria en España (Mata-Correas y otros, 2025) distingue dos cosas que suelen confundirse:

- La indecisión evolutiva: no haber decidido todavía porque falta explorar. Es la situación de la mayoría a tu edad y se resuelve con información y tiempo.
- La indecisión compleja: la que se mantiene aunque haya información, porque la bloquean la ansiedad, el miedo a equivocarse o la presión. Esa sí pide ayuda de un adulto o un profesional.

#### De dónde viene una duda

Una clasificación clásica (Gati, Krausz y Osipow, 1996) ordena las dificultades para decidir en tres grupos. Sirve para ubicar la tuya:

| Grupo | Suena como | Qué la resuelve |
| --- | --- | --- |
| Falta de preparación | «Todavía no quiero pensar en eso», «un test me lo dirá» | Entender cómo se decide y qué creencias estorban |
| Falta de información | «No sé qué hace un ingeniero ambiental», «no sé cuánto cuesta» | Buscar datos concretos |
| Información en conflicto | «Me gusta A, pero mis papás quieren B», «dos fuentes dicen cosas distintas» | Comparar criterios y conversar |

#### Presión que mueve y ansiedad que bloquea

Un poco de presión te hace buscar información y hablar con gente: esa sirve. Cuando se vuelve «ya deberías saber», aparece la ansiedad: pensar en el tema cansa, lo evitas y las dudas crecen solas. En el Perú la ansiedad es el motivo más frecuente de atención en salud mental (28,8 % de las atenciones del Minsa en 2022), y uno de cada siete atendidos es adolescente. No estás solo en esto, y no es un signo de debilidad.

Conviene pedir ayuda a la orientadora o a un psicólogo si durante varias semanas la decisión te quita el sueño o el apetito, te cuesta concentrarte en clases o sientes que no puedes con nada. Eso ya no es una duda vocacional: es algo que merece atención aparte.

#### Cuatro cosas que sí puedes hacer con una duda

1. **Ponerle nombre.** «No sé si me alcanza el dinero» se puede trabajar; «estoy perdido» no.
2. **Escribirla.** Escribir sobre lo que uno siente ayuda a procesarlo (Pennebaker, 1997). Lo escrito se puede mirar de nuevo; lo que da vueltas en la cabeza no.
3. **Contársela a alguien de confianza**, no para que decida por ti, sino para escucharte decirla en voz alta.
4. **Partirla en pasos pequeños.** «Elegir carrera» no es un paso; «averiguar qué hace un día normal un diseñador» sí.

> Una duda con nombre ya es un avance. Una duda sin nombre es solo peso.

**Para tu viaje.** El check-in diario registra qué tan seguro te sientes; va a subir y bajar, y eso es normal. Lo que sientes va al diario, que nadie lee; lo que piensas y decides, a tus registros, que sí lee tu orientadora.

**Fuentes:** MINEDU (2013), cartilla, parte 2. Gati, Krausz y Osipow (1996), *A taxonomy of difficulties in career decision making*. [Mata-Correas, Hernández-Franco y Prieto-Ursúa (2025), Educación XX1](https://revistas.uned.es/index.php/educacionXX1/article/view/42209). Pennebaker (1997), *Writing about emotional experiences as a therapeutic process*. [El Peruano (2022), atenciones de salud mental del Minsa](https://www.elperuano.pe/noticia/192010-minsa-pone-la-lupa-en-la-ansiedad).

### F04 · Tu historia te da pistas

**Tema:** Conocerme · **Desbloquea:** 1.1 · **Descripción:** Por qué recordar tu propia historia ayuda a decidir, y cómo leerla sin idealizarla ni descartarla.

Antes de mirar hacia adelante conviene mirar hacia atrás. Lo que disfrutabas de niño, las personas que te marcaron y las dificultades que superaste no son anécdotas: son datos sobre ti que ningún test tiene.

#### Pensamiento autobiográfico

El programa del MINEDU lo llama así: pensar y reconstruir la historia de la propia vida. Plasmar por escrito lo vivido permite tomar conciencia de las vivencias y emociones, darles sentido y luego proyectarse al futuro. Horna (2005) lo describe como hablarle al niño que uno fue, consolándolo y dándole consejo. No es un ejercicio de nostalgia: es una herramienta de autoconocimiento.

#### Autoconcepto y autoestima

Dos palabras que se parecen pero no son lo mismo:

- El autoconcepto es la imagen que tienes de ti: qué crees que se te da bien, cómo te describes, qué «tipo de persona» piensas que eres. Super hablaba de un «sí mismo vocacional» que se va definiendo al explorar, probar roles y evaluarse.
- La autoestima es cómo valoras esa imagen: si la aceptas o la rechazas.

Las dos influyen en la seguridad para decidir. Alguien con un autoconcepto borroso («no sé qué se me da bien») o una autoestima baja («no voy a poder») tiende a dejar que otros decidan o a elegir lo más seguro aunque no le interese.

#### Qué buscar en tu historia

| Pregunta | Qué pista deja |
| --- | --- |
| ¿Qué te gustaba hacer desde niño? | Intereses que se sostienen en el tiempo, no modas |
| ¿Qué personas influyeron en quién eres? | Modelos que admiras y por qué |
| ¿Cuál ha sido un logro del que estás orgulloso? | Habilidades que ya usaste, no solo que crees tener |
| ¿Qué dificultad superaste y cómo? | Recursos propios: constancia, ayuda que supiste pedir, creatividad |
| ¿Qué esperan de ti las personas cercanas? | Expectativas ajenas que conviene separar de las propias |

La clave está en los ejemplos concretos. «Me gusta el deporte» dice poco; «organizaba los partidos del barrio y armaba los equipos» dice que te gusta organizar y liderar, no solo jugar.

#### Dos trampas al recordar

- Idealizar: contar solo lo bueno. Las dificultades dicen tanto de ti como los logros.
- Descartar: pensar que tu historia «no tiene nada interesante». Todas tienen datos; lo que cambia es cuánto se mira.

> Lo que te gustaba a los ocho años no decide tu carrera, pero dice qué tipo de cosas te mueven.

**Para tu viaje.** Lo que registres en «Mi historia personal» vuelve a aparecer más adelante, cuando cruces tu perfil con tus opciones. Escríbelo con ejemplos: te lo vas a agradecer.

**Fuentes:** MINEDU (2013), cartilla, parte 1 (Super, Erikson) y parte 2 (pensamiento autobiográfico, Horna 2005). Sesión de tutoría 1, «Construyo mi historia personal».

### F05 · Mitos sobre el futuro profesional

**Tema:** Decidir · **Desbloquea:** 1.4 · **La usan:** batallas 1.5 y MA2 · **Descripción:** Seis frases que todos repiten, qué dicen los datos y cómo distinguir un mito de una afirmación con sustento.

Un mito es una creencia que se repite sin evidencia que la respalde. En la elección de carrera abundan, y lo peligroso es que se sienten como sentido común. Aquí van las más frecuentes y lo que se sabe de cada una.

#### Seis mitos frente a los datos

**«Mis padres saben qué me conviene estudiar».** Tu familia te conoce, y su experiencia vale. Pero la información que tienen del mercado suele ser de cuando ellos eligieron, y a veces proyectan en ti lo que no pudieron hacer. El programa del MINEDU les pide a las familias acompañar, informar y respetar; la decisión es tuya.

**«El test me dirá qué estudiar».** Un test de intereses ordena lo que ya sabes de ti y sugiere áreas para explorar. No conoce tu contexto, tu esfuerzo ni la oferta de tu ciudad. Un resultado es una hipótesis, no una sentencia.

**«Solo la universidad da futuro».** Datos del propio Estado lo contradicen. La plataforma Mi Carrera del MTPE, con ingresos de planilla, muestra técnicos en minería con un promedio cercano a S/ 5 600 y técnicos industriales alrededor de S/ 3 700, frente a un promedio de unos S/ 2 400 en una carrera universitaria tan común como Contabilidad. La ruta técnica dura menos, cuesta menos y en varios campos tiene más demanda.

**«Si estudio lo que me gusta voy a ganar poco».** El ingreso no depende solo del nombre de la carrera: depende de la ocupación concreta, de la institución, de la experiencia y de la ciudad. Dentro de una misma carrera el rango entre quien gana menos y quien gana más es enorme. Lo que sí está documentado es que quien abandona una carrera que no le interesa pierde tiempo y dinero.

**«La carrera decide toda mi vida».** Siete de cada diez peruanos con estudios superiores trabajan en algo distinto a lo que estudiaron (MTPE, 2022). Las trayectorias cambian: se cambia de carrera, se combinan áreas, se estudia una segunda cosa. Elegir es un primer paso que se puede corregir, no una condena.

**«Hay trabajos de hombres y trabajos de mujeres».** El único requisito para ejercer una profesión son las habilidades, los conocimientos y el interés. Lo que existe es una costumbre social, y los números la muestran: en el Perú las mujeres son el 54 % de los egresados universitarios, pero en mecánica, metalurgia y electrónica hay menos de una mujer por cada diez estudiantes, y en tecnologías de la información 14 por cada 100; al revés, en educación inicial y obstetricia hay 0,5 hombres por cada 100 (Sunedu, 2023). Además, las mujeres con educación superior ganan entre 20 % y 22 % menos que los hombres de la misma carrera. Nada de eso dice qué puedes hacer; dice qué opciones la gente descarta sin mirarlas. La investigación muestra que hombres y mujeres tienden a elegir lo que menos contradice los estereotipos, y que las mujeres persisten menos en carreras «no femeninas» aunque tengan la capacidad (Fouad, 2007).

#### Lo que sí tiene sustento

Para que la batalla no sea adivinanza, estas afirmaciones sí están respaldadas:

- Las mujeres tienen la misma capacidad que los hombres para ser excelentes profesionales.
- Existen varias rutas válidas después del colegio: universidad, instituto, oficios, Fuerzas Armadas y emprendimiento.
- Combinar interés con información real sobre ingresos y empleabilidad da mejores decisiones que mirar solo una de las dos.
- Las habilidades que desarrollas (comunicarte, resolver problemas, trabajar en equipo) sirven aunque cambies de campo.
- Estar satisfecho con el trabajo pesa tanto o más que ganar mucho dinero en cómo la gente evalúa su vida.

#### Cómo desarmar un mito en cuatro preguntas

1. ¿Quién lo dice y qué sabe del tema?
2. ¿Con qué dato? Si no hay dato, es opinión.
3. ¿De qué año es ese dato? Un consejo de hace veinte años puede describir otro mercado.
4. ¿Aplica a mi caso? Un promedio nacional no es tu situación.

> Que una frase se repita mucho no la vuelve cierta; solo la vuelve conocida.

**Para tu viaje.** En el puente de los mitos vas a clasificar frases como mito o afirmación con sustento y elegir el argumento correcto. Esta ficha tiene los argumentos.

**Fuentes:** MINEDU (2013), cartilla, parte 1 (género; Fouad, 2007) y sesión de tutoría 3. [El Peruano (2023), Sunedu: género y educación universitaria](https://elperuano.pe/noticia/202958-sunedu-hay-mas-mujeres-que-hombres-en-universidades-pero-ganan-hasta-un-27-menos). [Andina (2023), ingresos de carreras técnicas según Mi Carrera](https://andina.pe/ingles/noticia-mtpe-algunas-carreras-tecnicas-pagan-hasta-dos-veces-mas-las-profesionales-966960.aspx). [Andina (2025), inadecuación ocupacional](https://andina.pe/agencia/noticia-jovenes-estan-escogiendo-mejor-sus-carreras-que-favorecera-adecuacion-ocupacional-1032314.aspx).

### F06 · El plan de vida

**Tema:** Decidir · **Desbloquea:** 1.7 · **Descripción:** Qué es un plan de vida, por qué se proyecta a cinco años y cómo escribir metas que sirvan.

Un plan de vida no es una promesa ni una lista de deseos. Es ponerle fechas y pasos a lo que quieres, sabiendo que lo vas a corregir.

#### Tres piezas que van juntas

El programa del MINEDU usa el Modelo de Orientación para el Desarrollo Personal (Oliveros, 2004), que ordena el proceso en tres componentes:

| Componente | Qué es | Pregunta que responde |
| --- | --- | --- |
| Autovaloración personal | Cómo te conoces y te valoras (autoconcepto y autoestima) | ¿Quién soy y qué tengo? |
| Visión de futuro | Lo que imaginas y deseas para ti, tu familia y tu comunidad | ¿Hacia dónde quiero ir? |
| Plan de vida | Las metas y los pasos para llegar, con criterios que guíen las decisiones | ¿Cómo llego? |

El orden importa: sin autovaloración, la visión de futuro es copiada de otros; sin visión de futuro, el plan es una lista de tareas sin dirección.

#### Por qué cinco años

Un plan a cinco años o más permite proyectar cambios grandes: terminar una formación, empezar a trabajar, mudarse, independizarse. Un plan solo a un año se queda en «ingresar a algún lado». Las metas se escriben como tentativas: se ajustan cuando cambian las condiciones o cambias tú. Un plan que no se revisa deja de ser plan.

El plan de vida no es solo académico. Incluye quién quieres ser como persona, cómo quieres relacionarte con los demás y qué quieres aportar; el programa lo llama el carácter existencial del plan.

#### Las cuatro preguntas del plan

La cartilla propone imaginarte dentro de cinco años y responder:

1. ¿Quién seré? Qué estaré haciendo y cómo me describiría.
2. ¿Dónde estaré? Lugar, grupo al que perteneceré, personas alrededor.
3. ¿Qué deseo más y cómo lo voy a lograr? Intereses, metas y el camino hacia ellas.
4. ¿Qué dificultades se me pueden presentar y cómo las voy a superar?

#### Una meta útil tiene cuatro partes

| Parte | Mal escrita | Bien escrita |
| --- | --- | --- |
| Acción | «Estar bien» | «Terminar el segundo ciclo de mi carrera» |
| Plazo | «Algún día» | «A fines del próximo año» |
| Recurso que necesito | — | «Un ingreso para el pasaje y los materiales» |
| Dificultad y estrategia | — | «Si no ingreso a la primera, me preparo seis meses más y postulo de nuevo» |

La diferencia entre un deseo y una meta es que la meta dice qué harías, no solo cómo te sentirías.

> Un plan a cinco años no se cumple al pie de la letra. Sirve porque te obliga a decidir hoy qué paso dar primero.

**Para tu viaje.** La línea de tiempo que registres en el camino se vuelve a abrir al final, cuando escribas tu proyecto vocacional, para que compares lo que pensabas con lo que decides.

**Fuentes:** MINEDU (2013), cartilla, parte 2 (Modelo de Orientación para el Desarrollo Personal, Oliveros 2004; Horna 2005) y sesión de tutoría 4, «Mi plan de vida».

### F07 · Qué es un test y para qué sirve

**Tema:** Conocerme · **Desbloquea:** 2.1 · **Descripción:** Qué hace un cuestionario, qué tipos hay en la plataforma, qué puede decirte y qué no.

Un test no es un examen ni una bola de cristal. Es un cuestionario con preguntas iguales para todos, cuyas respuestas se ordenan con una regla fija. Lo que sale depende de lo que pones.

#### Tres tipos de cuestionarios en tu camino

| Tipo | Qué mide | Qué te devuelve | En la plataforma |
| --- | --- | --- | --- |
| De intereses | Qué actividades te atraen, en seis áreas | Un perfil de intereses y ocupaciones cuyo perfil se parece al tuyo | Test de intereses (O\*NET Interest Profiler, 60 ítems) |
| De autoconocimiento | Cómo te describes en un aspecto: habilidades sociales, inteligencias | Un retrato de dónde estás más y menos desarrollado | Habilidades sociales, inteligencias múltiples |
| De proceso | Cómo vas en el camino de decidir | Un antes y un después para compararlos | Punto de partida y punto de llegada |

Solo el primero está relacionado con ocupaciones y carreras. Los otros dos te describen a ti, no te recomiendan nada; sirven para que la decisión la tomes con mejor información sobre ti mismo.

#### Cómo recomienda ocupaciones un test de intereses

El Interest Profiler de O\*NET calcula tu puntaje en seis tipos de interés y los resume en un código de tres letras, tus tres tipos más altos. Pero las ocupaciones afines no salen del código: salen de comparar tus seis puntajes completos con el perfil de intereses de cientos de ocupaciones, medido en personas que ya las ejercen. Las más parecidas a tu perfil son las que aparecen como afines. Y el código sirve para otra cosa: buscar por tu cuenta, en el catálogo, ocupaciones y carreras que tengan esas letras. No busca «la» carrera: busca áreas donde a gente con intereses como los tuyos le suele ir bien.

#### Lo que un test no puede saber

- Tu esfuerzo y tu constancia, que pesan más que cualquier puntaje.
- Tu contexto: cuánto puedes pagar, qué hay en tu ciudad, quién te apoya.
- Si una ocupación te va a gustar en la práctica: eso se averigua probando, visitando o preguntando a quien la ejerce.
- Lo que no has vivido todavía. Si nunca hiciste algo, difícilmente lo marques como interés.

Tampoco predice el éxito. Los tests de intereses son exploratorios: ayudan a mirar en una dirección, no a cerrar las demás.

#### Para que un test sirva

1. Responde lo que eres, no lo que te gustaría ser ni lo que otros esperan.
2. No lo hagas apurado. Un cuestionario respondido en dos minutos mide tu apuro, no tus intereses.
3. Toma el resultado como una hipótesis y busca evidencia: ¿me reconozco?, ¿qué no refleja?
4. Contrástalo con tu historia y con lo que sabes que se te da bien. Un test es una fuente más, no la única.

> Un test ordena lo que ya sabes de ti. No agrega lo que no has vivido.

**Para tu viaje.** Cada cuestionario se responde como una misión de Helena en la ciudad, y su resultado se revela en el libro de Helena, con la explicación de qué significa cada parte. Después de cada resultado hay un registro para decir si te reconoces o no.

**Fuentes:** MINEDU (2013), cartilla, estaciones 1 y 2. Rounds, Su, Lewis y Rivkin (2010), O\*NET Interest Profiler Short Form psychometric characteristics. National Center for O\*NET Development (2021), [O\*NET Interest Profiler manual](https://www.onetcenter.org/dl_files/IP_Manual.pdf).

### F08 · Las habilidades sociales

**Tema:** Conocerme · **Desbloquea:** 2.1 · **Descripción:** Las siete habilidades sociales, cómo se notan en lo cotidiano, por qué las piden los empleadores y cómo se desarrollan.

Un aviso de trabajo real de la bolsa de empleo del Estado pide un profesional «con liderazgo, iniciativa, capacidad para tomar decisiones, resolver conflictos y trabajar en equipo». Nada de eso se aprende en un curso de la carrera: son habilidades sociales, y ya las estás usando o evitando todos los días.

#### Qué son

Las habilidades sociales son conductas que nos permiten relacionarnos bien con nosotros mismos y con los demás, lograr nuestras metas y expresarnos de forma adecuada. Lo importante de la definición está en cuatro rasgos:

- Se aprenden: nadie nace asertivo ni líder.
- Se pueden desarrollar toda la vida.
- Son conductas, verbales y no verbales, que influyen en cómo responden los otros.
- Los demás las recompensan: a quien las tiene le va mejor en los grupos.

#### Las siete habilidades

| Habilidad | Qué es | Se nota cuando… | Una forma de practicarla |
| --- | --- | --- | --- |
| Asertividad | Defender tus derechos y opiniones sin ofender; poder decir «no» | Reclamas el vuelto que faltó; das tu opinión aunque alguien respetado piense distinto | Decir una vez al día algo que piensas y sueles callar |
| Empatía | Ponerte en el lugar del otro y entender lo que siente | Notas que un compañero está mal y le ofreces apoyo sin cuestionarlo | Preguntar «¿cómo te sentiste?» antes de dar tu opinión |
| Expresión de sentimientos | Decir cómo te sientes, a la persona indicada y en el momento adecuado | Puedes decir «eso me molestó» en vez de guardarlo | Nombrar la emoción antes de explicar la causa |
| Resolución de problemas | Analizar una situación difícil y encontrar la salida | Identificas la causa de un problema y te adelantas a las consecuencias | Separar en un problema qué depende de ti y qué no |
| Liderazgo | Actuar en representación de otros y dirigir un grupo con creatividad | Organizas un trabajo grupal y lo sacas adelante | Tomar la coordinación de una tarea pequeña |
| Convivencia | Integrarte a un grupo y permanecer en él | Te adaptas a un equipo nuevo sin perder tu forma de ser | Participar en un grupo distinto al de siempre |
| Comunicación | Expresar y entender lo que se quiere decir, con palabras y gestos | Lo que explicas se entiende a la primera | Resumir en una frase lo que acabas de decir |

#### Por qué importan para tu decisión

Las habilidades sociales no te dicen qué estudiar, pero sí dos cosas útiles:

1. Qué ambientes de trabajo te van a costar más o menos. Una ocupación que exige liderar grupos todo el día se vive distinto si el liderazgo es tu habilidad más desarrollada o la menos.
2. Que una habilidad baja no es un veto. Como se aprenden, lo que hoy te cuesta puede ser el plan de desarrollo de los próximos años, no un motivo para descartar una opción.

> No eres «tímido» o «sociable» para siempre: tienes habilidades más y menos practicadas.

**Para tu viaje.** La misión de Helena sobre habilidades sociales te muestra cuáles tienes más desarrolladas. Luego eliges una con menor desarrollo y propones cómo practicarla en tu vida diaria.

**Fuentes:** MINEDU (2013), cartilla, actividad 4 y Anexo 4.1, «Las principales habilidades sociales» (Burga, 2000). [Empleos Perú, bolsa de trabajo del MTPE](https://www.empleosperu.gob.pe/portal-mtpe/#/).

### F09 · Siete formas de ser inteligente

**Tema:** Conocerme · **Desbloquea:** 2.2 · **Descripción:** La teoría de las inteligencias múltiples de Gardner, las siete que mide tu cuestionario y qué significan para elegir.

Durante mucho tiempo se pensó que la inteligencia era una sola, la que miden las notas en matemática y lenguaje. Howard Gardner propuso en 1983 que hay varias, que todos las tenemos y que cada persona las desarrolla en una combinación propia.

#### Qué cambia con esta idea

- Nadie es «inteligente» o «no inteligente» en general; cada uno tiene un perfil con puntos más y menos desarrollados.
- Las inteligencias se usan según el problema: para arreglar una bicicleta no sirve la misma que para calmar una discusión.
- Se desarrollan con práctica. El perfil de hoy no es el de dentro de cinco años.

Gardner luego agregó otras inteligencias a su lista. El cuestionario de la plataforma mide estas siete, que son las del programa del MINEDU.

#### Las siete inteligencias

| Inteligencia | Capacidad para… | Se nota cuando… | Personas que la muestran |
| --- | --- | --- | --- |
| Lingüística | Usar las palabras con eficacia, al hablar y al escribir | Explicas un tema y se entiende; disfrutas leer y escribir | Ricardo Palma, Mario Vargas Llosa, Gabriel García Márquez |
| Lógico-matemática | Razonar, usar números, ver patrones y relaciones | Resuelves problemas paso a paso; deduces causas y consecuencias | Pedro Ruiz Gallo, Julio C. Tello, Deysi Cori |
| Espacial | Percibir el mundo visual y transformar esas imágenes | Imaginas un objeto desde varios ángulos; te orientas bien | Miguel Grau, Leonardo da Vinci, Salvador Dalí |
| Cinestésico-corporal | Usar el cuerpo para expresar ideas y producir cosas con las manos | Tienes coordinación y destreza; aprendes haciendo | Sofía Mulanovich, Kina Malpartida, Teófilo Cubillas |
| Musical | Percibir, distinguir y expresar formas musicales | Sigues ritmos y melodías con facilidad; tocas o cantas | Juan Diego Flórez, Ima Súmac, Gian Marco |
| Interpersonal | Percibir estados de ánimo e intenciones de otros y responder a ellos | Te buscan para contarte cosas; convences y organizas | José Carlos Mariátegui, Teresa de Calcuta, Carl Rogers |
| Intrapersonal | Conocerte a ti mismo y actuar según ese conocimiento | Reconoces tus emociones y tus límites; sabes qué te mueve | César Vallejo, Sócrates, Carl Jung |

#### Cómo leer tu perfil sin equivocarte

1. Mira el conjunto, no una sola. Las ocupaciones reales combinan varias: un arquitecto usa la espacial y la lógico-matemática; un docente, la lingüística y la interpersonal.
2. Una inteligencia alta dice qué tipo de tareas te cuestan menos y disfrutas más; no dice qué carrera.
3. Una baja no cierra puertas. Dice dónde tendrías que esforzarte más, y eso se decide con los demás factores.
4. Pregunta a quien te conoce en cuál te ve destacar. A veces los demás ven lo que uno da por sentado.

> Todos tenemos las siete. Lo que te distingue es cómo las combinas.

**Para tu viaje.** Tu perfil de inteligencias se revela en el libro de Helena. Ahí se explica cada una y cómo desarrollarla; después hay un registro para decir en cuáles te reconoces y en cuál no.

**Fuentes:** MINEDU (2013), cartilla, actividad 6 y Anexo 6.2, «Inteligencias múltiples» (basado en CCEC, 2005). Gardner (1999), *Intelligence reframed*.

### F10 · Seis tipos de intereses

**Tema:** Conocerme · **Desbloquea:** 2.5 · **Descripción:** Los seis tipos de Holland, el ambiente de trabajo de cada uno, ejemplos de ocupaciones y cómo leer un código de tres letras.

El psicólogo John Holland observó algo simple: las personas buscan ambientes de trabajo donde se sienten cómodas, y esos ambientes se pueden ordenar en seis tipos. La mayoría de la gente se parece a dos o tres de ellos a la vez.

#### Los seis tipos

| Tipo | Les gusta… | Ambiente típico | Ocupaciones de ejemplo |
| --- | --- | --- | --- |
| Realista (R) | Trabajar con objetos, herramientas, máquinas, plantas o animales; ver resultados concretos | Campo, taller, planta, obra | Técnico agropecuario, mecánico de mantenimiento, ingeniero civil, piloto |
| Investigador (I) | Observar, analizar, entender cómo funcionan las cosas; pensar más que actuar | Laboratorio, centro de investigación, hospital | Microbiólogo, médico, analista de datos, químico |
| Artístico (A) | Crear y expresarse con palabras, imágenes, sonidos o movimiento; poca rutina | Estudio, taller creativo, escenario | Diseñador gráfico, músico, arquitecto, comunicador audiovisual |
| Social (S) | Ayudar, enseñar, cuidar, orientar a otras personas | Colegio, consultorio, comunidad | Docente, enfermera, psicólogo, trabajador social |
| Emprendedor (E) | Dirigir, convencer, negociar, tomar decisiones; lo económico importa | Empresa, negocio propio, ventas | Administrador, especialista en marketing, abogado, oficial de la PNP |
| Convencional (C) | Organizar datos, seguir procedimientos, cuidar el detalle | Oficina, banco, área administrativa | Contador, asistente administrativo, auditor, estadístico |

#### El hexágono: tipos cercanos y opuestos

Holland dibujó los seis tipos en un hexágono, en el orden R-I-A-S-E-C. Los tipos vecinos se parecen (Realista con Investigador, Social con Emprendedor) y los opuestos se parecen poco (Realista con Social, Investigador con Emprendedor, Artístico con Convencional). Un perfil con tipos vecinos suele ser más claro; uno con tipos opuestos no es un error: significa que te atraen cosas distintas y que conviene buscar ocupaciones que las combinen.

#### El código de tres letras

Tu resultado se resume en tus tres tipos más altos, en orden. «SIA», por ejemplo, es alguien que sobre todo quiere trabajar con personas, le gusta entender y analizar, y valora crear. Las ocupaciones también tienen su código, medido en personas que las ejercen. Las recomendaciones del test no usan solo esas tres letras: comparan tu perfil completo, con los seis puntajes, contra el de cada ocupación, y las más parecidas aparecen como afines. El código, en cambio, es tu herramienta para explorar: en el catálogo puedes filtrar ocupaciones y carreras por una letra o por una combinación (S, SI, SIA) y descubrir opciones que el test no te mostró.

#### Lo que el resultado no hace

- No te asigna una carrera. Sugiere áreas donde explorar.
- No mide capacidad: mide qué te atrae. Puedes ser muy bueno en algo que no te interesa, y al revés.
- No es fijo. Los intereses cambian con la experiencia, sobre todo cuando pruebas cosas nuevas.

> Tu código dice en qué ambientes te sentirías cómodo. Qué haces ahí, lo decides tú.

**Para tu viaje.** El test de intereses se responde en seis misiones de Helena. Su resultado muestra tu código, las ocupaciones afines y las familias de carreras recomendadas; en el registro de cierre contrastas eso con tu opción inicial. Después, usa las letras de tu código en el filtro del catálogo para buscar más ocupaciones por tu cuenta.

**Fuentes:** MINEDU (2013), cartilla, Anexos 7.1 y 7.2 (orientaciones de la personalidad, Holland) y Anexo 13.1. National Center for O\*NET Development, [Mi Próximo Paso](https://www.miproximopaso.org) y [O\*NET Interest Profiler manual](https://www.onetcenter.org/dl_files/IP_Manual.pdf).

## 4. Fichas del estudiante · Bloque 3

### F11 · Caminos después del colegio

**Tema:** Estudiar · **Desbloquea:** 3.1 · **La usan:** batallas 3.5 y 3.B · **Descripción:** Las cinco rutas después de la secundaria, cuánto duran, qué dan y para quién conviene cada una.

En el Perú solo tres de cada diez jóvenes pasan a la educación superior al terminar el colegio, y en zonas rurales cuatro de cada cinco se quedan fuera (Inei 2023, Minedu 2024). Eso no significa que haya un solo camino bueno y los demás sean fracaso: significa que conviene conocer todos antes de elegir uno.

#### Las cinco rutas

| Ruta | Qué es | Duración referencial | Qué se obtiene | Conviene si… |
| --- | --- | --- | --- | --- |
| Universidad | Formación profesional en una universidad licenciada por la Sunedu | 5 años (10 ciclos); Medicina, 7 | Grado de bachiller y título profesional | Te interesa una profesión que exige ese grado, o investigación y estudios largos |
| Formación técnica | Carrera en un instituto o escuela de educación superior licenciada por el Minedu | 2 años (técnico) o 3 años (profesional técnico) | Título de técnico o profesional técnico, con el que luego puedes continuar en la universidad | Quieres entrar pronto al trabajo, tu campo es práctico, o necesitas una ruta más corta y barata |
| Fuerzas Armadas y Policía | Escuelas de oficiales y de suboficiales del Ejército, Marina, Fuerza Aérea y PNP | 5 años (oficiales) o 3 (suboficiales) | Grado y carrera militar o policial, con sueldo desde la formación | Te atraen el servicio, la disciplina y una carrera con escalafón; hay requisitos de edad y físicos |
| Trabajar directamente | Entrar al mercado laboral, con o sin una capacitación corta (CETPRO, cursos de meses) | Desde pocos meses | Experiencia, ingresos y, si eliges bien, un oficio | Necesitas ingresos ya o quieres probar un campo antes de invertir en estudios largos |
| Estudiar y trabajar | Combinar un empleo con estudios en horario nocturno, semipresencial o a distancia | La de la carrera, a veces más larga | Lo mismo que la ruta de estudio, más experiencia | No puedes dejar de generar ingresos, o quieres financiar tú mismo parte de la carrera |

#### Tres cosas que la gente no sabe de las rutas

1. **Se pueden encadenar.** La ley permite que un profesional técnico continúe estudios en la universidad convalidando parte de lo cursado. Instituto primero y universidad después es una ruta por etapas, no un desvío.
2. **Toda ocupación puede profesionalizarse.** Quien empieza trabajando puede, con cursos y formación, ir especializando lo que hace. El programa del MINEDU insiste en esto: la profesionalización no exige entrar a la universidad al día siguiente de terminar el colegio.
3. **Las rutas técnicas no son «la opción B».** Varias familias técnicas tienen ingresos promedio de egresados jóvenes por encima de muchas universitarias (ver la ficha de salarios).

#### Qué pista mira cada ruta

Para elegir una ruta hay que mirar cuatro cosas, y cada perfil las responde distinto:

- **La ocupación que buscas.** Algunas exigen grado universitario (médico, abogado, docente de colegio); otras se ejercen con título técnico (técnico de laboratorio, mecánico de mantenimiento, enfermero técnico) y otras con oficio y experiencia.
- **El tiempo que puedes invertir.** Cinco años no es lo mismo que dos, ni en dinero ni en vida.
- **El dinero disponible.** Universidades e institutos públicos son casi gratuitos; los privados varían mucho; las escuelas de FF. AA. y PNP pagan durante la formación.
- **Tu situación hoy.** Si tienes que aportar en casa, estudiar y trabajar o una ruta técnica corta pueden ser el camino para llegar después a la larga.

> No hay una ruta «de verdad» y otras de consuelo. Hay rutas que calzan con lo que quieres hacer y con lo que puedes hoy.

**Para tu viaje.** En el catálogo, cada carrera indica si es universitaria, técnica o de las FF. AA. y PNP, y su duración. En la tarjeta de plan elegirás el camino para llegar a ella: postular directo, prepararte primero, estudiar y trabajar, o empezar por una técnica.

**Fuentes:** MINEDU (2013), cartilla, parte 1 (profesión y ocupación) y actividad 8. Ley N.° 30220, Ley Universitaria. Ley N.° 30512, Ley de Institutos y Escuelas de Educación Superior. [La República (2026), acceso a educación superior según Inei y Minedu](https://larepublica.pe/opinion/2026/05/14/y-despues-de-la-secundaria-que-por-mision-educacion-hnews-266604). [Mi Carrera (MTPE)](https://micarrera.trabajo.gob.pe/).

### F12 · Cómo leer una ficha del catálogo

**Tema:** Mundo del trabajo · **Desbloquea:** 3.2 · **Descripción:** Qué significa cada dato del detalle de una carrera, una ocupación o una institución, y qué pregunta responde.

El catálogo tiene tres tipos de fichas y cada una responde una pregunta distinta: la carrera, qué estudiarías; la ocupación, qué harías; la institución, dónde. Saber leerlas evita marcar «me interesa» solo por el nombre.

#### La ficha de una carrera

| Dato | Qué significa | Qué pregunta responde |
| --- | --- | --- |
| Tipo, área y familia | Si es universitaria, técnica o de FF. AA. y PNP; el campo amplio y la familia de carreras parecidas | ¿Qué ruta es y con qué se parece? |
| Duración | Años referenciales de estudio | ¿Cuánto tiempo? |
| Sellos de interés (R, I, A, S, E, C) | Los tipos de interés con los que la carrera se relaciona | ¿Se parece a mi perfil? |
| De qué trata y dónde podrías trabajar | Lo que se estudia y los ámbitos laborales | ¿Qué haría después? |
| Cuánto ganan sus egresados | Promedio, mínimo y máximo en planilla formal, de la familia de carreras y el tipo de institución, no de esa carrera exacta; separado en jóvenes y adultos y por departamento | ¿Qué rango de ingreso es realista? |
| Ocupaciones a las que conduce | Trabajos concretos a los que suele llevar | ¿En qué se convierte? |
| Dónde estudiarla | Instituciones que la ofrecen, con el ingreso promedio de los egresados de esa familia en cada una | ¿Dónde y con qué resultado? |

#### La ficha de una ocupación

| Dato | Qué significa |
| --- | --- |
| Grupo y preparación | A qué grupo ocupacional pertenece y cuánta formación suele exigir (de 1 a 5) |
| Qué hacen y dónde trabajan | Las tareas del día a día y los lugares típicos |
| Perfil de intereses | Sus seis puntajes RIASEC, medidos en personas que la ejercen; si ya tienes tu resultado, ves tu perfil al lado |
| A qué tipo de persona le suele atraer | Una descripción del estilo de trabajo que pide |
| Conocimientos y habilidades | Lo que hay que saber y saber hacer |
| Carreras que llevan aquí | Las carreras del catálogo que suelen conducir a esa ocupación |

#### La ficha de una institución

| Dato | Qué significa |
| --- | --- |
| Tipo, gestión y ubicación | Universidad, instituto o escuela; pública o privada; departamento, distrito y sedes |
| Licenciamiento | Si tiene autorización para funcionar (ver la ficha de licenciamiento) |
| Carreras que ofrece | Con el ingreso promedio de los egresados de cada familia en esa institución |
| Página web | Donde están los costos y el proceso de admisión, que el catálogo no tiene |

#### Cómo usarla sin engañarte

1. Lee primero «qué hacen», no el nombre. Muchas carreras suenan a una cosa y son otra.
2. Compara el rango, no solo el promedio. Un promedio de S/ 3 000 con un mínimo de S/ 1 200 dice que la mitad gana menos de eso al empezar.
3. Si el sello de interés no coincide con tu perfil, no descartes: pregúntate qué te atrajo y busca una ocupación afín que sí coincida.
4. Marca «me interesa» cuando leíste la ficha completa, no antes. Los favoritos son la base de tus planes.
5. Busca al menos una opción fuera de tu tipo de interés principal. El contraste enseña más que la coincidencia.

> La ficha dice qué es una carrera. Si te conviene, lo dices tú después de leerla entera.

**Para tu viaje.** Los favoritos que marques en el catálogo son los únicos con los que puedes crear un plan. Más adelante se te pedirá al menos tres, uno fuera de tu tipo principal.

**Fuentes:** Catálogo de la plataforma, construido con Ponte en Carrera (MTPE), el clasificador CINE-Perú y las ocupaciones de [Mi Próximo Paso (O\*NET)](https://www.miproximopaso.org).

### F13 · Salarios, demanda e informalidad

**Tema:** Mundo del trabajo · **Desbloquea:** 3.3 · **La usan:** batallas 3.5 y MA7 · **Descripción:** Cómo leer un salario, qué familias de carreras pagan más al inicio, qué es la demanda y qué cambia la informalidad.

Los números del mercado laboral sirven si sabes de quién son y de qué año. Mal leídos, un promedio puede hacerte elegir una carrera por un sueldo que solo gana una minoría.

#### Cómo leer un salario

- **Promedio, mínimo y máximo.** El promedio es el centro; el mínimo y el máximo muestran el rango. En casi todas las familias, el ingreso de quien empieza está mucho más cerca del mínimo.
- **Jóvenes y adultos.** «Jóvenes» son egresados recientes; «adultos», personas con experiencia. La diferencia entre los dos es el crecimiento típico de la carrera: en Geología, de S/ 4 200 a S/ 10 800; en Obstetricia, de S/ 4 500 a S/ 5 300.
- **Por familia, no por carrera.** Los datos son de la familia de carreras y el tipo de institución, no de una carrera exacta ni de una institución (salvo donde el catálogo lo indique).
- **Por departamento.** Lima no es el Perú. Una misma familia puede pagar distinto en Arequipa o en Loreto; el catálogo lo muestra por lugar.
- **Solo empleo formal.** Son ingresos de trabajadores en planilla. Los de quien trabaja sin contrato no están.

#### Qué familias pagan más al inicio

Ingreso promedio mensual de egresados jóvenes en planilla, a nivel nacional, con los mismos datos del catálogo (Ponte en Carrera, MTPE):

| Universitarias | S/ | Técnicas | S/ |
| --- | --- | --- | --- |
| Medicina | 7 030 | Minería, metalurgia y petróleo | 6 804 |
| Odontología | 4 732 | Ingeniería eléctrica | 3 757 |
| Obstetricia | 4 480 | Hidrografía | 3 641 |
| Ingeniería de sistemas y cómputo | 4 320 | Suboficiales de las Fuerzas Armadas | 3 561 |
| Ingeniería de telecomunicaciones | 4 227 | Ingeniería industrial | 3 551 |

La mitad de las familias universitarias está por debajo de S/ 3 030, y la mitad de las técnicas, por debajo de S/ 2 630. Es decir: el top es excepción, no promedio. Y Medicina paga más, pero dura siete años y exige una preparación de ingreso larga: el dato de salario no dice nada del costo de llegar.

#### Qué es la demanda y cómo leerla

La demanda es cuántos puestos busca el mercado frente a cuántas personas egresan de esa carrera. El catálogo de la plataforma no la incluye; la plataforma Mi Carrera del MTPE muestra las carreras «más solicitadas» por grupos. Al leerla:

1. Una demanda alta con muchísimos egresados significa competencia, no empleo asegurado (Contabilidad y Administración son los ejemplos clásicos).
2. La demanda de hoy no es la de dentro de cinco años, cuando egreses. Mira la tendencia, no la foto.
3. La demanda es por región: una carrera saturada en Lima puede faltar en una región.
4. Demanda no es salario. Hay ocupaciones muy demandadas y mal pagadas.

#### La informalidad cambia todo

En el Perú, el 75,7 % de los trabajadores era informal en 2022 (MTPE) y, entre los menores de 25 años, más del 85 % (Inei). Trabajar informal significa sin contrato, sin seguro de salud, sin aporte para pensión y sin vacaciones pagadas. Para tu decisión implica dos cosas: los salarios que ves son los de la minoría formal, y un título que te abre la puerta al empleo formal vale más que la diferencia de sueldo que muestre.

Además, cerca de siete de cada diez personas con estudios superiores no trabajan en lo que estudiaron (MTPE, 2022). Parte de eso es inadecuación: elegir sin saber dónde hay trabajo.

> Un salario promedio es un dato de otras personas. Lo que te toque dependerá de dónde, cómo y cuánto te preparas.

**Para tu viaje.** En el detalle de cada carrera ves los ingresos de su familia por lugar y, por institución, el promedio de sus egresados. Usa el rango de jóvenes para pensar tu primer año y el de adultos para pensar a diez años.

**Fuentes:** Catálogo de la plataforma, con datos de Ponte en Carrera (MTPE), consultados en 2026. [Mi Carrera (MTPE)](https://micarrera.trabajo.gob.pe/). [INEI, informe técnico de mercado laboral, citado por ProActivo (2024)](https://proactivo.com.pe/el-85-de-jovenes-menores-de-25-anos-trabajan-en-la-informalidad/). [Andina (2025), inadecuación ocupacional](https://andina.pe/agencia/noticia-jovenes-estan-escogiendo-mejor-sus-carreras-que-favorecera-adecuacion-ocupacional-1032314.aspx).

### F14 · Licenciamiento y acreditación

**Tema:** Estudiar · **Desbloquea:** 3.6 · **La usa:** batalla 3.7 · **Descripción:** Qué es el licenciamiento, quién lo da, qué es la acreditación y cómo verificar una institución antes de postular.

Una institución puede tener local, publicidad y alumnos, y aun así no tener autorización para funcionar. Verificarlo toma cinco minutos y evita un título sin valor.

#### Dos palabras que no son lo mismo

|  | Licenciamiento | Acreditación |
| --- | --- | --- |
| Qué es | Autorización para funcionar, por cumplir condiciones básicas de calidad (infraestructura, docentes, planes de estudio, servicios) | Reconocimiento de que un programa de estudios alcanza estándares de calidad superiores a lo básico |
| A qué se aplica | A la institución completa y a sus locales | A cada programa de estudios (una carrera en una institución) |
| Es obligatorio | Sí: sin licencia, la institución no puede dar títulos válidos | No: es voluntaria |
| Quién lo otorga | Universidades: Sunedu (Ley N.° 30220). Institutos y escuelas: Minedu (Ley N.° 30512) | Sineace (Ley N.° 28740) |
| Cómo usarlo | Es el filtro mínimo: si no está licenciada, descártala | Es un plus: pocos programas lo tienen, y que un programa no esté acreditado no lo invalida |

#### Qué pasó con el licenciamiento universitario

Al cerrarse el primer proceso, en 2020, la Sunedu había licenciado 94 universidades (46 públicas y 48 privadas) y denegado la licencia a 46, casi todas privadas. Los estudiantes de las denegadas tuvieron que trasladarse a universidades licenciadas. La lista sigue cambiando (hay licencias nuevas y cierres), por eso no se memoriza: se consulta.

Para institutos y escuelas de educación superior, el Minedu publica la relación de licenciados, 246 al momento de su última lista, más las escuelas pedagógicas licenciadas.

#### Cómo verificar en cinco minutos

1. Universidad: busca «consultar si una universidad está licenciada» en gob.pe (servicio de la Sunedu) y revisa también sus locales o filiales: una universidad puede estar licenciada en Lima y no en una sede.
2. Instituto o escuela: busca la lista de institutos licenciados por el Minedu y la de escuelas pedagógicas.
3. Programa: si te dicen que la carrera está «acreditada», confirma en el portal del Sineace con qué entidad y hasta cuándo.
4. Desconfía de las etiquetas vagas: «en proceso de licenciamiento», «acreditación internacional» sin nombrar quién, «reconocida por el Estado» sin resolución.

#### Lo que una licencia no dice

Que una institución esté licenciada significa que cumple lo mínimo, no que sea buena en tu carrera. Para eso miras otras cosas: el plan de estudios, los docentes, las prácticas, el ingreso de sus egresados en el catálogo y lo que te cuenten egresados reales.

> Licenciada es la condición para empezar a comparar, no el resultado de la comparación.

**Para tu viaje.** La ficha de cada institución en el catálogo indica si está licenciada. Antes de ponerla en un plan, confírmalo en la fuente oficial: las listas cambian.

**Fuentes:** Ley N.° 30220, Ley Universitaria. Ley N.° 30512, Ley de Institutos y Escuelas de Educación Superior. [Sunedu, consulta de universidades licenciadas](https://www.gob.pe/institucion/sunedu/tramites-y-servicios). [Minedu, lista de institutos licenciados](https://www.gob.pe/institucion/minedu/informes-publicaciones/4718331-lista-de-246-institutos-de-educacion-superior-licenciadas-por-minedu). [Sineace](https://www.gob.pe/institucion/sineace). [Andina (2020), balance del licenciamiento](https://andina.pe/ingles/noticia-sunedu-94-universidades-licenciadas-garantizan-ensenanza-para-1-millon-universitarios-804647.aspx).

### F15 · Cómo se ingresa

**Tema:** Estudiar · **Desbloquea:** 3.6 · **La usa:** batalla 3.7 · **Descripción:** Las modalidades de admisión en universidades, institutos y escuelas de las FF. AA. y PNP, y cómo prepararte sin sorpresas.

Cada institución decide cómo se entra, con qué examen y en qué fechas. Lo que sí es común a todas: nadie ingresa por casualidad, y postular más de una vez es normal.

#### Universidades

La Ley Universitaria establece que el ingreso es por concurso público de admisión, y permite que cada universidad fije en su reglamento modalidades de exoneración. Las más frecuentes:

| Modalidad | Para quién | Qué evalúa |
| --- | --- | --- |
| Examen ordinario | Todos los egresados de secundaria | Una prueba de conocimientos y aptitudes, con un puntaje mínimo y un orden de mérito por carrera |
| Centro preuniversitario (CEPRE) | Quien se prepara en el centro de la propia universidad | El rendimiento en el ciclo de preparación; a veces da ingreso directo |
| Primeros puestos | Quienes terminaron entre los primeros de su promoción | El certificado del colegio, a veces con una evaluación adicional |
| Deportistas calificados | Deportistas reconocidos por el IPD | Documentación y rendimiento deportivo |
| Personas con discapacidad | La ley reserva el 5 % de las vacantes | Una evaluación adaptada |
| Traslado externo o titulados | Quien ya estudió en otra institución o ya tiene un título | Convalidación de lo cursado |

Las universidades públicas suelen tener un examen muy competitivo, con pocas vacantes por carrera, una o dos veces al año. Las privadas suelen abrir varias convocatorias, con evaluaciones distintas (prueba, entrevista, promedio del colegio) y, en general, menos competencia pero con pensión.

#### Institutos y escuelas de educación superior

La Ley N.° 30512 deja a cada instituto definir su admisión: la mayoría toma un examen o una evaluación por semestre, exonera a primeros puestos y admite por convenios con colegios o empresas. Las vacantes suelen alcanzar más que en las universidades públicas, y el calendario tiene dos entradas al año.

#### Fuerzas Armadas y Policía

Las escuelas de oficiales y de suboficiales convocan concursos anuales con varias etapas: examen de conocimientos, evaluación física, psicológica y médica, y revisión de documentos. Tienen requisitos de edad (en general entre 16 y 21 o 22 años), de estatura y de salud que conviene revisar antes de prepararse. Durante la formación se recibe una asignación mensual.

#### Prepararte sin sorpresas

1. Averigua en la página oficial de la institución el calendario, las modalidades y el costo de inscripción. Un anuncio no reemplaza el prospecto de admisión.
2. Calcula el tiempo de preparación: una academia o un CEPRE toma entre tres meses y un año, y tiene un costo que entra en tu presupuesto.
3. Prevé más de un intento. Las universidades públicas más demandadas admiten a una fracción pequeña de postulantes; no ingresar a la primera es frecuente, no un veredicto.
4. Ten un plan B con otra modalidad o institución en la que sí ingreses mientras vuelves a postular.

#### Señales de alerta en la publicidad

- «Ingreso directo garantizado» sin decir con qué evaluación.
- «Sin examen» en una universidad pública: no existe.
- Costos de inscripción que no aparecen en la página oficial.
- Promesas de empleo o de «convenios» con empresas sin nombrarlas.

> Postular es un proceso con reglas publicadas. Si no encuentras las reglas, no confíes en la promesa.

**Para tu viaje.** En la tarjeta de plan elegirás cómo llegar a tu carrera: postular directo, prepararte primero, estudiar y trabajar o empezar por una técnica. Esta ficha te dice qué implica cada una.

**Fuentes:** Ley N.° 30220, Ley Universitaria, artículo 98. Ley N.° 30512, Ley de Institutos y Escuelas de Educación Superior. Las modalidades concretas y el calendario los define cada institución en su reglamento de admisión.

### F16 · Cuánto cuesta y cómo pagarlo

**Tema:** Dinero · **Desbloquea:** 3.8 · **La usan:** batallas 3.9 y MA9 · **Descripción:** Todos los costos de estudiar, el costo de oportunidad, y las opciones de financiamiento: públicas, becas, crédito y trabajar.

La pensión es solo uno de los costos de estudiar, y a veces no es el mayor. Un presupuesto que solo mira la pensión se queda corto en el segundo mes.

#### Todo lo que cuesta

| Rubro | Frecuencia | Qué incluye |
| --- | --- | --- |
| Preparación | Una vez | Academia, CEPRE, materiales de repaso |
| Inscripción y admisión | Una vez | Derecho de postulación, carpeta, exámenes médicos |
| Matrícula | Por ciclo | En públicas, un derecho administrativo bajo; en privadas, una cuota por ciclo |
| Pensión | Mensual | Cero en instituciones públicas; en privadas, por escala según el colegio de procedencia o la condición económica |
| Materiales | Por ciclo | Libros, fotocopias, software, uniforme o instrumental según la carrera |
| Transporte | Mensual | Pasajes de ida y vuelta, todos los días de clase |
| Alimentación | Mensual | Lo que comas fuera de casa |
| Vivienda | Mensual | Solo si estudias en otra ciudad: alquiler, servicios |

Un ejemplo con montos de referencia: una carrera privada de cinco años con pensión de S/ 1 800, matrícula de S/ 600 por ciclo, materiales de S/ 300 por ciclo y transporte de S/ 150 al mes cuesta cerca de S/ 21 600 el primer año y más de S/ 100 000 en total. La misma carrera en una pública cuesta, en el primer año, lo que sumen materiales, transporte y trámites: unos S/ 3 000 a S/ 5 000. La diferencia es de un orden de magnitud, no de porcentaje.

#### El costo de oportunidad

Es lo que dejas de ganar por estudiar. Cinco años de universidad a tiempo completo son cinco años sin un sueldo que, en un trabajo sin estudios superiores, podría ser de S/ 1 000 a S/ 1 300 al mes. No es un argumento contra estudiar: la mayoría de las carreras recupera esa diferencia con creces. Es un argumento para elegir con cuidado y terminar.

#### Cómo pagarlo

| Opción | Qué es | Qué debes saber |
| --- | --- | --- |
| Instituciones públicas | Universidades e institutos del Estado, sin pensión | La competencia para ingresar es alta; se pagan trámites y materiales |
| Beca 18 (Pronabec) | Beca integral del Estado: para 2026, 20 000 becas en diez modalidades | Requisitos: rendimiento en los dos últimos años de secundaria y, en la modalidad ordinaria, condición de pobreza según el Sisfoh y menos de 22 años; postulación gratuita y virtual, en setiembre |
| Otras becas de Pronabec | Beca Permanencia (para quienes ya estudian en una pública), Beca Continuidad y becas para técnicos | Cada una tiene convocatoria y requisitos propios |
| Becas de las instituciones | Descuentos y becas por rendimiento, deporte o condición económica | Se piden en la propia institución; muchas se pierden si bajas el promedio |
| Crédito educativo | Un préstamo (Pronabec o bancos) que se paga después de egresar | Es deuda: calcula la cuota contra el ingreso de egresados jóvenes de tu familia de carreras antes de firmar |
| Estudiar y trabajar | Un empleo a medio tiempo o la carrera en horario nocturno o a distancia | Alarga la carrera, pero evita deuda y da experiencia |

#### Tres errores frecuentes

1. Mirar solo la pensión y descubrir el transporte, los materiales y la alimentación en el segundo mes.
2. Planear solo el primer año. Una carrera de cinco años son diez ciclos de pensión y matrícula.
3. Tomar un crédito sin saber cuánto se gana en esa carrera al inicio. La cuota se paga con ese ingreso, no con el promedio de los adultos.

> Antes de decidir dónde, calcula cuánto cuesta todo el camino y de dónde saldría cada sol.

**Para tu viaje.** La tarjeta de plan tiene un presupuesto con estos rubros y calcula el total del primer año y de toda la carrera. Los costos exactos están en la página web de cada institución, no en el catálogo.

**Fuentes:** MINEDU (2013), cartilla, parte 1 (inversión económica). Lamoreaux, *Más allá de la matrícula: comprender los gastos universitarios*, LibreTexts. [Pronabec, Beca 18 convocatoria 2026](https://www.gob.pe/institucion/pronabec/campa%C3%B1as/117075-beca-18-convocatoria-2026). [Andina (2025), requisitos de Beca 18-2026](https://andina.pe/agencia/noticia-beca-182026-aqui-los-requisitos-para-postular-y-estudiar-gratis-una-carrera-1041992.aspx). [Mi Carrera (MTPE), becas y créditos](https://micarrera.trabajo.gob.pe/).

### F17 · Caminos que no van en línea recta

**Tema:** Mundo del trabajo · **Desbloquea:** 3.10 · **Descripción:** Por qué las trayectorias reales cambian de rumbo, qué cuesta cambiar y cómo escuchar un testimonio sin copiarlo.

En las historias de éxito que circulan, la persona sabía desde niña lo que quería y nunca dudó. En las trayectorias reales, casi todas tienen un giro.

#### Dos giros, dos razones

- Alejandra entró a Contabilidad porque le dijeron que había trabajo. Se dio cuenta en el primer ciclo de que no era lo suyo. Su giro corrige una decisión tomada con poca información.
- Gastón Acurio estudió Derecho para cumplir con lo que su familia esperaba, mientras leía libros de cocina. Su giro recupera una vocación que había escondido.

Las dos historias terminan en un cambio, pero el costo fue distinto: Alejandra perdió un ciclo; Acurio, varios años. Cuanto antes se mira con honestidad, menos cuesta corregir.

#### Cambiar es común

Siete de cada diez peruanos con estudios superiores trabajan en algo distinto a lo que estudiaron (MTPE, 2022). Parte de ellos cambió de rumbo a propósito; otra parte no encontró trabajo en su campo. Los giros más frecuentes:

| Giro | Cómo se ve | Qué cuesta |
| --- | --- | --- |
| Cambio de carrera | Traslado interno o externo, con convalidación de cursos comunes | Entre uno y cuatro ciclos, según cuánto se convalide |
| Ruta por etapas | Instituto primero, universidad después | Tiempo total mayor, pero con título y trabajo en el camino |
| Postular varias veces | Un año de preparación más, a veces dos | Tiempo y dinero de preparación; muchos trabajan mientras tanto |
| Estudiar y trabajar | Una carrera más larga en horario nocturno o a distancia | Menos tiempo libre; más experiencia al egresar |
| Emprender | Un negocio, con o sin estudios previos | Ingresos inestables al inicio; en el Perú siete de cada diez emprendedores empiezan por falta de empleo |

Ninguno es gratis. Por eso el objetivo no es evitar todo giro, sino tomarlo informado y a tiempo.

#### Cómo escuchar un testimonio

Un testimonio es una sola voz. Vale mucho y prueba poco. Al escucharlo:

1. Separa qué decidió la persona de qué le pasó. La suerte y el contexto también estaban ahí.
2. Pregúntate si su situación se parece a la tuya: ciudad, recursos, año en que decidió.
3. Fíjate en el momento del giro: qué señal vio, cuánto tardó en actuar y qué le costó.
4. Quédate con el aprendizaje, no con la carrera. Que a alguien le fue bien en un campo no dice nada sobre ti en ese campo.

#### Lo que tienen en común quienes cambiaron bien

- Reconocieron pronto que algo no encajaba, en lugar de aguantar por no decepcionar.
- Averiguaron antes de saltar: hablaron con gente del nuevo campo, vieron costos y convalidaciones.
- Conservaron lo que sí servía: habilidades, contactos, cursos aprobados.

> Un giro a tiempo no es un fracaso. Es la misma decisión, con mejor información.

**Para tu viaje.** En la mochila encontrarás testimonios de personas con rutas distintas, que se abren al resolver los casos de la ciudad. Escúchalos con estas cuatro preguntas.

**Fuentes:** MINEDU (2013), cartilla, actividad 2 (caso de Alejandra), actividad 10 (testimonios) y Anexo 12.2 (El sueño del chef). [Andina (2025), inadecuación ocupacional según el MTPE](https://andina.pe/agencia/noticia-jovenes-estan-escogiendo-mejor-sus-carreras-que-favorecera-adecuacion-ocupacional-1032314.aspx). [Andina (2026), reporte GEM Perú 2025/2026](https://andina.pe/agencia/noticia-financiamiento-y-politicas-publicas-siguen-siendo-las-mayores-barreras-para-emprender-1080299.aspx).

### F18 · Cómo entrevistar a un profesional

**Tema:** Mundo del trabajo · **Desbloquea:** misión del investigador · **Descripción:** A quién buscar, cómo pedir una entrevista de veinte minutos, qué preguntar y qué hacer con lo que escuches.

Nada reemplaza hablar con alguien que hace el trabajo que te interesa. Una conversación de veinte minutos puede confirmar o desarmar una idea que tenías hace años.

#### A quién buscar

- Familia extendida, vecinos y padres de amigos: pregunta en casa «¿conocemos a alguien que trabaje en…?». Es la red más rápida.
- Docentes del colegio: muchos conocen egresados o colegas de otros campos.
- Egresados del colegio y estudiantes de la carrera: saben cómo es empezar.
- Instituciones: colegios profesionales, universidades e institutos suelen tener contactos de egresados.
- Redes profesionales: un mensaje breve y respetuoso a alguien que publica sobre su trabajo funciona más de lo que crees.

Busca a dos personas si puedes: una que lleve pocos años y una con experiencia. Verás dos etapas de la misma ocupación.

#### Cómo pedirla

Un mensaje de cuatro líneas: quién eres, por qué te interesa su ocupación, qué pides (20 a 30 minutos, presencial o por videollamada) y cuándo podrías. Deja claro que no pides trabajo ni prácticas: pides información. Agradece aunque te digan que no.

#### Qué preguntar

Antes de la entrevista, escribe qué crees que hace esa persona en un día y qué se necesita para ejercer. Después compararás. Las cinco preguntas base del programa del MINEDU, más dos tuyas:

| Tema | Pregunta base | Una repregunta útil |
| --- | --- | --- |
| Formación | ¿Qué estudió y qué le sirvió de verdad? | ¿Qué habría estudiado distinto? |
| Características personales | ¿Cómo hay que ser para que este trabajo te guste? | ¿A quién no se lo recomendaría? |
| Día a día | ¿Cómo es un día normal? | ¿Qué parte es rutinaria y cuál no? |
| Ingresos | ¿Cómo evoluciona el ingreso desde el inicio? | ¿De qué depende que suba? |
| Futuro de la ocupación | ¿Cómo cambió en diez años y hacia dónde va? | ¿Qué nuevas tareas aparecieron? |

Tus dos preguntas propias salen de lo que escribiste antes: lo que no entiendes o lo que te da miedo de esa ocupación.

#### Durante y después

1. Escucha más de lo que hablas; pide ejemplos concretos («¿cómo fue la última vez que…?»).
2. No la conviertas en interrogatorio: si una respuesta abre un tema interesante, síguelo.
3. Si grabas, pide permiso antes y di para qué.
4. Agradece al terminar y de nuevo por escrito.
5. Contrasta. Una entrevista es una voz. Compara lo que escuchaste con el catálogo, con otra entrevista o con lo que dicen egresados. Las redes sociales muestran la parte vistosa de algunas ocupaciones; una entrevista muestra la rutina.

> La mejor pregunta es la que nace de lo que ya pensabas: compara lo que creías con lo que te cuentan.

**Para tu viaje.** En Investigaciones escribes lo que piensas hoy, armas tu guion con las preguntas base y las tuyas, publicas la entrevista en video y cierras con lo que cambió. Puedes hacerla con compañeros que investigan la misma ocupación.

**Fuentes:** MINEDU (2013), cartilla, actividad 8 y actividad 15 (ficha de registro de la visita y entrevista). [CareerOneStop, Entrevista informativa (U.S. Department of Labor)](https://cloudfront.careeronestop.org/TridionMultimedia/tcm24-47717_PDF_infointerviewSP.pdf).

## 5. Fichas del estudiante · Bloques 4 y 5 y ciudad

### F19 · Cruzar tu perfil con tus opciones

**Tema:** Decidir · **Desbloquea:** 4.1 · **La usa:** batalla 4.4 · **Descripción:** Cómo comparar lo que eres con lo que una opción exige, sin tomar un resultado como sentencia.

Ya tienes tu historia, tus valores, lo que se te da bien y tres resultados de cuestionarios. Ahora toca ponerlos frente a tus opciones. El cruce no da una respuesta: da coincidencias y vacíos, y los dos sirven.

#### El cuadro de la cartilla

El programa del MINEDU usa un cuadro con una fila por aspecto del perfil y dos columnas: opciones de mayor afinidad y de menor afinidad.

| Aspecto del perfil | De dónde sale | Qué buscar en una opción |
| --- | --- | --- |
| Intereses | Tu historia y tu código de intereses | ¿Las tareas del día a día se parecen a lo que te atrae? |
| Habilidades sociales | Tu resultado y la habilidad que elegiste trabajar | ¿Cuánto contacto, liderazgo o negociación exige? |
| Inteligencias | Tus inteligencias más desarrolladas | ¿Qué tipo de problemas resuelve esa ocupación? |
| Lo que se te da bien | Tus cursos y actividades fuertes | ¿Qué cursos pesan en la carrera? |
| Rasgos | Cómo te describes en distintos contextos | ¿Qué ambiente de trabajo tendría? |

Para cada fila, una opción de mayor afinidad y una de menor, con una razón corta. La razón es lo importante: «me gusta» no es una razón; «pasaría el día analizando datos, y eso es lo que más disfruto» sí.

#### Tres reglas para cruzar sin engañarte

1. **Coincidencia en dos aspectos, no en uno.** Una opción que calza solo con tu código de intereses pero choca con lo que se te da bien y con tus valores no es afín: es atractiva.
2. **La menor afinidad también enseña.** Justificar por qué una opción no te calza aclara qué sí buscas. A veces descubre que la descartaste por un prejuicio.
3. **Anota lo que el perfil no resuelve.** Costos, distancia, oferta en tu ciudad, lo que piensa tu familia: nada de eso sale del cruce, y todo pesa. Ese vacío es la agenda de lo que sigue.

#### Lo que un resultado no decide

- Un perfil que no coincide con tu opción favorita no la prohíbe. Dice que tendrás que esforzarte en algo o que te gusta por razones que el cuestionario no mide.
- Un perfil que coincide perfectamente tampoco garantiza nada. Dice que el ambiente te sería cómodo; el resto (ingresar, pagar, terminar) sigue en pie.

> El cruce no elige por ti. Muestra dónde hay coincidencia, dónde hay fricción y qué te falta averiguar.

**Para tu viaje.** En el registro «Mi perfil y mis carreras afines» cada fila llega precargada con tu resultado y con lo que escribiste antes; tú pones las opciones y la razón. Lo que anotes como «lo que mi perfil no resuelve» se cita al comparar tus planes.

**Fuentes:** MINEDU (2013), cartilla, actividad 14, cuadro «Mi perfil personal y carreras afines».

### F20 · Criterios para decidir

**Tema:** Decidir · **Desbloquea:** 4.4 · **La usa:** batalla 4.4 · **Descripción:** Qué es un criterio, cuáles son los más usados, cuáles fallan solos y cómo ordenarlos para comparar planes.

Decidir sin criterios es elegir por impulso y justificarlo después. Un criterio es una regla que fijas antes de mirar las opciones, para que todas se midan igual.

#### Criterios que la gente usa

| Criterio | Pregunta que plantea | Dónde está el dato |
| --- | --- | --- |
| Interés | ¿Me atrae lo que haría cada día? | Tu historia, tu código, la ficha de la ocupación |
| Capacidad | ¿Puedo con lo que exige estudiarla e ingresar? | Lo que se te da bien, los cursos de la carrera, la admisión |
| Valores | ¿Me permite vivir como quiero: estabilidad, ayudar, crear, tiempo para la familia? | Tu registro de valores |
| Ingresos | ¿Qué rango es realista al inicio y a diez años? | El catálogo, por familia y lugar |
| Empleo | ¿Hay trabajo, formal, en mi ciudad o en la que iría? | Mi Carrera, informalidad por sector |
| Costo | ¿Puedo pagar todo el camino, con qué financiamiento? | La ficha de costos, la web de la institución |
| Tiempo | ¿Cuántos años y en qué horario? | La duración de la carrera |
| Cercanía | ¿Existe en mi región o tendría que mudarme? | El catálogo de instituciones |
| Apoyo | ¿Cuento con mi familia para esta opción? | Las conversaciones en casa |

No hay que usar todos. Hay que elegir los que pesan para ti y ponerlos en orden, porque dos opciones rara vez ganan en todos.

#### Criterios que fallan solos

- **Prestigio.** «Es una carrera respetada» no dice nada sobre si te gustará ni si tendrás trabajo.
- **Dinero sin más.** El salario promedio es de otras personas, en planilla, con años de experiencia. Como único criterio lleva a carreras que se abandonan.
- **Los amigos.** Es el criterio de Alejandra. Tus amigos van a estar en otros lugares dentro de tres años.
- **La presión.** Elegir para calmar a la familia resuelve hoy y cuesta después. La presión se conversa; no se obedece ni se ignora.

Cualquiera de estos puede acompañar a otros criterios. Lo que falla es que sea el único o el primero.

#### Motivación intrínseca y extrínseca, otra vez

Una forma rápida de revisar tu orden: ¿los dos primeros criterios hablan de la actividad en sí (interés, capacidad, valores) o solo de lo que viene después (dinero, prestigio, aprobación)? Las decisiones que se sostienen tienen al menos un criterio intrínseco arriba. Los extrínsecos importan, pero sostienen poco cuando la carrera se pone difícil.

#### Desde dónde decides

Vuelve a lo que marcaste al inicio del camino: quién eligió tu opción, si podrías sostener una decisión distinta a la de tu familia, si pesa más lo que harías que el prestigio o el dinero, si la economía te obliga a descartar. Si algo cambió, tus criterios deben reflejarlo.

> Un buen criterio se puede aplicar a todas tus opciones por igual. Si solo sirve para justificar una, no es un criterio: es una excusa.

**Para tu viaje.** En «Mis criterios para decidir» ordenas los tuyos; luego, en la mesa de planes, cada plan se marca contra cada criterio. En la batalla «Decidir con criterio» verás casos de compañeros que eligen por prestigio, dinero, amigos o presión: toca reconocer el criterio débil y la información que les faltó.

**Fuentes:** MINEDU (2013), cartilla, actividad 17 (razones de la elección) y Anexo 1.2 (cuestionario de autopercepción). Cano Celestino (2008), *Motivación y elección de carrera*.

### F21 · Después de decidir

**Tema:** Decidir · **Desbloquea:** 5.1 · **Descripción:** Por qué una decisión vocacional es provisional, qué viene en los meses siguientes y qué hacer si no ingresas.

Decidir no cierra el proceso: lo cambia de etapa. Lo que viene son meses de preparación, admisión y ajustes, y conviene saber desde ahora cómo se ven.

#### Decidir sin cerrar puertas

El programa del MINEDU lo dice al cerrar: este es un momento importante, pero el proceso de explorar la vocación no termina aquí. Una decisión vocacional es provisional y revisable por tres razones:

- Vas a saber más de la carrera cuando la estudies que ahora.
- El mercado y la oferta cambian en los años que dura una carrera.
- Tú cambias. Lo que valoras a los 17 se amplía a los 22.

Tener un plan B no es falta de compromiso con el plan A. Es la diferencia entre poder corregir y quedarte sin opciones.

#### Lo que suele pasar en los meses siguientes

| Mes | Qué pasa | Qué conviene |
| --- | --- | --- |
| Ahora | Terminar el colegio con el mejor promedio posible | Algunas modalidades de admisión y Beca 18 lo miran |
| Verano | Preparación: academia, CEPRE o estudio por tu cuenta | Averiguar temario y calendario en la página oficial |
| Marzo a abril | Primeros exámenes de admisión y convocatorias de becas | Tener los documentos listos y un plan B |
| Agosto | Segunda vuelta de admisión en muchas instituciones | Si no ingresaste, volver a postular con lo aprendido |
| Todo el año | Mantener la opción en revisión | Hablar con gente de la carrera, revisar el presupuesto |

#### Y si no ingreso

No ingresar a la primera es lo más común en las universidades públicas más demandadas, y le pasa a mucha gente que luego termina la carrera. Lo que marca la diferencia es qué haces con ese año:

1. **Postular de nuevo**, con una preparación más larga. La mayoría de postulantes a públicas lo hace.
2. **Entrar por otra modalidad o a otra institución** donde sí ingresas, y evaluar luego un traslado.
3. **Empezar por la ruta técnica** y continuar en la universidad convalidando.
4. **Un año de transición con sentido**: trabajar, estudiar un idioma o un curso técnico corto, hacer la entrevista a un profesional que no hiciste. Lo que no sirve es un año sin estructura.

Si no ingresas dos veces a la misma institución, revisa el plan, no tu valor: a veces es la preparación, a veces la modalidad, a veces la institución.

#### Tres pasos con fecha

Un proyecto sin pasos es un deseo. Elige tres acciones concretas con plazo: una para informarte más (hablar con alguien de la carrera, visitar la institución), una para prepararte (inscribirte en una academia, revisar un temario) y una para conversar en casa (mostrar el presupuesto, pedir una opinión).

> Elegir es el primer paso de un camino, no el último. Lo que hagas en los próximos seis meses pesa más que la elección misma.

**Para tu viaje.** En «Mi proyecto vocacional» registras tu opción, tus razones, las dificultades con su estrategia y tres pasos con plazo. Tu informe de viaje lo reúne todo para la conversación con tu orientadora.

**Fuentes:** MINEDU (2013), cartilla, estación 5 y actividad 17. [Pronabec, Beca 18](https://www.gob.pe/institucion/pronabec/campa%C3%B1as/117075-beca-18-convocatoria-2026). Ley N.° 30220 y Ley N.° 30512 (traslados y convalidación).

### F22 · Cómo aprovechar una feria

**Tema:** Estudiar · **Desbloquea:** la feria vocacional (ciudad) · **Descripción:** Qué llevar a una feria o a la web de una institución, qué preguntar y cómo separar un dato de una promesa.

Una feria vocacional junta en un patio a decenas de instituciones que quieren que estudies con ellas. Es útil si vas con preguntas; si vas a recoger folletos, sales con una bolsa de publicidad.

#### Antes de ir

1. Revisa tus favoritos y anota qué instituciones los ofrecen. Esas son tus paradas; el resto es paseo.
2. Verifica si están licenciadas antes de ir, para no gastar tiempo en un stand que no deberías considerar.
3. Lleva tres preguntas escritas, al menos una sobre licenciamiento, costos o empleabilidad.

#### Las preguntas que valen

| Pregunta | Lo que revela |
| --- | --- |
| ¿Está licenciada la institución y esta sede? | Si la respuesta es vaga, es la primera señal |
| ¿Cuánto cuesta el ciclo completo: matrícula, pensión y otros pagos? | Las ferias dicen la pensión «desde»; pide el total |
| ¿Qué escalas de pensión o becas hay y con qué requisitos? | Si la beca exige un promedio, pregunta cuántos la mantienen |
| ¿Dónde hacen prácticas los estudiantes de esta carrera? | Nombres concretos de empresas o instituciones, no «convenios» |
| ¿Qué porcentaje de egresados trabaja en su campo y cuánto gana? | Si tienen el dato, te lo dirán; si no, lo buscas en el catálogo |
| ¿Cómo es el proceso de admisión y cuándo? | Modalidad, costo de inscripción y fechas |

#### Dato o promesa

Un dato se puede verificar en una fuente que no es la institución: la Sunedu, el Minedu, el catálogo, un egresado. Una promesa no.

- Dato: «Estamos licenciados por resolución N.° …», «la pensión es S/ 900 al mes en la escala 2», «las prácticas son en el hospital X».
- Promesa: «Nuestros egresados son los más buscados», «bolsa de trabajo garantizada», «acreditación internacional», «la carrera del futuro».

Cuando escuches una promesa, pregunta: «¿dónde puedo verificarlo?». La reacción te dice más que la respuesta.

#### Qué hacer con el material

La misma noche, antes de que se mezcle todo: por cada institución que te interesó, anota tres cosas que confirmaste y una que quedó por verificar. Tira el resto. Lo que confirmaste va a tu plan; lo pendiente, a tus próximos pasos.

Si no hay feria, el ejercicio funciona igual con la página web de la institución: las mismas preguntas, el mismo filtro de dato o promesa.

> A una feria se va a verificar, no a convencerse.

**Para tu viaje.** Las instituciones del catálogo tienen enlace a su página web; los costos y el proceso de admisión están ahí, no en la plataforma.

**Fuentes:** MINEDU (2013), cartilla, actividad 11 (feria vocacional). [Sunedu, consulta de licenciamiento](https://www.gob.pe/institucion/sunedu/tramites-y-servicios). [Minedu, institutos licenciados](https://www.gob.pe/institucion/minedu/informes-publicaciones/4718331-lista-de-246-institutos-de-educacion-superior-licenciadas-por-minedu).

### F23 · Carreras del futuro y emprender

**Tema:** Mundo del trabajo · **Desbloquea:** misión adicional MA5 · **Descripción:** Qué ocupaciones crecen, cómo leer una lista de «carreras del futuro» y qué significa emprender en el Perú.

Cada año aparece una lista nueva de «profesiones del futuro». Sirven para mirar hacia dónde se mueve el trabajo, no para elegir por moda. Y el emprendimiento, en el Perú, es más una realidad que una tendencia.

#### Hacia dónde se mueve el trabajo

El Foro Económico Mundial estima que cerca del 44 % de las competencias básicas de los trabajos cambiará en cinco años. Las ocupaciones que crecen se agrupan en pocas tendencias:

| Tendencia | Ocupaciones que impulsa | Carreras que llevan ahí |
| --- | --- | --- |
| Inteligencia artificial y datos | Especialistas en IA, analistas de datos, desarrolladores | Ciencias de la computación, ingeniería de sistemas, estadística, matemática |
| Seguridad digital | Expertos en ciberseguridad, administradores de redes | Ingeniería de sistemas, redes y telecomunicaciones |
| Sostenibilidad y clima | Especialistas en energía renovable, gestión ambiental, ingeniería civil adaptada al clima | Ingeniería ambiental, energía, civil, agronomía |
| Salud y envejecimiento | Enfermería, terapia física, gerontología, informática médica | Ciencias de la salud, tecnología médica |
| Agricultura tecnificada | Operadores de drones y maquinaria autónoma, agrónomos de precisión | Agronomía, ingeniería agrícola, mecatrónica |
| Comercio electrónico y transformación digital | Especialistas en e-commerce, marketing digital, logística | Administración, marketing, ingeniería industrial |

Mi Carrera, la plataforma del MTPE, tiene un módulo propio de carreras del futuro con mirada peruana. Consúltalo junto con listas internacionales: el Perú no mueve las mismas ocupaciones que Europa.

#### Cómo leer una lista de carreras del futuro

1. **Del futuro de quién.** Una lista europea habla de su mercado. En el Perú, minería, agroindustria, salud y construcción siguen pesando.
2. **Crecer no es pagar bien ni dar empleo formal.** Una ocupación puede crecer y seguir siendo mal pagada o informal.
3. **Muchas no son carreras sino especializaciones.** «Especialista en IA» se llega desde computación, matemática o ingeniería; no es una carrera de pregrado.
4. **Lo que no cambia.** Las listas coinciden en que resolver problemas, aprender rápido, comunicarse y trabajar con otros siguen siendo lo que más se pide.

#### Emprender en el Perú

El Perú está entre los países con más emprendimiento en fase temprana del mundo: según el reporte GEM 2025/2026, el 12,8 % de la población adulta está iniciando un negocio. Pero conviene leer los otros datos:

- El 71,6 % de los emprendedores empezó por falta de empleo, no por una oportunidad detectada.
- Solo el 5,3 % llega a consolidar un negocio.
- Solo el 9,9 % espera crear más de seis empleos en cinco años.
- El 44,9 % reconoce el miedo al fracaso como un freno, y la educación emprendedora en el colegio recibe 3,2 sobre 10.

La distinción que importa es entre emprender por necesidad (no encontré trabajo, abro algo) y por oportunidad (vi una necesidad que sé resolver). La segunda sobrevive más, y se prepara: con una formación que te dé una habilidad vendible, con experiencia en el sector y con alguien que ya lo hizo.

#### Emprender como ruta, no como escape

Si te atrae, trátalo como una carrera más: ¿qué sabrías hacer que otros pagarían?, ¿qué formación lo respalda?, ¿con qué dinero empiezas y cuánto aguantas sin ganar? Un negocio propio después de una carrera técnica o universitaria tiene mejores probabilidades que uno abierto por no haber ingresado a ningún lado.

> El futuro del trabajo premia a quien aprende rápido. Una lista de carreras del futuro es una pista; tu capacidad de seguir aprendiendo es la apuesta segura.

**Para tu viaje.** El catálogo muestra, para cada ocupación, qué carreras llevan a ella. Si una ocupación «del futuro» te interesa, búscala ahí y mira qué formación la sostiene.

**Fuentes:** [Santander (2023), Las 10 profesiones del futuro para las que hay que formarse hoy](https://www.santander.com/es/stories/las-10-profesiones-del-futuro-para-las-que-hay-que-formarse-hoy), con datos del Foro Económico Mundial, *The Future of Jobs Report 2023*. [Mi Carrera (MTPE), carreras del futuro](https://micarrera.trabajo.gob.pe/). [Andina (2026), reporte GEM Perú 2025/2026](https://andina.pe/agencia/noticia-financiamiento-y-politicas-publicas-siguen-siendo-las-mayores-barreras-para-emprender-1080299.aspx).

## 6. Fichas del apoderado

En usted, con una sola idea por ficha y una lista práctica. Nombran la plataforma solo donde al apoderado le toca hacer algo en ella (FP06 y FP08).

### FP01 · Acompañar no es decidir

**Tema:** Familia · **Desbloquea:** P1 · **Descripción:** El rol de la familia en la elección: acompañar, informar y respetar; la decisión es de su hijo o hija.

Su hijo o hija va a tomar una de las decisiones más grandes de su vida, y usted va a estar al lado. La pregunta no es si influye, porque influye de todas maneras, sino cómo.

#### Lo que dice la evidencia

Los estudios sobre familia y elección de carrera coinciden en algo: el apoyo de los padres, entendido como interés, conversación y respaldo, se asocia con jóvenes más seguros de sí mismos y con decisiones más maduras. Una revisión amplia de la investigación (Whiston y Keller, 2004) lo encontró en distintos países y edades. Un estudio reciente con 652 estudiantes de secundaria (Söner y Gültekin, 2024) muestra el mecanismo: cuando los hijos sienten apoyo, crece su confianza en sus propias capacidades, y con esa confianza sus planes se acercan más a lo que la familia espera, sin necesidad de imponerlos.

Es decir: el camino más corto para que su hijo o hija tome en cuenta lo que usted piensa es que sienta que usted lo escucha.

#### Tres verbos

El programa de orientación vocacional del Ministerio de Educación resume el rol de la familia en tres acciones:

| Verbo | Qué significa en la práctica |
| --- | --- |
| Acompañar | Estar disponible, preguntar, escuchar sin juzgar las dudas; no desaparecer ni ocupar todo el espacio |
| Informar | Compartir lo que usted sabe del trabajo y de la vida, y ayudar a conseguir información que no tienen |
| Respetar | Aceptar que la decisión final es de su hijo o hija, aunque no sea la que usted habría tomado |

#### Lo que ayuda y lo que no

- Ayuda: preguntar «¿qué has pensado?» antes de decir lo que usted piensa.
- Ayuda: contar su propia historia, incluidas las dudas y los cambios de rumbo.
- Ayuda: acompañar a buscar datos (costos, instituciones, en qué consiste la carrera) en lugar de opinar de memoria.
- No ayuda: decidir por él o ella «porque usted sabe lo que le conviene».
- No ayuda: condicionar el cariño o el apoyo a una carrera en particular.
- No ayuda: comparar con primos, vecinos o con lo que usted hizo a su edad.

> Puede darles su amor, pero no sus pensamientos: ellos tienen los suyos. (Khalil Gibrán, *El profeta*)

**Para su ruta.** Las actividades que siguen le proponen revisar sus propias expectativas, practicar cómo conversar y, al final, escribir una carta para su hijo o hija. Todo lo que usted lea aquí queda guardado en «Mis actividades».

**Fuentes:** MINEDU (2013), *Orientación vocacional: cartilla para tutores*, actividad 3, taller con madres y padres. Whiston y Keller (2004), *The influences of the family of origin on career development*, The Counseling Psychologist. [Söner y Gültekin (2024), International Journal for Educational and Vocational Guidance](https://link.springer.com/article/10.1007/s10775-024-09658-7).

### FP02 · Lo que usted espera y lo que teme

**Tema:** Familia · **Desbloquea:** P2 · **Descripción:** Reconocer sus expectativas y temores sobre el futuro de su hijo o hija, y de dónde vienen, antes de transmitirlos.

Todos los padres esperan algo y temen algo para sus hijos. El problema no es tenerlos: es no saber que los tenemos y pasárselos sin darnos cuenta.

#### Un ejercicio de seis minutos

El taller del Ministerio de Educación para familias propone escribir, en seis minutos, tres expectativas y tres temores sobre el futuro de su hijo o hija. Hágalo en un papel, sin corregir. Luego mire cada línea y pregúntese:

1. ¿De dónde viene esto? ¿De lo que yo viví, de lo que no pude hacer, de lo que escucho, de lo que veo en la familia?
2. ¿Mi hijo o hija comparte esta expectativa o este temor? ¿Se lo he preguntado?
3. ¿Cómo se lo he transmitido? ¿Con palabras, con silencios, con el gesto cuando menciona algo que no me gusta?

#### Las tres fuentes más comunes

| Fuente | Suena como | Riesgo |
| --- | --- | --- |
| Lo que usted no pudo hacer | «Yo quería estudiar y no pude; él sí va a poder» | Que la carrera sea el sueño de usted, no el de él |
| El miedo económico | «Que estudie algo que dé plata, que no pase lo que pasamos» | Descartar opciones viables por un prejuicio sobre el ingreso |
| Lo que se valora alrededor | «En esta familia todos son…», «eso no es carrera» | Reducir las opciones a las conocidas en casa |

Ninguna de las tres es mala en sí. Querer que su hijo tenga seguridad económica es razonable. Lo que cambia las cosas es decirlo como preocupación propia («me da miedo que no te alcance») y no como veredicto («esa carrera no sirve»).

#### Cómo se transmite una angustia

Los adolescentes leen a sus padres mejor de lo que los padres creen. Captan la cara, el tono, el tema que se cambia. Cuando perciben angustia, muchos hacen una de dos cosas: callan lo que piensan para no preocupar, o eligen lo que calma a la familia aunque no les interese. Las dos cuestan caro después.

> Sus temores son válidos. Pero son suyos: su hijo o hija no tiene por qué cargarlos.

**Para su ruta.** Guarde el papel. Más adelante, la primera conversación guiada con su hijo o hija trata justamente de lo que cada uno espera del futuro.

**Fuentes:** MINEDU (2013), cartilla, actividad 3, hoja «Mis expectativas y temores acerca del futuro de mi hijo/a» y preguntas para grupos.

### FP03 · Apoyar sin presionar

**Tema:** Familia · **Desbloquea:** P3 · **Descripción:** Las formas de presión que no parecen presión, y qué actitud sí ayuda a decidir.

Casi ningún padre cree que presiona. La presión que daña rara vez es un grito: suele ser una frase repetida con cariño.

#### Tres tipos de comportamiento, tres resultados

Una investigación con adolescentes (Dietrich y Kracke, 2009) distingue tres formas en que los padres se involucran en la decisión de carrera:

| Comportamiento | Qué hacen los padres | Qué pasa con los hijos |
| --- | --- | --- |
| Apoyo | Se interesan, conversan, ayudan a buscar información, alientan a explorar | Exploran más y deciden con más seguridad |
| Interferencia | Opinan sin que se lo pidan, insisten en una opción, critican las otras | Más indecisión y menos exploración |
| Falta de involucramiento | No preguntan, no opinan, dejan todo «para que decida solo» | Tanta indecisión como con la interferencia |

La conclusión es útil: no se trata de intervenir menos, sino de intervenir de otra manera. Desentenderse tampoco ayuda.

#### Presión que no parece presión

- Proyectar lo propio: «Yo siempre quise ser médico; tú tienes la oportunidad».
- «Yo sé lo que te conviene»: la experiencia de usted es real, pero es de otro momento y de otra persona.
- Fijarse en una sola aptitud: porque canta bien o desarma aparatos desde niño, «ya se sabe» lo que va a estudiar, y se cierran las demás puertas.
- La comparación: «Mira a tu prima, ella sí sabe lo que quiere».
- El apoyo condicionado: «Si estudias eso, cuenta conmigo; si no, arréglatelas».
- La pregunta de todos los días: «¿Ya sabes qué vas a estudiar?» repetida cada semana se convierte en reclamo.

#### Lo que sí ayuda

1. Preguntar abierto: «¿Qué te llama la atención de eso?» en lugar de «¿Estás seguro?».
2. Separar la preocupación del juicio: «Me preocupa el costo» es distinto de «Esa carrera no da».
3. Aceptar que explore opciones que a usted no le gustan. Explorar no es decidir.
4. Ofrecer ayuda concreta: acompañar a una feria, buscar a alguien que ejerza esa ocupación, revisar costos juntos.
5. Recordar que la indecisión a esta edad es normal. No es falta de carácter ni de responsabilidad.

> Presionar acelera una respuesta; apoyar mejora la decisión.

**Fuentes:** MINEDU (2013), cartilla, parte 2 («Actividades con padres y madres de familia») y actividad 3. Dietrich y Kracke (2009), *Career-specific parental behaviors in adolescents' development*, Journal of Vocational Behavior.

### FP04 · Cuando la familia descubre tarde

**Tema:** Familia · **Desbloquea:** P4 · **Descripción:** La historia de Gastón Acurio, el papel de su familia y las señales de que un hijo esconde lo que quiere.

Gastón Acurio estudió Derecho en Lima y luego en Madrid, con buenas notas. Lo que leía con amor no eran tratados jurídicos sino libros de cocina. Su padre, un ingeniero y político, lo supo recién en un almuerzo en España, cuando el hijo le confesó que soñaba con ser cocinero.

#### Tres papeles en una misma familia

| Persona | Qué hizo | Qué efecto tuvo |
| --- | --- | --- |
| La madre | Notó desde niño la afición y la alentó, en silencio | Mantuvo viva la vocación, pero a escondidas |
| El padre | No supo nada durante años; creía al hijo encaminado a la abogacía | Perdió la oportunidad de acompañar, y la sorpresa fue grande |
| El hijo | Fingió hasta que no pudo más | Años en una carrera que no era la suya |

El padre, cuenta la historia, terminó inclinándose ante la vocación del hijo y nunca se arrepintió. Pero vale la pena mirar el costo: una vocación escondida por miedo a la reacción de la familia.

#### Por qué los hijos esconden

- Porque intuyen que la respuesta será «eso no es carrera», «eso es un hobby», «eso es cosa de mujeres» o «de hombres».
- Porque no quieren decepcionar, sobre todo cuando sienten que la familia ya invirtió ilusión en otra opción.
- Porque la familia nunca preguntó y ellos nunca encontraron el momento.

En el Perú de los años ochenta la cocina «podía ser una afición, pero no una profesión». Hoy es una de las carreras más visibles del país. Lo que hoy parece una ocurrencia puede ser, en diez años, un oficio con mercado.

#### Señales de que su hijo o hija guarda algo

- Cambia de tema cuando se habla del futuro, o responde siempre lo mismo.
- Habla con entusiasmo de una actividad «de pasatiempo» y con desgano de «lo que va a estudiar».
- Alguien más de la familia o del colegio sabe cosas que usted no.

Si reconoce alguna, no la enfrente con un interrogatorio. Abra la puerta: «Si algún día quisieras hacer algo distinto a lo que hemos conversado, me gustaría saberlo».

> Lo que su hijo no le cuenta no desaparece: solo se decide sin usted.

**Una película para ver en familia.** El programa sugiere ver juntos *La sociedad de los poetas muertos* y conversar después: ¿qué esperaba cada padre de su hijo en la película?, ¿qué habrían hecho ustedes?

**Fuentes:** MINEDU (2013), cartilla, actividad 12 y Anexo 12.2, «El sueño del chef» (texto de Mario Vargas Llosa, 2009).

### FP05 · Lo que cambió desde que usted eligió

**Tema:** Mundo del trabajo · **Desbloquea:** P5 · **Descripción:** Rutas, mercado, calidad de las instituciones, costos y becas: lo que hoy es distinto de cuando usted terminó el colegio.

Muchas ideas que se transmiten en casa sobre carreras son de hace veinte o treinta años. Algunas siguen valiendo; otras ya no. Esta ficha repasa cinco cosas que cambiaron.

#### Las rutas ya no son dos

Además de la universidad y el instituto, hoy la educación técnica permite continuar en la universidad convalidando estudios, hay carreras en horario nocturno y a distancia, y las escuelas de las Fuerzas Armadas y la Policía pagan una asignación durante la formación. Solo tres de cada diez jóvenes pasan a la educación superior (Inei 2023, Minedu 2024), así que combinar estudio y trabajo o empezar por una ruta corta es una decisión frecuente y razonable.

#### El mercado tiene datos públicos

El Estado publica cuánto ganan los egresados de cada familia de carreras, en planilla, en Mi Carrera (MTPE). Dos cosas que sorprenden a muchas familias:

| Lo que se creía | Lo que muestran los datos |
| --- | --- |
| Solo la universidad paga | Varias familias técnicas, como minería o ingeniería eléctrica, superan al promedio universitario al inicio |
| Una carrera «segura» garantiza empleo | Siete de cada diez profesionales trabajan en algo distinto a lo que estudiaron (MTPE, 2022) |
| Con título hay trabajo formal | Más del 85 % de los menores de 25 años trabaja sin contrato ni seguro (Inei); el título ayuda a entrar al empleo formal, pero no lo garantiza |

#### Hay instituciones que no están autorizadas

Desde 2014, las universidades necesitan licencia de la Sunedu y los institutos, del Minedu. En el primer proceso, 46 universidades no la obtuvieron y sus estudiantes tuvieron que trasladarse. Antes de que su hijo o hija postule, verifique la licencia en gob.pe; toma cinco minutos.

#### Los costos van más allá de la pensión

Matrícula por ciclo, materiales, transporte, alimentación y, si estudia en otra ciudad, vivienda. Una carrera privada de cinco años puede pasar los S/ 100 000; en una pública, el costo del primer año son los materiales, el transporte y los trámites. Pedir a su hijo o hija el total del primer año, y no solo la pensión, es la mejor conversación sobre dinero que pueden tener.

#### Hay becas del Estado

Beca 18 ofrece para 2026 veinte mil becas integrales en diez modalidades; la ordinaria pide buen rendimiento en los dos últimos años de secundaria, condición de pobreza según el Sisfoh y menos de 22 años. Hay además becas de las propias instituciones y crédito educativo. El crédito es deuda: conviene calcular la cuota contra el ingreso real de los egresados jóvenes de esa carrera.

> Su experiencia vale; los datos del mercado de hoy también. Juntos acompañan mejor que cualquiera de los dos solo.

**Fuentes:** [Mi Carrera (MTPE)](https://micarrera.trabajo.gob.pe/). [Sunedu, consulta de licenciamiento](https://www.gob.pe/institucion/sunedu/tramites-y-servicios). [Pronabec, Beca 18 convocatoria 2026](https://www.gob.pe/institucion/pronabec/campa%C3%B1as/117075-beca-18-convocatoria-2026). [La República (2026), acceso a educación superior](https://larepublica.pe/opinion/2026/05/14/y-despues-de-la-secundaria-que-por-mision-educacion-hnews-266604). [Andina (2025), inadecuación ocupacional](https://andina.pe/agencia/noticia-jovenes-estan-escogiendo-mejor-sus-carreras-que-favorecera-adecuacion-ocupacional-1032314.aspx).

### FP06 · Cómo conversar con su hijo o hija

**Tema:** Familia · **Desbloquea:** P6 · **Descripción:** Escuchar antes de opinar, preguntas que abren y preguntas que cierran, y cómo funcionan las conversaciones guiadas.

La pregunta «¿ya sabes qué vas a estudiar?» es la más repetida en quinto de secundaria y la que menos información produce. Conversar sobre el futuro es una habilidad, y se puede practicar.

#### Escuchar primero

Los adolescentes dejan de hablar de lo que les importa cuando cada vez que lo hacen reciben una opinión. El orden que funciona es: preguntar, escuchar hasta el final, pedir un ejemplo, y recién entonces decir lo que usted piensa, como opinión y no como veredicto.

#### Preguntas que abren y preguntas que cierran

| Cierran | Abren |
| --- | --- |
| ¿Ya decidiste? | ¿Qué cosas te han llamado la atención últimamente? |
| ¿Estás seguro? | ¿Qué te atrae de eso? ¿Qué te preocupa? |
| ¿Y eso en qué vas a trabajar? | ¿Cómo sería un día normal en ese trabajo? ¿Qué te falta averiguar? |
| ¿Por qué no mejor…? | ¿Qué otras opciones has mirado? ¿Qué te hizo descartarlas? |
| Eso no da plata | ¿Has visto cuánto ganan al inicio? ¿Cómo lo pagaríamos? |

Las de la derecha no son trucos: son preguntas cuya respuesta usted no conoce. Esa es la diferencia.

#### Cuatro reglas para una conversación que sirve

1. Un tema por conversación, de quince o veinte minutos. Las conversaciones largas sobre «el futuro» agotan a los dos.
2. Sin público. Ni delante de hermanos ni en una reunión familiar.
3. Las dudas no se juzgan. «No sé» es una respuesta válida; se puede seguir con «¿qué te ayudaría a saberlo?».
4. Termine con un acuerdo pequeño: averiguar un dato, visitar un lugar, hablar con alguien.

#### Las conversaciones guiadas

La plataforma le propone seis conversaciones con su hijo o hija, una por tema: las expectativas de cada uno, lo que usted ve en él o ella, los trabajos de la familia, sus fortalezas para lo que le interesa, lo que cuesta y cómo lo harían, y su plan y cómo apoyarlo. Cada una tiene una pregunta para usted y una para su hijo o hija, que cada uno responde por su lado en la plataforma; luego ven la respuesta del otro y una guía para conversarla en casa. Se habilitan conforme su hijo o hija avanza en su camino, y usted las encuentra en Conversaciones.

> Conversar no es convencer. Es enterarse de lo que su hijo o hija piensa, y que se entere de lo que usted siente.

**Fuentes:** MINEDU (2013), cartilla, actividad 3 (taller 1) y actividad 12 (taller 2) con madres y padres de familia.

### FP07 · Si duda o cambia de opinión

**Tema:** Familia · **Desbloquea:** P7 · **Descripción:** Por qué dudar o cambiar es parte del proceso, qué emociones aparecen y cómo acompañar sin decidir por él o ella.

«Ya no quiero estudiar eso» suena a retroceso. Casi siempre es lo contrario: la señal de que su hijo o hija está mirando en serio.

#### La indecisión es una fase

El programa del MINEDU lo plantea sin rodeos: la indecisión es una fase normal del proceso, incluso necesaria. Un estudio reciente con adolescentes (Mata-Correas y otros, 2025) distingue la indecisión propia de la edad, que se resuelve explorando, de la que se vuelve un problema porque la ansiedad o la presión la bloquean. La familia influye en cuál de las dos se instala.

#### Lo que se siente en casa

| Lo que siente usted | Lo que suele sentir su hijo o hija |
| --- | --- |
| Preocupación por el tiempo y el dinero | Miedo a decepcionar |
| Frustración («ya habíamos quedado en…») | Vergüenza por cambiar |
| Inseguridad sobre si debió decir algo antes | Alivio al decirlo, y temor a la reacción |

Las dos columnas son legítimas. El problema aparece cuando la primera se descarga sobre la segunda.

#### Cuatro situaciones, cuatro respuestas

1. **«Ya no quiero la carrera que había elegido».** Antes de preguntar por qué, pregunte qué vio. Un cambio con información (habló con alguien, visitó, leyó) es un avance; uno sin información es una duda que hay que explorar, no reprimir.
2. **«No sé qué quiero».** No llene el vacío con sugerencias. Pregunte qué ha descartado y por qué: casi siempre hay más claridad de la que parece.
3. **«Quiero esperar un año».** Pregunte para qué. Un año con plan (trabajar, un curso corto, prepararse) es razonable; un año sin plan, no. Acuerden qué haría con ese tiempo.
4. **«No ingresé».** No ingresar a la primera es común en las universidades públicas más demandadas. Lo que necesita es un plan para el siguiente intento, no un balance de lo que hizo mal.

#### Cuándo pedir ayuda

Si la duda viene con semanas de mal dormir, aislamiento, llanto frecuente o abandono de lo que antes disfrutaba, ya no es un tema vocacional. Hable con la orientadora o la psicóloga del colegio; en el Perú, la ansiedad es el motivo más frecuente de atención en salud mental, y los adolescentes son uno de cada siete atendidos.

> Un hijo que cambia de opinión frente a usted es un hijo que todavía le cuenta. Cuide eso.

**Fuentes:** MINEDU (2013), cartilla, parte 2 (la indecisión como fase del proceso). [Mata-Correas, Hernández-Franco y Prieto-Ursúa (2025), Educación XX1](https://revistas.uned.es/index.php/educacionXX1/article/view/42209). [El Peruano (2022), atenciones de salud mental del Minsa](https://www.elperuano.pe/noticia/192010-minsa-pone-la-lupa-en-la-ansiedad).

### FP08 · Su carta y lo que sigue

**Tema:** Familia · **Desbloquea:** P8 · **Descripción:** Cómo escribir una carta que sirva, qué pasa después con las conversaciones, y qué puede ver de los resultados de su hijo o hija.

El taller del MINEDU para familias termina con un regalo: cada madre o padre escribe una acción concreta de apoyo al proyecto de vida de su hijo o hija. En la plataforma, ese regalo es una carta.

#### Una carta que sirve

No es un discurso ni una lista de consejos. Tres partes bastan:

1. **Lo que ve en él o ella.** Una cualidad concreta, con un ejemplo que usted recuerde. No «eres inteligente» sino «cuando armaste el negocio de la kermés, nadie te lo pidió».
2. **Lo que usted siente con este proceso.** Si tiene miedo, dígalo como suyo. Los hijos agradecen la honestidad más que la tranquilidad fingida.
3. **Una acción concreta de apoyo.** Algo que usted hará: acompañar a la feria, sentarse a ver el presupuesto, buscar a alguien que trabaje en lo que le interesa, respetar la decisión aunque no sea la suya.

Evite tres cosas: comparar con otros, condicionar el apoyo a una carrera, y usar la carta para decir qué debería estudiar.

#### Qué pasa después

- Al guardar la carta se habilitan las conversaciones guiadas, que van apareciendo conforme su hijo o hija avanza.
- Su hijo o hija también escribe una carta para usted. Los dos saben que el otro la leerá, pero no cuándo: se entregan al completar las seis conversaciones.
- Con su ruta completa, usted recibe el diploma «Conozco mi rol» y puede ver los resultados de los cuestionarios de su hijo o hija que la orientadora haya marcado como visibles, con una explicación de cómo leerlos.

#### Cómo tomar esos resultados

Un resultado de intereses sugiere áreas para explorar; no dice qué carrera «le toca». Si una carrera que su hijo o hija quiere no aparece entre las afines, eso no la descarta: es un tema para conversar, no un argumento. Lo que vaya más allá de la explicación de la plataforma, consúltelo con la orientadora.

> Su carta no decide nada. Dice que usted está. Eso es lo que su hijo o hija necesita leer.

**Para su ruta.** La carta se escribe en Conversaciones, para el hijo o hija que elija, y puede editarla después. Al completar esta actividad, su ruta queda terminada.

**Fuentes:** MINEDU (2013), cartilla, actividad 3 (cierre: el regalo) y parte 2 («Actividades con padres y madres de familia»).

## 7. Pendientes y notas para la carga

**Decisiones tomadas en la segunda tanda**

- F13 lleva un top 5 nacional de familias universitarias y técnicas por ingreso promedio de egresados jóvenes, calculado con `carreras_salarios_por_departamento.csv` (fila nacional), más la mediana de cada tipo para que el top se lea como excepción. La demanda se explica sin cifras propias, apuntando al módulo de carreras de Mi Carrera.
- F23 «Carreras del futuro y emprender» es ficha aparte, desbloqueada por MA5, con el artículo de Santander (Foro Económico Mundial 2023), el módulo de Mi Carrera y el GEM Perú 2025/2026.
- F21 incluye «Y si no ingreso»; F07 pasa a «Qué es un test y para qué sirve»; F09 presenta las siete inteligencias del instrumento cargado.
- Vocabulario: las fichas dicen **ocupación** para los trabajos de O\*NET y **carrera** para los programas del MTPE. Hoy el catálogo rotula la pestaña y los bloques como «Profesiones» («Profesiones a las que conduce»). Propuesta: renombrar a «Ocupaciones» en el front (cambio de textos, sin modelo), para que fichas, catálogo y resultado del test usen la misma palabra.
- Test de intereses: F07 y F10 explican que el código de tres letras resume el perfil, que las ocupaciones afines salen de los seis puntajes, y que el código sirve para filtrar el catálogo por letras.

**Notas para `datos/contenido.py`**

- Cada ficha es una tupla `(código, título, descripción, tema, contenido, audiencia)` y una regla `('R-Fnn', 'FICHA', 'Fnn', mensaje_bloqueo, (('COMPLETA_ACTIVIDAD', '<actividad>', 'EVENTOS', 1),))`. F08 y F07 comparten actividad (2.1); F14 y F15, la 3.6.
- Al cargar, las secciones `####` de este documento pasan a `###`. Las cursivas de los títulos de obras en «Fuentes» se quitan (el renderizador del front no las admite).
- Las preguntas de batalla referencian la ficha por `ficha_id`: 1.5 → F05; 3.5 → F11 y F13; 3.7 → F14 y F15; 3.9 → F16; 4.4 → F02, F19 y F20; MA2 → F05; MA7 → F13.
- Las actividades del apoderado en el front apuntan hoy a `recursoIds` del catálogo local (`ficha-pad-rol`, `ficha-pad-info`). Al cargar FP01–FP08 hay que alinear esos `recursoIds` con los códigos nuevos, y `t-ficha-apo` deja de ser placeholder solo en `ruta`.
- Los enlaces de «Fuentes» se mantienen solo si son https; el renderizador no convierte los demás en enlace.
