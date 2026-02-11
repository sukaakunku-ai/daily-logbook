import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Loader2, Upload } from 'lucide-react';
import type { FieldType, FormField, CreateFieldInput, UpdateFieldInput } from '@/hooks/useFormFields';
import { toast } from 'sonner';

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Long Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'time', label: 'Time' },
  { value: 'select', label: 'Dropdown' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'file', label: 'File Upload' },
  { value: 'icon_link', label: 'Icon Link' },
];

interface AddFieldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  menuId: string;
  editingField?: FormField | null;
  onSubmit: (data: CreateFieldInput | UpdateFieldInput) => void;
  isPending: boolean;
  previousFields: FormField[];
}

export function AddFieldDialog({
  open,
  onOpenChange,
  menuId,
  editingField,
  onSubmit,
  isPending,
  previousFields,
}: AddFieldDialogProps) {
  const [label, setLabel] = useState(editingField?.label ?? '');
  const [description, setDescription] = useState(editingField?.description ?? '');
  const [fieldType, setFieldType] = useState<FieldType>(editingField?.field_type ?? 'text');
  const [required, setRequired] = useState(editingField?.required ?? false);
  const [options, setOptions] = useState<string[]>(editingField?.options ?? []);
  const [newOption, setNewOption] = useState('');
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);

  const [parentFieldId, setParentFieldId] = useState(editingField?.visibility_logic?.parent_field_id ?? '');
  const [triggerValue, setTriggerValue] = useState(editingField?.visibility_logic?.trigger_value ?? '');

  // Sync state when editingField changes
  useEffect(() => {
    if (editingField) {
      setLabel(editingField.label);
      setDescription(editingField.description || '');
      setFieldType(editingField.field_type);
      setRequired(editingField.required);
      setOptions(editingField.options || []);
      setParentFieldId(editingField.visibility_logic?.parent_field_id ?? '');
      setTriggerValue(editingField.visibility_logic?.trigger_value ?? '');
    } else {
      setLabel('');
      setDescription('');
      setFieldType('text');
      setRequired(false);
      setOptions([]);
      setParentFieldId('');
      setTriggerValue('');
    }
  }, [editingField, open]);

  const handleClose = () => {
    setLabel('');
    setDescription('');
    setFieldType('text');
    setRequired(false);
    setOptions([]);
    setNewOption('');
    setIsUploadingIcon(false);
    setParentFieldId('');
    setTriggerValue('');
    onOpenChange(false);
  };

  const handleIconUpload = async (file: File) => {
    setIsUploadingIcon(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'X-Menu-Id': menuId,
          'X-Field-Label': 'Icon Link Image',
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }

      const result = await response.json();
      const imageUrl = result.url || result.webViewLink.replace('/view', '/preview');

      const newOpts = [...options];
      newOpts[0] = imageUrl;
      setOptions(newOpts);

      toast.success('Icon uploaded successfully');
    } catch (error) {
      console.error('Icon upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload icon');
    } finally {
      setIsUploadingIcon(false);
    }
  };

  const handleAddOption = () => {
    if (newOption.trim() && !options.includes(newOption.trim())) {
      setOptions([...options, newOption.trim()]);
      setNewOption('');
    }
  };

  const handleRemoveOption = (opt: string) => {
    setOptions(options.filter((o) => o !== opt));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;

    const includeOptions = fieldType === 'select' || fieldType === 'checkbox' || fieldType === 'icon_link';

    const visibility_logic = parentFieldId && triggerValue
      ? { parent_field_id: parentFieldId, trigger_value: triggerValue }
      : null;

    if (editingField) {
      onSubmit({
        id: editingField.id,
        label: label.trim(),
        description: description.trim(),
        field_type: fieldType,
        required,
        options: includeOptions ? options : [],
        visibility_logic,
      });
    } else {
      onSubmit({
        menu_id: menuId,
        label: label.trim(),
        description: description.trim(),
        field_type: fieldType,
        required,
        options: includeOptions ? options : [],
        visibility_logic: visibility_logic ?? undefined,
      });
    }
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{editingField ? 'Edit Field' : 'Add Field'}</DialogTitle>
            <DialogDescription>
              {editingField
                ? 'Update the field configuration.'
                : 'Add a new field to your form.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="label">Field Label</Label>
              <Input
                id="label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g., Customer Name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Field Note (Optional)</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short instructions for the inputter"
              />
              <p className="text-[10px] text-muted-foreground">Will be shown to users filling out the form.</p>
            </div>

            {fieldType === 'icon_link' && (
              <div className="space-y-4 border p-4 rounded-md bg-muted/20">
                <div className="space-y-2">
                  <Label htmlFor="iconFile">Icon / Image</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="iconFile"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleIconUpload(file);
                      }}
                      disabled={isUploadingIcon}
                    />
                    {isUploadingIcon && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                  </div>
                  {options[0] && (
                    <div className="mt-2 w-16 h-16 border rounded-lg overflow-hidden bg-white/50 flex items-center justify-center p-2 relative group">
                      <img src={options[0]} alt="Icon Preview" className="max-w-full max-h-full object-contain" />
                      <button
                        type="button"
                        onClick={() => {
                          const newOpts = [...options];
                          newOpts[0] = '';
                          setOptions(newOpts);
                        }}
                        className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">Upload the image for the icon.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="targetUrl">Target Link</Label>
                  <Input
                    id="targetUrl"
                    placeholder="https://google.com"
                    value={options[1] || ''}
                    onChange={(e) => {
                      const newOpts = [...options];
                      if (!newOpts[0]) newOpts[0] = ''; // Ensure index 0 exists
                      newOpts[1] = e.target.value;
                      setOptions(newOpts);
                    }}
                  />
                  <p className="text-xs text-muted-foreground">URL to open when clicked.</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="type">Field Type</Label>
              <Select value={fieldType} onValueChange={(v) => setFieldType(v as FieldType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(fieldType === 'select' || fieldType === 'checkbox') && (
              <div className="space-y-2">
                <Label>{fieldType === 'select' ? 'Dropdown Options' : 'Checkbox Options'}</Label>
                <div className="flex gap-2">
                  <Input
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    placeholder="Add option"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddOption();
                      }
                    }}
                  />
                  <Button type="button" size="icon" onClick={handleAddOption}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {options.map((opt) => (
                    <Badge key={opt} variant="secondary" className="gap-1">
                      {opt}
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(opt)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Checkbox
                id="required"
                checked={required}
                onCheckedChange={(c) => setRequired(c === true)}
              />
              <Label htmlFor="required" className="cursor-pointer">
                Required field
              </Label>
            </div>

            {/* Conditional Visibility Section */}
            {previousFields.length > 0 && fieldType !== 'icon_link' && (
              <div className="space-y-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-primary">Conditional Visibility (Optional)</Label>
                  <p className="text-[10px] text-muted-foreground">Show this field only if another field has a specific value.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="parentField" className="text-xs">Parent Field</Label>
                    <Select value={parentFieldId} onValueChange={setParentFieldId}>
                      <SelectTrigger id="parentField" className="h-8 text-xs">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None (Always Show)</SelectItem>
                        {previousFields
                          .filter(f => f.id !== editingField?.id && (f.field_type === 'select' || f.field_type === 'checkbox' || f.field_type === 'text'))
                          .map((f) => (
                            <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="triggerVal" className="text-xs">Trigger Value</Label>
                    <Input
                      id="triggerVal"
                      value={triggerValue}
                      onChange={(e) => setTriggerValue(e.target.value)}
                      placeholder="e.g. Opsi 1"
                      className="h-8 text-xs"
                      disabled={!parentFieldId || parentFieldId === 'none'}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!label.trim() || isPending || isUploadingIcon}>
              {editingField ? 'Save Changes' : 'Add Field'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
