# Decisiones de la spec en curso

- **Modelo (M):** `conversacion.algo_que_saben` (texto, nullable; migración 0036) para la caja «Algo que ya saben» de E7/A5; aprobado en el plan.
- **Conversada al responder el segundo:** se retiran `completar-conversacion` y `por_conversar`; `responder-conversacion` responde `RespuestaAgrupada` y COMPLETA_CONVERSACION va a las dos cuentas. `conversada_por` queda como quien respondió segundo; ninguna regla dependía de él (prueba en `escenarios/ruta`).
- **Lista completa:** las conversaciones se listan siempre, con estado `bloqueada` y `bloqueo_mensaje`; sin carta, el mensaje es el mismo para ambos roles y el front muestra la carta pendiente, no la lista.
- **Tramo de una conversación:** se deduce de la primera condición COMPLETA_ACTIVIDAD de su regla, como `FichaCuenta.tramo`; sin columna nueva.
- **Varios hijos:** parámetro `estudiante` opcional (GET y acciones del apoderado); sin él, el primer vínculo. `ruta` agrega `VIN-LUIS` (Rosa ↔ Luis) para el selector.
- **`t-apo-carta` se retira:** la carta no es una actividad; la reemplaza `t-apo-2`, una informativa de prueba que conserva la secuencia. Es `DATO DE PRUEBA`: la segunda actividad real del apoderado y sus fichas entran con el contenido definitivo.
- **Diploma:** se conservan `obtenido`/`obtenido_en` (fecha del último COMPLETA_BLOQUE de su ruta) y se agrega `codigo` (`EXP-AP-AAAA-NNNNN-D`, §8.3; prefijo y cifras en `parametros.py`).
- **Fichas bloqueadas con su actividad:** `FichaCuenta.actividad` también en las bloqueadas, para el chip «{k} fichas al completar».
- **Pantallas compartidas por rol:** Familia (estudiante) y Conversaciones (apoderado) usan los mismos componentes (`features/family-conversations/components/servidor/`); el rol cambia variables CSS y textos (`textosFamilia.ts`). Los textos «usted» del apoderado siguen los bocetos A3/A4 («Le toca responder», «{hijo} respondió», «Ver o editar mi carta» dentro del regalo).
- **Totales en letras:** los textos fijos de los bocetos («seis temas») usan el `total` del servidor en letras; con `ruta` dicen «dos».
- **Sin carta, la sección muestra la carta pendiente** (E2/A2), nunca la lista; el `bloqueo_mensaje` de cada tema queda como respaldo.
- **Bloqueo del apoderado (A1):** se muestra cuando `GET /conversaciones` responde 409 (CONVERSACIONES cerrada), con el avance de `familia` y la siguiente actividad del portal.
- **Rutas solo en api:** `conversations/carta`, `/regalo` y `/tema/:conversacion` (estudiante y apoderado) y `/parent/activities/diploma`; en local redirigen a la vista de siempre (`SegunModo`).
- **«Descargar PDF»** abre la impresión del navegador (guardar como PDF) con estilos de impresión: solo el diploma, en horizontal. Sin dependencia nueva.
- **Avisos del apoderado** con `AvisoToast` (el portal no tenía toasts); carga y error en sección con `PantallaCargaPortal enSeccion`.
- **Tramos colapsables de Mis actividades** no se implementan: la ruta del apoderado tiene un bloque y la spec pide lista directa; anotado en `pendientes-interfaz.md`.
- **Fixtures de la raíz:** se retiran solo los del portal del apoderado (`apoderado-*`), cuyas pruebas pasan a `ruta-*` con los nuevos `apoderado-actividades-mitad`, `apoderado-completar-t-apo-*` y `apoderado-familia-mitad`. Los demás (Mara, `cuentas`, `resultado-riasec`…) siguen en uso por pruebas locales y de Mara, fuera de F08. Los datos demo de hijos (`parentPortal.ts`) quedan solo para local (congelado).
- **Inicio del apoderado:** la tarjeta de conversaciones toma conversadas y por conversar del hijo activo; el parentesco sale de `GET /sesion`. Varios hijos en el inicio queda pendiente.
