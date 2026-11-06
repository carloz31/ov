# Decisiones de la spec en curso

- Ajuste limpiar-casos-antiguos-e-icono: en api, la Ciudad solo muestra lo que entrega el servidor; salen los marcadores fijos de `cityCases` y `challenges`, porque ya no corresponden al contenido real. En local siguen igual, porque ese modo está congelado.
- Ajuste limpiar-casos-antiguos-e-icono: se adapta `tests/servidor/batallas/servidor-batallas-mapa.test.mjs`, que exigía conservar `neighborhood-radio`; ahora exige que no esté. Lo autoriza el plan aprobado.
- Ajuste limpiar-casos-antiguos-e-icono: un CASO lleva `RadioTower` por su tipo, como la BATALLA lleva `Swords`, sin tocar `mapa.icono`, porque el ícono depende del tipo y no de cada JSON.
- Ajuste limpiar-casos-antiguos-e-icono: `c2`…`c6` pasan a los lugares libres según lo que muestra la imagen; `c4` queda en (505, 335) y no en (510, 360) para no tocar las misiones de inteligencias.
- Ajuste perfil-capitulos: con la llegada lista para revelar y la partida ya descifrada, la fila muestra la tira de la partida y «Helena terminó de leer · Romper el sello →» en lugar de la barra punteada, porque es el revelado de cierre del camino y no puede quedar escondido. Lo pidió el usuario al aprobar el plan.
- Ajuste perfil-capitulos: `hallazgoPagina` lee solo `destacadas`, sin respaldo en `areas`, que podría ser la lista completa. El hook copia `areas` únicamente en local, donde los resultados de ejemplo no traen `destacadas` y `areas` son las destacadas.
- Ajuste perfil-capitulos: `COINCIDENCIAS` con códigos de más de un carácter sigue la regla de `DESTACADAS` (2 etiquetas y «+N»), porque comparten forma y debe caber en una línea.
- Ajuste perfil-capitulos: en local, las casillas reemplazan a la barra «% armado» y a sus textos de plan, por la misma excepción de una sola implementación de `ajuste-pasaporte-perfil`.
- Ajuste perfil-capitulos: `completo` de `resumenPlanPerfil` es «todas las secciones listas», sin un 4 fijo; con cuatro secciones coincide con `planCompleto`, que no cambia.
- Ajuste perfil-capitulos: los nombres junto a las fichas de letra pasan a una segunda línea en celular en lugar de cortarse, y cada etiqueta tiene 72 px de ancho mínimo para que un nombre largo no vuelva ilegible al corto que va a su lado; se vio al verificar a 375 px.
- Ajuste perfil-capitulos: se adaptan `tests/servidor/perfil/servidor-perfil.test.mjs` (`destacada`, `espacioLibre`, forma de `plans`) y `tests/servidor/planes/servidor-planes-vistas.test.mjs` (píldora y «Espacio libre» pasan a casillas y textos por posición). Lo autoriza la sección 4 del texto del ajuste.
