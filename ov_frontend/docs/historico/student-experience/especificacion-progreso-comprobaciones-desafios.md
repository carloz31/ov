# Especificación: progreso, comprobaciones y desafíos del estudiante

Oct 6, 2026 · @Carlos Sanchez

Esta especificación cambia cinco piezas de la experiencia del estudiante: la barra de progreso, las comprobaciones con reintento, la pantalla de cierre de misión, una nueva actividad de desafío contra enemigos y un botón de exploración en carreras y ocupaciones. El diseño de referencia está en la página Estudiante del prototipo [Progreso y retroalimentación](https://claude.ai/artifact/1vusmJWnPqmSMCffqVvJeE).

## Contexto y alcance

La experiencia del estudiante tiene una estética propia: paneles oscuros translúcidos sobre ilustraciones de escenarios, con Lumi como guía. Las comprobaciones siguen la misma lógica que se implementó para el apoderado (estados con color, ícono y texto, y hasta dos intentos), adaptada a esa estética y con trato de tú.

- **Aplica a:** las vistas de actividad de los bloques con `Bloque.audiencia = ESTUDIANTE`, la pantalla de cierre de misión, la nueva actividad de desafío y el detalle de carreras y ocupaciones.
- **No cambia:** las vistas del apoderado, que ya tienen su propia especificación.
- **Implementación:** reutilizar los componentes existentes del proyecto y los que se crearon para el apoderado (estados de opción, mensajes de resultado, tarjeta de ficha), con una variante de tema oscuro. Las animaciones se resuelven con CSS, sin librerías nuevas.
- **Datos:** las secciones de barra, comprobaciones y cierre solo cambian la presentación. El desafío y el botón de exploración sí requieren datos nuevos, descritos en sus secciones. Antes de crear tablas o clases, revisar si el repositorio ya tiene un equivalente y reutilizarlo.
- **Textos:** los textos entre comillas son literales, en español y con trato de tú. Los marcados entre corchetes, como «\[Recompensa del enemigo\]», son marcadores que se reemplazan con el contenido real.

## Tokens de diseño del estudiante

El estudiante usa dos superficies: el panel oscuro translúcido para las misiones y la tarjeta clara para los cierres. Los botones principales usan el mismo azul de la plataforma.

| Token | Valor | Uso |
| --- | --- | --- |
| `--est-primario` | #3F51B5 | Botones principales en ambas superficies |
| `--est-encabezado` | rgba(16,19,28,.88) | Fondo del encabezado de la misión |
| `--est-panel` | rgba(22,25,35,.95) | Panel oscuro de preguntas |
| `--est-panel-acento` | #E2725B | Borde superior de 3 px del panel de comprobación y del desafío |
| `--est-texto` | #E8EAF0 | Texto sobre el panel oscuro |
| `--est-texto-fuerte` | #F4F5F8 | Preguntas y títulos sobre el panel oscuro |
| `--est-texto-suave` | #B9BFD0 | Etiquetas y textos secundarios sobre el panel oscuro |
| `--est-seleccion` | rgba(91,141,239,.20) con borde 2 px #5B8DEF | Opción seleccionada antes de comprobar |
| `--est-correcto` | rgba(63,174,106,.16) con borde 2 px #4CC27E | Opción correcta; ícono y etiqueta #2F9E5E |
| `--est-incorrecto` | rgba(240,138,75,.14) con borde 2 px #F08A4B | Opción elegida e incorrecta; ícono #E0702E |
| `--est-pista` | rgba(240,138,75,.10) con borde 1 px rgba(240,138,75,.45) | Caja de pista y de resultado no acertado; titular #FFB98A |
| `--est-exito` | rgba(63,174,106,.12) con borde 1 px rgba(76,194,126,.5) | Caja de resultado acertado; titular #8FE3B0 |
| `--est-lumi` | #FFD666 sobre #3A3220 con borde #C99A3E | Estrella y medallón de Lumi |
| `--est-tarjeta` | rgba(250,250,252,.97), texto #1F2433 | Tarjeta clara de cierre |

La tarjeta de ficha y la del diente de la llave reutilizan, en la tarjeta clara, los estilos ya definidos para el apoderado: ámbar (#FFF8E6, borde #F1D48A) para fichas y azul suave (#EEF1FB, borde #C9D1F2) para objetos y caminos.

## Barra de progreso con la estrella de Lumi

La barra pequeña junto al título se reemplaza por una barra de 6 px a todo el ancho del encabezado, con la estrella de Lumi en la punta. La estrella brilla más a medida que el estudiante avanza. No se usa fuego ni ningún elemento de racha.

**Encabezado**

- Fondo `--est-encabezado`. Botón de cerrar (44 × 44 px, `aria-label="Salir de la misión"`) y botón de sonido a la derecha, como hoy.
- Lugar del mapa ("Bosque de recuerdos") a 13 px en `--est-texto-suave`, y título de la misión a 17 px, peso 700.
- "Paso X de N" a 14 px, peso 600, color #F2D58A. Se mantiene siempre.

**Barra**

- Contenedor con radio completo y el degradado a todo el ancho: `linear-gradient(90deg, #4F7CF0 0%, #8FB4FF 45%, #F2C66D 80%, #FFE29A 100%)`.
- Una capa opaca #2E3344, anclada a la derecha, cubre la parte no completada con `width: (100 - progreso)%` y `transition: width .7s ease`. Igual que en el apoderado, el relleno revela el degradado.
- **Estrella:** ícono de estrella de 20 px, color #FFD666, posicionado en `left: progreso%` y centrado sobre la barra, con `transition: left .7s ease`. Su brillo crece con el avance: `filter: drop-shadow(0 0 Gpx rgba(255,214,102,.95))`, con `G = 3 + 9 × progreso / 100` (de 3 a 12 px).
- **Destello de nuevo momento:** al entrar al primer paso de un nuevo momento, un anillo de 26 px con borde 2 px #FFE29A se expande desde la estrella y se desvanece una vez (animación `spark`). Se activa con un campo opcional `nuevoMomento: true` en el paso del JSON de contenido. Al llegar al 100 % también se muestra el destello.
- Accesibilidad: `role="progressbar"` con `aria-valuenow`, `aria-valuemax` y `aria-valuetext="Paso X de N"`.

## Comprobaciones con reintento

Las comprobaciones del estudiante adoptan el flujo de dos intentos del apoderado. Hoy el resultado se muestra como líneas "×" separadas de las opciones, y no se sabe a qué opción corresponde cada una. Ahora cada estado se marca en la propia opción, con color, ícono y etiqueta.

**Apariencia de cada opción** (sobre `--est-panel`, altura mínima 54 px, radio 14 px)

| Estado | Estilo | Indicador | Etiqueta |
| --- | --- | --- | --- |
| Sin elegir | Fondo rgba(255,255,255,.04), borde 1.5 px rgba(255,255,255,.18) | Radio vacío (una respuesta) o casilla vacía con radio 6 px (múltiple) | Ninguna |
| Elegida, sin comprobar | `--est-seleccion` | Radio con punto #AFC0FF, o casilla #5B8DEF con check | Ninguna |
| Correcta, resultado final | `--est-correcto`, texto peso 600 | Círculo o casilla #2F9E5E con check blanco | "Respuesta correcta" o "Tu respuesta · Correcta" |
| Elegida e incorrecta | `--est-incorrecto`, texto peso 600, deshabilitada | Círculo o casilla #E0702E con X blanca | "Tu respuesta" |
| Correcta no marcada, resultado final (múltiple) | Fondo transparente, borde 2 px discontinuo #4CC27E | Casilla con borde #4CC27E | "También era \[lo correcto\]", por ejemplo "También era un mito" |
| Resto, resultado final | Fondo rgba(255,255,255,.02), texto #9AA0B2 | Vacío | Ninguna |

**Pregunta de una respuesta**

1. El estudiante elige una opción y pulsa "Comprobar" (deshabilitado sin selección).
2. Si acierta, se muestra el resultado final.
3. Si falla en el primer intento, su opción queda en estado incorrecto y bloqueada. Aparece la caja de pista `--est-pista` con el medallón de Lumi de 36 px, el titular "Casi. Piénsalo una vez más." y la explicación de la opción elegida, sin revelar la correcta. El botón cambia a "Comprobar de nuevo".
4. En el segundo intento se muestra el resultado final: si acierta, "¡Bien visto!" seguido de la explicación; si falla, la correcta se revela con el titular "La respuesta clave era «{opción}»." y su explicación.
5. Las preguntas con solo dos opciones se resuelven en el primer intento.

**Pregunta de opción múltiple**

- Bajo el enunciado, la indicación "Marca todas las que correspondan." en `--est-texto-suave`.
- **Primer intento con errores:** las opciones erróneas marcadas quedan en estado incorrecto, bloqueadas y con su explicación debajo del texto de la opción. Las válidas marcadas siguen seleccionadas y se pueden ajustar. Nada se muestra en verde. Titular de la pista: "Vas por buen camino. Algunas frases no corresponden." y el texto "Las que no corresponden quedaron en naranja con su explicación. Revisa si falta alguna."
- **Primer intento sin errores pero incompleto:** no se bloquea nada. Titular: "Vas por buen camino, pero falta al menos una frase.", sin revelar cuál.
- **Primer intento solo con erróneas:** titular "Casi. Piénsalo una vez más."
- **Resultado final:** la explicación de cada opción aparece debajo de su texto, y la caja de resultado resume el conjunto (por ejemplo, "Tres de las cuatro frases eran mitos."). Las líneas "×" sueltas se eliminan.

**Reglas comunes**

- Las explicaciones se leen del campo `explicacion` de cada opción en el JSON.
- Un primer intento erróneo o parcialmente correcto no cuenta en `compuertasAcertadasPrimerIntento`.
- Al repasar una actividad completada, las comprobaciones empiezan sin respuestas precargadas, siguen el mismo flujo y no se registran.
- Debajo del panel se mantienen "Ver ficha" como botón secundario y "Continuar el camino" como principal, que aparece solo con el resultado final.

## Pantalla de cierre de misión

La tarjeta clara de cierre conserva sus contenidos actuales (desbloqueos, pregunta del diario y lo que viene), pero presenta cada desbloqueo como una tarjeta que aparece con animación, en lugar de líneas de texto.

**Orden de los elementos** (tarjeta `--est-tarjeta`, radio 22 px, contenido centrado)

1. **Medallón de Lumi:** círculo de 92 px, fondo #F6EBCF, borde 3 px #C99A3E, estrella #F2B630, halo de 12 px rgba(243,231,201,.7). Entra con `pop` y lanza 16 destellos que se dispersan una vez (`burst`), con los colores #FFD666, #F2C66D, #FFE29A, #8FB4FF, #5B8DEF y #4CC27E. Debajo, "Lumi" a 13 px.
2. **Título:** se mantiene el texto actual, por ejemplo "Este hallazgo viaja contigo.", a 24 px.
3. **Se elimina la línea "Obtuviste: …"**, porque repite lo que muestra la sección siguiente.
4. **"LO QUE LLEVAS CONTIGO":** una tarjeta por cada desbloqueo de la misión, que entran con `pop` escalonado (0,55 s y luego +0,25 s cada una):
   - **Objeto de camino** (por ejemplo, el diente de la llave): tarjeta azul suave con ícono sobre #3F51B5, nombre, etiqueta "Nuevo" y una barra segmentada con el avance hacia lo que desbloquea: "{obtenidos} de {necesarios} dientes para abrir {lugar}".
   - **Ficha:** tarjeta ámbar con la etiqueta "FICHA GUARDADA EN TU MOCHILA", el título de la ficha y el botón "Ver ficha".
   - Otros desbloqueos (testimonios, insignias) usan la misma estructura: ícono, etiqueta de tipo, nombre y, si aplica, un botón.
5. **Pregunta del diario:** recuadro #F4F5F8 con la etiqueta "NUEVA PREGUNTA EN TU DIARIO", la pregunta en cursiva y el botón secundario "Escribir en mi diario". Solo aparece si la misión desbloquea una pregunta.
6. **Salida:** un único botón principal "Continuar" que cierra la actividad y regresa al mapa de su zona. No se ofrecen botones para abrir la siguiente actividad ni una segunda acción para volver al mapa. Este ajuste fue solicitado directamente por el usuario el 6 de octubre de 2026.

Los datos ya existen: los desbloqueos que genera la misión y la pregunta de diario asociada. El avance del objeto de camino se calcula con los objetos que el estudiante ya tiene frente a los que exige el desbloqueo.

## Desafíos contra enemigos

El desafío es una nueva actividad que verifica si el estudiante leyó y comprendió una o más fichas. Los enemigos son personificaciones de ideas equivocadas, como mitos, rumores o información desactualizada, que bloquean caminos de la ciudad. La información real, la luz de Lumi, los disipa. Cada acierto le quita una vida al enemigo y cada error le quita un destello al estudiante.

### Configuración por enemigo

Cada enemigo se configura por separado. La configuración es la misma para todos los estudiantes.

| Campo | Tipo | Descripción |
| --- | --- | --- |
| `codigo`, `nombre` | string | Identificador y nombre visible, por ejemplo "El Rumor" |
| `presentacion` | string | Texto de Lumi en la pantalla de inicio |
| `ilustracion` | recurso | Imagen o SVG del enemigo |
| `vidasEnemigo` | int, mínimo 1 | Aciertos necesarios para vencerlo |
| `vidasEstudiante` | int, mínimo 1 | Errores permitidos antes de perder |
| `opcionesPorPregunta` | int, de 3 a 5 | Todas las preguntas de su banco tienen exactamente esta cantidad |
| `banco` | lista de preguntas | Cada una con `enunciado`, `opciones`, `correcta` y `explicacion` |
| `requisitos` | lista de 1 o más fichas o actividades | Lo que debe haberse completado para habilitarlo |
| `recompensa` | desbloqueo | Lo que se obtiene al vencerlo por primera vez, por ejemplo un camino o un objeto |
| `logroOculto` | insignia, opcional | Insignia oculta por vencerlo sin perder destellos |

**Validaciones al guardar la configuración.** Un enemigo que no las cumpla no puede publicarse:

1. `banco.length ≥ vidasEnemigo + vidasEstudiante − 1`, para que un intento completo no repita preguntas.
2. Todas las preguntas del banco tienen `opcionesPorPregunta` opciones y exactamente una correcta.
3. La probabilidad de vencer respondiendo al azar es menor al 10 %. Con `p = 1 / opcionesPorPregunta`, se calcula como `P(e, s) = p · P(e − 1, s) + (1 − p) · P(e, s − 1)`, con `P(0, s) = 1` y `P(e, 0) = 0`, evaluada en `P(vidasEnemigo, vidasEstudiante)`. Por ejemplo, 5 contra 3 con 4 opciones da 1,3 %, y 3 contra 3 con 3 opciones da 21 %, que no se acepta.

### Habilitación

- El enemigo se habilita cuando el estudiante completó **todos** sus requisitos. Usar el mismo mecanismo de desbloqueo que ya usan las actividades del estudiante.
- Antes de habilitarse, el enemigo es visible en el mapa como bloqueado. Al tocarlo, se muestran las fichas que exige y cuáles ya tiene.
- En la pantalla de inicio, cada ficha requerida aparece con un check y el texto "Habilitado por leer la ficha «{título}»" (una línea por ficha).

### Flujo y pantallas

1. **Inicio:** el enemigo flotando sobre el escenario y un panel oscuro con el medallón de Lumi, el título narrativo, la `presentacion`, tres recuadros con las reglas ("{nombre}: {vidasEnemigo} de vida", "Tú: {vidasEstudiante} destellos", "Cada pregunta: {opcionesPorPregunta} opciones"), tres indicaciones breves, los requisitos cumplidos y los botones "Enfrentar a {nombre}" y "Repasar la ficha antes". Si hay varias fichas, este botón abre la lista de fichas requeridas.
2. **Batalla:** arriba, el nombre del enemigo, su barra de vida segmentada (un segmento por vida, color #E2725B) y su ilustración, cuya opacidad baja con la vida: `0,4 + 0,6 × vida / vidasEnemigo`. Abajo, el panel con "PREGUNTA {n}", los destellos del estudiante (estrellas #FFD666 encendidas o apagadas), el enunciado y las opciones con su letra (A, B, C…).
3. **Respuesta:** se evalúa al tocar una opción, sin botón de confirmar. Se marcan la correcta y la elegida con los estados de la sección de comprobaciones, se revela la correcta y aparece la explicación. Si acierta: destello de luz sobre el enemigo, sacudida (`shake`), un segmento menos y el titular "¡Golpe de luz! {nombre} pierde fuerza.". Si falla: la estrella perdida se apaga con `dim` y el titular es "{nombre} resiste. Pierdes un destello.". El botón "Siguiente pregunta" pasa a "Ver resultado" cuando la batalla termina.
4. **Victoria:** el enemigo se disuelve (`vanish`) con destellos, y aparece la tarjeta clara con "DESAFÍO SUPERADO", "¡Disipaste a {nombre}!", una línea sobre el camino despejado, dos píldoras ("{aciertos} aciertos de {preguntas} preguntas" y "Te quedaron {destellos} destellos"), el logro oculto si aplica, la tarjeta de la recompensa y un único botón principal "Continuar" que regresa al mapa de Ciudad. Se aplica también al terminar una práctica.
5. **Derrota:** panel oscuro con el medallón de Lumi, "{nombre} resistió esta vez.", "Le quitaste {n} de sus {vidasEnemigo} vidas. Repasa la ficha y volvamos con más luz: en el próximo intento habrá preguntas nuevas." y "No pierdes nada de lo que ya lograste en tu recorrido.". Botones: "Repasar la ficha" (principal), "Intentar de nuevo" y "Volver a la ciudad".

### Reglas de la batalla

- **Selección de preguntas:** al iniciar cada intento se baraja el banco y se toman en orden, sin repetir dentro del intento. En un reintento se priorizan las preguntas que no salieron en el intento anterior.
- **Fichas bloqueadas:** durante la batalla no se puede abrir ninguna ficha. El panel muestra un candado con "Las fichas se abren al terminar el desafío".
- **Sin temporizador.** No hay límite de tiempo por pregunta ni por batalla.
- **Sin estado guardado:** el intento en curso vive solo en memoria. Si el estudiante sale con la X o cierra la página, el intento se descarta y al volver empieza desde la pantalla de inicio. Al pulsar la X durante la batalla se pide confirmación: "¿Salir del desafío? Este intento no se guardará." Un intento abandonado no se registra.
- **Las vidas existen solo dentro del intento.** Una derrota no modifica ningún otro progreso, insignia ni desbloqueo.

### Registro

- Al terminar cada intento, ganado o perdido, se guarda un resultado con `fechaHora`, `victoria`, `aciertos`, `preguntas` y `vidasRestantes`, de forma análoga a `ResultadoCaso`.
- La primera victoria registra `COMPLETA_ACTIVIDAD`, entrega la `recompensa` y, si no perdió destellos, el `logroOculto`.
- Después de la primera victoria, el desafío puede repetirse como práctica, sin registrar resultados ni volver a entregar recompensas.
- Métrica para el panel de análisis (Meta 4): porcentaje de estudiantes que vencen a cada enemigo en su primer intento registrado.

### Modelo de datos

El diagrama de clases no tiene estas entidades. Se propone modelar el desafío como subtipo de `Actividad`, igual que `Caso`, con los campos de configuración; las preguntas del banco como un tipo propio vinculado al desafío; y el resultado de cada intento como una clase análoga a `ResultadoCaso`, colgada de `ProgresoActividad`. Si el repositorio ya resuelve algo equivalente, reutilizarlo e informar la diferencia para actualizar el diagrama.

## Botón «Llévame a un lugar inesperado»

Al final del detalle de cada carrera y de cada ocupación aparece un botón que lleva a otra carrera u ocupación que el estudiante aún no ha visitado. Su propósito es ampliar la exploración más allá de su interés inicial (Meta 3).

**Ubicación y aspecto**

- Al final del detalle, después de todo el contenido y antes de la navegación inferior.
- Botón secundario de ancho completo en móvil, con un ícono de brújula o estrella y el texto "Llévame a un lugar inesperado". Encima, una línea breve: "¿Te animas a descubrir algo que aún no has visto?".
- No aparece en el detalle de instituciones.

**Destino**

- Desde una carrera lleva a una carrera; desde una ocupación, a una ocupación.
- **No visitada** significa que no existe un evento `VISTA_CARRERA` o `VISTA_OCUPACION` del estudiante con esa referencia.
- **Prioridad para carreras:** primero, carreras de familias (`FamiliaCarrera`) de las que el estudiante aún no ha visto ninguna carrera. Si no quedan, cualquier carrera no visitada. Dentro de cada grupo, se elige al azar.
- **Prioridad para ocupaciones:** primero, ocupaciones no visitadas cuyas carreras asociadas pertenezcan a familias no exploradas. Si no quedan, cualquier ocupación no visitada, al azar.
- **Exclusiones:** lo que está en sus favoritos o en sus tarjetas de carrera, y la carrera u ocupación actual.
- **Sin popularidad:** la selección nunca usa cuántos estudiantes vieron o eligieron algo.
- **Si ya visitó todo:** el botón lleva a la que vio hace más tiempo y, al llegar, se muestra "Ya recorriste todo el catálogo. Aquí tienes una que viste hace tiempo."

**Comportamiento**

- El destino se calcula al pulsar el botón, no al cargar la página.
- La visita registra el `VISTA_CARRERA` o `VISTA_OCUPACION` habitual.
- Pregunta abierta: decidir si las visitas que cuentan para la insignia de exploración por familias exigen un tiempo mínimo en el detalle o llegar a su final, para que no se obtenga con varios clics rápidos. Hasta que se decida, no cambiar la regla de la insignia.

## Animaciones, accesibilidad y criterios de aceptación

Se reutilizan `pop`, `rise` y `burst` de la especificación del apoderado, y se agregan las del estudiante. Todas se ejecutan una vez, salvo `float`, y se desactivan con `prefers-reduced-motion`.

```css
@keyframes spark  { 0% { transform: translate(-50%,-50%) scale(.3); opacity: .9 } 100% { transform: translate(-50%,-50%) scale(2.6); opacity: 0 } }
@keyframes shake  { 0%,100% { transform: translateX(0) } 20% { transform: translateX(-10px) } 40% { transform: translateX(9px) } 60% { transform: translateX(-6px) } 80% { transform: translateX(4px) } }
@keyframes flash  { 0% { opacity: .9; transform: scale(.4) } 100% { opacity: 0; transform: scale(1.8) } }
@keyframes dim    { 0% { transform: scale(1) } 40% { transform: scale(1.35) } 100% { transform: scale(1) } }
@keyframes vanish { 0% { opacity: 1; transform: scale(1); filter: blur(0) } 100% { opacity: 0; transform: scale(1.5); filter: blur(12px) } }
@keyframes float  { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-6px) } }

.anim-spark  { animation: spark .9s ease-out both }
.anim-shake  { animation: shake .5s ease-out both }
.anim-flash  { animation: flash .6s ease-out both }
.anim-dim    { animation: dim .5s ease-out both }
.anim-vanish { animation: vanish 1.2s ease-in .2s both }
.anim-float  { animation: float 3s ease-in-out infinite }

@media (prefers-reduced-motion: reduce) {
  .anim-shake, .anim-dim, .anim-float { animation: none }
  .anim-spark, .anim-flash { animation: none; opacity: 0 }
  .anim-vanish { animation: none; opacity: .15 }
  .barra-pista, .barra-estrella { transition: none }
}
```

**Accesibilidad**

- Contraste mínimo de 4.5:1 sobre el panel oscuro y sobre la tarjeta clara. No aclarar los tonos de texto definidos.
- Ningún estado depende solo del color: correcto, incorrecto y "también era" llevan ícono y etiqueta.
- La barra de vida del enemigo lleva `role="progressbar"` y `aria-label="Vida de {nombre}"`. Los destellos llevan `aria-label="Destellos restantes: X de N"`.
- Los mensajes de pista, resultado y respuesta en la batalla se anuncian con `aria-live="polite"`, y el foco pasa a su titular.
- Áreas táctiles de al menos 44 × 44 px. Todo funciona a 360 px de ancho sin desplazamiento horizontal.

**Criterios de aceptación**

- [ ] La barra ocupa todo el ancho del encabezado, revela el degradado azul a dorado y la estrella avanza y brilla más con el progreso.
- [ ] Un paso con `nuevoMomento: true` muestra el destello en la estrella; uno sin el campo no.
- [ ] En una pregunta de una respuesta, el primer error bloquea la opción, muestra la pista de Lumi y no revela la correcta; el segundo intento muestra el resultado final.
- [ ] En opción múltiple, las explicaciones aparecen debajo de cada opción y ya no hay líneas "×" sueltas.
- [ ] Las correctas no marcadas aparecen con borde discontinuo y "También era…" en el resultado final.
- [ ] El cierre de misión ya no muestra "Obtuviste: …" y presenta cada desbloqueo como tarjeta animada, con el avance del objeto de camino.
- [ ] Un enemigo con banco insuficiente, opciones inconsistentes o probabilidad al azar mayor o igual al 10 % no se puede publicar.
- [ ] Un enemigo con varias fichas requeridas solo se habilita cuando todas están completadas, y la pantalla de inicio las lista.
- [ ] Durante la batalla no se pueden abrir fichas y no hay temporizador.
- [ ] Salir con la X pide confirmación, descarta el intento y no registra nada.
- [ ] La primera victoria entrega la recompensa y registra la actividad; las repeticiones posteriores no.
- [ ] Una derrota no modifica ningún otro progreso.
- [ ] El botón "Llévame a un lugar inesperado" lleva a una carrera u ocupación no visitada, prioriza familias no exploradas y nunca usa popularidad.
- [ ] Con movimiento reducido activado, no hay animaciones y todo el contenido es visible.
- [ ] Las vistas del apoderado no cambian.
