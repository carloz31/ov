# Ajuste · testimonios

## Contexto

`contenido` tiene hoy 12 testimonios de prueba (`tc1-1…tc6-2`). Se cargan los 14 reales (videos de YouTube): 11 de la Central y 3 que abren actividades del puerto. Cambian el modelo del testimonio (sin años, con contexto y tramo de video) y la tarjeta, el cierre y el pop up del front.

**Fuente:** `Downloads/ajuste-testimonios.md`, con sus tablas 2.1 tal cual. Se copia íntegro como anexo de la spec `ov_backend/docs/specs/ajuste-testimonios.md`. No hay spec en curso. Rama: `ajuste/testimonios` (ya creada desde `main`, sin cambios).

**Comprobado contra el repo:** las 14 ocupaciones están en el catálogo (`en_catalogo = 1`); las 11 de caso son necesidad de su JSON; los `video_id` tienen 11 caracteres; los contextos, 60 como máximo; ningún título ni pista contiene el título de la ocupación.

## Decisiones tomadas contigo

- **`ma2-p06`:** enunciado «En la Central hay una voz de una ingeniera de sistemas que fue una de las pocas mujeres en su carrera. ¿Qué muestra esa voz?»; opción correcta «Una ocupación no tradicional elegida por interés y habilidad». Distractores y explicación sin cambios.
- **`b3_a.json`:** «la del diseñador» pasa a «la del cocinero» (no estaba en 2.3).
- **`b3_10.json`:** «se abren al resolver los casos» pasa a «la mayoría se abren al resolver los casos».
- **Encabezado de voces (api):** «Personas reales que cuentan cómo llegaron a lo que hacen. Las encuentras al resolver llamados en la Central de Casos y en algunas misiones del camino.»
- **Estado vacío de voces (api):** «Cada llamado que superas en la Central de Casos, y algunas misiones del camino, te presentan a alguien que ya recorrió un camino. Hay M voces en la ciudad.»
- **`guideTexts.ts:108`:** hoy dice que las voces «se descubren al atender los llamados de la Central de Casos», es decir, que todas vienen de ahí. Pasa a «… de la Central de Casos y en algunas misiones del camino.», solo en api si el texto lo permite; si es un texto común sin forma de distinguir el modo, se cambia solo si no rompe `tests/local`, y se avisa.
- **`fin`:** `fin <= inicio` se rechaza solo cuando `fin` no es nulo.

## Diferencias entre el documento y el código (propuesta)

- **`R-T05` no existe en `contenido`**: T05 solo aparece en el `mensajeFin` de `b3-10`. No hay regla que retirar.
- **Los testimonios de `ruta`** son `t-testimonio-1..4` (con `19-3091.00`, etc.), no `paramedic`/`translator`, que son los del modo local. Gana el código: los cuatro se adaptan al modelo nuevo y mantienen su ocupación.
- **`videoId` y `video_id`:** `types/servidor.ts` usa `video_id` (el contrato copia el esquema, snake_case); `videoId` queda solo en el modelo de vista.
- **El cierre en api hoy no conoce a la persona** (`useActivityFinish` solo busca en el catálogo local; `DesbloqueosCierre` no pasa nada) y muestra solo el título. Para cumplir 4.2 hay que leerla de la sección `testimonios` del almacén (ver Fase 4).

## Qué no cambia

- Modo local: conserva sus testimonios, años, textos y `youtubeEmbedUrl`. No hace falta armar la línea de contexto: `TravelResource` no obliga a tocar `professionalTestimonials`.
- Motor, disponibilidad y `/acciones/ver-testimonio`; favoritos (`es_favorita`); el catálogo.
- Las tarjetas bloqueadas de voces de caso.
- La spec queda en curso: no se mueve a `historico/`. No hay push.

## Fase 1 · Modelo y contrato (`/cambio-modelo`)

**Modelo (`app/models/contenido.py`, `Testimonio`)** — decisión de diseño que pide el documento:
- Hoy: `enlace` obligatorio y `anios_experiencia`.
- Pasará a: `video_id` (obligatorio), `inicio` (entero, por defecto 0), `fin` (nulo permitido), `contexto` (nulo permitido).

**Migración `0045`:** agrega columnas, saca `video_id` de cada `enlace` existente, lo vuelve obligatorio y elimina las dos anteriores. El `downgrade` reconstruye el enlace. `anios_experiencia` no es recuperable y queda nula.

**Carga (`datos/cargador.py`):** tupla `(código, título, descripción, video_id, inicio, fin, pista, persona, ocupación, contexto, cita)`. Falla con `ValueError` si:
- `video_id` no cumple `^[A-Za-z0-9_-]{11}$`, o `inicio < 0`, o `fin` no es nulo y `fin <= inicio`, o `contexto` pasa de 80;
- el testimonio no tiene regla SUPERA_CASO ni COMPLETA_ACTIVIDAD.

La validación va en la carga, sin restricciones CHECK en la base.

**Respuesta (`schemas/testimonios.py`, `services/testimonios.py`):**
- Sale `enlace` y `anios_experiencia`. Entran `video_id`, `inicio`, `fin`, `contexto` (nulos si está bloqueado, como hoy el enlace), `actividad: {codigo, titulo} | null` y `actividad_disponible: bool` (viaja siempre, como `caso_disponible`).
- Función nueva `actividad_del_testimonio`, junto a `caso_del_testimonio`. Si la regla tiene SUPERA_CASO, es voz de caso y `actividad` es nula: así `t-testimonio-2`, que pide caso y actividad, sigue siendo de caso. Nunca llegan los dos.

**`datos/ruta.py` y `contenido.py`:** los testimonios pasan a la forma nueva con `contexto` nulo y los IDs de sus enlaces de prueba. En `contenido` se mantienen los de prueba hasta la Fase 2.

**Front, solo contrato (mismo commit, lo exige `AGENTS.md`):** `types/servidor.ts`, `testimonioServidor` sin años, video con los campos nuevos, fixtures regenerados y pruebas que nombran años o enlace. Sección de `integracion.md` del contrato del testimonio.

**Pruebas:** `integration/migraciones`, `datos`, `testimonios`, `contrato`, `escenarios`; `npm run test:servidor`.

## Fase 2 · Datos

**`datos/contenido.py`:**
- `TESTIMONIOS` con las 14 filas de 2.1. Sin `tc4-2` ni su regla. Sin `PENDIENTE` ni la fila de testimonios de `PROVISIONALES`.
- `R-tb3-1`, `R-tb3-8` y `R-tb3-10` con los mensajes de 2.2.
- Sin los comentarios sobre T02/T08 y «dos por caso», incluido el de las reglas `R-c*`.
- `ma2-p06` como arriba. `ma2-p07`: su explicación pasa a «En la Central hay una voz de un fisioterapeuta que cuida a deportistas. «Raro» describe la costumbre; la ocupación exige habilidad e interés, no un sexo.»

**Textos del front:**
- `b3_10.json`: «un cocinero que viajaba conmigo»; «otra voz, la del cocinero»; `mensajeFin` → «… con mejor información. Se abrió una voz nueva en tu mochila y la conversación «Los trabajos de nuestra familia».»
- `b3_10.json`: «la mayoría se abren al resolver los casos».
- `b3_a.json`: «la del cocinero».

**`scripts/verificar_contenido_front.py`:** comprobaciones de 2.4.
- Ocupación de voz de caso en necesidades; de voz de actividad en catálogo.
- Exactamente una regla TESTIMONIO por testimonio.
- `video_id` y `fin`.
- Título y pista sin el título de la ocupación (sin mayúsculas ni tildes).
- JSON de actividades y preguntas de batalla sin `\bT0\d\b` ni `\b(tc|tb)\d+-\d+\b`.
- Sin comprobación de «dos por caso».

Corre en `ruta` y `contenido`.

**Pruebas:** `integration/datos`, `integration/escenarios`, `tests/servidor/actividades` y el script.

## Fase 3 · Pruebas del backend

En `tests/integration/datos/` y `escenarios/contenido/`, los cinco puntos de la sección 3 del documento:
1. 14 testimonios con `video_id`, sin años, sin `tc4-2`.
2. c4 abre solo `tc4-1`; c5 abre `tc5-1` y `tc5-2`.
3. Completar `b3-1`, `b3-8` y `b3-10` abre sus voces, con `caso: null` y `actividad`.
4. Ninguna regla nombra T05; existen las tres `R-tb3-*`.
5. La carga rechaza `?si=` y `fin <= inicio`.

Las pruebas actuales que fijan 12 testimonios o dos por caso (`test_carga_contenido`, `test_carga_casos`) se adaptan por la Fase 2. Se regeneran fixtures.

`ruta` no gana voz de actividad (está congelada y el documento solo la adapta), así que esa mecánica se prueba sobre `contenido`.

## Fase 4 · Front (modo api)

**`lib/servidor/adaptadoresCasos.ts`:** funciones puras `urlEmbedTestimonio` (`youtube-nocookie.com/embed/{id}?start={inicio}` y `&end={fin}` solo si existe) y `urlYoutubeTestimonio` (`https://youtu.be/{id}?t={inicio}`).

**`features/backpack/lib/travelerResources.ts`:** `testimonioServidor` llena `author` («persona · ocupación»), `contexto`, `embed`, `url` y `servidor.actividad` / `actividadDisponible`. `ResourceContent` usa `resource.embed ?? youtubeEmbedUrl(resource.url)`; «Ver en YouTube» ya sale de `url`.

**Línea de la persona (`contexto` debajo, solo si existe; línea nueva, sin cambiar el resto del marcado):**
- `TarjetaTestimonio` y `VisorRecurso`.
- `FinishBackpackSection`, con `contexto` en `RecursoCierre`. Hook nuevo `usePersonasTestimonios` en `features/activities/hooks/`, que usan `useActivityFinish` (solo api) y `DesbloqueosCierre`: lee `useTestimoniosServidor` y entrega persona, rol y contexto por código. Mientras carga, se ve el título, como hoy.

**Mochila (`useBackpack`, `CompartimentoVoces`):**
- `casoVoz` pasa a `origenVoz`: caso o actividad, con título y `href` (`hrefActividad`, que abre el drawer).
- `TarjetaTestimonio`: `regalo` pasa a `origen`, con «Te la regaló el llamado **{caso}**» o «Te la dejó la misión **{actividad}**».
- `VozPorDescubrir`: en voz de actividad, «Completa la misión **{actividad}** en el mapa.» y «Ir al mapa →». Se lista si `actividad_disponible` es verdadero.
- Tarjeta de cierre en api: «k voz más espera / k voces más esperan en el camino y en llamados que aún no se abren.» El texto llega por el hook, porque los componentes no leen `modoApi`. M ya es `voices.length`, que viene del servidor.
- Encabezado y estado vacío de voces con los textos nuevos en api, por el mismo hook; local conserva los suyos.
- `guideTexts.ts:108` según la decisión de arriba.

**`end` del embed:** se usa, porque es solo un parámetro de la URL y no requiere control propio. Se comprueba en la prueba manual; si falla, se omite y se anota en `pendientes-interfaz.md`, como dice 4.6.

**Dos voces por caso:** la búsqueda en `features/` y `data/content/` no encontró ninguna suposición en el código. Lo que queda es el cierre generalista, que ya funciona con una voz. Se añade una prueba de que El festival muestra una sola tarjeta.

**Pruebas:**
- Adaptadas: `tests/servidor/testimonios`, `actividades/servidor-cierre`, `actividades/servidor-mochila`, `casos`.
- Nuevas: tarjeta con y sin contexto, origen por caso y por actividad, URL del embed con y sin `fin`, voz de actividad bloqueada listada solo si la actividad está disponible.
- `tests/local` no se amplía y debe seguir igual.

## Fase 5 · Cierre

- **Documentos:**
  - `integracion.md`: sin la fila de testimonios provisionales; comprobaciones del script.
  - `motor.md`: reglas TESTIMONIO por actividad.
  - `ov_frontend/AGENTS.md` (línea de Bloqueos) y `origen-de-datos.md`, donde describan al testimonio.
  - `pendientes-interfaz.md`: cierra T05, `ma2-p06` y `ma2-p07`.
- **`decisiones.md`:** una viñeta por cada decisión del documento, más las de este plan (`ma2-p06`, `b3-a`, `video_id`, cierre desde el almacén, validación en la carga).

## Verificación

- Por fase: carpetas de impacto más `tests/integration/escenarios` y `npm run test:servidor`, con el subagente `pruebas`.
- Al final, con `pruebas`: `uv run pytest -n auto -q`, `npm test`, `npm run build`, `npm run lint`, `npm run check:estructura`; `uv run alembic heads` con un solo head; `uv run python scripts/verificar_contenido_front.py` sin errores.
- **Prueba en la app real, con capturas para ti:** con `contenido` en una base temporal y `VITE_DATOS=api`, completar una actividad (`b3-1`, `b3-8` o `b3-10`) y un caso que desbloquee dos testimonios (c5, por ejemplo), cada uno con sus desbloqueos. Capturas de: cierre de la actividad; pantalla final del caso con las dos voces desbloqueadas; lo que se abre al tocar una de ellas, comprobando que lleva a esa voz en los testimonios de la mochila; mochila con voz abierta y voz bloqueada; y pop up con el video en su `inicio`. El caso de una sola voz (c4) queda cubierto por la prueba automática de la Fase 4.

Commits: `Ajuste testimonios · F<n>: …`, uno por fase.

---

# Anexo · documento fuente (sin cambios)

# Ajuste · testimonios

Carga de los 14 testimonios reales (videos de YouTube) sobre los de prueba del ajuste `carga-casos`: 11 de la Central y 3 que liberan actividades del tramo del puerto. Cambia el modelo del testimonio (sin años de experiencia, con línea de contexto y tramo del video) y la tarjeta y el pop up del front. Sale de `main`.

Fuente: `testimonios-seleccion.md` (criterios de selección, temáticas y videos). **Donde este documento y esa fuente choquen, gana este documento.** Los textos de la sección 2.1 se cargan tal cual; si alguno no cumple una regla de validación, se detiene la fase y se informa (no se corrige el texto).

## Criterio general

- **Solo `contenido`.** Los testimonios de `ruta` (`paramedic` → `29-2043.00`, `translator` → `27-3091.00`) siguen siendo de prueba; solo se adaptan al modelo nuevo (fase 1).
- **Los códigos de caso se conservan.** Los datos reales se cargan sobre `tc1-1`…`tc6-2`; su regla sigue siendo `SUPERA_CASO` de su caso. **Se elimina `tc4-2`**: El festival da un solo testimonio.
- **Tres voces de actividad nuevas**: `tb3-1`, `tb3-8` y `tb3-10`, con regla `COMPLETA_ACTIVIDAD` de su actividad y `caso: null`. Reemplazan al T05 provisional.
- **Toda ocupación de un testimonio está en el catálogo** (regla de `carga-casos`). La de una voz de caso, además, es una necesidad de ese caso. Las 14 ya cumplen ambas cosas (comprobado contra `ocupaciones_curadas.csv`); si la carga o el script dicen otra cosa, se detiene y se informa.
- **Modo local congelado.** Local sigue con sus testimonios y su campo de años; si un tipo compartido obliga a tocarlo, el adaptador local arma la línea de contexto como «{años} años de experiencia» y nada más cambia.

## Fase 1 · Modelo y contrato (sigue `/cambio-modelo`)

### 1.1 Sin años de experiencia, con línea de contexto

- Se retira el campo de años del testimonio (modelo, migración, carga en `datos/cargador.py`, esquemas de `app/schemas`, servicios y fixtures).
- Se agrega `contexto`: texto opcional (nulo permitido, máximo 80 caracteres) con el cargo o la situación de la persona, p. ej. «Gerente de logística en Camposol» o «Estudiante de Medicina, 8.º ciclo».

### 1.2 Video con tramo

- El enlace se reemplaza por `video_id` (ID de YouTube, 11 caracteres, sin parámetros), `inicio` (segundos, entero ≥ 0, por defecto 0) y `fin` (segundos, entero, **opcional**; nulo = hasta el final). Validación: si `fin` existe, `fin > inicio`.
- `fin` es secundario: lo que importa es `inicio`. La mayoría de los testimonios no tiene `fin` (en la tabla 2.1, «—»).
- La carga rechaza un `video_id` con parámetros (`?si=`, `?t=`) o con otra longitud.

### 1.3 Origen de las voces de actividad

- El testimonio que entrega el servidor trae `caso` (como hoy) **o** `actividad`: `{codigo, titulo}` de la actividad cuya `COMPLETA_ACTIVIDAD` lo abre (se toma de su regla TESTIMONIO). Nunca los dos; una voz sin ninguno es un error de carga.
- Para una voz de actividad bloqueada, el estado de la actividad (`disponible` o no) viaja igual que hoy viaja el del caso, para que la mochila decida si la lista.

Pruebas que se adaptan (autorizado): las que nombran el campo de años o el enlace del testimonio, en ambos repos, y los testimonios de `ruta` (pasan a `video_id` con los IDs de sus enlaces de prueba, `contexto` nulo).

## Fase 2 · Datos (`contenido.py`)

### 2.1 Los 14 testimonios

Se quita la marca `PENDIENTE` y la fila de testimonios de `PROVISIONALES`. Los títulos y las pistas se ven en la tarjeta bloqueada, así que **no nombran ni insinúan la ocupación** que hay que llamar; la descripción solo se ve al abrir la voz.

| Código | Persona | Ocupación | Contexto | Video | Inicio | Fin |
|---|---|---|---|---|---|---|
| tc1-1 | Luis Muro | 19-3091.00 | Curador en el Museo de Arte de Los Ángeles | `IwEQbscMmss` | 12 | — |
| tc1-2 | Bruno Adriano | 17-2051.00 | Investigador en desastres en RIKEN, Japón | `a1nDn05MRGc` | 30 | — |
| tc2-1 | Luz Herrera | 15-1211.00 | Ingeniera de sistemas, fundadora de Hack AI | `cJNG-fmQbic` | 39 | — |
| tc2-2 | Marcela | 21-1012.00 | Psicóloga y orientadora vocacional | `mE9gPU-3XbI` | 0 | — |
| tc3-1 | Miguel Ángel García | 19-1012.00 | Ingeniero agroindustrial en Chumbes, Ayacucho | `ogRhln33pTM` | 0 | — |
| tc3-2 | Paola Lozada | 13-1081.00 | Gerente de logística en Camposol | `5SUV2fNooag` | 0 | 324 |
| tc4-1 | Sandro Ventura | 27-4032.00 | Cineasta con productora propia | `ayxDpxdNOjc` | 180 | 480 |
| tc5-1 | Ricardo Gonzales | 29-1123.00 | Fisioterapeuta deportivo en Deportes UPC | `V5aIxP1QZp4` | 172 | 348 |
| tc5-2 | Kyara Vidal | 29-1215.00 | Estudiante de Medicina, 8.º ciclo | `Iz5eUTS0qlA` | 0 | 181 |
| tc6-1 | Ana Villegas | 17-2081.00 | Fundadora de Yaku Consultores | `LAOSq1CMhas` | 0 | — |
| tc6-2 | Aynne Anchante Rondán | 17-1021.00 | Piloto de drones en Anglo American Quellaveco | `PUyBO8KOrzA` | 72 | — |
| tb3-1 | Hugo Barrantes | 49-3011.00 | Técnico en LATAM, egresado de Tecsup | `cIU5Dj0Ovh8` | 0 | — |
| tb3-8 | Joel Layme Ari | 17-2072.00 | Estudiante de Ingeniería Electrónica, becario en Cerro Verde | `P7GvD3Kxm9Q` | 0 | — |
| tb3-10 | Gastón Acurio | 35-1011.00 | Chef | `VEjh5cy2QgM` | 9 | 367 |

Títulos, pistas, citas y descripciones:

| Código | Título | Pista (bloqueada) | Cita | Descripción |
|---|---|---|---|---|
| tc1-1 | Una vocación que empezó de niño | Supo desde niño a qué quería dedicarse, aunque casi nadie lo eligiera. | La sensación de poder develar el pasado y descubrir la vida de las sociedades que ya no existen más… es indescriptible. | Luis descubrió su vocación en los museos que visitaba de niño y la sostuvo aunque fuera una carrera poco común. Estudió en la PUCP y hoy trabaja como curador en Los Ángeles. |
| tc1-2 | Del colegio estatal a investigar en Japón | Hijo de un albañil, salió de un colegio estatal y hoy investiga al otro lado del mundo. | El mundo necesita investigadores. | Bruno creció en San Juan de Lurigancho y estudió en un colegio estatal; tuvo que cerrar la brecha con una academia para entrar a la UNI. Su padre esperaba que construyera, y él eligió investigar: hoy estudia desastres en Japón. |
| tc2-1 | No pidas que sea fácil | Una de las pocas mujeres en la sala. | No pidas que la situación sea fácil, sino pide que tú seas más fuerte. | Luz fue de las pocas mujeres en su carrera y llegó a dudar a mitad de camino. Siguió adelante, se formó como ingeniera de sistemas y fundó Hack AI. |
| tc2-2 | Elegir lo que te mueve | Le dijeron que de eso no se vive. | El saber que puedes poner un granito de arena para ayudar a una persona… es lo mejor de la parte de psicología. | A Marcela le advirtieron que se moriría de hambre si estudiaba lo que le gustaba. Se formó como psicóloga y hoy acompaña a otros a decidir qué estudiar. |
| tc3-1 | Volver para quedarse | Estudió lejos para volver a su pueblo y crear trabajo ahí. | Mi sueño es que esto se masifique, sea más grande y generar trabajo acá en mi comunidad de Chumbes. | Miguel Ángel estudió en Ayacucho con una idea clara: volver a Chumbes. Hoy transforma lo que se produce en su comunidad y empezó en pequeño, desde lo local. |
| tc3-2 | El miedo como impulso | Se mudó sola al otro lado del país por un reto. | Que el miedo sea un impulsor para tomar decisiones. | Paola eligió una carrera amplia porque le gustaban los números. Aceptó un reto que la obligó a mudarse sola de región, se apoyó en mentores y hoy dirige la logística de una agroexportadora en varios países. |
| tc4-1 | Una apuesta que podía salir mal | Dejó un trabajo seguro por una apuesta que podía salir mal. | Si esto va a ser mi única película, al menos me habré dado el gusto. | Sandro trabajaba en periodismo de espectáculos y lo dejó para hacer cine, sin una escuela de cine en el país y con la incertidumbre de no saber si viviría de eso. Lo conversó con sus padres y sus hijos y aprendió por su cuenta. |
| tc5-1 | Demostrarlo con resultados | Volvió con una especialidad que nadie tomaba en serio. | Cuando regreso y comienzo a hablar sobre deporte, mucha gente dijo que lo que hacía no servía. | Ricardo estudió en la Villarreal y se especializó en el extranjero. Al volver, muchos colegas desconfiaron de su enfoque; lo convenció trabajando con deportistas y mostrando resultados. Hoy coordina el área médica de un programa deportivo universitario. |
| tc5-2 | A la tercera | Le dijeron que no dos veces y siguió buscando cómo estudiar. | Mi objetivo es ser médica y ayudar a todo el que lo necesite. | Kyara quería estudiar Medicina, pero su familia no podía pagarla. Postuló dos veces a una beca y no quedó; siguió buscando hasta conseguir un crédito educativo. Hoy cursa el octavo ciclo. |
| tc6-1 | Pensar a qué dedicarse | Era de letras y eligió una carrera de números. | Más que pensar en la carrera y en los cursos que uno va a llevar, hay que pensar en a qué queremos dedicarnos durante muchos años. | Ana se consideraba de letras y aun así eligió una ingeniería: sacó adelante los cursos de números. Al terminar, fundó su propia consultora. |
| tc6-2 | Paso a paso | Quería ser médica y terminó en un rubro donde casi no había mujeres. | No todas las personas saben todo, siempre podemos aprender más del resto. | Aynne empezó con una carrera técnica en SENCICO y luego estudió ingeniería civil mientras trabajaba. Hoy mide el terreno con drones en una mina, en un rubro con muy pocas mujeres. |
| tb3-1 | Vencer el miedo | Le tenía miedo a los aviones. | Vencí el miedo a los aviones y hoy los reparo. | Hugo pasó por el Ejército antes de decidir qué estudiar. Eligió una carrera técnica en Tecsup y hoy da mantenimiento a aviones en LATAM. |
| tb3-8 | Esto no es un sueño | Vendía pan de madrugada para pagar su academia. | Cada mañana me pillo la mano, el pie y los hombros para pensar que esto no es un sueño. | Joel no pensaba ir a la universidad. Trabajó y estudió a la vez para pagar su preparación, entró con una beca y hoy estudia Ingeniería Electrónica. |
| tb3-10 | Cocinar a escondidas | Estudiaba Derecho y cocinaba a escondidas. | Si has nacido para ser cocinero, esto que puede resultar para otros exhausto, para nosotros es parte de nuestra vida. | Gastón empezó la carrera que su familia esperaba, Derecho, mientras cocinaba a escondidas. Un día decidió contarlo y dedicarse a la cocina. |

### 2.2 Reglas

- `tc*`: sin cambios (SUPERA_CASO de su caso). Se retira la regla de `tc4-2` junto con el testimonio.
- Nuevas:
  - `R-tb3-1`: TESTIMONIO `tb3-1`, COMPLETA_ACTIVIDAD `b3-1`, mensaje «Conoce los cinco embarcaderos con Ulises.»
  - `R-tb3-8`: TESTIMONIO `tb3-8`, COMPLETA_ACTIVIDAD `b3-8`, mensaje «Pasa por la caseta de Clotilde.»
  - `R-tb3-10`: TESTIMONIO `tb3-10`, COMPLETA_ACTIVIDAD `b3-10`, mensaje «Escucha a Alejandra en el malecón.»
- Se retira `R-T05` y cualquier testimonio o referencia `T05`, `T02` o `T08` en `contenido`.

### 2.3 Textos de actividades que nombran voces

Solo se cambian estas frases, sin tocar flujo ni nodos:

- **`b3-10`**: «un diseñador que viajaba conmigo» pasa a «un cocinero que viajaba conmigo»; «la primera voz, la del diseñador» pasa a «otra voz, la del cocinero». El `mensajeFin` no nombra códigos internos (ni «T05» ni `tb3-10`): anuncia que hay una voz nueva en la mochila.
- **`ma2-p06`** (hoy nombra la T02, mujer mecánica): pasa a «En la Central hay una voz de una ingeniera de sistemas que fue una de las pocas mujeres en su carrera.»
- **`ma2-p07`** (hoy nombra la T08, enfermero): pasa a «En la Central hay una voz de un fisioterapeuta que cuida a deportistas.»
- Ninguno de los dos supone que el estudiante ya tiene la voz (`ma2` se abre en B1, antes de resolver casos). Si la frase original no admite el cambio sin reescribir el diálogo, se detiene y se informa con el texto actual.

### 2.4 Validación (`scripts/verificar_contenido_front.py`)

- La ocupación de cada voz de caso es una necesidad de su caso; la de una voz de actividad está en el catálogo.
- Cada testimonio tiene exactamente una regla TESTIMONIO: SUPERA_CASO (voz de caso) o COMPLETA_ACTIVIDAD (voz de actividad).
- `video_id` de 11 caracteres sin parámetros; `fin > inicio` cuando hay `fin`.
- Título y pista no contienen el título de la ocupación (comprobación literal, sin mayúsculas ni tildes).
- Ningún texto de actividad nombra `T0*` ni un código `tc`/`tb`.
- El conteo de testimonios por caso es libre (El festival tiene uno): se retira cualquier comprobación de «dos por caso».

## Fase 3 · Pruebas del backend

En `tests/integration/datos/` y `tests/integration/escenarios/contenido/`:

1. `contenido` carga 14 testimonios, ninguno con años, todos con `video_id`; `tc4-2` no existe.
2. Superar c4 abre solo `tc4-1`. Superar c5 abre `tc5-1` y `tc5-2`.
3. Completar `b3-1`, `b3-8` y `b3-10` abre `tb3-1`, `tb3-8` y `tb3-10`, que llegan con `caso: null` y `actividad` con su código y título.
4. Ninguna regla de `contenido` nombra `T05`; existen `R-tb3-1`, `R-tb3-8` y `R-tb3-10`.
5. La carga rechaza un `video_id` con `?si=` y un `fin` menor o igual que `inicio`.

Regenerar fixtures con `exportar_fixtures_front.py` (cambia el testimonio en el contrato).

## Fase 4 · Front (modo api)

1. **Tipos.** `types/servidor.ts`: el testimonio pierde los años y el enlace; gana `contexto`, `videoId`, `inicio`, `fin` y `actividad`.
2. **Línea de la persona** (tarjeta de la mochila, cierre del caso, cierre de actividad y pop up): «{persona} · {ocupación}» y, debajo, el `contexto` si existe. Desaparece «{años} de experiencia».
3. **Origen** en la tarjeta abierta: «Te la regaló el llamado **{caso}**» si tiene caso; «Te la dejó la misión **{actividad}**» si tiene actividad.
4. **Tarjeta bloqueada de una voz de actividad**: se lista solo si la actividad está disponible, con la caja «Completa la misión **{actividad}** en el mapa.» y el enlace «Ir al mapa →», que abre el drawer de la actividad. Las de caso no cambian.
5. **Tarjeta de cierre** (mochila 4.4): «k voces más esperan en el camino y en llamados que aún no se abren.» El total M sale del servidor (14), no de una constante.
6. **Pop up**: video embebido con `youtube-nocookie.com/embed/{videoId}?start={inicio}`, y `&end={fin}` solo si `fin` existe. El botón «Ver en YouTube» abre `https://youtu.be/{videoId}?t={inicio}`.
   - **Si `end` no funciona de forma fiable en el embed o complica el reproductor, se omite**: el video arranca en `inicio` y sigue hasta el final. En ese caso `fin` queda en el modelo como dato opcional sin uso en el front, y se anota en `pendientes-interfaz.md`. No se construye un control propio para cortar el video.
7. **Dos voces por caso.** Se busca y se retira toda suposición de dos testimonios por caso (drawer del caso, cierre del caso, mochila, textos como «dos voces»). El cierre de El festival muestra una sola tarjeta.

Pruebas del front que se adaptan (autorizado): las de tarjeta, pop up y cierre que usan años o enlace. Nuevas: tarjeta con y sin `contexto`, origen por caso y por actividad, URL del embed con `inicio` (y con `fin` si se mantiene).

## Fase 5 · Cierre

- Suites completas de ambos repos; `verificar_contenido_front.py` sin errores en `ruta` y `contenido`.
- Documentos: `integracion.md` (testimonio sin años, con `contexto`, video con tramo y origen por actividad; lista de lo provisional sin la fila de testimonios), `motor.md` (reglas TESTIMONIO por actividad), `pendientes-interfaz.md` (se cierran los pendientes de `b3-10`, `ma2-p06` y `ma2-p07`).
- `decisiones.md`: una viñeta por cada decisión de abajo.

## Decisiones del usuario

- 14 testimonios reales: 11 de la Central y 3 de actividades (`tb3-1`, `tb3-8`, `tb3-10`). El festival da uno solo (`tc4-1`); se elimina `tc4-2`.
- La ocupación de una voz de caso es una necesidad de ese caso; quien habla la ejerce, con dos excepciones aceptadas de estudiantes (Kyara en un caso y Joel en una actividad).
- Sin años de experiencia: una línea de contexto opcional los reemplaza.
- El video se reproduce embebido desde su segundo de inicio; el fin es opcional y se omite si complica el reproductor.
- Título y pista de una voz bloqueada no revelan la ocupación que hay que llamar.
- Las voces de actividad muestran su propio origen («Te la dejó la misión…»), no el de un caso.

## Preguntas abiertas

Ninguna. Documento listo para `/ajuste testimonios`.
