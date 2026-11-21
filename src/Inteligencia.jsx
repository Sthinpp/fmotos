import React, {useState} from 'react';
import {useConsulta} from './conexion.js';
import {mesEtiqueta, desplazarMes, hoy, suma, numero, moneda, activos, centavos, formatearDia} from './negocio.js';
import {Encabezado, Panel, Opcion, Campo, Btn, KPI, Indicador, Tabla, EstadoCarga} from './ui.jsx';

const etiquetasMoto=n=>`${numero(n)} ${n===1?'moto':'motos'}`;
const porc=new Intl.NumberFormat('es-PE',{style:'percent',maximumFractionDigits:0});

export function Inteligencia({data,scores,token,revision,activo}) {
  const actual=hoy().slice(0,7);
  const periodos=[actual,desplazarMes(actual,1)];
  const [mes,setMes]=useState('');
  const [modelo,setModelo]=useState('');
  const [presupuesto,setPresupuesto]=useState('15000');
  const [reserva,setReserva]=useState('25');
  const [opciones,setOpciones]=useState({presupuesto:1500000,reserva:25});
  const [k,setK]=useState('3');
  const target=periodos.includes(mes)?mes:actual;
  const query=new URLSearchParams({mes:target,actual});
  const pronostico=useConsulta(`/ia/pronostico?${query}`,token,revision,activo);
  const reposicion=useConsulta(`/ia/reposicion?${query}&presupuesto=${opciones.presupuesto}&reserva=${opciones.reserva}`,token,revision,activo);
  const clusters=useConsulta(`/ia/repuestos?k=${k}`,token,revision,activo);
  const leadsActivos=activos(data.leads);
  const ganados=data.leads.filter(l=>l.estado==='ganado').length;
  const vencidos=leadsActivos.filter(l=>l.proximo&&l.proximo<hoy()).length;
  const altos=leadsActivos.filter(l=>scores.data?.[l.id]?.prioridad==='Alta').length;
  return <>
    <Encabezado titulo="Inteligencia comercial"/>
    <Panel titulo={<><span>Ventas y proyección</span><span className="forecast-controls">
      <Opcion label="Mes a proyectar" id="forecastPeriod" value={target} onChange={e=>setMes(e.target.value)} options={periodos.map(m=>[m,mesEtiqueta(m)])}/>
      <Opcion label="Modelo" id="forecastModel" value={modelo} onChange={e=>setModelo(e.target.value)} options={[["",'Todos'],...(pronostico.data?.rows||[]).map(r=>r.key)]}/>
    </span></>}>
      {pronostico.data?<Proyeccion resultado={pronostico.data} modelo={modelo}/>:<EstadoCarga error={pronostico.error}/>}
    </Panel>
    <Panel titulo="Reposición · Hill Climbing y A*">
      <form id="searchForm" className="ia-controls" onSubmit={e=>{e.preventDefault();setOpciones({presupuesto:centavos(presupuesto),reserva:Number(reserva)});}}>
        <Campo label="Presupuesto (S/)"><input id="searchBudget" type="number" min="0" max="10000000" step="0.01" value={presupuesto} onChange={e=>setPresupuesto(e.target.value)} required/></Campo>
        <Campo label="Reserva sobre prospectos (%)"><input id="searchReserve" type="number" min="0" max="100" step="1" value={reserva} onChange={e=>setReserva(e.target.value)} required/></Campo>
        <Btn tipo="primary" type="submit">Comparar planes</Btn>
      </form>
      <div id="searchResults" aria-live="polite">{reposicion.data?<Reposicion resultado={reposicion.data} mes={target} reserva={opciones.reserva} corte={data.corteInventario}/>:<EstadoCarga error={reposicion.error}/>}</div>
    </Panel>
    <Panel titulo="Prospectos · Árbol de decisión"><div className="kpi-grid" id="iaKpis">
      <KPI label="Prospectos activos" value={leadsActivos.length}/><KPI kind="accent" label="Prioridad alta" value={scores.data?altos:'—'}/>
      <KPI label="Seguimientos vencidos" value={vencidos}/><KPI kind="teal" label="Conversión registrada" value={data.leads.length?porc.format(ganados/data.leads.length):'—'} sub={`${ganados} de ${data.leads.length}`}/>
    </div>{scores.error&&<p className="part-error" role="alert">{scores.error}</p>}</Panel>
    <Panel id="partsClusters" tabIndex={-1} titulo={<><span>Repuestos · K-Means</span><Opcion label="Grupos" id="clusterK" value={k} options={['2','3','4']} onChange={e=>setK(e.target.value)}/></>}>
      <div id="clusterResults" aria-live="polite">{clusters.data?<>
        <p className="ia-note ia-mobile-note">Desliza la tabla para ver las referencias de cada grupo.</p>
        <Tabla label="Tabla de grupos de repuestos" columns={['Grupo','Referencias','Stock medio','Precio medio','Referencias asignadas']} empty={!clusters.data.length?'No hay datos de repuestos.':null}>{clusters.data.map((grupo,i)=><tr key={i}>
          <td><strong>{i+1}</strong></td><td className="mono">{grupo.parts.length}</td><td className="mono">{numero(grupo.stock)}</td><td className="mono">{moneda(grupo.precio)}</td>
          <td><details className="ia-method ia-parts-list"><summary>Ver repuestos</summary><ul>{grupo.parts.map(p=><li key={p.codigo}>{p.codigo} · {p.nombre}</li>)}</ul></details></td></tr>)}</Tabla>
      </>:<EstadoCarga error={clusters.error}/>}</div>
    </Panel>
  </>;
}

function Proyeccion({resultado,modelo}) {
  const {months,target,lastClosedMonth,rows}=resultado;
  const visible=modelo&&rows.some(r=>r.key===modelo)?rows.filter(r=>r.key===modelo):rows;
  const proyectadas=visible.map(r=>r.projectedUnits).filter(v=>v!==null);
  const proyeccion=proyectadas.length?suma(proyectadas):null;
  const registradas=suma(visible,r=>r.registered);
  const barras=Array.from({length:8},(_,i)=>desplazarMes(target,i-7)).map(m=>[m,m===target?proyeccion:months.includes(m)?suma(visible,r=>r.history[m]||0):null]);
  const max=Math.max(1,...barras.map(([,n])=>n||0));
  const anterior=desplazarMes(target,-1);
  return <>
    <p className="ia-note" id="forecastHistory">Regresión lineal{lastClosedMonth&&` · Ventas hasta ${mesEtiqueta(lastClosedMonth)}`}</p>
    <div className="ia-metrics" id="forecastKpis" aria-live="polite"><Indicador value={proyeccion===null?'—':etiquetasMoto(proyeccion)} label={`Proyección · ${mesEtiqueta(target)}`}/>
      {registradas>0&&<Indicador value={etiquetasMoto(registradas)} label="Ventas registradas en el mes"/>}
      {registradas>0&&proyeccion>0&&<Indicador value={porc.format(registradas/proyeccion)} label="Avance sobre la proyección"><progress className="forecast-progress" value={Math.min(registradas,proyeccion)} max={proyeccion} aria-label="Avance sobre la proyección"/></Indicador>}
    </div>
    <div className="ia-forecast-chart" id="forecastChart" role="group" aria-label="Ventas mensuales en unidades">{barras.map(([m,n])=>{
      const tipo=n===null?'none':m===target?'estimate':'actual';
      const label=`${mesEtiqueta(m)} · ${n===null?'Sin datos':`${etiquetasMoto(n)} (${m===target?'proyección':'real'})`}`;
      return <figure key={m} className={`ia-bar ia-${tipo}`} role="img" aria-label={label} title={label}><b>{n??'—'}</b><i style={{height:Math.max(3, Math.round((n||0)/max*122))}}/><figcaption>{mesEtiqueta(m).slice(0,3)}</figcaption></figure>;
    })}</div>
    <div className="ia-chart-legend"><span><i className="ia-actual"/> Ventas registradas</span><span><i className="ia-estimate"/> Mes proyectado</span></div>
    <Tabla id="forecastTable" label="Pronóstico por modelo" columns={['Modelo',`${mesEtiqueta(anterior).slice(0,3)}. registrado`,`${mesEtiqueta(target).slice(0,3)}. proyectado`,'Stock']} empty={!visible.length?'Sin modelos.':null}>
      {visible.map(r=><tr key={r.key}><td><strong>{r.key}</strong></td><td className="mono">{r.history[anterior]??'—'}</td><td className="mono"><strong>{r.projectedUnits??'—'}</strong></td><td className="mono">{r.stock}</td></tr>)}
    </Tabla>
  </>;
}

function Reposicion({resultado,mes,reserva,corte}) {
  const {models,keys,hill,star}=resultado;
  if(!models.length) return <p className="ia-note">El plan se habilita cuando hay un pronóstico por modelo.</p>;
  return <><div className="ia-metrics">
    <Indicador value={moneda(hill.spend/100)} label={`Hill Climbing · ${etiquetasMoto(suma(hill.quantities))} por comprar`}/>
    <Indicador value={moneda(star.spend/100)} label={`A* · ${etiquetasMoto(suma(star.quantities))} por comprar`}/>
  </div><p className="ia-note">Meta para {mesEtiqueta(mes)} con {reserva}% de reserva · Inventario base al {formatearDia(corte)}.</p>
    <p className="ia-note ia-mobile-note">Desliza la tabla para comparar las cantidades de compra.</p>
    <Tabla label="Tabla de planes de reposición" columns={['Modelo','Meta','Stock','Faltan','Costo unitario','Hill Climbing','A*']}>{models.map(r=><tr key={r.key}>
      <td><strong>{r.key}</strong></td><td className="mono">{r.target}</td><td className="mono">{r.stock}</td><td className="mono">{r.gap}</td>
      <td className="mono">{r.cost?moneda(r.cost/100):'Sin costo'}</td><td className="mono">{r.cost?(hill.quantities[keys.indexOf(r.key)]??0):'—'}</td><td className="mono">{r.cost?(star.quantities[keys.indexOf(r.key)]??0):'—'}</td></tr>)}</Tabla>
  </>;
}
