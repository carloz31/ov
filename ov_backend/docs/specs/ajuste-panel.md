# Ajuste del panel lateral del estudiante (inicio)

Ajuste ligero sobre la interfaz actual, no un rediseño. Se mantiene la paleta (azul marino, dorado para el camino, azul para el check-in, íconos de colores en accesos rápidos) y los componentes existentes. Se reordena la jerarquía y se reduce texto. Tono del estudiante: «misión», no «actividad».

Jerarquía, de arriba abajo: cabecera (plana) → camino (una línea) → Siguiente paso (única tarjeta destacada) → Tu señal de hoy → Accesos rápidos.

Se aplica en **ambos modos** con una sola implementación (excepción al modo local congelado, aprobada por el usuario).

## Fase 1 · Backend: la señal del día es editable

- `POST /acciones/check-in` con un check-in ya registrado en la fecha lo sobrescribe (`nivel_seguridad`) y responde sin eventos ni desbloqueos: `REGISTRA_CHECK_IN` solo se emite con el primero del día. Sin cambio de modelo (sigue una fila por cuenta y fecha).
- Se adaptan las pruebas que exigían el 409 (`test_check_in_unico.py`, `test_acciones.py`).

## Fase 2 · Front: panel

### 1. Cabecera de perfil
- Una sola tarjeta plana: avatar/iniciales, nombre y, debajo en una línea, la insignia de nivel («Nivel 1») seguida del nombre del rango (título de viajero, del backend).
- Se eliminan «¡Qué bueno verte!», «Tu título de viajero» y el texto duplicado del nivel.
- Toda la tarjeta lleva a Mi perfil (chevron a la derecha). Mi perfil sale de Accesos rápidos.

### 2. Camino
- Sin tarjeta: anillo de progreso pequeño (dorado) + una línea «Camino · N de M misiones» + barra fina.
- Se eliminan el badge «Camino», el título «Nivel de recorrido» y «Crece con cada misión del camino».
- N y M salen de los mismos datos del porcentaje actual (no cambia el cálculo).

### 3. Siguiente paso
- Única tarjeta con fondo claro y borde dorado. Rótulo pequeño «Siguiente paso» (sin badge con ícono).
- Título: la siguiente misión requerida. Subtítulo: ícono + tipo y duración del backend («Cuestionario · 10 min»).
- Toda la tarjeta abre la misión (chevron).
- Pie dentro de la tarjeta, separado por una línea; el enlace de la derecha siempre lleva a la lista completa:
  - Hay otras disponibles: «+N misiones abiertas · Ver todas ›» (N sin la del siguiente paso).
  - Solo la del siguiente paso: «Es tu única misión abierta por ahora · Ver todas ›». Nunca «+0».
- Sin requeridas pendientes: la tarjeta muestra «Explora las actividades», toda la tarjeta lleva a la lista completa y no hay pie.

### 4. Tu señal de hoy (sección CHECK_IN)
- **Bloqueada:** cabecera con candado a la derecha y «Aún no se abre. Toca para saber cómo». Toda la tarjeta abre el diálogo de Lumi de la sección.
- **Disponible, sin registrar hoy:** cabecera, pregunta, escala, botón principal «Registrar mi señal» y «Ver evolución» como enlace de texto.
- **Registrada hoy:** cabecera con check; escala rellena y «[etiqueta] · 4 de 5»; enlace «Cambiar» que abre el registro con el valor actual y sobrescribe el del día. «Ver evolución» pasa a botón secundario con borde.
- Etiquetas: 1 Nada seguro · 2 Poco seguro · 3 Algo seguro · 4 Bastante seguro · 5 Muy seguro.

### 5. Accesos rápidos
- 6 tiles: Mis planes, Mi diario, En familia, Recursos, Investigaciones, Información.
- Los íconos conservan sus colores; el fondo de los tiles no cambia.
- Tile bloqueado: candado arriba a la derecha, ícono y texto atenuados (el ícono pierde el color). Al pulsarlo, el diálogo de Lumi de la sección.

### 6. Textos
- Rótulos, estados del pie y de la señal son del front. Rango, misión, tipo y duración, del backend.
- «Misión» en todo el panel.

## Fase 3 · Avance por tramos y ciudad

### Decisión
El avance del estudiante cuenta **todas** las actividades (requeridas y opcionales) con **total fijo** desde la definición cargada: terminar la ruta no es llegar al 100 %. El texto del panel muestra el **tramo actual** (solo requeridas) y el anillo, el porcentaje global. Sin cambios de modelo, motor ni datos.

### Backend
- `GET /cuentas/{c}/avance` (solo estudiante; 404 para otros roles): `camino` (todas las de `MISIONES_CAMPO`, audiencia ESTUDIANTE), `tramo_actual` (primer bloque del camino por `numero` con una requerida pendiente; solo requeridas; `null` si no queda), `camino_completo` y `ciudad` (todas las del bloque `CIUDAD`). `logros.afinidad` delega en el cálculo de la Ciudad. LUMI y PORTAL_FAMILIA fuera. `avance_ruta` (familia) y el diploma no cambian.
- Fixtures `avance-*` en los momentos de `actividades` y al final.

### Front
- `AvanceEstudiante` en el contrato, `services/api/avance.ts` y sección `avance` del almacén, cargada con el mapa (ingreso y tras cada acción); el mapa no se muestra sin ella. Al recargar se conserva el último valor.
- `getZoneProgress` lee `/avance`; `useStudentProfile` también (porcentaje del camino y afinidad), para que perfil y panel digan lo mismo. `progresoBloque` queda solo como requisito de la Ciudad.
- Tarjeta de avance (estilo de la tarjeta de la señal): un anillo de ~64 px con el porcentaje dentro, sin barra. Camino: rótulo «Camino», «Tramo {numero} · {completadas} de {total} misiones» (16 px) y el nombre del tramo en dorado; con el camino completo, «Camino completo». Ciudad: anillo del color de la Ciudad, rótulo «Ciudad» y «{porcentaje}% de afinidad». Local: mismo diseño, «{N} de {M} misiones». Si falla: anillo vacío y solo el rótulo. El anillo se anima al cambiar.
- El panel plegado sigue con el porcentaje redondeado. `siguientePaso.ts` y el contador de disponibles no cambian.
