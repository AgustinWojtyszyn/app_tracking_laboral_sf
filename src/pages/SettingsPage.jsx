
import React, { useState } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { authService } from '@/services/auth.service';
import { usersService } from '@/services/users.service';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { User, Lock, Loader2, LogOut } from 'lucide-react';
import { validatePassword } from '@/utils/validators';
import ConfirmationModal from '@/components/common/ConfirmationModal';

export default function SettingsPage() {
  const { user, profile, signOut } = useAuth();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  
  const [pwdData, setPwdData] = useState({
      newPassword: '',
      confirmPassword: ''
  });

  const updateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
        const result = await usersService.updateUserProfile(user.id, { full_name: fullName });
        if (result.success) {
            addToast("Perfil actualizado correctamente.", "success");
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        addToast(error.message, "error");
    } finally {
        setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
      e.preventDefault();
      
      const val = validatePassword(pwdData.newPassword);
      if (!val.valid) {
          addToast(val.error, "error");
          return;
      }
      if (pwdData.newPassword !== pwdData.confirmPassword) {
          addToast("Las contraseñas no coinciden", "error");
          return;
      }

      setLoading(true);
      // Calls authService.changePassword as defined in auth.service.js
      const result = await authService.changePassword(null, pwdData.newPassword);
      setLoading(false);

      if (result.success) {
          addToast(result.message, "success");
          setPwdData({ newPassword: '', confirmPassword: '' });
      } else {
          addToast(result.message || result.error, "error");
      }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto py-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Configuración</h1>
        <p className="text-gray-500">Gestiona tu cuenta y seguridad</p>
      </div>

      <div className="grid gap-8">
        {/* Profile Card */}
        <Card className="shadow-md border-gray-100 overflow-hidden bg-white">
            <CardHeader className="flex flex-row items-center gap-4 bg-gray-50/50 border-b border-gray-100">
                <div className="bg-blue-100 p-2 rounded-lg">
                    <User className="w-5 h-5 text-[#1e3a8a]" />
                </div>
                <div>
                    <CardTitle className="text-lg font-bold text-gray-800">Información Personal</CardTitle>
                    <p className="text-xs text-gray-500">Tus datos de identificación</p>
                </div>
            </CardHeader>
            <CardContent className="p-6">
                <form onSubmit={updateProfile} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="text-sm font-semibold text-gray-700 block mb-2">Email</label>
                            <input 
                                type="text" 
                                disabled 
                                value={user?.email || ''} 
                                className="w-full p-2.5 border rounded-lg bg-gray-50 text-gray-500 font-mono text-sm" 
                            />
                        </div>
                        <div>
                            <label className="text-sm font-semibold text-gray-700 block mb-2">Nombre Completo</label>
                            <input 
                                type="text" 
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent outline-none transition-all" 
                                placeholder="Tu nombre completo"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end pt-2">
                        <Button type="submit" disabled={loading} className="bg-[#1e3a8a] hover:bg-blue-900 text-white">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Guardar Cambios
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>

        {/* Security Card */}
        <Card className="shadow-md border-gray-100 overflow-hidden bg-white">
            <CardHeader className="flex flex-row items-center gap-4 bg-gray-50/50 border-b border-gray-100">
                <div className="bg-red-100 p-2 rounded-lg">
                    <Lock className="w-5 h-5 text-red-700" />
                </div>
                <div>
                    <CardTitle className="text-lg font-bold text-gray-800">Seguridad</CardTitle>
                    <p className="text-xs text-gray-500">Actualiza tu contraseña</p>
                </div>
            </CardHeader>
            <CardContent className="p-6">
                <form onSubmit={handleChangePassword} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="text-sm font-semibold text-gray-700 block mb-2">Nueva Contraseña</label>
                            <input 
                                type="password" 
                                value={pwdData.newPassword}
                                onChange={(e) => setPwdData({...pwdData, newPassword: e.target.value})}
                                className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent outline-none transition-all"
                                placeholder="••••••••"
                            />
                            <p className="text-xs text-gray-400 mt-1">Mínimo 8 caracteres, 1 mayúscula, 1 número</p>
                        </div>
                        <div>
                            <label className="text-sm font-semibold text-gray-700 block mb-2">Confirmar Contraseña</label>
                            <input 
                                type="password" 
                                value={pwdData.confirmPassword}
                                onChange={(e) => setPwdData({...pwdData, confirmPassword: e.target.value})}
                                className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent outline-none transition-all"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end pt-2">
                         <Button type="submit" disabled={loading} variant="outline" className="border-gray-300 hover:bg-gray-50 text-gray-700">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Actualizar Contraseña
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>

        <div className="flex justify-center pt-8 pb-8">
            <ConfirmationModal
                title="¿Cerrar Sesión?"
                description="¿Estás seguro que quieres salir de tu cuenta?"
                confirmLabel="Cerrar Sesión"
                onConfirm={signOut}
                trigger={
                    <Button variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50 px-8">
                        <LogOut className="w-4 h-4 mr-2" /> Cerrar Sesión
                    </Button>
                }
            />
        </div>
      </div>
    </div>
  );
}
