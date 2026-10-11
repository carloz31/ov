# Especificación: nuevo estilo de los portales de orientadora y apoderado

Oct 6, 2026 · @Carlos Sanchez

Esta especificación cambia el estilo visual de todas las vistas del portal de la orientadora y del portal del apoderado. La referencia es la vista del perfil del estudiante en la página Orientadora del prototipo [Progreso y retroalimentación](https://claude.ai/artifact/1vusmJWnPqmSMCffqVvJeE).

## Contexto y alcance

**Problema.** Las tarjetas blancas sobre un fondo casi blanco, con bordes muy finos, hacen que todo pese lo mismo: no se distingue qué es lo principal ni dónde termina cada bloque. Algunos textos grises pequeños no alcanzan el contraste mínimo.

**Dónde se cambia.** Ambos portales ya comparten el tema `theme-staff`: `ParentPortalModule.tsx` envuelve su contenido en `.theme-staff` y `CounselorPortalModule.tsx` usa `theme="staff"`. Sus variables y reglas viven en `src/styles/Theme.css`. Por eso:

1. **Primero se cambian los tokens de `.theme-staff`** (sección siguiente). La mayor parte del cambio llega así a todas las vistas.
2. **Luego, las reglas de los componentes compartidos** de `src/components/ui` dentro de `.theme-staff`: barra lateral, tarjetas, pestañas, barras de progreso, insignias y alertas.
3. **Al final, los patrones de pantalla** que se repiten (encabezado de entidad, tarjeta de alertas, recuadro de métrica), aplicados donde corresponda.

**Alcance.**

- Aplica a todas las vistas bajo `src/features/counselor-portal` y `src/features/parent-portal`, incluidas las actividades del apoderado y las conversaciones familiares (`FamilyConversationsView`) cuando se muestran dentro del portal del apoderado.
- No cambia el tema del estudiante (`:root, .theme-student`) ni la pantalla de ingreso, que tiene su propia especificación.
- No cambia la estructura, los datos ni el comportamiento de ninguna vista. Solo la presentación.
- Se mantiene el tema claro. No se agrega modo oscuro.

## Tokens del tema

Se modifican estos valores dentro de `.theme-staff` en `Theme.css`. Los tokens que no aparecen en la tabla se mantienen.

| Token | Actual | Nuevo | Motivo |
| --- | --- | --- | --- |
| `--background` | #f5f7fa | **#ECEFF5** | Separar el fondo de las tarjetas |
| `--border` | #e3e7ed | **#D5DAE6** | Borde visible en tarjetas y separadores |
| `--input` | #c9d0da | **#C9CED9** | Campos alineados con el borde |
| `--primary` | #2457b8 | **#3F51B5** | Mismo azul que el resto de la plataforma |
| `--primary-hover` | #1c4596 | **#283593** |  |
| `--primary-soft` | #eaf0fb | **#E8ECFA** |  |
| `--ring` | #2457b8 | **#3F51B5** |  |
| `--accent-foreground` | #1c4596 | **#283593** |  |
| `--muted-foreground` | #5b6676 | **#4A5068** | Contraste 4.5:1 en texto secundario pequeño |
| `--neutral-text` | #5b6676 | **#4A5068** |  |
| `--text-tertiary` | #8a94a3 | **#5B6275** | El valor actual no llega a 4.5:1 sobre blanco |
| `--track` | #e8ecf2 | **#D5DAE6** | Pista de las barras de progreso visible |
| `--warning-soft` | #fbf1dc | **#FFF8E6** | Fondo de la tarjeta de alertas |
| `--warning-text` | #8a5a12 | **#5A3B00** |  |
| `--data-primary` | #2457b8 | **#3F51B5** |  |
| `--data-secondary` | #9db5e3 | **#8FB4FF** |  |
| `--data-grid` | #e3e7ed | **#D5DAE6** |  |
| `--shadow-card` | (sombra casi invisible) | **`0 1px 2px rgb(31 36 51 / 6%), 0 4px 12px rgb(31 36 51 / 5%)`** | Elevación suave de las tarjetas |

**Barra lateral (tokens nuevos de valor, ya existen como nombres):**

| Token | Nuevo |
| --- | --- |
| `--sidebar` | **#1E2433** |
| `--sidebar-foreground` | **#C9CEDC** |
| `--sidebar-primary` / `--sidebar-accent` | **#3F51B5** |
| `--sidebar-primary-foreground` / `--sidebar-accent-foreground` | **#FFFFFF** |
| `--sidebar-border` | **rgb(255 255 255 / 10%)** |
| `--sidebar-ring` | **#8FB4FF** |

Tokens nuevos para el borde de las alertas y el acento de marca:

- `--warning-border: #F1D48A`
- `--brand-gold: #FFD666` (solo para la estrella de la marca y detalles mínimos)

Agregarlos también al bloque `@theme inline` si se usan desde clases de Tailwind (`--color-warning-border`, `--color-brand-gold`).

## Reglas de componentes compartidos

Todas van en `Theme.css` con el prefijo `.theme-staff`, igual que las reglas existentes, para que el tema del estudiante no cambie.

**Barra lateral (`Sidebar.tsx`)**

- Fondo `--sidebar` (#1E2433) y texto `--sidebar-foreground`.
- Ítem activo: fondo `--sidebar-accent` (#3F51B5), texto blanco, peso 600, radio 10 px. Al pasar el cursor sobre un ítem inactivo: fondo `rgb(255 255 255 / 6%)` y texto blanco.
- Íconos del mismo color que el texto del ítem.
- Marca: «ORIENTACIÓN» en #9AA0B2 y «Explora» en blanco, con la estrella `--brand-gold` de 14 px junto al nombre, como en el mapa del estudiante.
- Rótulo de sección («PANEL DE LA ORIENTADORA») en 12 px, peso 700, mayúsculas, #9AA0B2.
- Bloque del usuario al pie con borde superior `--sidebar-border`; el nombre en blanco y el rol en #9AA0B2.
- El botón para contraer la barra y su estado contraído se mantienen como hoy.

**Barra superior del contenido**

Fondo `--card`, borde inferior `--border` y 60 px de alto. La ruta de navegación (por ejemplo, «← Mis estudiantes / Ana Lucía Álvarez Rojas») en 14 px, peso 600.

**Tarjetas (`Card.tsx`)**

Fondo `--card`, borde 1 px `--border`, radio 16 px y sombra `--shadow-card`. Títulos de tarjeta en peso 700. Separación entre tarjetas de una pantalla: 16 px.

**Pestañas de navegación (`Tabs.tsx`, `data-appearance="navigation"`)**

Se reemplaza el subrayado por un **control segmentado**: la lista con fondo #DDE2EC, radio 12 px y padding 4 px, alineada a la izquierda (no a todo el ancho); cada pestaña con 40 px de alto, padding 0 18 px, radio 9 px y peso 600 en `--muted-foreground`; la activa con fondo `--card`, texto `--foreground`, peso 700 y sombra `0 1px 3px rgb(31 36 51 / 15%)`. Sustituye las reglas actuales de `[data-slot='tabs-list'][data-appearance='navigation']`. Si hay más pestañas de las que caben, la lista se desplaza en horizontal.

**Barras de progreso (`Progress.tsx`)**

8 px de alto (hoy 6 px), pista `--track` e indicador `--primary`, con radio completo.

**Insignias de estado (`Badge.tsx`, `Status.tsx`)**

Píldoras de 13 px, peso 700, padding 4 px 12 px, siempre con fondo suave, borde y texto oscuro del mismo tono:

| Estado | Fondo | Borde | Texto |
| --- | --- | --- | --- |
| Completado / éxito | `--success-soft` | #A7DFBD | #166534 |
| Alerta | #FFE3D1 | — | #7A2E0E |
| Advertencia | `--warning-soft` | `--warning-border` | `--warning-text` |
| Neutro / pendiente | `--neutral-soft` | `--border` | `--neutral-text` |

Cada insignia de estado lleva un ícono pequeño (check, reloj, triángulo) además del color.

**Botones y campos**

Se mantienen las reglas actuales con los nuevos tokens. Altura mínima de 40 px en botones y campos del portal de la orientadora (44 px en el del apoderado, ver más abajo).

## Patrones de pantalla

Tres patrones se repiten en varias vistas. Conviene crearlos como componentes compartidos del portal (por ejemplo, en `src/features/counselor-portal/components/`, o en una carpeta común si el apoderado también los usa) y reemplazar con ellos las versiones actuales de cada vista.

### Encabezado de entidad

Para la cabecera de un estudiante, un salón, un hijo o una actividad. Es el bloque más importante de su pantalla.

- Tarjeta con una **franja superior de 6 px** con degradado `linear-gradient(90deg, #3F51B5, #8FB4FF 60%, #F2C66D)`.
- A la izquierda, un avatar con las iniciales (60 px, radio 16 px, fondo `--primary-soft`, texto #283593, peso 800).
- El nombre en 24 px, peso 800, y debajo los datos secundarios en 14 px `--muted-foreground`, separados por 16 px.
- A la derecha, hasta tres **recuadros de métrica**.

### Recuadro de métrica

Para avances y conteos (avance en lo prioritario, avance general, actividades del salón, etc.).

- 210 px de ancho, radio 14 px, padding 12 px 14 px.
- Arriba, la etiqueta (13 px, peso 600) y el valor (22 px, peso 800) en la misma línea.
- Debajo, una barra de progreso de 8 px y el detalle («2 de 6 actividades», 12 px, `--muted-foreground`).
- **Variante principal** (la métrica más relevante de la pantalla): fondo `--primary-soft`, borde #C9D1F2, etiqueta en #283593 e indicador `--primary`. **Variante secundaria:** fondo #F4F5F8, borde `--border`, etiqueta en `--muted-foreground` e indicador #5B6275. Una pantalla tiene como máximo una métrica principal.

### Tarjeta de alertas

Para las alertas del estudiante (`FAMILIA_NO_REGISTRADA`, `AVANCE_BAJO_PROMEDIO`, `SIN_INTERESES`) y cualquier aviso que requiera acción.

- La **tarjeta completa** es ámbar: fondo `--warning-soft`, borde `--warning-border` y radio 16 px. No basta con colorear las etiquetas.
- A la izquierda, un ícono de triángulo en un cuadro de 36 px (fondo #FFE7A3, color #7A4F00) y el conteo («2 alertas», peso 700, `--warning-text`).
- Cada alerta como insignia de tipo «Alerta», con un texto descriptivo en lugar de la etiqueta corta: «Avance bajo el promedio del salón», «Sin intereses registrados», «Familia no registrada».
- A la derecha, el botón secundario «Ver detalle» (fondo blanco, borde #D9B54A, texto `--warning-text`), que conserva el comportamiento actual de «Ver alertas».
- Sin alertas, la tarjeta no se muestra.
- Va inmediatamente debajo del encabezado de entidad.

### Elementos de lista

Los ítems de cuestionarios, registros, actividades o estudiantes en una lista usan una tarjeta con un ícono en un cuadro de 40 px (fondo `--primary-soft`, color `--primary`), el título en 16 px, peso 700, un subtítulo en 13 px `--muted-foreground`, la insignia de estado y, si se despliega, un botón de 40 × 40 px con chevrón y `aria-label` descriptivo («Ver resultados del test de intereses»).

## Matices para el portal del apoderado

El apoderado usa el mismo tema, con ajustes para alguien con menos experiencia digital. Se activan con un atributo en el contenedor del portal: `<div className="theme-staff" data-audience="parent">` en `ParentPortalModule.tsx`, y reglas `.theme-staff[data-audience='parent']`.

- **Texto base de 17 px** (16 px en la orientadora), títulos de pantalla de 28 px y textos secundarios de 15 px como mínimo.
- **Áreas táctiles de 44 px** en botones, campos, ítems de la barra lateral y pestañas.
- **Menos elementos por pantalla:** en el inicio, como máximo un encabezado de entidad (su hijo), una tarjeta de aviso y la lista de actividades. Los detalles secundarios van dentro de cada tarjeta, no en bloques aparte.
- **Encabezado de entidad del hijo** con una sola métrica principal («Avance de \[nombre\]») y, si aplica, el progreso de su propia ruta («Su avance hacia el diploma»).
- **Aviso ámbar** con el mismo estilo de la tarjeta de alertas para lo que requiere acción del padre (por ejemplo, «Las conversaciones ya están disponibles»), con un solo botón.
- **En móvil**, la barra lateral oscura se convierte en el menú del encabezado, como hoy, con el mismo color #1E2433.
- **Las vistas de actividad del apoderado** (con la barra de progreso degradada y la retroalimentación ya especificadas) mantienen su encabezado azul y sus estilos propios; solo adoptan los nuevos tokens de fondo, borde y texto.

## Criterios de aceptación

- [ ] Los tokens de `.theme-staff` tienen los valores de la tabla; el tema del estudiante no cambia.
- [ ] En ambos portales, el fondo de página (#ECEFF5) se distingue claramente de las tarjetas blancas con borde y sombra.
- [ ] La barra lateral es #1E2433 con el ítem activo en #3F51B5, y la marca lleva la estrella dorada.
- [ ] Las pestañas de navegación son un control segmentado con la activa en blanco y negrita.
- [ ] El perfil del estudiante usa el encabezado de entidad con franja degradada y recuadros de métrica, con una sola métrica principal.
- [ ] Las alertas se muestran en una tarjeta ámbar completa, con textos descriptivos y «Ver detalle».
- [ ] Las insignias de estado llevan ícono además del color.
- [ ] Ningún texto de la interfaz queda por debajo de 4.5:1 de contraste (3:1 en textos de 24 px o más); se revisa en especial `--text-tertiary` y los textos de 12–13 px.
- [ ] El portal del apoderado usa `data-audience="parent"`: texto base de 17 px y áreas táctiles de 44 px.
- [ ] Ninguna vista cambia su estructura, sus datos ni su comportamiento.

**Al terminar, Codex informa** qué vistas no usan los componentes compartidos y quedaron con estilos propios, para revisarlas una por una.
