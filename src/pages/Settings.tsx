import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useMenus, type Menu } from '@/hooks/useMenus';
import { useState } from 'react';
import { Trash2, Pencil, GripVertical, Cloud, Key, ExternalLink } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { useAuth } from '@/contexts/AuthContext';
import { UserManagement } from '@/components/settings/UserManagement';

export default function Settings() {
  const { user, isAdmin } = useAuth();
  const { menus, deleteMenu, updateMenu } = useMenus();
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
  const [editName, setEditName] = useState('');

  const handleEditClick = (menu: Menu) => {
    setEditingMenu(menu);
    setEditName(menu.name);
  };

  const handleSaveEdit = async () => {
    if (!editingMenu || !editName.trim()) return;
    await updateMenu.mutateAsync({ id: editingMenu.id, name: editName.trim() });
    setEditingMenu(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your menus and configure integrations.
          </p>
        </div>

        {isAdmin && <UserManagement />}

        <Card>
          <CardHeader>
            <CardTitle>Manage Menus</CardTitle>
            <CardDescription>
              Edit, reorder, or delete your menus and sub-menus.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {menus.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No menus created yet. Go to Dashboard to create one.
              </p>
            ) : (
              <div className="space-y-2">
                {menus.map((menu) => (
                  <div
                    key={menu.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                    <span className="flex-1 font-medium">{menu.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEditClick(menu)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Menu</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{menu.name}"? This will also delete all sub-menus, entries, and form fields. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMenu.mutate(menu.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Cloud className="h-5 w-5 text-primary" />
              <CardTitle>Cloudinary Integration</CardTitle>
            </div>
            <CardDescription>
              Upload files directly to Cloudinary when submitting entries.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-accent/50 border border-accent">
              <div className="flex items-start gap-3">
                <Key className="h-5 w-5 text-accent-foreground mt-0.5" />
                <div className="space-y-2">
                  <h4 className="font-medium">Cloudinary Configuration</h4>
                  <p className="text-sm text-muted-foreground">
                    The application uses Cloudinary for secure and fast file storage.
                  </p>
                  <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                    <li>Files are stored with custom naming (Menu_Form_Date).</li>
                    <li>Ensure CLOUDINARY environment variables are set in Vercel.</li>
                  </ol>
                  <Button variant="outline" size="sm" className="mt-2" asChild>
                    <a href="https://cloudinary.com/console" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-3.5 w-3.5" />
                      Cloudinary Console
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!editingMenu} onOpenChange={(open) => !open && setEditingMenu(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Menu</DialogTitle>
            <DialogDescription>
              Update the name of your menu.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="editName">Name</Label>
            <Input
              id="editName"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMenu(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={!editName.trim()}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}