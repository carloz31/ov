# Decisiones de la spec en curso

## Ajuste leyenda (verificación de punta a punta de la Leyenda)

- `ruta` suma tres estudiantes de 5A (`est-mia`, `est-teo`, `est-sol`, DATO DE PRUEBA, en `usuarios_prueba.txt`): con Ana y Luis como autores no quedaba nadie de su salón para llegar a `FAVORITOS_LEYENDA`. Las pruebas que cuentan o listan las cuentas de `ruta` (carga, semilla, invariantes y fixture `cuentas`) pasan a las 8.
- `contar_favoritos` excluye a los autores: el favorito de un compañero que después se suma como coautor seguía contando para la Leyenda (regla 4).
- ENTREVISTA_DESTACADA y ENTREVISTA_LEYENDA se registran una sola vez por autor y entrevista (`registrar_en_autores`): al quitar el destacado y volver a destacar se duplicaban (regla 6). El sello ya no se duplicaba, porque una regla obtenida no se vuelve a desbloquear.
- El diálogo del sello en el pasaporte (`PassportBadgeDialog`) lee `obtenida_en` como hora de Lima (−05:00) si viene sin zona, como ya lo hacían las fechas de Investigaciones. Con un navegador fuera de Lima (en la verificación, Playwright en UTC), el sello obtenido el 29 a las 04:53 decía «28 de octubre». Las demás fechas con ese patrón (diario, seguimiento, diploma) quedan fuera de este ajuste.
