import React, {useState} from 'react';
import {mesesRegistrados, mesEtiqueta, desplazarMes, mesesLargos, suma, moneda, hoy, nombreMoto, modeloVenta, normalizar, pagos, metodos, formatearDia} from './negocio.js';
import {Encabezado, Panel, Opcion, KPI, Tabla, PagosVista} from './ui.jsx';

const formatoPorcentaje = new Intl.NumberFormat('es-PE',{style:'percent',maximumFractionDigits:1,signDisplay:'exceptZero'});
const ganancia = v => (Number(v.precioVenta)||0) - (Number(v.precioCompra)||0);
function Delta({actual,anterior,mes,formato}) {
  if(!mes) return null;
  const cambio=actual-anterior;
  return <div className={`kpi-sub dashboard-delta ${cambio<0?'down':cambio>0?'up':''}`}>{anterior>0?formatoPorcentaje.format(cambio/anterior):`${cambio>0?'+':''}${formato(cambio)}`} vs. {mesEtiqueta(mes)}</div>;
}

export function Dashboard({data}) {
  const meses=mesesRegistrados(data);
  const [seleccion,setSeleccion] = useState('');
  const [comparar,setComparar] = useState(null);
  const [periodoCaja,setPeriodoCaja] = useState('mes');
  const [fechaCaja,setFechaCaja] = useState('');
  const mes=meses.includes(seleccion)?seleccion:meses.at(-1)||hoy().slice(0,7);
  const paraMes = periodo => data.ventas.filter(v=>v.fecha?.startsWith(periodo));
  const ventas=paraMes(mes);
  const stock=data.motos.filter(m=>m.estado==='disponible');
  const otros=meses.filter(m=>m!==mes);
  const anterior=comparar==='' || otros.includes(comparar) ? comparar : otros.filter(m=>m<mes).at(-1)||'';
  const base=anterior?paraMes(anterior):[];
  const final=meses.at(-1)||mes;
  const fin=final<desplazarMes(mes,5)?final:desplazarMes(mes,5);
  const barras=Array.from({length:6},(_,i)=>desplazarMes(fin,i-5)).map(key=>[key,meses.includes(key)?paraMes(key).length:null]);
  const max=Math.max(1,...barras.map(([,n])=>n||0));
  const conteos=new Map();
  const catalogo=new Map();
  for(const m of data.motos) if(!catalogo.has(normalizar(m.modelo))) catalogo.set(normalizar(m.modelo),nombreMoto(m));
  ventas.forEach(v=>{
    const texto=normalizar(modeloVenta(v));
    const canonical=[...catalogo.keys()].find(key=>texto===key||texto.endsWith(` ${key}`));
    const key=catalogo.get(canonical)||texto;
    conteos.set(key,(conteos.get(key)||0)+1);
  });
  const top=[...conteos].sort((a,b)=>b[1]-a[1]).slice(0,5);
  function elegirMes(valor) {
    setSeleccion(valor);
    setPeriodoCaja('mes');
    setFechaCaja(paraMes(valor).map(v=>v.fecha).sort().at(-1)||`${valor}-01`);
  }
  const caja=fechaCaja || ventas.map(v=>v.fecha).sort().at(-1) || `${mes}-01`;
  return <>
    <Encabezado titulo="Dashboard" detalle="Resumen general del negocio"><div className="dashboard-controls">
      <Opcion label="Mes" id="dashboardMonth" value={mes} onChange={e=>elegirMes(e.target.value)} options={[...(meses.length?meses:[mes])].reverse().map(m=>[m,mesEtiqueta(m)])}/>
      <Opcion label="Comparar con" id="dashboardCompare" value={anterior} onChange={e=>setComparar(e.target.value)} options={[["",'Sin comparar'],...[...otros].reverse().map(m=>[m,mesEtiqueta(m)])]}/>
    </div></Encabezado>
    <div className="kpi-grid" id="kpiGrid">
      <KPI label="Stock disponible" value={stock.length} sub="motos en almacén"/>
      <KPI label="Valor del inventario" money value={moneda(suma(stock,m=>Number(m.precioCompra)||0))} sub="a precio de compra"/>
      <KPI kind="accent" label={`Ventas · ${mesEtiqueta(mes)}`} value={ventas.length} sub={`${moneda(suma(ventas,v=>Number(v.precioVenta)||0))} facturado`}>
        <Delta actual={ventas.length} anterior={base.length} mes={anterior} formato={n=>`${n} motos`}/></KPI>
      <KPI kind="teal" money label={`Ganancia · ${mesEtiqueta(mes)}`} value={moneda(suma(ventas,ganancia))} sub="venta − compra">
        <Delta actual={suma(ventas,ganancia)} anterior={suma(base,ganancia)} mes={anterior} formato={moneda}/></KPI>
    </div>
    <div className="two-col" id="dashboardSales">
      <Panel titulo="Ventas por mes"><div className="chart-wrap" id="chartWrap">{barras.map(([key,n])=><button key={key} className="chart-col chart-month" type="button" data-dashboard-month={key} aria-pressed={key===mes} disabled={n===null} onClick={()=>elegirMes(key)} aria-label={`${mesEtiqueta(key)} · ${n===null?'Sin registros':`${n} ventas`}`}>
        <span className="chart-val">{n??'—'}</span><span className="chart-bar" style={{height:Math.round((n||0)/max*112)||3}}/><span className="chart-label">{mesEtiqueta(key).slice(0,3)}</span>
      </button>)}</div></Panel>
      <Panel titulo={<span id="topModelosTitle">Modelos más vendidos · {mesEtiqueta(mes)}</span>}><div id="topModelos">{top.length ? top.map(([nombre,n])=><div key={nombre} style={{marginBottom:12}}>
        <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:5}}><span>{nombre}</span><span className="mono" style={{fontWeight:600}}>{n}</span></div>
        <div style={{background:'#F0F1F3',borderRadius:6,height:7,overflow:'hidden'}}><div style={{background:'var(--accent)',height:'100%',width:`${n/top[0][1]*100}%`}}/></div></div>):<div className="empty-state">El mes seleccionado no tiene ventas registradas.</div>}</div></Panel>
    </div>
    <Caja ventas={data.ventas} fecha={caja} periodo={periodoCaja} setFecha={setFechaCaja} setPeriodo={setPeriodoCaja}/>
  </>;
}

function Caja({ventas,fecha,periodo,setFecha,setPeriodo}) {
  const seleccion=ventas.filter(v=>periodo==='dia'?v.fecha===fecha:v.fecha?.startsWith(fecha.slice(0,7))).sort((a,b)=>b.fecha.localeCompare(a.fecha));
  const grupos=new Map();
  for(const venta of seleccion) for(const p of pagos(venta)) {
    const anterior=grupos.get(p.metodo)||{monto:0,count:0};
    grupos.set(p.metodo,{monto:anterior.monto+(Number(p.monto)||0),count:anterior.count+1});
  }
  const total=suma([...grupos.values()],x=>x.monto);
  const digital=suma(['Yape','Plin','Transferencia','Tarjeta','Yape/Plin'],x=>grupos.get(x)?.monto||0);
  const etiqueta=periodo==='dia'?formatearDia(fecha):`${mesesLargos[Number(fecha.slice(5,7))-1]} ${fecha.slice(0,4)}`;
  const orden=[...metodos.filter(m=>grupos.has(m)),...[...grupos.keys()].filter(m=>!metodos.includes(m))];
  return <Panel id="cajaPanel" titulo={<><span>Caja</span><span style={{display:'flex',gap:8,alignItems:'center'}}>
    <select id="cajaPeriodo" aria-label="Período de caja" className="entrada-caja" value={periodo} onChange={e=>setPeriodo(e.target.value)}><option value="dia">Día</option><option value="mes">Mes</option></select>
    <input type="date" id="cajaFecha" aria-label="Fecha de caja" className="entrada-caja" value={fecha} onChange={e=>setFecha(e.target.value)}/></span></>}>
    <div id="cajaBody">{!seleccion.length?<div className="empty-state">Sin ventas registradas en {periodo==='dia'?'el día':'el mes'} {etiqueta}.</div>:<>
      <div className="kpi-grid" style={{marginBottom:16}}><KPI kind="accent" money label="Efectivo en caja" value={moneda(grupos.get('Efectivo')?.monto)} sub="para cuadrar el cajón"/><KPI kind="teal" money label="Digital" value={moneda(digital)} sub="Yape, Plin, transf., tarjeta"/><KPI money label={`Total ${etiqueta}`} value={moneda(total)} sub={`${seleccion.length} venta(s)`}/></div>
      <Tabla columns={['Método','Monto','%','N° pagos']}>{orden.map(m=><tr key={m}><td><strong>{m}</strong></td><td className="mono">{moneda(grupos.get(m).monto)}</td><td className="mono">{total?Math.round(grupos.get(m).monto/total*100):0}%</td><td className="mono">{grupos.get(m).count}</td></tr>)}</Tabla>
      <div style={{marginTop:14}}><Tabla columns={['Fecha','Cliente','Moto','Pagos']}>{seleccion.map(v=><tr key={v.id}><td>{formatearDia(v.fecha)}</td><td>{v.cliente}</td><td>{v.motoDesc}</td><td><PagosVista venta={v}/></td></tr>)}</Tabla></div>
      <p className="ia-note" style={{marginTop:10}}>Incluye solo ventas de motos registradas en el sistema.</p>
    </>}</div>
  </Panel>;
}
