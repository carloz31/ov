# Ajuste · desbloqueos

Spec para `/ajuste desbloqueos` sobre `main` del repo `carloz31/ov`. Cuatro partes independientes:

- **A. Reglas del estudiante:** tres misiones del camino pasan a pedir algo de otra sección (la carta, un caso, un guion) y la misión del investigador se abre antes.
- **B. Apoderado:** Conversaciones se abre al completar p4, no al terminar la ruta.
- **C. Front:** un punto en los accesos rápidos del panel mientras el estudiante no haya entrado a una sección ya abierta.
- **D. Front:** la ayuda del mapa antes de la primera misión usa el reproductor de ayuda de Lumi, con un ícono de pregunta en lugar de Lumi.

Todo lo que hace falta está en este documento. Solo cambia el conjunto `contenido`; `ruta`, sus pruebas y sus fixtures no cambian.

**Cuidado.** Hay pruebas con usuarios el 18 y el 19 de noviembre. No cambia el motor ni ningún evaluador: A y B son datos (`REGLAS`) y textos; C y D son solo front. Ninguna acción debe hacer más consultas que hoy (las condiciones nuevas se resuelven con los conteos que ya se cargan una vez por petición). Si algo de esto no se cumple, se avisa antes de seguir.

## Criterio general

- **La premisa es que el estudiante use más partes de la plataforma, pronto.** Hoy ninguna misión manda fuera del camino hasta el tramo «Mis opciones»; la Central de casos, la carta, las conversaciones e Investigaciones se pueden saltar enteras.
- **Lo que se pide es poco y se hace una vez:** una carta (sin mínimo de texto), un caso superado (cualquiera de los seis) y un guion listo (no publicar la entrevista).
- **Los mensajes de bloqueo siguen la fórmula vigente** de `R-b5-1`: primero lo que falta fuera del camino, con el nombre de la sección entre «», y después la misión, «si aún no lo hiciste». Los títulos se copian de `ACTIVIDADES`.
- **Condición de la carga de cuentas:** todo estudiante de la prueba tiene un apoderado vinculado (vínculo activo). Sin vínculo no se puede escribir la carta y `b1-4` quedaría cerrada para siempre. El usuario lo garantiza al crear las cuentas; si la carga de cuentas tiene validaciones, se agrega esta.
- Los códigos de actividad y de regla no cambian.

---

## A. Reglas del estudiante

### A.1 Reglas (`ov_backend/datos/contenido.py`, `REGLAS`)

| Regla | Condiciones hoy | Condiciones nuevas | Mensaje nuevo |
|---|---|---|---|
| `R-b1-4` | `COMPLETA_ACTIVIDAD b1-3` | `COMPLETA_ACTIVIDAD b1-3` + `ESCRIBE_CARTA` sin referencia, EVENTOS, 1 | En «En familia», escribe tu carta para tu familia. Y, si aún no lo hiciste, completa la misión «Las voces y la mía». |
| `R-b1-7` | `COMPLETA_ACTIVIDAD b1-6` | `COMPLETA_ACTIVIDAD b1-6` + `SUPERA_CASO` sin referencia, EVENTOS, 1 | Resuelve un caso en la Central de casos, en la ciudad. Y, si aún no lo hiciste, completa la misión «El mito que traje de casa». |
| `R-investigador` | `COMPLETA_ACTIVIDAD b3-10` | `COMPLETA_ACTIVIDAD b1-7` | Completa la misión «Mi futuro», en el camino. |
| `R-b3-2` | `COMPLETA_ACTIVIDAD b3-1` | `COMPLETA_ACTIVIDAD b3-1` + `TERMINA_GUION` sin referencia, EVENTOS, 1 | En «Investigaciones», deja listo el guion de tu entrevista: la sección se abre con la misión «Una entrevista para Anselmo», en la ciudad. Y, si aún no lo hiciste, completa la misión «Caminos después del colegio». |

No cambian: `R-SEC-FAMILIA` y `R-CIUDAD` (siguen en `b1-3`), `R-SEC-INVESTIGACIONES` (sigue pidiendo `investigador`), `R-investigador-cierre`, `R-F18`, `R-b3-a` (ya pedía un caso), las reglas `CONVERSACION`, las de testimonios, las de las secciones del plan, las insignias y los niveles.

Notas:

- **`TERMINA_GUION`** se registra la primera vez que el estudiante deja la guía lista (`guardar-guion` con `terminar`, al menos una pregunta propia). Cancelar la investigación después no borra el evento, así que la misión no se vuelve a cerrar. No se pide `PUBLICA_ENTREVISTA`.
- **`ESCRIBE_CARTA`** ya existe como condición de las reglas `CONVERSACION`; aquí se usa por primera vez en una regla `ACTIVIDAD`. Comprobar que la regla se reevalúa al escribir la carta desde «En familia» y que la respuesta de `escribir-carta` trae el desbloqueo de `b1-4`.
- **Orden de los eventos:** el caso y el guion pueden hacerse antes de la misión que los pide (la ciudad se abre en `b1-3`; Investigaciones, desde `b1-7`). La regla debe cumplirse al completar la misión anterior con el evento ya registrado.
- **Dependencia de una opcional:** `b3-2` no nombra ninguna actividad opcional, pero el guion exige la sección Investigaciones, que se abre con la misión opcional `investigador`. Es una excepción a propósito, como la de `R-B4` con las misiones de intereses. Se declara en `motor.md` y, si la prueba de reglas la detecta, en la prueba.

### A.2 JSON del front (`ov_frontend/src/data/activities/contenidos/plataforma/`)

Los cierres avisan lo que la misión siguiente va a pedir. Se agrega una frase al final del `mensajeFin` actual, sin cambiar lo que ya dice:

| Archivo | Se agrega al final de `recompensa.mensajeFin` |
|---|---|
| `b1_3.json` | ` Para seguir por el camino necesitas tu carta en «En familia».` |
| `b1_6.json` | ` Para seguir por el camino necesitas resolver un caso en la Central de casos, en la ciudad.` |
| `b1_7.json` | ` En la ciudad se abrió la misión «Una entrevista para Anselmo».` |
| `b3_1.json` | ` Para seguir por el camino necesitas tu guion listo en «Investigaciones».` |

Además:

| Archivo | Campo o nodo | Hoy | Queda |
|---|---|---|---|
| `b1_7.json` | `b1-7-12` (Lumi) | «Lo que explicó sobre mirar lejos y mirar cerca te lo dejé en la mochila: «El plan de vida». Vamos, que el volcán no queda cerca.» | «Lo que explicó sobre mirar lejos y mirar cerca te lo dejé en la mochila: «El plan de vida». Y en la ciudad abrió el Centro de investigación: dicen que Anselmo busca a alguien con preguntas. Vamos, que el volcán no queda cerca.» |
| `investigador.json` | `requisitos` | `["b3-10"]` | `["b1-7"]` |

Antes de implementar, buscar y listar en el plan:

- Todo texto de `investigador.json`, de `investigador_cierre.json` y de la ficha F18 que dé por visto algo del puerto (tramo «Exploro el mundo profesional»): ahora la misión se puede hacer antes. En la revisión previa no apareció ninguno; si aparece, se consulta.
- Todo texto fuera de estos archivos que diga que la misión de Anselmo se abre al cerrar el puerto o con «Caminos que no van en línea recta».
- Si el mapa de la ciudad dibuja una línea desde la misión que abre `investigador`, pasa a salir de `b1-7`.

### A.3 Lo que cambia para el estudiante

| Momento | Hoy | Queda |
|---|---|---|
| Tras `b1-3` | Se abren la ciudad y Familia; sigue `b1-4` | Igual, y `b1-4` espera la carta. Al guardarla se abren `b1-4`, conv-1 y conv-2 |
| Tras `b1-6` | Sigue `b1-7` | `b1-7` espera un caso superado |
| Tras `b1-7` | Se abre el tramo «Me conozco» | Igual, y en la ciudad se abre «Una entrevista para Anselmo» (que abre Investigaciones) |
| Tras `b3-1` | Sigue `b3-2` | `b3-2` espera el guion listo |

Costo aceptado: la ruta requerida sube unos 34 minutos (5 de la carta, 15 del caso, 8 de la misión de Anselmo y unos 6 del guion).

---

## B. Apoderado: Conversaciones al completar p4

Se mantiene el flujo de hoy dentro de la sección: al entrar, primero la carta; al guardarla, las diez conversaciones (las que el hijo aún no abrió, con «Adelantar mi respuesta»). Solo cambia cuándo se abre la sección. El diploma y los resultados del hijo siguen pidiendo la ruta completa.

### B.1 Regla (`contenido.py`)

| Regla | Hoy | Queda | Mensaje |
|---|---|---|---|
| `R-SEC-CONVERSACIONES` | `COMPLETA_BLOQUE FAMILIA` | `COMPLETA_ACTIVIDAD p4`, EVENTOS, 1 | Complete la actividad «Lo que no se dice en casa». |

### B.2 Pantalla de bloqueo (`features/family-conversations/components/servidor/BloqueoConversaciones.tsx`)

| Qué | Hoy | Queda |
|---|---|---|
| Título del candado | «Se abre al terminar sus actividades» | «Se abre al completar «{título de la actividad que la abre}»» |
| Avance | «{completadas} de {total} actividades completadas · falta «{siguiente}» ({min} min)», sobre toda la ruta | El mismo texto, contando solo hasta la actividad que abre la sección (con p4: «N de 4») |

El título y el tope salen de la regla de la sección (la actividad de su condición), no de un código fijo. Si hoy la pantalla solo recibe el avance de toda la ruta, se adapta con datos que ya vengan en las respuestas actuales; si hiciera falta una consulta nueva, se avisa antes.

### B.3 JSON de las actividades del apoderado (`contenidos/plataforma/`)

**`p4.json`, nodo `p4-10`.** Se agrega un bloque `parrafo` después del bloque `pasos` «Esta semana» y antes del párrafo de la ficha:

> Con esta actividad se le abre Conversaciones: temas para responder con su hijo o hija, cada uno por su lado. Al entrar, lo primero que le pedimos es una carta breve para él o ella. Escríbala como le salga: puede editarla cuando quiera, y al final de su ruta verá cómo afinarla.

**`p6.json`, nodo `p6-09`.**

| Bloque | Hoy | Queda |
|---|---|---|
| Párrafo | «Cuando termine su ruta se le abre algo más: una serie de temas para conversar con su hijo o hija. No se los vamos a adelantar todos. Solo dos pistas: …» | «En Conversaciones ya tiene una serie de temas para conversar con su hijo o hija. No se los vamos a adelantar todos. Solo dos pistas: …» (el resto, igual) |
| Paso 1, título | «Se abren al terminar su ruta» | «Ya las tiene abiertas» |
| Paso 1, texto | «Las encuentra en Conversaciones. Su hijo o hija va abriendo los temas con su avance; usted puede adelantar sus respuestas.» | «Las encuentra en Conversaciones, después de guardar su carta. Su hijo o hija va abriendo los temas con su avance; usted puede adelantar sus respuestas.» |

**`p8.json`.** La actividad deja de presentar la carta como algo que se escribirá al terminar: sirve para quien ya la escribió (revisarla) y para quien aún no (empezarla).

| Nodo y bloque | Hoy | Queda |
|---|---|---|
| `p8-01`, título | «Lo último de su ruta es una carta» | «Para cerrar, volvamos a su carta» |
| `p8-01`, párrafo 1 | «Esta es la última actividad. Al terminarla, le vamos a pedir que le escriba unas líneas a su hijo o hija.» | «Esta es la última actividad, y trata de su carta: las líneas para su hijo o hija que le pedimos al entrar a Conversaciones. Si ya la escribió, aquí verá cómo afinarla; si todavía no, cómo empezarla.» |
| `p8-01`, párrafo 3 | «No hace falta que sea larga ni que esté bien escrita. Antes de ver qué poner, le proponemos empezar por lo que más cuesta.» | «No hace falta que sea larga ni que esté bien escrita. Antes de ver qué poner o qué cambiar, le proponemos empezar por lo que más cuesta.» |
| `p8-08`, paso «Su carta» | «Se escribe en Conversaciones, y puede volver a editarla. Solo la leerá su hijo o hija: ni la orientadora ni el colegio la ven.» | «Está en Conversaciones: puede escribirla o volver a editarla cuando quiera. Solo la leerá su hijo o hija: ni la orientadora ni el colegio la ven.» |
| `p8-08`, paso «Los temas para conversar» | «Se abren cuando guarde la carta. Son los que le adelantamos en la actividad anterior.» | «Están en Conversaciones desde que guardó su carta. Si aún no la guardó, se abren al hacerlo.» |
| `p8-09`, paso, título | «Escriba su carta» | «Vuelva a su carta» |
| `p8-09`, paso, texto | «Vaya a Conversaciones. Un momento que recuerde, lo que siente y algo que hará.» | «Vaya a Conversaciones y léala otra vez, o escríbala si aún no lo hizo. Un momento que recuerde, lo que siente y algo que hará.» |

Lo demás de `p8.json` queda idéntico (la elección, las tres partes, las dos versiones de Rosa, el paso del diploma y los resultados).

### B.4 Fichas (`contenido.py`, `FICHAS`)

| Ficha | Hoy | Queda |
|---|---|---|
| FP06, «Las conversaciones guiadas», párrafo | «Cuando termine su ruta se le abre una serie de temas para conversar con su hijo o hija. En uno, …» | «En Conversaciones tiene una serie de temas para conversar con su hijo o hija. En uno, …» (el resto, igual) |
| FP06, punto 1 | «Se abren al terminar su ruta, en Conversaciones. Su hijo o hija va abriendo los temas con su avance; usted puede adelantar sus respuestas.» | «Están en Conversaciones y se abren cuando guarda su carta. Su hijo o hija va abriendo los temas con su avance; usted puede adelantar sus respuestas.» |
| FP08, primer párrafo | «Su ruta termina con una carta para su hijo o hija. No tiene que ser larga ni estar bien escrita: tiene que ser suya. Esta ficha reúne lo que ayuda a escribirla y lo que encuentra después.» | «Su ruta se cierra con la carta para su hijo o hija: la que escribió al entrar a Conversaciones, o la que todavía tiene pendiente. No tiene que ser larga ni estar bien escrita: tiene que ser suya. Esta ficha reúne lo que ayuda a escribirla o a mejorarla, y lo que encuentra después.» |

El resto de FP08 no cambia («Lo que sigue» ya dice que la carta se escribe en Conversaciones y que los temas se abren al guardarla).

Antes de implementar, buscar y listar cualquier otro texto del portal del apoderado (vistas, guías, cierres de actividad) que diga que Conversaciones se abre al terminar la ruta.

---

## C. Punto de «sección nueva» en los accesos rápidos del panel

Solo front, solo modo `api`. Sin peticiones nuevas: usa lo que ya está en el almacén del servidor.

**Qué hace.** En los accesos rápidos del panel del mapa (`features/adventure/components/AdventurePanel.tsx` y `AccesoRapido.tsx`), cada acceso muestra un punto mientras su sección esté abierta y el estudiante todavía no haya cerrado su presentación de primera visita. Al entrar y cerrar la presentación de Lumi, el punto se apaga.

**Regla del punto:** se muestra cuando se cumplen las tres:

1. la sección del acceso está abierta (no `bloqueada`; con candado nunca hay punto);
2. las presentaciones vistas ya llegaron del servidor (`useEstadoServidor().presentaciones.datos?.vistas`; cargando o con error, sin punto);
3. el código de la vista a la que lleva el acceso no está en `vistas`.

`marcarPresentacionVista` ya publica la lista nueva en el almacén al cerrar la presentación, así que el punto debe apagarse sin recargar. Si el POST falla, el punto vuelve en la próxima visita, igual que la presentación.

| Acceso | Sección | Presentación que lo apaga |
|---|---|---|
| Mis planes | PLANES | `profile-decisions` |
| Mi diario | DIARIO | `journal` |
| En familia | FAMILIA | `conversations` |
| Recursos | sin sección | `resources`, y solo desde que la primera misión está resuelta (`primeraMisionResuelta`), como la presentación del mapa |
| Investigaciones | INVESTIGACIONES | `investigations` |
| Catálogo | CATALOGO | `catalog-professions` (la vista a la que lleva el acceso; las otras pestañas no cuentan) |

Comprobar en `lib/studentViews.ts` que cada código es el de la vista a la que lleva su acceso; si alguno difiere, manda el de la vista.

**Cómo se ve.** Un punto pequeño en la esquina superior derecha del acceso, en el lugar del candado (`.sx-quick-lock`), con el color de acento del tema. Sin animación continua. Para lectores de pantalla, un texto oculto en el acceso: «Nuevo: aún no has entrado».

Fuera de este ajuste: el check-in, la campana y cualquier otro menú. El modo local no cambia.

---

## D. Ayuda del mapa antes de la primera misión

Solo front, solo modo `api`.

**Hoy.** Antes de completar `b0-1`, el botón «?» del mapa abre `AvisoAyudaMapa`: una caja pequeña junto al botón, con el texto `avisoAyudaMapa` («Empieza por la misión que brilla en el mapa.»).

**Pasará a.** El mismo botón abre el reproductor de ayuda que usa Lumi (`LumiOverlay` / `LumiDialogue`, el que abre `openGuide`), con dos diferencias:

- en el lugar del avatar de Lumi va un ícono de pregunta (`CircleHelp`), con el mismo tamaño y lugar;
- el nombre accesible del diálogo es «Ayuda» en lugar de «Orientación de Lumi».

El contenido es un solo paso con el texto de `avisoAyudaMapa`, sin cambios, y el botón final de siempre («Entendido»). Se cierra igual que la guía de Lumi.

**Implementación sugerida.** `LumiDialogue` acepta una variante sin Lumi; la guía manual de `overlayContext` (`{ kind: 'guide'; steps }`) lleva esa variante, y `MapScreenLayout` la abre con `[avisoAyudaMapa]` cuando hoy pasa `aviso`. Se retiran `AvisoAyudaMapa.tsx`, la rama `aviso` de `MapControls` y los estilos `.sx-aviso-ayuda-mapa*`.

**No cambia:** cuándo aplica (antes de la primera misión resuelta, solo en el camino), que la presentación del mapa espera a volver de `b0-1`, ni la guía de Lumi posterior (`guiaCaminoApi`). `tests/servidor/mapa/servidor-mapa-espera-b0-1.test.mjs` se adapta si cambia la forma en que el mapa expone el aviso (autorizado).

---

## Pruebas

Backend (`tests/integration/datos/` y `tests/integration/escenarios/contenido/`; las de `ruta` no cambian):

- **Reglas:** `R-b1-4`, `R-b1-7`, `R-b3-2`, `R-investigador` y `R-SEC-CONVERSACIONES` con las condiciones de A.1 y B.1. La prueba de mensajes (`test_mensajes_reglas_contenido.py`) pasa con los mensajes nuevos.
- **Recorrido del estudiante** (`test_recorrido_contenido.py`, adaptación autorizada): en el camino escribe la carta, supera un caso y deja un guion listo. Se comprueba:
  - con `b1-3` completa y sin carta, `b1-4` está bloqueada; al escribir la carta se abre, junto con conv-1 y conv-2;
  - con `b1-6` completa y sin caso, `b1-7` está bloqueada; un caso fallado no la abre; uno superado, sí;
  - un caso superado antes de `b1-6` abre `b1-7` al completar `b1-6`;
  - al completar `b1-7` se abre `investigador`; al completarla, la sección Investigaciones;
  - con `b3-1` completa y sin guion, `b3-2` está bloqueada; guardar «lo que pienso» o un guion sin terminar no la abre; terminar el guion, sí; cancelar la investigación después no la cierra.
- **Recorrido del apoderado:** al completar p4 se abre Conversaciones (con p3, no); el diploma y los resultados del hijo siguen pidiendo p8.
- **Presupuestos de consultas:** `completar-actividad`, `escribir-carta`, `resolver-caso` y `guardar-guion` no hacen más consultas que hoy.

Front:

- Se adaptan las pruebas que fijen los textos cambiados, la pantalla de bloqueo de Conversaciones o el aviso del mapa (autorizado). `tests/local/` no cambia.
- Punto del panel: sección bloqueada, sin punto; abierta y sin presentación vista, con punto; con la presentación vista, sin punto; sin datos de presentaciones, sin punto; Recursos, sin punto antes de la primera misión.
- `verificar_contenido_front.py` sin discrepancias.

## Comprobaciones en el navegador

Con el conjunto `contenido`:

1. **Mapa nuevo:** antes de `b0-1`, el «?» abre el diálogo grande con el ícono de pregunta y «Empieza por la misión que brilla en el mapa.»; Lumi no aparece. Tras `b0-1`, el «?» vuelve a abrir la guía de Lumi.
2. **Punto:** tras `b0-2`, «Mi diario» muestra el punto; al entrar y cerrar la presentación, se apaga al volver al mapa. Los accesos con candado no lo muestran.
3. **Carta:** al cerrar `b1-3`, el mensaje final nombra la carta; `b1-4` bloqueada dice que falta la carta; al guardarla en «En familia», `b1-4` se abre.
4. **Caso:** `b1-7` bloqueada nombra la Central; al superar un caso, se abre.
5. **Anselmo:** al cerrar `b1-7`, Lumi lo nombra y la misión aparece en la ciudad; al completarla se abre Investigaciones y su acceso muestra el punto.
6. **Guion:** `b3-2` bloqueada nombra Investigaciones y la misión de Anselmo; al dejar el guion listo, se abre.
7. **Apoderado:** con p3 completa, Conversaciones dice «Se abre al completar «Lo que no se dice en casa»» y «3 de 4»; al completar p4, el cierre lo anuncia, la sección pide la carta y, al guardarla, muestra las conversaciones. p6 y p8 se leen bien habiendo escrito la carta y sin haberla escrito.

## Documentos

- `ov_backend/docs/sistema/motor.md`: las reglas del camino que piden otra sección (carta, caso, guion), la excepción de `b3-2` (depende de la misión opcional `investigador`) y, en «Conversaciones», que el apoderado accede al completar p4 en `contenido`.
- `ov_frontend/AGENTS.md`: el punto de los accesos rápidos y la ayuda del mapa sin Lumi.
- Decisiones del ajuste: las de abajo.

## Decisiones del usuario

- La carta del estudiante es requisito de `b1-4`; un caso superado, de `b1-7`; un guion listo (sin publicar), de `b3-2`.
- La misión de Anselmo se abre con `b1-7`, para que Investigaciones aparezca temprano.
- Ciudad y Familia siguen abriéndose en `b1-3`; las secciones del plan no cambian; el diario y el check-in no son requisito de nada.
- Apoderado: Conversaciones se abre al completar p4 y la carta sigue siendo lo primero dentro de la sección; p8 pasa a servir para revisarla.
- Todas las cuentas de estudiante de la prueba tendrán un apoderado vinculado.
- El punto de los accesos se apaga con la presentación de primera visita; Recursos espera a la primera misión y Catálogo depende de la pestaña de ocupaciones.
- La ayuda del mapa antes de la primera misión usa el reproductor de Lumi con un ícono de pregunta.

## Preguntas abiertas

Ninguna. Documento listo para `/ajuste desbloqueos`.


---

# Plan aprobado


## Contexto

La spec `ajuste-desbloqueos.md` (adjunta por el usuario) quiere que el estudiante pase pronto por otras secciones: tres misiones del camino piden la carta, un caso o un guion, y la misión de Anselmo se abre con `b1-7`. Además, Conversaciones del apoderado se abre con p4, los accesos rápidos del panel muestran un punto de «sección nueva» y la ayuda del mapa antes de `b0-1` usa el reproductor de Lumi con un ícono de pregunta. **Pedido adicional del usuario:** al cargar `contenido` se siembran por defecto los estudiantes de ejemplo del panel de la orientadora, en cualquier entorno (también en la EC2 con `ENTORNO=produccion`), y `--sin-ejemplos` carga sin ellos.

No hay spec en curso: la spec del ajuste se guarda como `ov_backend/docs/specs/ajuste-desbloqueos.md` (el texto adjunto + este plan). Rama `ajuste/desbloqueos` (ya creada desde `main`).

## Qué cambia (hoy → pasará a)

**A. Reglas del estudiante** (`ov_backend/datos/contenido.py`, `REGLAS`), las cuatro filas de A.1 tal cual: `R-b1-4` + `ESCRIBE_CARTA`, `R-b1-7` + `SUPERA_CASO`, `R-b3-2` + `TERMINA_GUION` (las tres sin referencia, EVENTOS, 1) y `R-investigador` pasa de `b3-10` a `b1-7`, con los mensajes de la spec.
- El motor ya indexa las reglas por tipo de evento (`registrar_eventos`, `app/services/motor/reglas.py:141`), así que al escribir la carta, superar un caso o terminar el guion se reevalúa `b1-4` / `b1-7` / `b3-2` sin tocar código. Los conteos salen de `contexto(sesion).contar`, que ya se carga una vez por petición: no hay consultas nuevas (lo fijan las pruebas de presupuesto).
- `escribir_carta` (`app/services/conversaciones.py:162`) ya devuelve `responder_con_eventos`: la respuesta trae el desbloqueo de `b1-4` (y conv-1/conv-2).

**A.2 JSON del front** (`contenidos/plataforma/`): se agrega la frase al final de `recompensa.mensajeFin` de `b1_3`, `b1_6`, `b1_7` y `b3_1`; el nodo `b1-7-12` queda con el texto nuevo; `investigador.json` `requisitos` → `["b1-7"]`.
- Revisión previa: `investigador.json`, `investigador_cierre.json` y la ficha F18 no dan por visto nada del puerto. Lo único que presupone algo es «la familia de carreras que elegiste» (`investigador-09`), que se refiere a la elección que hace la misma misión (nodo «Elige la familia de carreras»): no cambia.
- Ningún texto del front dice que la misión de Anselmo se abre con el puerto o con «Caminos que no van en línea recta» (solo la regla del backend, que cambia).
- El mapa de la ciudad no dibuja líneas para `investigador` (no tiene `mapa.origen`): nada que mover.

**B. Apoderado**
- `R-SEC-CONVERSACIONES`: `COMPLETA_BLOQUE FAMILIA` → `COMPLETA_ACTIVIDAD p4`, mensaje «Complete la actividad «Lo que no se dice en casa».».
- `BloqueoConversaciones.tsx` (lo usa solo `pages/parent/ParentFamiliaView.tsx`): hoy título fijo y avance sobre toda la ruta. Pasará a recibir la actividad que abre la sección, tomada de la condición `COMPLETA_ACTIVIDAD` de la regla que llega en el 409 de la sección (`DetalleError.progreso.reglas[].condiciones[].referencia` = `p4`), que ya está en el almacén (`useFamiliaApoderado`, error `bloqueado`). Título «Se abre al completar «{título}»»; avance «N de {posición de p4}» contando las completadas hasta esa actividad, con «falta «{siguiente}» ({min} min)» de la primera no completada dentro de ese tramo. Sin petición nueva. Si el 409 no trae la condición (error de red, otra forma), se cae al texto y al avance de hoy.
- Textos de B.3 (`p4.json` `p4-10`, `p6.json` `p6-09`, `p8.json`) y B.4 (`FICHAS` FP06, FP08) tal cual la spec.
- Otros textos del portal que dicen que Conversaciones se abre al terminar la ruta (encontrados; propuesta):
  - `src/data/content/guideTexts.ts:242` (`parentGuides.overview`): «…recibe su diploma de compromiso, puede abrir los resultados que se comparten con las familias y se abren las Conversaciones.» → «…recibe su diploma de compromiso y puede abrir los resultados que se comparten con las familias. Las Conversaciones se abren antes, al completar «Lo que no se dice en casa».»
  - `guideTexts.ts:244` (`parentGuides.activities`): «Al terminar todas, recibe su diploma de compromiso y se abren las Conversaciones con su hijo o hija.» → «Al completar «Lo que no se dice en casa» se abren las Conversaciones con su hijo o hija, y al terminar todas recibe su diploma de compromiso.»
  - No cambian (no hablan de Conversaciones o son del modo local): `pad_02_informacion.json:341`, FP01, `CabeceraMisActividades.tsx:72`, `guideTexts.ts:116` (intro local).

**C. Punto de sección nueva** (`AdventurePanel.tsx`, `AccesoRapido.tsx`, `student-logbook.css`)
- Hoy `AccesoRapido` solo dibuja `LockKeyhole .sx-quick-lock` si está bloqueado; Recursos es un `<Link>` simple.
- Pasará a: `AccesoRapido` acepta `nuevo?: boolean`; con `nuevo` dibuja `<span className="sx-quick-new" aria-hidden>` en el lugar del candado y `<small className="sr-only">Nuevo: aún no has entrado</small>`. Recursos pasa a `AccesoRapido` (sin sección, nunca bloqueado). `AdventurePanel` calcula `nuevo` solo en modo `api`: no bloqueado, `useEstadoServidor().presentaciones.datos?.vistas` presente y la vista del acceso no incluida. Recursos además exige `primeraMisionResuelta(bloques)` (`lib/servidor/adaptadores.ts:97`).
- Vistas (comprobadas en `lib/studentViews.ts`): Mis planes `profile-decisions`, Mi diario `journal`, En familia `conversations`, Recursos `resources`, Investigaciones `investigations`, Catálogo `catalog-professions`.
- `marcarPresentacionVista` (`store/servidor/operaciones.ts:165`) ya publica la lista nueva: el punto se apaga sin recargar.
- CSS: `.sx-quick-new` 8 px, círculo, color de acento del tema, en `top:6px; right:6px`, sin animación.

**D. Ayuda del mapa antes de `b0-1`**
- Hoy `MapControls` con `aviso` alterna `AvisoAyudaMapa` (caja junto al botón).
- Pasará a: `LumiDialogue` acepta `variante?: 'lumi' | 'ayuda'`; con `ayuda` el avatar es `CircleHelp` (mismo contenedor `.sx-lumi-avatar`) y el `aria-label` / `Dialog.Title` es «Ayuda». `ManualOverlay` `{kind:'guide'; steps; variante?}`; `openGuide(steps, variante?)`; `OverlayQueue` pasa la variante a `LumiOverlay` → `LumiDialogue`. `MapScreenLayout`: `onHelp={() => avisoAyuda ? openGuide([avisoAyuda], 'ayuda') : openGuide(pasosAyuda)}`. Se retiran `AvisoAyudaMapa.tsx`, la prop `aviso` de `MapControls` y `.sx-aviso-ayuda-mapa*` de `student-base.css`.
- `useMapScreen` sigue exponiendo `avisoAyuda`: `servidor-mapa-espera-b0-1.test.mjs` debería pasar sin cambios.

**E. Carga de `contenido` con los estudiantes de ejemplo (pedido adicional, corregido)**

Objetivo: ver los ejemplos en el panel de la orientadora del sitio desplegado solo recargando la base (workflow «recargar_contenido» o `actualizar.sh --recargar`), con la EC2 en `ENTORNO=produccion`.
- Hoy `datos/cargar.py` siembra `scripts/sembrar_panel_ejemplo.py` solo con `--con-ejemplos` y solo en desarrollo.
- Pasará a: `datos.cargar contenido` siembra por defecto, en cualquier entorno; `--con-ejemplos` se quita y entra `--sin-ejemplos` (carga sin sembrar). Con `ruta` no siembra. `preparar_base` no cambia (lo usan pruebas y exportador sin siembra).
- El subproceso de la siembra corre con `ENTORNO=desarrollo` y `ANTHROPIC_API_KEY=''` forzados solo para él, sobre la misma `DATABASE_URL` (la app que crea dentro del proceso acepta `fecha_hora` y usa `ClientePrueba`). El backend desplegado (`ov-backend.service`) sigue en producción y sigue rechazando la fecha del cliente. El script conserva su guarda (`--desarrollo` + ENTORNO).
- **Dependencia (aviso):** la EC2 instala con `uv sync --frozen --no-dev --extra postgres`, y `fastapi.testclient` necesita `httpx`, que hoy solo está en el grupo `dev`. Lo demás que importa la siembra (`tests/soporte/*`) no usa pytest y llega con el `git reset` del checkout. Salida propuesta, la más chica: un grupo `ejemplos = ["httpx>=0.28.1"]` en `pyproject.toml` (mismo paquete y versión del lock, `uv lock` sin paquetes nuevos), y `actualizar.sh` sincroniza con `--group ejemplos`. Sin instalar nada a mano en la EC2.
- Otro riesgo a vigilar: la siembra solo se ha corrido sobre SQLite. Se corre también en la prueba marcada `postgres` (se omite sin `TEST_POSTGRES_URL`); si en PostgreSQL falla algo, se avisa antes de seguir.
- `despliegue/ec2/actualizar.sh --recargar` acepta `--sin-ejemplos` (lo pasa a `datos.cargar`); el workflow `despliegue.yml` gana la casilla `sin_ejemplos` (boolean, falso por defecto) que agrega `--sin-ejemplos`. `despliegue/README.md`: la recarga previa a la prueba con usuarios va con `--sin-ejemplos`, porque los ejemplos son cuentas inventadas con credenciales en el repositorio.
- La siembra no llama al LLM ni a la red, tampoco en la EC2.
- La siembra recorre el camino con las acciones reales, así que debe cumplir las reglas nuevas: antes de `b1-4` escribe la carta del estudiante, antes de `b1-7` supera un caso (`c1` con su puntaje máximo), tras `b1-7` completa `investigador`, y antes de `b3-2` guarda «lo que pienso» y el guion terminado. Los casos 3 y 4 (`est-panel-3`, `est-panel-4`) pasan `b1-4` y hoy no tienen apoderado: se les agregan `apo-panel-3` y `apo-panel-4` (DATO DE PRUEBA, con credenciales en `CREDENCIALES`), en línea con la condición de la spec (todo estudiante tiene apoderado).
- Una sola función `prerrequisitos(cliente, cuenta, actividad)` en `scripts/prerrequisitos_contenido.py` (fuera de `tests/`; sin LLM: «lo que pienso» + guion con pregunta propia y `terminar`). La usan la siembra y `tests/soporte/soporte_contenido.avanzar`, que la importa de ahí (carta, caso, `investigador`, guion), para que los recorridos y las pruebas que usan `avanzar` sigan pasando.
- **Si la siembra falla** (cualquier entorno): `datos.cargar` imprime el error con claridad, vuelve a dejar la base exactamente con `contenido` sin ejemplos (`preparar_base(url, 'contenido', vaciar=True)`, transaccional, así no queda nada a medias) y termina con código distinto de 0. `actualizar.sh --recargar` guarda ese código, reinicia el backend igual y sale con error solo después de reiniciar y comprobar la API: el sitio queda arriba con `contenido`. Prueba: siembra que falla → base con `contenido`, sin `est-panel-*`, código ≠ 0.

## Precisiones del usuario (al aprobar)

1. **Cuentas de `contenido` sin apoderado.** `contenido` toma las cuentas de `ruta` y solo `est-ana` y `est-luis` tienen vínculo. En `contenido` (sin tocar `ruta`) se agrega un apoderado y un vínculo activo para cada estudiante sin vínculo (`est-beto`, `est-mia`, `est-teo`, `est-sol`), DATO DE PRUEBA, con credenciales donde corresponda. Prueba de carga: todo estudiante de `contenido` tiene un vínculo activo, resuelta con una sola consulta.
2. **La siembra no depende de `tests/`.** `prerrequisitos(...)` va fuera de `tests/` (`scripts/prerrequisitos_contenido.py`, junto al script); `soporte_contenido.py` la importa de ahí. (Hoy el script sí importa `soporte_*` de `tests/soporte`; la función nueva no agrega esa dependencia.)
3. **La siembra no llama al LLM.** El guion se deja listo con «lo que pienso» + un guion con una pregunta propia y `terminar`; sin pedir sugerencias.
4. **Refresco del mapa.** Al volver al mapa tras escribir la carta («En familia»), superar un caso o terminar el guion (Investigaciones), `b1-4`, `b1-7` y `b3-2` aparecen abiertas sin recargar. Se comprueba (prueba y navegador); si alguna no refresca, se corrige con el refresco según `nuevos_desbloqueos`, sin refresco incondicional.
5. **Ayuda de un solo paso.** En la variante `ayuda` con un único mensaje se ocultan los indicadores de pasos y «Anterior». La guía de Lumi no cambia.
6. **Rendimiento.** Ninguna consulta nueva en acciones ni lecturas:
   - Las condiciones nuevas se resuelven con los conteos ya cargados; sin evaluadores ni consultas propias.
   - Presupuestos de `completar-actividad`, `escribir-carta`, `resolver-caso`, `guardar-guion`, `guardar-lo-que-pienso` y `GET actividades`: medir antes y después y dejar pruebas que lo fijen. Si alguna sube, avisar antes de seguir.
   - Las reglas pendientes solo son candidatas con eventos de sus condiciones (índice `reglas_evento`): guardar una sección del plan, ver una carrera, el diario o el check-in no las evalúan.
   - Sin N+1, también en el panel con los apoderados nuevos; presupuestos del panel sin margen adicional.
   - Front: solo datos del almacén; ninguna petición nueva.
   - Refresco F2b: `GET actividades` solo cuando la respuesta trae desbloqueos que cambian el camino.
   - En el cierre, las consultas de cada acción tocada, antes y después.

Fuera del código (usuario): `contenido` recargado con `--sin-ejemplos` antes de crear las cuentas de la prueba; cada estudiante con su apoderado.

## Qué no cambia

El motor, los evaluadores, los endpoints y los esquemas; `ruta`, sus pruebas y fixtures; `R-SEC-FAMILIA`, `R-CIUDAD`, `R-SEC-INVESTIGACIONES`, `R-investigador-cierre`, `R-F18`, `R-b3-a`, reglas de conversaciones, testimonios, planes, insignias y niveles; el flujo interno de Conversaciones (carta primero); diploma y resultados del hijo (siguen pidiendo p8); la guía de Lumi posterior a `b0-1` (`guiaCaminoApi`); el check-in, la campana; el modo local (`tests/local/` sin cambios).

## Modelo de datos

Sin cambios.

## Pruebas

Backend (`tests/integration/datos`, `tests/integration/escenarios/contenido`, panel):
- Reglas y mensajes (`test_mensajes_reglas_contenido.py`) con lo nuevo; excepción de `b3-2` (depende de la opcional `investigador`) declarada si la prueba de reglas la detecta.
- `test_recorrido_contenido.py` (adaptación autorizada): los casos de la sección «Pruebas» de la spec (carta, caso fallado/superado, caso antes de `b1-6`, `investigador` con `b1-7`, guion sin terminar / terminado / cancelado) y el apoderado (p3 no abre, p4 abre; diploma pide p8).
- Presupuestos: `completar-actividad`, `escribir-carta`, `resolver-caso`, `guardar-guion` sin consultas extra.
- Panel: si las pruebas de `test_panel_presupuestos.py` fijan algo que cambia por la siembra nueva (investigación activa, apoderados 3 y 4), se adaptan y se anota en `decisiones.md` como consecuencia de las reglas autorizadas. Pruebas de `cargar.main`: con `contenido` siembra en desarrollo y en producción; con `--sin-ejemplos` no siembra; con `ruta` no siembra. Una prueba confirma que la app en producción sigue rechazando (ignorando) `fecha_hora` del cliente.
- Fixtures del front regenerados (`contenido-panel-*` y los de `contenido` que cambien).

Front: punto del panel (bloqueada sin punto; abierta sin vista con punto; vista vista sin punto; sin datos sin punto; Recursos sin punto antes de `b0-1`); ayuda del mapa (variante sin Lumi, «Ayuda»); bloqueo de Conversaciones («Se abre al completar «Lo que no se dice en casa»», «3 de 4»); se adaptan las que fijen textos cambiados. `verificar_contenido_front.py` sin discrepancias.

## Fases

1. **Backend: reglas y textos** — `REGLAS`, `FICHAS`, apoderados de `contenido`, `scripts/prerrequisitos_contenido.py` (usada por `soporte_contenido.avanzar`), pruebas de reglas, recorrido y presupuestos. Impacto: `tests/integration/datos`, `tests/integration/escenarios`.
2. **Carga con ejemplos** — `cargar.py` (por defecto siembra, `--sin-ejemplos`), subproceso con ENTORNO forzado, `sembrar_panel_ejemplo.py` con las reglas nuevas y apoderados 3 y 4, grupo `ejemplos`, `actualizar.sh`, `despliegue.yml`, pruebas del panel y de la carga, fixtures regenerados, `panel.md`/`integracion.md`/README/`despliegue/README.md`.
3. **Front: contenidos y apoderado** — JSON de A.2 y B.3, `BloqueoConversaciones` + `ParentFamiliaView`, `parentGuides`, pruebas; `verificar_contenido_front.py`.
4. **Front: punto y ayuda del mapa** — C y D, pruebas, `npm run test:servidor`.
5. **Cierre** — suite completa de ambos, `motor.md`, `ov_frontend/AGENTS.md`, `decisiones.md`, comprobaciones en el navegador de la spec (con el conjunto `contenido`).

Un commit por fase: `Ajuste desbloqueos · F<n>: <qué>`. Sin push.

## Verificación

- Subagente `pruebas`: carpetas de impacto por fase; al final `uv run pytest -n auto -q`, `npm test`, `npm run build`, `npm run lint`, `npm run check:estructura`.
- `uv run python -m datos.cargar contenido --vaciar` deja los ocho `est-panel-*` en 5A; el panel de `ori-carmen` los muestra; con `--sin-ejemplos`, ninguno.
- Siembra sobre PostgreSQL antes del cierre: si en este entorno no hay `TEST_POSTGRES_URL`, se avisa al usuario para que la corra en local antes de desplegar; el cierre dice si se probó en PostgreSQL.
- Tras desplegar y recargar en la EC2 (lo hace el usuario): el panel de la orientadora muestra los ocho ejemplos; con `--sin-ejemplos`, ninguno.
- Las siete comprobaciones de navegador de la spec, en el panel integrado.
