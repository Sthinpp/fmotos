export const verdeFMotos='2C7A24';

export async function imagenFMotos() {
  const respuesta=await fetch(`${import.meta.env.BASE_URL}fmotos.png`);
  if(!respuesta.ok)throw new Error('No se encontró el logo de FMotos.');
  const imagen=await respuesta.blob();
  return new Promise((resolver,rechazar)=>{
    const lector=new FileReader();
    lector.onload=()=>resolver(lector.result);
    lector.onerror=()=>rechazar(lector.error);
    lector.readAsDataURL(imagen);
  });
}
