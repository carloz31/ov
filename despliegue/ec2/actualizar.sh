#!/usr/bin/env bash
# Trae lo último de la rama deploy, sincroniza dependencias, respalda la base, migra y reinicia.
# Uso:
#   sudo bash /opt/ov/despliegue/ec2/actualizar.sh              # conserva los datos
#   sudo bash /opt/ov/despliegue/ec2/actualizar.sh --recargar   # BORRA TODA LA BASE y carga `contenido`
#   sudo bash /opt/ov/despliegue/ec2/actualizar.sh --recargar --sin-ejemplos   # igual, sin los estudiantes de ejemplo
# --recargar elimina el esquema completo (cuentas, progreso y catálogo), crea las tablas desde cero con las
# migraciones y carga el conjunto `contenido` (con los usuarios de datos/usuarios_prueba.txt). Úsalo solo mientras
# no haya datos reales de estudiantes ni apoderados.
# Con `contenido` se siembran también los estudiantes de ejemplo del panel de la orientadora (cuentas inventadas con
# credenciales en el repositorio); --sin-ejemplos los omite, como antes de una prueba con usuarios. Si la siembra
# falla, la base queda con `contenido` sin ejemplos, el backend se reinicia igual y el script termina con error.
#
# Respaldo: antes de migrar o recargar, siempre, pg_dump de la base en /home/ov/respaldos (se conservan los últimos
# RESPALDOS_CONSERVADOS). Si el respaldo falla, no se despliega nada (código 5).
# Candado: --recargar se niega (código 4) si la base tiene cuentas reales: cualquiera que no cree la carga de
# `contenido` ni sea E99, A99 u O99 (scripts/comprobar_recarga.py). --forzar se salta el candado; solo a mano en la
# EC2, nunca desde GitHub Actions.
set -euo pipefail

DESTINO="/opt/ov"
UV="/home/ov/.local/bin/uv"
CONJUNTO="contenido"
RECARGAR=0
SIN_EJEMPLOS=""
FORZAR=0
SIEMBRA_FALLIDA=0
RESPALDOS="/home/ov/respaldos"
RESPALDOS_CONSERVADOS=15

for argumento in "$@"; do
  case "$argumento" in
    --recargar) RECARGAR=1 ;;
    --sin-ejemplos) SIN_EJEMPLOS="--sin-ejemplos" ;;
    --forzar) FORZAR=1 ;;
    *) echo "Argumento desconocido: $argumento"; exit 2 ;;
  esac
done

sudo -u ov git -C "$DESTINO" fetch origin deploy
sudo -u ov git -C "$DESTINO" reset --hard origin/deploy
# El grupo `ejemplos` (httpx) lo necesita la siembra de estudiantes de ejemplo.
sudo -u ov bash -c "cd $DESTINO/ov_backend && $UV sync --frozen --no-dev --extra postgres --group ejemplos"

# psql y pg_dump no aceptan el «+psycopg» de SQLAlchemy; se quitan también las comillas, si las hay.
URL_BD=$(grep -E '^DATABASE_URL=' "$DESTINO/ov_backend/.env" | tail -1 | cut -d= -f2- \
  | sed -e 's/^["'"'"']//' -e 's/["'"'"']$//' -e 's/+psycopg//')
if [ -z "$URL_BD" ]; then
  echo "No se encontró DATABASE_URL en $DESTINO/ov_backend/.env"
  exit 1
fi

# Candado de la recarga: antes de tocar nada.
if [ "$RECARGAR" -eq 1 ]; then
  if [ "$FORZAR" -eq 1 ]; then
    echo "AVISO: --forzar, se salta el candado de la recarga."
  else
    CODIGO_CANDADO=0
    sudo -u ov bash -c "cd $DESTINO/ov_backend && $UV run --no-sync python scripts/comprobar_recarga.py" \
      || CODIGO_CANDADO=$?
    if [ "$CODIGO_CANDADO" -ne 0 ]; then
      echo "No se recarga ni se migra nada (candado, código $CODIGO_CANDADO). El backend sigue como estaba."
      exit 4
    fi
  fi
fi

# Respaldo antes de migrar o recargar. Sin respaldo, no hay despliegue.
case "$URL_BD" in
  postgresql://*|postgres://*)
    install -d -o ov -g ov -m 700 "$RESPALDOS"
    ARCHIVO_RESPALDO="$RESPALDOS/ov-$(date +%Y%m%d-%H%M%S).dump"
    echo "==> Respaldo de la base en $ARCHIVO_RESPALDO"
    # La URL va por variable de entorno, no en la línea de comandos que se ve en `ps`.
    if ! sudo -u ov env URL_RESPALDO="$URL_BD" ARCHIVO="$ARCHIVO_RESPALDO" \
        bash -c 'umask 077 && pg_dump --format=custom --no-owner --file="$ARCHIVO" --dbname="$URL_RESPALDO"'; then
      rm -f "$ARCHIVO_RESPALDO"
      echo "No se pudo respaldar la base (¿pg_dump más antiguo que el servidor? ver despliegue/README.md, 8.2)."
      echo "No se migra ni se recarga nada. El backend sigue como estaba."
      exit 5
    fi
    ls -1t "$RESPALDOS"/ov-*.dump | tail -n +$((RESPALDOS_CONSERVADOS + 1)) | xargs -r rm -f
    ;;
  *)
    echo "AVISO: DATABASE_URL no es PostgreSQL; no se respalda."
    ;;
esac

if [ "$RECARGAR" -eq 1 ]; then
  echo "==> Recarga completa: se borra la base y se carga '$CONJUNTO'"
  systemctl stop ov-backend || true
  psql "$URL_BD" -v ON_ERROR_STOP=1 -q -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;'
  sudo -u ov bash -c "cd $DESTINO/ov_backend && $UV run --no-sync alembic upgrade head"
  # Código 3: la carga quedó hecha, pero la siembra de ejemplos falló (la base queda con `contenido`, sin ejemplos).
  CODIGO_CARGA=0
  sudo -u ov bash -c "cd $DESTINO/ov_backend && $UV run --no-sync python -m datos.cargar $CONJUNTO $SIN_EJEMPLOS" \
    || CODIGO_CARGA=$?
  if [ "$CODIGO_CARGA" -eq 3 ]; then
    echo "AVISO: no se sembraron los estudiantes de ejemplo; se reinicia el backend con '$CONJUNTO' sin ejemplos."
    SIEMBRA_FALLIDA=1
  elif [ "$CODIGO_CARGA" -ne 0 ]; then
    echo "No se pudo cargar '$CONJUNTO' (código $CODIGO_CARGA)."
    exit "$CODIGO_CARGA"
  fi
else
  sudo -u ov bash -c "cd $DESTINO/ov_backend && $UV run --no-sync alembic upgrade head"
fi

cp "$DESTINO/despliegue/ec2/ov-backend.service" /etc/systemd/system/ov-backend.service
systemctl daemon-reload
# El reinicio también rehace la caché de definiciones (reglas), que el backend arma al arrancar.
systemctl restart ov-backend
for intento in $(seq 1 30); do
  if curl -fsS -o /dev/null http://127.0.0.1:8000/docs; then
    echo "API local: HTTP 200 (tras ${intento} intento(s))"
    if [ "$SIEMBRA_FALLIDA" -eq 1 ]; then
      echo "La API está arriba, pero la siembra de estudiantes de ejemplo falló (ver arriba)."
      exit 3
    fi
    exit 0
  fi
  sleep 2
done
echo "La API no respondió en 60 s."
systemctl --no-pager --lines=20 status ov-backend
journalctl -u ov-backend -n 50 --no-pager
exit 1
