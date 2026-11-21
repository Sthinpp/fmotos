"""Pronóstico mensual por modelo con pandas y regresión lineal."""
import re
from math import floor
from unicodedata import normalize, combining

import pandas as pd
from sklearn.linear_model import LinearRegression


def normalizar(value):
    return ' '.join(''.join(c for c in normalize('NFD', str(value or '')).upper() if not combining(c)).split())


def nombre_moto(moto):
    return f"{moto.get('marca', '')} {moto.get('modelo', '')}".strip()


def modelo_de_venta(venta):
    return re.sub(r'\s*\([^)]*\)\s*$', '', venta.get('modeloBase') or venta.get('motoDesc') or '').strip()


def catalogo_modelos(estado):
    catalogo = {}
    for moto in estado['motos']:
        catalogo.setdefault(normalizar(moto['modelo']), nombre_moto(moto))
    return catalogo


def modelo_canonico(value, catalogo):
    clave = normalizar(value)
    for corto, nombre in catalogo.items():
        if clave == corto or clave.endswith(f' {corto}'):
            return nombre
    return clave


def indice_mes(mes):
    return int(mes[:4]) * 12 + int(mes[5:7]) - 1


def proyectar(estado, mes_objetivo, mes_actual):
    catalogo = catalogo_modelos(estado)
    ventas = pd.DataFrame([
        {'mes': v['fecha'][:7], 'modelo': modelo_canonico(modelo_de_venta(v), catalogo)}
        for v in estado['ventas'] if v.get('fecha')
    ], columns=['mes', 'modelo'])
    meses = sorted(m for m in set(estado['mesesVentas']) | set(ventas.mes) if m < mes_objetivo)
    cerrados = [m for m in meses if m < mes_actual]
    conteos = ventas.groupby(['modelo', 'mes']).size().to_dict()
    modelos = (set(ventas.modelo) | {modelo_canonico(nombre_moto(m), catalogo) for m in estado['motos']}) - {''}
    filas = []
    for modelo in sorted(modelos):
        historial = {mes: int(conteos.get((modelo, mes), 0)) for mes in meses}
        unidades = [historial[mes] for mes in cerrados]
        proyeccion = None
        if len(cerrados) >= 2 and any(unidades):
            tiempo = pd.DataFrame({'periodo': [indice_mes(m) for m in cerrados]})
            regresion = LinearRegression().fit(tiempo, unidades)
            estimado = regresion.predict(pd.DataFrame({'periodo': [indice_mes(mes_objetivo)]}))[0]
            proyeccion = floor(max(0, float(estimado)) + 0.5 + 1e-9)
        motos = [m for m in estado['motos'] if modelo_canonico(nombre_moto(m), catalogo) == modelo]
        precios = [m['precioCompra'] for m in motos if m.get('precioCompra', 0) > 0]
        filas.append(dict(key=modelo, history=historial, projectedUnits=proyeccion,
                          registered=int(conteos.get((modelo, mes_objetivo), 0)),
                          stock=sum(m['estado'] == 'disponible' for m in motos),
                          active=sum(l.get('estado') not in ('ganado', 'perdido')
                                     and modelo_canonico(l.get('modelo'), catalogo) == modelo for l in estado['leads']),
                          cost=floor(sum(precios) * 100 / len(precios) + 0.5) if precios else None))
    filas.sort(key=lambda fila: (-(fila['projectedUnits'] if fila['projectedUnits'] is not None else -1), fila['key']))
    return dict(months=meses, target=mes_objetivo, lastClosedMonth=cerrados[-1] if cerrados else None, rows=filas)
