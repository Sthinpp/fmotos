import React, {useState} from 'react';
import {Encabezado, Panel, Btn, Campo, Tabla} from './ui.jsx';
import {hoy, id, coincide, moneda, nombreMoto, formatearDia, repuestosActuales, suma, normalizar} from './negocio.js';

const colores = {ROJO:'#D63A3A', AZUL:'#2F6FDB', AMARILLO:'#E8C33A', VERDE:'#3FA535', NEGRO:'#222222', BLANCO:'#FFF', GRIS:'#9AA0A6', PLOMO:'#8A8F99', PLATA:'#BFC3C7', DORADO:'#C9A227', NARANJA:'#E8792E', MORADO:'#7B4FC9', CELESTE:'#4FB6E8', TURQUESA:'#2FB0A6', MARRON:'#7A4B2E', CREMA:'#E8DCC0', ROSADO:'#E88AB0'};

export function Inventario({data,mutate,ocupado,mostrar,verGrupos}) {
  const [tab,setTab]=useState('motos');
  const [form,setForm]=useState(false);
  const [filtro,setFiltro]=useState('todos');
  const [buscar,setBuscar]=useState('');
  const [error,setError]=useState('');
  const motos=data.motos.filter(m=>(filtro==='todos'||m.estado===filtro)&&coincide(buscar,m.marca,m.modelo,m.chasis,m.motor,m.color));
  const porModelo=new Map();
  for(const m of data.motos.filter(m=>m.estado==='disponible')) {
    const key=nombreMoto(m), grupo=porModelo.get(key)||{total:0,colores:new Map()}, tono=m.color||'Sin color';
    grupo.total++;
    grupo.colores.set(tono,(grupo.colores.get(tono)||0)+1);
    porModelo.set(key,grupo);
  }
  async function alta(event) {
    event.preventDefault();setError('');
    const target=event.currentTarget;
    const f=Object.fromEntries(new FormData(target));
    const moto={id:id(),marca:f.marca.trim(),modelo:f.modelo.trim(),color:f.color.trim(),chasis:f.chasis.trim().toUpperCase(),motor:f.motor.trim().toUpperCase(),proveedor:f.proveedor.trim(),precioCompra:Number(f.precioCompra),precioVentaSugerido:Number(f.precioVentaSugerido),fechaIngreso:f.fechaIngreso,estado:'disponible'};
    if(!/^[A-HJ-NPR-Z0-9]{17}$/.test(moto.chasis)) return setError('El chasis/VIN debe tener 17 caracteres alfanuméricos sin I, O ni Q.');
    if(moto.motor&&(!/^[A-Z0-9-]{6,20}$/.test(moto.motor))) return setError('El N° de motor debe tener de 6 a 20 caracteres.');
    if(!moto.marca||!moto.modelo||!moto.color) return setError('Completa la marca, el modelo y el color.');
    if(data.motos.some(m=>normalizar(m.chasis)===moto.chasis)) return setError('Ya existe una moto con ese chasis.');
    if(moto.motor&&data.motos.some(m=>normalizar(m.motor)===moto.motor)) return setError('Ya existe una moto con ese motor.');
    if(await mutate(d=>d.motos.push(moto),'Moto registrada en el stock.')) {
      if(f.lote) {for(const campo of ['color','chasis','motor'])target.elements[campo].value='';target.elements.chasis.focus();}
      else setForm(false);
    }
  }
  function eliminar(m) {
    if(window.confirm('¿Eliminar esta moto del inventario?')) mutate(d=>{d.motos=d.motos.filter(x=>x.id!==m.id);},'Moto eliminada.');
  }
  return <>
    <Encabezado titulo="Inventario">{tab==='motos'&&<Btn tipo="primary" id="btnShowInvForm" onClick={()=>{setForm(true);setError('');}}>+ Registrar moto</Btn>}</Encabezado>
    <div className="tipo-tabs" role="group" aria-label="Tipo de inventario">
      <button id="showMotorcycles" className={`tipo-tab${tab==='motos'?' active':''}`} aria-pressed={tab==='motos'} onClick={()=>setTab('motos')}>Motos</button>
      <button id="showParts" className={`tipo-tab${tab==='repuestos'?' active':''}`} aria-pressed={tab==='repuestos'} onClick={()=>setTab('repuestos')}>Repuestos</button>
    </div>
    <div id="inventoryMotos" hidden={tab!=='motos'}>
      {form&&<Panel id="invFormPanel"><form id="motoForm" onSubmit={alta}>
        <div className="form-grid">
          <Campo label="Marca"><input required name="marca" placeholder="Honda, Bajaj…"/></Campo><Campo label="Modelo"><input required name="modelo" placeholder="CB110, Boxer…"/></Campo>
          <Campo label="Color"><input required name="color" placeholder="Rojo"/></Campo><Campo label="N° de chasis / VIN"><input required name="chasis" maxLength="17" placeholder="17 caracteres (letras y números)"/></Campo>
          <Campo label="N° de motor"><input name="motor" maxLength="20" placeholder="6 a 20 caracteres"/></Campo><Campo label="Proveedor"><input name="proveedor" placeholder="Distribuidora XYZ"/></Campo>
          <Campo label="Precio de compra (S/)"><input required type="number" step="0.01" min="0" name="precioCompra"/></Campo><Campo label="Precio venta sugerido (S/)"><input type="number" step="0.01" min="0" name="precioVentaSugerido"/></Campo>
          <Campo label="Fecha de ingreso"><input required type="date" name="fechaIngreso" defaultValue={hoy()}/></Campo>
        </div>
        <label style={{display:'flex',alignItems:'center',gap:7,fontSize:12.5,color:'var(--text-muted)',marginBottom:12}}><input type="checkbox" id="chkLoteMoto" name="lote"/>Va a llegar más de una moto igual (mismo modelo/proveedor/precio) — mantener el formulario abierto para seguir agregando</label>
        {error&&<p role="alert" className="part-error">{error}</p>}<Btn tipo="primary" type="submit" disabled={ocupado}>Guardar moto</Btn>{' '}<Btn id="btnCancelInv1" onClick={()=>setForm(false)}>Cancelar</Btn>
      </form></Panel>}
      <Panel titulo="Resumen por modelo (motos disponibles)"><div id="resumenModelos" style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:12}}>
        {porModelo.size===0&&<div className="empty-state">No hay motos disponibles todavía.</div>}
        {[...porModelo].map(([nombre,g])=><div key={nombre} style={{border:'1px solid var(--border)',borderRadius:10,padding:'12px 14px'}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}><strong style={{fontSize:13.5}}>{nombre}</strong><span className="mono" style={{color:'var(--accent-dark)',fontWeight:700}}>{g.total}</span></div>
          {[...g.colores].map(([c,n])=><span key={c} style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:12,color:'var(--text-muted)',marginRight:10}}><i style={{width:9,height:9,borderRadius:'50%',background:colores[normalizar(c)]||'#9AA0A6',border:'1px solid #0002'}}/>{c} ({n})</span>)}
        </div>)}
      </div></Panel>
      <Panel titulo={<><span>Stock</span><select className="entrada-caja" id="filterTipo" aria-label="Estado de la moto" value={filtro} onChange={e=>setFiltro(e.target.value)}><option value="todos">Todas</option><option value="disponible">Disponibles</option><option value="vendida">Vendidas</option></select></>}>
        <input type="search" className="filtro-ancho" id="invSearch" placeholder="Buscar por chasis, marca, modelo, motor o color…" value={buscar} onChange={e=>setBuscar(e.target.value)}/>
        <Tabla id="invTable" columns={['Moto','Chasis / VIN','Motor','Proveedor','P. Compra','P. Venta sug.','Ingreso','Estado','']} empty={!motos.length?'No se encontraron motos.':null}>{motos.map(m=><tr key={m.id}>
          <td><strong>{nombreMoto(m)}</strong><br/><span className="ia-note">{m.color||'—'}</span></td><td className="mono">{m.chasis||'—'}</td><td className="mono">{m.motor||'—'}</td><td>{m.proveedor||'—'}</td>
          <td className="mono">{moneda(m.precioCompra)}</td><td className="mono">{moneda(m.precioVentaSugerido)}</td><td>{formatearDia(m.fechaIngreso)}</td><td><span className={`badge badge-${m.estado}`}>{m.estado==='disponible'?'Disponible':'Vendida'}</span></td>
          <td>{m.estado==='disponible'&&<button className="btn-danger-text" disabled={ocupado} onClick={()=>eliminar(m)}>Eliminar</button>}</td>
        </tr>)}</Tabla>
      </Panel>
    </div>
    <div hidden={tab!=='repuestos'}><Repuestos data={data} mutate={mutate} ocupado={ocupado} mostrar={mostrar} verGrupos={verGrupos}/></div>
  </>;
}

function Repuestos({data,mutate,ocupado,verGrupos}) {
  const [buscar,setBuscar]=useState('');
  const [bajo,setBajo]=useState(false);
  const [codigo,setCodigo]=useState('');
  const [abierto,setAbierto]=useState(false);
  const [error,setError]=useState('');
  const [minimo,setMinimo]=useState('');
  const repuestos=repuestosActuales(data);
  const seleccion=repuestos.find(p=>p.codigo===codigo);
  const filas=repuestos.filter(p=>(!bajo||p.stock<=p.minimo)&&coincide(buscar,p.codigo,p.nombre,p.categoria));
  const limite=repuestos.filter(p=>p.stock<=p.minimo).length;
  const nombres=new Map(repuestos.map(p=>[p.codigo,p.nombre]));
  function elegir(codigo) {
    setCodigo(codigo);setMinimo(String(repuestos.find(p=>p.codigo===codigo)?.minimo??5));setError('');
  }
  function abrir(codigo) {
    if(!codigo) return;
    elegir(codigo);setAbierto(true);
    requestAnimationFrame(()=>{document.getElementById('partEditor')?.scrollIntoView({block:'nearest'});document.getElementById('partMoveCode')?.focus({preventScroll:true});});
  }
  async function movimiento(event) {
    event.preventDefault();setError('');
    const form=event.currentTarget;
    const fd=new FormData(form), unidades=Number(fd.get('unidades')), tipo=fd.get('tipo');
    if(!seleccion||!Number.isSafeInteger(unidades)||unidades<1) return setError('Selecciona un repuesto e ingresa una cantidad entera de al menos una unidad.');
    const saldo=seleccion.stock+(tipo==='entrada'?unidades:-unidades);
    if(saldo<0||!Number.isSafeInteger(saldo)) return setError(saldo<0?`La salida supera el stock disponible de ${seleccion.stock} unidades.`:'La cantidad supera el límite permitido.');
    if(await mutate(d=>d.movimientosRepuestos.push({id:id(),codigo,tipo,unidades,saldo,fecha:hoy(),motivo:fd.get('motivo').trim()}),saldo<=seleccion.minimo?'Movimiento registrado. El repuesto está en stock bajo.':'Movimiento registrado.')) {
      form.elements.unidades.value='';form.elements.motivo.value='';
    }
  }
  async function guardarMinimo(event) {
    event.preventDefault();setError('');
    const valor=Number(minimo);
    if(!seleccion||minimo===''||!Number.isSafeInteger(valor)||valor<0) return setError('Ingresa un stock mínimo entero de cero o más unidades.');
    await mutate(d=>{d.repuestos.find(p=>p.codigo===codigo).minimo=valor;},'Stock mínimo actualizado.');
  }
  return <Panel id="inventoryParts" titulo={<><span>Inventario de repuestos</span><span className="part-actions"><Btn id="btnViewPartGroups" onClick={verGrupos}>Ver grupos K-Means</Btn><Btn tipo="primary" id="btnPartMovement" disabled={!repuestos.length} aria-controls="partEditor" aria-expanded={abierto} onClick={()=>abrir(codigo||repuestos[0]?.codigo)}>Registrar movimiento</Btn></span></>}>
    {abierto&&<section id="partEditor" className="part-editor"><h4 className="panel-title">Movimiento de repuestos</h4>
      <Campo label="Repuesto"><select id="partMoveCode" value={codigo} onChange={e=>elegir(e.target.value)}>{repuestos.map(p=><option key={p.codigo} value={p.codigo}>{p.codigo} · {p.nombre}</option>)}</select></Campo>
      <p className="ia-note" id="partSelectedStock" aria-live="polite">{seleccion?`${seleccion.stock} disponibles · Mínimo ${seleccion.minimo}`:'Sin repuestos disponibles.'}</p>
      <form id="partMovementForm" onSubmit={movimiento} key={codigo}><div className="form-grid">
        <Campo label="Movimiento"><select name="tipo" id="partMoveType"><option value="entrada">Entrada</option><option value="salida">Salida</option></select></Campo>
        <Campo label="Unidades"><input type="number" id="partMoveUnits" name="unidades" min="1" step="1" required/></Campo>
        <Campo label="Motivo (opcional)"><input id="partMoveNote" name="motivo" maxLength="160"/></Campo></div>
        <Btn tipo="primary" type="submit" disabled={ocupado}>Guardar movimiento</Btn>{' '}<Btn id="btnClosePartMovement" onClick={()=>{setAbierto(false);document.getElementById('btnPartMovement')?.focus();}}>Cerrar</Btn>
      </form>
      <form id="partMinimumForm" className="part-minimum-form" onSubmit={guardarMinimo}><Campo label="Stock mínimo"><input id="partMinStock" min="0" step="1" type="number" required value={minimo} onChange={e=>setMinimo(e.target.value)}/></Campo><Btn type="submit" disabled={ocupado}>Guardar mínimo</Btn></form>
      {error&&<p className="part-error" id="partMovementError" role="alert">{error}</p>}
    </section>}
    <div className="part-filters"><p className="ia-note" id="partsSummary">{filas.length} referencias · {suma(filas,p=>p.stock)} unidades</p><label className="part-low-toggle"><input id="partLowOnly" type="checkbox" checked={bajo} onChange={e=>setBajo(e.target.checked)}/> <span id="partAlertSummary">Stock bajo ({limite})</span></label></div>
    <div style={{margin:'12px 0'}}><Campo label="Buscar por código, nombre o categoría"><input id="partSearch" type="search" value={buscar} onChange={e=>setBuscar(e.target.value)}/></Campo></div>
    <p className="ia-note ia-mobile-note">Desliza la tabla para ver los precios.</p>
    <Tabla id="partsTable" label="Catálogo de repuestos" columns={['Repuesto','Stock','Código','Categoría','Compra','Venta']} empty={!filas.length?'Sin repuestos para mostrar.':null}>{filas.map(p=><tr key={p.codigo}>
      <td><button type="button" className="part-item" data-part-code={p.codigo} onClick={()=>abrir(p.codigo)}>{p.nombre}</button></td><td className="mono"><strong>{p.stock}</strong><br/><span className="ia-price-type">Mín. {p.minimo}</span>{p.stock<=p.minimo&&<span className="badge part-stock-alert">{p.stock===0?'Agotado':'Stock bajo'}</span>}</td>
      <td className="mono">{p.codigo}</td><td>{p.categoria}</td><td className="mono">{moneda(p.compra)}</td><td className="mono">{moneda(p.venta)}</td></tr>)}</Tabla>
    <details className="ia-method"><summary>Historial de movimientos</summary><div style={{marginTop:10}}><Tabla id="partHistory" label="Historial de movimientos" columns={['Fecha','Repuesto','Movimiento','Unidades','Saldo','Motivo']} empty={!data.movimientosRepuestos.length?'Aún no hay movimientos registrados.':null}>
      {[...data.movimientosRepuestos].reverse().map((m,i)=><tr key={m.id||i}><td>{formatearDia(m.fecha)}</td><td>{nombres.get(m.codigo)||m.codigo}</td><td>{m.tipo==='entrada'?'Entrada':'Salida'}</td><td className="mono">{m.unidades}</td><td className="mono">{m.saldo}</td><td>{m.motivo||'—'}</td></tr>)}
    </Tabla></div></details>
  </Panel>;
}
