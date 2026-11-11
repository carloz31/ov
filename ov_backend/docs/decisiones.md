# Decisiones de la spec en curso

## Ajuste llm-sugerencias

- F1 no conecta los servicios: deja la infraestructura compartida (`salida_json`, `esquema_estricto`, `SalidaInvalida` en `registro/llm/cliente.py`, y `ClientePrueba` que responde según el esquema). Cada uso se conecta a `cliente_llm` en su fase (guion F2, pasos F3), porque cambiar el cliente exige el prompt y el esquema nuevos.
- `ClientePrueba` sin cola responde por el esquema: `propio` al registro, una pregunta por campo con texto al guion y un paso por novedad a los pasos; así la ruta corta, el contrato y el exportador de fixtures siguen sin red.
