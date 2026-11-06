# Decisiones de la spec en curso

- Ajuste limpiar-casos-antiguos-e-icono: en api, la Ciudad solo muestra lo que entrega el servidor; salen los marcadores fijos de `cityCases` y `challenges`, porque ya no corresponden al contenido real. En local siguen igual, porque ese modo está congelado.
- Ajuste limpiar-casos-antiguos-e-icono: se adapta `tests/servidor/batallas/servidor-batallas-mapa.test.mjs`, que exigía conservar `neighborhood-radio`; ahora exige que no esté. Lo autoriza el plan aprobado.
- Ajuste limpiar-casos-antiguos-e-icono: un CASO lleva `RadioTower` por su tipo, como la BATALLA lleva `Swords`, sin tocar `mapa.icono`, porque el ícono depende del tipo y no de cada JSON.
- Ajuste limpiar-casos-antiguos-e-icono: `c2`…`c6` pasan a los lugares libres según lo que muestra la imagen; `c4` queda en (505, 335) y no en (510, 360) para no tocar las misiones de inteligencias.
