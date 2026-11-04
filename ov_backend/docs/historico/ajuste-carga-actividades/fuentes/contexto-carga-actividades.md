# Actividades informativas y batallas · contexto para `/ajuste carga-actividades`

Resultado de la sesión del 3 nov 2026 (cinco tandas). Los JSON de contenido (81 archivos) están en los zips `tandaN-actividades.zip` que descargó el usuario; aquí queda lo necesario para armar la spec del ajuste de carga. Archivos hermanos en el proyecto: `contenido_actividades.py` (tuplas del backend, las cinco tandas concatenadas), `challenges_actividades.ts` (9 entradas de `challenges.ts`), `personajes_actividades.json` (19 personajes nuevos para `catalogo.json`).

## 1. Qué se diseñó

Todas las actividades del estudiante (Bloques 0 a 5, ciudad y misiones adicionales) y las ocho del apoderado, sobre la premisa narrativa de la isla (Lumi, Helena, Iván, el pergamino) y las 31 fichas de `claude/fichas-plataforma.md`. Las informativas, los cuestionarios y las batallas están completas; los registros llevan su Momento 1 (diálogos de apertura y, donde la ruta base lo pide, las diapositivas con el contenido de la ficha) y las consignas en esqueleto, con `item` propuesto y ecos: su redacción final y criterios se definen al trabajar los registros.

## 2. Convenciones (cómo se referencian las cosas)

- Códigos de actividad: `b<bloque>-<n>` en el camino (`b0-1` … `b5-5`; opcionales `b2-6`, `b3-a`, `b3-b`, `b4-a`), `h-habilidades-1..4`, `h-inteligencias-1..5`, `h-intereses-1..6` y `h1`, `h2`, `h3` (misiones de Helena y sus registros de cierre), `investigador`, `investigador-cierre`, `feria`, `ma1` … `ma9` (más `ma7-b`), `p1` … `p8`. La clave de contenido del front es el código con `_` (`b0_1.json`), como ya hace `contenido()` en `ruta.py`.
- Bloques: `B0` Inicio, `B1` Mi historia y mis aspiraciones, `B2` Me conozco, `B3` Exploro el mundo profesional, `B4` Mis opciones, `B5` Mi decisión (`MISIONES_CAMPO`), `CIUDAD`, `FAMILIA` (apoderado), `LUMI`. Las misiones adicionales van en el bloque del registro que las revela (ma1–ma3 en B1, ma7 en B3, ma6/ma8/ma9 en B4) o en CIUDAD (ma4, ma5).
- Fichas: se referencian por código (`F01`…`F23`, `FP01`…`FP08`) en `recompensa.recursoIds` y en las reglas `FICHA`; dentro de la actividad no se enlazan (aparecen en la mochila al completar).
- Batallas: el JSON solo lleva `"desafio": "<id>"`; preguntas en `PREGUNTAS_BATALLA`, vidas/destellos/por intento en `CONFIGURACION_BATALLAS`. Estilo del repo: enunciado como situación o frase del enemigo, 4 opciones, una explicación válida al acertar o fallar, posición de la correcta variada. Pool ≥ 2× preguntas por intento; preguntas por intento ≥ vidas + destellos − 1 (ya verificado).
- Preguntas guardia (nodo `pregunta`): 2 a 3 por informativa según densidad, bloqueantes, con pista de Lumi (o del hablante en el apoderado) y `revelar_y_continuar`. Preguntas reactivas sin respuesta correcta: nodo `eleccion` con `registrar: false` y `reaccion`.
- Cierre narrativo de un registro: en api termina en la última consigna, así que va en `recompensa.mensajeFin` y la actividad siguiente arranca dándolo por hecho (no hay pantalla intermedia).
- `mapa.x/y` son provisionales; opcionales con `origen`; misiones adicionales con `origen` + `adicional: true`.

## 3. Cambios que las actividades asumen (van en la spec del ajuste)

1. **Campo `escenario` en el JSON** (solo front): `muelle`, `bosque`, `cabana`, `nevado`, `ciudad`, `desierto`, `bosque_volcan`, `playa`, `acantilado`, `faro`. Imagen `/images/background/<escenario>.png`; hoy `PlayerAmbient` recibe una imagen fija por pantalla (`forest.png`, `afueras.png`) y hay que leerla del contenido. Las del apoderado no llevan escenario ni mapa.
2. **Diapositivas en registros**: `NODOS_PERMITIDOS.registro` debe admitir `diapositiva` (Momento 1 de b1-1, b1-7, b2-3, b2-4, b4-1, b5-1 y varias MA). Aprobado por el usuario.
3. **Personajes**: `elena` → `helena` (catalogo.json, characters.ts, CharacterPortrait.tsx, JSON que lo usen); 19 nuevos en `personajes_actividades.json` con sus imágenes (asumidas); Aurelio cambia de ubicación al oasis.
4. **`datos/contenido.py`** nuevo, registrado en `CONJUNTOS`, con las tuplas de `contenido_actividades.py` (mismo formato que `ruta.py`), más las fichas de `claude/fichas-plataforma.md`. `h3` reemplaza a `t-contraste`; `b5-2` a `t-llegada`; `b0-3` a `t-partida`.
5. **Registro de los 81 JSON** en `contenidos.ts` con import explícito; retirar los `_dato_de_prueba` de `ruta` cuando se cargue el contenido real.
6. **Evaluadores que ya existen y se reutilizan**: `instrumentos_prioritarios` (apertura de B4), `planes_listos_para_comparar` (b4-5), `pasos_plan_a`. **Nuevo**: requisito de b3-4 (≥ 3 favoritos, uno fuera del tipo principal o de dos tipos distintos), análogo a `instituciones_tipos_distintos`.
7. **Eventos referenciados**: `COMPLETA_ACTIVIDAD`, `COMPLETA_BLOQUE`, `SUPERA_BATALLA`, `REVELA_RESULTADO`, `REGISTRO_ADECUADO`, `MARCA_FAVORITO`, y el de publicar entrevista (`PUBLICA_ENTREVISTA` en la tupla; alinear con el nombre real de B13) para `investigador-cierre`.
8. **Códigos provisionales a alinear**: conversaciones `CONV-1..6`; secciones de la tarjeta `TRAYECTO`, `REALIDAD`, `FODA`, `PASOS`; referencias de eco (`b1-1-gustos`, `h1-accion`, `b2-3-valores`, etc.) que dependen de los ítems de registro aún por definir; `OPCION_INICIAL`/`PLAN` sin fuente, como en `ruta.py`.
9. **Ficha FP08**: quitar la línea «Su hijo o hija también escribe una carta para usted… se entregan al completar las seis conversaciones». La carta es sorpresa en ambas direcciones: cada uno sabe que el otro leerá la suya, no cuándo, y nadie anuncia la que recibirá.
10. **Misiones de Helena partidas**: habilidades 4 × 6 ítems, inteligencias 5 (10, 10, 10, 9, 9 sobre 48; repartir igual si el total es otro), intereses 6 × 10; cada parte se abre con la anterior, la aplicación es una, la página se revela al completar todas; h1–h3 cuelgan de la última parte.
11. **Misión final partida**: `b5-4` La sala de la luz (termina con el pergamino sellado) y `b5-5` Mi informe de viaje (endgame). El informe se describe en general porque su estructura puede cambiar.
12. **Entradas de diario** que abren las actividades (nombre y actividad) están en `PREGUNTAS_DIARIO_TANDAn`; «Lo que me dijo Helena» queda por decidir si es una entrada común o una por instrumento.

## 4. Elenco

Lumi (`companero`), Helena (`helena`, antes `elena`), Iván, Mara (existente), Aurelio (existente, ahora en el oasis), Capitán Remo, Nico, Nadia la cartógrafa, el Guardián del pergamino (uno, aparece al cierre de cada tramo), Rosa (brigada del volcán), Dora (taberna), maestro Bruno (escuela), Sol (biblioteca), Ulises (práctico del puerto), Doña Cifra, Don Próspero el Feriante, Clotilde la prestamista, Alejandra (sobrina de Mara), el Eco, Teresa la vigía, Anselmo (investigador), Marina (feria), `orientacion` (apoderado). Enemigos de batalla: Aurelio (b1-5, ma2), Doña Cifra (b3-5, b3-b, ma7-b), el Feriante (b3-7), Clotilde (b3-9), el Eco (b4-4).

## 5. Inventario

T: I informativa, R registro, Q cuestionario, B batalla. Total 81 JSON: 9 batallas con 124 preguntas.

| Código | T | Título | Escenario | Personajes | Ficha | Estado del JSON | |
|---|---|---|---|---|---|---|---|
| b0-1 | I | Bienvenida: la vocación se construye | muelle | capitan | F01 | completa |  |
| b0-2 | I | Lo que siento al terminar el colegio y mi diario | bosque | Lumi |  | completa |  |
| b0-3 | Q | Mi punto de partida | cabana | helena |  | completa |  |
| b0-4 | I | ¿Tienes una opción en mente? | bosque | Lumi |  | completa |  |
| b0-5 | I | Decidir con información: el caso de Alejandra | bosque | mara | F02 | completa |  |
| b0-6 | I | Dudar también es avanzar | bosque | nico | F03 | completa |  |
| b1-1 | R | Mi historia personal | nevado | cartografa | F04 | Momento 1 + esqueleto |  |
| b1-2 | I | Mis deseos para el futuro | nevado | cartografa |  | completa |  |
| b1-3 | R | Lo que esperan de mí | ciudad | ivan |  | Momento 1 + esqueleto |  |
| b1-4 | I | Mitos sobre el futuro profesional | desierto | aurelio | F05 | completa |  |
| b1-5 | B | Batalla: el puente de los mitos | desierto | aurelio |  | desafío desafio-puente-mitos |  |
| b1-6 | R | Mi postura frente a los mitos | desierto | aurelio |  | apertura + esqueleto |  |
| b1-7 | R | Mi línea de tiempo | desierto | guardian | F06 | Momento 1 + esqueleto |  |
| b2-1 | I | Las habilidades sociales | bosque_volcan | rosa | F08 | completa |  |
| b2-2 | I | Muchas formas de ser inteligente | bosque_volcan | rosa | F09 | completa |  |
| b2-3 | R | Lo que valoro en un trabajo | bosque_volcan | rosa |  | Momento 1 + esqueleto |  |
| b2-4 | R | Lo que se me da bien y lo que me cuesta | bosque_volcan | nico |  | Momento 1 + esqueleto |  |
| b2-5 | I | Intereses y ambientes de trabajo | bosque_volcan | rosa, guardian | F10 | completa |  |
| b2-6 | R | Cómo me describo | bosque_volcan | Lumi |  | apertura + esqueleto | opcional |
| h1 | R | Mi plan para fortalecer una habilidad | ciudad | dora |  | apertura + esqueleto | opcional |
| h2 | R | ¿Me reconozco en mis inteligencias? | ciudad | maestro |  | apertura + esqueleto | opcional |
| h3 | R | Lo que dicen mis intereses | ciudad | bibliotecaria |  | apertura + esqueleto | opcional |
| h-habilidades-1 | Q | Misión de Helena: Mi comportamiento con los demás, 1 de 4 | ciudad | dora |  | completa | opcional |
| h-habilidades-2 | Q | Misión de Helena: Mi comportamiento con los demás, 2 de 4 | ciudad | dora |  | completa | opcional |
| h-habilidades-3 | Q | Misión de Helena: Mi comportamiento con los demás, 3 de 4 | ciudad | dora |  | completa | opcional |
| h-habilidades-4 | Q | Misión de Helena: Mi comportamiento con los demás, 4 de 4 | ciudad | dora |  | completa | opcional |
| h-inteligencias-1 | Q | Misión de Helena: Explorando mis inteligencias, 1 de 5 | ciudad | maestro |  | completa | opcional |
| h-inteligencias-2 | Q | Misión de Helena: Explorando mis inteligencias, 2 de 5 | ciudad | maestro |  | completa | opcional |
| h-inteligencias-3 | Q | Misión de Helena: Explorando mis inteligencias, 3 de 5 | ciudad | maestro |  | completa | opcional |
| h-inteligencias-4 | Q | Misión de Helena: Explorando mis inteligencias, 4 de 5 | ciudad | maestro |  | completa | opcional |
| h-inteligencias-5 | Q | Misión de Helena: Explorando mis inteligencias, 5 de 5 | ciudad | maestro |  | completa | opcional |
| h-intereses-1 | Q | Misión de Helena: Mis intereses, 1 de 6 | ciudad | bibliotecaria |  | completa | opcional |
| h-intereses-2 | Q | Misión de Helena: Mis intereses, 2 de 6 | ciudad | bibliotecaria |  | completa | opcional |
| h-intereses-3 | Q | Misión de Helena: Mis intereses, 3 de 6 | ciudad | bibliotecaria |  | completa | opcional |
| h-intereses-4 | Q | Misión de Helena: Mis intereses, 4 de 6 | ciudad | bibliotecaria |  | completa | opcional |
| h-intereses-5 | Q | Misión de Helena: Mis intereses, 5 de 6 | ciudad | bibliotecaria |  | completa | opcional |
| h-intereses-6 | Q | Misión de Helena: Mis intereses, 6 de 6 | ciudad | bibliotecaria |  | completa | opcional |
| b3-1 | I | Caminos después del colegio | playa | practico | F11 | completa |  |
| b3-10 | I | Caminos que no van en línea recta | playa | alejandra, guardian | F17 | completa |  |
| b3-2 | I | Mis intereses en el catálogo | playa | practico | F12 | completa |  |
| b3-3 | I | El mercado laboral | playa | cifra | F13 | completa |  |
| b3-4 | R | Lo que no sabía del mercado | playa | Lumi |  | apertura + esqueleto |  |
| b3-5 | B | Batalla: el mercado y las rutas | playa | cifra |  | desafío desafio-cifra |  |
| b3-6 | I | Elegir una institución | playa | feriante | F14 | completa |  |
| b3-7 | B | Batalla de las instituciones | playa | feriante |  | desafío desafio-feriante |  |
| b3-8 | I | Cuánto cuesta estudiar | playa | prestamista | F16 | completa |  |
| b3-9 | B | Batalla de los costos | playa | prestamista |  | desafío desafio-prestamista |  |
| b3-a | R | Lo que aprendí de una trayectoria | playa | Lumi |  | apertura + esqueleto | opcional |
| b3-b | B | Batalla de las rutas (repaso) | playa | cifra |  | desafío desafio-cifra-rutas | opcional |
| b4-1 | R | Mi perfil y mis carreras afines | acantilado | helena | F19 | Momento 1 + esqueleto |  |
| b4-2 | R | Mis criterios para decidir | acantilado | Lumi |  | Momento 1 + esqueleto |  |
| b4-3 | I | Tres rutas sobre la mesa | acantilado | ivan |  | completa |  |
| b4-4 | B | Batalla: decidir con criterio | acantilado | eco |  | desafío desafio-eco |  |
| b4-5 | R | Comparo mis planes | acantilado | ivan, guardian |  | apertura + esqueleto |  |
| b4-a | R | Lo que otros ven en mí | acantilado | helena |  | apertura + esqueleto | opcional |
| b5-1 | R | Mi proyecto vocacional | faro | vigia | F21 | Momento 1 + esqueleto |  |
| b5-2 | Q | Mi punto de llegada | faro | Lumi |  | completa |  |
| b5-3 | R | Mirar el camino | faro | Lumi |  | apertura + esqueleto |  |
| b5-4 | I | La sala de la luz | faro | helena |  | completa |  |
| b5-5 | I | Mi informe de viaje | faro | helena |  | completa |  |
| feria | I | La feria vocacional | ciudad | organizadora | F22 | completa | opcional |
| investigador | I | Misión del investigador: necesita tu ayuda | ciudad | investigador | F18 | completa | opcional |
| investigador-cierre | I | El investigador agradece | ciudad | investigador |  | completa | opcional |
| ma1 | I | Carta al niño que fui | nevado | cartografa |  | completa | opcional |
| ma2 | B | Batalla: profesiones sin género | desierto | aurelio |  | desafío desafio-aurelio-genero | opcional |
| ma3 | R | De la meta a los pasos | desierto | guardian |  | apertura + esqueleto | opcional |
| ma4 | R | El reto de la semana | ciudad | dora |  | apertura + esqueleto | opcional |
| ma5 | I | Ocupaciones nuevas y emprender | ciudad | ivan | F23 | completa | opcional |
| ma6 | R | Dos mundos | acantilado | helena |  | apertura + esqueleto | opcional |
| ma7 | I | Más allá del promedio | playa | cifra |  | completa | opcional |
| ma7-b | B | Batalla: más allá del promedio | playa | cifra |  | desafío desafio-cifra-brechas | opcional |
| ma8 | R | El abogado del diablo | acantilado | eco |  | apertura + esqueleto | opcional |
| ma9 | R | Mi presupuesto real | acantilado | ivan |  | apertura + esqueleto | opcional |
| p1 | I | Acompañar no es decidir | — | orientacion | FP01 | completa |  |
| p2 | I | Mis expectativas y temores | — | orientacion | FP02 | completa |  |
| p3 | I | Acompañar o presionar | — | orientacion | FP03 | completa |  |
| p4 | I | El sueño del chef | — | orientacion | FP04 | completa |  |
| p5 | I | El panorama de hoy | — | orientacion | FP05 | completa |  |
| p6 | I | Cómo conversar con mi hijo | — | orientacion | FP06 | completa |  |
| p7 | I | Cuando mi hijo duda o cambia de opinión | — | orientacion | FP07 | completa |  |
| p8 | I | Mi carta para mi hijo | — | orientacion | FP08 | completa |  |
