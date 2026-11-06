# Ajuste · limpiar-casos-antiguos-e-icono

## Contexto

En la Ciudad (modo `api`) siguen apareciendo marcadores antiguos con «Disponible en una próxima iteración», como «Una voz para el barrio», que no son los casos cargados por el usuario. Además, los casos reales `c1`…`c6` usan el mismo ícono que las actividades informativas. El usuario eligió: ícono `RadioTower`, mover `c2`…`c6` a los lugares que quedan libres y quitar también los dos desafíos antiguos.

## Qué cambia y por qué

1. **Marcadores antiguos de casos.** Hoy `getCiudadPoints` (`features/adventure/lib/ciudadPoints.ts`) agrega en `api` los cinco de `cityCases` que no representa una actividad. Pasará a no agregar ninguno: la Ciudad en `api` solo muestra `puntosServidor(bloques, 'CIUDAD', 'ciudad')`.
2. **Marcadores antiguos de desafíos.** Hoy la misma función agrega `desafio-rumor` y `ficha-luz-rumor` si no los representa una actividad. Dejarán de agregarse.
3. **Función sin uso.** `referenciasServidor` (`lib/servidor/contenidos.ts`) solo servía para ese filtro: se elimina.
4. **Ícono de los casos.** Hoy `puntosServidor` (`features/adventure/lib/puntosServidor.ts`) da ícono por tipo solo a `BATALLA` y el resto sale de `mapa.icono`. Una actividad `CASO` pasará a usar `RadioTower`, esté disponible o completada. Bloqueada sigue con candado (`MapNode`). El drawer y «Siguiente paso» leen `punto.icon`, así que lo toman solos.
5. **Posiciones de los casos**, en `src/data/activities/contenidos/plataforma/c<N>.json`, según lo que muestra la imagen en cada lugar:

| Caso | Hoy | Pasará a | Lugar en la imagen |
|---|---|---|---|
| `c2` Las becas | 300, 210 | 750, 190 | palacio de la derecha |
| `c3` La cosecha | 600, 170 | 760, 510 | campos de cultivo |
| `c4` El festival | 140, 300 | 505, 335 | plaza del mercado |
| `c5` El torneo | 620, 280 | 460, 130 | terrenos junto al castillo |
| `c6` La laguna | 880, 330 | 220, 405 | acantilados con cascada |

`c4` no usa exactamente el lugar libre (510, 360), porque ahí se tocaría con las misiones de inteligencias (490, 375 y 520, 390). `c1` no se mueve.

## Qué no cambia

- **Modo local:** `cityCases`, `challenges`, sus marcadores y `Building2` siguen igual; el modo está congelado y otras partes los usan (`adventureStore`, mochila, logros, diario).
- **Batallas reales:** siguen con `Swords`. Los desafíos `desafio-rumor` y `ficha-luz-rumor` siguen en `challenges`, porque el modo local y las pruebas de batallas los usan.
- **`mapa.icono` en los JSON de casos:** se conserva porque el formato lo exige; en un `CASO` no se usa, igual que en una batalla.
- **`pointDetails.ts`:** el respaldo «Disponible en una próxima iteración» queda sin cambios. Ya no lo alcanza ningún marcador de la Ciudad, pero cubre puntos sin actividad y quitarlo haría caer el caso en la rama local.
- **Otros textos** con «próxima iteración» (`SoloLocal`, `useHelenaPages`): no son parte de este ajuste.

## Modelo de datos

Sin cambios.

## Backend

Sin cambios en endpoints, servicios ni pruebas.

## Datos

Sin cambios en `datos/fijos.py` ni `datos/ruta.py`. No hay que regenerar fixtures: las posiciones están en el front.

## Frontend

- `ciudadPoints.ts`, `puntosServidor.ts`, `lib/servidor/contenidos.ts` y los JSON `c2`…`c6`.
- **Prueba adaptada, autorizada por este plan:** `tests/servidor/batallas/servidor-batallas-mapa.test.mjs:55` exige hoy que `neighborhood-radio` siga en la Ciudad; pasará a exigir que no esté. Se anota en `decisiones.md`.
- **Pruebas nuevas**, en ese mismo archivo: la Ciudad en `api` no tiene marcadores de `cityCases` ni de `challenges` y una actividad `CASO` usa `RadioTower`.
- **Documentos:**
  - `docs/pendientes-interfaz.md`: la entrada «Lugar de los casos en la Ciudad» queda resuelta.
  - `docs/contenidos-actividades.md`: `mapa.icono` no se usa en `CASO` ni en `BATALLA`.
  - `ov_backend/docs/decisiones.md`: las decisiones de este ajuste.

## Fases

**F1 · Limpieza, ícono y posiciones.** Cambios del front, prueba adaptada y nuevas, y documentos. Pruebas: `tests/local/aventura`, `tests/servidor/mapa`, `tests/servidor/logros`, `tests/servidor/batallas`, `tests/servidor/casos` y `npm run test:servidor`. Commit `Ajuste limpiar-casos-antiguos-e-icono · F1: …`.

**Cierre.** Suite completa con el subagente `pruebas`: `uv run pytest -n auto -q`, `npm test`, `npm run build`, `npm run lint`, `npm run check:estructura`. También `uv run python scripts/verificar_contenido_front.py`. La spec queda en curso y no se hace push.

## Verificación

- Con el conjunto `contenido` y el front en `VITE_DATOS=api`, abrir la Ciudad en el navegador integrado y comprobar: sin marcadores antiguos, seis casos en sus lugares sin taparse con otros nodos, antena en un caso disponible y candado en uno bloqueado.
- Si un caso se tapa con otro nodo o cae en un lugar raro, se corrige su posición y se dice en el resumen.

## Preguntas abiertas

Ninguna.
