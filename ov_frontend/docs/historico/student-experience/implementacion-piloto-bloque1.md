# Piloto del Bloque 1

Decisiones aprobadas por el usuario el 6 de octubre de 2026. Orden de implementación: evaluación y seguimiento; personalización y avisos; misiones adicionales. La especificación adjunta se conserva en `especificacion-registros-personalizados-adicionales.md`. Las decisiones siguientes prevalecen sobre sus referencias al seguimiento anterior y al antiguo ítem de Horizonte.

## Correspondencia del recorrido

| Orden | Nodo                     | Identificador        | Proceso base                                             | Estado del contenido            |
| ----- | ------------------------ | -------------------- | -------------------------------------------------------- | ------------------------------- |
| 1     | El inicio del viaje      | mission-welcome      | ACT pendiente; MIS-01 actual                             | Disponible                      |
| 2     | Más allá de los mitos    | enc-mitos            | Encuentro previo a ACT-07; ENC-MITOS, sin ACT confirmado | Disponible                      |
| 3     | Mis propios pregones     | act-07               | ACT-07                                                   | Disponible                      |
| 4     | Las huellas que traigo   | mission-story        | ACT-04, correspondencia del piloto                       | Personas, logros y síntesis     |
| 5     | Mi horizonte             | mission-future       | ACT-05, correspondencia del piloto                       | Aspiración, emociones y entorno |
| 6     | Mi brújula personal      | mission-compass      | ACT pendiente; MIS-05 actual                             | Test existente                  |
| 7     | Un camino propio         | act-06               | ACT-06 · Mi mapa de ruta                                 | Matriz existente, P3–P5         |
| 8     | Preparar la mochila      | mission-expectations | ACT pendiente; MIS-07 actual                             | **Contenido pendiente**         |
| 9     | Elegir mi siguiente paso | mission-next-step    | ACT pendiente; MIS-08 actual                             | **Contenido pendiente**         |

`reflection/config.ts` define el orden único. Cada actividad base exige solo la anterior; los nodos 1–7 se habilitan secuencialmente. Los nodos 8–9 permanecen visibles y bloqueados, incluso al cumplir el requisito. Las finalizaciones históricas mantienen su acceso. El denominador obligatorio sigue siendo nueve. Se conserva el modo de revisión global preexistente (`prototypeAllUnlocked`) y la migración de rutas terminadas; las adicionales no participan en estos accesos.

## Datos y proveedor sustituible

`ov.missions.v2` conserva todas las entregas, versiones, borradores y finalizaciones. `ov.student-followups.v1` conserva el texto inicial y los dos turnos de ampliación como máximo. El nuevo almacén aditivo `ov.student-reflections.v1` guarda identidades estables de respuesta, vínculos a entregas, revisión, estado de cierre, evaluaciones inmutables, enunciados mostrados, escenarios y desbloqueos.

El contrato `ReflectionProvider` expone `evaluateResponse` y `generatePersonalizedQuestion`. Se sustituye con `setReflectionProvider` sin modificar los componentes. La entrega usa únicamente el proveedor simulado, con `modelo = "simulado"`. No hay backend, credenciales ni llamadas reales a un LLM. La evaluación recibe el enunciado mostrado, los criterios y todas las respuestas del estudiante, excluyendo el texto de las preguntas de Lumi.

Los escenarios explícitos determinan las clasificaciones; no se usan longitud ni palabras clave. Sin escenario, ante fallo o tras 10 segundos se guarda NO_EVALUADA sin criterios faltantes inventados. ADECUADA cierra inmediatamente; INSUFICIENTE permite hasta dos seguimientos. Omitir o agotar turnos cierra con la última evaluación. La condensación conserva las ampliaciones en una entrega nueva, vinculando la evaluación a esa versión. El evento RESPUESTA_REFLEXIVA se registra una sola vez por identidad de respuesta al alcanzar FINAL y ADECUADA. Se deduplican operaciones en curso y se descartan resultados de versiones o revisiones reemplazadas.

Por solicitud del usuario se retira el simulador de la interfaz, incluido el botón del matraz. El recorrido activo configura los tres ítems de Pregones con resultado ADECUADA en `presentationScenarios`, sin inferencias por longitud ni palabras clave. Al guardar y cerrar la respuesta, se desbloquea Ecos de la plaza y su contenido puede utilizarse para personalizar Huellas. La configuración interna de escenarios se conserva para las pruebas y el proveedor sigue siendo sustituible. Las evaluaciones y enunciados históricos no se reescriben.

## Contenido y privacidad

Huellas incorpora personas y logros visibles para la orientadora; la síntesis histórica permanece privada y última. Horizonte incorpora una aspiración nueva visible, después emociones y entorno. `mission-future-entry` se retira del recorrido nuevo: conserva sus entregas privadas, disponibles como historial de solo lectura al repasar la aspiración, y nunca sirve como origen. No se migran visibilidades ni se convierten respuestas históricas en evaluadas. Los nuevos ítems usan 30–800 caracteres; los existentes conservan sus límites. La visibilidad aparece antes del campo de respuesta.

ACT-06 conserva sus celdas y validaciones, sin evaluación ni seguimiento. Solo se personalizan P3–P5; la alternativa en papel continúa omitida. El test de brújula no recibe evaluación ni cambios de contenido.

## Personalización

| Pregunta | Destino                     | Origen                        |
| -------- | --------------------------- | ----------------------------- |
| P1       | Huellas · personas          | Pregones · r07-frase          |
| P2       | Horizonte · entorno         | Pregones · r07-frase          |
| P3       | ACT-06 · g-anio1-meta       | Horizonte · future-aspiracion |
| P4       | ACT-06 · g-anio1-cuento     | Huellas · story-logros        |
| P5       | ACT-06 · g-anio1-obstaculos | Pregones · r07-frase          |

Se preparan en segundo plano al entrar. Solo se admiten registros visibles para la orientadora y anteriores en el mapa. Se verifica cita literal de 3–15 palabras, comillas «», una o dos oraciones y máximo 45 palabras. Se reintenta una vez con un presupuesto total de seis segundos. Fallo, origen ausente, privado o NO_EVALUADA producen pregunta base sin aviso. Un origen insuficiente produce el aviso neutro correspondiente; dentro de ACT-06 aparece solo en la primera celda que usa ese origen. El enunciado y la copia de origen quedan fijados para posteriores visitas y versiones de respuesta. P1–P2 se evalúan con el enunciado mostrado; P3–P5 solo validan formato.

## Adicionales

Ecos de la plaza se abre por frase o postura de Pregones; El objeto que guardo, por logros o personas de Huellas; Los que también dudaron, por emociones o entorno de Horizonte. Sus textos y relatos son provisionales y están configurados fuera de los componentes. M3 contiene dos relatos de tres intervenciones y una reflexión, sin fichas ni compuertas.

Antes del desbloqueo no existen nodos ni senderos visibles. Al regresar al mapa, las nuevas misiones aparecen en cola: nodo a 0,5 s, etiqueta a 0,9 s, sendero de 1,15 a 2,55 s y tarjeta final a 2,7 s. Se encuadran origen y destino; se marca visto solo al terminar. Una secuencia interrumpida se repite. La tarjeta final pendiente se conserva al recargar, sin repetir las secuencias ya vistas. Con movimiento reducido se muestra el estado final. La estrella identifica lo adicional, incluso al completarse en verde.

Por ajuste directo del usuario del 6 de octubre de 2026, el aviso final usa la misma presentación de las notificaciones de insignias: aviso compacto inferior, avatar de Lumi, etiqueta «Nueva misión adicional», título de la misión, texto de origen, acción «Ver la misión» con estilo de enlace y X «Cerrar aviso». Se cierra automáticamente a los siete segundos, sin mover el foco ni exigir «Seguir con el camino». Se conserva el descubrimiento del nodo y su sendero. Los avisos de insignias esperan a que terminen el descubrimiento y el aviso de la misión; la guía, el registro de señal y el detalle de un punto pausan el aviso y conservan su estado pendiente.

Las insignias ocultas Eco desarmado (I11), Guardián de recuerdos (I12) y Duda compartida (I13) se derivan de finalizaciones únicas y aparecen en cierre, pasaporte y novedades. Las adicionales no cuentan para avance, niveles ni requisitos. `additionalThematicProgress` proporciona su agregación temática sin acceder al panel de la orientadora.

## Verificación

### Alcance temporal de la demostración

Por decisión del usuario, el Camino activo termina en «Las huellas que traigo» (orden 4). `src/features/occupation-exploration/lib/StudentDemoScope.ts` centraliza este límite. Los nodos posteriores siguen visibles y bloqueados, incluso si tienen una finalización histórica. Ecos de la plaza se habilita al desarrollar Pregones; las otras adicionales quedan ocultas, sin consumir sus secuencias pendientes. Ciudad, desafíos y conversaciones familiares conservan los accesos anteriores del modo de revisión. Los enlaces directos del Camino respetan el límite y el cierre de Huellas no ofrece continuar a Horizonte. Si un ítem es origen de personalización, muestra únicamente «Esta pregunta puede influir más adelante en tu camino.», sin nombrar destinos, aunque todavía estén bloqueados. La interfaz no indica que es una demostración ni muestra un mensaje de fin del tramo; usa únicamente los estados normales de bloqueo.

Este límite no modifica respuestas, versiones, finalizaciones, desbloqueos ni el avance obligatorio de nueve nodos. Desactivar `studentDemoEnabled` restaura el piloto completo descrito arriba y sus accesos históricos.

Se verificó el bloqueo por enlace directo a Horizonte y el acceso a Huellas en el navegador. Build y lint correctos; las suites autorizadas cubren ahora 63 pruebas, incluida la recuperación del alcance completo con finalizaciones y desbloqueos históricos.

La suite `tests/student-reflection-pilot.test.mjs` cubre escenarios, seguimiento, límites, persistencia, eventos, versiones, privacidad, P1–P5, respaldo, mapa, desbloqueos alternativos, cola e insignias. Se ejecutan build, lint y suites específicas autorizadas. No se ejecuta la suite protegida de orientadores ni se accede a los portales protegidos. La revisión visual incluye escritorio y 360 px.

Verificación realizada el 6 de octubre de 2026:

- `npm run lint`: correcto.
- `npm run build`: correcto. Vite mantiene el aviso de tamaño del paquete principal superior a 500 kB.
- 62 pruebas correctas, ejecutando `node --test tests/student-reflection-pilot.test.mjs tests/student-progress-challenges.test.mjs tests/mission-logic.test.mjs tests/mission-store.test.mjs tests/adventure-state.test.mjs tests/deployment-assets.test.mjs`.
- Revisión en navegador a 1280 px y 360 px: visibilidad antes de responder, P1 y P2 con recuerdo completo, síntesis privada, ampliación recuperada al recargar, P3–P5 dentro de sus celdas y diálogo de salida legible. Guardar las celdas de ACT-06 no incrementó evaluaciones ni eventos reflexivos.
- Aparición de adicionales, insignia de Guardián de recuerdos en cierre y pasaporte, y nodo completado conservando su estrella. Los registros existentes no se borraron; se usaron respuestas de prueba para recorrer el prototipo local.
