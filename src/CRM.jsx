import React, {useState} from 'react';
import {Encabezado,Panel,Campo,Btn,Tabla} from './ui.jsx';
import {pasos,canales,coincide,moneda,formatearDia,hoy,id,activos} from './negocio.js';

const prioridades={Alta:0,Media:1,Baja:2};
const colores={Alta:'high',Media:'medium',Baja:'low'};

export function CRM({data,scores,mutate,ocupado}) {
  const [buscar,setBuscar]=useState('');
  const [form,setForm]=useState(false);
  const [error,setError]=useState('');
  const estimaciones=scores.data||{};
  const pasosPresentes=Object.entries(pasos).filter(([k])=>k!=='perdido'&&(k!=='cotizado'||data.leads.some(l=>l.estado===k)));
  const rows=data.leads.filter(l=>coincide(buscar,l.nombre,l.correo,l.modelo)).sort((a,b)=>
    (prioridades[estimaciones[a.id]?.prioridad]??3)-(prioridades[estimaciones[b.id]?.prioridad]??3)||
    (estimaciones[b.id]?.score||0)-(estimaciones[a.id]?.score||0));
  async function alta(event) {
    event.preventDefault();setError('');
    const f=Object.fromEntries(new FormData(event.currentTarget));
    if(!f.nombre.trim()||!f.modelo.trim()||!/^9\d{8}$/.test(f.telefono.trim())) return setError('Completa el nombre y el modelo. El celular debe tener 9 dígitos y empezar con 9.');
    const lead={id:id(),fechaRegistro:hoy(),nombre:f.nombre.trim(),telefono:f.telefono.trim(),canal:f.canal,modelo:f.modelo.trim(),precio:Number(f.precio),estado:f.estado,seguimientos:Number(f.seguimientos||0),proximo:f.proximo||'',motivo:f.motivo.trim()};
    if(await mutate(d=>d.leads.push(lead),'Prospecto guardado.'))setForm(false);
  }
  async function estado(lead,nuevo) {
    const motivo=nuevo==='perdido'?window.prompt('Motivo de pérdida (opcional):',lead.motivo||''):null;
    await mutate(d=>{const actual=d.leads.find(l=>l.id===lead.id);actual.estado=nuevo;if(motivo!==null)actual.motivo=motivo.trim();},'Estado actualizado.');
  }
  function seguimiento(lead) {
    mutate(d=>{const l=d.leads.find(x=>x.id===lead.id);l.seguimientos=(Number(l.seguimientos)||0)+1;if(['nuevo','cotizado'].includes(l.estado))l.estado='seguimiento';},'Seguimiento registrado.');
  }
  return <>
    <Encabezado titulo="CRM de prospectos" detalle="Consulta la prioridad estimada y registra el seguimiento de tus prospectos."><Btn tipo="primary" id="btnShowLeadForm" onClick={()=>{setForm(true);setError('');}}>+ Nuevo prospecto</Btn></Encabezado>
    {form&&<Panel titulo="Registrar contacto" id="leadFormPanel"><form id="leadForm" onSubmit={alta}><div className="form-grid">
      <Campo label="Nombre"><input required name="nombre" placeholder="Nombre del prospecto"/></Campo><Campo label="Celular"><input required name="telefono" inputMode="numeric" maxLength="9" placeholder="987654321"/></Campo>
      <Campo label="Canal de origen"><select name="canal">{canales.map(c=><option key={c}>{c}</option>)}</select></Campo><Campo label="Modelo consultado"><input required name="modelo" placeholder="Ej. Volt X2"/></Campo>
      <Campo label="Precio cotizado (S/)"><input required type="number" min="0" name="precio"/></Campo><Campo label="Estado"><select name="estado">{['nuevo','cotizado','seguimiento','ganado','perdido'].map(e=><option key={e} value={e}>{e==='ganado'?'Ganado':pasos[e]}</option>)}</select></Campo>
      <Campo label="N° seguimientos"><input type="number" min="0" defaultValue="0" name="seguimientos"/></Campo><Campo label="Próximo seguimiento"><input type="date" name="proximo"/></Campo><Campo label="Motivo de pérdida"><input name="motivo" placeholder="Solo si se perdió"/></Campo>
    </div>{error&&<p className="part-error" role="alert">{error}</p>}<Btn tipo="primary" type="submit" disabled={ocupado}>Guardar prospecto</Btn>{' '}<Btn id="btnCancelLead" onClick={()=>setForm(false)}>Cancelar</Btn></form></Panel>}
    <Panel titulo="Embudo comercial"><div className="funnel" id="funnel">{pasosPresentes.map(([k,lab])=><div className="funnel-step" key={k}>{lab}<br/><span className="mono" style={{fontSize:18}}>{data.leads.filter(l=>l.estado===k).length}</span></div>)}<div style={{marginLeft:14,fontSize:12,color:'var(--text-muted)'}}>Perdidos: <strong>{data.leads.filter(l=>l.estado==='perdido').length}</strong></div></div></Panel>
    <Panel titulo="Prospectos priorizados por el árbol de decisión">
      <div style={{marginBottom:12}}><Campo label="Buscar por nombre, correo o modelo"><input type="search" id="leadSearch" value={buscar} onChange={e=>setBuscar(e.target.value)}/></Campo></div>
      {scores.error&&<p className="part-error" role="alert">{scores.error}</p>}
      <Tabla id="leadTable" columns={['Prospecto','Canal','Modelo','Monto','Estado','Seg.','Próx. contacto','Prioridad estimada','']} empty={!rows.length?(data.leads.length?'No se encontraron prospectos.':'Aún no hay prospectos.'):null}>{rows.map(l=>{
        const sc=estimaciones[l.id];
        const tel=(l.telefono||'').replace(/\D/g,'');
        const vigente=activos([l]).length>0;
        return <tr key={l.id}><td><strong>{l.nombre}</strong>{tel&&<><br/><a href={`https://wa.me/${tel.length===9?'51'+tel:tel}`} target="_blank" rel="noopener" style={{fontSize:12,color:'var(--teal)'}}>{l.telefono} · WhatsApp</a></>}{l.correo&&<><br/><span className="ia-note dato-contacto">{l.correo}</span></>}</td>
          <td>{l.canal}</td><td>{l.modelo}</td><td className="mono">{(l.presupuesto??l.precio)==null?'—':moneda(l.presupuesto??l.precio)}<br/><span className="ia-price-type">{l.presupuesto==null?'Cotizado':'Presupuesto'}</span></td>
          <td><select aria-label="Estado del prospecto" style={{fontSize:12,padding:4,border:'1px solid var(--border)',borderRadius:6}} value={l.estado} disabled={ocupado} onChange={e=>estado(l,e.target.value)}>{Object.entries(pasos).map(([k,label])=><option key={k} value={k}>{label}</option>)}</select>{l.estado==='perdido'&&l.motivo&&<><br/><span className="ia-price-type">{l.motivo}</span></>}</td>
          <td className="mono">{l.seguimientos??'—'}</td><td>{formatearDia(l.proximo)}{vigente&&l.proximo&&l.proximo<hoy()&&<span style={{color:'#B42318',fontWeight:700,fontSize:11}}> VENCIDO</span>}</td>
          <td>{sc?<span className={`badge score ${colores[sc.prioridad]||''}`}>{sc.prioridad}</span>:'—'}</td><td style={{whiteSpace:'nowrap'}}>{vigente&&<button className="btn-danger-text" style={{color:'var(--text-muted)'}} disabled={ocupado} onClick={()=>seguimiento(l)}>+ Seguimiento</button>}<button className="btn-danger-text" disabled={ocupado} onClick={()=>window.confirm('¿Eliminar este prospecto?')&&mutate(d=>{d.leads=d.leads.filter(x=>x.id!==l.id);},'Prospecto eliminado.')}>Eliminar</button></td></tr>;
      })}</Tabla>
    </Panel>
  </>;
}
