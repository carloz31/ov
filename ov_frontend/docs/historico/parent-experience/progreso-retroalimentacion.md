# Progreso y retroalimentación del apoderado

Entrega del 6 de octubre de 2026. Fuente editorial: `Especificación progreso y retroalimentación en la ruta del apoderado.md`, entregada por el usuario. Los acuerdos del plan aprobado prevalecen sobre las variantes iniciales de ese documento.

## Acuerdos y alcance

- Se conserva el reproductor en pantalla completa, la X para salir, el contenido amplio y «Anterior» en los pasos de contenido. El cierre no ofrece retroceso.
- Los estilos del reproductor son exclusivos de padres: tipografía de 17 px, opciones de 18 px, títulos de 30 px (26 px en preguntas), controles de al menos 44 px y opciones de 60 px. La barra inferior del encabezado mide 8 px y revela el degradado con una capa derecha que transiciona durante .7 s. Sus valores accesibles cuentan pasos.
- `transicion?: string` es un metadato opcional del nodo. Solo padres lo presenta. Se anima al entrar por avance por primera vez en la sesión; al retroceder se muestra estático. La ficha también entra una sola vez por sesión.
- No se incorporan componentes, dependencias, persistencia ni migraciones. No se modifica la evaluación del estudiante. No se accede al portal de orientadores ni se ejecuta su prueba protegida.

## Comprobaciones y compatibilidad

Se usa una evaluación propia del apoderado al registrar y reconstruir la respuesta. Se mantienen inputs radio/checkbox reales, selección azul y «Comprobar respuesta» deshabilitado sin selección. Las opciones y su contenido editorial permanecen intactos. Las explicaciones proceden del campo existente `retroalimentacion`, con `explicacion` general como respaldo.

Las preguntas de más de dos opciones admiten dos intentos. El primer desacierto no revela las respuestas correctas. La opción elegida queda naranja, con X y «Su respuesta». «Volver a intentarlo» retira las opciones erróneas de la nueva selección y las bloquea, conservándolas en el intento histórico. Las selecciones válidas siguen ajustables.

Los titulares del primer intento son:

- Selección única o múltiple con solo opciones erróneas: «Casi. Piénselo una vez más.»
- Selección múltiple con válidas y erróneas: «Va por buen camino. Algunas de sus opciones no corresponden y quedaron marcadas en naranja. Revise si falta alguna.»
- Selección múltiple que solo omite respuestas válidas: «Va por buen camino, pero falta al menos una opción.»

Solo se explican las opciones erróneas elegidas durante la pista. En el resultado final se explican las correctas, se muestran en verde, se bloquean todas las opciones y se permite continuar. «Para recordar» aparece únicamente en el resultado final. Las preguntas de dos opciones resuelven y revelan en el primer intento. Un acierto inicial conserva `numeroIntento = 1` y `correcta = true`; una selección parcial no se considera acertada.

Los resultados se anuncian con `aria-live="polite"` y enfocan su titular. Desaparecen las cajas «Revise la respuesta» y «Respuestas correctas». El visor devuelve el foco al botón que abrió la ficha.

Los intentos históricos no se reescriben. Un V/F antiguo pendiente que ya tiene una respuesta se considera resuelto con la evaluación actual de padres. El criterio específico se pasa a la finalización común mediante un parámetro opcional; el valor predeterminado y la evaluación del estudiante siguen siendo los anteriores. Se mantienen reanudación por nodo, comprobaciones bloqueantes, aislamiento por cuenta y almacenamiento existente. Una escritura fallida no presenta resultado nuevo ni avanza o concede recompensas.

En repaso se inicia sin respuestas precargadas y se evalúa con el mismo límite usando estado en memoria. No se escriben intentos, progreso ni recompensas. Las respuestas de la sesión se conservan al retroceder. El cierre dice «Terminó el repaso», con ficha y regreso a Inicio, sin celebración ni contador de avance nuevo.

## Resumen, cierre y diploma

Las listas de «Resumen» usan checks. La tarjeta ámbar «NUEVA FICHA EN SU MATERIAL DE CONSULTA» abre el visor existente con «Abrir ficha». En repaso omite «NUEVA». El destacado redundante de ficha se retira y su frase restante se conserva debajo como párrafo. El último control es «Terminar actividad».

El cierre se presenta después del guardado correcto: «¡Actividad completada!», check, catorce puntos decorativos, contador y barra segmentada. Las cifras incluyen toda la colección con audiencia apoderado, sin filtrar bloques. Se reutiliza `parentRoute` tanto en Inicio como en el cierre para la regla del diploma y la siguiente actividad disponible por orden y requisitos. No se genera un registro Desbloqueo.

El botón «Ver mi diploma en el inicio» lleva a `/parent/overview?diploma=1`. Inicio desplaza y enfoca la tarjeta existente «Conozco mi rol» y la resalta durante dos segundos. Las animaciones `parent-pop`, `parent-rise`, `parent-draw` y `parent-burst` se definen una vez, sin bloquear controles. `prefers-reduced-motion` desactiva las cuatro, oculta los puntos, mantiene el check completo y evita la transición de barra y resaltado.

## Transiciones incorporadas

| Actividad | Paso  | Texto                                                                                              |
| --------- | ----- | -------------------------------------------------------------------------------------------------- |
| ACT-P01   | p1-03 | Listo, ya identificó su preocupación. Ahora, revise de dónde vienen sus expectativas.              |
| ACT-P01   | p1-05 | Listo, ya conoce las tres formas de influencia. Ahora, un caso para comprobar.                     |
| ACT-P01   | p1-11 | Listo, ya revisó cómo acompañar sus dudas. Ahora, conozca cinco acciones para ponerlo en práctica. |
| ACT-P01   | p1-13 | Listo, ya eligió una acción para comenzar. Ahora, repase las ideas que se lleva.                   |
| ACT-P02   | p2-03 | Listo, ya conoce las rutas de estudio. Ahora, compruebe cómo se pueden combinar.                   |
| ACT-P02   | p2-04 | Listo, ya revisó cómo combinar las rutas. Ahora, vea cómo reconocer una institución confiable.     |
| ACT-P02   | p2-08 | Listo, ya revisó los costos de estudiar. Ahora, compruebe qué gastos debe considerar.              |
| ACT-P02   | p2-11 | Listo, ya revisó cómo conversar con información. Ahora, repase las ideas que se lleva.             |

## Verificación

- Build y lint aprobados. El build conserva el aviso de tamaño de bundle mayor de 500 kB.
- 221 pruebas permitidas aprobadas, incluidas las 17 de actividades de padres; se excluyó expresamente `tests/counselor-portal.test.mjs`.
- Evaluación: selección única, V/F, múltiple, acierto inicial, primer y segundo desacierto, corrección al segundo intento, opciones sobrantes/faltantes, bloqueo de erróneas, ausencia de revelación anticipada y límite de intentos.
- Lógica y almacenamiento: intentos originales, conservación de registros históricos, reanudación, fallos de escritura, recompensas idempotentes, aislamiento por cuenta/audiencia, bloqueo por requisitos y rutas inválidas. Prueba de contador con una actividad adicional de otro bloque y diploma por la misma derivación compartida.
- Revisión interactiva en 1440 × 1000 y 360 × 800: ambas actividades completas, tabla, resumen, ficha, retorno del foco con Escape, controles con Espacio/Enter, titular enfocado, transición estática al retroceder, recarga tras primera pista, selección múltiple parcial y faltante, siguiente actividad y diploma.
- Repaso completo en navegador: comienza sin respuestas, mantiene el límite y termina con «Terminó el repaso» sin celebración ni contador. Inicio conserva 2 de 2 y el diploma.
- Navegación del diploma: query preservada al seleccionar hijo, foco sobre «Conozco mi rol», resaltado inicial y retirada posterior comprobados en DOM.
- Movimiento reducido: reglas CSS revisadas; el navegador de prueba no ofrece emulación de esta preferencia. No se cambió la preferencia del sistema del usuario.

Comando de pruebas usado: `rg --files tests -g '*.test.mjs' -g '!counselor-portal.test.mjs'`, pasando esa lista a `node --test`. No se ejecutó `npm test`, porque incluiría la prueba protegida.
