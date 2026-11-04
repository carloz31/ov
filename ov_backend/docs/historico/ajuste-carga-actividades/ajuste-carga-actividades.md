# Ajuste · carga-actividades

Carga del contenido real de la plataforma en un conjunto nuevo `contenido`: las actividades del estudiante (Bloques 0 a 5, ciudad y misiones adicionales), las del apoderado, las 31 fichas, las batallas y **las reglas de desbloqueo definitivas** de todo eso. Lo que aún no tiene contenido real (registros, casos, testimonios, conversaciones, diario, logros) entra como provisional para que la plataforma se pueda recorrer de punta a punta.

Fuentes en el proyecto: `claude/actividades/contexto-carga-actividades.md` (convenciones e inventario), `claude/actividades/contenido_actividades.py` (tuplas por tanda), `claude/actividades/challenges_actividades.ts`, `claude/actividades/personajes_actividades.json`, `claude/fichas-plataforma.md` y los 81 JSON de los zips `tandaN-actividades.zip`. **Donde este documento y esas fuentes choquen, gana este documento** (sobre todo en reglas: las de `contenido_actividades.py` son borradores y aquí se corrigen).

## Criterio general

- **Dos conjuntos.** `ruta` queda congelado como banco de pruebas de mecánicas: no se borra, no pierde sus `DATO DE PRUEBA` y las pruebas existentes siguen contra él sin cambios por contenido. `contenido` es el conjunto real: el que se despliega y con el que se hace la prueba manual. Los dos cargan `fijos` (instrumentos, secciones, catálogo).
- **Un solo cargador.** Las funciones que hoy interpretan las tuplas dentro de `ruta.py` pasan a un módulo común; `ruta.py` y `contenido.py` quedan como datos puros con la misma forma.
- **Provisionales explícitos.** Lo que `contenido` toma de `ruta` va en una lista `PROVISIONALES` (qué tupla, de dónde y qué ajuste lo reemplaza). Los ítems de registro provisionales llevan `PENDIENTE` en el comentario. Nada provisional se mezcla sin marca.
- **Los JSON de actividad no cambian.** Los 81 de `contenidos/plataforma/` conservan su flujo tal cual: diálogos, ecos, podios, elecciones y referencias a otras secciones. El backend y el resto del front se adaptan a ellos. Las únicas ediciones permitidas son la de recompensas y los textos de favoritos de `b3-2` y `b3-4` (fase 4). Si un JSON no calza con un validador o un tipo de nodo, se detiene y se informa; no se corrige el JSON.
- **Mecánica primero.** Cada cambio de motor o de front que el contenido necesita se prueba con una actividad mínima en `ruta` antes de usarse en `contenido`.

## Fase 1 · Cambios de mecánica

Cuatro, nada más:

1. **Campo `escenario` en el JSON de actividad** (solo front): `muelle`, `bosque`, `cabana`, `nevado`, `ciudad`, `desierto`, `bosque_volcan`, `playa`, `acantilado`, `faro`. Imagen `/images/background/<escenario>.png`. Hoy `PlayerAmbient` recibe una imagen fija por pantalla; pasa a leerla del contenido, con la imagen actual como respaldo si falta el campo. Las actividades del apoderado no lo llevan. Se agrega `escenario` a un JSON de `ruta` para la prueba.
2. **Diapositivas en registros**: `NODOS_PERMITIDOS.registro` admite `diapositiva` (Momento 1 de b1-1, b1-7, b2-3, b2-4, b4-1, b5-1 y varias MA). Un registro de `ruta` (`t-valores`) suma una diapositiva y su prueba.
3. **`elena` → `helena`** en `catalogo.json`, `characters.ts`, `CharacterPortrait.tsx` y todo JSON que lo use. Se adaptan las pruebas del front que nombran a `elena` (este documento lo autoriza).

4. **Eco de diálogo en lista y en registros** (ampliación de F03): 13 registros ponen su `eco` en un nodo `dialogo` y algunos con una lista (`h3-02`, `b5-1-06`). `NodoDialogo.eco` pasa a `ID | ID[]`, como el de la consigna; el diálogo cita cada código en orden tras su texto (los que no tienen dato se omiten; sin ninguno, solo el texto). Los registros resuelven sus diálogos con eco con las referencias que ya piden, sin segunda petición. Prueba en `ruta`: `t_eco.json` suma un diálogo con eco de lista.

No cambia el modelo de datos. Las misiones de Helena partidas **no** son cambio de mecánica: ya funciona en `ruta` (`t-mision-intereses` 1–30 y `-2` 31–60; el resultado espera a todas las actividades de la aplicación). En `contenido` es solo dato.

## Fase 2 · Cargador común

- Las funciones `_cargar_*`, `_unir_*`, `_validar_*`, `_insertar_en_orden` y `contenido()` de `ruta.py` pasan a un módulo de `datos/` (nombre libre, p. ej. `datos/cargador.py`) que recibe el módulo de tuplas. `ruta.cargar` y `contenido.cargar` lo llaman con su propio módulo.
- Una tupla que un conjunto no declara se trata como vacía (`contenido` no tiene `CARRERAS_RUTA`, `TIPOS_CARRERA`, etc.).
- Criterio de aceptación: `ruta` carga exactamente igual que antes; la suite actual en verde sin tocar una sola prueba.
- `CONJUNTOS = {'ruta': ruta.cargar, 'contenido': contenido.cargar}`.

## Fase 3 · `datos/contenido.py`

Contenido real, sin `DATO DE PRUEBA` salvo los provisionales. Encabezado: «Contenido real de la plataforma. Lo provisional está en `PROVISIONALES`».

### 3.1 Bloques

| Código | Nº | Nombre | Espacio | Audiencia |
|---|---|---|---|---|
| B0 | 1 | Inicio | MISIONES_CAMPO | ESTUDIANTE |
| B1 | 2 | Mi historia y mis aspiraciones | MISIONES_CAMPO | ESTUDIANTE |
| B2 | 3 | Me conozco | MISIONES_CAMPO | ESTUDIANTE |
| B3 | 4 | Exploro el mundo profesional | MISIONES_CAMPO | ESTUDIANTE |
| B4 | 5 | Mis opciones | MISIONES_CAMPO | ESTUDIANTE |
| B5 | 6 | Mi decisión | MISIONES_CAMPO | ESTUDIANTE |
| CIUDAD | 7 | La ciudad | CIUDAD | ESTUDIANTE |
| LUMI | 8 | La historia de Lumi | LUMI | ESTUDIANTE |
| FAMILIA | 1 | Actividades para familias | PORTAL_FAMILIA | APODERADO |

`NUMERO_BLOQUE_OPCION_INICIAL = 2` sigue valiendo: la opción inicial se fija antes de completar B1. `BLOQUE_ANUNCIADO = 'CIUDAD'` también.

### 3.2 Actividades, descripciones y propiedades

Las de las cinco tandas de `contenido_actividades.py`, concatenadas en el orden del inventario (el orden de la tupla es el orden dentro del bloque). Correcciones:

- `investigador-cierre` es INFORMATIVA (en `ruta` es REGISTRO; aquí manda el contenido).
- Descripción de `b3-2` (tupla del backend): quitar «Al salir, marca al menos tres favoritos». En los JSON de `b3-2` y `b3-4` se editan solo las líneas que presentan los favoritos como requisito, para que inviten a marcarlos sin exigirlos (excepción autorizada; ver fase 4).

**Requeridas**: todas las de B0–B5 salvo las opcionales de abajo, y todas las de FAMILIA. **Opcionales** (`requerida: False`): todas las de CIUDAD; `b2-6`, `b3-a`, `b3-b`, `b4-a` y `ma1`–`ma9` (con `ma7-b`), estas con `visibilidad: AL_DESBLOQUEAR`; `h1`–`h3` e `investigador-cierre` también `AL_DESBLOQUEAR`. Una opcional nunca es requisito de una requerida.

### 3.3 Misiones de Helena

| Misiones | Instrumento | Ítems | Reparto |
|---|---|---|---|
| `h-habilidades-1..4` | TEST-HABILIDADES (24) | 1–6, 7–12, 13–18, 19–24 | 4 × 6 |
| `h-inteligencias-1..5` | TEST-INTELIGENCIAS (35) | 1–7, 8–14, 15–21, 22–28, 29–35 | 5 × 7 |
| `h-intereses-1..6` | TEST-RIASEC (60) | 1–10 … 51–60 | 6 × 10 |
| `b0-3` / `b5-2` | TEST-PARTIDA-LLEGADA (19) | 1–19 | APL-PARTIDA / APL-LLEGADA |

El borrador de la tanda 2 reparte inteligencias sobre 48 ítems: queda obsoleto (el test vigente tiene 35). Títulos «1 de 5» etc. sin cambio.

### 3.4 Fichas

Las 31 de `claude/fichas-plataforma.md`, en el formato de `FICHAS`: (código, título, descripción, tema, contenido en markdown sin repetir el título, audiencia). F01–F23 ESTUDIANTE, FP01–FP08 APODERADO.

- **Tema**: el de la tabla de abajo (aprobado).
- **FP08**: quitar la línea «Su hijo o hija también escribe una carta para usted… se entregan al completar las seis conversaciones». Nadie anuncia la carta que recibirá.
- Una regla FICHA por ficha (3.7).

| Ficha | Tema | | Ficha | Tema |
|---|---|---|---|---|
| F01–F03 | Decidir mi futuro | | F11 | Rutas después del colegio |
| F04, F06 | Proyecto de vida | | F12–F13 | Mundo laboral |
| F05 | Mitos y creencias | | F14–F16 | Instituciones y costos |
| F07–F10 | Autoconocimiento | | F17–F23 | Mis opciones |
| FP01–FP08 | Acompañar a mi hijo | | | |

### 3.5 Batallas

`PREGUNTAS_BATALLA` y `CONFIGURACION_BATALLAS` de las tandas 1, 3 y 4 (b1-5, b3-5, b3-7, b3-9, b3-b, b4-4, ma2, ma7-b; 9 desafíos, 124 preguntas con `challenges_actividades.ts`). Ya cumplen pool ≥ 2 × preguntas por intento y preguntas ≥ vidas + destellos − 1; el cargador lo vuelve a validar.

- **Toda ficha de la que sale una pregunta se obtiene antes de que la batalla se abra** (la batalla asume que el estudiante ya tiene la ficha del tema). Revisado: se cumple en todas salvo `b4-4`, que pregunta sobre F20 y en el borrador F20 se obtenía al superarla. F20 pasa a desbloquearse con `b4-2` (3.7).
- `ma2-p06` y `ma2-p07` nombran los testimonios T02 y T08, que aún no existen: se cargan igual y se revisan en el ajuste de testimonios (anotar en `pendientes`).

### 3.6 Registros provisionales y referencias

Los registros tienen apertura y consignas en esqueleto, con sus ecos y referencias ya planteados. El backend se acomoda a ese flujo para que se puedan completar sin tocar el JSON:

- **Ítems**: uno por cada campo `item` de los nodos de los JSON de registro, con el código que propone el JSON y **del tipo que pide su nodo**: texto libre para `consigna`, elección para `eleccion` y `podio` (u otro nodo que escriba una elección). Obligatorios y **sin criterios** (pasan por longitud, sin LLM). Comentario `PENDIENTE: se define en el ajuste de registros`.
- **Listas provisionales**: las opciones de cada elección o podio se toman del propio JSON (o de la lista que nombre) y se cargan como listas en `contenido.py`, marcadas `PENDIENTE`. Los podios de `b2-3` y `b4-2` no traen opciones propias: se usan las de la diapositiva de cada JSON (9 valores en `b2-3-lista-valores`; 9 criterios en `b4-2-lista-criterios`, con texto = lo que va antes de «:»). Códigos de opción derivados de la etiqueta (MAYÚSCULAS, sin tildes, guion bajo). Podio = elección ordenada de exactamente 3, sin «otra», salvo que el nodo diga otra cosa. En el ajuste de registros se revisa si los podios deben admitir «otra».
- **Referencias: se cargan todas las que usan los JSON**, de cualquier tipo:
  - TEXTO y ELECCION hacia ítems de otro registro (`b1-1-gustos`, `h1-accion`, `h2-no-refleja`, `b2-4-bien`, `b2-3-valores`, `b4-2-criterios`, `b1-7-hitos`, etc.);
  - las de otras secciones: RESULTADO, COINCIDENCIAS, FAVORITOS, PLAN, PLANES, PASOS_PLAN_A, OPCION_INICIAL;
  - RESPUESTA_CUESTIONARIO con el formato real `('APL-PARTIDA', 'AUTO-NN')`: `b3-8` → `AUTO-12` (el borrador decía «C4»), `b4-2` → `AUTO-13` (decía «D1»).
  La lista de referencias sale de los JSON (cada eco o precarga nombra la suya), contrastada con las `REFERENCIAS` de los borradores; donde difieran, manda el JSON.
- Ningún eco, podio ni elección se quita. Cuando se defina cada registro, sus ítems ganan criterios y sus listas pasan a ser las definitivas; el JSON solo cambia si el usuario lo decide en ese ajuste.
- `REGISTRO_ADECUADO` funciona con ítems sin criterios, así que las misiones adicionales se pueden abrir.
- `SALON_ACTIVIDADES_PRIORITARIAS`: `('5A', 'b1-3')`, provisional.

### 3.7 Reglas de desbloqueo

#### Principios (van a `docs/sistema/motor.md`, sección de datos)

1. **El tramo se abre con la última requerida del anterior.** Cada bloque del camino B1–B5 tiene una regla `BLOQUE` con `COMPLETA_BLOQUE` del bloque anterior. El motor registra COMPLETA_BLOQUE en el momento en que se completa la última actividad requerida del bloque (las opcionales no cuentan), así que es exactamente «la última requerida abre el siguiente» y no hay que reescribir la regla si cambia cuál es la última. B0 no tiene regla (abierto desde el inicio).
2. **La primera actividad de un tramo no lleva regla propia**: queda disponible al abrirse su bloque. Solo la lleva si pide algo más que el bloque (b5-1). Se eliminan las reglas duplicadas del borrador (`R-b1-1`, `R-b2-1`, `R-b3-1`, `R-b4-1`).
3. **Dentro del tramo, cadena lineal**: cada requerida pide la requerida anterior; COMPLETA_ACTIVIDAD, o SUPERA_BATALLA si la anterior es una batalla.
4. **Opcionales**: se abren con su disparador y nunca son requisito de una requerida. Las misiones adicionales, con `REGISTRO_ADECUADO` del registro que las premia.
5. **Ciudad**: todo opcional; las misiones de Helena se encadenan parte por parte; la primera parte se abre con la informativa del camino que presenta el tema.
6. **Evaluadores**: una regla con evaluador lleva también las condiciones cuyos eventos deben reevaluarla (p. ej. `ACTUALIZA_PLAN` en las de planes); si no, la regla no vuelve a evaluarse cuando el estudiante cambia sus planes.
7. **Todo objetivo cargado tiene al menos una regla**, salvo los abiertos desde el inicio a propósito: B0, b0-1, LUMI (sus actividades sí tienen regla), FAMILIA y p1. Un objetivo sin regla está disponible desde el principio.
8. Varias reglas sobre el mismo objetivo son alternativas (basta una); las condiciones de una regla se suman.

#### Camino del estudiante

| Objetivo | Condiciones | Mensaje de bloqueo |
|---|---|---|
| **B0** | — | — |
| b0-1 | — | — |
| b0-2 | COMPLETA_ACTIVIDAD b0-1 | Primero conoce a Lumi en el muelle. |
| b0-3 | COMPLETA_ACTIVIDAD b0-2 | Sube por el bosque hasta la cabaña de Helena. |
| b0-4 | COMPLETA_ACTIVIDAD b0-3 | Helena todavía no te ha recibido. |
| b0-5 | COMPLETA_ACTIVIDAD b0-4 | Pasa primero por la piedra de los caminos. |
| b0-6 | COMPLETA_ACTIVIDAD b0-5 | Mara tiene algo que contarte antes. |
| **B1** | COMPLETA_BLOQUE B0 | Pasa por el campamento de Nico para subir al nevado. |
| b1-2 | COMPLETA_ACTIVIDAD b1-1 | Nadia necesita tu punto de origen antes del mirador. |
| b1-3 | COMPLETA_ACTIVIDAD b1-2 | Baja del nevado para llegar a la ciudad. |
| b1-4 | COMPLETA_ACTIVIDAD b1-3 | Iván tiene que calibrar el artefacto primero. |
| b1-5 | COMPLETA_ACTIVIDAD b1-4 | Escucha a Aurelio en el oasis antes de cruzar el puente. |
| b1-6 | SUPERA_BATALLA b1-5 | Cruza el puente de los mitos. |
| b1-7 | COMPLETA_ACTIVIDAD b1-6 | Toma postura frente a los mitos antes de seguir. |
| **B2** | COMPLETA_BLOQUE B1 | Responde al guardián del desierto para entrar al bosque del volcán. |
| b2-2 | COMPLETA_ACTIVIDAD b2-1 | Rosa quiere verte pasar su prueba primero. |
| b2-3 | COMPLETA_ACTIVIDAD b2-2 | Ayuda con el reparto de tareas antes. |
| b2-4 | COMPLETA_ACTIVIDAD b2-3 | Ordena lo que valoras antes de pasar por el taller. |
| b2-5 | COMPLETA_ACTIVIDAD b2-4 | Nico te espera en el taller. |
| **B3** | COMPLETA_BLOQUE B2 | Haz la ronda de los seis refugios para bajar al puerto. |
| b3-2 | COMPLETA_ACTIVIDAD b3-1 | Ulises te espera en los embarcaderos. |
| b3-3 | COMPLETA_ACTIVIDAD b3-2 | Pasa por la sala del atlas primero. |
| b3-4 | COMPLETA_ACTIVIDAD b3-3 | Escucha a Doña Cifra en el mercado. |
| b3-5 | COMPLETA_ACTIVIDAD b3-4 | Anota qué dato te sorprendió antes de enfrentar a Doña Cifra. |
| b3-6 | SUPERA_BATALLA b3-5 | Cierra el puesto de Doña Cifra. |
| b3-7 | COMPLETA_ACTIVIDAD b3-6 | Escucha al Feriante en el malecón. |
| b3-8 | SUPERA_BATALLA b3-7 | Desmonta el stand del Faro Dorado. |
| b3-9 | COMPLETA_ACTIVIDAD b3-8 | Pasa por la caseta de Clotilde. |
| b3-10 | SUPERA_BATALLA b3-9 | Cierra la caseta de Clotilde. |
| **B4** | COMPLETA_BLOQUE B3 + REVELA_RESULTADO (sin referencia); evaluador `instrumentos_prioritarios` | Escucha a Alejandra en el malecón y abre en el libro de Helena tu punto de partida y las páginas que marcó tu orientadora. |
| b4-2 | COMPLETA_ACTIVIDAD b4-1 | Primero el cuadro de afinidad con Helena. |
| b4-3 | COMPLETA_ACTIVIDAD b4-2 | Escribe tus criterios antes de poner las rutas sobre la mesa. |
| b4-4 | COMPLETA_ACTIVIDAD b4-3 | Iván te espera en la mesa de mapas. |
| b4-5 | SUPERA_BATALLA b4-4 + ACTUALIZA_PLAN; evaluador `planes_listos_para_comparar` (2) | Calla al Eco y deja listos «Por qué» y «Qué tan real es» en al menos dos planes. |
| **B5** | COMPLETA_BLOQUE B4 | Compara tus planes para bajar al faro. |
| b5-1 | COMPLETA_BLOQUE B4 + ACTUALIZA_PLAN; evaluador `pasos_plan_a` (1) | Registra al menos un paso en tu Plan A para escribir tu proyecto con la vigía. |
| b5-2 | COMPLETA_ACTIVIDAD b5-1 | Escribe tu proyecto con la vigía. |
| b5-3 | COMPLETA_ACTIVIDAD b5-2 | Responde tu punto de llegada. |
| b5-4 | COMPLETA_ACTIVIDAD b5-3 | Mira el camino desde el balcón antes de subir. |
| b5-5 | COMPLETA_ACTIVIDAD b5-4 | Sube a la sala de la luz. |

Últimas requeridas por tramo: b0-6, b1-7, b2-5, b3-10, b4-5, b5-5.

#### Opcionales del camino y misiones adicionales

| Objetivo | Condiciones | Mensaje |
|---|---|---|
| b2-6 | COMPLETA_ACTIVIDAD b2-5 | Se abre al terminar la ronda de los refugios. |
| b3-a | COMPLETA_ACTIVIDAD b3-10 | Se abre al escuchar a Alejandra. |
| b3-b | SUPERA_BATALLA b3-5 | Se abre al cerrar el puesto de Doña Cifra. |
| b4-a | COMPLETA_ACTIVIDAD b4-5 | Se abre al comparar tus planes. |
| ma1 | REGISTRO_ADECUADO b1-1 | Cuenta tu historia con ejemplos. |
| ma2 | REGISTRO_ADECUADO b1-6 | Toma postura frente a un mito. |
| ma3 | REGISTRO_ADECUADO b1-7 | Escribe hitos de verdad en tu línea de tiempo. |
| ma6 | REGISTRO_ADECUADO b4-1 | Completa el cuadro de afinidad. |
| ma7 | REGISTRO_ADECUADO b3-4 | Anota qué dato del mercado te sorprendió. |
| ma7-b | COMPLETA_ACTIVIDAD ma7 | Escucha a Doña Cifra sobre las brechas. |
| ma8 | REGISTRO_ADECUADO b4-2 | Escribe tus criterios. |
| ma9 | REGISTRO_ADECUADO b4-5 | Compara tus planes. |

#### Ciudad

| Objetivo | Condiciones | Mensaje |
|---|---|---|
| **CIUDAD** (bloque) | COMPLETA_ACTIVIDAD b1-3 | Baja del nevado con Iván para llegar a la ciudad. |
| h-habilidades-1 | COMPLETA_ACTIVIDAD b2-1 | Rosa te dirá quién conserva estas preguntas. |
| h-habilidades-2..4 | COMPLETA_ACTIVIDAD de la parte anterior | Primero la visita anterior a Dora. |
| h-inteligencias-1 | COMPLETA_ACTIVIDAD b2-2 | Primero el reparto de tareas con Rosa. |
| h-inteligencias-2..5 | COMPLETA_ACTIVIDAD de la parte anterior | Primero la clase anterior del maestro Bruno. |
| h-intereses-1 | COMPLETA_ACTIVIDAD b2-5 | Primero la ronda de los seis refugios. |
| h-intereses-2..6 | COMPLETA_ACTIVIDAD de la parte anterior | Primero el estante anterior de Sol. |
| h1 | REVELA_RESULTADO APL-HABILIDADES | Rompe el sello de tu página de habilidades en el libro de Helena. |
| h2 | REVELA_RESULTADO APL-INTELIGENCIAS | Rompe el sello de tu página de inteligencias. |
| h3 | REVELA_RESULTADO APL-RIASEC | Rompe el sello de tu página de intereses. |
| ma4 | REGISTRO_ADECUADO h1 | Elige una habilidad y una acción concreta con Dora. |
| ma5 | REGISTRO_ADECUADO h3 | Contrasta tus intereses con Sol. |
| feria | COMPLETA_ACTIVIDAD b3-6 | Se abre al pasar por la feria del malecón. |
| investigador | COMPLETA_ACTIVIDAD b3-10 | Se abre al cerrar el puerto. |
| investigador-cierre | PUBLICA_ENTREVISTA | Publica una entrevista para que Anselmo vuelva. |

(La regla de `CIUDAD` es de tipo `BLOQUE`, como `R-CIUDAD` en `ruta`; el borrador la ponía como sección y no existe esa sección.)

#### Secciones y tarjeta de plan

| Objetivo | Condiciones | Mensaje |
|---|---|---|
| SECCION DIARIO | COMPLETA_ACTIVIDAD b0-2 | Lumi te abre el diario en el bosque de las voces. |
| SECCION CATALOGO | COMPLETA_ACTIVIDAD b0-4 | Lumi te muestra el catálogo en la piedra de los caminos. |
| SECCION PLANES | COMPLETA_ACTIVIDAD b0-4 | Lumi te explica los planes en la piedra de los caminos. |
| SECCION CHECK_IN | COMPLETA_ACTIVIDAD b0-6 | El check-in se abre al cerrar el primer tramo. |
| SECCION FAMILIA | COMPLETA_ACTIVIDAD b1-3 | Tu sección de familia se abre al llegar a la ciudad. |
| SECCION INVESTIGACIONES | COMPLETA_ACTIVIDAD investigador | Anselmo te explica cómo investigar. |
| SECCION_PLAN POR_QUE | COMPLETA_ACTIVIDAD b0-4 | Lumi te explica los planes en la piedra de los caminos. |
| SECCION_PLAN CONOCIMIENTO | COMPLETA_ACTIVIDAD b3-2 | Aprende a leer una ficha del catálogo en la sala del atlas. |
| SECCION_PLAN REALIDAD | COMPLETA_ACTIVIDAD b3-8 | Conoce lo que cuesta estudiar en la caseta de Clotilde. |
| SECCION_PLAN PASOS | COMPLETA_ACTIVIDAD b4-5 | Compara tus planes para definir tus pasos. |

CATALOGO abre junto con PLANES porque un plan solo se crea desde una carrera favorita. Las secciones de la tarjeta usan los códigos reales (`POR_QUE`, `CONOCIMIENTO`, `REALIDAD`, `PASOS`); el borrador usaba `TRAYECTO` y `FODA`, que no existen. REALIDAD abre antes de b4-5 (su evaluador la necesita lista en dos planes) y PASOS antes de b5-1.

#### Fichas

| Ficha | Se obtiene al | | Ficha | Se obtiene al |
|---|---|---|---|---|
| F01 | completar b0-1 | | F13 | completar b3-3 |
| F02 | completar b0-5 | | F14, F15 | completar b3-6 |
| F03 | completar b0-6 | | F16 | completar b3-8 |
| F04 | completar b1-1 | | F17 | completar b3-10 |
| F05 | completar b1-4 | | F18 | completar investigador |
| F06 | completar b1-7 | | F19 | completar b4-1 |
| F07, F08 | completar b2-1 | | F20 | completar b4-2 (antes de la batalla b4-4) |
| F09 | completar b2-2 | | F21 | completar b5-1 |
| F10 | completar b2-5 | | F22 | completar feria |
| F11 | completar b3-1 | | F23 | completar ma5 |
| F12 | completar b3-2 | | FP0n | completar pn |

Mensaje: el del borrador (narrativo, nombra el lugar), p. ej. «Conoce a Lumi en el muelle.». Para F20: «Escribe tus criterios en el acantilado.». Qué ficha entrega cada actividad lo deciden estas reglas del backend, no el JSON (ver «Recompensas» en la fase 4).

#### Apoderado

| Objetivo | Condiciones | Mensaje |
|---|---|---|
| FAMILIA (bloque), p1 | — | — |
| p2 … p8 | COMPLETA_ACTIVIDAD de la anterior | Complete la actividad anterior. |
| SECCION CONVERSACIONES | COMPLETA_BLOQUE FAMILIA | Complete su ruta de actividades. |

#### Familia: carta primero y conversaciones progresivas

Se conserva tal cual lo implementado en B12/F08; este ajuste solo pone los datos:

- Al entrar a la sección (estudiante: FAMILIA, abierta en b1-3; apoderado: CONVERSACIONES, abierta al completar su ruta) lo primero es escribir su carta. Sin carta propia, ninguna conversación está disponible para nadie.
- Con la carta escrita, el apoderado tiene todas las conversaciones; el estudiante, solo las que le abren sus reglas `CONVERSACION`, y cada una pide `ESCRIBE_CARTA` + su actividad del camino. Así aparecen progresivamente a medida que avanza; las aún cerradas muestran su requisito (`bloqueo_mensaje`), como en F08.
- Toda regla `CONVERSACION` de `contenido` lleva `ESCRIBE_CARTA`; la fase 5 lo comprueba.
- Las cartas se entregan cuando están conversadas **todas** las conversaciones del catálogo: con las dos provisionales, la entrega ocurre tras la segunda. Al cargar las seis reales, la entrega pasa a la sexta sin cambiar código.

#### Reglas del borrador que no se cargan

`R-b1-1`, `R-b2-1`, `R-b3-1`, `R-b4-1` (duplican la del bloque); `R-SEC-CIUDAD` (pasa a regla BLOQUE); `R-PLAN-TRAYECTO` y `R-PLAN-FODA` (códigos inexistentes); `R-CONV-2` … `R-CONV-6` y `R-T05` (objetos que aún no existen; ver provisionales); la condición `MARCA_FAVORITO` de `R-b3-4` (no es requisito de nada); `R-F20` por SUPERA_BATALLA. `R-B5` pasa de COMPLETA_ACTIVIDAD b4-5 a COMPLETA_BLOQUE B4.

### 3.8 Provisionales tomados de `ruta`

`PROVISIONALES` lista cada fila; sus reglas se reapuntan a actividades de `contenido` (ninguna regla de `contenido` nombra un código `t-` de actividad del camino).

| Qué | De `ruta` | Reglas en `contenido` | Lo reemplaza |
|---|---|---|---|
| Cuentas, salones, vínculos, orientadoras | `CUENTAS`, `SALONES`, `VINCULOS`, `ORIENTADORAS_SALONES` (mismos usuarios de `usuarios_prueba.txt`) | — | carga de cuentas del piloto |
| Configuración del salón | `SALON_INSTRUMENTOS` (5A: RIASEC prioritario y visible) | — | B14 |
| Casos | `t-caso`, `t-caso-2` con `CONFIGURACION_CASOS`, `DIMENSIONES_ACTIVIDADES` y sus JSON | `t-caso` ← COMPLETA_ACTIVIDAD h-intereses-6; `t-caso-2` ← COMPLETA_ACTIVIDAD b5-1 | ajuste de casos |
| Testimonios | `t-testimonio-1..4` | 1 ← SUPERA_CASO t-caso; 2 ← SUPERA_CASO t-caso + COMPLETA_ACTIVIDAD b5-1; 3 y 4 ← SUPERA_CASO t-caso-2 | ajuste de testimonios |
| Conversaciones | `t-conv-1`, `t-conv-2` | 1 ← ESCRIBE_CARTA + COMPLETA_ACTIVIDAD b1-3; 2 ← ESCRIBE_CARTA + COMPLETA_ACTIVIDAD h2 | ajuste de conversaciones |
| Diario | `t-diario-fija`, `t-diario-tras-conversar` y todas las DIARIA | fija ← COMPLETA_ACTIVIDAD b0-2; tras-conversar ← COMPLETA_CONVERSACION t-conv-1 | ajuste de registros y diario (entradas `d-*` de las tandas) |
| Recuerdos de Lumi | `t-lumi-1..5` y sus reglas por amistad | sin cambio | contenido de Lumi |
| Insignias, grupos, textos, pistas | `INSIGNIAS`, `GRUPOS_INSIGNIA`, `PAGINAS_INSIGNIAS`, `TEXTOS_INSIGNIAS`, `PISTAS_INSIGNIAS` y evaluadores de vistas | `t-ins-1` ← COMPLETA_ACTIVIDAD b0-1; las demás sin cambio | ajuste de logros |
| Niveles | `NIVELES`, `CITAS_LUMI` | NIV-2 ← COMPLETA_BLOQUE B0; NIV-3 ← COMPLETA_BLOQUE B0 + 3 carreras distintas | ajuste de logros |

No se toman: `t-diario-personal` (depende de un ítem de `ruta`), `TEMATICAS_ACTIVIDADES`, `CARRERAS_RUTA`, `INSTITUCIONES_RUTA`, `UBICACIONES_RUTA`, `TIPOS_CARRERA` y `DURACIONES_CICLOS` (ajustes del catálogo solo para pruebas), y las actividades `t-` del camino.

## Fase 4 · Front

- Los 81 JSON en `src/data/activities/contenidos/`, separados de los de prueba: `contenidos/ruta/` (los `t_*` actuales) y `contenidos/plataforma/` (los nuevos), registrados en `contenidos.ts` con import explícito. Clave = código con `_`.
- Los JSON viejos de la demo (`mision_bienvenida`, `encuentro_mitos`, `encuentro_resultado_elena`, `pad_01_acompanar`…) se retiran si ninguna vista ni prueba los usa; si el modo local los usa, se quedan (modo local congelado).
- 9 entradas de `challenges_actividades.ts` en `challenges.ts`; 19 personajes de `personajes_actividades.json` en `catalogo.json` (Aurelio pasa al oasis). Imágenes asumidas: las que falten se anotan en `pendientes-interfaz.md`, sin bloquear la carga.
- **Ecos, podios y elecciones**: no se tocan (3.6).
- **Favoritos (excepción autorizada)**: se editan solo `b3_2.json` (`objetivoAprendizaje`, el diálogo que dice que el mercado no se abre sin tres favoritos y su `mensajeFin`) y `b3_4.json` (`_nota` y el diálogo que lo repite), para que inviten a marcar favoritos sin presentarlos como requisito. Sin cambiar flujo ni nodos.
- `pendientes-interfaz.md`: `ma2-p06` y `ma2-p07` nombran los testimonios T02 y T08, que aún no existen.
- **Recompensas**: las fichas que se obtienen las decide el backend con sus reglas FICHA. Primero se verifica si el modo api usa `recompensa.recursoIds` (cierre de actividad, drawer, mochila):
  - Si no lo usa (el cierre muestra los desbloqueos del servidor), se quita `recursoIds` de los 81 JSON de `plataforma/`; el resto de `recompensa` (p. ej. `mensajeFin`) se queda. Los JSON de `ruta/` y del modo local no se tocan.
  - Si lo usa, el campo se mantiene: F20 pasa de `b4-4` a `b4-2`, el apoderado usa FP01–FP08, y el script de coherencia exige que coincida con las reglas FICHA.
  En cualquiera de los dos casos, F20 queda en b4-2 y no en b4-4.

## Fase 5 · Integridad, recorrido y documentos

Pruebas nuevas en `tests/integration/datos/` y `tests/integration/escenarios/contenido/`, con una plantilla de base `contenido` (este documento la autoriza; las pruebas existentes siguen con `ruta`):

1. **Carga**: `contenido` carga sin errores, pasa `validar_distribucion_items` y los validadores de contenido y batallas.
2. **Reglas**:
   - todo objetivo cargado tiene regla, salvo la lista explícita del principio 7;
   - ninguna condición de una requerida (ni del bloque que la contiene) nombra una opcional, salvo `R-B4` por el evaluador de instrumentos prioritarios (excepción declarada en la prueba);
   - toda regla con evaluador de planes incluye `ACTUALIZA_PLAN`;
   - toda regla `CONVERSACION` incluye `ESCRIBE_CARTA`;
   - ninguna regla nombra un código `t-` de actividad del camino.
3. **Fichas de batalla**: para cada batalla, toda ficha de sus preguntas tiene una regla FICHA cuya actividad está entre los prerrequisitos de la batalla (cadena de reglas hacia atrás).
4. **Recorrido del estudiante** (evaluador falso): partiendo de cero, cada requerida está BLOQUEADA antes de completar la anterior y DISPONIBLE después; en el camino crea dos planes desde favoritos con POR_QUE y REALIDAD listas, un paso en el Plan A, completa b2-3 y b4-2 eligiendo exactamente 3 opciones en el podio, completa y revela las misiones de intereses y el punto de partida; termina con b5-5 COMPLETADA y COMPLETA_BLOQUE de B0–B5. Comprueba de paso que cada tramo se abre exactamente al completar su última requerida (b0-6, b1-7, b2-5, b3-10, b4-5).
5. **Recorrido del apoderado**: p1 → p8 en orden; al final, sección CONVERSACIONES abierta y FP01–FP08 obtenidas.
6. **Coherencia front–back** (script en `scripts/`, se corre en la fase, no prueba permanente): cada `contenido` de una actividad tiene su JSON; cada `desafio` del JSON coincide con una batalla cargada; todo `item` de un JSON es un ítem cargado de esa actividad y del tipo de su nodo; toda referencia que nombra un eco o una precarga está cargada para esa actividad; si `recursoIds` se mantuvo, coincide con las reglas FICHA.

Documentos: `AGENTS.md` del backend (tabla «Datos» con los dos conjuntos y qué va en cada uno; «Dónde va cada cosa»: una actividad real va en `contenido.py`, una de prueba en `ruta.py`), `docs/sistema/integracion.md` (conjuntos) y `motor.md` (principios de 3.7). Se corrige el README del backend, que aún nombra los conjuntos `plataforma` y `piloto`.

## Decisiones del usuario (cierre de preguntas)

- B4 pide además el punto de partida y los instrumentos prioritarios revelados: es la única excepción a «la última requerida abre el siguiente tramo», a propósito (la prueba de reglas la declara).
- F20 se obtiene al completar b4-2, antes de la batalla b4-4.
- b5-1 exige **un** paso en el Plan A (`pasos_plan_a` con parámetro 1).
- Secciones de la tarjeta: POR_QUE en b0-4, CONOCIMIENTO en b3-2, REALIDAD en b3-8, PASOS en b4-5.
- Temas de las fichas: los de 3.4.
- Los JSON de actividad conservan su flujo (ecos, podios, elecciones, referencias a otras secciones): el backend se adapta a ellos con ítems del tipo de cada nodo, listas provisionales y todas sus referencias. Las únicas ediciones de JSON son quitar `recursoIds` (lo que habilita cada actividad lo decide el backend) y los textos de favoritos de `b3-2` y `b3-4`.
- Eco de diálogo en lista y en registros (cuarto cambio de mecánica). Podios con las listas de la diapositiva, exactamente 3 y sin «otra».

## Preguntas abiertas

Ninguna. Documento listo para `/ajuste carga-actividades`.

## Plan aprobado


### Contexto

El contenido real (81 JSON en `ov_frontend/src/data/activities/contenidos/plataforma/`, borradores en
`ov_backend/docs/specs/carga-actividades/`) no está cargado: el backend solo tiene el conjunto de prueba `ruta`.
Este ajuste crea el conjunto `contenido` con actividades, fichas, batallas y reglas definitivas, y hace los cambios
de mecánica que ese contenido necesita. Spec: el texto de observaciones, guardado tal cual en
`ov_backend/docs/specs/ajuste-carga-actividades.md` (no hay spec en curso), con las observaciones del usuario al
plan y este plan al final. Rama: `claude/upbeat-fermi-9e9qin` (la que exige el entorno).

**Regla de oro:** los 81 JSON de `plataforma/` conservan su flujo (ningún eco, podio, elección ni referencia se
quita o cambia). El backend y el front se adaptan a ellos. Si un JSON no calza con un validador o tipo de nodo, me
detengo e informo; no lo corrijo. Única edición permitida en ellos: quitar `recompensa.recursoIds` (ver abajo).

### Qué cambia (hoy → pasará a)

**Mecánica (fase 1, front; cada una probada primero en `ruta`)**
1. **Fondo** — hoy `CaminoScreen`, `CiudadScreen`, `StudentJournalView`, `ChallengePlayer`,
   `MaraInteractionPlayer` pasan a `PlayerAmbient` una imagen fija (`forest.png`, `afueras.png`) **que ya no
   existe** (el commit `696b576` la renombró a `bosque.png` / `afueras-ciudad.png`). Pasará a: `fondoActividad
   (contenido, respaldo)` en `src/lib/activities/` → `/images/background/<escenario>.png` si el JSON trae
   `escenario` (tipo `Escenario` en `types/activities.ts`), si no el respaldo con el nombre nuevo. `t_valores.json`
   suma `escenario`.
2. **Diapositiva en registros** — `NODOS_PERMITIDOS.registro` suma `diapositiva`; `t_valores.json` suma una, con
   prueba.
3. **Helena** — `elena` → `helena` en `catalogo.json` (id y `avatarUrl` `/img/personajes/helena.png`),
   `characters.ts`, `ResultNode.tsx`, nodos de `encuentro_resultado_elena.json` (el archivo y la clave no cambian:
   modo local) y pruebas del front que lo nombran (autorizado). `CharacterPortrait.tsx` no depende del id `elena`
   (dibuja un SVG genérico salvo `companero`, `mara`, `aurelio`) y `public/img/personajes/` no existe: el retrato
   ya cae al SVG en ambos modos y así sigue; no hay archivo que renombrar.
4. **Eco de diálogo (ampliación de F03)** — hoy `NodoDialogo.eco?: ID`, `conEcoEncuentro` excluye registros y
   `encuentroConEco` cita un solo código. Pasará a: `eco?: ID | ID[]`; `encuentroConEco` cita cada código en orden
   tras el texto (omite los sin dato; sin ninguno, solo el texto); el registro resuelve sus diálogos con eco con las
   referencias que ya pide (`RegistroServidorPlayer`/`useRegistroServidor`, `necesitaReferencias` cuenta también
   los ecos de diálogo; sin segunda petición). Prueba en `ruta`: `t_eco.json` suma un diálogo con eco de lista
   (`t-ref-espera`, `t-ref-rutas`): ambas citas aparecen, una sin dato se omite, los informativos siguen igual.

**Backend**
- **Cargador (fase 2)** — hoy `_cargar_*`, `_unir_*`, `_validar_*`, `_insertar_en_orden`, `_codigos`,
  `contenido()` y `cargar()` viven en `datos/ruta.py` y leen sus globales. Pasarán a `datos/cargador.py` con
  `cargar(sesion, modulo)`; tupla no declarada = vacía (`getattr(modulo, n, ())`). `ruta.cargar`/`contenido.cargar`
  de una línea; `CONJUNTOS = {'ruta': …, 'contenido': …}`.
- **`datos/contenido.py` (fase 3)**, solo datos, encabezado «Contenido real de la plataforma. Lo provisional está
  en `PROVISIONALES`»:
  - ACTIVIDADES/DESCRIPCIONES de las cinco tandas concatenadas; `investigador-cierre` INFORMATIVA; descripción de
    `b3-2` sin la frase de favoritos (es texto del backend). PROPIEDADES según 3.2.
  - ITEMS_ACTIVIDADES/APLICACIONES de 3.3 (inteligencias 5 × 7) más `b0-3` (APL-PARTIDA 1–19).
  - FICHAS: las 31 de `fichas-plataforma.md`, temas de 3.4, FP08 sin la línea de la carta.
  - Batallas de las tandas 1, 3, 4 tal cual.
  - **ITEMS_REGISTRO**: uno por cada campo `item` de los JSON, del tipo de su nodo: consigna → texto libre;
    consigna con `podio` (o nodo `eleccion` con `item`) → elección. Sin criterios, `# PENDIENTE`. Nombre y
    consigna = `premisa`.
  - **LISTAS provisionales** (`PENDIENTE`) para elecciones/podios, de las opciones del propio JSON:
    `b2-3-lista-valores` (los 9 valores de la diapositiva `b2-3-04`) y `b4-2-lista-criterios` (los 9 criterios de
    `b4-2-02`, texto = lo que va antes de «:»). Códigos de opción derivados de la etiqueta (MAYÚSCULAS, sin tildes,
    `_`: `AYUDAR_A_OTROS`). Elección ordenada, exactamente 3, sin «otra», salvo que el nodo diga otra cosa.
  - **REFERENCIAS**: las 30 que nombran los JSON (ecos de consigna y de diálogo), con tipo y fuente de los
    borradores; donde difieran, manda el JSON. RESPUESTA_CUESTIONARIO con `('APL-PARTIDA','AUTO-12')` (b3-8) y
    `AUTO-13` (b4-2). Incluye TEXTO/ELECCION entre registros (`b1-1-gustos`, `h1-accion`, `b2-3-valores`,
    `b4-2-criterios`…).
  - REGLAS escritas desde las tablas de 3.7; `EVALUADORES_REGLAS` R-B4, R-b4-5 (2), R-b5-1 (1). Provisionales de
    3.8 tomados de `ruta` por asignación (`CUENTAS = ruta.CUENTAS`…) y reapuntados; cada fila en `PROVISIONALES`.
    Del diario: `t-diario-fija`, `t-diario-tras-conversar`, las DIARIA y la referencia `t-ref-diario-favoritos`.
  - `SALON_ACTIVIDADES_PRIORITARIAS = (('5A','b1-3'),)` provisional.

### Qué no cambia

- `ruta.py` (datos y `DATO DE PRUEBA`) ni su carga; ninguna prueba existente se toca por contenido.
- Motor, evaluadores, eventos, modelo de datos, migraciones; exportador de fixtures (sigue en `ruta`).
- Modo local y sus JSON de demo (`content.ts` y pruebas locales los usan); `contenidos/ruta/` y local conservan
  sus `recursoIds`.

### Frontend (fase 4)

- `contenidos/ruta/` (los `t_*`, `git mv`) y `contenidos/plataforma/`; import explícito en `contenidos.ts`;
  pruebas que lean rutas de `t_*.json` se ajustan.
- **`recompensa.recursoIds`**: verificado que el modo api no lo usa (`useActivityFinish` y la mochila solo en
  local; `QuestionNode` filtra por el catálogo local, sin F01…; `ParentActivityCard` es solo local;
  `ParentActivityFinish` lo oculta con `cierreServidor`). Se quita de los 81 JSON de `plataforma/` (el resto de
  `recompensa`, p. ej. `mensajeFin`, se queda). Las fichas las deciden solo las reglas FICHA.
- `challenges.ts` +9; `catalogo.json` +19 personajes (Aurelio al oasis); imágenes faltantes a
  `pendientes-interfaz.md`.
- `docs/contenidos-actividades.md`: `escenario`, `diapositiva` en registro, eco de diálogo en lista y en
  registros.
- **Favoritos (excepción autorizada)**: se editan solo `b3_2.json` (`objetivoAprendizaje` l.15, diálogo l.232,
  `mensajeFin` l.243) y `b3_4.json` (`_nota` l.2, diálogo l.22) para que inviten a marcar favoritos sin
  presentarlos como requisito; sin cambiar flujo ni nodos.
- `pendientes-interfaz.md`: `ma2-p06` y `ma2-p07` nombran los testimonios T02 y T08, que aún no existen.

### Fase 5 · integridad y documentos

- Plantilla `contenido` en `tests/integration/conftest.py`.
- `tests/integration/datos/`: carga + `validar_distribucion_items` + validadores; reglas: (a) todo objetivo con
  regla salvo la lista del principio 7, (b) ninguna requerida ni su bloque depende de una opcional salvo R-B4,
  (c) evaluadores de planes con ACTUALIZA_PLAN, (d) toda CONVERSACION con ESCRIBE_CARTA, (e) ninguna regla nombra
  una actividad `t-` del camino; fichas de batalla obtenidas entre los prerrequisitos.
- `tests/integration/escenarios/contenido/`: recorrido del estudiante (cada requerida BLOQUEADA → DISPONIBLE;
  revela partida y h-intereses 1–6 antes de B4; dos planes desde favoritos con POR_QUE y REALIDAD antes de b4-5;
  un paso en el Plan A antes de b5-1; b2-3 y b4-2 se completan eligiendo exactamente 3 opciones en el podio; b5-5 COMPLETADA y COMPLETA_BLOQUE B0–B5; cada tramo se abre con su última
  requerida) y del apoderado (p1→p8, CONVERSACIONES abierta, FP01–FP08).
- `scripts/verificar_contenido_front.py` (se corre, no queda como prueba): cada `contenido` tiene JSON; cada
  `desafio` es una batalla cargada; cada `item` de un JSON es un ítem cargado de esa actividad y del tipo de su
  nodo; cada referencia de un eco (consigna o diálogo) o precarga está cargada para esa actividad; ningún JSON de
  `plataforma/` trae `recompensa.recursoIds`.
- Documentos: `AGENTS.md` del backend (tabla «Datos», «Dónde va cada cosa»), `integracion.md`, `motor.md`
  (principios 3.7), README; `decisiones.md` (incluida la ampliación de F03).

### Fases (un commit cada una)

1. Mecánica front (4 cambios) · 2. Cargador común · 3. `contenido.py` · 4. Front del contenido · 5. Integridad,
recorridos, script y documentos; suite completa.

### Verificación

- Back: subagente `pruebas` con carpetas de impacto por fase y `uv run pytest -n auto -q` al cierre; carga real de
  `contenido` en base temporal.
- Front: `npm test`, `npm run build`, `npm run lint`, `npm run check:estructura`.
- Script de coherencia sin discrepancias. Commit por fase; push a `claude/upbeat-fermi-9e9qin` al final.
