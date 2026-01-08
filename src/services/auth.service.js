
import { supabase } from '@/lib/customSupabaseClient';

// Environment variable validation
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables");
}

export const authService = {
  async signUp(email, password, fullName) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/login`
        },
      });
      if (error) throw error;
      return { success: true, data, error: null };
    } catch (error) {
      console.error("SignUp Error:", error);
      return { success: false, data: null, error: error.message };
    }
  },

  async signIn(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return { success: true, data, error: null };
    } catch (error) {
      console.error("SignIn Error:", error);
      return { success: false, data: null, error: error.message };
    }
  },

  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      return user;
    } catch (error) {
      return null;
    }
  },

  async resendVerificationEmail(email) {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/login`
        }
      });
      if (error) throw error;
      return { success: true, message: "Email de confirmación reenviado." };
    } catch (error) {
      return { success: false, message: error.message };
    }
  },
  
  async updateProfile(userId, fullName) {
    try {
      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: fullName }
      });
      if (authError) throw authError;

      const { error: dbError } = await supabase
        .from('users')
        .update({ full_name: fullName })
        .eq('id', userId);
        
      if (dbError) throw dbError;

      return { success: true, message: "Perfil actualizado." };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async changePassword(newPassword) {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (error) throw error;
      return { success: true, message: "Contraseña actualizada exitosamente." };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
};
