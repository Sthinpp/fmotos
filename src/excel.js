import ExcelJS from 'exceljs';
import {descargar,formatearDia,hoy} from './negocio.js';
import {imagenFMotos,verdeFMotos} from './marca.js';

export async function descargarExcel(reporte,filas) {
  const [encabezados,...registros]=filas;
  const libro=new ExcelJS.Workbook();
  libro.creator='FMotos';
  libro.created=new Date();
  const hoja=libro.addWorksheet(reporte.titulo,{
    properties:{tabColor:{argb:`FF${verdeFMotos}`}},
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
  const fecha=hoy();
  const cabecera=[
    [1,`FMotos  |  ${reporte.titulo}`,verdeFMotos,'FFFFFF',17],
    [2,`Emitido el ${formatearDia(fecha)}  ·  ${registros.length} registros`,'E3F5E1','26382A',11]
  ];
  for(const [indice,valor,fondo,color,tamano] of cabecera) {
    const celda=hoja.getCell(indice,2);
    celda.value=valor;
    celda.fill={type:'pattern',pattern:'solid',fgColor:{argb:`FF${fondo}`}};
    celda.font={bold:true,size:tamano,color:{argb:`FF${color}`}};
    celda.alignment={vertical:'middle',indent:1};
  }
  const logo=libro.addImage({base64:await imagenFMotos(),extension:'png'});
  const emuPorPixel=9525;
  hoja.addImage(logo,{
    tl:{nativeCol:0,nativeColOff:10*emuPorPixel,nativeRow:0,nativeRowOff:4*emuPorPixel},
    br:{nativeCol:0,nativeColOff:78*emuPorPixel,nativeRow:2,nativeRowOff:0},
    editAs:'oneCell'
  });

  const encabezado=hoja.getRow(5);
  encabezado.values=encabezados;
  encabezado.height=25;
  encabezado.eachCell(celda=>{
    celda.fill={type:'pattern',pattern:'solid',fgColor:{argb:`FF${verdeFMotos}`}};
    celda.font={bold:true,color:{argb:'FFFFFFFF'}};
    celda.alignment={vertical:'middle',horizontal:'left',indent:1,wrapText:true};
  });

  const fechas=new Set(reporte.fechas);
  const soles=new Set(reporte.soles);
  for(const [indice,registro] of registros.entries()){
    const fila=hoja.addRow(registro.map((valor,i)=>fechas.has(i)&&/^\d{4}-\d{2}-\d{2}$/.test(valor)
      ?new Date(`${valor}T00:00:00Z`):valor??null));
    for(const [i,valor] of registro.entries()){
      const celda=fila.getCell(i+1);
      if(indice%2===0)celda.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF0F7EF'}};
      if(soles.has(i))celda.numFmt='"S/ " #,##0.00';
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
