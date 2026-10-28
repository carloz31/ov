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
- **Pensión en la primera edición:** mientras REALIDAD está por empezar, la pensión precargada (0 o su referencia, sin tocar) sigue a la gestión de la institución que se elige; después, cambiar de institución no toca ningún monto. Así se reproduce el lienzo (UNALM pública, pensión 0) sin contradecir «la institución no toca los montos».
- **«Guardar puede tardar unos segundos.»** pasa al pie de la sección, junto a «Cancelar» / «Guardar sección», en CONOCIMIENTO y REALIDAD (lienzo de la sección 3); la prueba de F07a que lo buscaba dentro de CONOCIMIENTO se adaptó, igual que la de su aviso, que §9 reemplaza.
- **Aviso de sugerencias (§9) en `AvisoToast`:** etiqueta «Guardado», estrella, título en negrita «{N} complicaciones y {M} pasos sugeridos» y la línea «te esperan en Mis próximos pasos.». Diferencia con el lienzo: el toast pone el título y la descripción en dos líneas (su estructura) en lugar de una frase seguida, y «Mis próximos pasos» no va en cursiva.
- **Avisos simples:** REALIDAD sin sugerencias, «Guardado. Muéstrales este número en casa.»; PASOS, «Guardado. Tus pasos quedaron anotados.» (el documento no los fija).
- **Nombre completo de la institución** en el menú y en el resumen de REALIDAD: el lienzo usa la sigla (UNALM), que el catálogo no entrega.
- **«≈ S/ {x} al mes»** redondea `primer año / 12` al entero más cercano (los números del lienzo son ilustrativos y no cuadran entre sí).
- **Paso nuevo:** la fila punteada «Tipo…» + «+ Escribir un paso» lo suma al confirmar (Enter o salir con texto); sin tipo elegido toma el último de PASOS («Otra»), porque el servidor exige tipo.
- **«Lo hice» es la casilla** de cada paso pendiente (en el lienzo, «Lo hice ←» es una anotación que la señala): botón con `aria-label` y `title` «Lo hice». En la sección 4 no se repite «Guardar puede tardar unos segundos.» porque guardar pasos no llama al LLM (el lienzo tampoco lo muestra).
- **Migas del plan abierto:** el lienzo pone «Plan A · {carrera}» en la barra superior; se conserva lo de F07a (solo «Mis planes»; el plan y la carrera están en la cabecera del menú), que tiene su prueba.
- **Prueba del mapa adaptada:** `t-comparar` era el ejemplo de «contenido sin nodos» del camino; al darle nodos (§11, autorizado), la prueba vacía sus nodos en memoria para seguir comprobando la mecánica, porque ya no queda un registro abierto sin contenido en `ruta`.
- **Eco de `t-comparar` y `t-proyecto`:** «Tus planes: A · {carrera}, B · …», «Tu plan A, {carrera}: «{relato}»» con los motivos como chips bajo la cita, «Tus pasos: «…», «…»» y «Tu primer interés: {carrera}»; se prueban en el adaptador y en los contenidos, sin recorrer el reproductor (no hay fixture de ítems de esos registros).
