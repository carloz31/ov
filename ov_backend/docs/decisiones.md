# Decisiones de la spec en curso

## Ajuste llm-sugerencias

- F1 no conecta los servicios: deja la infraestructura compartida (`salida_json`, `esquema_estricto`, `SalidaInvalida` en `registro/llm/cliente.py`, y `ClientePrueba` que responde según el esquema). Cada uso se conecta a `cliente_llm` en su fase (guion F2, pasos F3), porque cambiar el cliente exige el prompt y el esquema nuevos.
- `ClientePrueba` sin cola responde por el esquema: `propio` al registro, una pregunta por campo con texto al guion y un paso por novedad a los pasos; así la ruta corta, el contrato y el exportador de fixtures siguen sin red.
- Modelo (F2, migración 0053): `sugerencia_guion` suma `campo` (`CampoLoQuePienso`: DIA, NECESITA, DUDA) y `motivo`, no nulos; la migración borra las sugerencias existentes y deja `sugerencias_vigentes` en falso, porque no hay cómo llenarlas y no hay datos reales. `OrigenPreguntaGuion` pierde DUDA; las filas DUDA pasan a PROPIA (era la duda del estudiante).
- El tiempo máximo de las sugerencias del guion es el del cliente de Claude (`TIEMPO_MAXIMO_LLM_SEGUNDOS`); sale el parámetro `tiempo_maximo_segundos` y la medición propia, que eran del evaluador de Gemini.
- `MAXIMO_SUGERENCIAS_GUION` sale: el tope es una por campo. `MAXIMO_CARACTERES_PROMPT_GUION` (160, lo que pide el prompt) queda aparte de `MAXIMO_CARACTERES_PREGUNTA_GUION` (200, lo que acepta el filtro).
- Pruebas adaptadas (autorizadas por §1 del texto): las de sugerencias del guion pasan al cliente de prueba; las que guardaban la duda con origen DUDA la guardan como PROPIA (`soporte_investigaciones.guion`, ruta corta, exportador y `verificar_leyenda.py`); la vista inicial espera cuatro preguntas base.
