import * as React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Mail, ArrowRight, Home } from 'lucide-react';

export default function Welcome() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email');

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background text-foreground">
      <div className="card p-8 w-full max-w-md space-y-6 text-center">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-success" />
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-2xl font-bold">¡Cuenta creada exitosamente!</h1>
          <p className="text-muted-foreground">
            Tu cuenta ha sido creada correctamente. Ahora necesitas verificar tu email para activarla.
          </p>
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-primary" />
            <span className="font-medium">Verifica tu email</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Hemos enviado un enlace de verificación a:
          </p>
          <p className="text-sm font-medium text-primary">
            {email || 'tu dirección de email'}
          </p>
        </div>

        <div className="space-y-3">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>📧 Revisa tu bandeja de entrada</p>
            <p>🔗 Haz clic en el enlace de verificación</p>
            <p>✅ Tu cuenta quedará activada</p>
          </div>
        </div>

        <div className="space-y-3 pt-4">
          <button 
            onClick={() => navigate('/login')}
            className="btn btn-primary w-full flex items-center justify-center gap-2"
          >
            Ir al login
            <ArrowRight className="w-4 h-4" />
          </button>
          
          <button 
            onClick={() => navigate('/')}
            className="btn btn-outline w-full flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            Volver al inicio
          </button>
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>¿No recibiste el email?</p>
          <p>Revisa tu carpeta de spam o solicita un nuevo enlace desde el login.</p>
        </div>
      </div>
    </div>
  );
} 