import ExcelJS from 'exceljs';
import {descargar,formatearDia,hoy} from './negocio.js';
import {imagenFMotos} from './marca.js';

const formatoSoles='"S/ " #,##0.00';
const relleno=color=>({type:'pattern',pattern:'solid',fgColor:{argb:`FF${color}`}});

function agregarLogo(hoja,logo) {
  const emuPorPixel=9525;
  hoja.addImage(logo,{
    tl:{nativeCol:0,nativeColOff:10*emuPorPixel,nativeRow:0,nativeRowOff:4*emuPorPixel},
    br:{nativeCol:0,nativeColOff:78*emuPorPixel,nativeRow:2,nativeRowOff:0},
    editAs:'oneCell'
  });
}

function banda(celda,valor,fondo,color,tamano) {
  celda.value=valor;
  celda.fill=relleno(fondo);
  celda.font={bold:true,size:tamano,color:{argb:`FF${color}`}};
  celda.alignment={vertical:'middle',horizontal:'left',indent:1,wrapText:true};
}

function formatoEncabezado(celda,color) {
  banda(celda,celda.value,color,'FFFFFF',11);
}

function agregarResumen(libro,reporte,resumen,logo,fecha) {
  const hoja=libro.addWorksheet('Resumen',{
    properties:{tabColor:{argb:`FF${reporte.color}`}},
    views:[{showGridLines:false}],
    pageSetup:{orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:0}
  });
  hoja.columns=Array.from({length:6},(_,i)=>{
    const ancho=resumen.filas.reduce((mayor,fila)=>Math.max(mayor,String(fila[i]??'').length),resumen.columnas[i]?.length||0);
    return {width:Math.max(17,Math.min(36,ancho+4))};
  });
  hoja.mergeCells('A1:A3');
  hoja.mergeCells('B1:F1');
  hoja.mergeCells('B2:F2');
  hoja.getRow(1).height=28;
  hoja.getRow(2).height=21;
  hoja.getRow(3).height=14;
  banda(hoja.getCell('B1'),`FMotos  |  ${reporte.titulo}`,reporte.color,'FFFFFF',18);
  banda(hoja.getCell('B2'),`Resumen al ${formatearDia(fecha)}`,'E7F2E6',reporte.color,11);
  agregarLogo(hoja,logo);

  hoja.getRow(5).height=31;
  hoja.getRow(6).height=29;
  resumen.metricas.forEach(({titulo,valor,formato},i)=>{
    const columna=2*i+1;
    hoja.mergeCells(5,columna,5,columna+1);
    hoja.mergeCells(6,columna,6,columna+1);
    banda(hoja.getCell(5,columna),titulo,'F0F7EF',reporte.color,11);
    const celda=hoja.getCell(6,columna);
    banda(celda,valor,'F0F7EF',reporte.color,19);
    celda.numFmt=formato==='soles'?formatoSoles:'#,##0';
  });

  hoja.mergeCells('A8:F8');
  hoja.getRow(8).height=26;
  banda(hoja.getCell('A8'),resumen.titulo,'E7F2E6',reporte.color,13);
  const encabezado=hoja.getRow(9);
  encabezado.values=resumen.columnas;
  encabezado.height=34;
  encabezado.eachCell(celda=>formatoEncabezado(celda,reporte.color));
  if(!resumen.filas.length){
    hoja.mergeCells('A10:F10');
    banda(hoja.getCell('A10'),resumen.vacio||'No hay registros para resumir.','F3F6F3','394539',11);
  }
  for(const [indice,valores] of resumen.filas.entries()){
    const fila=hoja.addRow(valores);
    fila.eachCell((celda,columna)=>{
      if(indice%2===0)celda.fill=relleno('F0F7EF');
      const texto=typeof celda.value==='string';
      celda.alignment={horizontal:texto?'left':'right',vertical:'middle',indent:1,wrapText:texto};
      if(resumen.soles?.includes(columna-1))celda.numFmt=formatoSoles;
      if(resumen.porcentajes?.includes(columna-1))celda.numFmt='0.0%';
      if(resumen.columnaAlerta===columna-1){
        celda.fill=relleno('FCEADF');
        celda.font={bold:true,color:{argb:'FF8C341A'}};
      }
    });
  }
}

export async function descargarExcel(reporte,filas,resumen) {
  const [encabezados,...registros]=filas;
  const libro=new ExcelJS.Workbook();
  libro.creator='FMotos';
  libro.created=new Date();
  const fecha=hoy();
  const logo=libro.addImage({base64:await imagenFMotos(),extension:'png'});
  agregarResumen(libro,reporte,resumen,logo,fecha);
  const hoja=libro.addWorksheet(reporte.titulo,{
    properties:{tabColor:{argb:`FF${reporte.color}`}},
    views:[{state:'frozen',ySplit:5,showGridLines:false}],
    pageSetup:{orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:0}
  });
  hoja.columns=encabezados.map((titulo,i)=>{
    const ancho=registros.reduce((mayor,fila)=>Math.max(mayor,String(fila[i]??'').length),titulo.length);
    return {width:Math.min(40,Math.max(14,ancho+4))};
  });
  hoja.mergeCells('A1:A3');
  for(const indice of [1,2,3])hoja.mergeCells(indice,2,indice,encabezados.length);
  hoja.getRow(1).height=28;
  hoja.getRow(2).height=21;
  hoja.getRow(3).height=17;
  hoja.getRow(4).height=8;
  banda(hoja.getCell('B1'),`FMotos  |  ${reporte.titulo} · Detalle`,reporte.color,'FFFFFF',17);
  banda(hoja.getCell('B2'),`Emitido el ${formatearDia(fecha)}  ·  ${registros.length} registros`,'E3F5E1','26382A',11);
  agregarLogo(hoja,logo);

  const encabezado=hoja.getRow(5);
  encabezado.values=encabezados;
  encabezado.height=25;
  encabezado.eachCell(celda=>formatoEncabezado(celda,reporte.color));

  const fechas=new Set(reporte.fechas);
  const soles=new Set(reporte.soles);
  for(const [indice,registro] of registros.entries()){
    const fila=hoja.addRow(registro.map((valor,i)=>fechas.has(i)&&/^\d{4}-\d{2}-\d{2}$/.test(valor)
      ?new Date(`${valor}T00:00:00Z`):valor??null));
    for(const [i,valor] of registro.entries()){
      const celda=fila.getCell(i+1);
      if(indice%2===0)celda.fill=relleno('F0F7EF');
      if(soles.has(i))celda.numFmt=formatoSoles;
      if(fechas.has(i)&&celda.value instanceof Date)celda.numFmt='dd/mm/yyyy';
      const esFecha=celda.value instanceof Date;
      celda.alignment={
        vertical:'middle',
        horizontal:esFecha?'center':typeof valor==='number'?'right':'left',
        indent:esFecha?0:1,
        wrapText:typeof valor==='string'&&valor.length>38
      };
    }
  }
  hoja.autoFilter={from:{row:5,column:1},to:{row:hoja.rowCount,column:encabezados.length}};
  hoja.pageSetup.printTitlesRow='5:5';
  const contenido=await libro.xlsx.writeBuffer();
  descargar(`FMotos-${reporte.archivo}-${fecha}.xlsx`,contenido,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}
