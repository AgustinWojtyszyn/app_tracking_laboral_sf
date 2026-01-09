
import React, { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/contexts/ToastContext';
import { Loader2, MailWarning } from 'lucide-react';

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading, isAdmin, isEmailVerified, resendVerification } = useAuth();
  const location = useLocation();
  const { addToast } = useToast();
  const [resending, setResending] = useState(false);

  const handleResend = async () => {
      setResending(true);
      const result = await resendVerification(user.email);
      setResending(false);
      
      if (result.success) {
          addToast(result.message, "success");
      } else {
          addToast(result.message, "error");
      }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-[#1e3a8a]" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isEmailVerified) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg border border-gray-100 text-center">
                <div className="flex justify-center mb-4">
                    <div className="bg-yellow-100 p-3 rounded-full">
                        <MailWarning className="w-8 h-8 text-yellow-600" />
                    </div>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Verifica tu Email</h2>
                <p className="text-gray-600 mb-6">
                    Por favor confirma tu email para acceder a la plataforma. Hemos enviado un enlace a <strong>{user.email}</strong>.
                </p>
                <Button 
                    onClick={handleResend} 
                    disabled={resending}
                    className="w-full bg-blue-900 hover:bg-blue-800 text-white"
                >
                    {resending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</> : 'Reenviar confirmación'}
                </Button>
                <div className="mt-4">
                     <Button variant="ghost" className="text-sm text-gray-500 hover:text-gray-800" onClick={() => window.location.reload()}>
                        Ya verifiqué mi email
                     </Button>
                </div>
            </div>
        </div>
    );
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/app/trabajos-diarios" replace />;
  }

  return children;
}
