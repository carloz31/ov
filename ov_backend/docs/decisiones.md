# Decisiones de la spec en curso

Spec: `docs/specs/auditoria-panel.md` (correcciones aprobadas H1–H5, H8, F1–F7; no se hacen H6, H7 ni H2 (b)).

## Fase 1

- H2: `intereses_por_cuenta` (solo la usa el panel) lee columnas en lugar de entidades y, de cada resultado, solo las coincidencias con `posicion ≤ max(MAXIMO_OCUPACIONES_AFINES, MINIMO_OCUPACIONES_AFINES)`. Las posiciones son contiguas desde 1 por r descendente, así que `seleccionar_afines` elige lo mismo. Tiene su propia caché por resultado en el contexto de la petición: no usa la de `representar_resultado`, que necesita las ocupaciones completas.
- H2: `frente_test` pide las familias solo de quienes tienen Plan A. El código de interés se sigue calculando para todos, porque el conteo de letras de los resultados listos lo usa.
- H4: `estudiante_de_orientadora` comprueba «de su salón» con los salones que ya leyó `exigir_orientadora`, que es la misma condición que `es_de_su_salon`, y arma el alcance solo con el salón del estudiante (`alcance_de_salones`). `Acceso.salon.salones` sigue trayendo todos los salones de la orientadora.
- H5: `Lecturas.una_vez` guarda por petición `por_revisar`, `estados_test`, el Plan A de los temas y las mediciones de partida y llegada; `Lecturas.parametros` lee los parámetros una vez. `intereses_vigentes` se guarda por cuenta en el contexto de la petición, porque `perfil_planes` no usa `Lecturas`.
- H8: `intereses` se pide una vez por salón al montar la pestaña, con los órdenes de la URL en ese momento. Reordenar una tabla pide `areas` o `instituciones` con `limite` igual al número de filas del top ya recibido (`PANEL_TOP_INTERESES`, o menos si no hay tantas) y `desde=0`. Mientras llega, la tabla conserva sus filas en lugar de mostrar la carga de toda la pestaña; si falla, sale el aviso de error que ya existía.
- F1: el buscador de la lista guarda el texto en el hook y lo pasa a la URL (`?q=`) tras 300 ms sin escribir, como las listas de intereses.

## Fase 2

- H1: `panel/contexto_lectura.py` (`LecturaContexto`) arma el contexto de hoy de los ítems para la pestaña Respuestas. Lee una vez por petición las respuestas vigentes de la cuenta, sus planes, todas las referencias de los ecos (`resolver`) y las piezas; cada ítem se arma una sola vez. `resolver_contexto`, el flujo del registro y sus pruebas no cambian. Las reglas de marcadores y ecos están repetidas sobre lo ya leído, y las piezas puras de `registro/contexto.py` se reutilizan importándolas.
- H1: los ecos al LLM se siguen calculando, aunque se aprobó «sin ecos_llm». `eco_cambiado` compara los ecos al LLM guardados con los de hoy: sin ellos, «Cambió después» saldría distinto, y las respuestas no serían idénticas. La auditoría decía, por error, que el panel no los usaba. Se calculan sobre lo ya leído, sin consultas.
- H1: las opciones de lista de los ítems que no son de piezas no se arman, porque ni la lectura ni `eco_cambiado` las usan. Las piezas se leen al empezar si algún ítem del alcance las usa. La variante «menos» de las piezas del perfil sale de la misma lectura: es la lista con las piezas `CUESTA-*` delante.
- H1: `test_panel_respuestas_identicas.py` siembra los ocho estudiantes de ejemplo y compara `respuestas` y cada `respuestas/{actividad}` (152 registros) con `respuestas_ejemplo.json`, que se generó con la implementación anterior a una hora fija (`AHORA_EJEMPLO`). Tarda unos 40 s, por la siembra con acciones reales.
