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
import { toast } from 'sonner';

export type FieldType = 'text' | 'textarea' | 'number' | 'date' | 'time' | 'select' | 'checkbox' | 'file' | 'image' | 'icon_link';

export interface FormField {
  id: string;
  menu_id: string;
  label: string;
  description?: string;
  field_type: FieldType;
  required: boolean;
  options: string[];
  sort_order: number;
  visibility_logic?: {
    parent_field_id: string;
    trigger_value: string;
  };
  created_at: string;
  updated_at: string;
}

export interface CreateFieldInput {
  menu_id: string;
  label: string;
  description?: string;
  field_type: FieldType;
  required?: boolean;
  options?: string[];
  visibility_logic?: {
    parent_field_id: string;
    trigger_value: string;
  };
}

export interface UpdateFieldInput {
  id: string;
  label?: string;
  description?: string;
  field_type?: FieldType;
  required?: boolean;
  options?: string[];
  visibility_logic?: {
    parent_field_id: string;
    trigger_value: string;
  } | null;
}

export function useFormFields(menuId: string | undefined) {
  const queryClient = useQueryClient();

  const fieldsQuery = useQuery({
    queryKey: ['form_fields', menuId],
    queryFn: async () => {
      if (!menuId) return [];
      const q = query(
        collection(db, 'form_fields'),
        where('menu_id', '==', menuId)
      );
      const querySnapshot = await getDocs(q);
      const fields = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: (doc.data().created_at as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
        updated_at: (doc.data().updated_at as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
      })) as FormField[];
      return fields.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    },
    enabled: !!menuId,
  });

  const createField = useMutation({
    mutationFn: async (input: CreateFieldInput) => {
      // Get max sort_order without requiring composite index
      const q = query(
        collection(db, 'form_fields'),
        where('menu_id', '==', input.menu_id)
      );
      const querySnapshot = await getDocs(q);
      const maxOrder = querySnapshot.empty
        ? -1
        : Math.max(...querySnapshot.docs.map(doc => doc.data().sort_order ?? 0));

      const docRef = await addDoc(collection(db, 'form_fields'), {
        menu_id: input.menu_id,
        label: input.label,
        description: input.description ?? '',
        field_type: input.field_type,
        required: input.required ?? false,
        options: input.options ?? [],
        sort_order: maxOrder + 1,
        visibility_logic: input.visibility_logic ?? null,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
      return { id: docRef.id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form_fields', menuId] });
      toast.success('Field added successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to add field: ' + error.message);
    },
  });

  const updateField = useMutation({
    mutationFn: async (input: UpdateFieldInput) => {
      const docRef = doc(db, 'form_fields', input.id);
      const updateData: Record<string, unknown> = {
        updated_at: serverTimestamp(),
      };
      if (input.label !== undefined) updateData.label = input.label;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.field_type !== undefined) updateData.field_type = input.field_type;
      if (input.required !== undefined) updateData.required = input.required;
      if (input.options !== undefined) updateData.options = input.options;
      if (input.visibility_logic !== undefined) updateData.visibility_logic = input.visibility_logic;

      await updateDoc(docRef, updateData);
      return { id: input.id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form_fields', menuId] });
      toast.success('Field updated successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to update field: ' + error.message);
    },
  });

  const deleteField = useMutation({
    mutationFn: async (id: string) => {
      const docRef = doc(db, 'form_fields', id);
      await deleteDoc(docRef);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form_fields', menuId] });
      toast.success('Field deleted successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to delete field: ' + error.message);
    },
  });

  const reorderFields = useMutation({
    mutationFn: async (fields: { id: string; sort_order: number }[]) => {
      const batch = writeBatch(db);
      fields.forEach(({ id, sort_order }) => {
        const docRef = doc(db, 'form_fields', id);
        batch.update(docRef, { sort_order, updated_at: serverTimestamp() });
      });
      await batch.commit();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form_fields', menuId] });
    },
  });

  return {
    fields: fieldsQuery.data ?? [],
    isLoading: fieldsQuery.isLoading,
    createField,
    updateField,
    deleteField,
    reorderFields,
  };
}
