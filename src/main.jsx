import React, {useEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {api,supabase,useSesion,useConsulta} from './conexion.js';
import {Dashboard} from './Dashboard.jsx';
import {Inventario} from './Inventario.jsx';
import {Ventas} from './Ventas.jsx';
import {CRM} from './CRM.jsx';
import {Inteligencia} from './Inteligencia.jsx';
import {Reportes} from './Reportes.jsx';
import {Btn,Panel} from './ui.jsx';
import iconos from './iconos.json';
import './original.css';
import './ajustes.css';

const titulo = {dashboard:'Dashboard',inventario:'Inventario',ventas:'Ventas',crm:'CRM · Prospectos',inteligencia:'Inteligencia IA',reportes:'Reportes'};
const logo = `${import.meta.env.BASE_URL}fmotos.png`;

function Login({ingresar}) {
  const [error,setError] = useState('');
  const [ocupado,setOcupado] = useState(false);
  async function enviar(event) {
    event.preventDefault();
    const datos = new FormData(event.currentTarget);
    setOcupado(true);setError('');
    try { await ingresar(datos.get('usuario').trim(),datos.get('password')); }
    catch (e) {setError(e.message);}
    finally {setOcupado(false);}
  }
  return <div className="login-screen" id="loginScreen"><div className="login-card">
    <div className="login-logo"><img src={logo} alt="FMotos" style={{height:54}}/></div><h2>Iniciar sesión</h2><p>Acceso restringido al administrador del negocio.</p>
    <form id="loginForm" onSubmit={enviar}>
      <div className="login-field"><label htmlFor="loginUser">{supabase?'Correo electrónico':'Usuario'}</label><input id="loginUser" name="usuario" type={supabase?'email':'text'} autoComplete="username" required/></div>
      <div className="login-field"><label htmlFor="loginPass">Contraseña</label><input id="loginPass" name="password" type="password" autoComplete="current-password" required/></div>
      <button className="login-btn" disabled={ocupado}>{ocupado?'Ingresando…':'Ingresar'}</button>
      {error&&<p id="loginError" className="login-error show" role="alert">{error}</p>}
    </form>
  </div></div>;
}

function App({sesion,salir}) {
  const {token,usuario} = sesion;
  const [snapshot,setSnapshot] = useState(null);
  const [tab,setTab] = useState('dashboard');
  const [errorCarga,setErrorCarga] = useState('');
  const [intento,setIntento] = useState(0);
  const [toast,setToast] = useState('');
  const [guardando,setGuardando] = useState(false);
  const guardado = useRef(false);
  const expiracion = useRef(null);
  const mostrar = mensaje=>{clearTimeout(expiracion.current);setToast(mensaje);expiracion.current=setTimeout(()=>setToast(''),2600);};
  useEffect(()=>()=>clearTimeout(expiracion.current),[]);
  useEffect(()=>{
    const controller = new AbortController();
    api('/datos',{token,signal:controller.signal}).then(data=>{setSnapshot(data);setErrorCarga('');}).catch(e=>{if(!controller.signal.aborted)setErrorCarga(e.message);});
    return ()=>controller.abort();
  },[token,intento]);

  async function guardar(transportar, mensaje) {
    if (guardado.current) return false;
    guardado.current=true;setGuardando(true);
    try {
      const data = await transportar();
      setSnapshot(data);mostrar(mensaje);return true;
    } catch (e) {
      if (e.status===409) {
        try {setSnapshot(await api('/datos',{token}));} catch {setIntento(i=>i+1);}
      }
      mostrar(e.message);return false;
    } finally {guardado.current=false;setGuardando(false);}
  }
  function mutate(cambiar,mensaje='Cambios guardados.') {
    return guardar(()=>{
      const datos=structuredClone(snapshot.datos);
      cambiar(datos);
      return api('/datos',{token,method:'PUT',body:{revision:snapshot.revision,datos}});
    },mensaje);
  }
  const restaurar=()=>guardar(()=>api('/datos/restaurar',{token,method:'POST',body:{revision:snapshot.revision}}),'Base de los Excel restaurada.');
  const scores=useConsulta('/ia/prospectos',token,snapshot?.revision??-1,!!snapshot);
  function irA(nombre, parte) {
    setTab(nombre);
    if(parte) requestAnimationFrame(()=>{const elemento=document.getElementById(parte);elemento?.focus({preventScroll:true});elemento?.scrollIntoView({block:'start'});});
  }
  return <div className="app" id="app">
    <aside className="sidebar"><div className="brand"><img src={logo} alt="FMotos" style={{height:34,background:'#fff',borderRadius:6,padding:'2px 4px'}}/><div className="brand-text">FMOTOS<span>STOCK · VENTAS</span></div></div>
      <nav>{Object.entries(titulo).map(([name,label])=><button key={name} type="button" className={`nav-item${tab===name?' active':''}`} data-tab={name} onClick={()=>irA(name)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">{iconos[name].map((shape,i)=>shape.d?<path key={i} {...shape}/>:<circle key={i} {...shape}/>)}</svg>{label}</button>)}</nav>
      <div className="sidebar-footer"><div className="user-tag">Sesión: <strong>{usuario}</strong></div><button className="logout-btn" id="btnLogout" onClick={()=>salir().catch(e=>mostrar(e.message))}>Cerrar sesión</button></div>
    </aside>
    <main className="content">
      {errorCarga && <Panel><p role="alert">{errorCarga}</p><Btn onClick={()=>{setErrorCarga('');setIntento(i=>i+1);}}>Reintentar</Btn></Panel>}
      {!snapshot&&!errorCarga&&<p role="status">Cargando datos…</p>}
      {snapshot && <>
        <section id="tab-dashboard" className={`tab-panel ${tab==='dashboard'?'active':''}`}><Dashboard data={snapshot.datos}/></section>
        <section id="tab-inventario" className={`tab-panel ${tab==='inventario'?'active':''}`}><Inventario data={snapshot.datos} mutate={mutate} ocupado={guardando} mostrar={mostrar} verGrupos={()=>irA('inteligencia','partsClusters')}/></section>
        <section id="tab-ventas" className={`tab-panel ${tab==='ventas'?'active':''}`}><Ventas data={snapshot.datos} mutate={mutate} ocupado={guardando} mostrar={mostrar}/></section>
        <section id="tab-crm" className={`tab-panel ${tab==='crm'?'active':''}`}><CRM data={snapshot.datos} scores={scores} mutate={mutate} ocupado={guardando}/></section>
        <section id="tab-inteligencia" className={`tab-panel ${tab==='inteligencia'?'active':''}`}><Inteligencia data={snapshot.datos} scores={scores} token={token} revision={snapshot.revision} activo={tab==='inteligencia'}/></section>
        <section id="tab-reportes" className={`tab-panel ${tab==='reportes'?'active':''}`}><Reportes data={snapshot.datos} scores={scores.data||{}} ocupado={guardando} mutate={mutate} restaurar={restaurar} mostrar={mostrar}/></section>
      </>}
    </main><div id="toast" role="status" className={`toast${toast?' show':''}`}>{toast}</div>
  </div>;
}

function Raiz() {
  const auth = useSesion();
  if (!auth.ready) return <div className="loading-screen">Cargando sesión…</div>;
  return auth.session ? <App key={auth.session.id||auth.session.usuario} sesion={auth.session} salir={auth.salir}/> : <Login ingresar={auth.ingresar}/>;
}

createRoot(document.getElementById('root')).render(<Raiz/>);
