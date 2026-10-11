# Orientación Explora · frontend

Interfaz en React, TypeScript y Vite de una plataforma de orientación vocacional. El estudiante recorre el Camino y la Ciudad, conversa con Mara y consulta sus intereses, mochila y pasaporte; también hay portales de apoderado y orientadora.

## Ejecutar

```powershell
npm ci
npm run dev
```

El acceso es de demostración: acepta un usuario y contraseña de prueba y permite elegir un perfil.

### Con el backend

Por defecto (`VITE_DATOS=local`) el front funciona solo, con datos y cálculos de demostración. Para usar el servidor, crea `.env.local` a partir de [.env.example](.env.example):

```dotenv
VITE_DATOS=api
VITE_API_URL=/api
```

Levanta `ov_backend` (ver su README) en `http://127.0.0.1:8000` y reinicia Vite. El proxy de desarrollo envía `/api` al backend; en producción, el entorno que sirva `dist` debe resolver `/api`. Ingresa con `est-ana` o `est-luis`. En desarrollo, el menú del estudiante permite reiniciar los datos de prueba.

## Verificar

```powershell
npm run build
npm run lint
npm test
npm run check:estructura
```

Pruebas por grupo: `npm run test:local`, `npm run test:servidor`, `npm run test:despliegue`, o una carpeta con `node --test "tests/servidor/instrumentos/**/*.test.mjs"`.

## Documentación

- [AGENTS.md](AGENTS.md): estructura, reglas, dónde va cada cosa y tabla de impacto de pruebas.
- [docs/origen-de-datos.md](docs/origen-de-datos.md): qué viene del servidor y qué es local.
- [docs/contenidos-actividades.md](docs/contenidos-actividades.md): formato de los JSON de actividades.
- [docs/pendientes-interfaz.md](docs/pendientes-interfaz.md): datos sin vista que esperan decisión.
- [docs/historico/](docs/historico/): specs de vistas, planes e informes de trabajos terminados.
