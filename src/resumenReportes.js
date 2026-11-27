import {activos,centavos,mesEtiqueta,nombreMoto,pagos,pasos,repuestosActuales,suma} from './negocio.js';

const totalSoles=(filas,leer)=>suma(filas,fila=>centavos(leer(fila)))/100;
const cantidad=(titulo,valor)=>({titulo,valor});
const importe=(titulo,valor)=>({titulo,valor,formato:'soles'});

export function resumenVentas({ventas}) {
  const ganancia=filas=>suma(filas,v=>v.precioCompra==null?0:centavos(v.precioVenta)-centavos(v.precioCompra))/100;
  const meses=new Map();
  for(const venta of ventas){
    const periodo=venta.fecha?.slice(0,7);
    const mes=/^\d{4}-(0[1-9]|1[0-2])$/.test(periodo)?periodo:'';
    if(!meses.has(mes))meses.set(mes,[]);
    meses.get(mes).push(venta);
  }
  return {
    metricas:[
      importe('Importe de ventas',totalSoles(ventas,v=>v.precioVenta)),
      importe('Ganancia con costo registrado',ganancia(ventas)),
      cantidad('Ventas registradas',ventas.length)
    ],
    titulo:'Ventas y ganancia por mes',
    columnas:['Mes','Ventas','Importe','Ganancia'],
    soles:[2,3],
    filas:[...meses.keys()].sort().map(mes=>{
      const registros=meses.get(mes);
      return [mes?mesEtiqueta(mes):'Sin fecha',registros.length,totalSoles(registros,v=>v.precioVenta),ganancia(registros)];
    })
  };
}

export function resumenPagos({ventas}) {
  const cobros=ventas.flatMap(pagos);
  const total=totalSoles(cobros,p=>p.monto);
  const metodos=new Map();
  for(const pago of cobros){
    if(!metodos.has(pago.metodo))metodos.set(pago.metodo,[]);
    metodos.get(pago.metodo).push(pago);
  }
  const filas=[...metodos].map(([metodo,registros])=>{
    const monto=totalSoles(registros,p=>p.monto);
    return [metodo,registros.length,monto,total?monto/total:0];
  }).sort((a,b)=>b[2]-a[2]);
  return {
    metricas:[importe('Total registrado',total),cantidad('Pagos registrados',cobros.length),cantidad('Métodos usados',metodos.size)],
    titulo:'Distribución por método de pago',
    columnas:['Método','Cantidad de pagos','Importe','% del importe'],
    soles:[2],
    porcentajes:[3],
    filas
  };
}

export function resumenMotos({motos}) {
  const inventario=new Map();
  for(const moto of motos){
    const modelo=nombreMoto(moto)||'Sin modelo';
    if(!inventario.has(modelo))inventario.set(modelo,[0,0,0]);
    const indice=moto.estado==='disponible'?0:moto.estado==='vendida'?1:2;
    inventario.get(modelo)[indice]++;
  }
  return {
    metricas:[
      cantidad('Motos registradas',motos.length),
      cantidad('Disponibles',motos.filter(m=>m.estado==='disponible').length),
      cantidad('Vendidas',motos.filter(m=>m.estado==='vendida').length)
    ],
    titulo:'Unidades por modelo y disponibilidad',
    columnas:['Modelo','Disponibles','Vendidas','Otros estados','Total'],
    filas:[...inventario].sort(([a],[b])=>a.localeCompare(b)).map(([modelo,unidades])=>[modelo,...unidades,suma(unidades)])
  };
}

export function resumenRepuestos(data) {
  const repuestos=repuestosActuales(data);
  const alertas=repuestos.filter(p=>p.stock<=p.minimo).sort((a,b)=>a.stock-b.stock||a.nombre.localeCompare(b.nombre));
  return {
    metricas:[
      cantidad('Referencias',repuestos.length),
      cantidad('Unidades de stock',suma(repuestos,p=>p.stock)),
      cantidad('Al mínimo o por debajo',alertas.length)
    ],
    titulo:'Referencias al mínimo o por debajo',
    columnas:['Código','Repuesto','Stock actual','Stock mínimo','Unidades para alcanzar el mínimo'],
    filas:alertas.map(p=>[p.codigo,p.nombre,p.stock,p.minimo,p.minimo-p.stock]),
    columnaAlerta:2,
    vacio:'Sin alertas de stock para el inventario actual.'
  };
}

export function resumenProspectos({leads}) {
  const estados=new Map();
  for(const lead of leads){
    const estado=pasos[lead.estado]||'Sin estado';
    estados.set(estado,(estados.get(estado)||0)+1);
  }
  return {
    metricas:[
      cantidad('Prospectos registrados',leads.length),
      cantidad('Prospectos activos',activos(leads).length),
      cantidad('Prospectos convertidos',leads.filter(l=>l.estado==='ganado').length)
    ],
    titulo:'Prospectos por estado de seguimiento',
    columnas:['Estado','Cantidad','% de prospectos'],
    porcentajes:[2],
    filas:[...estados].sort((a,b)=>b[1]-a[1]).map(([estado,total])=>[estado,total,total/leads.length])
  };
}
