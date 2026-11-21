export const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
export const mesesLargos = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
export const pasos = {nuevo:'Nuevo', contactado:'Contactado', interesado:'Interesado', cotizado:'Cotizado', seguimiento:'En seguimiento', no_responde:'No responde', ganado:'Convertido', perdido:'Perdido'};
export const canales = ['TikTok','Facebook','Referido','Local','WhatsApp','Instagram','Página web','Feria / evento'];
export const metodos = ['Efectivo','Yape','Plin','Transferencia','Tarjeta'];
export const moneda = value => `S/ ${(Number(value) || 0).toLocaleString('es-PE', {minimumFractionDigits:2,maximumFractionDigits:2})}`;
export const numero = value => Number(value).toLocaleString('es-PE', {maximumFractionDigits:1});
export const suma = (items, fn = x => x) => items.reduce((acumulado, item, indice) => acumulado + fn(item, indice), 0);
export const formatearDia = iso => iso ? iso.split('-').reverse().join('/') : '—';
export const hoy = () => new Intl.DateTimeFormat('en-CA', {timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export const mesEtiqueta = mes => `${meses[Number(mes.slice(5,7))-1]} ${mes.slice(0,4)}`;
export function desplazarMes(mes, delta) {
  const [año, numero] = mes.split('-').map(Number);
  const desplazado = año * 12 + numero - 1 + delta;
  return `${Math.floor(desplazado / 12)}-${String(desplazado % 12 + 1).padStart(2,'0')}`;
}
export const normalizar = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase().replace(/\s+/g,' ');
export const coincide = (query, ...values) => values.some(value => normalizar(value).includes(normalizar(query)));
export const nombreMoto = moto => `${moto.marca || ''} ${moto.modelo || ''}`.trim();
export const modeloVenta = v => (v.modeloBase || v.motoDesc || '').replace(/\s*\([^)]*\)\s*$/,'').trim();
export const mesesRegistrados = estado => [...new Set([...estado.mesesVentas,...estado.ventas.map(v=>v.fecha?.slice(0,7)).filter(v=>/^\d{4}-\d{2}$/.test(v))])].sort();
export const activos = leads => leads.filter(l => !['ganado','perdido'].includes(l.estado));
export const centavos = n => Math.round((Number(n) || 0) * 100);
export const pagos = v => v.pagos?.length ? v.pagos : [{metodo:v.metodoPago==='Contado'?'Efectivo':v.metodoPago||'Otro', monto:v.precioVenta||0}];
export const pagosTexto = v => pagos(v).map(p=>`${p.metodo} ${moneda(p.monto)}`).join(' + ');
export const id = () => globalThis.crypto.randomUUID();

export function repuestosActuales(estado) {
  const cambios = new Map();
  estado.movimientosRepuestos.forEach(m=>cambios.set(m.codigo,(cambios.get(m.codigo)||0)+(m.tipo==='entrada'?1:-1)*m.unidades));
  return estado.repuestos.map(p=>({...p,stock:p.stock+(cambios.get(p.codigo)||0),minimo:p.minimo??5}));
}

export function validarDocumento(tipo, value) {
  if (tipo==='DNI') return /^\d{8}$/.test(value);
  if (tipo==='CE') return /^[A-Z0-9]{9,12}$/.test(value);
  if (!/^\d{11}$/.test(value)) return false;
  const pesos = [5,4,3,2,7,6,5,4,3,2];
  return ((11 - suma(pesos, (peso,i)=>peso*Number(value[i])) % 11) % 10) === Number(value[10]);
}

export function limpiarDocumento(tipo, value) {
  return tipo === 'CE' ? value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,12) : value.replace(/\D/g,'').slice(0,tipo==='RUC'?11:8);
}

export function csv(nombre, filas) {
  const escapar = valor => {
    let texto = String(valor ?? '');
    if (typeof valor === 'string' && /^\s*[=+\-@]/.test(texto)) texto = `'${texto}`;
    return `"${texto.replaceAll('"','""')}"`;
  };
  descargar(nombre, '\uFEFF'+filas.map(f=>f.map(escapar).join(',')).join('\r\n'), 'text/csv;charset=utf-8');
}

export function descargar(nombre, archivo, tipo) {
  const url = URL.createObjectURL(new Blob([archivo], {type:tipo}));
  const link = document.createElement('a');
  link.href = url;
  link.download = nombre;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
