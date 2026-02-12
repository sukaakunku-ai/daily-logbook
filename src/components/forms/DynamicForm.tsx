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
  formSettings?: {
    title?: string;
    description?: string;
    header_image?: string;
  };
}

export function DynamicForm({ menuId, editingEntry, onSuccess, formSettings }: DynamicFormProps) {
  const { fields: allFields, isLoading: fieldsLoading } = useFormFields(menuId);
  const fields = allFields.filter(f => f.field_type !== 'icon_link');
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
        headers: {
          'X-Menu-Id': menuId,
          'X-Field-Label': field.label,
        },
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
        // Skip validation if field is hidden by conditional logic
        if (field.visibility_logic?.parent_field_id) {
          const parentVal = formData[field.visibility_logic.parent_field_id];
          const triggerVal = field.visibility_logic.trigger_value;
          const isVisible = Array.isArray(parentVal)
            ? parentVal.includes(triggerVal)
            : String(parentVal ?? '') === String(triggerVal);

          if (!isVisible) continue;
        }

        if (field.required) {
          const value = formData[field.id];

          // Helper to check if a value is truly empty (ignoring internal flags)
          const isTrulyEmpty = (val: any) => {
            if (val === undefined || val === null || val === '') return true;
            if (val === '__other__') return true;
            if (Array.isArray(val)) {
              // Filter out helper flag and any empty strings
              const filtered = val.filter(v => v !== "__other_active__" && String(v).trim() !== "");
              return filtered.length === 0;
            }
            return false;
          };

          if (isTrulyEmpty(value)) {
            toast.error(`${field.label} is required`);
            setIsSubmitting(false);
            return;
          }
        }
      }

      // Sanitize data (remove internal helper flags)
      const sanitizedData = { ...formData };
      Object.keys(sanitizedData).forEach(key => {
        const val = sanitizedData[key];
        if (Array.isArray(val)) {
          sanitizedData[key] = val.filter(v => v !== "__other_active__");
        } else if (val === "__other__") {
          sanitizedData[key] = "";
        }
      });

      if (editingEntry) {
        await updateEntry.mutateAsync({ id: editingEntry.id, data: sanitizedData });
      } else {
        await createEntry.mutateAsync({ menu_id: menuId, data: sanitizedData });
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
    <Card className="overflow-hidden shadow-md">
      {formSettings?.header_image && (
        <div className="w-full h-48 sm:h-64 relative bg-muted">
          <img
            src={formSettings.header_image}
            alt="Form Header"
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <CardHeader>
        <CardTitle>
          {editingEntry
            ? 'Edit Entry'
            : (formSettings?.title || 'Submit New Entry')}
        </CardTitle>
        <CardDescription className="pt-2">
          <div className="whitespace-pre-wrap text-sm leading-relaxed">
            {editingEntry
              ? 'Update the entry details.'
              : (formSettings?.description || 'Fill out the form to add a new entry.')}
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {fields.map((field) => {
            // Conditional Visibility Logic
            if (field.visibility_logic?.parent_field_id) {
              const parentVal = formData[field.visibility_logic.parent_field_id];
              const triggerVal = field.visibility_logic.trigger_value;

              // Handle case where parent value might be string, number, or array
              const isVisible = Array.isArray(parentVal)
                ? parentVal.includes(triggerVal)
                : String(parentVal ?? '') === String(triggerVal);

              if (!isVisible) return null;
            }

            const isIconLink = field.field_type === 'icon_link';
            return (
              <div
                key={field.id}
                className={isIconLink ? 'col-span-1' : 'col-span-full space-y-2'}
              >
                {!isIconLink && (
                  <div className="space-y-1">
                    <Label htmlFor={field.id} className="text-sm font-semibold">
                      {field.label}
                      {field.required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    {field.description && (
                      <p className="text-[11px] text-muted-foreground italic leading-tight">
                        {field.description}
                      </p>
                    )}
                  </div>
                )}
                {renderField(field, formData[field.id], handleChange, handleFileUpload, uploadingFiles.has(field.id))}
              </div>
            );
          })}
          <div className="col-span-full pt-4">
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
    case 'time':
      return (
        <Input
          id={field.id}
          type="time"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(field.id, e.target.value)}
          required={field.required}
        />
      );
    case 'select':
      const isOtherSelected = field.allow_other && value && !field.options.includes(value as string);
      return (
        <div className="space-y-2">
          <Select
            value={isOtherSelected ? "__other__" : ((value as string) ?? '')}
            onValueChange={(v) => {
              if (v === "__other__") {
                onChange(field.id, "__other__");
              } else {
                onChange(field.id, v);
              }
            }}
            required={field.required && !isOtherSelected}
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
              {field.allow_other && (
                <SelectItem value="__other__">Other...</SelectItem>
              )}
            </SelectContent>
          </Select>
          {field.allow_other && (isOtherSelected || value === "__other__") && (
            <Input
              placeholder="Please specify..."
              value={isOtherSelected ? (value as string) : ""}
              onChange={(e) => onChange(field.id, e.target.value)}
              className="mt-2 animate-fade-in"
              autoFocus
              required={field.required}
            />
          )}
        </div>
      );
    case 'checkbox':
      if (field.options && field.options.length > 0) {
        const selectedValues = (value as string[]) ?? [];
        const otherValue = field.allow_other
          ? selectedValues.find(v => !field.options.includes(v) && v !== "__other_active__")
          : undefined;
        const isOtherChecked = otherValue !== undefined || selectedValues.includes("__other_active__");

        return (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 border rounded-lg bg-muted/30">
              {field.options.map((option) => (
                <div key={option} className="flex items-center gap-2">
                  <Checkbox
                    id={`${field.id}-${option}`}
                    checked={selectedValues.includes(option)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        onChange(field.id, [...selectedValues, option]);
                      } else {
                        onChange(field.id, selectedValues.filter((v) => v !== option));
                      }
                    }}
                  />
                  <Label
                    htmlFor={`${field.id}-${option}`}
                    className="cursor-pointer font-normal text-sm"
                  >
                    {option}
                  </Label>
                </div>
              ))}
              {field.allow_other && (
                <div className="flex items-center gap-2 border-l pl-3 ml-1 border-primary/20">
                  <Checkbox
                    id={`${field.id}-other`}
                    checked={isOtherChecked}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        onChange(field.id, [...selectedValues, "__other_active__"]);
                      } else {
                        // Remove both the active flag and any custom value
                        onChange(field.id, selectedValues.filter(v => field.options.includes(v)));
                      }
                    }}
                  />
                  <Label
                    htmlFor={`${field.id}-other`}
                    className="cursor-pointer font-normal text-sm text-primary font-medium"
                  >
                    Other...
                  </Label>
                </div>
              )}
            </div>
            {field.allow_other && isOtherChecked && (
              <Input
                placeholder="Please specify other..."
                value={otherValue ?? ""}
                onChange={(e) => {
                  const baseValues = selectedValues.filter(v => field.options.includes(v));
                  if (e.target.value.trim()) {
                    onChange(field.id, [...baseValues, e.target.value]);
                  } else {
                    onChange(field.id, [...baseValues, "__other_active__"]);
                  }
                }}
                className="animate-fade-in"
                autoFocus
                required={field.required}
              />
            )}
          </div>
        );
      }
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
    case 'image':
      const imageValue = value as { fileName?: string; webViewLink?: string; url?: string } | undefined;
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Input
              id={field.id}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onFileUpload(field, file);
              }}
              disabled={isUploading}
              className="flex-1"
            />
            {isUploading && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>
          {imageValue?.webViewLink && (
            <div className="relative aspect-video w-full max-w-sm rounded-lg overflow-hidden border bg-muted">
              <img
                src={imageValue.url || imageValue.webViewLink.replace('/view', '/preview')}
                alt="Preview"
                className="object-cover w-full h-full"
                onError={(e) => {
                  // Fallback if direct link fails
                  e.currentTarget.style.display = 'none';
                }}
              />
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-2 text-white text-xs truncate">
                {imageValue.fileName}
              </div>
            </div>
          )}
          {imageValue?.webViewLink && (
            <a
              href={imageValue.webViewLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1 text-sm"
            >
              View full image <Upload className="h-3 w-3" />
            </a>
          )}
        </div>
      );
    case 'icon_link':
      const [iconUrl, targetUrl] = field.options || [];
      return (
        <a
          href={targetUrl || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center justify-center p-6 border rounded-xl hover:bg-muted/50 hover:shadow-md transition-all group cursor-pointer no-underline text-foreground"
        >
          <div className="w-16 h-16 mb-3 relative flex items-center justify-center bg-primary/10 rounded-full group-hover:scale-110 transition-transform">
            {iconUrl ? (
              <img src={iconUrl} alt={field.label} className="w-10 h-10 object-contain" />
            ) : (
              <span className="text-2xl font-bold text-primary">🔗</span>
            )}
          </div>
          <span className="text-sm font-medium text-center">{field.label}</span>
        </a>
      );
    default:
      return null;
  }
}
