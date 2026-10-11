# Iteración 1 · F7 · Informe de verificación

> Este informe conserva el entorno y las evidencias históricas de F7. Para
> preparar el backend actual, seguir el README y
> `ov_backend/docs/spec-refactor-estructura.md`: migración y carga explícitas.

Fecha: 2026-10-07. Rama `iteracion-1` en ambos repositorios.

**F6 cerrada y revalidada.** Las catorce HU pasan en el alcance comprobado. El recorrido inicial de F7 detectó dos defectos de F6; la solicitud posterior del usuario autorizó corregirlos. Este informe conserva el recorrido original y actualiza HU-073, HU-074 y los pasos 11–12 con la verificación del cierre. La aprobación formal de la iteración corresponde al usuario.

## Entorno y método

Recorrido completo en navegador: frontend API en 5178, backend en 8002, `SEMILLA=plataforma`, `EVALUADOR=falso` y SQLite desechable independiente. El proxy temporal apunta al puerto de prueba; el versionado conserva 8000. Reinicio, entregas, respuestas y finalizaciones se realizaron desde la interfaz. Las consultas directas fueron GET para contrastar estado, resultado y eventos; no se preparó el Camino mediante POST.

Textos y elecciones son DATO DE PRUEBA. Los 60 ítems usan I=5, R=4, A=3 y S/E/C=1. Se comprobó también acceso, mapa y reproductor local en 5179. Esta comprobación local es breve; la conservación del comportamiento se contrasta principalmente con suites y comparación de fallas anteriores.

## Resultado por HU

| HU | Resultado | Evidencia y límite |
|---|---|---|
| HU-002 · Estados | Pasa | Inicialmente solo bienvenida disponible; mapa evoluciona con estado remoto. Final: nueve actividades del Camino y quince de Ciudad COMPLETADA. Casos/desafíos ajenos al alcance siguen bloqueados. |
| HU-004 · Informativas | Pasa | Bienvenida de cuatro nodos y enc-mitos de 24 nodos completadas desde reproductor; eventos confirmados en servidor. |
| HU-011 · Siguiente actividad | Pasa | Panel recomienda bienvenida, cada actividad posterior y las catorce interacciones de Mara en orden. Al terminar Ciudad no inventa otra actividad. |
| HU-013 · Cierre | Pasa | Desbloqueos confirmados de actividad/ficha/I1; después I2/nivel 2; al terminar Camino, Ciudad/I3/nivel 3. |
| HU-014 · Repetición | Pasa | Segunda ejecución completa de enc-mitos: sin nuevos desbloqueos, conserva COMPLETADA y registra segundo evento, sin aumentar distintas. |
| HU-015 · Fichas | Pasa | Mochila con cuatro de cuatro fichas obtenidas tras informativas y recarga; contenido del frontend. |
| HU-021 · Mara | Pasa | Tres respuestas, salida y recarga, reanudación en cuarto ítem; 60 respuestas y catorce interacciones completas. Revisión posterior de solo lectura con opción guardada. |
| HU-022 · Resultado | Pasa | Libro y actividad de resultado muestran IRA en orden: Investigativa 100 %, Realista 75 %, Artística 50 %, igual al resultado vigente remoto. |
| HU-025 · Requisitos | Pasa | Detalle de enc-mitos pide bienvenida; I4 consulta «Invita a un compañero a tu Crew». Suites cubren Ciudad, fichas, conteos, error/reintento y consulta por solicitud sin eventos. Inteligencias/habilidades indican próxima iteración. |
| HU-026 · Afines y carreras | Pasa | Geólogo/a primero, Mejor ajuste y correlación 0.826325. Libro: Ingeniería Civil, Ingeniería Ambiental, Medicina Veterinaria y via; navegación a ocupación/carrera. Perfil plano y códigos desconocidos cubiertos en pruebas. |
| HU-027 · Sello | Pasa | Cierre 14 muestra Elena y enlace. Sello listo con resultado vigente, revela IRA y persiste tras recarga. Aislamiento por cuenta/fecha cubierto en pruebas. |
| HU-073 · Avisos | Pasa | Revalidado al cerrar F6: detalle/drawer, actividad, diálogo y menú ocultan y pausan la cola. Al cerrar se retoma sin consumir el aviso. Se incorpora I10 nueva en consulta previa; un único POST al terminar deja GET vacío. |
| HU-074 · Pasaporte | Pasa | Revalidado: I1–I3 obtenidas, públicas bloqueadas con requisito y oculta pendiente solo en contador, sin tarjeta ni nombre en HTML. Tras obtener I10 en base de prueba aparece completa; recarga conserva ambos estados. Tres pruebas corregidas con aserciones reforzadas. |
| HU-075 · Nivel | Pasa | Niveles 1, 2 y 3 en sus hitos; panel/perfil/pasaporte coinciden en nivel 3, Cartógrafo de posibilidades. Lista de títulos remota; pruebas cubren ausencia de nivel sin cálculo local. |

## Recorrido de aceptación (§6)

| Paso | Resultado |
|---|---|
| 1 | Reinicio confirmado e ingreso Ana. Bienvenida recomendada, ocho siguientes bloqueadas, Ciudad bloqueada. |
| 2 | Segunda informativa bloqueada consulta requisito de bienvenida. Su título de presentación es «Más allá de los mitos». |
| 3 | Bienvenida: actividad siguiente, primera ficha e I1 en cierre; avisos al volver al mapa. |
| 4 | Segunda informativa: tres fichas nuevas, mochila cuatro de cuatro; recarga conserva disponibilidad. |
| 5 | Repetición de sus 24 nodos: sin nuevos desbloqueos, segundo evento, mismo estado completado. |
| 6 | act-07 y Las huellas que traigo con entregas locales; borrador recuperado tras salir y recargar. Antes de llegar a $fin, el servidor aún no completa act-07. Cierre posterior I2/nivel 2. |
| 7 | Resto del Camino, incluida matriz con siete entregas necesarias; Ciudad, I3 y nivel 3. |
| 8 | Tres respuestas de act-tip-01, salida y recarga; entrada directa en cuarta con anteriores confirmadas. |
| 9 | Catorce interacciones completas; Elena exclusivamente en cierre, enlace al libro y sello de intereses listo. |
| 10 | IRA, porcentajes, afines/carreras, navegación y revelación persistente. act-tip-final se completa una vez; posterior consulta abre revisión. |
| 11 | **Revalidado: pasa.** Obtenidas, bloqueadas públicas y niveles remotos correctos; oculta pendiente solo como contador. I4 conserva su requisito. Al obtener I10, su tarjeta y diálogo muestran nombre, descripción y requisito públicos. |
| 12 | **Revalidado: pasa.** Recarga conserva estado remoto, contador sin tarjetas ocultas y nivel 3; otra recarga conserva I10 obtenida. Antes de marcar recupera diez avisos; después del lote no quedan no vistos. El recorrido inicial ya verificó respuestas, revelación y selección vacía persistentes. |

Balance remoto: **24 actividades distintas completadas y 25 eventos COMPLETA_ACTIVIDAD**, cuatro fichas disponibles, tres insignias obtenidas y nivel 3. Solo enc-mitos tiene dos eventos; cada otra tiene uno. Consultar libro, revelar y revisar no añadió finalizaciones.

La campana final dice «No tienes novedades pendientes». GET conserva **13 desbloqueos no vistos de ACTIVIDAD**, excluidos de cola/contador por F6; no quedan avisos presentables pendientes. Esto no equivale a GET vacío: los lotes con avisos presentables se marcaron antes; los posteriores de Mara contienen solo actividades. No se llamó manualmente al POST para ocultar ese estado.

## Invariantes (§7)

| Nº | Resultado | Comprobación |
|---|---|---|
| 1 · Fuente remota | Cumple en alcance auditado | Mapa/mochila/pasaporte/nivel leen servidor. Guardas API omiten applyCompletion, adquisición por diapositivas y sincronización local. Resultado/respuestas remotos. La presentación de ocultas se corrige al cerrar F6, sin inventar adquisición. |
| 2 · COMPLETADA remota | Cumple | Entrega local de act-07 no completa servidor. Única llamada de vista a completarActividad: move de StudentActivityPlayer.tsx. Proyecciones usan COMPLETADA recibida. |
| 3 · Repetición al servidor | Cumple | enc-mitos registra dos eventos y una actividad distinta. Revisiones de instrumento/resultado conservan los 25 eventos; revisión no es nueva realización. |
| 4 · Red concentrada | Cumple en áreas permitidas | Búsqueda fetch en src, excluidos ambos portales protegidos, solo encuentra servidor/cliente.ts. Adaptadores solo import type. No se afirma auditar carpetas prohibidas por AGENTS.md. |
| 5 · Local conservado | Sin regresión nueva detectada | Aislamiento pasa; 16 fallas previas coinciden exactamente por nombre/línea con F5/F0. Mapa/reproductor local abren con Alex y nivel 1. No se certifica suite completamente verde. |
| 6 · Demo conservada | Cumple | Backend: 1006 pruebas pasan con demo y evaluador falso, escenarios/invariantes incluidos. F7 no altera código, semilla ni expectativas. |

## Pruebas y pendientes

| Verificación | Resultado |
|---|---|
| npm run build | Pasa, 2828 módulos; permanece aviso previo de bundle grande. |
| npm run lint | Pasa, sin errores ni advertencias. |
| npm test, cierre F6 | 356: 340 pasan, solo las 16 fallas previas, comparadas exactamente por nombre y línea. Las tres pendientes de F6 pasan; se añaden dos casos de pausa del marcado y campana. |
| uv run pytest -q, cierre F6 | 1006 pasan, dos advertencias previas, 1080.83 s; SEMILLA=demo, EVALUADOR=falso, temporales y caché propios. |

Fallas detectadas en F7 inicial y **corregidas al cerrar F6**, en `tests/servidor-logros.test.mjs` (líneas de la ejecución original):

| Línea del caso | Nombre | Motivo |
|---|---|---|
| 23 | insignias solo del servidor, sin cálculos locales ni ocultas pendientes en la proyección | Contador 0 en lugar de 1. |
| 38 | oculta obtenida y código desconocido usan su información pública sin inventar progreso | Variante busca I10 en fixture que oculta el código como ???; falta adaptar variante tras resolver decisión. |
| 63 | pasaporte no filtra códigos ocultos ni adicionales y usa nivel remoto y total real | Falta contador; aparece tarjeta «Logro oculto». |

Corrección autorizada por el usuario: las ocultas pendientes se identifican con `codigo === '???'` y estado distinto de OBTENIDA, según el contrato. La variante de prueba transforma el registro anonimizado en I10 obtenida, conservando y reforzando las aserciones. No se cambia contrato ni se regeneran fixtures. La pausa de HU-073 incluye portales de diálogo, drawer y menú en el mismo criterio `announcementBlocked` que usa getNextBadge; desmontar el aviso cancela su temporizador. La campana solicita el lote y la cola espera al cierre del menú. No quedan defectos pendientes de F6; las 16 fallas previas permanecen fuera de alcance.

Las 16 fallas anteriores se enumeran por nombre y línea en F0 de `ov_backend/docs/iteraciones/decisiones-iteracion-1.md`: líneas 731, 1504, 1571, 1699, 1776, 1855, 1881, 1915, 1932, 1951, 2000, 2033, 2326, 2621, 2658 y 3229 de `tests/adventure-rendering.test.mjs`. No se modifican expectativas ni se amplía F7 para corregirlas.

## Evidencia y cierre

Evidencia fuera de Git, en la carpeta de visualizaciones de esta conversación: f7-recorrido-dom.json, f7-paso3.json, f7-camino-completo.json, f7-eventos-antes-resultado.json, f7-resultado.json, f7-estado-final.json, logs de build/lint/tests/pytest y capturas f7-elena.png, f7-intereses.png, f7-pasaporte.png, f7-aviso-durante-detalle.png y f7-local.png. Base/servidores temporales retirados al terminar.

README de ambos repos y registro compartido actualizados. Los commits iniciales F7 fueron documentales; este cierre incorpora la implementación y registros de F6 con el mensaje «Iteración 1 · F6: avisos, pasaporte, nivel y requisitos», sin push. Sin dependencias, cambios de contratos/fixtures, Gemini ni lectura de áreas protegidas. Se detiene el trabajo al cerrar F6.

## Revalidación de HU-073 y HU-074 al cerrar F6

Base desechable nueva, SEMILLA=plataforma y EVALUADOR=falso, backend 8002/frontend 5178. Para repetir exclusivamente los pasos 11–12, el Camino se prepara por API; no se atribuye esa preparación a un nuevo recorrido completo. La verificación completa F7 anterior permanece descrita arriba.

Se abre Mi horizonte mientras hay avisos: quedan siete en la campana, el aviso desaparece y sigue pausado más de siete segundos. No se registra POST de marcado y los 19 no vistos del servidor permanecen. Al cerrar se retoma el aviso con el mismo contador. Actividad y diálogo de salida no presentan la cola; en pasaporte no aparece automáticamente. La campana solicita diez pendientes, y el diálogo de I4 los pausa sin consumirlos. Recargar antes del marcado devuelve los diez.

DATO DE PRUEBA: un evento crudo VENCE_DESAFIO_INTACTO, sin referencia, exclusivamente en esta base desechable obtiene I10 «Luz sin fisuras» mientras el lote está abierto. No se implementa ni se recorre un desafío fuera del alcance. La consulta previa incorpora su aviso después de los diez anteriores: se muestran once en total y solo entonces ocurre un POST global. GET de no vistos queda vacío, incluido tras recargar. I10 se muestra completa, con descripción y requisito del servidor; contador de ocultas desaparece y pasaporte pasa de 3/10 a 4/10. Nivel permanece en 3.

Evidencias nuevas: f6-cierre-dom.json, f6-cierre-inicial.json, f6-cierre-pausa.json, f6-cierre-oculta-obtenida.json, f6-cierre-final.json; capturas f6-cierre-detalle-pausado.png, f6-cierre-pasaporte.png y f6-cierre-obtenida.png; logs f6-cierre-build.log, f6-cierre-lint.log, f6-cierre-tests.log y f6-cierre-pytest.log en visualizaciones de esta conversación.

