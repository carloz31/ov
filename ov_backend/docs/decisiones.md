# Decisiones de la spec en curso

## Ajuste resultados-intereses

- F1 · El modelo cambia en tres migraciones, una por fase de backend (0041 catálogo y textos; luego resultado y retiro de `carrera_ocupacion`), para que cada fase cierre en verde; `carrera_ocupacion` sigue provisional hasta F3.
- F1 · Los textos por audiencia se guardan como `lectura_*` y `mensaje_*`: `descripcion` ya es la frase antes de responder. `lectura` se renombra a `lectura_estudiante` conservando su contenido.
- F1 · Las 5 ocupaciones con slug y `en_catalogo = 0` (event-assistant, security-guard, cook, firefighter, medical-specialist) se cargan con `en_catalogo` falso: siguen sirviendo a casos y testimonios y no se listan (decisión del usuario).
- F1 · Las 10 ocupaciones militares (`55-x`) no tienen RIASEC ni textos en Mi Próximo Paso: se cargan con el título curado, sin puntajes ni letras, y nunca `en_test`. Su grupo O*NET 55 no estaba en `grupos_ocupacionales.csv`: se agrega «55,Fuerzas Armadas,shield».
- F1 · El test usa 234 ocupaciones, no 233: Tripulante de cabina tiene `en_test = 1` y RIASEC pero no familia (la evaluación de la curaduría exigía familia principal). Entra en las ocupaciones afines y no aporta a ninguna familia.
- F1 · `{habilidades}` en el texto del apoderado de Habilidades sociales se arma al cargar con los nombres de las dimensiones cargadas, para que no se desalinee.
- F1 · Se adapta `test_ningun_instrumento_queda_sin_lectura` a los textos por audiencia (lo autoriza la observación: textos por audiencia como datos).
- F1 · Bajar de 0041 se detiene si hay familias de ocupaciones (como 0033 y 0039): el catálogo curado no cabe en 0040; la base se vacía y se recarga.
- F1 · El cálculo de coincidencias usa solo las ocupaciones `en_test`; el listado del catálogo, sus grupos y el «lugar inesperado» excluyen las de `en_catalogo` falso.
- F1 · Pruebas adaptadas por el cambio de datos que pide la observación: conteos de tablas y ocupaciones (250 cargadas, 245 listadas), áreas de 2 cifras (`313` → `31`), títulos curados (`Psicólogo clínico`, `Paramédico / técnico en emergencias médicas`, `Director ejecutivo (gerente general)`) y el punto donde se detiene el downgrade.
- F2 · El resultado se sigue leyendo en `GET /cuentas/{c}/instrumentos/{i}/resultado` (la ruta que usa el front); no se crea `/resultados/intereses`. `coincidencias` y `carreras_recomendadas` dan paso a `ocupaciones`, `por_area` y `familias`.
- F2 · `{nombre}` se reemplaza por el nombre de pila (primera palabra de `cuenta.nombre`), como en el boceto («Ana»).
- F2 · Bajar de 0042 se detiene si algún resultado tiene más de 10 coincidencias; con 10 o menos se recalcula `ajuste` con los umbrales O*NET.
- F2 · `por_area` se ordena por la primera aparición de cada área en la lista de ocupaciones; «Sin familia» va al final con `area_codigo` nulo.
- F2 · Las opciones de la referencia COINCIDENCIAS pasan a ser las ocupaciones afines mostradas (de 10 a 30).
- F3 · Migración 0043 retira `carrera_ocupacion` (al bajar vuelve vacía); carreras y ocupaciones se relacionan solo por familia. Se retiran `OCUPACIONES_CARRERA` de la ruta y el sorteo provisional.
- F3 · La ficha de familia vive en `GET /cuentas/{c}/catalogo/familias/{codigo}`, junto al resto del catálogo, que siempre lleva cuenta. El listado `familias` no gana `descripcion`: la da la ficha.
- F3 · Se retira `GET …/catalogo/grupos` junto con el filtro `grupo`; el grupo sigue en el resumen para el ícono.
- F3 · `ingresos` de la ficha es el promedio nacional de jóvenes por tipo de institución (no se mezclan tipos); el front elige cómo mostrarlo.
- F3 · El detalle de carrera ya no marca `es_favorita` en sus ocupaciones (la relación por familia trae resúmenes livianos con `afinidad`); se adapta la línea de `test_favoritos` que lo leía.
- F3 · `programa_ejemplo` es la primera carrera (por nombre) de la familia principal cuyo `codigo_cine` aparece en `programas_cine`, en el orden de la curaduría.
