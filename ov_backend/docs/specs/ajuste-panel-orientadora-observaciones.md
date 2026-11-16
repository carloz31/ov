# Spec · ajuste panel-orientadora-observaciones


## Contexto
Nueve observaciones visuales y de texto sobre el portal de la orientadora (modo api). No hay spec en curso: el ajuste tendrá su propia spec `ov_backend/docs/specs/ajuste-panel-orientadora-observaciones.md`. Rama `ajuste/panel-orientadora-observaciones` (ya creada desde `main`).

## Qué cambia (hoy → pasará a)

1. **Avance del salón parejo** — `features/counselor/components/panel/CaminoPanel.tsx` (`PorDondeVa`): hoy cada casilla mide lo que su texto (`min-h-20`) y las de nombre largo crecen. Pasará a: grilla con `auto-rows-fr` y botón `h-full`, así todas las casillas tienen el alto de la más alta.

2. **Selector de planes** — `perfil/PestanaPlanes.tsx` (`PlanAbierto`): hoy «← Resumen de planes» y el selector van en la misma fila, y el plan elegido no se distingue (el `SegmentedControl` usa `variant="outline"` y nada pinta `aria-pressed`). Pasará a: el selector debajo del botón, y el plan abierto resaltado (fondo `primary`, texto blanco) con clases `[&_[aria-pressed=true]]:…` pasadas por `className` (sin tocar `components/ui/SegmentedControl.tsx`, que también usa el estudiante en `ComoMeSiento`). El mismo resaltado se aplica al selector Destacados/Todos de `PestanaRespuestas.tsx`, que tiene el mismo problema.
   **Pestañas principales** del perfil (`pages/counselor/PerfilEstudianteView.tsx`): hoy la activa es `bg-card` sobre `bg-muted`, poco contraste. Pasará a: la activa con texto `primary`, `font-semibold` y borde/sombra más marcados, por `className` en esa vista (el `Tabs` común no cambia).

3. **«Cómo lo haría realidad»** — `perfil/PlanCompletoPerfil.tsx`. **Por qué solo Matrícula:** no es un error; los costos muestran exactamente los rubros que el estudiante registró. El plan de ejemplo (siembra `scripts/sembrar_panel_ejemplo.py` → `realidad_lista()` de `tests/soporte/soporte_planes.py`) solo tiene Matrícula S/ 600 por ciclo: 2 ciclos = S/ 1 200 el primer año, 10 ciclos = S/ 6 000 toda la carrera; la línea «Matrícula.» es la lista de rubros. Cambios:
   - Organización en dos columnas: izquierda «Dónde estudiaría», «Cómo llegaría», «Cómo lo pagaría»; derecha «Cuánto costaría» (los totales y debajo «Incluye: Matrícula, …») y «Lo que podría complicarlo». Hoy el rótulo de complicaciones está dentro de un `flex-wrap` y queda desalineado; pasará a rótulo arriba y chips debajo.
   - La siembra de ejemplo pasará a registrar más rubros en ese plan (Matrícula, Materiales, Transporte), marcado `DATO DE PRUEBA`, para que el ejemplo se vea realista. `realidad_lista()` de las pruebas no cambia.

4. **Tabla de Publicaciones** — `publicaciones/TablaPublicaciones.tsx` y `EstadoPublicacionBadges.tsx`:
   - Columna «Familia y a qué se dedica» → «Familia», solo el nombre de la familia (sin `dedicacion`); anchos reajustados.
   - Favoritos: solo el número (sin «/ 3»).
   - Reportes: hoy dos insignias («N reportes» y «N comentarios reportados»). Pasará a una sola insignia «Con reportes» si hay alguno de cualquiera de los dos tipos (prop `compacto` usada solo en la tabla; el detalle conserva su aviso propio).
   - Leyenda: hoy `variant="warning"` pinta el triángulo de peligro automático de `Badge`. Pasará a llevar un ícono `Star` (al pasar un ícono como hijo, `Badge` no pinta el triángulo).

5. **Detalle de publicación** — quitar «Los reportados van primero» (`ReaccionesModeradas.tsx`) y el pie «Destacar y ocultar se pueden revertir…» (`DetallePublicacion.tsx`). El orden (reportados primero) no cambia.

6. **Ícono de Configuración** — `pages/counselor/CounselorPortalModule.tsx`: `BookOpenCheck` → `Settings` (ruedita) de lucide. Es el mismo ítem en ambos modos; cambio solo visual (se anota como excepción visual al modo local congelado).

7. **«Visible para el apoderado»** — `configuracion/CuestionariosConfiguracion.tsx` (`Visibilidad`): hoy SIEMPRE es el texto «Siempre» y NUNCA «No se comparte», desalineados con la casilla de los opcionales. Pasará a: la misma casilla con la misma etiqueta para todos; SIEMPRE marcada y NUNCA sin marcar, ambas siempre deshabilitadas (no editables), con un texto atenuado «(siempre)» / «(nunca)» junto a la etiqueta para que se entienda por qué no se edita.

8. **Alerta del apoderado** — hoy la alerta `familia-pendiente` se llama «Su familia aún no se registra» y su motivo es «No tiene un apoderado vinculado» o «Su apoderado tiene cuenta, pero no ha ingresado». Pasará a: nombre «Su apoderado aún no inicia sesión» y un mismo motivo para ambos casos, «Su apoderado aún no ha iniciado sesión en la plataforma». Solo textos en `datos/fijos.py` (`ALERTAS` y `TEXTOS_PERFIL_ALERTAS`) y los defectos de `app/services/panel/alertas.py`; el evaluador y sus casos no cambian. En el front, «Sin apoderado vinculado» (`CabeceraPerfil.tsx`) y «No tiene un apoderado vinculado.» (`PestanaAvance.tsx`) siguen, porque describen el dato, no la alerta (ver pregunta 2).

9. **Menos «»** en lo que ve la orientadora:
   - Nombres (tramos, actividades, registros, medidores, cuestionarios) → sin «», en **negrita** o *cursiva* donde el front arma el texto: `PestanaRespuestas` (Tramo *Mi historia…*), `PestanaAvance` (sigue: *Mitos…*), `CaminoPanel` (Donde más se detienen), `ConfirmarConfiguracion`, `ListaInteresCompleta`, `PestanaIntereses`, `adaptadoresPanelEstudiante.ts` (`textoConoce`, «lo que escribió antes en …»), placeholder de comentario (etiqueta Orientadora).
   - Lo que dijo alguien (relato del plan, cita de registro, «Otra» escrita, ficha de entrevista) → comillas “…”.
   - Afirmaciones de partida/llegada (`PartidaLlegadaPerfil.tsx`, `DetallePartidaLlegada.tsx`) → solo la frase, sin comillas.
   - Textos que arma el backend para el panel (texto plano; el front no puede ponerlos en negrita): en `TEXTOS_PERFIL_ALERTAS` y `temas.py`, los nombres van sin «» y lo que el estudiante marcó (nivel, «Sí»/«No») va con comillas “…”. Los textos de errores 422 de `configuracion.py` y las descripciones de `PARAMETROS` (no se muestran) no cambian.

## Qué no cambia
- El cálculo de costos, el modelo y los endpoints: ningún esquema ni respuesta cambia de forma.
- Las vistas del estudiante y del apoderado (incluido `SegmentedControl` y `Tabs` comunes) y los contenidos de actividades (JSON y fichas, que usan «» como estilo narrativo).
- El modo local, salvo el ícono del menú.

## Modelo de datos
Sin cambios.

## Backend
- `datos/fijos.py`: textos de `familia-pendiente` y de `TEXTOS_PERFIL_ALERTAS` sin «»; `app/services/panel/alertas.py` y `temas.py`, los mismos textos por defecto. Las filas de alertas se recargan con el cargador de `datos/`.
- `scripts/sembrar_panel_ejemplo.py`: más rubros en el plan de ejemplo.
- Pruebas adaptadas (autorizadas por la observación 8 y 9): `tests/integration/panel/test_panel_temas.py`, `test_panel_alertas.py` y las que comparen textos con «».
- Regenerar fixtures del front.

## Frontend
Los archivos de los puntos 1–9; pruebas de `tests/servidor/panel` que comparen marcado o textos se adaptan.

## Fases
- **F1 · Backend:** textos de alertas y temas, siembra de ejemplo, pruebas, `docs/sistema/panel.md`, fixtures. Pruebas: `tests/integration/panel` + `escenarios`.
- **F2 · Front panel y perfil:** puntos 1, 2, 3, 7, 8 (sin cambios de front) y 9. Pruebas: `tests/local/portales`, `tests/local/perfil`, `tests/servidor/familia`, `tests/servidor/panel`, `test:servidor`.
- **F3 · Front publicaciones y menú:** puntos 4, 5 y 6. Mismas pruebas.
- **Cierre:** suite completa de ambos, `build`, `lint`, `check:estructura`; `decisiones.md`, `AGENTS.md` del front (excepción visual del ícono) y revisión visual en el navegador.

## Preguntas resueltas
1. Punto 3: sin monto por rubro; basta «Incluye: …» con los rubros del presupuesto.
2. Punto 8: solo cambia la alerta; cabecera y «Avance y familia» quedan igual.
