import { createClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const supabase = url && key ? createClient(url,key) : null;
const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/,'');
const localKey = 'fmotos-react-sesion-local';

export async function api(path, { token, body, method = 'GET', signal } = {}) {
  const response = await fetch(`${base}/api${path}`, {
    method, signal, cache:'no-store', headers: {
      ...(token ? {Authorization:`Bearer ${token}`} : {}),
      ...(body ? {'Content-Type':'application/json'} : {}),
    }, ...(body ? {body:JSON.stringify(body)} : {}),
  });
  const result = await response.json().catch(()=>({}));
  if (!response.ok) {
    const error = new Error(typeof result.detail==='string' ? result.detail : 'No se pudo completar la operación.');
    error.status = response.status;
    throw error;
  }
  return result;
}

export function useSesion() {
  const [ready, setReady] = useState(!supabase);
  const [session, setSession] = useState(() => {
    if (supabase) return null;
    try { return JSON.parse(sessionStorage.getItem(localKey)); } catch { return null; }
  });
  useEffect(() => {
    if (!supabase) return;
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_event, value) => {
      setSession(value ? {token:value.access_token, usuario:value.user.email || value.user.id, id:value.user.id} : null);
      setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);
  async function ingresar(usuario,password) {
    if (supabase) {
      const {error} = await supabase.auth.signInWithPassword({email:usuario,password});
      if (error) throw new Error('Correo o contraseña incorrectos.');
    } else {
      const data = await api('/local/login',{method:'POST',body:{usuario,password}});
      sessionStorage.setItem(localKey, JSON.stringify(data));
      setSession(data);
    }
  }
  async function salir() {
    if (supabase) {
      const {error} = await supabase.auth.signOut();
      if (error) throw new Error('No se pudo cerrar la sesión. Intenta nuevamente.');
    } else {
      try { if (session) await api('/local/logout',{method:'POST',token:session.token}); }
      finally { sessionStorage.removeItem(localKey);setSession(null); }
    }
  }
  return {ready,session,ingresar,salir};
}

export function useConsulta(path, token, revision, activa=true) {
  const [estado, setEstado] = useState({path:null,revision:-1,data:null,error:null});
  useEffect(()=>{
    if (!token || !activa) return;
    const controller = new AbortController();
    api(path,{token,signal:controller.signal}).then(data=>{
      if (!controller.signal.aborted) setEstado({path,revision,data,error:null});
    }).catch(error=>{
      if (!controller.signal.aborted) setEstado({path,revision,data:null,error:error.message});
    });
    return ()=>controller.abort();
  },[path,token,revision,activa]);
  return estado.path===path && estado.revision===revision ? estado : {data:null,error:null};
}
