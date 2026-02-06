import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMenus } from '@/hooks/useMenus';
import { Plus, List, Settings2, ArrowLeft } from 'lucide-react';
import { FormBuilder } from '@/components/forms/FormBuilder';
import { DynamicForm } from '@/components/forms/DynamicForm';
import { EntriesTable } from '@/components/forms/EntriesTable';
import { Entry } from '@/hooks/useEntries';

export default function MenuDetail() {
  const { menuId } = useParams();
  const navigate = useNavigate();
  const { menus, isLoading } = useMenus();
  const [activeTab, setActiveTab] = useState('entries');
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);

  const menu = menus.find((m) => m.id === menuId);

  const handleEditEntry = (entry: Entry) => {
    setEditingEntry(entry);
    setActiveTab('submit');
  };

  const handleFormSuccess = () => {
    setEditingEntry(null);
    setActiveTab('entries');
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!menu) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold">Tracker not found</h2>
          <p className="text-muted-foreground mt-2">
            The tracker you're looking for doesn't exist.
          </p>
          <Button className="mt-4" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{menu.name}</h1>
              <p className="text-muted-foreground">
                Manage form fields and view entries
              </p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="entries" className="gap-2">
              <List className="h-4 w-4" />
              Entries
            </TabsTrigger>
            <TabsTrigger value="submit" className="gap-2">
              <Plus className="h-4 w-4" />
              {editingEntry ? 'Edit Entry' : 'Submit Entry'}
            </TabsTrigger>
            <TabsTrigger value="form-builder" className="gap-2">
              <Settings2 className="h-4 w-4" />
              Form Builder
            </TabsTrigger>
          </TabsList>

          <TabsContent value="entries" className="space-y-4">
            <EntriesTable menuId={menuId!} onEdit={handleEditEntry} />
          </TabsContent>

          <TabsContent value="submit" className="space-y-4">
            <DynamicForm
              menuId={menuId!}
              editingEntry={editingEntry}
              onSuccess={handleFormSuccess}
            />
            {editingEntry && (
              <Button
                variant="outline"
                onClick={() => {
                  setEditingEntry(null);
                }}
              >
                Cancel Edit
              </Button>
            )}
          </TabsContent>

          <TabsContent value="form-builder" className="space-y-4">
            <FormBuilder menuId={menuId!} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
