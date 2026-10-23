# Decisiones de la spec en curso

<!-- Spec en curso: F05.md (rama lote/F05). -->
- **`registrado_hoy` con la hora del servidor (F1):** `GET check-ins` lo calcula con la dependencia `Ahora` (fecha de Lima); el descarte del aviso del día en `studentUiStore` sigue con la fecha local del navegador. Las pruebas y el exportador fijan «hoy» sobrescribiendo `obtener_ahora` solo en esa consulta (el exportador, en `FECHA`), sin tocar el ingreso ni la expiración del token.
- **Afinidad con adicionales (F1, usuario):** `afinidad()` divide las completadas de la Ciudad entre todas sus actividades (requeridas, opcionales y adicionales), con tope 100; `es_mision_adicional` se eliminó por quedar sin usos.
