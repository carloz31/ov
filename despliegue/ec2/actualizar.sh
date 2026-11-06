#!/usr/bin/env bash
# Trae lo último de la rama deploy, sincroniza dependencias, migra y reinicia.
# Uso:
#   sudo bash /opt/ov/despliegue/ec2/actualizar.sh              # conserva los datos
#   sudo bash /opt/ov/despliegue/ec2/actualizar.sh --recargar   # BORRA TODA LA BASE y carga `contenido`
# --recargar elimina el esquema completo (cuentas, progreso y catálogo), crea las tablas desde cero con las
# migraciones y carga el conjunto `contenido` (con los usuarios de datos/usuarios_prueba.txt). Úsalo solo mientras
# no haya datos reales de estudiantes ni apoderados.
set -euo pipefail

DESTINO="/opt/ov"
UV="/home/ov/.local/bin/uv"
CONJUNTO="contenido"
RECARGAR=0

for argumento in "$@"; do
  case "$argumento" in
    --recargar) RECARGAR=1 ;;
    *) echo "Argumento desconocido: $argumento"; exit 2 ;;
  esac
done

sudo -u ov git -C "$DESTINO" fetch origin deploy
sudo -u ov git -C "$DESTINO" reset --hard origin/deploy
sudo -u ov bash -c "cd $DESTINO/ov_backend && $UV sync --frozen --no-dev --extra postgres"

if [ "$RECARGAR" -eq 1 ]; then
  echo "==> Recarga completa: se borra la base y se carga '$CONJUNTO'"
  systemctl stop ov-backend || true
  # psql no acepta el «+psycopg» de SQLAlchemy; se quitan también las comillas, si las hay.
  URL_BD=$(grep -E '^DATABASE_URL=' "$DESTINO/ov_backend/.env" | tail -1 | cut -d= -f2- \
    | sed -e 's/^["'"'"']//' -e 's/["'"'"']$//' -e 's/+psycopg//')
  if [ -z "$URL_BD" ]; then
    echo "No se encontró DATABASE_URL en $DESTINO/ov_backend/.env"
    exit 1
  fi
  psql "$URL_BD" -v ON_ERROR_STOP=1 -q -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;'
  sudo -u ov bash -c "cd $DESTINO/ov_backend && $UV run --no-sync alembic upgrade head \
    && $UV run --no-sync python -m datos.cargar $CONJUNTO"
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
    exit 0
  fi
  sleep 2
done
echo "La API no respondió en 60 s."
systemctl --no-pager --lines=20 status ov-backend
journalctl -u ov-backend -n 50 --no-pager
exit 1
