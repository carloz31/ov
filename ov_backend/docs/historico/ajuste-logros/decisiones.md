# Decisiones de la spec en curso

## Ajuste logros

- `ResultadoEvaluador` lleva `actual` y `requerido` solo cuando el evaluador da avance (`Avance`); sin avance no se serializan, para que las respuestas de los evaluadores existentes no cambien.
- Un evaluador con avance se cumple con `actual >= requerido` y un total de 0 no cumple (como `vistas_diversas` con el catálogo vacío). Precisión del usuario al aprobar el plan.
- `DatosPlanes` y `cargar_planes` pasan a `app/core/planes.py`, sin cambiar su lógica, para que el contexto de consultas guarde los planes por petición sin que `core` importe `services`; `services/planes/consultas.py` los reexporta. `_lista` y `estado_seccion` se quedan en planes.
- La caché de planes solo la leen los evaluadores (`contar_listos_para_comparar` y `planes_completos`), que corren después de `invalidar_eventos`: ninguna acción lee los planes de la caché antes de escribir (comprobación de §4.2).
- Mensajes de bloqueo de las insignias (la spec no los daba): el requisito de la insignia y, si una condición nombra una actividad, su título entre «» («… completa la misión «…»»; los cinco recuerdos en «Alguien preguntó»).
- El cargador sigue rechazando toda regla que dependa de los recuerdos de Lumi o del bloque LUMI, salvo las reglas INSIGNIA, que pueden pedir los recuerdos `lumi-1`…`lumi-5` («Alguien preguntó» no abre contenido). Del bloque LUMI no depende ninguna regla, tampoco de insignia. Decisión del usuario.
- Los evaluadores nuevos no se agregan a `ruta` (la spec la congela): se prueban sobre `contenido`.
- Única adaptación permitida de pruebas existentes: las de `contenido` que comparan la lista exacta de `nuevos_desbloqueos` o de notificaciones y ahora reciben insignias o niveles nuevos. Precisión del usuario.
- Planes A, B y C se cuentan por carreras distintas creadas (`CREA_PLAN`, REFERENCIAS_DISTINTAS); eliminar un plan y crear otro de otra carrera también suma.
- Plan completo = sus cuatro secciones en LISTA, sin medidores.
- «La isla entera» cuenta las actividades de los bloques del estudiante salvo LUMI; los recuerdos tienen su propio logro.
- Recrear un plan eliminado lo reactiva con sus secciones y emite `CREA_PLAN`, no `ACTUALIZA_PLAN`: si con eso se llega a tres planes completos, «Ningún cabo suelto» se obtiene en la siguiente acción sobre un plan. Se acepta así.
- Refresco del front: si todos los `nuevos_desbloqueos` de una acción que no cambia el progreso son INSIGNIA, solo se vence `logros`; cualquier otro tipo (incluido NIVEL) refresca como antes.
- Niveles (adenda): son 5 y dependen solo del cierre de tramos del camino (B0, B2, B3 y B5); el nivel 3 no exige resultados de Helena, porque el tramo 4 ya pide el de intereses; conversaciones, entrevistas, planes y catálogo quedan en las insignias.
- `test_techo_registros_contenido`: suben solo dos techos de entregar, b1-6 13 → 14 («Senderos que no estaban en el mapa») y ma8 19 → 21 («Bitácora completa»). Las sentencias extra son los INSERT del desbloqueo y la notificación de la insignia que se obtiene en esa entrega; no hay lecturas nuevas (la prueba no separa los SELECT: hoy son 9 en b1-6 y 16 en ma8). Decisión del usuario.
- Adaptadas por la precisión de `nuevos_desbloqueos`: `test_diario_contenido` (completar los recuerdos no abre nada salvo la insignia «Alguien preguntó») y `test_casos_contenido` (superar c1 abre sus dos voces y, además, «Caso cerrado»): ambas filtran las INSIGNIA.
- Diferencia con la spec (§4.5): con R-b4-1, R-b4-5 y R-b5-1 obtenidas y las insignias de planes pendientes, las cuatro acciones de planes hacen a lo más **dos** lecturas más que hoy, no una: los conteos de eventos (hoy no se cargan porque no queda ninguna regla de planes por reevaluar) y las tarjetas. Nunca se cargan las hijas bajo el parámetro. No se cambia el orden del motor. Decisión del usuario; la línea de la spec se corrigió.
- `test_presupuesto_logros` compara contra una base con una sola insignia (`R-ins-chispa`), no con ninguna: `GET logros` lee las fechas de obtención en una consulta si hay alguna regla de insignia (como hoy), sin importar cuántas.
- Front, adaptación exigida por §5.2: en `servidor-refresco-condicional.test.mjs`, el desbloqueo de ejemplo que refresca pasa de INSIGNIA a FICHA en las dos pruebas que lo usaban; se suman el caso de solo insignias (no pide el camino y vence `logros`) y el mixto (una INSIGNIA y un NIVEL refrescan como antes). Decisión del usuario.
- En el pasaporte, solo las condiciones de una insignia (`condicionesObjetivo(..., conAvance)`, desde `useBadgeDetail`) usan el avance del evaluador; la regla debe tener una sola condición. Los niveles no lo usan.
- Verificado: ninguna vista del camino o de la ciudad lee insignias en api (los toasts y las medallas de cierre salen de la respuesta de la acción), y ningún texto del front en api fija los títulos provisionales de los niveles ni su número (`travelerTitles` y `demoLevel` son del modo local).
