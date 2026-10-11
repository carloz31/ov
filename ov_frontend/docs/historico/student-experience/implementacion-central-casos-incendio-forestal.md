# Central de casos: Incendio forestal

## Alcance y acuerdos — 6 de octubre de 2026

Se implementa el plan solicitado por el usuario y su corrección posterior, basada en `Especificación rediseño de la Central de casos (Incendio forestal) (1).md` y las dos imágenes de referencia. La versión actualizada se conserva en `especificacion-central-casos-incendio-forestal.md` como referencia de textos y presentación. Esta corrección sustituye los acuerdos iniciales sobre lista en Escuchar y asignación sin arrastre. El prototipo enlazado no pudo consultarse; la revisión usa la especificación, las imágenes suministradas y las ilustraciones del repositorio. Trabajo local, sin despliegue ni dependencias nuevas. Se preservan los cambios locales anteriores y no se accede a los portales protegidos ni a su prueba prohibida.

Incendio forestal es el único caso jugable. Se conservan las tres fases, problemas, contribuciones y consecuencias. El recorrido usa introducción → Escuchar → problemas → Revisar → Resultado; conserva la introducción general y su transición a la primera fase. Las pistas escuchadas, equipos y pasos visitados viven únicamente durante el intento. Se permite regresar a pasos visitados y corregir equipos; confirmar exige completar todos los problemas.

Las pistas son botones sobre la imagen, con coordenadas compartidas. Escuchar exige abrirlas una por una; no ofrece lista ni acción para marcarlas todas. La escena cubre la ventana conservando la proporción de la ilustración y se recorre con eventos de puntero, captura y límites equivalentes al mapa. Un movimiento de más de 6 px evita abrir una pista al soltar. Tab desplaza la escena para mostrar el punto enfocado. La ayuda de Lumi se abre automáticamente solo al primer ingreso a Escuchar de cada fase; después se abre mediante el botón «?». Ese estado se reinicia con el intento. El repaso completo sigue disponible desde cada problema.

El fondo de la fase permanece visible en toda la pantalla. En escritorio el encabezado tiene una sola fila, la columna izquierda mide 400 px y el panel derecho 500 px, con una zona central libre. Los paneles del problema son oscuros y translúcidos, y el velo se concentra en los bordes. La lista de contactos tiene dos columnas; su hoja de vida sustituye la lista dentro del mismo panel, con regreso mediante «Contactos» o Escape. En móvil el problema, las píldoras del equipo, el directorio y el pie caben en una pantalla; solo las listas tienen desplazamiento propio. La hoja de vida usa una hoja inferior con acción fija.

El contacto se asigna arrastrándolo al equipo en escritorio, mediante + en cualquier pantalla o con «Agregar al equipo» desde su hoja de vida. Se usan eventos de puntero, como el mapa, sin librerías nuevas. La zona del equipo muestra el destino y un contacto flotante acompaña el movimiento. En móvil no se activa el arrastre de contactos. Cada asignación cuesta un punto, incluso al repetir un contacto en otro problema; quitarlo devuelve un punto. El límite es 16 y sigue vigente el agotamiento entre fases. Los botones principales móviles tienen espacio reservado. El encabezado específico no cambia los usos del encabezado compartido anterior.

`SHOW_EXTRA_PROFESSIONAL = false` oculta la pregunta, nube y sección adicional. Su código permanece en `ForestFireExtraScreens.tsx` y en el cierre. La hoja de vida lee exclusivamente `OccupationDetail`; el enlace completo abre otra pestaña y la ficha ausente muestra «Ficha en preparación».

## Puntaje, recompensas y migración

El máximo se calcula desde las contribuciones esperadas: actualmente 14. El mínimo es 10. Se elimina el bono y la presentación de presupuesto óptimo. Al entrar al cierre se registra el mejor puntaje, aunque el intento no supere el mínimo. La superación entrega los íconos de las ocupaciones correctamente asignadas, deduplicados por `occupationId`, y habilita el testimonio existente. Se mantienen los perfiles ya explorados; el cierre muestra únicamente los íconos nuevos de ese intento. Una repetición conserva superación y recompensas y puede aumentar el mejor puntaje o añadir íconos. Abandonar o terminar por agotamiento no registra puntaje.

Migración aprobada: `forestFireScoringVersion = 2` en aventura y `forestFireIconsVersion = 2` en exploración. Una carga antigua retira la superación sin puntaje y vuelve a bloquear el testimonio, y reinicia los íconos de las 15 ocupaciones del caso. Se conservan favoritos, visitas y los demás datos. Los marcadores se escriben en las claves locales existentes y evitan repetir la migración. Los perfiles nuevos de estas ocupaciones empiezan pendientes de desbloqueo. Si localStorage falla, los estados funcionan en memoria y se conservan los indicadores de error existentes; no se puede garantizar persistencia entre recargas con almacenamiento bloqueado.

Ambos drawers (mapa del estudiante y `CityMapView`) usan Disponible / En progreso / Superado, mejor puntaje, máximo y mínimo. Un cierre con cero puntos se distingue de un caso sin intento terminado. Por solicitud directa del usuario, la X usa el formulario visual del resto de actividades: escudo, panel oscuro, «¿Quieres volver al mapa?», «Seguir en la actividad» y «Volver al mapa». Durante el intento avisa «Este intento no se guardará. Tendrás que empezar el caso de nuevo.»; al estar en el cierre informa que el resultado ya está guardado. Se conserva Escape, foco atrapado y retorno a la X. No se promete guardado de un intento abandonado ni agotado.

## Fichas pendientes

Los siguientes 13 perfiles tienen `contentStatus: 'pending'`. Se muestran los marcadores «por completar desde O*NET»; no se generan conocimientos, habilidades, códigos, afinidad ni relaciones educativas. Los campos requeridos son vacíos o neutros y las puntuaciones RIASEC quedan ocultas hasta completar el contenido.

| ID                       | Ocupación                |
| ------------------------ | ------------------------ |
| `firefighter`            | Bombero                  |
| `meteorologist`          | Meteorólogo              |
| `municipal-police`       | Policía municipal        |
| `medical-specialist`     | Médico especialista      |
| `veterinarian`           | Veterinario              |
| `biologist`              | Biólogo                  |
| `environmental-engineer` | Ingeniero medioambiental |
| `civil-engineer`         | Ingeniero civil          |
| `machinery-operator`     | Operador de maquinaria   |
| `social-worker`          | Trabajador social        |
| `psychologist`           | Psicólogo                |
| `logistics-coordinator`  | Coordinador logístico    |
| `journalist`             | Periodista               |

En el repositorio ya existían psicólogo y coordinador logístico en el catálogo adicional. Se registran como pendientes mediante la entrada base y se evita duplicar sus IDs al combinar catálogos: son 11 altas y 2 entradas existentes sustituidas por los marcadores aprobados. El archivo de catálogo adicional se conserva. Paramédico y fotógrafo mantienen sus fichas existentes.

## Posiciones finales

Porcentajes x/y respecto a la ilustración original, con proporción 3:2. Se mantienen las posiciones propuestas tras la revisión visual. La escena se desplaza internamente por los ejes que exceden la ventana: horizontal en móvil y vertical en el escritorio revisado. Los puntos se mueven con la imagen. El tamaño usa las dimensiones naturales de la ilustración, y la página no desborda.

| Fase           | Pista                 | x, y   | Resumen                                        |
| -------------- | --------------------- | ------ | ---------------------------------------------- |
| Emergencia     | `changing-fire`       | 44, 30 | el fuego cambia de dirección                   |
| Emergencia     | `traffic-chaos`       | 78, 56 | caos en la salida del pueblo                   |
| Emergencia     | `grandmother-at-risk` | 52, 70 | una abuela no puede salir sola                 |
| Emergencia     | `outside-support`     | 24, 76 | afuera nadie sabe lo que pasa                  |
| Estabilización | `minor-injuries`      | 50, 68 | Personas con heridas leves y tos               |
| Estabilización | `serious-burn`        | 72, 70 | Una quemadura necesita atención especializada  |
| Estabilización | `lost-home-and-dog`   | 82, 79 | Una familia sin casa y perro herido            |
| Estabilización | `missing-donations`   | 38, 55 | Falta comunicar las necesidades de ayuda       |
| Recuperación   | `damaged-ecosystem`   | 73, 72 | El bosque y sus animales necesitan seguimiento |
| Recuperación   | `unstable-soil`       | 63, 39 | La ladera podría deslizarse con las lluvias    |
| Recuperación   | `damaged-bridge`      | 51, 66 | El puente y los caminos están dañados          |
| Recuperación   | `forgotten-story`     | 87, 57 | Fuera del pueblo olvidaron el incendio         |

## Campos antiguos y usos encontrados

`ForestFireProfessional.description` y `skills` permanecen requeridos en `types/ForestFireCaseTypes.ts` y con sus valores anteriores en los 15 registros de `data/ForestFireCaseData.ts`. La búsqueda en exploración ocupacional y experiencia del estudiante no encuentra consumidores de `professional.description` ni `professional.skills`. Su antigua presentación en `ForestFireProfessionalPanel` se reemplaza por los campos de `OccupationDetail`. Las habilidades de catálogo conservan su uso propio y no son el campo antiguo del caso. Los nombres e identidades de contactos continúan en directorio, equipos y resultados; el contenido profesional procede del catálogo.

## Validación

- Build aprobado (`tsc -b` y Vite). Advertencia existente por tamaño del bundle; sin errores.
- Lint de los archivos intervenidos aprobado, sin avisos. `git diff --check` aprobado.
- 71 pruebas autorizadas aprobadas, 0 fallidas: `forest-fire-case`, `adventure-state`, `deployment-assets`, `student-progress-challenges` y `student-reflection-pilot`. La suite del caso contiene 21 pruebas. No se ejecuta `npm test` porque incluye suites prohibidas.
- Cobertura: bloqueo y navegación, revisión, reinicio limpio, asignaciones repetidas, límite y devolución a cero, agotamiento sin guardado, cierre con 9/10/14 puntos, mejor puntaje monotónico, recompensas únicas, reintentos, migración de una sola vez, fichas pendientes/ausentes y enlace en otra pestaña, y estados de ambos drawers incluyendo cero puntos.
- La primera implementación se comprobó a 360×800 y 1440×900, incluidas las tres fases, cierre real de 14 puntos, íconos nuevos, testimonio y persistencia del drawer tras recarga. La corrección se comprueba a 1280×800, 375×667 y 360×667: fondo completo, límites de escena, arrastre sobre punto sin abrir pista, apertura individual, ausencia de lista en Escuchar, ayuda recordada al regresar, Tab hacia un punto inicialmente fuera de vista, arrastre de contacto con descuento de presupuesto, +, hoja de vida dentro del panel, Escape y retorno al directorio, hoja inferior móvil y repaso desde el problema. El documento conserva la altura y anchura de la ventana; solo se desplazan contactos/equipo. La salida reproduce el formulario de actividades con aviso de descarte.
- Las cuatro pruebas nuevas cubren geometría de cobertura y límites, umbral de arrastre/foco, pistas individuales y ayuda, asignación mediante arrastre/+/hoja de vida con presupuesto cero, y formulario de salida según resultado guardado o intento descartable.
- Diálogos con Radix: Escape, atrapamiento y retorno del foco comprobados. Botones principales, puntos y controles del caso tienen áreas de al menos 44 px. Se reserva espacio para las acciones móviles fijas.
- Movimiento reducido: CSS desactiva pulsos, transiciones y partículas del caso y sus diálogos; la introducción omite la escritura animada al detectar la preferencia. Verificado en código; el navegador disponible no ofrece emulación de esa preferencia.

Queda pendiente completar el contenido de las 13 fichas desde fuentes reales y, si se dispone del prototipo, cotejar sus detalles visuales. La implementación local no depende de esos datos pendientes.
