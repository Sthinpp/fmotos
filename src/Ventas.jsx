import React, {useState} from 'react';
import {Encabezado,Panel,Campo,Btn,Tabla,PagosVista} from './ui.jsx';
import {hoy,id,centavos,moneda,formatearDia,nombreMoto,coincide,validarDocumento,limpiarDocumento,pagos,pagosTexto,metodos} from './negocio.js';

function datosFormulario(venta,stock) {
  return {
    motoId:venta?.motoId||stock[0]?.id||'', tipoDocumento:venta?.tipoDocumento||'DNI', numeroDocumento:venta?.numeroDocumento||'',
    ruc:venta?.ruc||'', cliente:venta?.cliente||'', telefono:venta?.telefono||'', correo:venta?.correo||'', direccion:venta?.direccion||'',
    precioVenta:venta?.precioVenta??'', pagos:venta?pagos(venta).map(p=>({...p})):[{metodo:'Efectivo',monto:''}], fecha:venta?.fecha||hoy(),
    tipoComprobante:venta?.tipoComprobante||'Boleta',facturaRuc:venta?.facturaRuc||'',razonSocial:venta?.razonSocial||'',
  };
}

export function Ventas({data,mutate,ocupado,mostrar}) {
  const [buscar,setBuscar]=useState('');
  const [detalle,setDetalle]=useState(null);
  const [form,setForm]=useState(null);
  const stock=data.motos.filter(m=>m.estado==='disponible');
  const filas=data.ventas.filter(v=>coincide(buscar,v.cliente,v.numeroDocumento,v.motoDesc,v.chasis)).sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||''));
  function nueva() {
    if(!stock.length) return mostrar('No hay motos disponibles para registrar una venta.');
    setForm({id:'nueva',venta:null});
  }
  function anular(venta) {
    if(!window.confirm('¿Eliminar esta venta? La moto volverá a estar disponible.'))return;
    mutate(d=>{
      const guardada=d.ventas.find(v=>v.id===venta.id);
      if(!guardada||guardada.fuente==='excel')throw new Error('La venta no puede anularse.');
      const moto=d.motos.find(m=>m.id===guardada.motoId);
      if(moto)moto.estado='disponible';
      d.ventas=d.ventas.filter(v=>v.id!==guardada.id);
    },'Venta eliminada. Moto devuelta al stock.');
  }
  return <>
    <Encabezado titulo="Ventas" detalle="Registrar y consultar ventas de motos"><Btn tipo="primary" id="btnShowVentaForm" onClick={nueva}>+ Registrar venta</Btn></Encabezado>
    {form&&<VentaForm key={form.id} venta={form.venta} stock={stock} data={data} mutate={mutate} ocupado={ocupado} cerrar={()=>setForm(null)}/>}
    <Panel titulo="Historial de ventas">
      <input type="search" className="filtro-ancho" id="ventaSearch" placeholder="Buscar por cliente, documento, moto o VIN…" value={buscar} onChange={e=>setBuscar(e.target.value)}/>
      <Tabla id="ventaTable" columns={['Fecha','Moto','Cliente','Comprobante','P. Venta','Ganancia','Pago','']} empty={!filas.length?'No se encontraron ventas.':null}>{filas.map(v=>{
        const ganancia=(Number(v.precioVenta)||0)-(Number(v.precioCompra)||0);
        return <React.Fragment key={v.id}><tr>
          <td>{formatearDia(v.fecha)}</td><td><strong>{v.motoDesc}</strong><br/><span className="mono ia-note">{v.chasis||''}</span></td>
          <td><strong>{v.cliente}</strong>{v.numeroDocumento&&<><br/><span className="ia-price-type">{v.tipoDocumento||'Documento'} {v.numeroDocumento}</span></>}</td>
          <td><span className="badge" style={{background:v.tipoComprobante==='Factura'?'var(--accent-soft)':'var(--teal-soft)',color:v.tipoComprobante==='Factura'?'var(--accent-dark)':'var(--teal)'}}>{v.tipoComprobante||'Boleta'}</span></td>
          <td className="mono">{moneda(v.precioVenta)}</td><td className="mono" style={{color:ganancia>=0?'var(--teal)':'var(--accent-dark)'}}>{moneda(ganancia)}</td><td><PagosVista venta={v}/></td>
          <td><button className="btn-danger-text" style={{color:'var(--text-muted)'}} onClick={()=>setDetalle(detalle===v.id?null:v.id)} aria-expanded={detalle===v.id}>Ver ficha</button>
            {v.fuente==='excel'?<span className="ia-price-type">Excel</span>:<><button className="btn-danger-text" style={{color:'var(--teal)'}} disabled={ocupado} onClick={()=>{setForm({id:v.id,venta:v});requestAnimationFrame(()=>document.getElementById('ventaFormPanel')?.scrollIntoView({block:'start'}));}}>Editar</button><button className="btn-danger-text" disabled={ocupado} onClick={()=>anular(v)}>Anular</button></>}
          </td></tr>{detalle===v.id&&<tr id={`detalle-${v.id}`} style={{background:'#FAFAFB'}}><td colSpan={8} style={{padding:'14px 16px'}}><div className="ficha-venta">
            <Dato label={v.tipoDocumento||'Documento'} value={v.numeroDocumento}/><Dato label="Celular" value={v.telefono}/><Dato label="Correo" value={v.correo}/><Dato label="Dirección" value={v.direccion}/>
            {v.ruc&&<Dato label="RUC empresa" value={v.ruc}/>} {v.facturaRuc&&<Dato label="RUC factura" value={v.facturaRuc}/>} {v.razonSocial&&<Dato label="Razón social" value={v.razonSocial}/>} {v.editadoEn&&<Dato label="Editada el" value={formatearDia(v.editadoEn)}/>}<Dato label="Pagos" value={pagosTexto(v)}/>
            <div className="campo-completo"><BotonConstancia venta={v} mostrar={mostrar}/></div>
          </div></td></tr>}</React.Fragment>;
      })}</Tabla>
    </Panel>
  </>;
}

function Dato({label,value}) {return <div><span style={{color:'var(--text-muted)'}}>{label}: </span>{value||'—'}</div>;}

function BotonConstancia({venta,mostrar}) {
  const [descargando,setDescargando]=useState(false);
  async function guardarPDF() {
    setDescargando(true);
    try {
      const {descargarConstancia}=await import('./constancia.js');
      await descargarConstancia(venta);
    } catch {
      mostrar('No se pudo descargar la constancia. Inténtalo otra vez.');
    } finally {
      setDescargando(false);
    }
  }
  return <Btn onClick={guardarPDF} disabled={descargando}>{descargando?'Generando PDF…':'Descargar constancia (PDF)'}</Btn>;
}

function VentaForm({venta,stock,data,mutate,ocupado,cerrar}) {
  const [form,setForm]=useState(()=>datosFormulario(venta,stock));
  const [error,setError]=useState('');
  const [encontrado,setEncontrado]=useState(false);
  const empresa=form.tipoDocumento==='RUC', factura=form.tipoComprobante==='Factura';
  const tipoPersona=empresa?'DNI':form.tipoDocumento;
  const monto=centavos(form.precioVenta);
  const unicoPago=form.pagos.length===1;
  const pagosActuales=form.pagos.map(p=>({metodo:p.metodo,monto:unicoPago?monto:centavos(p.monto)}));
  const sumaPagos=pagosActuales.reduce((total,pago)=>total+pago.monto,0);
  const diferencia=monto-sumaPagos;
  const campo=(name,value)=>setForm(f=>({...f,[name]:value}));
  const control=name=>({name,value:form[name],onChange:e=>campo(name,e.target.value)});
  function cambiarPago(indice,clave,valor) {
    campo('pagos',form.pagos.map((p,i)=>i===indice?{...p,[clave]:valor}:p));
  }
  function agregarPago() {
    const anteriores=unicoPago?[{...form.pagos[0],monto:monto>0?(monto/100).toFixed(2):''}]:form.pagos;
    const siguiente=metodos.find(m=>!anteriores.some(p=>p.metodo===m));
    campo('pagos',[...anteriores,{metodo:siguiente||metodos[0],monto:''}]);
  }
  function buscarCliente() {
    if(!form.numeroDocumento)return;
    const cliente=data.clientes.find(c=>c.numeroDocumento===form.numeroDocumento)||data.ventas.findLast(v=>v.numeroDocumento===form.numeroDocumento);
    if(!cliente)return setEncontrado(false);
    setEncontrado(true);
    setForm(f=>({...f,cliente:cliente.nombre||cliente.cliente||'',telefono:cliente.telefono||'',correo:cliente.correo||'',direccion:cliente.direccion||'',ruc:cliente.ruc||f.ruc,facturaRuc:f.facturaRuc||cliente.ruc||cliente.facturaRuc||''}));
  }
  async function guardar(event) {
    event.preventDefault();setError('');
    if(!validarDocumento(tipoPersona,form.numeroDocumento))return setError(`Verifica el número de ${tipoPersona}.`);
    if(empresa&&!validarDocumento('RUC',form.ruc))return setError('Verifica el RUC de la empresa.');
    if(factura&&(!validarDocumento('RUC',form.facturaRuc)||!form.razonSocial.trim()))return setError('Completa el RUC válido y la razón social de la factura.');
    if(form.telefono&&!/^9\d{8}$/.test(form.telefono))return setError('El celular debe tener 9 dígitos y empezar con 9.');
    if(monto<=0||!form.cliente.trim())return setError('Ingresa el nombre del cliente y un precio mayor a cero.');
    if(pagosActuales.some(p=>!p.metodo||p.monto<=0))return setError('Ingresa un importe mayor a cero en cada pago.');
    if(diferencia!==0)return setError('La suma de los pagos debe coincidir con el precio de venta.');
    if(!venta&&!form.motoId)return setError('Selecciona una moto disponible.');
    const identidad={cliente:form.cliente.trim(),tipoDocumento:form.tipoDocumento,numeroDocumento:form.numeroDocumento,ruc:empresa?form.ruc:'',telefono:form.telefono.trim(),correo:form.correo.trim(),direccion:form.direccion.trim()};
    const objeto={...identidad,precioVenta:monto/100,fecha:form.fecha,tipoComprobante:form.tipoComprobante,
      facturaRuc:factura?form.facturaRuc:'',razonSocial:factura?form.razonSocial.trim():'',metodoPago:pagosActuales[0].metodo,pagos:pagosActuales.map(p=>({...p,monto:p.monto/100}))};
    const ok=await mutate(d=>{
      const anterior=venta&&d.ventas.find(v=>v.id===venta.id);
      const moto=!venta&&d.motos.find(m=>m.id===form.motoId&&m.estado==='disponible');
      if(venta&&(!anterior||anterior.fuente==='excel'))throw new Error('La venta ya no se puede editar.');
      if(!venta&&!moto)throw new Error('Esa moto ya no está disponible.');
      const cliente=d.clientes.find(c=>c.numeroDocumento===identidad.numeroDocumento)||{id:id()};
      const {cliente:nombre,...datos}=identidad;
      Object.assign(cliente,datos,{nombre});
      if(!d.clientes.some(c=>c.id===cliente.id))d.clientes.push(cliente);
      if(anterior) {
        Object.assign(anterior,objeto,{clienteId:cliente.id,editadoEn:hoy()});
      } else {
        moto.estado='vendida';
        d.ventas.push({id:id(),motoId:moto.id,motoDesc:`${nombreMoto(moto)} (${moto.color})`,chasis:moto.chasis,precioCompra:moto.precioCompra,clienteId:cliente.id,vendedor:'Admin',...objeto});
      }
    },venta?'Venta actualizada.':'Venta registrada.');
    if(ok)cerrar();
  }
  return <Panel id="ventaFormPanel" titulo={venta?'Editar venta':'Nueva venta'}><form id="ventaForm" onSubmit={guardar}>
    <div className="form-grid">
      <Campo label="Moto (disponibles en stock)" style={{gridColumn:'span 2'}}><select required id="ventaMotoSelect" name="motoId" value={form.motoId} disabled={!!venta} onChange={e=>campo('motoId',e.target.value)}>
        {venta?<option value={form.motoId}>{venta.motoDesc} — Chasis {venta.chasis||'—'}</option>:stock.map(m=><option key={m.id} value={m.id}>{nombreMoto(m)} — {m.color} — Chasis {m.chasis}</option>)}</select></Campo>
      <Campo label="Tipo de documento"><select id="ventaTipoDoc" name="tipoDocumento" value={form.tipoDocumento} onChange={e=>{const t=e.target.value;setEncontrado(false);setForm(f=>({...f,tipoDocumento:t,numeroDocumento:limpiarDocumento(t==='RUC'?'DNI':t,f.numeroDocumento),ruc:t==='RUC'?f.ruc:''}));}}><option>DNI</option><option>RUC</option><option value="CE">Carnet de extranjería</option></select></Campo>
      <Campo label={empresa?'DNI del representante':'N° de documento'}><input required id="ventaNumeroDoc" name="numeroDocumento" placeholder={tipoPersona==='DNI'?'8 dígitos':'9 a 12 caracteres'} value={form.numeroDocumento} onChange={e=>{setEncontrado(false);campo('numeroDocumento',limpiarDocumento(tipoPersona,e.target.value));}} onBlur={buscarCliente}/></Campo>
      {empresa&&<Campo label="RUC de la empresa"><input required id="ventaRucCliente" name="ruc" placeholder="11 dígitos" value={form.ruc} onChange={e=>campo('ruc',limpiarDocumento('RUC',e.target.value))} onBlur={()=>{if(factura&&!form.facturaRuc)campo('facturaRuc',form.ruc);}}/></Campo>}
      <Campo label="Nombre del cliente"><input id="ventaClienteNombre" {...control('cliente')} placeholder="Nombre completo / razón social" required/></Campo>
      <Campo label="Celular"><input id="ventaTelefono" name="telefono" inputMode="numeric" value={form.telefono} placeholder="987654321" onChange={e=>campo('telefono',e.target.value.replace(/\D/g,'').slice(0,9))}/></Campo>
      <Campo label="Correo electrónico"><input type="email" id="ventaCorreo" {...control('correo')} placeholder="cliente@correo.com"/></Campo>
      <Campo label="Dirección" style={{gridColumn:'span 2'}}><input id="ventaDireccion" {...control('direccion')} placeholder="Av. / Jr. / Calle, distrito"/></Campo>
      <Campo label="Precio de venta (S/)"><input type="number" min="0.01" step="0.01" {...control('precioVenta')} required/></Campo>
      <Campo label="Comprobante"><select id="ventaComprobante" name="tipoComprobante" value={form.tipoComprobante} onChange={e=>{const t=e.target.value;setForm(f=>({...f,tipoComprobante:t,facturaRuc:t==='Factura'?f.facturaRuc||f.ruc:'',razonSocial:t==='Factura'?f.razonSocial||(empresa?f.cliente:''):''}));}}><option>Boleta</option><option>Factura</option></select></Campo>
      <Campo label="Fecha de venta"><input type="date" {...control('fecha')} required/></Campo>
      <div id="pagosBox" className="venta-pagos">
        <div className="venta-subtitulo">Forma de pago</div>
        <p className="ia-note">Puedes dividir el total en hasta tres pagos.</p>
        {form.pagos.map((p,i)=><div key={i} data-pago-row className="venta-pago-row">
          <div className="venta-pago-numero">Pago {i+1}</div>
          <Campo label={`Método del pago ${i+1}`}><select data-metodo="" value={p.metodo} onChange={e=>cambiarPago(i,'metodo',e.target.value)}>{[...new Set([...metodos,p.metodo])].map(m=><option key={m}>{m}</option>)}</select></Campo>
          <Campo label={`Monto del pago ${i+1} (S/)`}><input data-monto="" type="number" min="0.01" step="0.01" readOnly={unicoPago} required={!unicoPago}
            value={unicoPago?(monto>0?(monto/100).toFixed(2):''):p.monto} onChange={e=>cambiarPago(i,'monto',e.target.value)}/></Campo>
          {!unicoPago&&<Btn className="btn btn-secondary venta-pago-quitar" aria-label={`Quitar pago ${i+1}`} onClick={()=>campo('pagos',form.pagos.filter((_,j)=>j!==i))}>Quitar</Btn>}
        </div>)}
        {form.pagos.length<3&&<Btn onClick={agregarPago}>Agregar pago</Btn>}
        <div id="pagosResumen" className="venta-pago-resumen" role="status" style={{color:monto>0&&diferencia===0?'var(--teal)':'#B42318'}}>
          {monto<=0?'Primero ingresa el precio de venta.':`Total de pagos: ${moneda(sumaPagos/100)} · ${diferencia===0?'Importe completo':diferencia>0?`Falta ${moneda(diferencia/100)}`:`Excede en ${moneda(-diferencia/100)}`}`}
        </div>
      </div>
      {factura&&<div id="facturaBox" className="venta-factura"><div className="venta-subtitulo">Datos para la factura</div><div className="form-grid" style={{margin:0}}>
        <Campo label="RUC"><input required id="ventaFacturaRuc" name="facturaRuc" placeholder="11 dígitos" value={form.facturaRuc} onChange={e=>campo('facturaRuc',limpiarDocumento('RUC',e.target.value))}/></Campo>
        <Campo label="Razón social" style={{gridColumn:'span 2'}}><input id="ventaRazonSocial" {...control('razonSocial')} required placeholder="Nombre de la empresa"/></Campo>
      </div></div>}
    </div>
    {encontrado&&<p id="clienteEncontrado" style={{fontSize:12.5,color:'var(--teal)',margin:'-8px 0 14px'}}>✓ Cliente reconocido — se autocompletaron sus datos de una compra anterior.</p>}
    {error&&<p className="part-error" role="alert">{error}</p>}
    <Btn tipo="primary" type="submit" disabled={ocupado}>{venta?'Guardar cambios':'Registrar venta'}</Btn>{' '}<Btn id="btnCancelVenta" onClick={cerrar}>Cancelar</Btn>
  </form></Panel>;
}
