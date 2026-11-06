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

## Ajuste · perfil-capitulos

### Contexto

En Mi perfil (`/student/profile`), el círculo del capítulo II intenta mostrar un código que se desborda con inteligencias y habilidades y que no existe en partida y llegada. En el capítulo III, el chip de avance se parte en dos líneas con nombres largos, los planes vacíos dicen «Espacio libre» y los favoritos ocupan dos filas. Se rehace la presentación de ambos capítulos según el texto de observaciones y sus dos bocetos. El hallazgo depende solo de `tipoResultado`, para que un instrumento nuevo aparezca bien sin tocar código. Solo front.

Los bocetos son las dos imágenes adjuntas en el chat, porque no están en `docs/specs/bocetos/perfil-capitulos/`. Si difieren del texto, manda el texto: «Resultado parejo» (no «Gustos parejos»), `Brain` en inteligencias (no foco) y «2 subieron · 3 se mantuvieron» (no «2 dimensiones subieron»).

### Qué cambia y por qué

#### Capítulo II (`features/discovery/components/ProfileHelena.tsx`)

1. **Sello.** Hoy escribe `areas.map(code)` o `Sparkles`. Pasará a llevar un ícono fijo: `iconoPagina(pagina)` devuelve el nombre del ícono de la definición de la página (nuevo campo `icono` en `data/resultPages.ts`: `Flag`, `Compass`, `Brain`, `Users`) o, si no lo tiene, el respaldo por `tipoResultado`. Estilos solo bajo `.sx-d-helena-page`: sellada igual, lista dorada con lámpara y halo, descifrada azul con borde blanco y anillo azul, en 40 px.
2. **Página lista.** Hoy `useStudentProfile` la saca a `destacada`, en una tarjeta aparte. Pasará a quedarse en su fila con el enlace «Helena terminó de leer · Romper el sello →». Salen `destacada` del hook, de la vista y de la prop.
3. **Página descifrada.** Hoy dice «Descifrada» o «Descifrada · la llegada se escribe al final». Pasará a mostrar `PageFinding` con lo que devuelve `hallazgoPagina`. Sale `llegadaPendiente`.
4. **Hallazgo:** `hallazgoPagina(pagina, resultado)` en `features/discovery/lib/resultPage.ts`, con las formas del texto.
   - `COINCIDENCIAS`: `parejo` con perfil plano; `letras` si todos los códigos de `areas` tienen un carácter; si no, `etiquetas`.
   - `DESTACADAS`: `etiquetas` solo con `resultado.destacadas`, hasta 2 nombres y `resto`. Nunca usa `areas` como respaldo; sin `destacadas`, devuelve `null`.
   - `COMPARACION`: `zonas`, con tiras y frase, más un indicador `llegadaLista`. Se reutilizan `modeloPartidaLlegada` y `posicionZona` de `lib/partidaLlegada.ts`; no se leen puntajes.
   - Tipo desconocido o sin datos: `null`, y la fila queda con sello y nombre.

   El hook agrega a cada página su `tipoResultado` e `icono` desde `resultPages` y, en api, las zonas del modelo en `resultado.zonas` (`{ partida, llegada? }[]`). No hay peticiones nuevas: `cargarInstrumentos` ya trae resultados y comparación al abrir el perfil.

   **Solo en local**, el hook copia `areas` a `destacadas` en las páginas `DESTACADAS`. Los resultados de ejemplo de `getHelenaPages` no traen `destacadas`, y ahí `areas` sí es la lista de destacadas (`dimensiones` es la lista completa). En api, `destacadas` ya llega de `dimensiones_destacadas`.
5. **Llegada lista con la partida descifrada** (`selloLlegada`). `hallazgoPagina` devuelve `{ forma: 'zonas', partida, llegada: null, frase, llegadaLista: true }`. `PageFinding` pinta la tira de la partida y, en el lugar de la barra punteada de la llegada, el enlace «Helena terminó de leer · Romper el sello →» hacia el libro. La frase sigue siendo la de los conteos de la partida.
6. **Colores de zona.** F03 no los define (`ZoneChips` es neutro), así que se agregan tres variables: `--sx-zona-fuerte` (azul `--primary`), `--sx-zona-en-camino` (`--sx-gold`) y `--sx-zona-por-trabajar` (pergamino claro con borde).

#### Capítulo III (`features/discovery/components/ProfilePlans.tsx`)

7. **Fila con plan.** Hoy tiene píldora (`resumen`) en api y barra «% armado» en local. Pasará a tener el nombre en una línea con `title` y, debajo, `PlanSectionCells` con «x de y secciones» o el sello «Plan completo» y borde dorado.
8. **Resumen del plan.** `resumenPlanPerfil(plan)`, en `features/discovery/lib/plans.ts`, recibe `{ secciones: { estado }[] }` y devuelve `{ casillas, listas, total, completo }`; `completo` es `total > 0 && listas === total`. En api recibe el plan del servidor; en local, las cuatro secciones de `getPlanSections(sheet)`. Con 4 secciones coincide con `planCompleto`, que no se toca.
9. **Fila sin plan.** Sale `espacioLibre` del hook y de la vista. Los textos por posición (`VACIOS`) quedan en ambos modos.
10. **Favoritos.** Hoy son chips `.sx-d-chip`. Pasarán a una grilla de 3 casillas con corazón, número y etiqueta, y el mismo enlace. Se quitan `.sx-d-chips` y `.sx-d-chip`, que solo usa este componente.

#### Componentes nuevos (en `features/discovery/components/`)

`PageFinding`, `ZoneStrip` y `PlanSectionCells`. Estilos en `styles/student/discovery.css`, con los tokens existentes.

### Qué no cambia

- **Libro de Helena:** tarjetas, revelado y vista explicada. `Seal` no se modifica, y `.sx-d-helena-ready` queda en el CSS porque la tarjeta del libro también usa esa clase.
- `resumenPagina`, `DimensionSummaryRow` y `modeloPartidaLlegada`: se reutilizan sin cambios.
- Mis planes, `planCompleto`, `seccionesListas`, los favoritos y sus vistas.
- Cabecera, vitrina, capítulo I, pie y las vistas del apoderado y de la orientadora.
- Las filas de plan siguen sin ser enlace, porque hoy no lo son.

### Modelo de datos

Sin cambios.

### Backend

Sin cambios en endpoints, servicios ni pruebas.

### Datos

Sin cambios en `datos/` ni en los fixtures.

### Frontend

- **Hook y vista:** `useStudentProfile.ts` y `StudentProfileView.tsx`.
- **Lógica:** `resultPage.ts`, `plans.ts` y `data/resultPages.ts`. El tipo `HelenaResult` recibe `zonas` opcional.
- **Modo local:** mismo alcance que `ajuste-pasaporte-perfil` (una sola implementación). El hallazgo se alimenta con lo que ya usa el libro en local.

### Decisiones del ajuste (el texto no las define)

- **Llegada lista para revelar con la partida ya descifrada:** la fila muestra la tira de la partida y el enlace «Helena terminó de leer · Romper el sello →» en lugar de la barra punteada, porque es el revelado de cierre del camino y no puede quedar escondido en el perfil.
- **`DESTACADAS` sin respaldo en `areas`:** `hallazgoPagina` lee solo `destacadas`; únicamente el hook, en local, copia `areas`, porque en esos resultados de ejemplo `areas` son las destacadas.
- **`COINCIDENCIAS` con códigos largos:** misma regla que `DESTACADAS`, 2 etiquetas y «+N», porque comparten forma y debe caber en una línea.
- **Local con planes:** la barra «% armado» se reemplaza por las casillas, por la misma excepción de una sola implementación.

Se anotan en `ov_backend/docs/decisiones.md`.

### Pruebas

- **Nuevas (funciones puras), en `tests/servidor/perfil/`:** los casos de `hallazgoPagina`, `iconoPagina` y `resumenPlanPerfil` que lista la sección 4 del texto, más dos: `COMPARACION` con `selloLlegada` da `llegadaLista: true` y `llegada: null`, y `DESTACADAS` sin `destacadas` da `null` aunque haya `areas`.
- **Adaptadas, autorizadas por la sección 4 del texto:**
  - `tests/servidor/perfil/servidor-perfil.test.mjs`: `destacada` (las páginas quedan juntas en su orden), `espacioLibre` y la forma de `plans`.
  - `tests/servidor/planes/servidor-planes-vistas.test.mjs:328`: píldora y «Espacio libre» pasan a casillas y textos por posición.

Sin casos de vista nuevos.

### Fases

**F1 · Capítulo II.** `hallazgoPagina`, `iconoPagina`, `PageFinding`, `ZoneStrip`, sello sin texto, fila «lista» en su lugar, hook, vista, estilos y pruebas. Pruebas: `tests/servidor/catalogo`, `instrumentos`, `investigaciones`, `perfil`, `logros`, `planes` y `npm run test:servidor`. Commit `Ajuste perfil-capitulos · F1: …`.

**F2 · Capítulo III.** `resumenPlanPerfil`, `PlanSectionCells`, filas vacías, grilla de favoritos, estilos y pruebas. Mismas pruebas, más `tests/local/perfil`. Commit `Ajuste perfil-capitulos · F2: …`.

**Cierre.** Suite completa con el subagente `pruebas`: `uv run pytest -n auto -q`, `npm test`, `npm run build`, `npm run lint` y `npm run check:estructura`. `decisiones.md` y una nota en `docs/origen-de-datos.md` (el hallazgo del perfil se deriva del mismo resultado que el libro). La spec queda en curso y no se hace push.

### Spec

El plan aprobado se agrega como sección `## Ajuste · perfil-capitulos` al final de `ov_backend/docs/specs/ajuste-limpiar-casos-antiguos-e-icono.md`, la única spec en curso, según el flujo de `/ajuste`. Rama: `ajuste/perfil-capitulos`.

### Verificación

Con `VITE_DATOS=api`, abrir `/student/profile` en el navegador integrado y comparar con los bocetos, a 375 px y en escritorio:

- Sellada, lista y descifrada, con los hallazgos de los cuatro tipos.
- Planes A, B y C vacíos y con plan, nombre largo y favoritos con y sin datos.
- Sin desbordes.

Si un estado no se puede alcanzar con los datos cargados, se dice en el resumen.

### Preguntas abiertas

Ninguna.
