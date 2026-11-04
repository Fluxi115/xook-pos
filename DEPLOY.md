# Despliegue en un VPS

La API queda en el puerto **5080** del servidor. SQLite vive en la carpeta `data/` del proyecto, montada en `/app/data` dentro del contenedor. Reiniciar o reconstruir la imagen no borra `data/pos.db`.

En producción no se crean los usuarios de demostración. La clave JWT tiene que ser propia: la de desarrollo no arranca el contenedor.

## 1. Preparar

En el servidor, dentro de la carpeta del proyecto:

```bash
cp .env.example .env
```

Edita `.env` y cambia `JWT_KEY` por una clave de al menos 32 caracteres. En `CORS_ORIGIN` pon la dirección pública del frontend, por ejemplo `https://pos.tudominio.com`.

Si ya tienes clientes en local, copia ese `pos.db` a `data/pos.db` antes de levantar. Si `data/` está vacía, la API crea el archivo y las tablas, sin los usuarios de demostración.

## 2. Levantar

```bash
docker compose up -d --build
```

La API escucha en `http://SERVIDOR:5080`. El frontend debe usar esa dirección como `VITE_API_URL`.

## 3. Ver los logs

```bash
docker compose logs -f
```

`Ctrl+C` deja de seguir los logs. El contenedor sigue en marcha. Para salir del servicio: `docker compose down`. Eso no borra `data/`.

## 4. Respaldo de pos.db

Respaldo manual, con la API detenida para que el archivo quede consistente:

```bash
mkdir -p backups
docker compose stop pos-api
cp data/pos.db "backups/pos-$(date +%Y%m%d-%H%M).db"
docker compose start pos-api
```

Si existen `data/pos.db-wal` y `data/pos.db-shm`, cópialos junto con `pos.db`.

Respaldo automático cada día a las 03:00. Abre el cron con `crontab -e` y agrega esta línea, cambiando la ruta del proyecto:

```cron
0 3 * * * cd /opt/pos && mkdir -p backups && docker compose stop pos-api && cp data/pos.db "backups/pos-$(date +\%Y\%m\%d).db" && docker compose start pos-api
```
