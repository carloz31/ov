# Ajustes a la Central de casos (post F04)

Rama: trabajar en la rama **F03** que está abierta ahora mismo (no crear ni cambiar de rama). Son ajustes a lo implementado en F04. Criterio general de los lotes F: no rediseñar, cambios ligeros sobre las interfaces actuales; todo texto y dato que exista en el backend se lee del backend. Un commit por punto.

## 1. Ayuda de Lumi por ícono «?» (paso Escuchar y los demás pasos)
- Quitar la tarjeta flotante de Lumi con botón «Entendido» del paso Escuchar.
- Agregar un botón «?» en el topbar de la Central, al lado del indicador de presupuesto (mismo ícono «?» que ya se usa en otras partes de la plataforma).
- Al pulsarlo se abre el componente de diálogo de ayuda de Lumi ya existente (solo botones Anterior/Siguiente, sin agregar otros), con las indicaciones del paso activo. Un texto por paso: Escuchar (el texto que hoy muestra la tarjeta), Problema (cómo armar el equipo: revisar hojas de vida, arrastrar o usar «+», cada llamada usa 1 punto de presupuesto) y Revisar (qué significa confirmar el equipo y el presupuesto restante).
- Solo a demanda: no se abre solo al entrar.
- El «?» que hoy flota sobre la escena se elimina (queda únicamente el del topbar).

## 2. Hoja de vida de contactos (paso Problema)
- Quitar el enlace «Ver la ficha completa»: dentro de la actividad no se navega fuera.
- Quitar también la línea «Datos del catálogo de ocupaciones O*NET por completar».
- La hoja de vida muestra solo: inicial/avatar, nombre, ocupación, y las secciones Qué hacen / Conocimientos que usan / Habilidades que necesitan con lo que devuelva el backend (los textos de relleno «[por completar desde O*NET]» y la etiqueta «Ficha en preparación» vienen del backend y se quedan tal cual hasta que exista el contenido).

## 3. Problemas: «Lo que dijo la comunidad» como botón
- La tarjeta con las frases resumidas se reemplaza por un solo botón «Ver lo que dijo la comunidad» que abre lo mismo que hoy abre «Ver completo».
- El espacio ganado es para la descripción del problema (puede mostrarse completa, sin recorte).

## 4. Paso Revisar: scroll
- Corregir: el contenido del paso Revisar no permite desplazamiento vertical. Debe poder hacerse scroll hasta el final (último problema y botones). Revisar el contenedor del paso (altura fija / overflow oculto, o la escena de fondo capturando el scroll).

## 5. Cierre del caso (pantalla final)
- **Resumen por fase**: se mantiene como está.
- **Íconos de ocupación**: ya no son enlaces. Se muestran como una lista de badges con el nombre de la ocupación (p. ej. «Bombero/a», «Meteorólogo/a»…), con el título «Íconos de ocupación · N nuevos». Sin acción al pulsarlos.
- **Testimonio desbloqueado**: hoy no se muestra. Verificar que (a) el backend desbloquea el testimonio asociado al caso cuando se supera y (b) el cierre lo lee de la respuesta del backend, no de un texto fijo. Se presenta con la misma tarjeta de testimonio desbloqueado de Recursos (ver punto 7): avatar con iniciales, nombre, ocupación, título, cita, «Te la regaló el llamado «Incendio forestal»» y botón «Escuchar su historia» que abre el pop up del testimonio encima (como las fichas dentro de una actividad, F04d). Si el caso no tiene testimonio asociado, el bloque no aparece.
- **Botones inferiores**:
  - Caso superado: un solo botón «Volver al mapa». Supuesto: si el caso se abrió desde la Ciudad, el botón dice «Volver a la Ciudad» (misma lógica de retorno que las batallas). Se quita «Intentar llegar a 14»: el reintento vive en el drawer del caso («Puedes volver a jugarlo…»).
  - Caso no superado: supuesto: botón «Intentar de nuevo» y la X para salir (como el cierre de derrota de batalla, sin «Volver a la ciudad»).

## 6. Drawer de actividad para casos: datos y skeleton
- Al conectar el backend, el drawer de un caso solo muestra el badge «Completada» y el bloque inferior queda vacío. Debe mostrar lo que tenía el prototipo:
  - Disponible: «Para superarlo necesitas al menos **{umbral} de {máximo} puntos** de satisfacción. No hace falta una respuesta perfecta.»
  - Superado: «Tu mejor puntaje **{mejor} de {máximo}**», barra de progreso con marca del mínimo, «Mínimo para superar: {umbral}» y «Superado. Puedes volver a jugarlo para llegar a {máximo}.»
  - Completado sin superar: mismo bloque con el mejor puntaje y un mensaje para volver a intentarlo.
- Verificar que el endpoint del drawer devuelve umbral, puntaje máximo y mejor puntaje del estudiante; si falta alguno, agregarlo al backend (señalarlo en el resumen del commit).
- **Skeleton**: el drawer de actividad (en general, no solo casos) muestra un skeleton con el componente `Skeleton` de shadcn mientras carga, y recién pinta el contenido cuando están todos los elementos (estado, tiempo, descripción, tipo, bloque específico del tipo, entrada de diario). Evitar renderizar a medias.

## 7. Testimonios en Recursos («Voces de la ciudad») y pop up
Hoy se muestran versiones básicas (tarjeta con título, línea y botón). Deben quedar implementadas como en el prototipo:
- **Tarjeta desbloqueada**: avatar con iniciales, nombre, ocupación, título del testimonio, cita en cursiva, «Te la regaló el llamado **{nombre del caso}**», estrella de favorito y botón «Escuchar su historia».
- **Tarjeta bloqueada**: ícono de candado, avatar/nombre difuminados, etiqueta «Una voz por descubrir», título, frase de intriga y la caja «Completa la misión «{caso}» en Central de Casos»; si el caso aún no está disponible, agregar «Misión disponible próximamente» / «Este llamado llega pronto». Al pulsarla, el pop up de contenido bloqueado con el detalle (mismo comportamiento que las fichas bloqueadas, F04).
- **Tarjeta de cierre** «Más voces se suman a la ciudad — Con cada nuevo llamado aparecerán otras historias.»
- **Pop up del testimonio** (el que ya existía en el prototipo): badge «Testimonio desbloqueado», título, «{nombre} · {ocupación} · {años} de experiencia», texto del testimonio, video de YouTube embebido, botón «Ver en YouTube» y «Agregar a favoritos». Se reutiliza desde Recursos y desde el cierre del caso.
- Todos los datos (nombre, ocupación, años, título, cita, texto, URL de video, caso que lo desbloquea, estado) vienen del backend. Si algún campo no existe en el modelo, agregarlo y señalarlo.

## Verificación
- Suites en verde y prueba manual en el navegador de: Central completa (Escuchar → Problemas → Revisar con scroll → Cierre), drawer del caso en los tres estados, Recursos con un testimonio bloqueado y uno desbloqueado, y el pop up desde ambos lugares.
