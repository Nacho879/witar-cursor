import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function Login(){
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [msg, setMsg] = React.useState('');

  async function onLogin(e){
    e.preventDefault();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if(error){ setMsg(error.message); return; }
    localStorage.setItem('sb-access-token', data.session?.access_token || '1'); // temporal
    window.location.href = '/owner';
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background text-foreground">
      <form onSubmit={onLogin} className="card p-6 w-full max-w-sm space-y-3">
        <h1 className="text-xl font-semibold">Ingresar</h1>
        <input className="input" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="input" placeholder="Contraseña" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        <button className="btn btn-primary w-full">Entrar</button>
        {msg && <p className="text-destructive text-sm">{msg}</p>}
        <p className="text-sm text-muted-foreground">¿No tenés cuenta? <a className="underline" href="/register">Crear cuenta (owner)</a></p>
      </form>
    </div>
  );
}
