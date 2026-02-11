import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Settings2,
  GripVertical,
  Pencil,
  Trash2,
  Type,
  FileText,
  Hash,
  Calendar,
  List,
  CheckSquare,
  Upload,
  Clock,
  Image as ImageIcon,
  ArrowUp,
  ArrowDown,
  Link,
} from 'lucide-react';
import { useFormFields, FormField, FieldType, CreateFieldInput, UpdateFieldInput } from '@/hooks/useFormFields';
import { AddFieldDialog } from './AddFieldDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const FIELD_ICONS: Record<FieldType, React.ElementType> = {
  text: Type,
  textarea: FileText,
  number: Hash,
  date: Calendar,
  time: Clock,
  select: List,
  checkbox: CheckSquare,
  file: Upload,
  image: ImageIcon,
  icon_link: Link,
};

const FIELD_LABELS: Record<FieldType, string> = {
  text: 'Text',
  textarea: 'Long Text',
  number: 'Number',
  date: 'Date',
  time: 'Time',
  select: 'Dropdown',
  checkbox: 'Checkbox',
  file: 'File Upload',
  image: 'Image Upload',
  icon_link: 'Icon Link',
};

interface FormBuilderProps {
  menuId: string;
}

export function FormBuilder({ menuId }: FormBuilderProps) {
  const { fields, isLoading, createField, updateField, deleteField, reorderFields } = useFormFields(menuId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [deletingField, setDeletingField] = useState<FormField | null>(null);

  const handleAddField = () => {
    setEditingField(null);
    setDialogOpen(true);
  };

  const handleEditField = (field: FormField) => {
    setEditingField(field);
    setDialogOpen(true);
  };

  const handleSubmit = (data: CreateFieldInput | UpdateFieldInput) => {
    if ('id' in data) {
      updateField.mutate(data);
    } else {
      createField.mutate(data);
    }
  };

  const handleDeleteConfirm = () => {
    if (deletingField) {
      deleteField.mutate(deletingField.id);
      setDeletingField(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading fields...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Form Builder</CardTitle>
              <CardDescription>Define custom fields for this tracker.</CardDescription>
            </div>
            <Button onClick={handleAddField}>
              <Plus className="mr-2 h-4 w-4" />
              Add Field
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {fields.length === 0 ? (
            <div className="text-center py-12">
              <Settings2 className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">No fields yet</h3>
              <p className="text-muted-foreground mt-2">
                Add text, number, date, select, checkbox, or file upload fields.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {fields.map((field) => {
                const Icon = FIELD_ICONS[field.field_type];
                return (
                  <div
                    key={field.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium truncate">{field.label}</span>
                        <Badge variant="outline" className="text-[10px] h-4 shrink-0 px-1">
                          {FIELD_LABELS[field.field_type]}
                        </Badge>
                        {field.required && (
                          <Badge variant="secondary" className="text-[10px] h-4 shrink-0 px-1">
                            Required
                          </Badge>
                        )}
                        {field.field_type === 'select' && field.options.length > 0 && (
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            ({field.options.length} options)
                          </span>
                        )}
                      </div>
                      {field.description && (
                        <p className="text-[10px] text-muted-foreground italic truncate pl-6">
                          Note: {field.description}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const index = fields.findIndex(f => f.id === field.id);
                          if (index > 0) {
                            const newFields = [...fields];
                            [newFields[index - 1], newFields[index]] = [newFields[index], newFields[index - 1]];
                            const updates = newFields.map((f, i) => ({ id: f.id, sort_order: i }));
                            reorderFields.mutate(updates);
                          }
                        }}
                        disabled={fields.findIndex(f => f.id === field.id) === 0 || reorderFields.isPending}
                        className="h-8 w-8"
                        title="Move Up"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const index = fields.findIndex(f => f.id === field.id);
                          if (index < fields.length - 1) {
                            const newFields = [...fields];
                            [newFields[index + 1], newFields[index]] = [newFields[index], newFields[index + 1]];
                            const updates = newFields.map((f, i) => ({ id: f.id, sort_order: i }));
                            reorderFields.mutate(updates);
                          }
                        }}
                        disabled={fields.findIndex(f => f.id === field.id) === fields.length - 1 || reorderFields.isPending}
                        className="h-8 w-8"
                        title="Move Down"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditField(field)}
                        className="h-8 w-8"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingField(field)}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <AddFieldDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        menuId={menuId}
        editingField={editingField}
        onSubmit={handleSubmit}
        isPending={createField.isPending || updateField.isPending}
      />

      <AlertDialog open={!!deletingField} onOpenChange={() => setDeletingField(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Field</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingField?.label}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
