import React from 'react';
import {moneda} from './negocio.js';

export function Encabezado({titulo, detalle, children}) {
  return <div className="page-header"><div><h1>{titulo}</h1>{detalle && <p>{detalle}</p>}</div>{children}</div>;
}
export function Panel({titulo, children, id, ...attrs}) {
  return <div className="panel" id={id} {...attrs}>{titulo && <h3 className="panel-title">{titulo}</h3>}{children}</div>;
}
export function Campo({label,children,style}) {
  return <label className="field" style={style}><span className="field-caption">{label}</span>{children}</label>;
}
export function Opcion({label,options,...attributes}) {
  return <label className="ia-select">{label} <select {...attributes}>{options.map(item=>{
    const [value,text] = Array.isArray(item) ? item : [item,item];
    return <option key={value} value={value}>{text}</option>;
  })}</select></label>;
}
export function Btn({tipo='secondary',children,...attributes}) {
  return <button type="button" className={`btn btn-${tipo}`} {...attributes}>{children}</button>;
}
export function KPI({label,value,sub,kind='',money=false,children}) {
  return <div className={`kpi-card ${kind}`}><div className="kpi-label">{label}</div><div className="kpi-value" style={money?{fontSize:20}:undefined}>{value}</div>{sub && <div className="kpi-sub">{sub}</div>}{children}</div>;
}
export function Indicador({value,label,children}) {
  return <div className="insight"><div className="metric">{value}</div><p>{label}</p>{children}</div>;
}
export function Tabla({id,columns,children,empty,label}) {
  return <div className="table-wrap" tabIndex={label?0:undefined} aria-label={label} role={label?'region':undefined}><table id={id}>
    <thead><tr>{columns.map((col,i)=><th key={i} scope="col">{col}</th>)}</tr></thead>
    <tbody>{empty ? <tr><td className="empty-state" colSpan={columns.length}>{empty}</td></tr> : children}</tbody>
  </table></div>;
}
export function EstadoCarga({error}) {
  return <p role={error?'alert':'status'} className={error?'part-error':'ia-note'}>{error || 'Calculando…'}</p>;
}
export function PagosVista({venta}) {
  if(venta.pagos?.length>1) return venta.pagos.map((p,i)=><div key={i} style={{whiteSpace:'nowrap'}}>{p.metodo} <span className="mono" style={{fontSize:11.5,color:'var(--text-muted)'}}>{moneda(p.monto)}</span></div>);
  return venta.pagos?.[0]?.metodo||venta.metodoPago||'—';
}
