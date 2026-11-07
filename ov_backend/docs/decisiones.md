# Decisiones de la spec en curso

## Ajuste registros

- `b1-7-freno` usa la lista común `DIFICULTADES` de la tarjeta, ampliada con `NO_INGRESAR`, `CAMBIAR_OPINION`, `TIEMPO` y `SALUD` sin quitar ni renombrar opciones; las cuatro nuevas también aparecen en «Lo que podría complicarlo» de la tarjeta (aceptado por el usuario).
- Una repregunta por ítem por defecto (`seguimiento.max_repreguntas`, 1; `b5-1-decision` = 2); el presupuesto del intento sale de `actividad.maximo_seguimientos` (defecto 2; solo `b5-3` = 1). Las pruebas de `ruta` que suponían dos repreguntas seguidas al mismo ítem se adaptan (autorizado por el usuario).
- La consolidada por LLM se conserva: `consolidada` opcional solo en la llamada de seguimiento, como en B03/B04.
- `DATOS_CARRERA_PLAN_A` toma el salario de `IngresoFamilia` (familia y tipo, sin ubicación): el eco lo presenta como «referencia de carreras de esta familia», no como el salario de la carrera. Fuente y año se omiten: el catálogo no los guarda.
- La ELECCION de un ítem sensible sí se cita; solo su TEXTO pasa a SIN_DATO.
- `LUMI_SENSIBLE` vive en la tabla `texto_fijo`, cargada desde `fijos.TEXTOS_FIJOS`, no en código.
- La clasificación conserva ADECUADA como «desarrollada» y agrega ABIERTA; NO_EVALUADA sigue para el respaldo.
- `planes_listos_para_comparar` recibe `secciones`; `contenido` lo usa como `planes_con_por_que` y `planes_creados` (`functools.partial`), sin cambiar `parametro_evaluador`.
- Las cartas C1–C6 son preguntas de diario desbloqueables personalizadas; `pregunta_diario.respaldo_si` (solo C2, nulo en el resto) da el texto fijo sin LLM.
- Modelo (0049): `item_registro` gana `fuente_opciones`, `referencia_opciones_id`, `opciones_propias`, `premarcar_si` y `seguimiento`; `respuesta_registro`, `sensible` y `requiere_atencion`; `evaluacion_respuesta`, `sensible` y `falta`; `actividad.maximo_seguimientos`; `pregunta_diario.respaldo_si`; tabla `texto_fijo`; ABIERTA en la clasificación y en el estado de referencia; tres tipos de referencia. No se agregó `abierto` a la evaluación: la clasificación ABIERTA ya lo registra.
- El contrato v5 no distingue criterios: si un ítem no cumple, sus `criterios_faltantes` (y los del turno) son todos los del ítem. Las pruebas unitarias del contrato anterior se adaptaron al nuevo.
- `items_por_ampliar.pista` sigue siendo la pregunta vigente; se agrega `falta` y el front muestra `falta` o, si no hay, el `nombre` (así no cambian las pruebas de `ruta`).
- Un ítem sin campos de seguimiento (`ruta`) conserva su comportamiento: repregunta de respaldo genérica y, ante una pregunta inválida, la del primer criterio.
- El aviso `LUMI_SENSIBLE` va al final de la conversación de la respuesta sensible (`{tipo: 'aviso'}`); `sensible` no se expone. `items_abiertos` llega solo con el registro cerrado, como `items_por_ampliar`.
- Los ecos de ítem de `ecos_llm` usan, en la entrega, el texto entregado del ítem anterior; en el seguimiento y la edición, su consolidada (nunca la de uno sensible).
- `t-referencia` tiene 3 ítems (invariante de `ruta`): el premarcado va en el ítem que retoma. `ruta` gana `RESPALDOS_DIARIO` para `t-diario-personal` (DATO DE PRUEBA).
- Toda pregunta personalizada desbloqueable se redacta como carta (`PROMPT_CARTA_V1`, `ContextoCarta`, misma forma de datos al LLM); la pregunta del día conserva el prompt v1.
- El downgrade de 0049 se niega si hay datos de los registros definitivos (como las migraciones anteriores con su contenido); `datos.cargar --vaciar` deja sin elección a los ítems que eligen de una referencia para romper el ciclo.
- Las opciones de un ítem con fuente REFERENCIA no salen en `items-registro` (no es por cuenta): el front las lee de las referencias de la actividad.
- Los tipos del registro del front pasan a `types/servidorRegistro.ts` (límite de 400 líneas de `servidor.ts`).
- `t-val-orden` (ruta) declara `max_repreguntas: 2` sin guía: conserva su flujo de dos repreguntas (exportador y fixtures del front sin cambios) y prueba la mecánica de `b5-1-decision`.
