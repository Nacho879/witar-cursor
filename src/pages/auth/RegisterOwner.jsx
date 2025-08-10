import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function RegisterOwner(){
  const [fullName, setFullName] = React.useState('');
  const [company, setCompany] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [msg, setMsg] = React.useState('');

  async function onRegister(e){
    e.preventDefault();
    setMsg('');
    const { data: { user }, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName }, emailRedirectTo: `${import.meta.env.VITE_APP_URL}/` }
    });
    if (error) { setMsg(error.message); return; }
    if (user) setMsg('Revisá tu correo para confirmar la cuenta. Luego iniciá sesión.');
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background text-foreground">
      <form onSubmit={onRegister} className="card p-6 w-full max-w-sm space-y-3">
        <h1 className="text-xl font-semibold">Crear cuenta (Owner)</h1>
        <input className="input" placeholder="Nombre y apellido" value={fullName} onChange={e=>setFullName(e.target.value)} />
        <input className="input" placeholder="Nombre de la empresa" value={company} onChange={e=>setCompany(e.target.value)} />
        <input className="input" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="input" placeholder="Contraseña" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        <button className="btn btn-primary w-full">Crear cuenta</button>
        {msg && <p className="text-sm">{msg}</p>}
        <p className="text-xs text-muted-foreground">Te enviaremos un email para confirmar la cuenta.</p>
      </form>
    </div>
  );
}
