'use client';

import { useState, useEffect, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';

export interface AddressHistoryItem {
  id?: string;
  user_id: string;
  address: string;
  place_name: string;
  longitude: number;
  latitude: number;
  searched_at?: string;
}

export function useAddressHistory(user: User | null) {
  const [history, setHistory] = useState<AddressHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Load history when user changes
  useEffect(() => {
    if (!user) {
      setHistory([]);
      return;
    }

    loadHistory();
  }, [user]);

  const loadHistory = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('address_history')
        .select('*')
        .eq('user_id', user.id)
        .order('searched_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error loading address history:', error);
        return;
      }

      if (data) {
        setHistory(data);
      }
    } catch (error) {
      console.error('Error loading address history:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToHistory = useCallback(async (item: Omit<AddressHistoryItem, 'id' | 'user_id' | 'searched_at'>) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('address_history')
        .upsert({
          user_id: user.id,
          address: item.address,
          place_name: item.place_name,
          longitude: item.longitude,
          latitude: item.latitude,
          searched_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Error adding to address history:', error);
        return;
      }

      // Reload history to get updated list
      await loadHistory();
    } catch (error) {
      console.error('Error adding to address history:', error);
    }
  }, [user]);

  return {
    history,
    loading,
    addToHistory,
  };
}
