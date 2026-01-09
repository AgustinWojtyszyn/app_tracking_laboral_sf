
import React, { useState } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { authService } from '@/services/auth.service';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { User, Lock, Loader2, LogOut, Eye, EyeOff } from 'lucide-react';
import { validatePassword } from '@/utils/validators';
import ConfirmationModal from '@/components/common/ConfirmationModal';

export default function SettingsPage() {
    const { user, profile, signOut, updateProfile: updateProfileCtx } = useAuth();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  
  const [pwdData, setPwdData] = useState({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
  });

  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

    const updateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
                const result = await updateProfileCtx(user.id, fullName);
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

      if (!pwdData.currentPassword) {
          addToast("Ingresa tu contraseña actual", "error");
          return;
      }
      
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
      try {
          // Verificar contraseña actual intentando iniciar sesión de nuevo
          const verify = await authService.signIn(user.email, pwdData.currentPassword);
          if (!verify.success) {
              setLoading(false);
              addToast("La contraseña actual no es correcta", "error");
              return;
          }

          const result = await authService.changePassword(pwdData.newPassword);
          setLoading(false);

          if (result.success) {
              addToast(result.message, "success");
              setPwdData({ currentPassword: '', newPassword: '', confirmPassword: '' });
          } else {
              addToast(result.message || result.error, "error");
          }
      } catch (err) {
          setLoading(false);
          addToast("No se pudo actualizar la contraseña", "error");
      }
  };

    return (
        <div className="space-y-10 max-w-4xl mx-auto py-8 animate-in fade-in duration-500">
            <div>
	    <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-slate-50">Configuración</h1>
	    <p className="text-lg md:text-xl text-gray-500 dark:text-slate-300">Gestiona tu cuenta y seguridad</p>
            </div>

            <div className="grid gap-8">
                {/* Profile Card */}
	    <Card className="shadow-md border-gray-100 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 card-lg">
                    <CardHeader className="flex flex-row items-center gap-4 bg-gray-50/50 dark:bg-slate-800/60 border-b border-gray-100 dark:border-slate-800">
                        <div className="bg-blue-100 dark:bg-blue-900/40 p-2 rounded-lg">
                            <User className="w-5 h-5 text-[#1e3a8a] dark:text-blue-100" />
                        </div>
                        <div>
                            <CardTitle className="text-xl md:text-2xl font-bold text-gray-800 dark:text-slate-50">Información Personal</CardTitle>
                            <p className="text-sm md:text-base text-gray-500 dark:text-slate-300">Tus datos de identificación</p>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        <form onSubmit={updateProfile} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-lg font-semibold text-gray-700 dark:text-slate-100 block mb-2">Email</label>
                                    <input 
                                        type="text" 
                                        disabled 
                                        value={user?.email || ''} 
                                        className="w-full p-3 border rounded-lg bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-300 font-mono text-base" 
                                    />
                                </div>
                                <div>
                                    <label className="text-lg font-semibold text-gray-700 dark:text-slate-100 block mb-2">Nombre Completo</label>
                                    <input 
                                        type="text" 
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent outline-none transition-all text-base bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-50 placeholder:text-gray-400 dark:placeholder:text-slate-400" 
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
	    <Card className="shadow-md border-gray-100 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 card-lg">
                    <CardHeader className="flex flex-row items-center gap-4 bg-gray-50/50 dark:bg-slate-800/60 border-b border-gray-100 dark:border-slate-800">
                        <div className="bg-red-100 dark:bg-red-900/40 p-2 rounded-lg">
                            <Lock className="w-5 h-5 text-red-700 dark:text-red-200" />
                        </div>
                        <div>
                            <CardTitle className="text-xl md:text-2xl font-bold text-gray-800 dark:text-slate-50">Seguridad</CardTitle>
                            <p className="text-sm md:text-base text-gray-500 dark:text-slate-300">Actualiza tu contraseña</p>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                                                        <label className="text-base font-semibold text-gray-700 block mb-2">Contraseña Actual</label>
                                                                        <div className="relative">
                                                                            <input 
                                                                                    type={showCurrentPwd ? "text" : "password"}
                                                                                    value={pwdData.currentPassword}
                                                                                    onChange={(e) => setPwdData({...pwdData, currentPassword: e.target.value})}
                                                                                    className="w-full p-2.5 pr-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent outline-none transition-all bg-white text-gray-900 placeholder:text-gray-400 dark:bg-slate-900 dark:text-slate-50 dark:placeholder:text-slate-400"
                                                                                    placeholder="••••••••"
                                                                            />
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setShowCurrentPwd(!showCurrentPwd)}
                                                                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                                                                                aria-label={showCurrentPwd ? "Ocultar contraseña actual" : "Mostrar contraseña actual"}
                                                                            >
                                                                                {showCurrentPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                                            </button>
                                                                        </div>
                                                                </div>
                                                                <div>
                                    <label className="text-base font-semibold text-gray-700 block mb-2">Nueva Contraseña</label>
                                                                        <div className="relative">
                                                                            <input 
                                                                                    type={showNewPwd ? "text" : "password"}
                                                                                    value={pwdData.newPassword}
                                                                                    onChange={(e) => setPwdData({...pwdData, newPassword: e.target.value})}
                                                                                    className="w-full p-2.5 pr-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent outline-none transition-all bg-white text-gray-900 placeholder:text-gray-400 dark:bg-slate-900 dark:text-slate-50 dark:placeholder:text-slate-400"
                                                                                    placeholder="••••••••"
                                                                            />
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setShowNewPwd(!showNewPwd)}
                                                                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                                                                                aria-label={showNewPwd ? "Ocultar nueva contraseña" : "Mostrar nueva contraseña"}
                                                                            >
                                                                                {showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                                            </button>
                                                                        </div>
                                    <p className="text-sm md:text-base text-gray-400 mt-1">Mínimo 8 caracteres, 1 mayúscula, 1 número</p>
                                </div>
                                <div>
                                    <label className="text-base font-semibold text-gray-700 block mb-2">Confirmar Contraseña</label>
                                                                        <div className="relative">
                                                                            <input 
                                                                                    type={showConfirmPwd ? "text" : "password"}
                                                                                    value={pwdData.confirmPassword}
                                                                                    onChange={(e) => setPwdData({...pwdData, confirmPassword: e.target.value})}
                                                                                    className="w-full p-2.5 pr-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent outline-none transition-all bg-white text-gray-900 placeholder:text-gray-400 dark:bg-slate-900 dark:text-slate-50 dark:placeholder:text-slate-400"
                                                                                    placeholder="••••••••"
                                                                            />
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                                                                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                                                                                aria-label={showConfirmPwd ? "Ocultar confirmación" : "Mostrar confirmación"}
                                                                            >
                                                                                {showConfirmPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                                            </button>
                                                                        </div>
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
                            <Button variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50 px-8 text-base md:text-lg">
                                <LogOut className="w-4 h-4 mr-2" /> Cerrar Sesión
                            </Button>
                        }
                    />
                </div>
            </div>
        </div>
    );
}
