# Referencia técnica del backend

Estos documentos describen cómo funciona cada parte del backend: su modelo de datos, sus reglas, sus acciones y sus consultas. Son la referencia que se mantuvo durante el desarrollo; el detalle del código prevalece si hay diferencia.

| Documento | Qué cubre |
|---|---|
| [motor.md](motor.md) | El motor de desbloqueos (eventos, reglas, disponibilidad, insignias y niveles) y lo que depende de él: diario, conversaciones en familia, notificaciones, avance del estudiante, ruta del apoderado y batallas. |
| [registro.md](registro.md) | Las actividades de registro: ítems, opciones, intentos, contexto de cada ítem y la evaluación con el LLM. |
| [referencias.md](referencias.md) | Cómo una actividad retoma datos previos de la cuenta para mostrarlos o para dar contexto al LLM. |
| [instrumentos.md](instrumentos.md) | Los cuestionarios y el cálculo de sus resultados, la recomendación a partir de los intereses, el catálogo y los favoritos. |
| [planes.md](planes.md) | Los planes de carrera: secciones, totales del presupuesto, acciones y sugerencias de pasos con el LLM. |
| [investigaciones.md](investigaciones.md) | Las investigaciones por familia de carreras: guion con sugerencias del LLM, entrevistas, reacciones, reportes y Leyendas. |
| [panel.md](panel.md) | El panel de la orientadora: resumen del salón con alertas, lista y perfil de cada estudiante, notas y configuración del colegio. |
| [integracion.md](integracion.md) | El contrato entre backend y frontend: dueño de cada dato, acceso, consultas por momento, conjuntos de datos y datos de contrato. |
