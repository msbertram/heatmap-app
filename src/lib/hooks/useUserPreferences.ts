'use client';

import { useState, useEffect, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';

export interface UserPreferences {
  id?: string;
  user_id: string;
  opacity: number;
  radius: number;
  created_at?: string;
  updated_at?: string;
}

export function useUserPreferences(user: User | null) {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  // Load preferences when user changes
  useEffect(() => {
    if (!user) {
      setPreferences(null);
      setLoading(false);
      return;
    }

    loadPreferences();
  }, [user]);

  const loadPreferences = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned, which is fine for new users
        console.error('Error loading preferences:', error);
      }

      if (data) {
        setPreferences(data);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePreferences = useCallback(async (updates: Partial<Pick<UserPreferences, 'opacity' | 'radius'>>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          opacity: updates.opacity ?? preferences?.opacity ?? 0.15,
          radius: updates.radius ?? preferences?.radius ?? 10,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Error updating preferences:', error);
        return;
      }

      if (data) {
        setPreferences(data);
      }
    } catch (error) {
      console.error('Error updating preferences:', error);
    }
  }, [user, preferences]);

  return {
    preferences,
    loading,
    updatePreferences,
  };
}
