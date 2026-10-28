# Ajuste catalogo-apoderado · Explorar opciones para apoderado y orientadora

## Contexto

El apoderado tiene hoy en «Explorar opciones» (`/parent/careers`) una guía estática (`ParentCareerGuideView`), y la orientadora no tiene catálogo. El texto de observaciones pide abrirles, solo en modo `api`, el mismo catálogo del estudiante (F06): pestañas, búsqueda, filtros, «Mostrar más» y los tres detalles. Debe ir en modo lectura (sin favoritos, planes, revelado, lugar inesperado, afines ni entrevistas, y sin eventos de vista) y con una variante visual clara de portal (boceto A10). No hay spec en curso: el plan se guarda como `ov_backend/docs/specs/ajuste-catalogo-apoderado.md`.

Rama: creo `ajuste/catalogo-apoderado` desde la punta actual y hago un push de prueba (`git push -u origin ajuste/catalogo-apoderado`) antes de la F1. Si el entorno lo rechaza, borro la rama local y trabajo en la rama asignada a la sesión (`claude/ecstatic-davinci-zrsycw`). Un commit por fase; los pushes posteriores solo si los pides.

## Qué cambia y por qué (hoy / pasará a)

**Backend**
- `app/services/catalogo.py · exigir_catalogo`: hoy exige la sección CATALOGO, que es de audiencia ESTUDIANTE (`datos/fijos.py · SECCIONES`), así que una cuenta APODERADO u ORIENTADORA recibe 404 en todo `GET /cuentas/{c}/catalogo/...`. Pasará a: para un rol distinto de ESTUDIANTE, la lectura del catálogo queda libre, sin regla de sección. Es la opción más simple: no toca datos ni el contrato.
- `catalogo.py · _ver` (`ver_carrera`, `ver_ocupacion`, `ver_institucion`): hoy registra el evento VISTA_*. Pasará a: si la cuenta no es ESTUDIANTE, responde una `RespuestaAccion` vacía (sin eventos ni desbloqueos y sin 4xx), como pide §4.
- El guardia de acceso no cambia: `GET /cuentas/{c}/catalogo/...` sigue exigiendo que `{c}` sea la cuenta del token (sin `politica_acceso`). Un apoderado que pide con el código de otra cuenta recibe 404, y una prueba lo cubre.
- `favoritos_de` sigue igual: para estos roles devuelve un conjunto vacío y `es_favorita` llega `false`. El front lo ignora.

**Frontend · datos**
- `store/servidor/sesion.ts · consultarCuenta`: hoy solo sirve a la cuenta ESTUDIANTE (`cuentaActiva`). Agrego `consultarCuentaSesion`, que usa la cuenta de la sesión con cualquier rol, y `store/servidor/catalogo.ts` la usa en listas, detalles y opciones. Para el estudiante el comportamiento no cambia.
- `store/servidor/cuenta.ts`: agrego `rolSesion()`.
- Nuevo hook `features/discovery/hooks/useModoCatalogo.ts`. Devuelve:
  - `modoLectura`: rol distinto de ESTUDIANTE.
  - `rol`.
  - `rutas`: las bases `catalog` y `career`/`occupation`/`institution`, iguales a las de hoy para el estudiante; para el apoderado van bajo `/parent/explorar/...` y para la orientadora bajo `/counselor/explorar/...`.
  - `catalogoEnPortal`: bandera de dominio, verdadera solo en api, para el menú.
- Con `modoLectura`, los hooks no piden lo que no se muestra:
  - `useCatalogoServidor` no carga `resultadoRiasec`.
  - `useColeccionIconos` no consulta la colección.
  - `usePlanesCarrera` llama a `usePlanesServidor(false)`.
  - `useCatalogVisit` no envía `verEnCatalogo`.

**Frontend · componentes** (`features/discovery/components/`; la condición es `modoLectura`, y la variante es la prop `variante: 'estudiante' | 'portal'`, que solo cambia clases)
- `CatalogoServidor`: con `variante`:
  - El kicker pasa a «Explorar opciones» y el subtítulo agrega la coletilla «La misma información que ve su hijo o hija» (apoderado) o «que ven sus estudiantes» (orientadora).
  - Se quitan el contador «Tu exploración», «Mis favoritos» y `UnexpectedPlace`.
- `FiltrosCatalogo`: con la prop `soloLetras`, sin el chip «Afines a mi resultado» y con la ayuda «Filtre por el tipo de interés de la carrera / profesión».
- `TarjetaCatalogo`: sin corazón. En profesiones, `IconoProfesion` va siempre revelado.
- `DetalleCarreraServidor`: sin favorito ni «Es tu Plan», sin `BloquePlanCarrera` ni `UnexpectedPlace`. `DondeEstudiarla` mantiene el orden del backend y no muestra la marca «Favorita».
- `DetalleOcupacionServidor`: sin favorito, con el ícono siempre visible y sin la etiqueta «Ícono revelado…». Tampoco lleva `EntrevistasOcupacion`, `UnexpectedPlace` ni la comparación con el resultado en `PerfilIntereses` (`resultado=null`).
- `DetalleInstitucionServidor`: sin favorito ni «Usarla en un presupuesto». `CarrerasDeInstitucion` no muestra «Tus favoritas van primero» ni la marca de favorita, y mantiene el orden del backend.
- Enlaces internos a `useModoCatalogo().rutas` en lugar de `appPaths.student.catalog`/`discoveryPaths`, en:
  - `TarjetaCatalogo`, `CarrerasParecidas`, `CarrerasDeInstitucion` y `DondeEstudiarla`;
  - `AtlasNavigation`, `CatalogNavigation` y `EsperaDetalle`;
  - las cabeceras de carrera y los enlaces de profesión y carrera de los detalles.
- `DiscoveryStage`: con la prop `variante`, agrega `data-variante="portal"`.
- Nuevo `features/discovery/styles/catalogo-portal.css`, con todo acotado a `[data-variante='portal']`:
  - fondo claro, tarjetas blancas con borde `#e5e7eb` y acento `#3f4b9c`;
  - pestañas como control segmentado claro y cabeceras de detalle claras;
  - mismo layout y espaciado.

**Frontend · rutas y portales**
- `routes/paths.ts`: `parent.explorar` y `counselor.explorar`, con `catalog`, `career`, `occupation` e `institution`.
- `routes/AppRoutes.tsx`: bajo `/parent` y `/counselor` van `explorar/{professions,careers,institutions}` y sus `/:id`, con `SegunModo`. En local redirigen: el apoderado a `careers` y la orientadora a `home`.
- `/parent/careers` pasa a `SegunModo`: en api, `Navigate` a `explorar/careers`; en local, la guía de siempre.
- Vistas nuevas:
  - `pages/parent/ParentExplorarView.tsx` (listado) y `ParentExplorarDetalleView.tsx` (detalle por clase).
  - `pages/counselor/CounselorExplorarView.tsx` y `CounselorExplorarDetalleView.tsx`.
  - Las cuatro montan los componentes con `variante="portal"`.
- `ParentPortalModule`: con `catalogoEnPortal` (api), «Explorar opciones» apunta directo a `/parent/explorar/careers`; en local sigue en `/parent/careers`. La redirección de `/parent/careers` queda solo para enlaces viejos. `getParentRouteState` reconoce `/explorar`.
- `CounselorPortalModule`: entrada «Explorar opciones» (`Compass`) solo si `catalogoEnPortal`, y la etiqueta `explorar` en `getView`/`labels`.

## Qué no cambia
- El catálogo del estudiante (marcado, textos, eventos, favoritos, planes), en api y en local. El modo local de los portales queda congelado.
- Endpoints, esquemas y contrato: no hay fixtures nuevos.
- El motor y los logros ocultos de exploración, que siguen siendo solo del estudiante.
- El modelo de datos y `datos/` (`fijos.py` y `ruta.py`).

## Modelo de datos
Sin cambios.

## Backend · pruebas
`tests/integration/catalogo/test_catalogo.py`, con casos nuevos:
- APODERADO y ORIENTADORA listan y abren los detalles (200).
- `POST /acciones/ver-carrera` con esas cuentas responde 200 sin eventos registrados.
- El estudiante con CATALOGO cerrada sigue recibiendo 409.
- Un apoderado que pide `GET /cuentas/<otra cuenta>/catalogo/carreras` con su token recibe 404.

## Frontend · pruebas
`tests/servidor/catalogo/servidor-catalogo-portal.test.mjs`. Para el apoderado y la orientadora:
- Se monta el listado y el detalle con la sesión del rol.
- No se pide `/favoritos`, `/planes`, `/coleccion`, `/resultado` ni `/inesperada`.
- No se envía `/acciones/ver-*`.
- Las profesiones no tienen candado y no aparecen «Mis favoritos» ni «Afines a mi resultado».
- Los enlaces van bajo `/parent/explorar` (o `/counselor/explorar`).

Las pruebas actuales del catálogo no se adaptan.

## Fases
1. **F1 · Backend**: lectura libre y vistas ignoradas para roles no estudiante, más sus pruebas. Corre `tests/integration/catalogo` y `escenarios`.
2. **F2 · Front, modo lectura y rutas**: `consultarCuentaSesion`, `useModoCatalogo`, retiradas, enlaces, rutas, vistas y menús, más la prueba nueva. Corre `tests/servidor/catalogo`, `familia`, `planes`, `perfil`, `instrumentos` y `logros`, `tests/local/portales` y `test:servidor`.
3. **F3 · Variante visual**: `catalogo-portal.css` y el control segmentado, revisados contra el boceto con capturas en api. La revisión confirma que siguen visibles:
   - en el detalle de carrera, la pestaña de ingresos por institución;
   - en el detalle de institución, «Página web» e «Ir a su página web»;
   - los cargadores de F06 en el listado, en «Mostrar más» y en los detalles.
4. **Cierre**: suite completa de ambos repos; `decisiones.md`; los documentos `integracion.md` (acceso al catálogo por rol), `ov_frontend/AGENTS.md` (línea del catálogo del portal) y `origen-de-datos.md`, si corresponde.

## Decisiones a anotar
- Catálogo libre para roles no estudiante, sin tocar la audiencia de la sección.
- Vista ignorada por rol, con respuesta vacía.
- `/parent/careers` redirige en api.
- Entrada de menú de la orientadora solo en api.
- Rutas en inglés, como las del estudiante (`explorar/careers`).

## Verificación
- Pruebas de las fases, ejecutadas con el subagente `pruebas`.
- Con el backend y el front levantados en api, ingresar como apoderado y como orientadora, recorrer las tres pestañas y los tres detalles y comparar con el boceto A10.
