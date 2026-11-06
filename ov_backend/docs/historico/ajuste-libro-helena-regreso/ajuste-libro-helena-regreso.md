# Ajuste libro-helena-regreso

## Contexto

Hoy el libro de Helena está abierto desde el primer ingreso, y su vista general y la de Mis planes no tienen un enlace visible para volver al perfil, como sí lo tiene el Pasaporte. Además, las preguntas de comprobación de una actividad informativa pueden salir ya respondidas en un navegador donde se hicieron antes. El ajuste abre el libro solo al completar «Mi punto de partida», agrega «← Mi perfil» en esas dos vistas y hace que una actividad sin completar en el servidor, o rehecha, empiece como nueva. No hay spec en curso, así que tendrá la suya: `ov_backend/docs/specs/ajuste-libro-helena-regreso.md`. Rama: `ajuste/libro-helena-regreso`, desde `main`.

## Qué cambia y por qué

| Punto | Hoy | Pasará a |
|---|---|---|
| Regla (`datos/fijos.py`, `contenido.py`, `ruta.py`) | El libro no es una sección y no tiene regla. | Sección `LIBRO_HELENA` («El libro de Helena»), que se abre con `COMPLETA_ACTIVIDAD` de `b0-3` (`t-partida` en `ruta`). |
| Rutas (`routes/AppRoutes.tsx`) | `profile/helena` y `profile/helena/:pagina` no tienen protección. | Ambas van con `<SeccionProtegida seccion="LIBRO_HELENA">`: con la sección cerrada se ve la tarjeta de bloqueo. |
| Perfil, capítulo II (`ProfileHelena.tsx`, `StudentProfileView.tsx`) | «Abrir el libro de Helena» siempre navega. | Con la sección cerrada lleva candado y abre la ayuda de Lumi, igual que «Ver mis planes» (`bloqueo` / `onBloqueado` de `ProfilePlans.tsx`). |
| Regreso (`pages/student/HelenaBookView.tsx`, `features/plans/components/MisPlanes.tsx`) | Solo está la flecha de la barra superior. | `Link.sx-d-back` a `appPaths.student.profile`, con «← Mi perfil», sobre el encabezado, con el mismo marcado que `StudentPassportView.tsx:21`. |

### Actividades que empiezan como nuevas (solo modo api)

Causa: los intentos de las preguntas se guardan en el navegador (`ov.missions.v2.api`, por cuenta), no en el servidor.

| Punto | Hoy | Pasará a |
|---|---|---|
| Rastro viejo (`proyectarJourney`, `lib/servidor/adaptadores.ts`) | Si el servidor ya no tiene la actividad completada (por ejemplo, la base se recargó), solo se quita el `$fin`. Intentos y elecciones siguen en el navegador, y `QuestionNode` los muestra como respondidos. | Si la actividad no está `COMPLETADA` en el servidor y el navegador conserva un rastro de una pasada terminada, se borra lo local de esa actividad: posición, intentos, elecciones, ítems, entregas y borradores. Empieza como nueva. |
| Qué cuenta como rastro de una pasada terminada | No se distingue. | El estado local era `completada`, la posición es `$fin`, o no hay posición (lo que dejó la versión actual, para que también se limpien los navegadores ya afectados, como el tuyo). |
| Rehacer sin intentos locales (`useActivityCompletion.ts`) | Al rehacer, las respuestas no se guardan a propósito. Si esos intentos no están en este navegador (otro equipo, datos borrados), el cierre falla con «Completa las respuestas y comprobaciones pendientes…» y la misión queda trabada. | Si la actividad ya está completada en el servidor, ese control local no la frena y la misión se puede terminar. |

Esto no se toca, pero sí se cubre con pruebas: «Volver a realizar esta misión» (`?revision=1`) ya abre en el primer nodo y con las preguntas en blanco.

## Qué no cambia

- **Actividad a medio hacer:** sigue retomándose donde quedó, con sus intentos, porque tiene posición guardada y el estado local no es `completada`. Si la base se recargó con una actividad a medio hacer, no se puede distinguir de una pasada legítima y seguirá retomándose.
- **Rehacer en el servidor:** no borra el avance. La misión sigue completada, sin desbloqueos duplicados, y solo la pantalla empieza de cero.
- **Otros tipos de misión:** «Ver o modificar mis respuestas» de registros y cuestionarios sigue mostrando lo respondido.
- **Clave y formato de `localStorage`:** no cambian, así que no hace falta migración.
- **Modo local:** el motor no cambia. `proyectarJourney` solo corre en api.

- **Capítulo II del perfil:** sigue mostrando las páginas selladas y su avance; solo se bloquea entrar al libro.
- **Lecturas y acciones de instrumentos:** `/instrumentos` y revelar no exigen la sección, porque el perfil los lee aunque esté cerrada y ningún instrumento se puede revelar antes de `b0-3`. Es una excepción a «leer una sección bloqueada responde 409», y queda anotada.
- **Otras reglas y portales:** `b0-3` sigue abriéndose igual. El apoderado y la orientadora no se ven afectados.
- **Otras vistas de regreso:** la vista explicada de una página (`ResultHeader`) y el plan abierto (`PlanAbierto`) ya tienen el suyo.
- **Modo local:** el libro sigue siempre abierto, porque `useSeccionesAcceso` responde abierto en local. `MisPlanesLocales` no cambia.

## Modelo de datos

Sin cambios ni migración: `LIBRO_HELENA` es una fila más de `seccion` y una regla, igual que las demás secciones.

## Backend y datos

- **`datos/fijos.py`:** `SECCIONES` agrega `('LIBRO_HELENA', 'El libro de Helena', 'ESTUDIANTE')`.
- **`datos/contenido.py`:** `R-SEC-LIBRO_HELENA`, mensaje «Responde las preguntas de Helena en Mi punto de partida para abrir su libro.»
- **`datos/ruta.py`:** la misma regla con `t-partida`, marcada como `DATO DE PRUEBA`, para que la mecánica exista también en el banco de pruebas.
- **Pruebas que este plan autoriza a adaptar** (solo agregan la sección nueva a sus listas esperadas): `tests/integration/secciones/test_secciones.py`, `contrato/test_consultas_dominio.py`, `contrato/test_exportar_fixtures_front.py` y `soporte/soporte_escenarios_ruta.py`.
- **Prueba nueva:** en `secciones`, el libro está cerrado antes de la misión y abierto después, en `ruta`. En `escenarios/contenido`, lo mismo con `b0-3`.
- **Sin endpoints nuevos:** `GET /cuentas/{c}/secciones` ya entrega la sección.
- **Fixtures del front:** se regeneran.

## Frontend

- **`useSeccionesAcceso.ts`:** `CodigoSeccion` agrega `LIBRO_HELENA`.
- **`guideTexts.ts`:** `textosBloqueo.LIBRO_HELENA`.
  - `adelanto`: «Helena guarda un libro con lo que va descubriendo de ti. Se abre cuando respondes sus primeras preguntas.»
  - `final`: «Todavía no puedes abrirlo.»
- **`useNoveltyQueue.ts`:** `seccionDeVista['profile-helena'] = 'LIBRO_HELENA'`, para que la presentación de Lumi no salga sobre la tarjeta de bloqueo.
- **`FinishExtrasSection.tsx`:** `rutasSeccion.LIBRO_HELENA = discoveryPaths.helena`. El cierre de la misión dirá que se abrió el libro, con enlace, y la campana lo anunciará como las demás secciones.
- **Vistas:** las de la tabla de arriba.
- **Pruebas nuevas en `tests/servidor/`:** libro bloqueado por URL, candado en el capítulo II, y «Mi perfil» en ambas vistas.
- **Excepción al modo local:** `HelenaBookView` es una sola implementación, así que «← Mi perfil» también aparece en local. Aprobar este plan la autoriza, y queda anotada en `ov_frontend/AGENTS.md`.

## Fases

1. **Backend y datos:** sección, reglas, pruebas, fixtures y `motor.md`. Se corren `tests/integration/secciones`, `contrato`, `datos` y `escenarios`.
2. **Front:** bloqueo y regreso. Se corren `tests/servidor/instrumentos`, `perfil`, `planes`, `logros`, `tests/local/aventura` y `npm run test:servidor`.
3. **Actividades como nuevas:** limpieza en `proyectarJourney`, cierre de la pasada repetida y pruebas nuevas en `tests/servidor/actividades`: rastro viejo limpio, navegador ya afectado limpio, actividad a medio hacer conservada, y rehacer sin intentos locales que termina. Se corren `tests/local/actividades`, `tests/servidor/actividades`, `tests/servidor/registro` y `npm run test:servidor`. Si `servidor-apoderado.test.mjs` choca, se corrige la implementación, no la prueba: el apoderado comparte `proyectarJourney`.
4. **Cierre:** suite completa de ambos repos, `decisiones.md` y documentos vigentes. La spec queda en curso y no se hace push.

Un commit por fase, con solo los archivos del ajuste. Los cambios sin commit que ya están en el árbol (ajustes móviles, contenidos, imagen) quedan fuera.

## Verificación

- Pruebas de cada fase en verde con el subagente `pruebas`.
- Prueba manual con backend `ruta` y front `VITE_DATOS=api`, en 375 px:
  - cuenta nueva: libro bloqueado por URL y candado en el perfil;
  - tras completar la misión de partida: el cierre anuncia el libro y este se abre;
  - «← Mi perfil» funciona en el libro y en Mis planes;
  - con una misión informativa con preguntas de comprobación: la completo, reinicio la base sin limpiar el navegador, y la misión empieza de cero y sin respuestas;
  - al completarla de nuevo, «Volver a realizar esta misión» abre en blanco y termina bien, también con los datos locales borrados.

## Advertencia de despliegue

La sección y su regla solo llegan a la base desplegada con **`recargar_contenido`, que borra cuentas y progreso**. Sin recarga no se rompe nada: el front trata la sección que no recibe como abierta, así que el libro sigue accesible. Si hay estudiantes reales cuyo avance deba conservarse, hará falta además una migración de datos que inserte la sección, su regla y el desbloqueo de quienes ya completaron la misión. **No está incluida en este plan.**
