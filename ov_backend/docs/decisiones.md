# Decisiones de la spec en curso

<!-- Spec en curso: B05 (docs/specs/B05.md). -->

- **Modelo:** tabla `referencia` (dueño actividad o pregunta de diario; fuente `item_registro_id`) e `item_registro.referencia_id` para la elección por referencia. Lo pide HU-009 y RNF-20; aprobado en el plan.
- **Ciclo de FK** entre `item_registro` y `referencia`: la FK de `item_registro` lleva `use_alter`. El vaciado de `datos.cargar` (`romper_ciclos`) quita antes la elección por referencia, porque los CHECK impiden dejar nula cualquiera de las dos FK.
- **Carga en orden topológico:** `ruta.py` inserta los ítems y las referencias en rondas, según lo que ya tiene a quién apuntar. Así una referencia puede leer un ítem que elige por referencia.
- **Pruebas adaptadas por el cambio de modelo:**
  - conteos de tablas (49) en migraciones, integridad y semilla, y conteos de filas de la semilla;
  - la prueba de compilación para PostgreSQL comprueba las FK `use_alter` con `AddConstraint`;
  - el downgrade con datos de `ruta` se detiene ahora en `0008`, por la elección por referencia;
  - `referencia` clasificada como catálogo.
- **Pruebas adaptadas por `t-eco`:**
  - `t-eco` y `R-t-eco` en las expectativas de actividades, desbloqueos y el paso p07;
  - las variantes del cargador quitan `t-val-breve` por código y no por posición.
- **Ítem opcional entregado sin texto:** no se evalúa ni recibe `clasificacion_inicial`, así que sus referencias salen SIN_DATO.
- **Comprobado antes de F2:** los ítems sin criterios (EXTENSION_MINIMA) y el respaldo guardan su fila en `evaluacion_respuesta`, y `clasificacion_inicial` se llena en los tres caminos. La regla de resolución no cambia.
- **Consulta sin autenticación:** `GET /cuentas/{c}/actividades/{a}/referencias` solo lee datos de `{c}`. Exigir que `{c}` sea la cuenta autenticada, con su prueba, queda pendiente para B17 (Acceso).
- **Presentación de la consulta:** `texto` y `opciones` se omiten (`exclude_unset`) salvo en DISPONIBLE. La consulta no exige que la actividad esté disponible, igual que el GET de registro.
