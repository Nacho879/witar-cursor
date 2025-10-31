import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Mail, CheckCircle, XCircle } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (error) throw error;

      setMessage('✅ Te hemos enviado un email con instrucciones para restablecer tu contraseña.');
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="card p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Recuperar contraseña</h1>
          <p className="text-muted-foreground">Ingresa tu email para recibir un enlace de recuperación</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              className="input w-full"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {message && (
            <div
              className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
                message.startsWith('Error')
                  ? 'bg-destructive/10 text-destructive border border-destructive/20'
                  : 'bg-success/10 text-success border border-success/20'
              }`}
            >
              {message.startsWith('Error') ? (
                <XCircle className="w-4 h-4" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              <span>{message}</span>
            </div>
          )}

          <button type="submit" disabled={loading} className="btn btn-primary w-full">
            {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
          </button>

          <p className="text-sm text-muted-foreground text-center mt-2">
            <a href="/login" className="text-primary hover:underline">
              Volver al login
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}


