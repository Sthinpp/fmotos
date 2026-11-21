import secrets
import time
from threading import Lock
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from ML.pronostico import indice_mes, proyectar
from ML.prospectos import clasificar
from ML.reposicion import comparar
from ML.repuestos import agrupar, stock_actual
from .persistencia import ROOT, Local, Supabase, entorno, formato_estado

CONFIG = entorno()
MODO_LOCAL = CONFIG.get('FMOTOS_LOCAL') == '1'
LOCAL_PASS = CONFIG.get('FMOTOS_LOCAL_PASSWORD', '')
if MODO_LOCAL and len(LOCAL_PASS) < 10:
    raise RuntimeError('Configura FMOTOS_LOCAL_PASSWORD con al menos 10 caracteres para el modo local.')

repo = Local(CONFIG.get('FMOTOS_LOCAL_DB', str(ROOT / 'datos/local.sqlite')), CONFIG.get('FMOTOS_SEED_FILE')) if MODO_LOCAL else Supabase(
    CONFIG.get('SUPABASE_URL', CONFIG.get('VITE_SUPABASE_URL', '')),
    CONFIG.get('SUPABASE_PUBLISHABLE_KEY', CONFIG.get('VITE_SUPABASE_PUBLISHABLE_KEY', '')),
    CONFIG.get('FMOTOS_WORKSPACE', 'fmotos'),
)

app = FastAPI(title='FMotos', docs_url=None, redoc_url=None, openapi_url=None)
sesiones = {}
sesiones_lock = Lock()
bearer = HTTPBearer(auto_error=False)
Mes = Annotated[str, Query(pattern=r'^\d{4}-(0[1-9]|1[0-2])$')]


class Credenciales(BaseModel):
    usuario: str = Field(max_length=260)
    password: str = Field(max_length=512)


class Guardado(BaseModel):
    revision: int = Field(ge=0)
    datos: dict


class Revision(BaseModel):
    revision: int = Field(ge=0)


@app.middleware('http')
async def privacidad(request, siguiente):
    respuesta = await siguiente(request)
    respuesta.headers['X-Content-Type-Options'] = 'nosniff'
    if request.url.path.startswith('/api/'):
        respuesta.headers['Cache-Control'] = 'no-store'
    return respuesta


def token_usuario(credencial: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)]):
    if credencial is None:
        raise HTTPException(401, 'Ingresa a FMotos.')
    token = credencial.credentials
    if MODO_LOCAL:
        with sesiones_lock:
            if sesiones.get(token, 0) <= time.time():
                sesiones.pop(token, None)
                raise HTTPException(401, 'La sesión local expiró.')
    return token


Token = Annotated[str, Depends(token_usuario)]


@app.get('/api/health')
def salud():
    return {'ok': True, 'modo': 'local' if MODO_LOCAL else 'supabase'}


@app.post('/api/local/login')
def login_local(form: Credenciales):
    if not MODO_LOCAL:
        raise HTTPException(404, 'Ruta no disponible.')
    usuario = CONFIG.get('FMOTOS_LOCAL_USER', 'admin')
    if not (secrets.compare_digest(form.usuario.encode(), usuario.encode()) and
            secrets.compare_digest(form.password.encode(), LOCAL_PASS.encode())):
        raise HTTPException(401, 'Usuario o contraseña incorrectos.')
    token = secrets.token_urlsafe(32)
    ahora = time.time()
    with sesiones_lock:
        sesiones.update({token: ahora + 8 * 3600})
        for anterior in [k for k, vence in sesiones.items() if vence <= ahora]:
            sesiones.pop(anterior, None)
    return {'token': token, 'usuario': usuario}


@app.post('/api/local/logout')
def logout_local(token: Token):
    if not MODO_LOCAL:
        raise HTTPException(404, 'Ruta no disponible.')
    with sesiones_lock:
        sesiones.pop(token, None)
    return {'ok': True}


@app.get('/api/datos')
def leer(token: Token):
    return repo.leer(token)


@app.put('/api/datos')
def guardar(cambio: Guardado, token: Token):
    if not formato_estado(cambio.datos):
        raise HTTPException(422, 'El formato del respaldo o del estado no es válido.')
    try:
        stock = stock_actual(cambio.datos)
        if any(p['stock'] < 0 for p in stock):
            raise HTTPException(422, 'El stock de repuestos no puede ser negativo.')
    except (ValueError, TypeError, KeyError) as error:
        raise HTTPException(422, 'El formato del inventario o de sus movimientos no es válido.') from error
    return repo.guardar(token, cambio.revision, cambio.datos)


@app.post('/api/datos/restaurar')
def restaurar(form: Revision, token: Token):
    return repo.restaurar(token, form.revision)


def proyeccion(token, mes, actual):
    if indice_mes(mes) - indice_mes(actual) not in (0, 1):
        raise HTTPException(422, 'Selecciona este mes o el siguiente.')
    return proyectar(repo.leer(token)['datos'], mes, actual)


@app.get('/api/ia/pronostico')
def pronostico(mes: Mes, actual: Mes, token: Token):
    return proyeccion(token, mes, actual)


@app.get('/api/ia/reposicion')
def reposicion(mes: Mes, actual: Mes, token: Token, presupuesto: Annotated[int, Query(ge=0, le=1_000_000_000)],
               reserva: Annotated[int, Query(ge=0, le=100)]):
    return comparar(proyeccion(token, mes, actual)['rows'], presupuesto, reserva)


@app.get('/api/ia/prospectos')
def prospectos(token: Token):
    return clasificar(repo.leer(token)['datos'])


@app.get('/api/ia/repuestos')
def repuestos(k: Annotated[int, Query(ge=2, le=4)], token: Token):
    return agrupar(repo.leer(token)['datos'], k)


if (ROOT / 'dist').is_dir():
    app.mount('/', StaticFiles(directory=ROOT / 'dist', html=True), name='panel')
