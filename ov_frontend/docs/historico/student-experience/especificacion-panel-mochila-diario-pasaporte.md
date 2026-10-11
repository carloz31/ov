# Especificación: panel del mapa, mochila, diario y pasaporte

Repositorio: `carloz31/ov_frontend` · Versión 1 · 4 de octubre de 2026

Este documento lleva cuatro partes de la interfaz del estudiante al mismo lenguaje visual de las vistas de descubrimiento: el panel lateral del mapa, la mochila de Recursos, el diario y el pasaporte de logros. Es la continuación de `docs/student-experience/especificacion-vistas-descubrimiento.md` (en adelante, **la especificación de descubrimiento**), que ya está implementada. Todo lo que este documento no cambia sigue lo que dicen esa especificación y la especificación base, `especificacion-interfaz-inmersiva-estudiante.md`.

Guárdalo como `docs/student-experience/especificacion-panel-mochila-diario-pasaporte.md`. En `AGENTS.md`, agrega una línea que diga que, para las vistas que cubre, este documento prevalece sobre los anteriores.

Implementa el trabajo por fases (sección 10). Al cerrar cada fase, ejecuta `npm run build`, `npm run lint` y `npm test`, con el mismo criterio de línea base de fallos previos que se registró en `docs/student-experience/plan.md`.

---

## Acuerdos de implementación confirmados

El plan del usuario precisa este documento: se permite una selección explícita vacía de insignias; el diario añade título editable con el valor inicial de cada flujo; Todo/Fichas/Testimonios usa `kind=all|sheet|testimonial` en URL, conserva parámetros y admite flechas, Inicio/Fin e historial; la introducción del diario se muestra dentro de la página. Mochila y diario no abren ventanas automáticas, conservan ayuda manual y la señal del mapa. El siguiente paso del panel omite tipo y duración conforme a su prueba vigente.

## 1. Objetivo

El perfil, los planes, las investigaciones y el catálogo ya se ven como lugares del mundo. El panel del mapa, la mochila, el diario y el pasaporte todavía no: el panel es una lista clara de secciones, la mochila es una cuadrícula verde y beige que mezcla fichas y testimonios, el diario es una página clara con tarjetas planas y el pasaporte muestra las insignias como una lista de tarjetas. El objetivo es que las cuatro se sientan parte del mismo viaje:

- El **panel** es el **cuaderno de bitácora** que el estudiante lleva sobre el mapa: quién es, cuánto ha avanzado, qué misión le toca y a dónde puede ir.
- La **mochila** guarda **provisiones**: las fichas que aprendió y las voces de la ciudad que va descubriendo.
- El **diario** es el **cuaderno compartido con Lumi**: un lugar cálido para escribir, donde la amistad crece y Lumi va recuperando sus recuerdos.
- El **pasaporte** reúne los **sellos del viaje**: el título de viajero, el camino hacia el siguiente y las insignias obtenidas y por descubrir.

Igual que en la especificación de descubrimiento: **si una vista terminada se ve como una interfaz web estándar, no cumple esta especificación.**

### 1.1. Alcance

| Parte | Ubicación actual | Qué se hace |
| --- | --- | --- |
| Panel del mapa | `map/AdventurePanel.tsx` (y su versión en hoja inferior para celular) | Se restiliza y se reordena. Se conservan su lógica y sus datos |
| Mochila | `modules/StudentBackpackView.tsx`, dentro de Recursos | Se rediseña la presentación. Se conservan sus datos, desbloqueos, favoritos, buscador y visor de recursos |
| Diario | `modules/StudentJournalView.tsx` (inicio, editor, detalle e introducción) | Se rediseña la presentación. Se conservan sus escrituras y flujos. La amistad con Lumi cambia de regla (sección 7.2) |
| Pasaporte de logros | `/student/profile?section=passport`, hoy dentro de `ExplorationProfileView` | Se reemplaza por una vista nueva, `StudentPassportView`. Se conservan los datos de niveles e insignias (sección 8) |

### 1.2. Fuera de alcance

- El contenido de cada ficha y testimonio, y el visor que los abre.
- La lógica de desbloqueo de recursos (`TravelerResources.ts`) y de sugerencias de Lumi (`LumiSuggestions.ts`).
- La evolución de la señal (`StudentSignalsView`).
- Los textos definitivos de los recuerdos de Lumi (sección 7.4).

---

## 2. Reglas

### 2.0. Prioridad del diseño

**Este documento define cómo se verán estas cuatro partes.** Algunas ya existen en el prototipo con otro diseño: el panel, la mochila, el diario y el pasaporte. **Se reemplazan por lo que describe este documento.** Cuando la vista actual y este documento no coincidan en la presentación, la composición, los textos de pantalla o el orden de los elementos, **prevalece este documento**.

Lo que se conserva de lo existente es solo lo que este documento dice que se conserva: los datos, los cálculos, las escrituras de estado, los destinos de navegación y los textos que verifican las pruebas (sección 2.4). Nada de la presentación actual se mantiene "por si acaso": si un elemento visual actual no aparece en este documento, se retira, salvo que una prueba vigente lo exija, en cuyo caso se conserva con el nuevo estilo y se reporta.

### 2.1. Se heredan

Se mantienen las reglas de la sección 2 de la especificación de descubrimiento y de la especificación base: áreas prohibidas, archivos de datos y lógica que no se modifican, componentes nuevos solo en `src/features/student-experience/`, y detenerse a reportar si algo exige tocar un archivo prohibido.

En particular, **no modifiques** `src/features/occupation-exploration/lib/**` (incluidos `LumiFriendship.ts`, `TravelerResources.ts` y `LumiSuggestions.ts`), `types/**` ni `data/**`.

### 2.2. Excepción sobre Recursos

La especificación de descubrimiento dejó Recursos sin cambios. **Este documento sí cambia la presentación de la mochila** (sección 6). Lo que se conserva:

- La estructura del módulo Recursos y sus rutas.
- Las pestañas internas Todo, Fichas y Testimonios, con su mecanismo actual.
- El cálculo de recursos (`getTravelResources`), sus desbloqueos (`isTravelResourceUnlocked`, `resourceRequirement`), los favoritos y el visor que se abre al tocar un recurso.
- Las escrituras de estado, con las mismas transformaciones de hoy.

### 2.3. Sin claves nuevas

Estas cuatro partes no necesitan claves nuevas de localStorage. Usan los datos que ya existen, el estado de `ui-state.ts` para lo que solo es presentación y, para las insignias que se muestran en el perfil, un campo nuevo en `ov.student-discovery.v1` (sección 8.6).

### 2.4. Textos que verifican las pruebas

El panel conserva exactamente estos textos, porque las pruebas los buscan: "Siguiente paso", "Tu señal de hoy", "Ver evolución", "Accesos rápidos", "Actividades disponibles", "Ver más" (con su enlace actual a `/student/activities`), "Nivel de recorrido" y "Afinidad con la ciudad". El pasaporte conserva "Pasaporte vocacional", "Nivel {n} de 5", el título del nivel, los códigos "I1" a "I9" y "Pulsa una insignia para descubrir la historia que guarda". Si un texto de este documento choca con una prueba vigente, se conserva el texto de la prueba y se reporta.

---

## 3. Dirección visual

Se usan **los mismos tokens, patrones y reglas** de la sección 3 de la especificación de descubrimiento: escenario nocturno, pergamino, sello, casilla de colección, rastro y niebla, con los componentes que ya existen en `src/features/student-experience/discovery/` (`DiscoveryStage`, `Parchment`, `Seal`, `TrailBar`, `CollectionSlot`, `FavoriteButton`). No se crean componentes paralelos para lo mismo.

### 3.1. Ambientes nuevos

Agrega dos ambientes a los tokens de `student-experience.css` y a `DiscoveryStage`:

```css
.sx-root {
  --sx-amb-backpack: var(--success);  /* mochila: provisiones, el verde que ya la identifica */
  --sx-amb-journal: var(--warning);   /* diario: la luz de Lumi, una lámpara encendida */
}
```

`DiscoveryStage` acepta `ambient: 'backpack' | 'journal'` además de los actuales. En el diario, el brillo radial va **arriba a la izquierda**, como una lámpara; en las demás vistas sigue arriba a la derecha.

El pasaporte usa el ambiente `profile` que ya existe, porque es parte del perfil.

**Justificación.** La mochila conserva el verde que ya la identifica en la plataforma, ahora sobre el escenario nocturno común. El diario usa el dorado de Lumi porque es su espacio compartido con el estudiante.

### 3.2. Patrones nuevos

Agrega a `discovery.css`, con el prefijo `.sx-d-`:

| Patrón | Qué es | Dónde se usa |
| --- | --- | --- |
| **Compartimento** | Bandeja que agrupa objetos del mismo tipo: pergamino para lo que el estudiante ya tiene, `--sx-night-raised` para lo que aún está por descubrir. Lleva etiqueta, título, una línea de ayuda y su conteo | Mochila |
| **Objeto ilustrado** | Cabecera de tarjeta de 128 px con un dibujo simple hecho con CSS o SVG (una ficha enrollada, una silueta), sobre un brillo del color del objeto | Fichas y testimonios |
| **Carta** | Pergamino con un sello pequeño de 30 px que sobresale del borde superior derecho | Cartas de Lumi en el diario |
| **Página de cuaderno** | Pergamino con una línea de margen vertical de 2 px en `color-mix(in srgb, var(--accent) 35%, transparent)` y, en los campos de escritura, renglones tenues | Escritura y lectura del diario |
| **Hilo** | Línea vertical punteada en `--sx-gold` con un punto por elemento, agrupada por mes | Historial del diario |

### 3.3. Cuadrícula de iconos de acceso

Los accesos rápidos del panel usan un color por destino, el mismo ambiente que tiene ese lugar:

| Acceso | Color del ícono |
| --- | --- |
| Mi perfil | `--sx-amb-profile` |
| Mi diario | `--sx-amb-journal` mezclado al 80 % con `--foreground` |
| En familia | `--accent` |
| Recursos | `--sx-amb-backpack` |
| Investigaciones | `--sx-amb-research` |
| Información | `--sx-amb-atlas` |

---

## 4. Personajes y ayuda

Igual que en la especificación de descubrimiento: **no hay mensajes de personajes en pantalla**. Los textos que explican reglas pasan a la ayuda de la cabecera (`LumiOverlay`).

**Excepción del diario:** las preguntas de Lumi en las cartas y en las entradas sí se muestran, porque son el contenido del diario, no mensajes de guía. Van en cursiva, entre comillas y precedidas de "Lumi:".

Textos de ayuda para `guide-texts.ts`:

| Vista | Pasos |
| --- | --- |
| `resources` (mochila) | 1. "Esta es tu mochila. Aquí se guarda lo que reúnes en el camino." 2. "Las fichas aparecen cuando completas actividades. Puedes abrirlas también desde las actividades." 3. "Las voces de la ciudad son personas reales que cuentan su historia. Se descubren al atender los llamados de la Central de Casos." 4. "Marca con la estrella lo que quieras encontrar rápido." |
| `journal` | 1. "Este es nuestro cuaderno. Solo tú puedes leerlo: ni tu orientadora ni tu familia ven lo que escribes." 2. "Puedes contarme algo cuando quieras, o responder las cartas que te dejo después de cada actividad." 3. "Cada conversación hace crecer nuestra amistad, hasta tres por día. La amistad nunca se pierde, aunque pasen días sin escribir." 4. "Cuando nuestra amistad crece, recupero un recuerdo de mi viaje y te lo cuento." |

| `profile-general` con `section=passport` | 1. "Este es tu pasaporte. Cada sello cuenta una parte de tu viaje." 2. "Arriba ves tu título de viajero y qué te falta para el siguiente." 3. "Pulsa una insignia para ver qué lograste, cómo la descubriste y qué significa. Las que aún no tienes te dicen cómo encontrarlas." 4. "Puedes elegir hasta tres insignias para mostrar a tus compañeros." |

La ayuda del mapa no cambia.

---

## 5. Panel del mapa

**Archivo:** `map/AdventurePanel.tsx`. Se conservan su ancho de 288 px, su posición, el plegado (estado en `ui.panelCollapsed`), su hoja inferior en celular, sus cálculos y sus destinos. Cambia su aspecto y el orden visual de sus secciones.

### 5.1. Superficie

- Fondo `color-mix(in srgb, var(--sx-night) 92%, transparent)` con `backdrop-filter: blur(16px)`, borde de 1 px `--sx-night-border` sin el borde izquierdo, esquinas derechas de `--radius-xl` y sombra `--shadow-float`.
- Texto en `--sx-night-text` y secundario en `--sx-night-muted`.
- Relleno de 16 px y 14 px entre secciones. Las secciones se distinguen por sus superficies, no por líneas divisorias.
- La pestaña de plegado usa `--sx-night-raised` con el mismo borde.

**Por qué oscuro.** Sobre el mapa claro contrasta mejor y conecta con el escenario nocturno de los módulos y del reproductor.

### 5.2. Secciones, en orden

```
┌ Panel (288 px) ────────────────┐
│ ┌ Ficha del viajero ─────────┐ │  → Mi perfil
│ │ (AL) ¡Qué bueno verte!  >  │ │
│ │      Alex                  │ │
│ │ [NIVEL 01] Tu título…      │ │
│ │            Observador…     │ │
│ └────────────────────────────┘ │
│ (◔ 38 %)  [Ciudad]             │
│           Afinidad con la…     │
│           Crece con cada…      │
│ ┌ Siguiente paso (dorado) ───┐ │
│ │ (◎) Incendio forestal    > │ │
│ └────────────────────────────┘ │
│ ┌ Tu señal de hoy ──── 8 /10 ┐ │
│ │ ▮▮▮▮▮▮▮▮▯▯                  │ │
│ │ [Cambiar]   Ver evolución  │ │
│ └────────────────────────────┘ │
│ Accesos rápidos                │
│ [▣][▣][▣]                      │
│ [▣][▣][▣]                      │
│ Actividades disponibles   (2)  │
│ ◆ Incendio forestal            │
│ ◆ El molino                    │
│ Ver más                        │
└────────────────────────────────┘
```

**1. Ficha del viajero.** Una tarjeta `--sx-night-raised` con borde `--sx-night-border` y radio 18 px. **Toda la tarjeta es un enlace a `appPaths.student.profile`**, con `ChevronRight` a la derecha.

- Avatar de 46 px con "AL" en `--sx-parchment-ink` sobre `--sx-gold`, con anillo de 3 px `--sx-parchment`.
- "¡Qué bueno verte!" en 12 px y "Alex" en 17 px y peso 800.
- Debajo, el **mismo sello de nivel** de la ficha del perfil ("NIVEL" y el número con dos dígitos), con "Tu título de viajero" en 12 px `--sx-gold` y el título del nivel (`getTravelerLevel`) en 14 px y peso 800.

**2. Medallón de la zona.** El anillo de 92 px a la izquierda, con su trazo en `--sx-gold` sobre una pista `--sx-night-raised`, y el porcentaje al centro en 20 px y peso 800. A la derecha:

- Una etiqueta de zona en píldora: "Camino" con `MapPinned` sobre `--primary` al 18 %, o "Ciudad" con `Building2` sobre `--accent` al 18 %.
- La etiqueta actual del progreso ("Nivel de recorrido" o "Afinidad con la ciudad") en 14 px y peso 800.
- Una línea en 12 px que dice cómo crece: "Crece con cada misión del camino." o "Crece con cada llamado que atiendes.". Así un 0 % se lee como algo por llenar.

**3. Siguiente paso.** La tarjeta más llamativa del panel, porque es la acción recomendada: pergamino (`--sx-parchment`), borde de 2 px `--sx-gold` y sombra sólida de 5 px `--sx-gold-deep`.

- La diana (`Target`) en un círculo de 42 px `--sx-gold` que pulsa.
- "Siguiente paso" en 12 px `--sx-gold-deep`, el nombre del punto en 16 px y peso 800, y su subtítulo.
- `ChevronRight` a la derecha. **Toda la tarjeta** ejecuta la acción actual de "Ver misión" (enfoca el punto y abre su drawer).
- El aviso tras varios días sin ingresar, que hoy es un `InlineDialogue`, pasa a una línea dentro de la tarjeta, arriba del nombre, en 12 px: "¡Qué bueno verte de nuevo!". No es un globo de Lumi.

**4. Tu señal de hoy.** Tarjeta `--sx-night-raised`.

- Ícono `Compass` en `--sx-gold` y "Tu señal de hoy". A la derecha, el valor en 22 px y peso 800 seguido de "/10".
- Debajo, una barra de 10 segmentos de 8 px: los primeros N en `--sx-gold` y el resto en blanco al 14 %.
- Botón "Cambiar" (`--primary`, sombra sólida de 3 px) y el enlace "Ver evolución" con `TrendingUp` en `--sx-gold`.
- Sin check-in del día: la pregunta actual en 12 px, la barra vacía y el botón "Registrar mi señal". "Cambiar" y "Registrar mi señal" siguen abriendo `CheckInDialog` como hoy.

**5. Accesos rápidos.** El título "Accesos rápidos" y los enlaces actuales, **en el mismo orden**, como una cuadrícula de 3 × 2 de casillas de 76 px de alto:

- Cada casilla tiene un ícono de 18 px en un cuadrado de 34 px del color de su destino (sección 3.3) y el nombre en 11 px y peso 700, centrados.
- Fondo blanco al 6 %, borde blanco al 12 % y radio 14 px. Al pasar el cursor, se eleva 2 px.
- "En familia" bloqueado muestra un candado de 12 px en la esquina superior derecha de su casilla y, en el `title`, "Se abre al llegar a la ciudad". Conserva el texto secundario para lectores de pantalla.
- Se conserva el `<nav aria-label="Accesos rápidos">` y cada destino.

**6. Actividades disponibles.** El título "Actividades disponibles" con un contador en píldora `--accent`.

- Cada fila es una casilla con un rombo de 10 px del color de la zona (el recomendado pulsa), el título en 13 px y peso 700 y el subtítulo en 11 px.
- Se conserva el límite de filas y el enlace "Ver más" a `/student/activities`, en `--sx-gold`.
- Sin actividades: el texto actual en `--sx-night-muted`.

### 5.3. Panel plegado

Plegado, en lugar de desaparecer por completo, el panel deja una **tira** de 56 px de ancho, con la misma superficie:

- El avatar de 40 px (enlace al perfil).
- El porcentaje de la zona en 13 px.
- El círculo de la diana de 34 px, que pulsa y ejecuta "Ver misión".
- El botón de desplegar.

El área visible del mapa descuenta la tira (56 px más 16 px de margen) en lugar de los 288 px. La transición de plegado se conserva. En celular, la hoja inferior no tiene tira.

---

## 6. Mochila

**Archivo:** `modules/StudentBackpackView.tsx`. **Ambiente:** `backpack`. **Mecánicas:** CD3-03 (fichas como Booster), CD4-08 (colección de fichas y testimonios), CD6-04 (testimonios bloqueados con una referencia a su temática).

### 6.1. Composición

```
┌ Escenario nocturno, brillo verde arriba a la derecha ──────────────────────┐
│  Provisiones para tu aventura                  ┌ Compartimentos ────────┐  │
│  Tu mochila de viaje                           │ (mochila) Fichas  4/4  │  │
│  Cada paso deja una nueva pista…               │           ▓▓▓▓▓▓▓▓▓▓   │  │
│                                                │  Voces de la ciudad 0/2│  │
│                                                └────────────────────────┘  │
│  [Todo | Fichas | Testimonios]        [buscar…] [★ Mis favoritos]         │
│  ┌ Compartimento de fichas (pergamino) ────────────────────────────────┐   │
│  │ Lo que aprendiste en el camino                            4 fichas  │   │
│  │ [ficha][ficha][ficha][ficha]                                         │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│  ┌ Compartimento de testimonios (oscuro) ───────────────────────────────┐   │
│  │ Voces de la ciudad                                                   │   │
│  │ [voz bloqueada][voz bloqueada][más voces…]                           │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│  ★ Las estrellas son tuyas: guarda lo que quieras encontrar rápido…        │
└──────────────────────────────────────────────────────────────────────────────┘
```

Márgenes iguales a los de Investigaciones en la especificación de descubrimiento: 40 px de relleno en escritorio, 28 px entre bloques y 18 a 24 px entre tarjetas.

### 6.2. Encabezado

- Etiqueta "Provisiones para tu aventura" en `--sx-gold`, el título "Tu mochila de viaje" en 32 px y peso 800 y el texto "Cada paso deja una nueva pista. Reúne fichas y voces de la ciudad, y guarda las que quieras tener a mano cuando armes tus planes.".
- **Compartimentos**, a la derecha: una tarjeta `--sx-night-raised` con el ícono `Backpack` de 40 px dentro de un círculo de 84 px con borde `--sx-gold` al 45 %, girado −6°. A su lado, dos rastros: "Fichas · {desbloqueadas} de {total}" en `--sx-amb-backpack` y "Voces de la ciudad · {desbloqueadas} de {total}" en `--sx-gold`. Reemplazan los chips actuales "X de Y recursos desbloqueados" y "N por descubrir".

### 6.3. Controles

- Las pestañas Todo, Fichas y Testimonios, como píldoras sobre el escenario: la activa en pergamino con texto `--sx-parchment-ink`, las demás con texto `--sx-night-text`. Se conservan su mecanismo, sus parámetros de URL y su navegación por teclado.
- El buscador actual, con fondo blanco al 8 %, borde blanco al 14 % y el ícono `Search`. Sigue filtrando como hoy.
- El filtro de favoritos actual, como un botón "Mis favoritos" con estrella, borde de 2 px `--sx-gold` y relleno dorado cuando está activo.
- El selector "Todos los estados" se retira: con los compartimentos separados y los bloqueados diferenciados, no hace falta. Si alguna prueba vigente lo exige, consérvalo con el mismo estilo de los controles y repórtalo.

### 6.4. Compartimento de fichas

Pergamino de radio 26 px. Etiqueta "Compartimento de fichas", título "Lo que aprendiste en el camino", la línea "Puedes abrirlas también desde las actividades, cuando las necesites." y, a la derecha, el conteo. Cuadrícula de 4 columnas en escritorio, 2 por debajo de 1024 px y 1 por debajo de 640 px.

**Tarjeta de ficha:**

- Tarjeta blanca con borde de 2 px y sombra sólida de 5 px, ambos en `color-mix(in srgb, var(--sx-parchment-edge) 70%, var(--border))`. Se eleva 4 px al pasar el cursor.
- **Objeto ilustrado** de 128 px: la ficha dibujada como un pergamino de 74 × 88 px, girado −5°, con una franja superior del color de la ficha y su ícono actual (`resource.icon`) en lucide de 32 px. El color sale del ícono: `compass` en `--primary`, `scroll` en `--accent`, `book` en `--case-blue` y `sparkles` en `--success`.
- Arriba a la derecha, el `FavoriteButton` con estrella, con la lógica de favoritos actual.
- Arriba a la izquierda, la etiqueta "Nueva" en `--sx-gold` si el recurso aún no se abrió. Usa la misma información de "visto" que ya usa la plataforma para las novedades de recursos. Si no existe, omite la etiqueta.
- Debajo: el título en 16 px y peso 800, el resumen (`summary`) en 13 px, y "Obtenida en **{título de la actividad}**", con el título de la actividad de su requisito.
- Botón "Abrir ficha" a todo el ancho (`--sx-parchment-ink` con texto `--sx-parchment`), que abre el visor actual.
- **Ficha bloqueada** (si existe): la misma tarjeta con el objeto en niebla, el candado y el requisito de `resourceRequirement()`. No muestra el resumen.

### 6.5. Compartimento de testimonios: voces de la ciudad

Tarjeta `--sx-night-raised` de radio 26 px. Etiqueta "Compartimento de testimonios", título "Voces de la ciudad" y la línea "Personas reales que cuentan cómo llegaron a lo que hacen. Cada llamado que atiendes en la Central de Casos te acerca a una.". Cuadrícula de 3 columnas.

**Voz bloqueada:**

- Tarjeta con fondo blanco al 4 % y borde blanco al 14 %.
- Niebla de 120 px: una silueta (un círculo y dos barras) desenfocada que se desplaza lento, con un candado de 56 px con borde `--sx-gold` encima. **No muestra nombre, rol ni foto.**
- "Una voz por descubrir" en `--sx-gold`, el título del testimonio y su resumen como pista de la temática.
- Una caja `--accent` al 12 % con el requisito de `resourceRequirement()` (por ejemplo, "Se descubre al atender el llamado «Incendio forestal».").
- Si el caso es jugable, el botón "Ir a la Central de Casos" con borde `--sx-gold`, con el mismo destino que hoy. Si no, la casilla punteada "Este llamado llega pronto", sin acción.

**Voz descubierta:**

- La tarjeta pasa a pergamino con borde de 2 px `--sx-gold` y un brillo diagonal que la recorre cada 3.5 s.
- Avatar de 64 px con iniciales sobre `--accent` y anillo `--sx-gold`, el nombre (`author`) en 17 px y peso 800 y el rol en 13 px. A la derecha, el `FavoriteButton`.
- El título en 18 px y peso 800, y un fragmento del testimonio en una caja blanca con borde punteado, en cursiva y entre comillas. Si no hay un fragmento en los datos, usa el resumen.
- "Te la regaló el llamado **{caso}**".
- Botón dorado "Escuchar su historia" con `Play` y sombra sólida, que abre el visor actual.

**Casilla final:** una casilla punteada con `Sparkles`, "Más voces se suman a la ciudad" y "Con cada nuevo llamado aparecerán otras historias.". Solo aparece en la pestaña Todo o Testimonios, sin filtro de favoritos.

### 6.6. Estados vacíos y pie

- Con "Mis favoritos" activo y sin favoritos en un compartimento: "Aún no marcas {fichas | voces} como favoritas. Toca la estrella para guardarlas aquí.".
- Búsqueda sin resultados: el texto actual, en pergamino.
- Pie: estrella en `--sx-gold` y "Las estrellas son tuyas: guarda lo que quieras encontrar rápido cuando armes tus planes.".

---

## 7. Diario

**Archivo:** `modules/StudentJournalView.tsx`. **Ambiente:** `journal`. **Mecánicas:** CD2-08 (amistad con Lumi), CD4-01 (diario como espacio propio), CD7-04 (recuerdos de Lumi).

Se conservan todos sus flujos y escrituras: la conversación libre, las entradas desde una actividad o una conversación familiar (parámetros `activity`, `prompt`, `title`, `conversation`, `event` y `outcome`), las cartas sugeridas de `LumiSuggestions`, las etiquetas fijas y personales, la edición, el borrado, el registro de Lumi (`trackLumiEntries` y `lumiRegistrations`), la introducción (`JournalOnboarding`) y el buscador. Cambia la presentación de sus cuatro estados (inicio, editor, detalle e introducción) y la regla de la amistad.

### 7.1. Inicio: composición

```
┌ Escenario nocturno, lámpara arriba a la izquierda ─────────────────────────┐
│ (🔒 Solo tú puedes leer este espacio)                                      │
│ Mi diario                                                                  │
│ Cuéntale a tu compañera de viaje lo que vas descubriendo de ti.           │
│ ┌ Amistad con Lumi ─────┐ ┌ Página en blanco (pergamino dorado) ───────┐  │
│ │   (★ Lumi brillando)  │ │ Lumi, hoy quiero contarte…                 │  │
│ │ Conociéndonos         │ │ [Conversación libre]                       │  │
│ │ 9 conversaciones ▓▓▓░ │ └────────────────────────────────────────────┘  │
│ │ Recuerdos de Lumi 2/4 │  Cartas de Lumi por responder (3)              │
│ │ [✦ Recuerdo 1]        │  [carta][carta][carta]                          │
│ │ [✦ Recuerdo 2]        │ ┌ Tu cuaderno (pergamino) ──────────────────┐  │
│ │ [? Recuerdo 3]        │ │ Lo que le has contado a Lumi  [Línea|Tema]│  │
│ │ [? Recuerdo 4]        │ │ ┆ Setiembre                               │  │
│ └───────────────────────┘ │ ● entrada                                 │  │
│                           │ ● entrada                                 │  │
│                           └───────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────┘
```

Dos columnas en escritorio: la de amistad, de 340 a 380 px, y la principal. Por debajo de 1024 px, la amistad pasa arriba, a todo el ancho, con los recuerdos en una fila desplazable.

### 7.2. Amistad con Lumi: nueva regla

La regla actual de `LumiFriendship.ts` resta un punto por cada tres días sin escribir. Eso contradice el diseño: **la amistad con Lumi nunca disminuye**, porque un diseño basado en el temor a perder algo es contrario al propósito del programa (CD8 no se usa).

Como `lib/**` no se modifica, crea `src/features/student-experience/journal/lumiBond.ts` con una función pura que el diario usa en lugar de `getLumiFriendship`:

```ts
type LumiBond = {
  conversations: number        // conversaciones que cuentan, sin pérdida
  todayCounted: number         // las que contaron hoy
  remainingToday: number       // las que aún pueden contar hoy (máximo 3 por día)
  level: string
  levelIndex: number
  memoriesOpened: number
  nextMemoryAt?: number        // conversaciones necesarias para el siguiente recuerdo
  progress: number             // 0 a 100 hacia el siguiente recuerdo
}

function getLumiBond(registrations: LumiRegistration[], now = new Date()): LumiBond
```

- Recibe los mismos `lumiRegistrations` que hoy, normalizados con `normalizeLumiRegistrations`, y agrupa por día con `lumiDayKey` (ambos se importan, no se copian).
- Cada día cuenta **como máximo 3** conversaciones (`lumiFriendshipRules.dailyPointLimit`). **No hay pérdida por inactividad.**
- Las conversaciones solo crecen: editar o borrar una entrada no las reduce, porque el registro ya conserva las entradas borradas.
- Niveles por conversaciones acumuladas: "Conociéndonos" (0), "Ganando confianza" (5), "Compañeras de ruta" (10) y "Amistad de viaje" (15).
- Recuerdos: se abren a la 1.ª, 5.ª, 10.ª y 15.ª conversación. Los umbrales viven en el mismo archivo como constantes.
- `LumiFriendship.ts` y sus pruebas no se tocan. El diario ya no muestra "puntos de amistad" ni el texto sobre la pérdida.

### 7.3. Columna de amistad

Tarjeta `--sx-night-raised`, radio 26 px, relleno de 24 px.

- **Lumi:** la estrella actual de Lumi (el SVG que hoy usa el diario) en 96 px, dentro de un círculo de 128 px con un brillo dorado que respira cada 3 s.
- "Tu compañera de viaje" en `--sx-gold`, "Amistad con Lumi" en 22 px y peso 800, y el nivel en una píldora de pergamino.
- Rastro: "{n} conversaciones" a la izquierda y "Faltan {k} para el siguiente recuerdo" a la derecha, en `--sx-gold`. Debajo, en 12 px: "Hoy cuentan hasta 3 conversaciones. La amistad nunca se pierde.". Si ya contaron 3 hoy: "Hoy ya contaron tus 3 conversaciones. Puedes seguir escribiendo cuando quieras.".
- **Recuerdos de Lumi**, con su conteo "{abiertos} de {total}":
  - **Abierto:** una casilla de pergamino con `Sparkles` en un cuadrado `--sx-gold`, "Recuerdo {n}" y su título. Al tocarla, el recuerdo se abre debajo en un pergamino con el texto en cursiva y el botón "Guardar en mi memoria", que lo cierra.
  - **Recién abierto:** la casilla lleva la etiqueta "Nuevo" hasta que el estudiante lo lee. Para saberlo, agrega `seenLumiMemories: number[]` a `ui-state.ts`; es estado de presentación.
  - **Cerrado:** una casilla punteada con "?", "Recuerdo {n}", el texto "Un recuerdo guardado" desenfocado y, a la derecha, "Al llegar a {umbral} conversaciones".

### 7.4. Recuerdos de Lumi

Los textos viven en `journal/lumiMemories.ts`, como datos de presentación:

```ts
type LumiMemory = { threshold: number; title: string; text: string }
```

Los cuatro recuerdos cuentan, por partes, cómo Lumi llegó perdida a este mundo y fue recuperando su rumbo. El primero puede usar este texto provisional: título "Cómo llegué a este mundo", texto "Llegué aquí perdida, sin saber hacia dónde iba. Lo primero que aprendí fue que no hacía falta tener todo el mapa para dar el primer paso.". Los demás llevan textos entre corchetes hasta que se definan.

**Al abrirse un recuerdo** (cuando una conversación nueva alcanza un umbral), el inicio del diario muestra, sobre las cartas, una tarjeta `--sx-night-raised` con borde `--sx-gold`: la estrella que respira, "Lumi recordó algo nuevo" y "Tu amistad creció y se abrió un recuerdo. Búscalo junto a tu amistad con Lumi.". Desaparece al leer el recuerdo. También se agrega una novedad a la campana con el mismo título.

**Regla de privacidad:** los recuerdos dependen solo de **cuántas** conversaciones cuentan, nunca de lo que el estudiante escribe. Lumi no lee ni comenta el diario.

### 7.5. Página en blanco

Una página de cuaderno: pergamino con borde de 2 px `--sx-gold`, sombra sólida de 6 px `--sx-gold-deep` y la línea de margen.

- "Página en blanco" en `--sx-gold-deep`, "Lumi, hoy quiero contarte…" en 24 px y peso 800 y el texto actual sobre algo que pasó, una duda o una idea.
- El botón "Conversación libre" (`--sx-parchment-ink`, ícono `PenLine`) conserva su acción actual: abre el editor (sección 7.8).
- La primera vez, mientras no se haya visto la introducción, se muestra en su lugar la introducción (sección 7.10).

### 7.6. Cartas de Lumi por responder

Reemplaza a "Entradas sugeridas". Los datos y su desaparición al responder son los de hoy (`LumiSuggestions`).

- Título "Cartas de Lumi por responder" sobre el escenario, con el contador en píldora `--accent`, y la línea "Después de cada actividad, Lumi te deja una pregunta sobre lo que viviste.".
- Cuadrícula de 3 columnas de **cartas**: pergamino con borde de 2 px `--sx-parchment-edge` y un sello de 30 px en `--accent` con `Sparkles`, que sobresale del borde superior derecho.
- Cada carta: "Después de: {actividad}" en `--sx-gold-deep`, la pregunta en 15 px, peso 700, cursiva y entre comillas, las etiquetas fijas en píldoras `--primary-soft`, y el botón "Responder a Lumi", que abre el editor con la pregunta como hoy.
- Sin cartas: una casilla punteada con "Respondiste todas las cartas. Lumi te dejará otra al terminar tu próxima actividad.".

### 7.7. Tu cuaderno: lo que le has contado a Lumi

Pergamino de radio 26 px.

- Etiqueta "Tu cuaderno" y título "Lo que le has contado a Lumi". A la derecha, el selector "Línea de tiempo | Por tema" como dos botones en una bandeja `--sx-parchment-edge`; el activo en `--sx-parchment-ink`. Se conserva su mecanismo.
- El buscador actual, compacto, junto al selector.
- **Línea de tiempo:** el **hilo** a la izquierda, agrupado por mes ("Setiembre", "Agosto") en `--sx-gold-deep`. Cada entrada es una tarjeta blanca con un punto en el hilo: dorado para las respuestas a Lumi y `--accent` para las libres.
- **Por tema:** arriba, las etiquetas con su conteo como píldoras ("#dudas 3"). Tocar una filtra el cuaderno y la marca en `--primary`; tocarla otra vez quita el filtro.
- **Tarjeta de entrada:** la fecha, una etiqueta del origen ("Carta de Lumi" o "Libre", con el color de su punto), el título en 17 px y peso 800, la pregunta de Lumi en 13 px y cursiva si la hay, el texto recortado a dos líneas, las etiquetas y "Leer completa", que abre el detalle.
- Sin entradas: el estado vacío actual, en pergamino, con la estrella de Lumi.

### 7.8. Editor

Conserva todos sus campos y validaciones (título, texto, etiquetas fijas y personales, guardar y cancelar). Cambia su presentación:

- Escenario con ambiente `journal`. Arriba, "Volver al diario" y el título actual ("Cuéntale a Lumi" o "Editar lo que le contaste").
- Si viene de una carta o de una actividad, la pregunta en una caja blanca con borde punteado: "Lumi: “{pregunta}”".
- El formulario es una **página de cuaderno** de 760 px como máximo: la línea de margen, el título como campo sin borde en 22 px y peso 800, y el texto en un `textarea` con renglones tenues (`repeating-linear-gradient` en `--primary` al 8 %) y el marcador "Escribe con calma. Lo que pongas aquí solo lo lees tú.".
- Las etiquetas como píldoras `--primary-soft`, con su campo para agregar.
- Botones "Ahora no" (borde) y "Contarle a Lumi" (dorado con sombra sólida), que ejecutan cancelar y guardar como hoy.
- Debajo del botón de guardar, en 12 px: "Esta conversación suma a tu amistad con Lumi." o, si ya contaron 3 hoy, "Hoy ya contaron tus 3 conversaciones; esta igual se guarda.".

### 7.9. Detalle de una entrada

Se conservan sus acciones (editar, borrar con confirmación, volver). Cambia su presentación: una página de cuaderno con la fecha, el origen, la pregunta de Lumi si la hay, el título, el texto completo con interlineado de 1.7 y las etiquetas. Las acciones van al pie: "Editar" (borde) y "Borrar" (texto `--danger-text`).

### 7.10. Introducción

Se conservan sus pasos y su marca de vista (`journalOnboardingSeen`). Cada punto de la introducción es una casilla de colección sobre pergamino, con su ícono en `--sx-gold`. El botón final conserva su acción (escribir la primera entrada).

---

## 8. Pasaporte de logros

**Ruta:** `/student/profile?section=passport`. **Ambiente:** `profile`. **Mecánicas:** CD2-04 (insignias por hitos), CD2-05 (niveles), CD5-05 (insignias visibles en el perfil), CD6-01 (lo bloqueado visible).

### 8.1. Qué se reemplaza

- `ProfileRoute` (de la especificación de descubrimiento) renderiza `StudentPassportView` cuando `section=passport`, en lugar de `ExplorationProfilePage view="general"`.
- `ExplorationProfileView` y `AdventureAchievementsView` **no se borran ni se modifican**: solo dejan de usarse en esta ruta.
- "Ver mis logros" en la ficha del viajero y cualquier otro enlace al pasaporte siguen apuntando a `appPaths.student.passport`.
- No se agrega un acceso "Mi pasaporte" al panel.

### 8.2. Datos

- **Niveles:** `getTravelerLevel(adventure)` da el nivel actual (`number`, `label`, `description`, `nextStep`). Para dibujar el camino de títulos hacen falta los cinco nombres; cópialos de `getTravelerLevel` a una constante de presentación en `profile/passport.ts`, en el mismo orden, con un comentario que diga de dónde vienen.
- **Insignias:** `getAchievementGroups(adventure)` da los tres grupos, cada uno con `title`, `description`, `icon` e `items`. Cada insignia tiene `code`, `title`, `message`, `description` (cómo se obtiene), `metaphor`, `vocationalMeaning`, `icon` y `done`.
- **Total:** la suma de insignias de todos los grupos. La vista no supone que son nueve: si se agregan más, se muestran sin cambiar el código.

### 8.3. Composición

```
┌ Escenario nocturno, brillo violeta arriba a la derecha ────────────────────┐
│ < Mi perfil                                                                │
│ Pasaporte vocacional                                   (sello) 3 de 9      │
│ Cada sello cuenta una parte de tu viaje. Pulsa una insignia…               │
│ ┌ Tu nivel (oscuro) ────────────────────────────────────────────────────┐ │
│ │ [NIVEL 02]  Nivel 2 de 5 · tu título de viajero   ┌ Siguiente título ┐ │ │
│ │             Recolector de pistas                  │ (◎) Para ser…    │ │ │
│ │             Ya reconoces señales…                 └──────────────────┘ │ │
│ │  (✓)───(2)- - -(3)- - -(4)- - -(5)                                     │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
│ ┌ Grupo I · Descubrir mis propias pistas ─────────────────────── 2 de 3 ┐ │
│ │ [◉][◉][◌🔒] …                                                           │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│ ┌ Grupo II … ┐   ┌ Grupo III … ┐                                          │
└────────────────────────────────────────────────────────────────────────────┘
```

Márgenes iguales a los de las demás vistas: 40 px de relleno en escritorio, 28 px entre bloques y 20 px entre grupos.

### 8.4. Encabezado y nivel

**Encabezado.** El enlace "Mi perfil" con `ArrowLeft` (a `appPaths.student.profile`), el título "Pasaporte vocacional" en 32 px y peso 800, y el texto "Cada sello cuenta una parte de tu viaje. Pulsa una insignia para descubrir la historia que guarda.". A la derecha, una píldora con el ícono `Award` en `--sx-gold` y "{obtenidas} de {total} insignias".

**Tu nivel.** Tarjeta `--sx-night-raised`, radio 26 px y relleno de 28 px.

- El **sello de nivel** grande: 84 × 92 px, en `--primary` con borde de 3 px `--sx-parchment`, forma de escudo (esquinas inferiores más redondeadas) y sombra sólida de 6 px. Dentro, "NIVEL" en 12 px y el número con dos dígitos en 36 px y peso 800. Es el mismo sello del panel y de la ficha, en grande.
- "Nivel {n} de 5 · tu título de viajero" en `--sx-gold`, el título en 26 px y peso 800 y la descripción del nivel.
- **Siguiente título:** a la derecha, una tarjeta de pergamino con borde de 2 px `--sx-gold` y sombra sólida `--sx-gold-deep`, con la diana pulsando, "Para ser {título del siguiente nivel}" en `--sx-gold-deep` y el `nextStep` en 15 px y peso 800. En el último nivel dice "Llegaste al último título del viaje" y muestra el `nextStep` de ese nivel.
- **Camino de los títulos:** cinco paradas en una fila, unidas por un rastro punteado. Cada parada es un círculo de 60 px con su nombre debajo y su estado:
  - **Alcanzado:** relleno `--success` con check, y el tramo hasta la siguiente parada sólido en `--success`.
  - **Actual:** relleno `--primary`, anillo de 3 px `--sx-gold` con pulso, nombre en `--sx-gold` y el estado "Tu título actual".
  - **Siguiente:** relleno `--sx-night-raised`, anillo blanco al 25 %, estado "Siguiente".
  - **Más adelante:** igual que el siguiente, con el estado "Más adelante".
- Por debajo de 768 px, el camino se desplaza en horizontal dentro de su tarjeta, sin desbordar la página.

### 8.5. Grupos e insignias

Cada grupo es un pergamino de radio 24 px y relleno de 20 a 22 px, a todo el ancho:

- Etiqueta "Grupo {I, II, III}" en el color del grupo, el título en 20 px y peso 800, la descripción y, a la derecha, "{obtenidas} de {total}".
- Color de cada grupo, por su orden: `--primary`, `--accent` mezclado al 85 % con `--danger`, y `--sx-amb-research`.

**Cuadrícula de insignias:** `grid-template-columns: repeat(auto-fill, minmax(124px, 1fr))` con 12 px de separación. **Debe admitir muchas insignias**: en escritorio entran unas ocho por fila y un grupo con más simplemente suma filas.

**Insignia** (un `button`):

- Relleno de 12 × 8 px y radio 14 px. Se eleva 4 px al pasar el cursor.
- Sello de 52 px con ícono de lucide de 24 px.
  - **Obtenida:** fondo blanco, borde de 2 px `--sx-parchment-edge` y sombra sólida de 4 px; sello en el color del grupo con anillo `--sx-parchment` e ícono blanco.
  - **Por descubrir:** fondo `color-mix(in srgb, var(--sx-parchment) 80%, var(--muted))`, sin sombra; sello apagado (`--muted` con anillo `--border`), ícono en `--muted-foreground` y un candado de 20 px abajo a la derecha.
  - **Visible en el perfil:** un ojo de 20 px en `--sx-gold` arriba a la derecha del sello.
- Debajo, el código ("I1") en 10 px y peso 800, y el título en 12 px y peso 800, recortado a dos líneas.
- `aria-label`: "{título}, {obtenida | por descubrir}". Al tocarla, abre el detalle.

Los íconos se toman del campo `icon` de cada insignia, con la misma correspondencia que hoy usa `AdventureAchievementsView` (cópiala a `passport.ts`).

**Logros ocultos.** Si en el futuro una insignia se marca como oculta, mientras no se obtenga se muestra con "?" en lugar del ícono y del título, sin requisito. Una vez obtenida, se ve como las demás.

### 8.6. Detalle de la insignia

Un `Dialog` de la plataforma (`components/ui/Dialog`, importado sin modificarlo), centrado, de 440 px de ancho máximo, con el fondo oscurecido y desenfocado. Se cierra con su botón `X`, con Escape y tocando fuera, y devuelve el foco a la insignia que lo abrió.

- **Cabecera:** el sello de 112 px, "{código} · {grupo}", el título en 22 px y peso 800 y una etiqueta de estado ("Obtenida" en `--success-soft` o "Por descubrir").

**Si está obtenida** (pergamino con borde de 2 px `--sx-gold`):

- **Lo que lograste:** el `message`.
- **Cómo la descubriste:** en una caja blanca, la `description` y, si se conoce, "Obtenida el {fecha}". Si no se conoce la fecha, esa línea no aparece.
- **Qué significa:** en una caja `--sx-night-raised`, la `metaphor` en cursiva y entre comillas, y debajo el `vocationalMeaning`.
- **Mostrar en mi perfil:** un botón que alterna si la insignia se muestra a los compañeros. Como máximo tres; con tres elegidas, las demás muestran el botón deshabilitado y el texto "Ya muestras 3 insignias. Quita una para elegir esta.". Debajo, "Puedes mostrar hasta 3 insignias a tus compañeros ({n} de 3)." o "Tus compañeros la ven junto a tu nivel. Toca para quitarla.".

**Si está por descubrir** (fondo `--sx-night-raised`):

- **Cómo se descubre:** en una caja `--sx-gold` al 12 %, la `description`.
- **Qué significa:** en una caja punteada, un texto desenfocado decorativo y "Se revela cuando obtengas esta insignia.". El significado real **no** está en el HTML hasta que la insignia se obtiene.
- **Botón al lugar donde se consigue**, dorado: "Ir al camino" (I1 a I3), "Ir a mi Crew" (I4 y I5), "Ir a En familia" (I6), "Ir a la Central de Casos" (I7 e I9) e "Ir a Investigaciones" (I8), con los destinos actuales de cada lugar. La correspondencia vive en `passport.ts`.

**Estado nuevo.** Agrega a `ov.student-discovery.v1`:

```ts
profileBadges: string[]                 // códigos visibles en el perfil, máximo 3, en orden de elección
profileBadgesConfigured: boolean       // distingue el valor inicial de una selección explícita vacía
badgeFirstSeenAt: Record<string, string> // fecha ISO en que la vista vio la insignia obtenida por primera vez
```

- Antes de configurar (`profileBadgesConfigured=false`), se muestran las tres primeras obtenidas. Después se respeta la selección ordenada, incluida una lista vacía. La ficha y su enlace "Elegir qué muestro" pasan a usar este campo; el enlace navega al pasaporte, y deja de ser una acción pendiente.
- `badgeFirstSeenAt` se completa en `StudentShell` cuando una insignia aparece como obtenida y aún no tiene fecha. Las insignias que ya estaban obtenidas antes de este cambio reciben la fecha de ese primer momento; por eso el texto dice "Obtenida el" solo cuando la fecha existe, y es una aproximación aceptable para el prototipo.

---

## 9. Arquitectura

### 9.1. Archivos nuevos

```
src/features/student-experience/
  journal/
    lumiBond.ts            Regla de la amistad sin pérdida (sección 7.2)
    lumiMemories.ts        Textos de los recuerdos (sección 7.4)
    journal.css            Patrones del diario, con prefijo .sx-j-
  backpack/
    backpack.css           Patrones de la mochila, con prefijo .sx-b-
  profile/
    StudentPassportView.tsx  Pasaporte de logros (sección 8)
    PassportBadgeDialog.tsx  Detalle de una insignia
    passport.ts              Nombres de niveles, íconos y destinos por insignia
```

Si los patrones de la sección 3.2 sirven a más de una vista, van en `discovery.css` y no en estos archivos.

### 9.2. Archivos que se modifican

- `map/AdventurePanel.tsx` y sus estilos en `student-experience.css`.
- `modules/StudentBackpackView.tsx`: solo el marcado y las clases. La lógica se conserva. Deja de importar `resources.css` si ya no la necesita, pero **no borres** `resources.css`, que sigue en `occupation-exploration/`.
- `modules/StudentJournalView.tsx`: el marcado, las clases y el reemplazo de `getLumiFriendship` por `getLumiBond`.
- `discovery/DiscoveryStage.tsx`: los ambientes `backpack` y `journal`.
- `ui-state.ts`: `seenLumiMemories` (sección 7.3), con su validación.
- `overlays/unlocks.ts`: la novedad del recuerdo de Lumi.
- `guide-texts.ts`: los textos de la sección 4.
- Donde esté definido `ProfileRoute`: renderiza `StudentPassportView` con `section=passport`.
- `profile/StudentProfileView.tsx`: la ficha usa `profileBadges` y "Elegir qué muestro" navega al pasaporte.
- `discovery/discoveryStore.ts`: los campos `profileBadges` y `badgeFirstSeenAt`, con su validación y valores iniciales vacíos.
- `StudentShell.tsx`: el registro de `badgeFirstSeenAt`.

---

## 10. Fases de implementación

1. **Panel.** Superficie, secciones, accesos en cuadrícula, tira plegada y ajuste del área visible del mapa.
2. **Mochila.** Ambiente, encabezado con compartimentos, controles, tarjetas de fichas y de voces, estados vacíos y textos de ayuda.
3. **Diario.** `lumiBond.ts`, `lumiMemories.ts`, el inicio, el editor, el detalle, la introducción, la novedad del recuerdo y los textos de ayuda.
4. **Pasaporte.** `StudentPassportView`, `PassportBadgeDialog`, `passport.ts`, los campos nuevos del store, la ficha del viajero con las insignias elegidas y los textos de ayuda.
5. **Cierre.** Pruebas nuevas, revisión de accesibilidad y de movimiento reducido, y comprobación a 360 px.

---

## 11. Pruebas

Modifica solo las pruebas del estudiante. Al actualizar una expectativa, cambia solo la aserción que el cambio invalida y menciónala en el reporte de la fase. **No cambies** las pruebas de `LumiFriendship` en `tests/adventure-state.test.mjs`.

**Se actualizan:**

- Las del diario que esperan "puntos de amistad" o el texto sobre la pérdida pasan a esperar "conversaciones" y "La amistad nunca se pierde".
- Las del diario que esperan "Entradas sugeridas" pasan a esperar "Cartas de Lumi por responder".
- Las de la mochila que esperan los chips de recursos desbloqueados o el selector de estados pasan a esperar los compartimentos "Fichas" y "Voces de la ciudad".
- Las del panel que esperan su estructura de lista se ajustan a la cuadrícula, conservando los textos de la sección 2.4 y el número y orden de enlaces.
- "the passport lives inside the profile with five narrative levels and grouped badges" se mantiene: debe pasar con `StudentPassportView`. Si alguna de sus aserciones busca un texto de la vista anterior que este documento no conserva, cámbiala por el equivalente y repórtalo.

**Pruebas nuevas:**

- `getLumiBond` nunca resta conversaciones: con registros separados por 10 días, el total es la suma de lo que contó cada día.
- `getLumiBond` cuenta como máximo 3 conversaciones por día de Lima.
- `getLumiBond` abre recuerdos en 1, 5, 10 y 15 conversaciones, y `nextMemoryAt` y `progress` son correctos en los bordes.
- `/student/journal` contiene "Amistad con Lumi", "Recuerdos de Lumi", "Lumi, hoy quiero contarte" y "Lo que le has contado a Lumi", y no contiene "puntos de amistad" ni "baja 1 punto".
- `/student/resources` contiene "Tu mochila de viaje", "Lo que aprendiste en el camino" y "Voces de la ciudad". Una voz bloqueada no contiene el nombre de la persona.
- `/student/missions` contiene la ficha del viajero como enlace a `/student/profile`, los textos de la sección 2.4 y el sello de nivel.
- `/student/profile?section=passport` contiene "Pasaporte vocacional", "Nivel 1 de 5", "Observador del horizonte", "I1", "I9" y el siguiente título, y no contiene `role="dialog"` sin interacción.
- Una insignia por descubrir no incluye su `vocationalMeaning` en el HTML.
- Con tres códigos en `profileBadges`, el detalle de otra insignia obtenida muestra "Mostrar en mi perfil" deshabilitado.
- Con `profileBadges` vacío, la ficha del viajero muestra las tres primeras insignias obtenidas.
- Ninguna de estas vistas contiene hexadecimales en sus estilos en línea.

---

## 12. Criterios de aceptación

- [ ] El panel, la mochila, el diario y el pasaporte usan el escenario nocturno, los pergaminos, los rastros y los patrones de la especificación de descubrimiento, y no se ven como una interfaz web estándar.
- [ ] El panel muestra la ficha del viajero enlazada al perfil, el medallón de la zona con su línea de crecimiento, el siguiente paso destacado, la señal con su barra de 10 segmentos, los accesos en cuadrícula de colores y las actividades disponibles. Plegado, deja la tira.
- [ ] La mochila separa las fichas y las voces de la ciudad en compartimentos. Las voces bloqueadas no revelan a la persona y muestran su llamado.
- [ ] El diario muestra la amistad en conversaciones, sin pérdida, con los recuerdos de Lumi. Escribir una conversación que alcanza un umbral abre un recuerdo y muestra el aviso.
- [ ] Lumi no lee ni comenta el diario. Los recuerdos dependen solo del número de conversaciones.
- [ ] El pasaporte muestra el sello de nivel, el siguiente título con lo que falta, el camino de los cinco títulos y las insignias en cuadrículas compactas que admiten muchas. Al pulsar una insignia se abre su detalle en un diálogo.
- [ ] Una insignia obtenida muestra lo que se logró, cómo se descubrió y qué significa, y se puede elegir para el perfil (máximo tres). Una por descubrir muestra cómo conseguirla y oculta su significado.
- [ ] Las cuatro partes reemplazan a sus versiones anteriores: no queda ningún elemento visual antiguo que este documento no mencione.
- [ ] Todas las escrituras de datos son las de hoy, y `LumiFriendship.ts` no cambió.
- [ ] Con movimiento reducido no hay pulsos, brillos, niebla en movimiento ni respiración de Lumi.
- [ ] Nada se desborda horizontalmente a 360 px.

---

## 13. Pendientes

- Los textos definitivos de los recuerdos de Lumi y sus títulos.
- La etiqueta temática de cada ficha, si se agrega a los datos de recursos.
- Los fragmentos de cada testimonio, si se agregan a los datos.
- La marca de logros ocultos en los datos de insignias, si se decide agregarlos.
- La fecha real de obtención de cada insignia, si se agrega al estado de la aventura.
- Decidir si "Nivel de recorrido" pasa a llamarse "Recorrido" en el panel, para no confundirlo con el nivel del viajero. Hoy se conserva por las pruebas.
