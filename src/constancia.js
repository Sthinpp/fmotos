import {jsPDF} from 'jspdf';
import {descargar,formatearDia,moneda,pagos} from './negocio.js';
import {imagenFMotos,verdeFMotos} from './marca.js';

export async function descargarConstancia(venta) {
  const logo=await imagenFMotos();
  const pdf=new jsPDF({format:'a5',unit:'mm',compress:true});
  const margen=13;
  const ancho=pdf.internal.pageSize.getWidth()-2*margen;
  const bordeDerecho=margen+ancho;
  const limite=pdf.internal.pageSize.getHeight()-margen;
  const verde=`#${verdeFMotos}`;
  let y=margen;
  pdf.setProperties({title:'Constancia de venta FMotos',creator:'FMotos'});
  pdf.setFillColor(verde);
  pdf.rect(0,0,bordeDerecho+margen,3,'F');
  pdf.addImage(logo,'PNG',margen,y,23,20.6);
  pdf.setTextColor(verde);
  pdf.setFont('helvetica','bold');
  pdf.setFontSize(17);
  pdf.text('Constancia de venta',margen+27,y+8);
  pdf.setTextColor('#344338');
  pdf.setFont('helvetica','normal');
  pdf.setFontSize(10);
  pdf.text(`FMotos   |   ${formatearDia(venta.fecha)}`,margen+27,y+15);
  y+=26;

  function espacio(alto) {
    if(y+alto<=limite)return;
    pdf.addPage();
    y=margen;
  }

  function texto(texto,negrita=false) {
    pdf.setFont('helvetica',negrita?'bold':'normal');
    pdf.setFontSize(10);
    for(const linea of pdf.splitTextToSize(texto,ancho)) {
      espacio(5);
      pdf.text(linea,margen,y);
      y+=5;
    }
  }

  texto(`Referencia de venta  ${venta.id||'—'}`);
  y+=3;
  texto('Cliente',true);
  texto(venta.cliente||'—');
  if(venta.numeroDocumento)texto(`${venta.tipoDocumento==='RUC'?'DNI del representante':venta.tipoDocumento||'Documento'}  ${venta.numeroDocumento}`);
  if(venta.ruc)texto(`RUC  ${venta.ruc}`);
  if(venta.razonSocial)texto(venta.razonSocial);

  y+=3;
  texto('Moto',true);
  texto(venta.motoDesc||venta.modeloBase||'—');
  if(venta.chasis)texto(`Chasis  ${venta.chasis}`);
  y+=3;
  espacio(15);
  pdf.setFillColor('#E3F5E1');
  pdf.rect(margen,y-4,ancho,8,'F');
  pdf.setFont('helvetica','bold');
  pdf.text('Método de pago',margen+2,y+1);
  pdf.text('Importe',bordeDerecho-2,y+1,{align:'right'});
  y+=10;
  pdf.setFont('helvetica','normal');
  for(const pago of pagos(venta)) {
    const metodo=pdf.splitTextToSize(String(pago.metodo),ancho-38);
    espacio(metodo.length*5+2);
    pdf.text(metodo,margen+2,y);
    pdf.text(moneda(pago.monto),bordeDerecho-2,y,{align:'right'});
    y+=metodo.length*5+2;
  }
  espacio(20);
  pdf.setDrawColor(verde);
  pdf.line(margen,y-3,bordeDerecho,y-3);
  pdf.setFont('helvetica','bold');
  pdf.text('Total de la venta',margen+2,y+3);
  pdf.text(moneda(venta.precioVenta),bordeDerecho-2,y+3,{align:'right'});
  y+=14;
  texto('Documento interno de FMotos. Sin validez tributaria.');
  const referencia=String(venta.id||venta.fecha||'venta').replace(/[^a-z0-9-]/gi,'-');
  descargar(`FMotos-constancia-${referencia}.pdf`,pdf.output('arraybuffer'),'application/pdf');
}
