# Decisiones de la spec en curso

## Ajuste catalogo-apoderado

- El apoderado y la orientadora leen el catálogo sin la sección CATALOGO (`exigir_catalogo` retorna para un rol distinto de ESTUDIANTE). No se tocó la audiencia de la sección: abrirla a otros roles habría metido reglas y presentaciones del estudiante en sus portales.
- Las acciones `ver-carrera`, `ver-ocupacion` y `ver-institucion` de un rol no estudiante responden 200 sin eventos ni desbloqueos (la exploración se mide solo en el estudiante).
- Se adaptó `test_catalogo_cerrado_responde_409_en_cada_ruta`: su última línea esperaba 404 del catálogo para `apo-rosa`, lo contrario de lo que pide la spec. Lo cubre la prueba nueva por rol. El 404 sobre la cuenta de otro (guardia del token) tiene su propia prueba.
- Front: `consultarCuentaSesion` (store/servidor/sesion.ts) pide el catálogo con la cuenta de la sesión, de cualquier rol. La ocupación de la Central y el lugar inesperado siguen con `consultarCuenta` (solo estudiante).
- `useModoCatalogo` (features/discovery) decide el modo lectura y las rutas por el rol de la sesión. No hay contexto ni props nuevas para los enlaces: así `TarjetaCatalogo`, `DondeEstudiarla` y los demás funcionan igual en ambos portales.
- Una sola vista de ruta por portal (`ParentExplorarView`, `CounselorExplorarView`) para el listado y el detalle (`:codigo`), que monta `CatalogoPortal`, en lugar de dos vistas por portal.
- Las subrutas van en `routes/SubrutasExplorar.tsx` (como `SubrutasFamilia`), para que `AppRoutes.tsx` no pase de 300 líneas.
- En modo lectura, la ayuda «Filtre por el tipo de interés…» se oculta cuando ya hay letras elegidas, porque entonces se muestra «Código: …».
