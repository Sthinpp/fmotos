import json
import os
import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

from ML.reposicion import a_estrella, hill_climbing

ESTADO = {
    'ventas': [{'id': 'x1', 'fecha': '2026-09-01', 'motoDesc': 'Serie M (Negro)'},
               {'id': 'x2', 'fecha': '2026-10-01', 'motoDesc': 'Serie M (Negro)'},
               {'id': 'x3', 'fecha': '2026-10-03', 'motoDesc': 'Serie M (Rojo)'}],
    'motos': [{'id': 'm1', 'marca': 'Serie', 'modelo': 'M', 'estado': 'disponible', 'precioCompra': 4000}],
    'repuestos': [{'codigo': str(i), 'nombre': f'Repuesto {i}', 'stock': i * 5, 'venta': i * 20} for i in range(1, 9)],
    'leads': [dict(id=f'l{i}', fechaRegistro='2026-10-01', modelo='M', canal='Local', presupuesto=i * 10, prioridadRegistrada='Alta' if i > 5 else 'Baja', estado='nuevo') for i in range(10)],
    'clientes': [], 'movimientosRepuestos': [], 'mesesVentas': ['2026-09', '2026-10'], 'corteInventario': '2026-11-04',
}


class Endpoints(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temporal = tempfile.TemporaryDirectory()
        base = Path(cls.temporal.name) / 'base.json'
        base.write_text(json.dumps(ESTADO), encoding='utf-8')
        os.environ.update(FMOTOS_LOCAL='1', FMOTOS_LOCAL_PASSWORD='fmotos-sesion-test', FMOTOS_SEED_FILE=str(base),
                          FMOTOS_LOCAL_DB=str(Path(cls.temporal.name) / 'estado.sqlite'))
        from backend.main import app
        cls.api = TestClient(app)
        response = cls.api.post('/api/local/login', json={'usuario':'admin','password':'fmotos-sesion-test'})
        cls.headers = {'Authorization': 'Bearer ' + response.json()['token']}

    @classmethod
    def tearDownClass(cls):
        cls.api.close()
        cls.temporal.cleanup()

    def test_cuatro_modulos_reales(self):
        endpoint = '?mes=2026-11&actual=2026-11'
        self.assertEqual(self.api.get('/api/ia/pronostico'+endpoint).status_code, 401)
        pronostico = self.api.get('/api/ia/pronostico'+endpoint, headers=self.headers).json()
        self.assertEqual(pronostico['rows'][0]['projectedUnits'], 3)
        plan = self.api.get('/api/ia/reposicion'+endpoint+'&presupuesto=400000&reserva=0', headers=self.headers).json()
        self.assertEqual(plan['star']['quantities'], [1])
        self.assertEqual(plan['hill']['spend'], 400000)
        clasificados = self.api.get('/api/ia/prospectos', headers=self.headers).json()
        self.assertEqual(clasificados['l9']['prioridad'], 'Alta')
        grupos = self.api.get('/api/ia/repuestos?k=3', headers=self.headers).json()
        self.assertEqual(len(grupos), 3)
        self.assertEqual(sum(len(grupo['parts']) for grupo in grupos), 8)

    def test_guardado_conflicto_y_restablecimiento(self):
        anterior = self.api.get('/api/datos', headers=self.headers).json()
        revision = anterior['revision']
        datos = anterior['datos']
        datos['movimientosRepuestos'].append({'codigo':'1','tipo':'salida','unidades':100})
        self.assertEqual(self.api.put('/api/datos', headers=self.headers, json={'revision':revision,'datos':datos}).status_code, 422)
        datos['movimientosRepuestos'][0]['unidades'] = 2
        self.assertEqual(self.api.put('/api/datos', headers=self.headers, json={'revision':revision,'datos':datos}).status_code, 200)
        self.assertEqual(self.api.put('/api/datos', headers=self.headers, json={'revision':revision,'datos':datos}).status_code, 409)
        self.assertEqual(self.api.post('/api/datos/restaurar', headers=self.headers, json={'revision':revision+1}).json()['datos'], ESTADO)

    def test_a_estrella_puede_superar_el_resultado_local(self):
        items=[{'gap':1,'cost':6,'weight':5}, {'gap':2,'cost':5,'weight':4}]
        self.assertEqual(hill_climbing(items,10)['quantities'],[1,0])
        self.assertEqual(a_estrella(items,10)['quantities'],[0,2])
