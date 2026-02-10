import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Loader2, Upload } from 'lucide-react';
import { useFormFields, FormField as FormFieldType } from '@/hooks/useFormFields';
import { useEntries, Entry } from '@/hooks/useEntries';
import { toast } from 'sonner';

interface DynamicFormProps {
  menuId: string;
  editingEntry?: Entry | null;
  onSuccess?: () => void;
}

export function DynamicForm({ menuId, editingEntry, onSuccess }: DynamicFormProps) {
  const { fields, isLoading: fieldsLoading } = useFormFields(menuId);
  const { createEntry, updateEntry } = useEntries(menuId);
  const [formData, setFormData] = useState<Record<string, unknown>>(editingEntry?.data ?? {});
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (fieldId: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleFileUpload = async (field: FormFieldType, file: File) => {
    setUploadingFiles((prev) => new Set(prev).add(field.id));
    try {
      // Upload to Google Drive via serverless function
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }

      const result = await response.json();

      handleChange(field.id, {
        fileId: result.fileId,
        fileName: result.fileName,
        url: result.url,
        webViewLink: result.webViewLink,
      });

      toast.success(`File uploaded successfully!`);
    } catch (error) {
      console.error('File upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload file');
    } finally {
      setUploadingFiles((prev) => {
        const newSet = new Set(prev);
        newSet.delete(field.id);
        return newSet;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate required fields
      for (const field of fields) {
        if (field.required) {
          const value = formData[field.id];
          if (value === undefined || value === null || value === '') {
            toast.error(`${field.label} is required`);
            setIsSubmitting(false);
            return;
          }
        }
      }

      if (editingEntry) {
        await updateEntry.mutateAsync({ id: editingEntry.id, data: formData });
      } else {
        await createEntry.mutateAsync({ menu_id: menuId, data: formData });
      }

      setFormData({});
      onSuccess?.();
    } catch (error) {
      // Error is handled by the mutation
    } finally {
      setIsSubmitting(false);
    }
  };

  if (fieldsLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading form...</p>
        </CardContent>
      </Card>
    );
  }

  if (fields.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Submit New Entry</CardTitle>
          <CardDescription>Fill out the form to add a new entry.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Plus className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No form fields defined</h3>
            <p className="text-muted-foreground mt-2">
              Go to Form Builder to define fields for this tracker.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{editingEntry ? 'Edit Entry' : 'Submit New Entry'}</CardTitle>
        <CardDescription>
          {editingEntry ? 'Update the entry details.' : 'Fill out the form to add a new entry.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((field) => (
            <div key={field.id} className="space-y-2">
              <Label htmlFor={field.id}>
                {field.label}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              {renderField(field, formData[field.id], handleChange, handleFileUpload, uploadingFiles.has(field.id))}
            </div>
          ))}
          <div className="pt-4">
            <Button type="submit" disabled={isSubmitting || uploadingFiles.size > 0}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingEntry ? 'Save Changes' : 'Submit Entry'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function renderField(
  field: FormFieldType,
  value: unknown,
  onChange: (fieldId: string, value: unknown) => void,
  onFileUpload: (field: FormFieldType, file: File) => void,
  isUploading: boolean
) {
  switch (field.field_type) {
    case 'text':
      return (
        <Input
          id={field.id}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(field.id, e.target.value)}
          required={field.required}
        />
      );
    case 'textarea':
      return (
        <Textarea
          id={field.id}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(field.id, e.target.value)}
          rows={4}
          required={field.required}
        />
      );
    case 'number':
      return (
        <Input
          id={field.id}
          type="number"
          value={(value as number) ?? ''}
          onChange={(e) => onChange(field.id, e.target.valueAsNumber || '')}
          required={field.required}
        />
      );
    case 'date':
      return (
        <Input
          id={field.id}
          type="date"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(field.id, e.target.value)}
          required={field.required}
        />
      );
    case 'select':
      return (
        <Select
          value={(value as string) ?? ''}
          onValueChange={(v) => onChange(field.id, v)}
          required={field.required}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case 'checkbox':
      return (
        <div className="flex items-center gap-2">
          <Checkbox
            id={field.id}
            checked={(value as boolean) ?? false}
            onCheckedChange={(c) => onChange(field.id, c === true)}
          />
          <Label htmlFor={field.id} className="cursor-pointer font-normal">
            Yes
          </Label>
        </div>
      );
    case 'file':
      const fileValue = value as { fileName?: string; webViewLink?: string } | undefined;
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Input
              id={field.id}
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onFileUpload(field, file);
              }}
              disabled={isUploading}
              className="flex-1"
            />
            {isUploading && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>
          {fileValue?.fileName && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Upload className="h-4 w-4" />
              <a
                href={fileValue.webViewLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {fileValue.fileName}
              </a>
            </div>
          )}
        </div>
      );
    default:
      return null;
  }
}
