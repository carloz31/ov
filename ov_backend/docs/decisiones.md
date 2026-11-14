# Decisiones de la spec en curso

Spec: `docs/specs/auditoria-panel.md` (correcciones aprobadas H1–H5, H8, F1–F7; no se hacen H6, H7 ni H2 (b)).

## Fase 1

- H2: `intereses_por_cuenta` (solo la usa el panel) lee columnas en lugar de entidades y, de cada resultado, solo las coincidencias con `posicion ≤ max(MAXIMO_OCUPACIONES_AFINES, MINIMO_OCUPACIONES_AFINES)`. Las posiciones son contiguas desde 1 por r descendente, así que `seleccionar_afines` elige lo mismo. Tiene su propia caché por resultado en el contexto de la petición: no usa la de `representar_resultado`, que necesita las ocupaciones completas.
- H2: `frente_test` pide las familias solo de quienes tienen Plan A. El código de interés se sigue calculando para todos, porque el conteo de letras de los resultados listos lo usa.
- H4: `estudiante_de_orientadora` comprueba «de su salón» con los salones que ya leyó `exigir_orientadora`, que es la misma condición que `es_de_su_salon`, y arma el alcance solo con el salón del estudiante (`alcance_de_salones`). `Acceso.salon.salones` sigue trayendo todos los salones de la orientadora.
- H5: `Lecturas.una_vez` guarda por petición `por_revisar`, `estados_test`, el Plan A de los temas y las mediciones de partida y llegada; `Lecturas.parametros` lee los parámetros una vez. `intereses_vigentes` se guarda por cuenta en el contexto de la petición, porque `perfil_planes` no usa `Lecturas`.
- H8: `intereses` se pide una vez por salón al montar la pestaña, con los órdenes de la URL en ese momento. Reordenar una tabla pide `areas` o `instituciones` con `limite` igual al número de filas del top ya recibido (`PANEL_TOP_INTERESES`, o menos si no hay tantas) y `desde=0`. Mientras llega, la tabla conserva sus filas en lugar de mostrar la carga de toda la pestaña; si falla, sale el aviso de error que ya existía.
- F1: el buscador de la lista guarda el texto en el hook y lo pasa a la URL (`?q=`) tras 300 ms sin escribir, como las listas de intereses.
