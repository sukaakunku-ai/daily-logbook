import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export interface Entry {
  id: string;
  menu_id: string;
  user_id: string;
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CreateEntryInput {
  menu_id: string;
  data: Record<string, unknown>;
}

export interface UpdateEntryInput {
  id: string;
  data: Record<string, unknown>;
}

export function useEntries(menuId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const entriesQuery = useQuery({
    queryKey: ['entries', menuId],
    queryFn: async () => {
      if (!menuId) return [];
      const { data, error } = await supabase
        .from('entries')
        .select('*')
        .eq('menu_id', menuId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data.map((entry) => ({
        ...entry,
        data: (typeof entry.data === 'object' && entry.data !== null ? entry.data : {}) as Record<string, unknown>,
      })) as Entry[];
    },
    enabled: !!menuId,
  });

  const createEntry = useMutation({
    mutationFn: async (input: CreateEntryInput) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('entries')
        .insert({
          menu_id: input.menu_id,
          user_id: user.id,
          data: input.data as unknown as Json,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries', menuId] });
      toast.success('Entry submitted successfully');
    },
    onError: (error) => {
      toast.error('Failed to submit entry: ' + error.message);
    },
  });

  const updateEntry = useMutation({
    mutationFn: async (input: UpdateEntryInput) => {
      const { data, error } = await supabase
        .from('entries')
        .update({ data: input.data as unknown as Json })
        .eq('id', input.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries', menuId] });
      toast.success('Entry updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update entry: ' + error.message);
    },
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('entries').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries', menuId] });
      toast.success('Entry deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete entry: ' + error.message);
    },
  });

  return {
    entries: entriesQuery.data ?? [],
    isLoading: entriesQuery.isLoading,
    createEntry,
    updateEntry,
    deleteEntry,
  };
}
