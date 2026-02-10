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
  parentId?: string | null;
  created_at: string;
  updated_at: string;
}

export function useMenus() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const menusQuery = useQuery({
    queryKey: ['menus', user?.uid],
    queryFn: async () => {
      if (!user) {
        return [];
      }
      // Remove orderBy to avoid requiring composite index - we'll sort manually instead
      const q = query(
        collection(db, 'menus'),
        where('user_id', '==', user.uid)
      );
      const querySnapshot = await getDocs(q);
      const menus = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: (doc.data().created_at as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
        updated_at: (doc.data().updated_at as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
      })) as Menu[];
      // Sort manually by sort_order
      return menus.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    },
    enabled: !!user,
  });

  // Show error if query fails - removed useEffect to prevent re-render issues
  if (menusQuery.error) {
    console.error('Firestore Query Error:', menusQuery.error);
    toast.error('Failed to load menus: ' + (menusQuery.error as any).message);
  }

  const createMenu = useMutation({
    mutationFn: async ({ name, icon = 'file-text', parentId = null }: { name: string; icon?: string; parentId?: string | null }) => {
      if (!user) throw new Error('Not authenticated');

      // Get max sort_order within the same parent (or top-level)
      const q = query(
        collection(db, 'menus'),
        where('user_id', '==', user.uid),
        where('parentId', '==', parentId)
      );
      const querySnapshot = await getDocs(q);
      const maxOrder = querySnapshot.empty
        ? -1
        : Math.max(...querySnapshot.docs.map(doc => doc.data().sort_order ?? 0));

      const docRef = await addDoc(collection(db, 'menus'), {
        name,
        icon,
        user_id: user.uid,
        parentId,
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