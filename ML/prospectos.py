"""Clasificación de prioridad de prospectos con un árbol de decisión."""
from math import floor

import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from sklearn.tree import DecisionTreeClassifier

from .pronostico import catalogo_modelos, modelo_canonico, normalizar


def clasificar(estado):
    leads = estado['leads']
    catalogo = catalogo_modelos(estado)
    etiquetas = [lead.get('prioridadRegistrada') for lead in leads]
    prioridades = ('Alta', 'Media', 'Baja')
    indices = sorted((i for i, valor in enumerate(etiquetas) if valor in prioridades and leads[i].get('fechaRegistro')),
                     key=lambda i: leads[i]['fechaRegistro'])
    if len(indices) < 8:
        return {}
    caracteristicas = pd.DataFrame([
        dict(modelo=modelo_canonico(l.get('modelo'), catalogo), canal=normalizar(l.get('canal')),
             presupuesto=float(l.get('presupuesto') or l.get('precio') or 0)) for l in leads
    ])
    preparar = ColumnTransformer([
        ('categorias', OneHotEncoder(handle_unknown='ignore'), ['modelo', 'canal']),
        ('presupuesto', 'passthrough', ['presupuesto']),
    ])
    arbol = Pipeline([('preparar', preparar), ('arbol', DecisionTreeClassifier(
        max_depth=3, min_samples_leaf=4, random_state=127))])
    arbol.fit(caracteristicas.iloc[indices], [etiquetas[i] for i in indices])
    probabilidades = arbol.predict_proba(caracteristicas)
    columnas = {nombre: i for i, nombre in enumerate(arbol.classes_)}
    def prioridad(fila):
        opciones = [nombre for nombre in prioridades if nombre in columnas]
        return max(opciones, key=lambda nombre: fila[columnas[nombre]])
    return {
        lead['id']: {'prioridad': prioridad(probabilidades[i]), 'score': floor(100 * max(probabilidades[i]) + 0.5)}
        for i, lead in enumerate(leads) if lead.get('estado') not in ('ganado', 'perdido')
    }
