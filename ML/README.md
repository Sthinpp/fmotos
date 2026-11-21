# Inteligencia IA de FMotos

Los módulos de Python reciben el estado operativo y calculan los resultados que consume la API de FastAPI. El registro de ventas, prospectos y movimientos ocurre en los módulos de gestión de FMotos.

| Módulo | Método | Resultado |
| --- | --- | --- |
| [`pronostico.py`](pronostico.py) | Agrupación con pandas y regresión lineal con scikit-learn | Unidades estimadas por modelo a partir de meses cerrados. |
| [`reposicion.py`](reposicion.py) | Hill Climbing y A* | Dos planes de compra con cantidades y costo, sujetos al presupuesto. |
| [`prospectos.py`](prospectos.py) | Árbol de decisión con variables categóricas codificadas | Prioridad estimada de seguimiento. |
| [`repuestos.py`](repuestos.py) | Escalado de variables y K-Means | Grupos de repuestos según el precio y el stock disponible. |
