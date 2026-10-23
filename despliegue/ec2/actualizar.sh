#!/usr/bin/env bash
# Trae lo último de la rama deploy, sincroniza dependencias, migra y reinicia.
# Uso: sudo bash /opt/ov/despliegue/ec2/actualizar.sh
# No recarga datos: para eso, a mano, `uv run python -m datos.cargar ruta` (con --vaciar borra el estado).
set -euo pipefail

DESTINO="/opt/ov"
UV="/home/ov/.local/bin/uv"

sudo -u ov git -C "$DESTINO" fetch origin deploy
sudo -u ov git -C "$DESTINO" reset --hard origin/deploy
sudo -u ov bash -c "cd $DESTINO/ov_backend && $UV sync --frozen --no-dev --extra postgres && $UV run --no-sync alembic upgrade head"
cp "$DESTINO/despliegue/ec2/ov-backend.service" /etc/systemd/system/ov-backend.service
systemctl daemon-reload
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
