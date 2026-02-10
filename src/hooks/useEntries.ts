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
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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
  created_at?: Date;
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
      const q = query(
        collection(db, 'entries'),
        where('menu_id', '==', menuId)
      );
      const querySnapshot = await getDocs(q);
      const entries = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: (doc.data().created_at as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
        updated_at: (doc.data().updated_at as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
      })) as Entry[];
      // Sort manually by created_at descending
      return entries.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
    enabled: !!menuId,
  });

  const createEntry = useMutation({
    mutationFn: async (input: CreateEntryInput) => {
      if (!user) throw new Error('Not authenticated');
      const docRef = await addDoc(collection(db, 'entries'), {
        menu_id: input.menu_id,
        user_id: user.uid,
        data: input.data,
        created_at: input.created_at ? Timestamp.fromDate(input.created_at) : serverTimestamp(),
        updated_at: serverTimestamp(),
      });
      return { id: docRef.id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries', menuId] });
      toast.success('Entry submitted successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to submit entry: ' + error.message);
    },
  });

  const updateEntry = useMutation({
    mutationFn: async (input: UpdateEntryInput) => {
      const docRef = doc(db, 'entries', input.id);
      await updateDoc(docRef, {
        data: input.data,
        updated_at: serverTimestamp(),
      });
      return { id: input.id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries', menuId] });
      toast.success('Entry updated successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to update entry: ' + error.message);
    },
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      const docRef = doc(db, 'entries', id);
      await deleteDoc(docRef);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries', menuId] });
      toast.success('Entry deleted successfully');
    },
    onError: (error: any) => {
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
