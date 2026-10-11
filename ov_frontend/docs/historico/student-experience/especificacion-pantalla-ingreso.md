# Especificación: rediseño de la pantalla de ingreso

Oct 6, 2026 · @Carlos Sanchez

Esta especificación rediseña la pantalla de ingreso común para estudiantes, familias y orientadores. El diseño de referencia está en la página Acceso del prototipo [Progreso y retroalimentación](https://claude.ai/artifact/1vusmJWnPqmSMCffqVvJeE), con una vista de escritorio y una móvil.

## Contexto y alcance

- **Archivos:** `src/features/access/LoginScreen.tsx` y `src/features/access/access.css`.
- **Solo cambia la interfaz.** Se mantienen la firma `LoginScreen({ onEnter })`, los estados `username`, `password` y `visible`, la regla de envío (si ambos campos tienen valor, se llama a `onEnter()`), el título del documento «Ingresar | Orientación vocacional», y los `id`, `name`, `type`, `autoComplete` y `required` de los campos. No se tocan `DemoAccessGate.tsx`, `demoAccess.ts` ni las rutas.
- **Se elimina** de la pantalla actual: la brújula con órbitas, el sendero SVG con los tres puntos «Descubre», «Acompaña» y «Orienta», el kicker «Cada paso cuenta», el texto «Tu futuro se construye en compañía», la frase «Un mismo acceso para descubrir, acompañar y orientar» y el pie «Orientación vocacional · Un futuro con posibilidades». Las clases CSS que dejen de usarse se borran.
- **Sin imágenes de fondo.** El fondo es un degradado de color con formas decorativas en SVG.
- **Tono neutro para los tres roles.** La pantalla no habla solo al estudiante ni usa a Lumi como protagonista. Trato de tú.

## Fondo, presentación y textos

### Fondo

Tres capas, de atrás hacia adelante, que ocupan toda la pantalla (`min-height: 100dvh`):

1. **Degradado:** `linear-gradient(135deg, #2F5E52 0%, #3E7A62 35%, #6E9C6A 60%, #C9A869 85%, #E6C98A 100%)`.
2. **SVG decorativo** (`aria-hidden`, `preserveAspectRatio="xMidYMid slice"`, `viewBox="0 0 1440 900"`): un círculo dorado #F2C66D al 18 % de opacidad (centro 1180, 180; radio 260), un círculo verde oscuro #1E3F38 al 35 % (centro 260, 820; radio 320), un sendero punteado `M120 760C320 700 360 560 560 540S860 640 1040 520 1260 300 1380 260` con trazo #FFF4C8 de 3 px, `stroke-dasharray: 2 14`, al 55 %, y tres puntos #FFE29A sobre él (560, 540; 1040, 520; 1380, 260).
3. **Velo para legibilidad:** en escritorio, `linear-gradient(90deg, rgba(14,18,26,.82) 0%, rgba(14,18,26,.55) 45%, rgba(14,18,26,.15) 70%, transparent 100%)`; en móvil, `linear-gradient(180deg, rgba(14,18,26,.7) 0%, rgba(14,18,26,.35) 40%, rgba(14,18,26,.1) 100%)`.

### Presentación (escritorio: columna izquierda de 600 px, a 80 px del borde)

- **Marca**, arriba: cuadro de 44 px #3F51B5 con el ícono de brújula, «ORIENTACIÓN» (11 px, espaciado .16em, #C9CEDC) sobre «Explora» (20 px, 700), y una estrella dorada de 18 px (#FFD666 con un brillo suave) como símbolo. Es la misma marca del encabezado del mapa.
- **Mensaje**, al centro: título «Orientación vocacional para estudiantes, familias y orientadores.» (44 px, 800, #F4F5F8, máximo 540 px de ancho) y la línea «Cada uno tiene su propio espacio para acompañar el mismo camino.» (18 px, #DDE0E8).
- **Roles**, abajo: tres píldoras «Estudiantes», «Familias» y «Orientadores» (fondo `rgba(16,19,28,.6)`, borde `rgba(255,255,255,.2)`, 14 px) con íconos dorados #FFE29A de persona, grupo y birrete. Son informativas, no botones.

## Formulario

Tarjeta clara (fondo `rgba(250,250,252,.98)`, radio 24 px, sombra `0 24px 60px rgba(0,0,0,.3)`). En escritorio mide 440 px de ancho, a 96 px del borde derecho y centrada en vertical; padding de 36 px a los lados.

**Contenido, en orden:**

1. Título `<h1 id="ov-login-title">` «Ingresa a la plataforma» (28 px, 800, #1F2433). La sección conserva `aria-labelledby`.
2. Ayuda «Ingresa con el usuario y la contraseña de tu cuenta.» (16 px, #4A5068).
3. **Usuario:** `<label>` «Usuario» (15 px, 600) y el campo con placeholder «Tu usuario».
4. **Contraseña:** `<label>` «Contraseña» y el campo con placeholder «Tu contraseña» y el botón para mostrarla u ocultarla dentro del campo, a la derecha, de 44 × 44 px, con el ícono de ojo o de ojo tachado y los mismos `aria-label`, `aria-pressed` y `aria-controls` de hoy.
5. Botón «Ingresar» con flecha, de ancho completo y 54 px de alto. Activo (#3F51B5, texto blanco) cuando ambos campos tienen valor. Mientras falte alguno, se ve atenuado (#C5CAE0, texto #4A5068); sigue siendo un `type="submit"`, de modo que el navegador marque los campos `required` si se pulsa.
6. Aviso de demostración en recuadro ámbar (fondo #FFF8E6, borde #F1D48A, texto #5A3B00, 14 px, ícono de información): «**Acceso de demostración.** Puedes usar cualquier usuario y contraseña.»
7. Pie centrado (14 px, #5B6275): «¿No tienes tu usuario o lo olvidaste? Comunícate con tu colegio.» Es texto, no un enlace.

**Campos:** 52 px de alto, radio 12 px, borde 1,5 px #C9CED9, fondo blanco, texto 16 px (evita el zoom automático en iOS). Al enfocarse, borde 2 px #3F51B5. Se quitan los íconos internos de usuario y candado del diseño actual: la etiqueta ya dice qué es cada campo.

**Al enviar:** el comportamiento es el actual. Si la navegación tarda, el botón puede mostrar «Ingresando…» y deshabilitarse para evitar dobles envíos; no agrega validaciones nuevas.

## Diseño móvil sin desplazamiento

Por debajo de 900 px de ancho, la pantalla pasa a una sola columna que entra completa en la altura de la pantalla, sin desplazamiento.

- **Contenedor:** `height: 100dvh` (con `100vh` como respaldo), `display: flex; flex-direction: column; overflow-y: auto`.
- **Presentación arriba** (padding 22 px 20 px 12 px, separación 10 px): la marca en tamaño reducido (cuadro de 40 px, «Explora» a 18 px, estrella de 16 px), el título a 21 px, la línea secundaria a 14 px y las tres píldoras de rol a 13 px, sin íconos.
- **Tarjeta abajo:** `margin: auto 14px 16px` para anclarla al pie, padding 22 px 18 px 18 px, separación 14 px; título a 22 px; separación entre campos de 12 px; botón de 52 px; aviso de demostración y pie a 13 px.
- **Se mantienen** los campos en 52 px de alto y el botón de mostrar la contraseña en 44 × 44 px.

**Pantallas bajas.**

- Si la altura es menor a 700 px (por ejemplo, 375 × 667), se ocultan la línea secundaria y las píldoras de rol.
- Si es menor a 580 px, también se oculta el título de la presentación y queda solo la marca.
- La regla de no desplazamiento vale con el teclado cerrado. Al abrirse el teclado, la página sí puede desplazarse para que el campo enfocado quede visible: no se debe bloquear con overflow: hidden en ese caso (usar overflow-y: auto en el contenedor).

**Escritorio.** Entre 900 y 1200 px de ancho, la columna de presentación se reduce y el título baja a 36 px. La tarjeta mantiene 440 px.

## Accesibilidad y criterios de aceptación

**Accesibilidad**

- Contraste mínimo 4.5:1 en todos los textos: el velo garantiza el del texto blanco sobre el degradado, también en la zona dorada.
- Foco visible en campos y botones.
- El SVG decorativo y los íconos de las píldoras llevan `aria-hidden`.
- Con `prefers-reduced-motion` no hay animaciones (esta pantalla no tiene ninguna obligatoria).

**Criterios de aceptación**

- [ ] Con usuario y contraseña llenos, «Ingresar» llama a `onEnter()`; con alguno vacío, no.
- [ ] Los campos conservan `id`, `name`, `autoComplete` y `required`, y el botón de mostrar contraseña funciona como hoy.
- [ ] No se usa ninguna imagen de fondo; el fondo es el degradado con el SVG decorativo.
- [ ] Los textos son neutros para los tres roles: no aparecen «tu colegio te entregó», «pídelo a la orientadora» ni a Lumi como personaje.
- [ ] Se eliminaron la brújula con órbitas, los puntos «Descubre / Acompaña / Orienta» y los textos retirados.
- [ ] En 390 × 844 y en 375 × 667, con el teclado cerrado, toda la pantalla se ve sin desplazamiento.
- [ ] En escritorio, la presentación queda a la izquierda y la tarjeta a la derecha, centrada en vertical.
- [ ] El aviso de acceso de demostración sigue visible.
