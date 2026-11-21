# API de FMotos

[`main.py`](main.py) define la API de FastAPI. [`persistencia.py`](persistencia.py) implementa el acceso al espacio de Supabase y el almacenamiento en SQLite para el modo local.

| Ruta | Función |
| --- | --- |
| `GET /api/health` | Indica si el backend responde y qué modo de almacenamiento usa. |
| `GET /api/datos` | Recupera el estado y la revisión del espacio con una sesión autorizada. |
| `PUT /api/datos` | Guarda cambios contra la revisión vigente y comprueba el stock. |
| `POST /api/datos/restaurar` | Restaura la base inicial con control de revisión. |
| `GET /api/ia/*` | Ejecuta los módulos de análisis de la [carpeta ML](../ML/). |

En producción, FastAPI reenvía a Supabase el token de cada usuario. En modo local, emite su propio token después de validar la contraseña configurada en `.env`.
