# Decisiones de la spec en curso

## Ajuste desbloqueos

- `contenido` agrega apoderados de prueba (`apo-beto`, `apo-mia`, `apo-teo`, `apo-sol`) y sus vínculos, sin tocar `ruta`: `b1-4` pide la carta, que exige un vínculo activo (precisión 1 del usuario). `datos/usuarios_prueba.txt` sigue siendo solo de `ruta`; las credenciales están en `APODERADOS_PRUEBA`.
- `scripts/prerrequisitos_contenido.py` dice qué pide cada misión fuera del camino (carta, caso `c1` con 8, `investigador` tras `b1-7`, guion con pregunta propia sin LLM). La usan la siembra y `soporte_contenido.avanzar`, que la importa de `scripts` (precisión 2).
- Adaptaciones por las reglas autorizadas: `test_carga_conteos` (12 cuentas), el camino de punta a punta y la ruta del apoderado (`test_recorrido_contenido.py`) y `test_camino_con_reglas_de_planes` (`registros/`), que recorren las requeridas a mano y ahora hacen lo que piden `b1-4`, `b1-7` y `b3-2`.
- `guardar-guion` con `terminar` sube de 8 a 9 consultas solo la primera vez que deja el guion listo con `b3-2` pendiente: el evento tiene regla que evaluar y el motor carga los conteos (una consulta por petición). Aceptado por el usuario; lo fija `test_presupuestos_desbloqueos.py`. Las demás acciones medidas no cambian (completar b1-3 87, GET actividades 6, escribir-carta 9, resolver-caso 13, completar b1-7 76, guardar-lo-que-pienso 5).
- La dependencia de `b3-2` de la opcional `investigador` no la detecta `test_ninguna_requerida_depende_de_una_opcional` (TERMINA_GUION no nombra actividad): queda declarada en `REGLAS` y en `motor.md`.
- La siembra de ejemplos da apoderado también a los casos 3 y 4 (`apo-panel-3`, `apo-panel-4`), que pasan `b1-4`.
- `datos.cargar contenido` siembra los ejemplos del panel por defecto en cualquier entorno (el subproceso va con `ENTORNO=desarrollo` y `ANTHROPIC_API_KEY` vacía solo para él); `--con-ejemplos` se retira y entra `--sin-ejemplos`. Se retira `test_con_ejemplos_solo_con_contenido`, que fijaba la bandera retirada; lo cubre `test_cargar_ejemplos.py`.
- Si la siembra falla, `datos.cargar` vuelve a cargar `contenido` con `--vaciar` (transaccional) y sale con 3; `actualizar.sh` reinicia igual y sale con 3 después de comprobar la API.
- Grupo de dependencias `ejemplos` (`httpx`, ya en el lock por `dev`) para que la EC2, que sincroniza sin `dev`, pueda correr la siembra con `TestClient`.
- Front: el bloqueo de Conversaciones del apoderado toma la actividad que abre la sección de la condición COMPLETA_ACTIVIDAD de su regla, en el 409 que ya está en el almacén (`aperturaConversaciones.ts`); sin ella, cae al texto y al avance de toda la ruta.
- Front: `parentGuides.overview` y `parentGuides.activities` cambian en los dos modos (son textos comunes, como en el ajuste lumi-mensajes), para no decir que Conversaciones se abre al terminar la ruta.
- Front: el refresco del camino tras la carta, el caso y el guion ya lo hacía el mecanismo F2b (`conDesbloqueos`, y el caso siempre); se fija con `servidor-refresco-desbloqueos.test.mjs`, sin cambiar código.
- Front: la variante `ayuda` de `LumiDialogue` va por `openGuide(pasos, 'ayuda')` y la cola de novedades (`varianteGuia`); el ícono va en el mismo círculo del avatar (`sx-character-circle sx-character-lg`). Se retiran `AvisoAyudaMapa.tsx`, la prop `aviso` de `MapControls` y `.sx-aviso-ayuda-mapa*`.
- Front: el punto usa el acento de la plataforma (`--sx-gold`); Recursos pasa a `AccesoRapido` (siempre abierto) para llevar el punto, sin cambiar su marcado en local.
- Adaptación por las reglas autorizadas: `hasta()` de `registro/test_lectura_registro.py` hace también lo que pide la actividad de destino (`antes_de`), porque `b1-7` ahora espera un caso superado.
- `test_postgres.py` suma la carga de `contenido` con la siembra sobre PostgreSQL y `ENTORNO=produccion`; corrió en verde con `TEST_POSTGRES_URL`.
