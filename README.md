# FMotos · React, Supabase y Python

Panel en React y Vite, con los estilos, el logotipo y las secciones del HTML de FMotos. FastAPI atiende los cálculos de Inteligencia IA. Supabase maneja el inicio de sesión, el acceso al espacio y la base de datos compartida.

## Publicar en GitHub, Supabase y Vercel

1. Crea un repositorio privado y vacío en GitHub. Sube el contenido del paquete de código `FMotos-Codigo-GitHub-Vercel.zip`. El repositorio contiene React, FastAPI, los cuatro módulos de `ML/`, la migración de Supabase y las pruebas automáticas. [Crear un repositorio](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-new-repository)
2. En el SQL Editor de Supabase, aplica la migración del código y luego el archivo privado `datos/importar-base.sql`, que viene en el paquete local original `FMotos-React-Supabase-Python.zip`. Crea un usuario en **Authentication → Users** y autorízalo con `supabase/autorizar-usuario.sql`, sustituyendo el correo de ejemplo en el SQL Editor. Conserva los archivos de ventas, contactos y respaldos fuera del repositorio.
3. En Vercel, elige **Add New → Project**, importa el repositorio y selecciona **FastAPI** si el asistente pregunta por el framework. Usa la raíz del repositorio. `vercel.json` compila React con Vite y `app.py` expone FastAPI, que sirve el panel y las rutas `/api` en el mismo dominio. [Vercel para GitHub](https://vercel.com/docs/git/vercel-for-github) · [FastAPI en Vercel](https://vercel.com/docs/frameworks/backend/fastapi)
4. Agrega `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` al entorno de producción antes de desplegar. Usa la URL del proyecto y su clave **publishable** de Supabase. Python también lee esas dos variables en Vercel. Deja vacías `VITE_API_URL` y las variables `FMOTOS_LOCAL*` para usar la API del mismo dominio y el acceso de Supabase. [Claves de Supabase](https://supabase.com/docs/guides/getting-started/api-keys) · [Variables de entorno de Vercel](https://vercel.com/docs/environment-variables)
5. En Supabase **Authentication → URL Configuration**, registra la URL final de Vercel como **Site URL**. Abre esa URL, ingresa con el correo autorizado, revisa el Dashboard y confirma que cargan los cuatro apartados de Inteligencia IA. En una ventana sin sesión, verifica que `/api/datos` devuelve `401`. [URL de autenticación](https://supabase.com/docs/guides/auth/redirect-urls)

## Conectar un proyecto de Supabase

1. Crea o elige tu proyecto de Supabase. Ejecuta `supabase/migrations/202611200001_fmotos.sql` en el **SQL Editor** para crear el espacio privado, las funciones de acceso y el control de revisiones.
2. Ejecuta `datos/importar-base.sql`. Carga las **82 ventas, 60 prospectos, 36 motos y 64 referencias de repuestos** de la base original. Volver a ejecutar el archivo conserva una base existente.
3. En **Authentication → Users**, crea o invita a tu usuario. Escribe su correo en `supabase/autorizar-usuario.sql` y ejecuta ese bloque. Cada usuario autorizado tiene acceso al espacio de FMotos.
4. Copia `.env.example` a `.env`. Coloca la URL y la clave **publishable** del proyecto en las variables correspondientes de React y de Python. El servicio de Python usa el token de cada sesión para invocar las funciones de Supabase. [Guía oficial de Supabase con React](https://supabase.com/docs/guides/getting-started/quickstarts/reactjs)
5. Instala las dependencias y compila la interfaz. Luego inicia el servicio Python y abre [el panel local](http://127.0.0.1:8000).

```powershell
npm ci
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
npm run build
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

Para desarrollar con recarga al guardar, conserva Python en el puerto 8000 y ejecuta `npm run dev` en otra terminal. Vite envía las solicitudes `/api` al servicio Python.

## Probar en tu computadora antes de conectar Supabase

Después de instalar y compilar, configura estas variables en PowerShell e inicia el mismo servicio. Ingresa en el panel con el usuario `admin` y la contraseña que hayas configurado. Este modo guarda los cambios en `datos/local.sqlite` y permite probar todas las pantallas con la base de FMotos.

Si trabajas desde el paquete de código para GitHub, copia primero `datos/fmotos.json` desde el paquete local original a la carpeta `datos/`. Esa carpeta está excluida del repositorio.

```powershell
$env:FMOTOS_LOCAL='1'
$env:FMOTOS_LOCAL_PASSWORD=Read-Host 'Elige una contraseña local de al menos 10 caracteres'
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

Usa este modo en `127.0.0.1`. Si abriste sesión en Supabase desde el mismo proyecto, el modo local requiere compilar con las variables `VITE_SUPABASE_*` vacías.

## Los cuatro archivos de `ML/`

| Archivo | Implementación | Resultado en el panel |
|---|---|---|
| `pronostico.py` | pandas agrupa las ventas y `LinearRegression` ajusta la tendencia por modelo. | Proyección, gráfico y avance del mes seleccionado. |
| `reposicion.py` | Hill Climbing y A* en Python, con presupuesto en céntimos. | Unidades sugeridas y costo por plan. |
| `prospectos.py` | `DecisionTreeClassifier` y `OneHotEncoder` con etiquetas históricas; canal, modelo y presupuesto. | Prioridad estimada en CRM e Inteligencia IA. |
| `repuestos.py` | `StandardScaler` y `KMeans` sobre el stock actualizado y el precio. | Segmentos de dos, tres o cuatro grupos. |

La regresión se ajusta con meses cerrados. Las prioridades y los segmentos se calculan con scikit-learn y pueden variar frente a la implementación anterior en JavaScript. La estructura de los datos operativos conserva los registros y campos de la versión anterior.

## Trasladar cambios guardados en el HTML anterior

La base incluida es la que venía dentro del HTML. Los cambios posteriores que estén en el almacenamiento de ese navegador se pueden recuperar desde la pestaña original. Abre su consola, ejecuta este bloque y luego importa el JSON desde **Reportes → Importar respaldo (JSON)** en React. La importación reemplaza el estado completo del espacio y pide confirmación.

```javascript
const fmotos = localStorage.getItem('control-motos-data');
if (!fmotos) throw new Error('Esta pestaña no tiene cambios guardados de FMotos.');
const enlace = document.createElement('a');
enlace.href = URL.createObjectURL(new Blob([fmotos], {type: 'application/json'}));
enlace.download = 'fmotos-respaldo-privado.json';
enlace.click();
setTimeout(() => URL.revokeObjectURL(enlace.href), 1000);
```

Los archivos de `datos/` incluyen nombres, contactos y documentos. Se excluyen del repositorio y de la imagen de producción. La interfaz compilada solo recibe datos mediante las rutas autenticadas. Las funciones de PostgreSQL comprueban la membresía y la revisión antes de guardar. [Guía oficial de seguridad por filas](https://supabase.com/docs/guides/database/postgres/row-level-security)

## Cloud y DevOps

- `Dockerfile` compila React y sirve el panel y FastAPI en el puerto 8000. Pasa `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` como argumentos de compilación y las variables `SUPABASE_*` y `FMOTOS_WORKSPACE` al iniciar el contenedor.
- `npm run test:sql` prueba la migración sobre PostgreSQL local, con acceso anónimo, usuarios autorizados y revisiones en conflicto.
- `python -m unittest discover -s tests -v` verifica la API, los cuatro módulos, el guardado y la restauración con datos de prueba.
- `.github/workflows/ci.yml` ejecuta la compilación y ambas suites.
