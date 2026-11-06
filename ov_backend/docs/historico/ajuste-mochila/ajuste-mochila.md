# Ajuste · mochila

## Contexto

Rediseño de Recursos del estudiante («Tu mochila de viaje») y del modal de ficha compartido, según el texto de observaciones `ajuste-mochila.md` (bocetos «Mochila de viaje · rediseño»). No hay spec en curso: este plan se guarda como `ov_backend/docs/specs/ajuste-mochila.md`. Rama `ajuste/mochila` (ya creada). Igual que en `ajuste-pasaporte-perfil`, hay una sola implementación para `local` y `api`. En local se usan los datos actuales y lo que no existe se omite con la regla de respaldo de cada punto.

Decisiones tomadas con el usuario al planificar:
1. **«Nueva» = sin evento `VISTA_FICHA`**, con el mismo patrón que `VISTA_TESTIMONIO`. `Desbloqueo.visto` sigue significando «ya te avisamos» (toast) y no se toca. El evento lo registra el modal compartido, así que la ficha cuenta como abierta venga de donde venga.
2. **Columna `ficha.descripcion`** (nullable), junto con `tema`.
3. **Se mantienen las listas.** M es la cantidad de elementos de `GET /fichas` y de `GET /testimonios`, que ya traen todos los de la audiencia, también los bloqueados y los de misiones opcionales. La forma del contrato no cambia y no se agrega `total`.

## Qué cambia (hoy → pasará a)

### Backend
- **Modelo** (`app/models/contenido.py` `Ficha`, `app/models/enums.py`): hoy `ficha` tiene `codigo, titulo, contenido, audiencia`. Pasará a tener además `tema` (str corto, nullable) y `descripcion` (Text, nullable). `TipoEvento` suma `VISTA_FICHA`. Se aplica `/cambio-modelo` con una migración autogenerada y revisada.
- **`GET /cuentas/{c}/fichas`** (`app/api/fichas.py`, `app/services/fichas.py` `listar_fichas_cuenta`): hoy devuelve `list[ContenidoEstado]` con `codigo, titulo, estado`, armado por `estado_contenido` (`services/comun.py`). Pasará a devolver `list[FichaCuenta]`, un esquema nuevo en `app/schemas/fichas.py`. Las batallas siguen con `ContenidoEstado` (`services/batallas.py` `_estado_ficha`).
  - Siempre: `codigo, titulo, estado`.
  - Solo si está DISPONIBLE (null si no): `tema`, `descripcion`, `contenido` (markdown, completo en la lista; aceptado para el alcance actual), `obtenida_en` (`Desbloqueo.fecha_hora`), `visto` **por ficha** (existe un evento `VISTA_FICHA` de la cuenta con `id_referencia = ficha.id`), `actividad` (`{codigo, titulo}`) y `tramo` (`{codigo, nombre, numero}`).
  - La lista trae solo las fichas de la audiencia de la cuenta. Para el estudiante, M = 3 (`t-ficha`, `t-ficha-2` y `t-ficha-3`, sin `t-ficha-apo`). No hay otras fichas de estudiante: las preguntas de `t-batalla` usan `t-ficha` y `t-ficha-2`.
  - `actividad` sale de la regla del desbloqueo obtenido: la primera condición `COMPLETA_ACTIVIDAD`. Es null si no hay ninguna.
  - `tramo` es el bloque de esa actividad solo si su espacio es `MISIONES_CAMPO`; si no, null. Para el número se reutiliza el patrón de `services/avance.py`, con `numero = bloque.numero`.
  - Las lecturas van agrupadas (desbloqueos y eventos de la cuenta en una consulta cada uno), sin consultas en bucle. `test_presupuesto_fichas` debe seguir en verde.
- **`POST /acciones/ver-ficha`** (`app/api/acciones.py`, servicio en `services/fichas.py`): es nuevo y copia `ver_testimonio` (`services/testimonios.py:52-61`). Cuerpo `{cuenta, ficha}`. Registra `VISTA_FICHA` con `id_referencia = ficha.id` una sola vez (si ya existe, no lo repite). Responde 409 si la ficha está bloqueada y 404 si no existe o es de otra audiencia, con la misma respuesta que `ver-testimonio`.
- **`GET /cuentas/{c}/testimonios`** (`services/testimonios.py` `listar_testimonios_cuenta`): suma `caso_disponible: bool`, calculado con `objetivo_disponible(sesion, cuenta, ACTIVIDAD, caso.id)` (`services/motor/reglas.py:88`) sobre el caso que da `caso_del_testimonio`. Es false si el testimonio no tiene caso. Se calcula con el contexto ya cargado, sin consultas por testimonio.
- **Texto «no repite el título»:** las fichas de `ruta` se escriben sin un encabezado con su propio título.

### Datos (`datos/ruta.py`, todo `DATO DE PRUEBA`)
- `FICHAS` pasa a tener la forma `(codigo, titulo, descripcion, tema, contenido, audiencia)`, con contenido markdown corto: `###`, lista, cita y enlace, sin repetir el título.
  - `t-ficha` y `t-ficha-2` siguen saliendo de `t-inicio` (T0).
  - Se suma `t-ficha-3`, que da `t-opcional` (T1, misión opcional).
  - `t-ficha-apo` sigue igual, con tema.
- Testimonios (en el recorrido final, 1 abierto, 1 bloqueado con su caso disponible y 2 de un caso todavía cerrado):
  - `t-testimonio-1`: `SUPERA_CASO t-caso ×1`. Sin cambios.
  - `t-testimonio-2`: `SUPERA_CASO t-caso ×2`. Al final del recorrido sigue bloqueado aunque `t-caso` esté disponible. Se le agrega `pista`. Atarlo a un caso distinto, disponible y no superado, exigiría un segundo caso nuevo además de `t-caso-2`, porque `t-caso` es hoy el único CASO de la semilla. Por eso queda ×2, y se anota en `decisiones.md` que su tarjeta apunta a un caso ya superado una vez.
  - `t-testimonio-3` y `t-testimonio-4`: `SUPERA_CASO t-caso-2`. Es un CASO nuevo de la Ciudad, `AL_DESBLOQUEAR`, que se abre con `t-proyecto` (no se alcanza en el recorrido). Lleva su configuración de caso mínima y, en el front, un `t_caso_2.json` mínimo como los demás `t_*`.
- `fijos.py`: sin cambios.
- Se regeneran los fixtures del front (`scripts/exportar_fixtures_front.py`). `fichas-inicial` y `fichas-final` cambian de forma. Se suma `ver-ficha`, la ficha abierta antes de `fichas-final`, para que haya una vista y otra nueva.

### Frontend
- **Contrato:** en `types/servidor.ts` entran `FichaCuenta` y `TestimonioEstado.caso_disponible`. En `services/api/acciones.ts`, `verFicha`. En `store/servidor`, la sección `fichas` pasa a tipo `FichaCuenta[]` y suma la acción `verFicha`, que después vuelve a pedir `fichas`. `fichaDisponible` (`lib/servidor/adaptadores.ts:141`) sigue funcionando con `estado`.
- **Modal de ficha (componente compartido):** hoy `VisorRecurso` presenta fichas y testimonios con un badge, «Leí la ficha» y `modo` mochila/repaso. Pasará a haber un **`FichaModal`** nuevo en `features/backpack/components/`, con el hook `useFichaModal`, para toda ficha.
  - **Dónde se monta:** en `VisorRecursoHost`, que cubre el reproductor, la batalla, los chips de repaso y el cierre «Nuevo en tu mochila», y en la mochila.
  - **Tamaño y estructura:** ancho máximo 820 px y alto máximo 90 vh. Cabecera fija, cuerpo con scroll propio y pie fijo; pantalla completa por debajo de 640 px.
  - **Cabecera:** chip de tema y «La encontraste en **{actividad}** · Tramo N · {t} min de lectura». El nombre es enlace **solo cuando el modal se abre desde la mochila**: va al drawer en el mapa (`missions?punto=` o `exploration?punto=`, con el id de punto de `puntosServidor`). Desde `VisorRecursoHost` (reproductor, batalla, chips de repaso, cierre de actividad) va como texto plano, porque estando dentro de una actividad no se navega a otra. Se resuelve con una prop `enlazarActividad` que solo pasa la mochila. «Tramo N» se omite sin tramo y el enlace, sin actividad. Debajo, el `h2` y la X.
  - **Cuerpo:** se renderiza con `ResourceText` ampliado (`components/student/ResourceText.tsx`, ver abajo). Mientras carga, el `Skeleton` de shadcn.
  - **Pie:** el botón de favoritos (`aria-pressed`) y «Las favoritas aparecen primero cuando armes tus planes.».
  - **Al abrirse:** en api llama a `verFicha`. En local agrega el id a `adventure.visits` («Nueva») y a `journey.readResourceIds`. Así se conserva lo que hacía «Leí la ficha», que las recompensas de desafío de `lib/challenges.ts` leen.
  - **Contenido:** en api sale del servidor; en local, del catálogo como hoy (`recursoDeFicha`).
  - **`modo`:** el `modo` `'repaso'` deja de distinguir nada en el modal. `abrirRecurso` conserva la firma y el parámetro deja de usarse.
- **`VisorRecurso` queda solo para testimonios** (el pop up de testimonio no cambia). Se le quitan las ramas de ficha («Leí la ficha»).
- **`ResourceText`:** hoy maneja párrafos, `##`→h3, tablas y `**negrita**`. Pasará a manejar además `###`→h3, listas `- `/`1. `, `> ` cita y `[texto](url)` como enlace (`target=_blank rel=noopener`). Sigue sin HTML crudo y **sin dependencias nuevas**. Los estilos de lectura (columna de 640 px, 15 px / 1.65, `#2b3441`, cita con borde dorado) van en `backpack.css`.
- **Lib pura** en `features/backpack/lib/`:
  - `tiempoLectura`: `max(1, round(palabras/200))`.
  - `colorTema`: hash del tema sobre una paleta fija de 6 colores con contraste ≥ 4.5:1.
  - `agruparFichas`: agrupa por tramo, luego «Ciudad» (con actividad y sin tramo) y al final «Otras fichas» (sin actividad). Dentro de cada grupo, por `obtenida_en` descendente. Si ninguna ficha tiene tramo, devuelve un solo grupo sin rótulo.
- **Vista de la mochila** (`pages/student/StudentBackpackView.tsx` y `features/backpack/*`). Se divide en componentes para respetar 300 líneas por archivo.
  - **Cabecera:** `BackpackHeader`, compacta, con el subtítulo del texto §1. La tarjeta «Compartimentos» tiene fondo noche y medallón con la mochila. Lleva dos filas con barra: «Fichas · n nuevas» y «Voces de la ciudad», cada una con «x de M». Sin el rótulo «Compartimentos».
  - **Barra de herramientas:** `BarraMochila`, que sale de la vista.
    - Pestañas «Fichas» / «Voces de la ciudad». Se conserva el tablist con teclado y los `id`.
    - Buscador con label oculto y placeholder por pestaña. Busca en título, descripción y tema (fichas) o en persona, ocupación y título (voces).
    - «Solo favoritos» es un filtro con `aria-pressed`.
    - En estado vacío, el buscador y el filtro quedan deshabilitados.
    - **Sin resultados** (hay elementos, pero la búsqueda o «Solo favoritos» no encuentra ninguno; es distinto del estado vacío): «Ninguna ficha coincide con tu búsqueda» o «Ninguna voz coincide con tu búsqueda», con el botón «Limpiar filtros» (reutiliza `clear`). Reemplaza los textos de vacío por filtros de hoy.
  - **Compartimento de fichas:**
    - Encabezado según §3.1.
    - Solo se muestran fichas obtenidas, en grupos con separador «Tramo N · {nombre}».
    - `TarjetaFicha`, según §3.3: la tarjeta entera es un enlace y la estrella es un `button` con `stopPropagation`. Lleva miniatura, título y descripción con clamp, y el pie «De la misión **…**» con «Nueva».
    - `CierreFichas`: «Más adelante», con M − n.
    - `MochilaVacia`: §3.6, con «Ir al mapa».
    - Desaparecen las tarjetas bloqueadas, «Ver requisito», «Abrir ficha» y «Obtenida en el camino».
    - `?ficha=` de una ficha bloqueada sigue abriendo `RequisitoRecurso`, igual que el enlace con candado del drawer, que no cambia.
  - **Compartimento de voces:**
    - Encabezado según §4.1, con «x de M voces».
    - `TarjetaTestimonio` ajustada según §4.2: «Nueva» si `!visto` (api) o si el id no está en las visitas (local).
    - `VozPorDescubrir` ajustada según §4.3: solo si `caso_disponible`. En local se usa la `playable` actual. Pulsar la tarjeta abre `RequisitoRecurso`; «Ir a la Central →» va a `exploration?punto=<caso>` sin pasar por el pop up.
    - `CierreVoces`: §4.4, con k.
    - Vacío: §4.5, con el botón deshabilitado si la sección CIUDAD está cerrada.
    - Desaparece «Misión disponible próximamente».
  - **`useBackpack`:** suma `favoritesOnly` como filtro, los campos de búsqueda nuevos, los grupos, los totales, `nuevas`, la lista de voces filtrada por caso disponible y k. Se conservan `?kind=` y `?ficha=`.
  - **`travelerResources`:** `TravelResource` suma `tema`, `actividad`, `tramo`, `obtenidaEn` y `nueva`, mapeados desde `FichaCuenta`. En local se usan `requirement.activityId` y `resumen`/`descripcion`.

## Qué no cambia
- `Desbloqueo.visto`, `POST /desbloqueos/marcar-vistos`, los toasts del mapa y `useNoveltyQueue`.
- El motor de desbloqueos, `objetivo_disponible` y las reglas existentes, salvo las nuevas o cambiadas de la semilla.
- El pop up de testimonio (`VisorRecurso` en su rama de testimonio) y `RequisitoRecurso`.
- El cierre de actividad y `FinishBackpackSection`. Sus fichas ya abren el modal global, que ahora es `FichaModal`.
- El drawer del mapa («Se alimenta de», con `?ficha=`).
- Los favoritos: de fichas en `adventure.bookmarks` y de testimonios en local, como hoy.
- Las batallas siguen con `ContenidoEstado`.
- Los tokens `--sx-gold`, `--sx-parchment` y `--sx-night`.
- Las claves de `localStorage`.

## Pruebas
- **Back, nuevas:**
  - En `tests/integration/fichas`: tema, descripción, contenido, actividad y tramo de una ficha obtenida (incluida la de `t-opcional`); campos nulos en una bloqueada; `ver-ficha` registra un solo evento y deja `visto`, **y abrir una ficha no apaga `visto` en las demás**; 409 si está bloqueada; presupuesto.
  - En `tests/integration/testimonios`: `caso_disponible`.
- **Back, adaptadas** (el texto pide fichas y testimonios nuevos en la semilla y regenerar fixtures): contrato (`test_consultas_dominio`, `test_exportar_fixtures_front` con el esquema `FichaCuenta`, los códigos de fichas y el fixture `ver-ficha`) y `tests/integration/datos` si cuenta fichas o testimonios.
- **Front, adaptadas por marcado o textos, sin casos nuevos en `tests/local`:**
  - `tests/local/aventura/adventure-rendering` («Testimonios», «Mis favoritos», «Bloqueado»).
  - `servidor-recursos`: sin modo repaso diferenciado y sin bloqueadas en la lista.
  - `servidor-flujo` («Leí la ficha» → abrir el modal).
  - `servidor-testimonios`: las aserciones sobre `muestraMasVoces`, «Más voces se suman a la ciudad» y la expresión literal del visor.
  - `servidor-secciones`.
- **Front, nuevas en `tests/servidor/`:** `tiempoLectura`, `colorTema`, `agruparFichas`, `ResourceText` ampliado, `FichaModal` (estructura, sin «Leí la ficha», llama a `verFicha`, con enlace a la actividad solo desde la mochila) y la mochila con fixtures (grupos, cierre, vacío, **sin resultados con «Limpiar filtros»**, voces con caso disponible y cierre de voces).

## Fases
El orden cambia respecto del texto: primero el backend, porque el modal en api necesita `contenido` y `ver-ficha`.

1. **Backend:** modelo (`tema`, `descripcion`, `VISTA_FICHA`) y migración, `FichaCuenta`, `ver-ficha`, `caso_disponible`, semilla, fixtures y pruebas. Se corren las carpetas de impacto, contrato y escenarios.
2. **Modal de ficha:** contrato del front, `FichaModal`, `ResourceText` ampliado, `VisorRecurso` solo para testimonios y sus usos en el host y la mochila. Pruebas: `test:servidor`, `tests/local/actividades` y `tests/local/aventura`.
3. **Front · fichas:** cabecera, Compartimentos, barra, grupos, tarjeta, cierre y vacío.
4. **Front · voces:** tarjetas, filtro por caso disponible, cierre y vacío.
5. **Cierre:**
   - Suite completa de los dos repos.
   - `decisiones.md`: las 3 decisiones de arriba; el orden de fases; `t-testimonio-2 ×2` y por qué; que en modo local abrir el modal marca la ficha como leída (`journey.readResourceIds`) en lugar de «Leí la ficha»; que `contenido` viaja completo en `GET /fichas` (aceptado para el alcance actual); que `modo` ya no tiene efecto, y que el enlace a la actividad sale solo desde la mochila.
   - `docs/sistema/integracion.md` (fichas, testimonios, `ver-ficha`, conjunto `ruta`, fixtures) y `motor.md` (`VISTA_FICHA`).
   - `ov_frontend/docs/origen-de-datos.md` (contenido de ficha desde el servidor) y la lista de excepciones de `ov_frontend/AGENTS.md`: la línea de la mochila se reemplaza por este ajuste.
   - `pendientes-interfaz.md`, si surge algo.

Un commit por fase: `Ajuste mochila · F<n>: …`.

## Verificación
- Las suites por fase con el subagente `pruebas`. Al final, `uv run pytest -n auto -q`, `npm test`, `npm run build`, `npm run lint` y `npm run check:estructura`.
- `uv run alembic heads` debe dar un solo head.
- Prueba manual opcional con el backend y `VITE_DATOS=api`:
  - Completar `t-inicio`: la mochila muestra «Tramo 1 · …» con 2 fichas «Nueva», «2 nuevas», «2 de 3» y la tarjeta «Más adelante».
  - Al abrir una ficha desaparece «Nueva».
  - El modal hace scroll solo en el cuerpo.

## Fase 6 · Favoritos de fichas y testimonios y fondo del modal

Pedido del usuario tras la prueba manual, aprobado como cambio de modelo:

- `TipoFavorito` suma FICHA y TESTIMONIO, y `TipoEventoUso` suma MARCA_FAVORITO_FICHA y MARCA_FAVORITO_TESTIMONIO, con la ficha o el testimonio como referencia (migración 0031).
- `marcar-favorito` y `desmarcar-favorito` aceptan esos tipos:
  - no exigen la sección CATALOGO;
  - exigen que el recurso sea de la audiencia de la cuenta (404 si no) y esté desbloqueado (409 si no);
  - al marcar registran su propio evento, no MARCA_FAVORITO.
- `GET fichas` y `GET testimonios` suman `es_favorita`. `GET favoritos` y la referencia FAVORITOS siguen siendo solo del catálogo.
- Front:
  - en api, las estrellas de las tarjetas, del modal de ficha y del pop up de testimonio leen y escriben en el servidor;
  - en local, siguen en `adventure.bookmarks`.
- Mientras corre el POST de un favorito, la estrella (tarjetas, modal de ficha y pop up de testimonio) muestra un cargador (`aria-busy`) y cambia solo cuando el servidor confirma (pedido del usuario).
- El modal de ficha define sus propios tokens de color, porque se dibuja fuera de `.sx-root` y su fondo quedaba transparente.
