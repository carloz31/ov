# Decisiones de la spec en curso

Spec: `docs/specs/ajuste-cartas-diario.md`.

## Del usuario (texto de observaciones)

- El diario no usa el LLM: ni las cartas ni la pregunta del día. Se retiran del modelo las columnas que eran del LLM (`personalizada`, `respaldo_si`, `contexto`, `origen`).
- Las cartas «personalizadas» pasan a ser textos fijos con variantes según lo marcado; eso cuenta como la personalización. Son cuatro: tras b1-3, b2-4, b4-5 y b5-3.
- La carta de b1-3 no usa el contraste: podría forzar una coincidencia que sus textos no muestran.
- Quedan nueve cartas desbloqueables y doce preguntas del día. Salen las de conv-4 y conv-9.
- La pregunta del día no se complica: va sin dimensiones y no se repite hasta agotar las doce (`N_SIN_REPETIR_DIARIA` = 11).
- En el cierre de una actividad solo va un enlace a la carta que Lumi dejó. Ninguna carta se desbloquea ni se nombra desde una consigna del front.
- Las conversaciones se abren con actividades que siguen existiendo; solo se corrigen sus textos.

## Del plan aprobado

- `FAVORITOS` se queda en `TipoReferencia` aunque ningún dato lo usa: es el cambio menor. `test_referencia_favoritos` arma su propia referencia sin guardarla.
- Sale el dueño `PREGUNTA_DIARIO` de las referencias:
  - qué sale: `referencia.pregunta_diario_id`, el CHECK `un_dueno` y `referencias_por_pregunta`;
  - qué cambia: `actividad_id` pasa a obligatoria;
  - por qué: sin cartas personalizadas, ese dueño queda sin uso.
- Forma de `pregunta_diario.variantes`: `{huecos, variantes}`.
  - Condiciones: `ELIGIO`, `NO_ELIGIO` (`item`, `opciones`) y `OPCION_INICIAL` (`valor`).
  - Huecos: `OPCION` (`item`, `nombres`), `MARCADOR` (`item`, `marcador`, `origen` opcional), `PLAN_A` y `OPCION_INICIAL`.
  - Es la forma más simple que cubre las cuatro cartas.
- El hueco `MARCADOR` lleva `origen` opcional: el ítem de donde vino el marcador (`b2-4-bien` para `{primera}`). Así entra en la regla de respaldo, aunque la carta no lo lea directamente.
- En `d-moneda`, `{plan_a}` y `{plan_b}` son huecos `MARCADOR` sobre `b4-5-moneda`, con lo que vio al responder. `PLAN_A` es solo de `d-antes-de-salir`.
- El cargador exige que `nombres` cubra todas las opciones de la lista del ítem (en `d-voces`, las ocho de `PERSONAS`). Una opción propia o una «Otra» sin nombre lleva al respaldo.
- `recomendacion.variante` guarda el código de la variante que tocó, o nulo si fue fija o respaldo. No se expone en la API.
- `redactada` se conserva en `PreguntaDiarioEstado`, aunque ahora vale lo mismo que «recibida»: es el cambio menor del contrato, porque el front la usa.
- La migración 0053 deja con el texto base toda recomendación que tenía `texto` nulo y borra las referencias con dueño pregunta.
- Una base ya cargada con `contenido` no se migra en datos: se recarga con `datos.cargar contenido --vaciar`, porque no hay estudiantes reales.
- `pregunta-del-dia` conserva sus dos transacciones (la carrera por la misma fecha), pero ya no lleva evaluador ni tiempo máximo.
- Salen `pregunta_valida`, `MAXIMO_CARACTERES_PREGUNTA`, `PALABRAS_EVALUATIVAS` y `VERSION_PROMPT_DIARIO`: solo servían a la redacción del diario.
- Pruebas adaptadas (autorizadas en 1.5 y en la Fase 4 de la spec):
  - Las del diario: `test_asistente_diario` pasa a `test_cartas_adaptadas`, y `test_sorteo_y_redaccion` pasa a `test_sorteo_diario`, que queda solo con el sorteo.
  - `test_referencia_favoritos`.
  - `test_evaluador_gemini`: el adaptador se prueba con el asistente del guion, porque `personalizar_entrada` salió.
  - Las que fijaban `personalizada`, `abrir-pregunta`, `origen` o `respaldo_si`:
    - `test_consultas_dominio` y `test_exportar_fixtures_front`;
    - `test_ruta_corta` y `soporte_escenarios_ruta`;
    - `test_secciones` y `test_restricciones_estado`;
    - `test_carga_registros_definitivos` y `test_conversaciones_contenido`.
