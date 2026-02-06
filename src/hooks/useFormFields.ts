import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export type FieldType = 'text' | 'textarea' | 'number' | 'date' | 'select' | 'checkbox' | 'file';

export interface FormField {
  id: string;
  menu_id: string;
  label: string;
  field_type: FieldType;
  required: boolean;
  options: string[];
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateFieldInput {
  menu_id: string;
  label: string;
  field_type: FieldType;
  required?: boolean;
  options?: string[];
}

export interface UpdateFieldInput {
  id: string;
  label?: string;
  field_type?: FieldType;
  required?: boolean;
  options?: string[];
}

export function useFormFields(menuId: string | undefined) {
  const queryClient = useQueryClient();

  const fieldsQuery = useQuery({
    queryKey: ['form_fields', menuId],
    queryFn: async () => {
      if (!menuId) return [];
      const { data, error } = await supabase
        .from('form_fields')
        .select('*')
        .eq('menu_id', menuId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data.map((field) => ({
        ...field,
        field_type: field.field_type as FieldType,
        options: Array.isArray(field.options) ? (field.options as string[]) : [],
      })) as FormField[];
    },
    enabled: !!menuId,
  });

  const createField = useMutation({
    mutationFn: async (input: CreateFieldInput) => {
      const { data: existing } = await supabase
        .from('form_fields')
        .select('sort_order')
        .eq('menu_id', input.menu_id)
        .order('sort_order', { ascending: false })
        .limit(1);

      const maxOrder = existing?.[0]?.sort_order ?? -1;

      const { data, error } = await supabase
        .from('form_fields')
        .insert({
          menu_id: input.menu_id,
          label: input.label,
          field_type: input.field_type,
          required: input.required ?? false,
          options: (input.options ?? []) as unknown as Json,
          sort_order: maxOrder + 1,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form_fields', menuId] });
      toast.success('Field added successfully');
    },
    onError: (error) => {
      toast.error('Failed to add field: ' + error.message);
    },
  });

  const updateField = useMutation({
    mutationFn: async (input: UpdateFieldInput) => {
      const updateData: Record<string, unknown> = {};
      if (input.label !== undefined) updateData.label = input.label;
      if (input.field_type !== undefined) updateData.field_type = input.field_type;
      if (input.required !== undefined) updateData.required = input.required;
      if (input.options !== undefined) updateData.options = input.options as unknown as Json;

      const { data, error } = await supabase
        .from('form_fields')
        .update(updateData)
        .eq('id', input.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form_fields', menuId] });
      toast.success('Field updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update field: ' + error.message);
    },
  });

  const deleteField = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('form_fields').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form_fields', menuId] });
      toast.success('Field deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete field: ' + error.message);
    },
  });

  const reorderFields = useMutation({
    mutationFn: async (fields: { id: string; sort_order: number }[]) => {
      const updates = fields.map(({ id, sort_order }) =>
        supabase.from('form_fields').update({ sort_order }).eq('id', id)
      );
      await Promise.all(updates);
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
