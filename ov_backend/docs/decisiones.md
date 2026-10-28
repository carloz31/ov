# Decisiones de la spec en curso

## F07b · Planes: realidad, pasos, sugerencias, medidores y actividades que los citan

- **Ajustes al backend sin modelo:** `opciones.ciclos_por_anio` en `GET /planes`, `institucion.duracion_ciclos` en `PlanCarrera` e `InstitucionEnCarrera.duracion_ciclos` en el detalle de carrera. Con ellos el front calcula en vivo «Primer año», «al mes» y «toda la carrera» con la fórmula del servidor, también al cambiar de institución; en lectura muestra `total_primer_anio` y `total_carrera` del servidor.
- **Editar una sugerencia es en sitio:** la fila pasa a tipo (`Select`) + texto (`Input`) con «Agregar así» / «Cancelar», conservando «para: {origen}». Sin diálogo.
- **Sugerencias en lectura (corrige §8):** no se despliegan; una franja «{m} sugerencias esperan tu decisión · Revisarlas» abre la edición. El bloque completo solo en edición.
- **Financiamiento y complicaciones** con `ChipsElegibles` en dos filas («Elegidas» / «Para elegir»), sin números y con «+ Otra» repetible.
- **Precarga de gastos solo la primera vez** (REALIDAD por empezar); elegir o cambiar el camino agrega o quita Preparación con su referencia; cambiar de institución no toca montos; Alimentación y Vivienda solo a mano (chips bajo la tabla).
- **Medidores:** entrada «Cómo me siento» al inicio del menú (`?seccion=MEDIDORES`), control segmentado por fila, guardado al instante con los tres valores y el botón ocupado hasta la respuesta. En el frente, solo en A, tres mini tarjetas; en B y C no.
- **«Lo hice»** envía `paso-hecho` al instante desde lectura con el diálogo «¡Paso hecho!» («Solo marcar» / «Guardar») y el toast «Paso hecho. Si tenía una duda, ya quedó resuelta.».
- **Toasts al guardar 2 y 3 (§9)** se calculan con los planes ya refrescados (se espera la recarga de `planes`); sin sugerencias pendientes, el toast simple. La sección 4 bloqueada suma «{m} sugerencias te esperan» en el menú y en su tarjeta.
- **Frente de la tarjeta:** «1.er año ≈ S/ {total_primer_anio}» bajo la institución con REALIDAD Lista.
- **`t_comparar` y `t_proyecto`** con nodos mínimos; la zona de eco cita PLANES, PLAN (con cita y motivos como chips), PASOS_PLAN_A y OPCION_INICIAL.
- **Textos del lienzo sobre el documento:** la intro de «Cómo me siento» («No es una nota: te ayuda a ver qué plan te mueve más y cuál tienes más a la mano.»), la ayuda de sugerencias («…; las demás, «Ahora no».») y la ayuda del diálogo «Lo hice» son las de los lienzos, que mandan sobre §8 y §10.
