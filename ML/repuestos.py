"""Segmentación con K-Means usando el stock actualizado y el precio de venta."""
from collections import Counter

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler


def stock_actual(estado):
    cambios = Counter()
    for movimiento in estado['movimientosRepuestos']:
        cambios[movimiento['codigo']] += movimiento['unidades'] * (1 if movimiento['tipo'] == 'entrada' else -1)
    return [dict(p, stock=p['stock'] + cambios[p['codigo']], minimo=p.get('minimo', 5)) for p in estado['repuestos']]


def candidatos(datos, k):
    """Ocho inicializaciones ponderadas por distancia, con la semilla del panel original."""
    semilla = 127

    def aleatorio():
        nonlocal semilla
        semilla = (1664525 * semilla + 1013904223) % (2 ** 32)
        return semilla / (2 ** 32)

    for _ in range(8):
        centros = [datos[int(aleatorio() * len(datos))]]
        while len(centros) < k:
            distancias = np.min(np.sum((datos[:, None] - centros) ** 2, axis=2), axis=1)
            acumulado = np.cumsum(distancias)
            indice = np.searchsorted(acumulado, aleatorio() * acumulado[-1], side='right')
            centros.append(datos[min(indice, len(datos) - 1)])
        yield np.asarray(centros)


def agrupar(estado, k):
    repuestos = stock_actual(estado)
    if not repuestos:
        return []
    tabla = pd.DataFrame(repuestos)
    datos = StandardScaler().fit_transform(np.log1p(tabla[['stock', 'venta']]))
    grupos = min(k, len(np.unique(datos, axis=0)))
    modelos = (KMeans(n_clusters=grupos, init=centros, n_init=1, max_iter=100, tol=0).fit(datos)
               for centros in candidatos(datos, grupos))
    tabla['grupo'] = min(modelos, key=lambda modelo: modelo.inertia_).labels_
    resultado = [dict(parts=repuestos_grupo[['codigo', 'nombre']].to_dict('records'),
                      stock=float(repuestos_grupo.stock.mean()), precio=float(repuestos_grupo.venta.mean()))
                 for _, repuestos_grupo in tabla.groupby('grupo')]
    return sorted(resultado, key=lambda fila: (fila['stock'], fila['precio']))
