import React, {useState} from 'react';
import {Encabezado,Panel,Btn} from './ui.jsx';
import {csv,descargar,pagos,pagosTexto,pasos,repuestosActuales,hoy} from './negocio.js';

export function Reportes({data,scores,ocupado,mutate,restaurar,mostrar}) {
  const [descargando,setDescargando]=useState('');
  const ventas=()=>[['ID Venta','ID Moto','Fecha','Moto','Chasis','Cliente','Tipo Doc','N Documento','RUC Cliente','Celular','Correo','Direccion','Comprobante','Precio Venta','Precio Compra','Ganancia','Pagos','RUC Factura','Razon Social','Simulado'],
    ...data.ventas.map(v=>[v.id,v.motoId,v.fecha,v.motoDesc,v.chasis,v.cliente,v.tipoDocumento,v.numeroDocumento,v.ruc,v.telefono,v.correo,v.direccion,v.tipoComprobante,v.precioVenta,v.precioCompra,v.precioVenta-v.precioCompra,pagosTexto(v),v.facturaRuc,v.razonSocial,v.simulado?'SI':'NO'])];
  const pagosVentas=()=>[['ID Venta','Fecha','Metodo','Monto','Simulado'],...data.ventas.flatMap(v=>pagos(v).map(p=>[v.id,v.fecha,p.metodo,p.monto,v.simulado?'SI':'NO']))];
  const motos=()=>[['ID Moto','Marca','Modelo','Color','Chasis','Motor','Proveedor','Precio Compra','Precio Venta Sugerido','Fecha Ingreso','Estado','Simulado'],...data.motos.map(v=>[v.id,v.marca,v.modelo,v.color,v.chasis,v.motor,v.proveedor,v.precioCompra,v.precioVentaSugerido,v.fechaIngreso,v.estado,v.simulado?'SI':'NO'])];
  const repuestos=()=>[['Código','Repuesto','Categoría','Stock','Precio compra','Precio venta','Valor del stock a precio venta','Peso (kg)','Ancho (cm)','Largo (cm)','Altura (cm)','Stock mínimo'],...repuestosActuales(data).map(p=>[p.codigo,p.nombre,p.categoria,p.stock,p.compra,p.venta,p.stock*p.venta,p.peso,p.ancho,p.largo,p.altura,p.minimo])];
  const prospectos=()=>[['ID Prospecto','Fecha registro','Nombre','Celular','Canal','Modelo','Color','Precio cotizado','Presupuesto','Estado','Seguimientos','Último contacto','Próximo seguimiento','Motivo de pérdida','Prioridad registrada','Prioridad estimada','Proporción de la hoja (%)','Correo'],...data.leads.map(l=>[l.id,l.fechaRegistro,l.nombre,l.telefono,l.canal,l.modelo,l.color,l.precio,l.presupuesto,pasos[l.estado],l.seguimientos,l.ultimoContacto,l.proximo,l.motivo,l.prioridadRegistrada,scores[l.id]?.prioridad||'—',scores[l.id]?.score,l.correo])];
  const informes=[
    {titulo:'Ventas',archivo:'ventas',id:'btnExportVentas',filas:ventas,fechas:[2],soles:[13,14,15]},
    {titulo:'Pagos',archivo:'pagos',id:'btnExportPagos',filas:pagosVentas,fechas:[1],soles:[3]},
    {titulo:'Motos',archivo:'inventario',id:'btnExportInv',filas:motos,fechas:[9],soles:[7,8]},
    {titulo:'Repuestos',archivo:'repuestos',id:'btnExportParts',filas:repuestos,fechas:[],soles:[4,5,6]},
    {titulo:'Prospectos',archivo:'prospectos',id:'btnExportLeads',filas:prospectos,fechas:[1,11,12],soles:[7,8]}
  ];
  async function exportarExcel(informe) {
    setDescargando(informe.archivo);
    try {
      const {descargarExcel}=await import('./excel.js');
      await descargarExcel(informe,informe.filas());
    } catch {
      mostrar('No se pudo descargar el reporte en Excel. Inténtalo otra vez.');
    } finally {
      setDescargando('');
    }
  }
  function respaldo(){descargar(`fmotos-respaldo-${hoy()}.json`,JSON.stringify(data,null,2),'application/json');}
  async function importar(event){
    const input=event.currentTarget, archivo=input.files?.[0];
    input.value='';
    if(!archivo)return;
    try {
      const respaldo=JSON.parse(await archivo.text());
      const claves=['ventas','leads','motos','repuestos','clientes','movimientosRepuestos','mesesVentas'];
      if(!claves.every(k=>Array.isArray(respaldo[k]))||typeof respaldo.corteInventario!=='string')throw new Error('El archivo debe ser un respaldo JSON de FMotos.');
      if(window.confirm(`¿Cargar el respaldo con ${respaldo.ventas.length} ventas y ${respaldo.leads.length} prospectos? Los registros actuales se reemplazarán.`))
        await mutate(d=>{for(const k of [...claves,'corteInventario'])d[k]=respaldo[k];},'Respaldo importado.');
    } catch(e) {mostrar(e.message==='Unexpected end of JSON input'?'El respaldo JSON estaba vacío.':e.message);}
  }
  return <><Encabezado titulo="Reportes" detalle="Exporta una copia de los registros del panel"/>
    <Panel titulo="Exportar a Excel">
      <div className="reportes-botones">{informes.map(informe=><Btn key={informe.archivo} disabled={Boolean(descargando)} onClick={()=>exportarExcel(informe)}>
        {descargando===informe.archivo?'Generando Excel…':`Descargar ${informe.titulo.toLowerCase()} (Excel)`}
      </Btn>)}</div>
      <details className="ia-method"><summary>Descargas CSV</summary>
        <div className="reportes-botones">{informes.map(informe=><Btn key={informe.archivo} id={informe.id}
          onClick={()=>csv(`${informe.archivo}.csv`,informe.filas())}>{`Descargar ${informe.titulo.toLowerCase()} (CSV)`}</Btn>)}</div>
      </details>
    </Panel>
    <Panel titulo="Datos"><p style={{fontSize:13,color:'var(--text-muted)',marginTop:0}}>Guarda una copia de los registros y de los movimientos del inventario.</p>
      <div style={{display:'flex',gap:10,flexWrap:'wrap'}}><Btn onClick={respaldo}>Descargar respaldo (JSON)</Btn><label className="btn btn-secondary respaldo"><input type="file" accept=".json,application/json" aria-label="Importar respaldo" onChange={importar} disabled={ocupado}/>Importar respaldo (JSON)</label></div>
      <button className="reset-link" id="btnReset" disabled={ocupado} onClick={()=>window.confirm('¿Restaurar los registros originales de los Excel? Los cambios actuales se perderán.')&&restaurar()}>Restaurar la base de los Excel</button>
      <details className="ia-method"><summary>Origen de los datos</summary><ul className="ia-sources" style={{marginTop:8}}><li>VENTASSS (1).xlsx · 65 ventas de abril a septiembre de 2026.</li><li>VENTAS octubre.xlsx · 17 registros de octubre de 2026. Un chasis aparece en dos fechas.</li><li>datos leads.xlsx · 60 prospectos.</li><li>inventario-fmotos-2026-11-05.xlsx · 36 motos y 64 referencias al 04/11/2026. Siete chasis con ventas de octubre figuran disponibles en este inventario.</li></ul></details>
    </Panel>
  </>;
}
