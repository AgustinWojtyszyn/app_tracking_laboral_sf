
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { authService } from '@/services/auth.service';
import { useToast } from '@/contexts/ToastContext';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const { addToast } = useToast();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch public user profile
  const fetchProfile = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase.from('users').select('*').eq('id', userId).single();
      if (!error && data) {
        if (data.deleted_at) {
          await supabase.auth.signOut();
          setUser(null);
          setProfile(null);
          setSession(null);
          addToast('Tu usuario fue desactivado.', 'error');
          return;
        }
        setProfile(data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  }, [addToast]);

  const handleSession = useCallback(async (currentSession, { ensureProfile: shouldEnsureProfile = false } = {}) => {
    setSession(currentSession);
    const currentUser = currentSession?.user ?? null;
    setUser(currentUser);
    
    if (currentUser) {
       if (shouldEnsureProfile) {
         await authService.ensureProfile({ user: currentUser });
       }
       await fetchProfile(currentUser.id);
    } else {
       setProfile(null);
    }
    setLoading(false);
  }, [fetchProfile]);

  useEffect(() => {
    // Initial check
    const initAuth = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        if (error) throw error;
        await handleSession(initialSession);
      } catch (err) {
        console.error("Auth init error:", err);
        setLoading(false);
      }
    };
    initAuth();

    // Subscription
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        handleSession(session, { ensureProfile: true });
        return;
      }
      handleSession(session);
    });

    return () => subscription.unsubscribe();
  }, [handleSession]);

  const signUp = useCallback(async (email, password, fullName) => {
    return await authService.signUp(email, password, fullName);
  }, []);

  const signIn = useCallback(async (email, password) => {
    return await authService.signIn(email, password);
  }, []);

  const signOut = useCallback(async () => {
    const result = await authService.signOut();
    if (result.success) {
        setUser(null);
        setProfile(null);
        setSession(null);
    }
    return result;
  }, []);
  
  const resendVerification = useCallback(async (email) => {
      return await authService.resendVerificationEmail(email);
  }, []);
  
  const changePassword = useCallback(async (newPassword) => {
      return await authService.changePassword(newPassword);
  }, []);

  const resetPassword = useCallback(async (email) => {
    return await authService.resetPassword(email);
  }, []);

  const deleteAccount = useCallback(async () => {
    const result = await authService.deleteAccount();
    if (result.success) {
      setUser(null);
      setProfile(null);
      setSession(null);
      addToast('Cuenta eliminada.', 'success');
    } else {
      addToast(result.message || 'No se pudo eliminar la cuenta.', 'error');
    }
    return result;
  }, [addToast]);
  
  const updateProfile = useCallback(async (userId, fullName) => {
      const result = await authService.updateProfile(userId, fullName);
      if(result.success) {
          await fetchProfile(userId);
      }
      return result;
  }, [fetchProfile]);

  // Determine if email is confirmed. 
  // Supabase sets `email_confirmed_at` string if confirmed.
  const isEmailConfirmed = !!user?.email_confirmed_at;

  const value = useMemo(() => ({
    user,
    profile,
    session,
    loading,
    isAdmin: profile?.role === 'admin',
    userRole: profile?.role || 'user',
    isEmailVerified: isEmailConfirmed,
    signUp,
    signIn,
    signOut,
    resendVerification,
    changePassword,
    updateProfile,
    resetPassword,
    deleteAccount
  }), [user, profile, session, loading, isEmailConfirmed, signUp, signIn, signOut, resendVerification, changePassword, updateProfile, resetPassword, deleteAccount]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
