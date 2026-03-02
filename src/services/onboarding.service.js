import { supabase } from '@/lib/customSupabaseClient';

const TABLE = 'onboarding_progress';

const warn = (context, error) => {
  console.warn(`[onboarding] ${context}`, error?.message || error);
};

export const onboardingService = {
  async getOnboardingProgress(userId) {
    if (!userId) return { success: false, data: [] };
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select('id, user_id, role, completed, completed_at')
        .eq('user_id', userId);

      if (error) {
        warn('getOnboardingProgress', error);
        return { success: false, data: [] };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      warn('getOnboardingProgress', error);
      return { success: false, data: [] };
    }
  },

  async setOnboardingCompleted(userId, role) {
    if (!userId) return { success: false };
    const resolvedRole = role || 'solicitante';
    const payload = {
      user_id: userId,
      role: resolvedRole,
      completed: true,
      completed_at: new Date().toISOString()
    };

    try {
      const { data: existing, error: fetchError } = await supabase
        .from(TABLE)
        .select('id')
        .eq('user_id', userId)
        .eq('role', resolvedRole)
        .maybeSingle();

      if (fetchError) {
        warn('setOnboardingCompleted:fetch', fetchError);
        return { success: false };
      }

      if (existing?.id) {
        const { error } = await supabase
          .from(TABLE)
          .update({ completed: true, completed_at: payload.completed_at })
          .eq('id', existing.id);

        if (error) {
          warn('setOnboardingCompleted:update', error);
          return { success: false };
        }

        return { success: true };
      }

      const { error } = await supabase
        .from(TABLE)
        .insert([payload]);

      if (error) {
        warn('setOnboardingCompleted:insert', error);
        return { success: false };
      }

      return { success: true };
    } catch (error) {
      warn('setOnboardingCompleted', error);
      return { success: false };
    }
  },

  async resetOnboarding(userId, role) {
    if (!userId) return { success: false };
    try {
      let query = supabase.from(TABLE).delete().eq('user_id', userId);
      if (role) query = query.eq('role', role);

      const { error } = await query;
      if (error) {
        warn('resetOnboarding', error);
        return { success: false };
      }

      return { success: true };
    } catch (error) {
      warn('resetOnboarding', error);
      return { success: false };
    }
  }
};
