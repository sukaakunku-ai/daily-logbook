 import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
 import { supabase } from '@/integrations/supabase/client';
 import { useAuth } from '@/contexts/AuthContext';
 import { toast } from 'sonner';
 
 export interface Menu {
   id: string;
   user_id: string;
   name: string;
   icon: string;
   sort_order: number;
   created_at: string;
   updated_at: string;
 }
 
 export function useMenus() {
   const { user } = useAuth();
   const queryClient = useQueryClient();
 
   const menusQuery = useQuery({
     queryKey: ['menus', user?.id],
     queryFn: async () => {
       if (!user) return [];
       const { data, error } = await supabase
         .from('menus')
         .select('*')
         .order('sort_order', { ascending: true });
       if (error) throw error;
       return data as Menu[];
     },
     enabled: !!user,
   });
 
   const createMenu = useMutation({
     mutationFn: async ({ name, icon = 'file-text' }: { name: string; icon?: string }) => {
       if (!user) throw new Error('Not authenticated');
       const { data: existing } = await supabase
         .from('menus')
         .select('sort_order')
         .order('sort_order', { ascending: false })
         .limit(1);
       
       const maxOrder = existing?.[0]?.sort_order ?? -1;
       
       const { data, error } = await supabase
         .from('menus')
         .insert({ name, icon, user_id: user.id, sort_order: maxOrder + 1 })
         .select()
         .single();
       if (error) throw error;
       return data;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['menus'] });
       toast.success('Menu created successfully');
     },
     onError: (error) => {
       toast.error('Failed to create menu: ' + error.message);
     },
   });
 
   const updateMenu = useMutation({
     mutationFn: async ({ id, name, icon }: { id: string; name: string; icon?: string }) => {
       const { data, error } = await supabase
         .from('menus')
         .update({ name, icon })
         .eq('id', id)
         .select()
         .single();
       if (error) throw error;
       return data;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['menus'] });
       toast.success('Menu updated successfully');
     },
     onError: (error) => {
       toast.error('Failed to update menu: ' + error.message);
     },
   });
 
   const deleteMenu = useMutation({
     mutationFn: async (id: string) => {
       const { error } = await supabase.from('menus').delete().eq('id', id);
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['menus'] });
       toast.success('Menu deleted successfully');
     },
     onError: (error) => {
       toast.error('Failed to delete menu: ' + error.message);
     },
   });
 
   const reorderMenus = useMutation({
     mutationFn: async (menus: { id: string; sort_order: number }[]) => {
       const updates = menus.map(({ id, sort_order }) =>
         supabase.from('menus').update({ sort_order }).eq('id', id)
       );
       await Promise.all(updates);
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['menus'] });
     },
   });
 
   return {
     menus: menusQuery.data ?? [],
     isLoading: menusQuery.isLoading,
     createMenu,
     updateMenu,
     deleteMenu,
     reorderMenus,
   };
 }