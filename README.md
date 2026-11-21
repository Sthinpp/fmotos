# FMotos

FMotos es un panel para gestionar ventas de motos, prospectos, clientes e inventario de motos y repuestos. Incluye alertas de stock mínimo, reportes descargables y un módulo de Inteligencia IA para apoyar las decisiones comerciales.

**Panel publicado** · [Abrir FMotos en Vercel](https://fmotos-seven.vercel.app/)

**Acceso** · Inicia sesión con una cuenta autorizada en Supabase.

[Trabajos completos en GitHub](https://github.com/Sthinpp/fmotos/issues?q=is%3Aissue+is%3Aclosed)

## Qué incluye

| Apartado | Función |
| --- | --- |
| Dashboard | Consulta los indicadores y filtra el gráfico de ventas por mes. |
| Ventas y clientes | Registra ventas, clientes y pagos. |
| CRM | Organiza prospectos, contactos y seguimientos. |
| Inventario | Controla motos, repuestos, entradas, salidas y alertas por stock mínimo. |
| Inteligencia IA | Proyecta ventas, compara planes de reposición, estima prioridades y agrupa los repuestos. |
| Reportes | Exporta registros en CSV y administra respaldos en JSON. |

## Ejecutar en tu computadora

Necesitas **Git**, **Node.js 22.12 o posterior** y **Python 3.13**. Como el repositorio es privado, usa una cuenta de GitHub que tenga acceso.

```bash
git clone https://github.com/Sthinpp/fmotos.git
cd fmotos
```

### 1. Elige cómo guardar los datos

**Modo local con SQLite**

Crea un archivo `.env` en la raíz del proyecto. Sustituye el valor de ejemplo por una contraseña local propia de al menos 10 caracteres.

```dotenv
FMOTOS_LOCAL=1
FMOTOS_LOCAL_PASSWORD=CAMBIA_ESTA_CLAVE
```

Crea la carpeta `datos/` y guarda este contenido en `datos/fmotos.json` para empezar con una base vacía. También puedes usar una copia autorizada de la base privada.

```json
{
  "ventas": [],
  "leads": [],
  "motos": [],
  "repuestos": [],
  "clientes": [],
  "movimientosRepuestos": [],
  "mesesVentas": [],
  "corteInventario": "2026-11-01"
}
```

Ingresa con el usuario `admin` y tu contraseña local. Los cambios quedan en `datos/local.sqlite`. Si tienes un respaldo autorizado, puedes cargarlo desde **Reportes → Importar respaldo (JSON)**. La importación reemplaza el estado de esa base.

**Modo con Supabase**

Copia [`.env.example`](.env.example) como `.env` y completa las variables con la URL y la clave **publishable** del mismo proyecto.

| Variable | Valor |
| --- | --- |
| `VITE_SUPABASE_URL` y `SUPABASE_URL` | URL del proyecto de Supabase. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` y `SUPABASE_PUBLISHABLE_KEY` | Clave publicable del proyecto. |
| `FMOTOS_WORKSPACE` | `fmotos` con la configuración incluida. |

Usa solo las variables de este modo y entra con tu correo autorizado. Para preparar un proyecto nuevo, aplica la [migración SQL](supabase/migrations/202611200001_fmotos.sql), carga el respaldo autorizado y usa el [script de acceso](supabase/autorizar-usuario.sql) para vincular un usuario existente de Supabase Auth al espacio de FMotos.

### 2. Instala y arranca el sistema

**Windows (PowerShell)**

```powershell
npm.cmd ci
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
npm.cmd run build
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

**macOS y Linux**

```bash
npm ci
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
npm run build
.venv/bin/python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

Abre [FMotos en localhost](http://127.0.0.1:8000/). Si cambias las variables de Supabase, vuelve a compilar React y reinicia Python. Para desarrollar con recarga al guardar, deja FastAPI en el puerto 8000 y ejecuta `npm run dev` en otra terminal. En PowerShell puedes usar `npm.cmd run dev`.

## Inteligencia IA

El código de los cuatro apartados está en [`ML/`](ML/).

| Apartado | Algoritmo | Aplicación |
| --- | --- | --- |
| [Pronóstico](ML/pronostico.py) | Regresión lineal con pandas y scikit-learn | Estima cuántas unidades podrían venderse por modelo a partir de las ventas registradas en meses cerrados. |
| [Reposición](ML/reposicion.py) | Hill Climbing y A* | Compara combinaciones de compra según la demanda, el stock y el presupuesto. |
| [Prospectos](ML/prospectos.py) | Árbol de decisión | Estima qué prospectos priorizar según su canal, el modelo de interés y su presupuesto. |
| [Repuestos](ML/repuestos.py) | K-Means | Agrupa referencias según su precio y stock disponible para revisar el catálogo. |

## Arquitectura y despliegue

- [Pantallas de React](src/) y [API de FastAPI](backend/). En producción, Vercel sirve la interfaz y la API en el mismo dominio.
- [Base de datos y autenticación](supabase/). Las operaciones de datos verifican la sesión y la membresía.
- [Pruebas del sistema](tests/). Cubren la API, los módulos de Inteligencia IA y los permisos de la base.
- [`vercel.json`](vercel.json) configura el despliegue desde GitHub. En Vercel, establece `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` en producción. FastAPI también usa esas dos variables cuando las equivalentes de Python están ausentes. En Supabase, configura la dirección publicada como **Site URL**.
- [`.github/workflows/ci.yml`](.github/workflows/ci.yml) compila la interfaz y ejecuta las pruebas de Python y PostgreSQL en GitHub Actions.

Para correr las pruebas en tu computadora, ejecuta `npm run test:sql` y `python -m unittest discover -s tests -v` con el Python de tu entorno virtual. Los archivos `.env`, la carpeta `datos/` y los respaldos con información de clientes se mantienen fuera del repositorio.
