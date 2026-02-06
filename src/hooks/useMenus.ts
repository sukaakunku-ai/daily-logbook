import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
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
    queryKey: ['menus', user?.uid],
    queryFn: async () => {
      if (!user) return [];
      const q = query(
        collection(db, 'menus'),
        where('user_id', '==', user.uid),
        orderBy('sort_order', 'asc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: (doc.data().created_at as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
        updated_at: (doc.data().updated_at as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
      })) as Menu[];
    },
    enabled: !!user,
  });

  // Show error if query fails (e.g., missing index)
  useEffect(() => {
    if (menusQuery.error) {
      console.error('Firestore Query Error:', menusQuery.error);
      toast.error('Failed to load trackers: ' + (menusQuery.error as any).message);
    }
  }, [menusQuery.error]);

  const createMenu = useMutation({
    mutationFn: async ({ name, icon = 'file-text' }: { name: string; icon?: string }) => {
      if (!user) throw new Error('Not authenticated');

      const q = query(
        collection(db, 'menus'),
        where('user_id', '==', user.uid),
        orderBy('sort_order', 'desc'),
        limit(1)
      );
      const querySnapshot = await getDocs(q);
      const maxOrder = querySnapshot.empty ? -1 : querySnapshot.docs[0].data().sort_order;

      const docRef = await addDoc(collection(db, 'menus'), {
        name,
        icon,
        user_id: user.uid,
        sort_order: maxOrder + 1,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
      return { id: docRef.id };
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
      const docRef = doc(db, 'menus', id);
      await updateDoc(docRef, {
        name,
        ...(icon && { icon }),
        updated_at: serverTimestamp(),
      });
      return { id };
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
      const docRef = doc(db, 'menus', id);
      await deleteDoc(docRef);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menus'] });
      toast.success('Menu deleted successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to delete menu: ' + error.message);
    },
  });

  const reorderMenus = useMutation({
    mutationFn: async (menus: { id: string; sort_order: number }[]) => {
      const batch = writeBatch(db);
      menus.forEach(({ id, sort_order }) => {
        const docRef = doc(db, 'menus', id);
        batch.update(docRef, { sort_order, updated_at: serverTimestamp() });
      });
      await batch.commit();
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