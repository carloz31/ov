# Decisiones de la spec en curso

<!-- Spec en curso: ninguna. -->
- **«Ver evolución» se bloquea con el check-in (pedido del usuario):** con `CHECK_IN` cerrado, el enlace lleva el mismo candado, título y texto oculto que «Registrar mi señal», y al pulsarlo Lumi explica qué falta (es un `AccesoRapido`, que ahora acepta `className`). La ruta `/student/journal/signal` queda tras `SeccionProtegida seccion="CHECK_IN"`, como el diario. En local `CHECK_IN` nunca se cierra, así que nada cambia.
