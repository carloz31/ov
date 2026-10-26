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

### Fase 3 · Avance por tramos y ciudad

- Regla del avance del estudiante: todas las actividades del camino (requeridas y opcionales) con total fijo desde las definiciones; el tramo actual cuenta solo sus requeridas; terminar la ruta no es llegar al 100 % (`camino_completo` no depende del porcentaje). La familia sigue con `avance_ruta`.
- Pregunta abierta 1: las 14 actividades del camino y las 4 de la Ciudad de `ruta` tienen contenido con mapa en el front; ninguna cambia de cuenta.
- El bloque T1 de `ruta` se llama «Camino», así que la tarjeta muestra «Camino» dos veces (rótulo y nombre del tramo): es dato de prueba; no se cambia ni se oculta el nombre del tramo.
- `/avance` va con las actividades en `refrescar` y el mapa espera por él; si falla con el mapa ya visible se conserva el último valor; sin datos, anillo vacío y solo el rótulo (aprobado por el usuario).
- Local: mismo diseño de tarjeta, sin tramo: «X de Y misiones» con las misiones del camino (aprobado por el usuario).
- El perfil (`useStudentProfile`) lee recorrido y afinidad de `getZoneProgress`, es decir, de `/avance` (pedido del usuario); se retira `useAfinidadServidor` y el perfil monta `logros` solo por las insignias.
- `ZoneProgress.value` pasa a `porcentaje` (nulo sin datos), como pide la spec; se adaptaron las pruebas locales que lo leían.
- Exportador: `avance-*` en inicial, t1, ciudad, t2 y final (129 fixtures). Los escenarios con fixtures de la raíz (Mara, sin `/avance`) usan `ruta-avance-inicial` como dato de prueba.
