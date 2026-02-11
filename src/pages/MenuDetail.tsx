import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMenus } from '@/hooks/useMenus';
import { Plus, List, Settings2, ArrowLeft, Pencil } from 'lucide-react';
import { FormBuilder } from '@/components/forms/FormBuilder';
import { DynamicForm } from '@/components/forms/DynamicForm';
import { EntriesTable } from '@/components/forms/EntriesTable';
import { Entry } from '@/hooks/useEntries';
import { AddMenuDialog } from '@/components/menus/AddMenuDialog';
import { FormSettingsDialog } from '@/components/menus/FormSettingsDialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { QuickLinks } from '@/components/forms/QuickLinks';
import { useFormFields } from '@/hooks/useFormFields';
import { useAuth } from '@/contexts/AuthContext';

export default function MenuDetail() {
  const { menuId } = useParams();
  const navigate = useNavigate();
  const { menus, isLoading: menusLoading } = useMenus();
  const { fields, isLoading: fieldsLoading } = useFormFields(menuId);
  const { user } = useAuth();
  const isAdmin = user?.email === 'muhamadiruel@gmail.com';
  const [activeTab, setActiveTab] = useState('entries');
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [addSubMenuOpen, setAddSubMenuOpen] = useState(false);
  const [formSettingsOpen, setFormSettingsOpen] = useState(false);

  const menu = menus.find((m) => m.id === menuId);
  const isLoading = menusLoading || fieldsLoading;
  const subMenus = menus.filter(m => m.parentId === menuId);
  const hasSubMenus = subMenus.length > 0;
  const [showForm, setShowForm] = useState(!hasSubMenus);
  const hasIconLink = fields.some(f => f.field_type === 'icon_link');

  const handleEditEntry = (entry: Entry) => {
    if (!isAdmin) return; // Only admin can edit
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
          <h2 className="text-xl font-semibold">Menu not found</h2>
          <p className="text-muted-foreground mt-2">
            The menu you're looking for doesn't exist.
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
                {isAdmin ? 'Manage form fields and view entries' : 'View links and data'}
              </p>
            </div>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              {hasSubMenus && !showForm && (
                <Button variant="ghost" size="sm" onClick={() => setShowForm(true)} className="text-muted-foreground hover:text-primary">
                  <Settings2 className="mr-2 h-4 w-4" />
                  Show Form Builder
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setFormSettingsOpen(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                Customize Form
              </Button>
            </div>
          )}
        </div>

        <QuickLinks fields={fields} />

        {/* Hide entries and submit entry if user is not admin and menu has icon links */}
        {(!hasIconLink || isAdmin) && (
          <>
            {showForm ? (
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
                  {isAdmin && (
                    <TabsTrigger value="form-builder" className="gap-2">
                      <Settings2 className="h-4 w-4" />
                      Form Builder
                    </TabsTrigger>
                  )}
                </TabsList>

                <TabsContent value="entries" className="space-y-4">
                  <EntriesTable menuId={menuId!} onEdit={handleEditEntry} />
                </TabsContent>

                <TabsContent value="submit" className="space-y-4">
                  <div className="max-w-3xl mx-auto space-y-4">
                    <DynamicForm
                      menuId={menuId!}
                      editingEntry={editingEntry}
                      onSuccess={handleFormSuccess}
                      formSettings={menu.form_settings}
                    />
                    {editingEntry && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          setEditingEntry(null);
                        }}
                      >
                        Cancel Edit
                      </Button>
                    )}
                  </div>
                </TabsContent>

                {isAdmin && (
                  <TabsContent value="form-builder" className="space-y-4">
                    <FormBuilder menuId={menuId!} />
                  </TabsContent>
                )}
              </Tabs>
            ) : hasSubMenus && (
              <div className="bg-muted/30 border border-dashed rounded-xl py-12 text-center">
                <Settings2 className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium">Form & Entries Hidden</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-2">
                  This menu is configured as a category for its sub-menus. The data entry form is hidden by default.
                </p>
                {isAdmin && (
                  <Button variant="outline" size="sm" className="mt-6" onClick={() => setShowForm(true)}>
                    Unhide Form Builder
                  </Button>
                )}
              </div>
            )}
          </>
        )}

        {!menu.parentId && (
          <div className="space-y-4 pt-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Sub-Menus</h2>
              {isAdmin && (
                <Button size="sm" onClick={() => setAddSubMenuOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Sub-Menu
                </Button>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {menus.filter(m => m.parentId === menuId).length === 0 ? (
                <div className="col-span-full py-8 text-center border-2 border-dashed rounded-lg bg-muted/50">
                  <p className="text-muted-foreground italic">No sub-menus yet. Add one to organize deeper.</p>
                </div>
              ) : (
                menus.filter(m => m.parentId === menuId).map((subMenu) => (
                  <Card
                    key={subMenu.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate(`/menu/${subMenu.id}`)}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">{subMenu.name}</CardTitle>
                      <CardDescription>Click to manage this sub-menu</CardDescription>
                    </CardHeader>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <AddMenuDialog
        open={addSubMenuOpen}
        onOpenChange={setAddSubMenuOpen}
        parentId={menuId}
      />

      <FormSettingsDialog
        open={formSettingsOpen}
        onOpenChange={setFormSettingsOpen}
        menu={menu}
        key={menu.updated_at}
      />
    </DashboardLayout>
  );
}
