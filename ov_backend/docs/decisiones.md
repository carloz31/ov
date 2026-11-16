# Decisiones de la spec en curso

## Ajuste panel-orientadora-observaciones

- Alerta `familia-pendiente`: nombre «Su apoderado aún no inicia sesión» y el mismo motivo para SIN_VINCULO y SIN_INGRESO («Su apoderado aún no ha iniciado sesión en la plataforma»), porque en el colegio todo estudiante tendrá un apoderado con cuenta; el evaluador no cambia. La cabecera del perfil y «Avance y familia» conservan «Sin apoderado vinculado» (pedido del usuario).
- Textos del panel que arma el backend (texto plano): los nombres (tramo, registro, dimensión) van sin «»; lo que el estudiante marcó y las frases de los medidores, entre comillas “…”. En el front, los nombres van en cursiva y las citas entre “…”; las afirmaciones de partida y llegada, sin comillas.
- «Cómo lo haría realidad» del perfil: en dos columnas y «Incluye: …» con los rubros; sin monto por rubro (el usuario solo necesita saber qué incluye). Solo mostraba Matrícula porque el plan de ejemplo solo registraba ese rubro: la siembra de ejemplo ahora registra Matrícula, Materiales y Transporte.
- Selectores del perfil (plan y Destacados/Todos) y pestañas principales: la opción elegida en el color principal, con clases en el portal (`SELECTOR_RESALTADO`); `SegmentedControl` y `Tabs` comunes no cambian porque también los usa el estudiante.
- Tabla de Publicaciones: columna «Familia» sin «a qué se dedica», favoritos sin «/ N» (el umbral de Leyenda sigue llegando y no se pinta, por pedido del usuario), una sola insignia «Con reportes» y Leyenda con estrella.
- Ícono de Configuración: ruedita (`Settings`) en ambos modos; cambio solo visual del menú, excepción al modo local congelado pedida por el usuario.
- Visibilidad para el apoderado: siempre y nunca son la misma casilla, marcada o vacía y deshabilitada, con «(siempre)» o «(nunca)».
