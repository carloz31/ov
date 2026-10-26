# Decisiones de la spec en curso

## Ajuste del panel lateral (spec `ajuste-panel.md`)

- Ambos modos, una sola implementación (aprobado por el usuario): es la excepción quince al modo local congelado.
- `POST /acciones/check-in` con un check-in del día lo sobrescribe y responde sin eventos ni desbloqueos (aprobado por el usuario): sin cambio de modelo y sin contar dos veces para insignias. Se adaptaron las pruebas que exigían 409 (`test_check_in_unico`, `test_acciones`, `test_estado_cuentas`, `test_entradas_diario`).
- Los títulos de nivel de `ruta` pasan de «Nivel N de prueba» a los rangos del front («Observador del horizonte», «Recolector de pistas»): la cabecera muestra «Nivel N» y el rango, y el título de prueba duplicaba la insignia.
- Etiquetas de la señal: Nada, Poco, Algo, Bastante y Muy seguro (aprobadas por el usuario); en local (1–10) por proporción.
- El diálogo de la señal dice en ambos modos que la respuesta puede cambiarse durante el día.
- Sin requeridas pendientes, «completado» y «recorrido» muestran «Explora las actividades» y llevan a la lista; sale el enlace al libro de Helena del panel (aprobado por el usuario).
- El pie del siguiente paso no descuenta una misión bloqueada; si no hay otras abiertas y el paso está bloqueado, solo muestra «Ver todas ›».
- Se conservan «Continúa» (misión empezada), el mensaje de bloqueo como subtítulo y el saludo de regreso: la spec no los retira.
- En la Ciudad no hay N de M (la afinidad del servidor es un porcentaje): la línea dice «Ciudad · X% de afinidad».
- «Mis planes» usa el ícono `Signpost` y la sección PLANES (`/student/profile/decisions`), con el color que tenía Mi perfil.
