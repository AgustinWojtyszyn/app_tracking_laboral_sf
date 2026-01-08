
import React, { useState, useEffect } from 'react';
import { Mail, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { authService } from '@/services/auth.service';
import { useToast } from '@/components/ui/use-toast';

export default function EmailVerificationMessage({ email, onBack }) {
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleResend = async () => {
    setLoading(true);
    const result = await authService.resendVerificationEmail(email);
    setLoading(false);

    if (result.success) {
      toast({ title: "Email enviado", description: result.message });
      setCountdown(60);
    } else {
      toast({ variant: "destructive", description: result.message });
    }
  };

  return (
    <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg text-center space-y-6">
      <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
        <Mail className="w-8 h-8 text-blue-900" />
      </div>
      
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Verifica tu Email</h2>
        <p className="mt-2 text-gray-600">
          Debes confirmar tu dirección de correo electrónico <strong>{email}</strong> antes de ingresar.
        </p>
      </div>

      <div className="space-y-4 pt-4">
        <Button 
          onClick={handleResend} 
          disabled={countdown > 0 || loading}
          className="w-full bg-blue-900 hover:bg-blue-800"
        >
          {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
          {countdown > 0 ? `Reenviar en ${countdown}s` : 'Reenviar Email de Confirmación'}
        </Button>
        
        <Button variant="ghost" onClick={onBack} className="w-full">
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver al Inicio
        </Button>
      </div>
    </div>
  );
}
