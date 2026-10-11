# Especificación: rediseño de la Central de casos (Incendio forestal)

Oct 6, 2026 · @Carlos Sanchez

Esta especificación rediseña el caso «Incendio forestal» de la Central de casos para que siga la estética del estudiante, funcione en móvil y use los datos reales del catálogo de ocupaciones. El diseño de referencia está en la página Central de casos del prototipo [Progreso y retroalimentación](https://claude.ai/artifact/1vusmJWnPqmSMCffqVvJeE): vistas de escritorio y móvil, resultado de fase, cierre y drawer.

## Contexto, alcance y estado actual

**Archivos involucrados**

- `src/features/occupation-exploration/ForestFireCaseView.tsx`: pantallas del caso.
- `src/features/occupation-exploration/data/ForestFireCaseData.ts`: fases, mensajes, problemas y profesionales.
- `src/features/occupation-exploration/lib/ForestFireCaseLogic.ts`: presupuesto y satisfacción.
- `src/features/occupation-exploration/components/ForestFireProfessionalPanel.tsx`: la «Guía profesional» actual.
- `src/features/occupation-exploration/CityMapView.tsx`: drawer del caso en la ciudad.
- `src/features/student-experience/catalog/catalogDetails.ts` y `OccupationDetailView.tsx`: catálogo de ocupaciones.

**Estado actual que cambia**

- La mesa de trabajo muestra a la vez las pistas, los problemas y los profesionales, con arrastrar y soltar. No funciona bien en móvil.
- La guía profesional usa descripciones y habilidades propias del caso (`ForestFireProfessional.description` y `skills`), que no provienen del catálogo.
- De los 15 profesionales del caso, solo `paramedic` y `photographer` existen en el catálogo.
- El máximo de satisfacción es 15: 14 por funciones cubiertas más 1 si el presupuesto gastado es exactamente el óptimo (14).
- El caso se marca como resuelto siempre al llegar al informe final; no existe un mínimo.
- Al final existen la pregunta del profesional adicional (`extra-question`) y la nube de palabras del salón (`word-cloud`).

**Alcance**

- Se mantiene la estructura de 3 fases, los problemas, los profesionales esperados, las contribuciones y las consecuencias.
- Se mantiene el límite de presupuesto de 16 y la pantalla de fin por presupuesto agotado.
- Se ocultan, sin borrar el código, `extra-question` y `word-cloud`, y la sección «Tu aporte profesional adicional» del informe final. Quedan detrás de un indicador `SHOW_EXTRA_PROFESSIONAL = false`.
- Se elimina el punto extra por presupuesto óptimo y toda la presentación del presupuesto óptimo en el cierre.
- Textos con trato de tú. Los textos entre comillas son literales; los marcados entre corchetes son marcadores.
- Estética: tokens del estudiante ya definidos (encabezado `rgba(16,19,28,.9)`, panel `rgba(22,25,35,.92)`, acento del caso #E2725B, botón #3F51B5, tarjeta clara `rgba(250,250,252,.97)`, medallón de Lumi) y la barra de progreso con la estrella, donde el avance es la fase actual sobre 3.

## Flujo por fase

Cada fase se recorre en cuatro pasos, iguales en escritorio y móvil. Lo que cambia es la disposición.

```
Intro de fase → Escuchar → Problema 1 → … → Problema N → Revisar → Resultado de fase
```

- **Escuchar:** el estudiante descubre las pistas de la fase en la escena. No avanza hasta escucharlas todas.
- **Un paso por problema:** cada problema se resuelve en su propia pantalla. El número de pasos depende de `phase.problems.length`.
- **Revisar:** resumen del equipo por problema, con la opción de cambiar cualquiera, y el botón «Confirmar equipo», que lleva al resultado de fase.

**Indicador de pasos.** Bajo el encabezado, en móvil, segmentos con su etiqueta («Escuchar», «Problema 1», …, «Revisar»). En escritorio, píldoras navegables en el encabezado. Un paso está disponible si se completaron los anteriores: Escuchar siempre; cada problema cuando se escucharon todas las pistas y el problema anterior tiene al menos un profesional; Revisar cuando todos los problemas tienen al menos uno. Los pasos ya visitados se pueden volver a abrir.

**Navegación.** Botón principal fijo al pie en móvil (en escritorio, dentro del panel del problema) con «Ver el primer problema», «Siguiente problema», «Revisar el equipo» o «Confirmar equipo», y «Atrás» como secundario. El presupuesto queda siempre visible en el encabezado («{restante} de 16»).

**Regla de avance.** Un problema necesita al menos un profesional para pasar al siguiente. Esto reemplaza el diálogo actual «Aún falta completar el mapa».

**Estado.** Las asignaciones de la fase viven en memoria, como hoy. Si el estudiante sale con la X, el intento se descarta; al salir durante una fase se pide confirmación: «¿Salir del caso? Este intento no se guardará.»

## Paso Escuchar: puntos en la escena

Las pistas aparecen como puntos sobre la ilustración de la fase. El estudiante debe abrirlas **una por una**: no hay lista que las reúna en este paso.

### Escena desplazable, igual que el mapa

La escena funciona como el mapa del Camino: la imagen es más grande que la ventana y se recorre **arrastrándola** con el mouse o el dedo. Así, el mismo diseño sirve en escritorio y en móvil sin que la proporción de la imagen deforme ni oculte los puntos.

- **Ventana:** el área entre el encabezado y la barra inferior (en móvil, entre el encabezado y el pie). `overflow: hidden; touch-action: none; cursor: grab` (`grabbing` mientras se arrastra).
- **Escena:** la imagen se dibuja a tamaño de cobertura (`cover`) respecto de la ventana, conservando su proporción: si la ventana es más ancha que la imagen, sobra alto y se desplaza en vertical; si es más angosta, como en móvil, sobra ancho y se desplaza en horizontal. Se posiciona con `transform: translate(x, y)`.
- **Límites:** el desplazamiento se limita para que nunca se vea fuera de la imagen: `x ∈ [ancho ventana − ancho escena, 0]` y lo mismo para `y`. Al entrar, la escena queda centrada.
- **Arrastre:** eventos de puntero (`pointerdown`, `pointermove`, `pointerup`, `pointercancel`) con `setPointerCapture`. Al soltar se aplica una transición suave de 0,2 s. Reutilizar la lógica de arrastre del mapa si ya existe.
- **Clic frente a arrastre:** si el puntero se movió más de 6 px desde que se presionó, al soltarlo sobre un punto **no** se abre la pista.
- **Puntos:** dentro de la escena, en porcentajes de la imagen (`position.x`, `position.y`), de modo que se mueven con ella. En móvil, al menos un punto debe quedar fuera de la vista inicial para que el estudiante descubra que puede desplazarse.
- **Teclado:** los puntos son `<button>` y se recorren con Tab. Al enfocar uno que está fuera de la vista, la escena se desplaza hasta mostrarlo.

### Botón de ayuda y Lumi

- Arriba a la izquierda, sobre la escena, un botón circular «?» de 44 px (fondo #3A3220, borde 2 px #C99A3E, texto #FFE29A), con `aria-label="¿Qué hago aquí?"` y `aria-expanded`.
- Al pulsarlo se abre junto a él una burbuja de Lumi (panel oscuro, medallón, etiqueta «LUMI») con el texto de la fase (`listenPrompt`). Para la fase 1: «Hay personas pidiendo ayuda en la escena. Arrastra la imagen para encontrarlas y toca cada punto para escucharlas. Necesitamos escuchar a todas antes de armar el equipo.» y el botón «Entendido».
- La primera vez que el estudiante entra al paso Escuchar de cada fase, la burbuja aparece abierta. Después, solo al pulsar «?».
- Pulsar el botón o la burbuja no inicia un arrastre de la escena.

### Puntos

- **Pendiente:** botón de 60 × 60 px en escritorio y 52 × 52 px en móvil (el círculo visible es menor), fondo #E2725B, borde 3 px #FFE29A, ícono de señal blanco y un anillo dorado que pulsa (escala de 1 a 2,2 en 1,6 s, en bucle).
- **Escuchado:** fondo `rgba(30,34,46,.9)`, borde 2 px #4CC27E, check verde, sin pulso.
- **Al tocarlo:** se abre la pista (tarjeta clara centrada en escritorio, hoja inferior en móvil) con «PISTA {n} DE {total}», el hablante, el contexto, el mensaje y el botón «Anotar y seguir explorando». Cuenta como escuchada al abrirse.

### Barra inferior

En escritorio: «Escuchaste {n} de {total}» con la indicación «Arrastra la escena para encontrar a todas las personas», y el botón principal, deshabilitado con «Escucha a las {total} personas» hasta escucharlas todas y luego «Ver el primer problema». En móvil, el contador y la indicación «Arrastra para explorar» flotan sobre la escena, y el botón va en el pie fijo. **No existe el botón «Ver pistas en lista» en este paso.**

### En los pasos de problema

Con todas las pistas ya escuchadas, el panel del problema muestra «Lo que dijo la comunidad» con una línea breve por pista (campo `summary`) y el enlace «Ver completo» (en móvil, «Pistas»), que abre la lista con los mensajes completos para repasarlos.

## Pasos de problema: directorio y hoja de vida

En cada paso se resuelve un solo problema. Los profesionales se presentan como **contactos**, cada uno con su **hoja de vida**, que reemplaza a la «Guía profesional». La acción principal es **arrastrar un contacto a «Tu equipo»**; el botón + de cada contacto hace lo mismo y es la alternativa para teclado, lector de pantalla y móvil.

### Regla de pantalla: sin desplazamiento de página

En escritorio (desde 1280 × 800) y en móvil (desde 375 × 667), el paso de problema entra completo en la altura de la pantalla. **Solo se desplaza la lista de contactos**, y la zona del equipo si tiene más contactos de los que caben. Para lograrlo:

- El encabezado ocupa **una sola fila**: cerrar, título de fase, los pasos como píldoras y el presupuesto. Los pasos no van en una fila aparte.
- El contenedor del paso usa `height: calc(100dvh - alto del encabezado)` y columnas con `display: flex; flex-direction: column; min-height: 0`. La lista es el único hijo con `flex: 1; overflow-y: auto`.
- Los paneles son oscuros y translúcidos (`rgba(22,25,35,.92)`), nunca una tarjeta clara grande. Textos: título del problema 19 px (17 px en móvil), detalle 14 px (13 px), etiquetas 12 px.

### Escritorio

Tres zonas sobre la escena de la fase, que **sigue visible** detrás, con un velo solo en los bordes (`linear-gradient(90deg, rgba(14,16,24,.55) 0%, rgba(14,16,24,.1) 40%, rgba(14,16,24,.1) 60%, rgba(14,16,24,.55) 100%)`):

- **Izquierda, 400 px: qué resolver.** De arriba hacia abajo: la tarjeta del problema (borde superior #E2725B); «Lo que dijo la comunidad» con una línea por pista y «Ver completo»; la **zona «Tu equipo para este problema»**, que ocupa el resto de la columna; y al pie «Atrás» y el botón principal.
- **Centro:** la escena, sin paneles.
- **Derecha, 500 px: a quién llamar.** Encabezado «CONTACTOS DISPONIBLES · 15» y «Cada llamada usa 1 punto de presupuesto.»; debajo, la lista en dos columnas de tarjetas compactas, con desplazamiento propio.

**Tarjeta de contacto (escritorio):** agarre de seis puntos, inicial en cuadro de 34 px, nombre de la persona, ocupación y dos botones: «Hoja de vida» (borde dorado) y + (40 × 34 px, #3F51B5). Si ya está en el equipo: fondo azul suave, opacidad .75, el + cambia a ✓ y no se puede arrastrar.

**Zona del equipo:** borde discontinuo de 2 px. Vacía, muestra una flecha hacia abajo, «Arrastra aquí a quien llamarías» y «Revisa su hoja de vida en la lista de la derecha y suéltalo en este espacio. También puedes usar el botón +.». Mientras se arrastra un contacto, el borde pasa a #8FB4FF; cuando el contacto está encima, el fondo se ilumina (`rgba(91,141,239,.22)`) y aparece «Suelta para agregar a {nombre}». Cada contacto agregado se muestra con su inicial, nombre, ocupación y botón de quitar.

**Hoja de vida (escritorio):** se abre **dentro del panel de contactos**, cubriéndolo, no como panel permanente ni como modal. Arriba, «← Contactos» para volver; abajo, fijo, el botón de ancho completo «Agregar al equipo de «{problema}»» (o «Ya está en tu equipo»). Su contenido se desplaza si es largo.

**Arrastre:** HTML Drag and Drop nativo o una librería ya usada en el proyecto; si ninguna está instalada, se implementa con eventos de puntero. Arrastrar sobre la zona del equipo y soltar equivale a pulsar +. Si el presupuesto es 0, los contactos no se pueden arrastrar.

### Móvil

Una sola columna que entra en la pantalla, sobre el fondo de la escena:

1. **Problema** (compacto): «PROBLEMA {n} DE {total}», el título, el detalle y el enlace «Pistas», que abre la lista completa.
2. **Tu equipo** (compacto): una fila de píldoras con los contactos agregados, cada una con su botón de quitar, que se desplaza horizontalmente si no caben. Vacía: «Toca + en un contacto para sumarlo».
3. **Contactos**, que ocupa el resto de la altura y es lo único que se desplaza: encabezado «CONTACTOS · 15» y «1 llamada = 1 punto», y una fila por contacto con nombre, ocupación, el enlace «Hoja de vida» y el botón + de 44 × 44 px (✓ si ya está).
4. **Pie fijo** con «Atrás» y el botón principal.

En móvil no hay arrastre. La hoja de vida se abre como hoja inferior y termina con el botón «Agregar al equipo de «{problema}»».

### Hoja de vida

Usa **solo datos del catálogo** de ocupaciones. No muestra las habilidades ni la descripción propias del caso, ni nada que indique a qué problema corresponde.

| Elemento | Origen |
| --- | --- |
| Etiqueta «HOJA DE VIDA · CONTACTO» e inicial | Fijo |
| Nombre de la persona («Mateo Salazar») | `ForestFireProfessional.personName` (personaje del caso) |
| Ocupación | `OccupationDetail.name` |
| Qué hacen | `OccupationDetail.whatTheyDo` |
| Conocimientos que usan | `OccupationDetail.knowledge` |
| Habilidades que necesitan | `OccupationDetail.skills` |
| Pie | «Datos del catálogo de ocupaciones», O\*NET `{onetCode}` y el enlace «Ver la ficha completa» a `discoveryPaths.occupation(id)` |

El enlace a la ficha completa abre en una pestaña o vista aparte sin perder el intento. Si no es posible, se omite en esta etapa. Estilo: fondo #FBF8F1, borde izquierdo 4 px #E2725B, píldoras blancas con borde #E6DFCF.

### Asignación

- Arrastrar el contacto al equipo, pulsar + o «Agregar al equipo» en la hoja de vida lo agrega al problema actual y gasta 1 punto. Está deshabilitado si ya está en ese problema o si el presupuesto restante es 0.
- Un mismo contacto puede estar en varios problemas, como hoy. Cada asignación cuenta por separado.
- Quitar un contacto devuelve el punto.
- Se conserva la lógica actual de `toggleProfessional` y `getBudgetSpent`.

## Revisar equipo y resultado de fase

### Revisar

Panel «REVISA TU EQUIPO» con el título «¿Así enfrentarás la {fase}?» y «Usarás {n} puntos. Te quedarán {restante} para las fases siguientes.» (en la última fase, sin la segunda oración). Debajo, una tarjeta por problema con los contactos llamados («Mateo Salazar (Bombero)») y «Cambiar», que vuelve a ese paso. Botón principal «Confirmar equipo». Reemplaza al diálogo «¿Confirmar este equipo?».

### Resultado de fase

Se mantiene el contenido actual de `PhaseResultScreen` con esta presentación:

1. **Encabezado oscuro** con el medallón de Lumi, «FASE {n} RESUELTA», «Así respondió tu equipo a la {fase}», una línea de Lumi y el recuadro «{satisfacción} de {máximo} puntos de satisfacción» de la fase.
2. **Una tarjeta clara por problema** con «PROBLEMA {n}», el título y las estrellas llenas o vacías con «{s} de {m}». Dentro:
   - **Aportó** (verde #ECFDF3, borde #A7DFBD, check): persona y ocupación, la etiqueta «Aportó», el texto de `professionalContributions` y el botón «Ver ficha».
   - **No era su función aquí** (gris neutro #F4F5F8, guion): persona y ocupación y el texto «Participó, pero su especialidad no respondía a la necesidad principal de este problema. Usó 1 punto de presupuesto.» Gris y no naranja, para no presentarlo como error.
   - **Quedó sin atender** (naranja #FFF4EC, borde #F2C4A3): un ítem por cada `missingContributionNarratives` de los esperados que faltaron. No se nombra la ocupación que faltaba.
3. **Pie oscuro** con «Te quedan {n} puntos de presupuesto para las fases {siguientes}.» y el botón «Ir a la fase {n}: {nombre}», o «Ver el cierre del caso» en la última.

**Pista en lo que quedó sin atender.** El prototipo muestra una línea opcional del tipo «Pista: ¿quién podría anticipar hacia dónde se mueve el fuego?». No se implementa en esta etapa. Si se agrega después, será un campo `retryHint` por contribución faltante.

El fin por presupuesto agotado (`BudgetGameOverScreen`) se mantiene con su lógica, y se ajusta a la tarjeta oscura con Lumi.

## Puntuación, mínimo para superar y cierre

### Puntuación

- **Satisfacción total** = `getTotalSatisfaction(assignments)`: un punto por cada profesional esperado que fue asignado a su problema. Máximo actual: 14.
- **Se elimina** el punto extra por presupuesto óptimo (`budgetBonus`) y la tarjeta de presupuesto óptimo del cierre (`getBudgetEvaluation`, `budgetPresentation`). `FOREST_FIRE_OPTIMAL_BUDGET` puede quedar como dato interno, sin mostrarse.
- El máximo se calcula, no se escribe a mano: `FOREST_FIRE_MAX_SATISFACTION` = suma de `expectedProfessionalIds.length`.

### Mínimo para superar

- Nueva constante configurable `FOREST_FIRE_PASS_SCORE = 10` (≈ 70 % de 14), en `ForestFireCaseLogic.ts`.
- **Superado** si `satisfacción ≥ FOREST_FIRE_PASS_SCORE`.
- Solo un intento superado llama a `completeCase('forest-fire')`. Hoy se llama siempre al finalizar; ese comportamiento cambia.
- Un intento terminado, superado o no, registra su puntaje (ver drawer).

### Cierre del caso

Secuencia final: resultado de la fase 3 → cierre. Sin `extra-question` ni `word-cloud`.

1. **Tarjeta clara superior:** medallón de Lumi (con destellos que se dispersan una vez solo si se superó), «Lumi», la etiqueta «CASO SUPERADO» (verde) o «CASO NO SUPERADO TODAVÍA» (naranja), el título y una línea de Lumi:
   - Superado: «¡La comunidad salió adelante!» y «Reuniste un equipo que respondió a la mayoría de las necesidades. Algunas funciones quedaron sin cubrir: si quieres, intenta alcanzar los {máximo} puntos.» (si llegó al máximo, se omite la segunda oración).
   - No superado: «La comunidad aún necesita más ayuda» y «Varias necesidades quedaron sin atender. Revisa las consecuencias de cada fase y vuelve con un nuevo equipo.»
2. **Barra de satisfacción:** «Satisfacción de la comunidad», «{n} de {máximo} puntos», barra con degradado azul a dorado y una marca vertical en el mínimo con la leyenda «Mínimo para superar: {mínimo}». Debajo, «Tu mejor puntaje en este caso: {mejor} de {máximo}.»
3. **Tres tarjetas por fase:** nombre, «{s} de {m}» y una fila por problema. Se elimina «puntos de presupuesto utilizados» y «asignaciones realizadas».
4. **Si se superó, «LO QUE LLEVAS CONTIGO»:** tarjetas que entran con animación, como en el cierre de misión:
   - **Íconos de ocupación:** «ÍCONOS DE OCUPACIÓN · {n} NUEVOS», con los nombres de las ocupaciones asignadas correctamente que aún no tenía. Usa el estado de descubrimiento de ocupaciones existente (`discoveryState`).
   - **Testimonio desbloqueado:** el recurso que hoy exige `unlockCaseId: 'forest-fire'`, con «Ver testimonio».
5. **Si no se superó:** recuadro con candado «El testimonio y los íconos se desbloquean al superar el caso» y «Revisa en cada fase qué quedó sin atender y vuelve a intentarlo. Tu mejor puntaje queda guardado.»
6. **Botones:** superado, «Volver a la ciudad» (principal) e «Intentar llegar a {máximo}» (secundario, oculto si llegó al máximo); no superado, «Intentar de nuevo» (principal) y «Volver a la ciudad».

Un reintento después de superar el caso no quita lo desbloqueado. Solo puede mejorar el mejor puntaje y sumar íconos nuevos.

## Drawer del caso y mejor puntaje

### Registro del puntaje

- Nuevo campo en el estado de aventura (`AdventureStore`): `caseBestScores: Record<string, number>`, inicializado en `{}`.
- Al terminar un intento (al mostrar el cierre), se guarda `max(mejor anterior, satisfacción del intento)`.
- `solvedCaseIds` sigue indicando qué casos están superados, y solo se actualiza con un intento superado.
- Los intentos abandonados con la X no registran puntaje.

### Drawer en `CityMapView`

Se agrega, entre la descripción y el botón, un recuadro según el estado:

| Estado | Etiqueta | Recuadro | Botón |
| --- | --- | --- | --- |
| Sin intentar (no hay puntaje) | «Disponible» (azul) | «Para superarlo necesitas al menos **{mínimo} de {máximo}** puntos de satisfacción. No hace falta una respuesta perfecta.» | «Iniciar» |
| Intentado, no superado | «En progreso» (naranja) | «Tu mejor puntaje {n} de {máximo}», barra naranja con la marca del mínimo y «Te faltan {mínimo − n} puntos para superarlo.» | «Intentar de nuevo» |
| Superado | «Superado» (verde) | «Tu mejor puntaje {n} de {máximo}», barra con degradado y la marca del mínimo, y «Superado. Puedes volver a jugarlo para llegar a {máximo}.» o, si llegó al máximo, «Respuesta completa: cubriste todas las necesidades.» | «Jugar de nuevo» |

La etiqueta actual «Caso resuelto» se reemplaza por «Superado». El subtítulo del punto en el mapa de la ciudad («La comunidad te agradece» o «Un llamado de auxilio») sigue dependiendo de `solvedCaseIds`.

## Datos

### Profesionales del caso enlazados al catálogo

- `ForestFireProfessional` gana `occupationId: string`, el `id` de la ocupación en `occupationCatalog`. La hoja de vida y los íconos de ocupación se leen de ahí.
- Se conservan `id` (del caso), `personName`, y los textos de `professionalContributions` y `missingContributionNarratives` de cada problema.
- `description` y `skills` del caso dejan de mostrarse. Se pueden borrar después de verificar que nada más los usa.
- **Faltan en el catálogo 13 ocupaciones:** bombero, meteorólogo/a, policía municipal, médico especialista, veterinario/a, biólogo/a, ingeniero/a medioambiental, ingeniero/a civil, operador/a de maquinaria, trabajador/a social, psicólogo/a, coordinador/a logístico/a y periodista (el caso tiene 15 profesionales; `paramedic` y `photographer` ya existen). Se agregan a `occupationCatalog` con todos los campos que usa `OccupationDetail`: `onetCode`, `whatTheyDo`, `knowledge`, `skills`, `interestScores`, `highPoints` y `careerIds`.
- **Contenido de esas ocupaciones:** el equipo de contenido lo entrega a partir de O*NET. Mientras tanto, se agregan con marcadores visibles («\[Qué hacen: por completar desde O*NET\]») y no con textos inventados. Codex debe listar al terminar qué ocupaciones quedaron con marcadores.
- Si una ocupación no existe en el catálogo, la hoja de vida muestra el nombre y la ocupación y el aviso «Ficha en preparación», sin romper el caso.

### Pistas en la escena

`ForestFireCommunityMessage` gana:

| Campo | Tipo | Uso |
| --- | --- | --- |
| `position` | `{ x: number; y: number }` en porcentaje (0–100) | Ubicación del punto sobre la escena de la fase |
| `summary` | string, máximo 8 palabras | Línea breve en «Lo que dijo la comunidad» |

Posiciones provisionales para la fase 1, a ajustar sobre la ilustración real:

| Mensaje | `position` | `summary` |
| --- | --- | --- |
| `changing-fire` | 44, 30 | «el fuego cambia de dirección» |
| `traffic-chaos` | 78, 56 | «caos en la salida del pueblo» |
| `grandmother-at-risk` | 52, 70 | «una abuela no puede salir sola» |
| `outside-support` | 24, 76 | «afuera nadie sabe lo que pasa» |

Para las fases 2 y 3, Codex propone posiciones y resúmenes provisionales y los lista para revisión. Los puntos no deben superponerse ni quedar debajo del aviso de Lumi o de los controles inferiores.

### Fase

`ForestFirePhase` gana `listenPrompt: string`, el texto de Lumi en el paso Escuchar.

## Accesibilidad y criterios de aceptación

**Accesibilidad y movimiento**

- Cada punto de la escena es un `<button>` con `aria-label` del tipo «Pista: vecino, mirando el humo» y, si ya se escuchó, «(escuchada)».
- La pista, la lista, el directorio y la hoja de vida son diálogos con foco atrapado, cierre con Escape y retorno del foco al control que los abrió.
- Áreas táctiles de al menos 44 × 44 px. Todo funciona a 360 px de ancho sin desplazamiento horizontal de la página (la escena puede desplazarse dentro de su contenedor).
- Con `prefers-reduced-motion`: sin pulso en los puntos, sin destellos en el cierre, sin animaciones de entrada; los estados se ven completos.
- Los estados «Aportó», «No era su función aquí» y «Quedó sin atender» llevan ícono y texto, no solo color.

**Criterios de aceptación**

- [ ] Cada fase sigue Escuchar → un paso por problema → Revisar → Resultado, igual en escritorio y móvil.
- [ ] Las pistas aparecen como puntos sobre la escena, que se recorre arrastrándola dentro de sus límites en escritorio y móvil; al tocar un punto se abre su pista y queda marcada como escuchada, pero no al soltar después de arrastrar. El botón «?» abre la explicación de Lumi, que aparece abierta la primera vez en cada fase.
- [ ] No se puede pasar al primer problema sin abrir cada pista; en el paso Escuchar no existe una lista de pistas.
- [ ] En cada problema se ve solo ese problema, y no se avanza sin al menos un contacto.
- [ ] En escritorio se asigna arrastrando el contacto a «Tu equipo» o con +; en móvil, con +. El paso de problema no tiene desplazamiento de página en 1280 × 800 ni en 375 × 667: solo se desplaza la lista de contactos.
- [ ] La hoja de vida muestra qué hacen, conocimientos y habilidades del catálogo, y no los textos propios del caso.
- [ ] Las ocupaciones del caso que faltaban están en el catálogo (con datos o con marcadores listados).
- [ ] El cierre no muestra presupuesto óptimo, ni punto extra, ni la sección del profesional adicional; `extra-question` y `word-cloud` no aparecen.
- [ ] El máximo de satisfacción se calcula de los datos (14 hoy) y el mínimo es `FOREST_FIRE_PASS_SCORE` (10).
- [ ] Solo un intento con satisfacción ≥ mínimo marca el caso como superado y entrega íconos y testimonio.
- [ ] El mejor puntaje se guarda por caso y el drawer muestra los tres estados: sin intentar, en progreso y superado.
- [ ] Salir con la X durante una fase pide confirmación y no registra el intento.
- [ ] Se conservan el límite de 16 puntos y el fin por presupuesto agotado.

**Al terminar, Codex informa:** las ocupaciones agregadas con marcadores, las posiciones y resúmenes provisionales de las fases 2 y 3, y cualquier uso de `description` o `skills` del caso que encontró fuera de esta vista.
