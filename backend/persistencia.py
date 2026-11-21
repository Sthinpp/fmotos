import json
import os
import sqlite3
from contextlib import closing
from pathlib import Path

import httpx
from fastapi import HTTPException

ROOT = Path(__file__).resolve().parents[1]
ARRAYS = ('ventas', 'leads', 'motos', 'repuestos', 'clientes', 'movimientosRepuestos', 'mesesVentas')


def entorno():
    variables = {}
    archivo = ROOT / '.env'
    if archivo.is_file():
        for linea in archivo.read_text(encoding='utf-8-sig').splitlines():
            clave, separador, valor = linea.partition('=')
            if separador and clave.strip().isidentifier():
                variables[clave.strip()] = valor.strip().strip('"\'')
    return {**variables, **os.environ}


def formato_estado(estado):
    return (isinstance(estado, dict) and all(isinstance(estado.get(k), list) for k in ARRAYS)
            and all(isinstance(fila, dict) for k in ARRAYS[:-1] for fila in estado[k])
            and isinstance(estado.get('corteInventario'), str))


class Supabase:
    def __init__(self, url, clave, espacio):
        self.url = url.rstrip('/')
        self.clave = clave
        self.espacio = espacio

    def llamar(self, funcion, token, argumentos=None):
        if not self.url or not self.clave:
            raise HTTPException(503, 'Configura la URL y la clave pública de Supabase.')
        try:
            resultado = httpx.post(
                f'{self.url}/rest/v1/rpc/{funcion}',
                headers={'apikey': self.clave, 'Authorization': f'Bearer {token}'},
                json={'p_espacio': self.espacio, **(argumentos or {})}, timeout=10,
            )
        except httpx.HTTPError as error:
            raise HTTPException(503, 'No se pudo conectar con Supabase.') from error
        if resultado.is_success:
            return resultado.json()
        try:
            detalle = resultado.json()
        except ValueError:
            detalle = {}
        if detalle.get('code') == '40001':
            raise HTTPException(409, 'Otro usuario guardó cambios. Se cargará la versión actual para que puedas reintentar.')
        if resultado.status_code == 401:
            raise HTTPException(401, 'La sesión expiró. Ingresa nuevamente.')
        if resultado.status_code == 403 or detalle.get('code') == '42501':
            raise HTTPException(403, 'Tu cuenta no tiene acceso al espacio de FMotos.')
        if detalle.get('code') == '22023':
            raise HTTPException(422, 'El formato de los datos no es válido.')
        raise HTTPException(503, 'No se pudo guardar o consultar el espacio de FMotos en Supabase.')

    def leer(self, token):
        return self.llamar('fmotos_leer', token)

    def guardar(self, token, revision, datos):
        return self.llamar('fmotos_guardar', token, {'p_revision': revision, 'p_datos': datos})

    def restaurar(self, token, revision):
        return self.llamar('fmotos_restaurar', token, {'p_revision': revision})


class Local:
    def __init__(self, ruta, base=None):
        self.ruta = Path(ruta)
        self.ruta.parent.mkdir(parents=True, exist_ok=True)
        self.base = Path(base or ROOT / 'datos/fmotos.json').read_text(encoding='utf-8')
        with closing(sqlite3.connect(self.ruta)) as db, db:
            db.execute('create table if not exists fmotos (id integer primary key, revision integer, datos text)')
            db.execute('insert or ignore into fmotos values (1, 0, ?)', (self.base,))

    def leer(self, _token):
        with closing(sqlite3.connect(self.ruta)) as db:
            revision, datos = db.execute('select revision, datos from fmotos where id=1').fetchone()
        return dict(revision=revision, datos=json.loads(datos))

    def guardar(self, _token, revision, datos):
        with closing(sqlite3.connect(self.ruta)) as db, db:
            actualizado = db.execute('update fmotos set revision=revision+1, datos=? where id=1 and revision=?',
                                     (json.dumps(datos, ensure_ascii=False), revision)).rowcount
        if not actualizado:
            raise HTTPException(409, 'Otro usuario guardó cambios. Se cargará la versión actual.')
        return dict(revision=revision + 1, datos=datos)

    def restaurar(self, token, revision):
        return self.guardar(token, revision, json.loads(self.base))
