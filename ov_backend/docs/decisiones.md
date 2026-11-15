# Decisiones de la spec en curso

## Ajuste desbloqueos

- `contenido` agrega apoderados de prueba (`apo-beto`, `apo-mia`, `apo-teo`, `apo-sol`) y sus vínculos, sin tocar `ruta`: `b1-4` pide la carta, que exige un vínculo activo (precisión 1 del usuario). `datos/usuarios_prueba.txt` sigue siendo solo de `ruta`; las credenciales están en `APODERADOS_PRUEBA`.
- `scripts/prerrequisitos_contenido.py` dice qué pide cada misión fuera del camino (carta, caso `c1` con 8, `investigador` tras `b1-7`, guion con pregunta propia sin LLM). La usan la siembra y `soporte_contenido.avanzar`, que la importa de `scripts` (precisión 2).
- Adaptaciones por las reglas autorizadas: `test_carga_conteos` (12 cuentas), el camino de punta a punta y la ruta del apoderado (`test_recorrido_contenido.py`) y `test_camino_con_reglas_de_planes` (`registros/`), que recorren las requeridas a mano y ahora hacen lo que piden `b1-4`, `b1-7` y `b3-2`.
- `guardar-guion` con `terminar` sube de 8 a 9 consultas solo la primera vez que deja el guion listo con `b3-2` pendiente: el evento tiene regla que evaluar y el motor carga los conteos (una consulta por petición). Aceptado por el usuario; lo fija `test_presupuestos_desbloqueos.py`. Las demás acciones medidas no cambian (completar b1-3 87, GET actividades 6, escribir-carta 9, resolver-caso 13, completar b1-7 76, guardar-lo-que-pienso 5).
- La dependencia de `b3-2` de la opcional `investigador` no la detecta `test_ninguna_requerida_depende_de_una_opcional` (TERMINA_GUION no nombra actividad): queda declarada en `REGLAS` y en `motor.md`.
- La siembra de ejemplos da apoderado también a los casos 3 y 4 (`apo-panel-3`, `apo-panel-4`), que pasan `b1-4`.
