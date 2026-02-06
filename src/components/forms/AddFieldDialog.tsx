import { useState } from 'react';
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
import { X, Plus } from 'lucide-react';
import type { FieldType, FormField, CreateFieldInput, UpdateFieldInput } from '@/hooks/useFormFields';

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Long Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Dropdown' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'file', label: 'File Upload' },
];

interface AddFieldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  menuId: string;
  editingField?: FormField | null;
  onSubmit: (data: CreateFieldInput | UpdateFieldInput) => void;
  isPending: boolean;
}

export function AddFieldDialog({
  open,
  onOpenChange,
  menuId,
  editingField,
  onSubmit,
  isPending,
}: AddFieldDialogProps) {
  const [label, setLabel] = useState(editingField?.label ?? '');
  const [fieldType, setFieldType] = useState<FieldType>(editingField?.field_type ?? 'text');
  const [required, setRequired] = useState(editingField?.required ?? false);
  const [options, setOptions] = useState<string[]>(editingField?.options ?? []);
  const [newOption, setNewOption] = useState('');

  const handleClose = () => {
    setLabel('');
    setFieldType('text');
    setRequired(false);
    setOptions([]);
    setNewOption('');
    onOpenChange(false);
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

    if (editingField) {
      onSubmit({
        id: editingField.id,
        label: label.trim(),
        field_type: fieldType,
        required,
        options: fieldType === 'select' ? options : [],
      });
    } else {
      onSubmit({
        menu_id: menuId,
        label: label.trim(),
        field_type: fieldType,
        required,
        options: fieldType === 'select' ? options : [],
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
            {fieldType === 'select' && (
              <div className="space-y-2">
                <Label>Dropdown Options</Label>
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
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!label.trim() || isPending}>
              {editingField ? 'Save Changes' : 'Add Field'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
