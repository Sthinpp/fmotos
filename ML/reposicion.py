"""Hill Climbing y A* para seleccionar compras acotadas por presupuesto."""
from heapq import heappop, heappush
from itertools import count
from math import ceil


def hill_climbing(items, presupuesto):
    cantidades = [0] * len(items)
    gasto = 0
    while True:
        mejor = None
        for agregar, item in enumerate(items):
            if cantidades[agregar] >= item['gap']:
                continue
            for quitar in [None, *[i for i, unidades in enumerate(cantidades) if unidades and i != agregar]]:
                anterior = items[quitar] if quitar is not None else {'cost': 0, 'weight': 0}
                costo = gasto + item['cost'] - anterior['cost']
                mejora = item['weight'] - anterior['weight']
                if costo <= presupuesto and mejora > 0 and (mejor is None or (mejora, -costo) > mejor[:2]):
                    mejor = (mejora, -costo, agregar, quitar)
        if mejor is None:
            return dict(quantities=cantidades, spend=gasto)
        _, costo_negativo, agregar, quitar = mejor
        gasto = -costo_negativo
        cantidades[agregar] += 1
        if quitar is not None:
            cantidades[quitar] -= 1


def a_estrella(items, presupuesto):
    def heuristica(nivel, disponible):
        pendientes = sorted(items[nivel:], key=lambda i: i['weight'] / i['cost'], reverse=True)
        faltante = sum(i['gap'] * i['weight'] for i in pendientes)
        for item in pendientes:
            comprar = min(item['gap'], disponible / item['cost'])
            disponible = max(0, disponible - comprar * item['cost'])
            faltante -= comprar * item['weight']
        return max(0, faltante)

    pasos = count()
    cola = [(heuristica(0, presupuesto), 0, next(pasos), (), 0)]
    while cola:
        _, gasto, _, cantidades, faltante = heappop(cola)
        nivel = len(cantidades)
        if nivel == len(items):
            return dict(quantities=list(cantidades), spend=gasto)
        item = items[nivel]
        maximo = min(item['gap'], (presupuesto - gasto) // item['cost'])
        for unidades in range(maximo + 1):
            costo = gasto + unidades * item['cost']
            deficit = faltante + (item['gap'] - unidades) * item['weight']
            prioridad = deficit + heuristica(nivel + 1, presupuesto - costo)
            heappush(cola, (prioridad, costo, next(pasos), (*cantidades, unidades), deficit))


def comparar(filas, presupuesto, reserva):
    modelos = []
    for fila in filas:
        if fila['projectedUnits'] is None:
            continue
        meta = fila['projectedUnits'] + ceil(fila['active'] * reserva / 100)
        modelos.append(dict(fila, target=meta, gap=max(0, meta - fila['stock']), weight=1 + fila['active']))
    elegibles = [fila for fila in modelos if fila['cost'] and fila['gap']]
    return dict(models=modelos, keys=[fila['key'] for fila in elegibles],
                hill=hill_climbing(elegibles, presupuesto), star=a_estrella(elegibles, presupuesto))
