import { useState } from 'react';
import { useUsers, type UserAccount } from '@/hooks/useUsers';
import { useMenus } from '@/hooks/useMenus';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Plus, Shield, UserPlus, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
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

export function UserManagement() {
    const { users, isLoading, createUser, updatePermissions, deleteUser } = useUsers();
    const { menus } = useMenus();

    const [isAddUserOpen, setIsAddUserOpen] = useState(false);
    const [newEmail, setNewEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newFullName, setNewFullName] = useState('');
    const [selectedMenus, setSelectedMenus] = useState<string[]>([]);

    const topLevelMenus = menus.filter(m => !m.parentId);

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEmail || !newPassword || !newFullName) {
            toast.error('Please fill in all fields');
            return;
        }

        try {
            await createUser.mutateAsync({
                email: newEmail,
                password: newPassword,
                fullName: newFullName,
                permissions: selectedMenus,
            });
            setIsAddUserOpen(false);
            setNewEmail('');
            setNewPassword('');
            setNewFullName('');
            setSelectedMenus([]);
        } catch (error) {
            // Error handled by mutation
        }
    };

    const handleMenuToggle = (menuId: string) => {
        setSelectedMenus(prev =>
            prev.includes(menuId)
                ? prev.filter(id => id !== menuId)
                : [...prev, menuId]
        );
    };

    const [editingPermissions, setEditingPermissions] = useState<{ userId: string; permissions: string[] } | null>(null);

    const handleSavePermissions = async () => {
        if (!editingPermissions) return;
        await updatePermissions.mutateAsync({
            userId: editingPermissions.userId,
            permissions: editingPermissions.permissions,
        });
        setEditingPermissions(null);
    };

    return (
        <Card className="border-border/50 shadow-sm mt-6">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" />
                        User Access Management
                    </CardTitle>
                    <CardDescription>
                        Create new users and manage their menu access rights.
                    </CardDescription>
                </div>
                <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="gap-2">
                            <UserPlus className="h-4 w-4" />
                            Add User
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Add New User</DialogTitle>
                            <DialogDescription>
                                Create a new user account and assign menu permissions.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreateUser} className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="fullName">Full Name</Label>
                                <Input
                                    id="fullName"
                                    placeholder="John Doe"
                                    value={newFullName}
                                    onChange={(e) => setNewFullName(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="john@example.com"
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Menu Permissions</Label>
                                <div className="grid grid-cols-2 gap-2 mt-2 border rounded-md p-3 max-h-[150px] overflow-y-auto">
                                    {topLevelMenus.map(menu => (
                                        <div key={menu.id} className="flex items-center gap-2">
                                            <Checkbox
                                                id={`menu-${menu.id}`}
                                                checked={selectedMenus.includes(menu.id)}
                                                onCheckedChange={() => handleMenuToggle(menu.id)}
                                            />
                                            <label
                                                htmlFor={`menu-${menu.id}`}
                                                className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                            >
                                                {menu.name}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsAddUserOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={createUser.isPending}>
                                    {createUser.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Create User
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Permissions</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map((u) => (
                                <TableRow key={u.id}>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-sm">{u.fullName}</span>
                                            <span className="text-xs text-muted-foreground">{u.email}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={u.role === 'admin' ? 'default' : 'secondary'} className="capitalize">
                                            {u.role}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1 max-w-[300px]">
                                            {u.role === 'admin' ? (
                                                <span className="text-xs text-muted-foreground italic">Full Access</span>
                                            ) : u.permissions?.length > 0 ? (
                                                u.permissions.map(pId => {
                                                    const menu = menus.find(m => m.id === pId);
                                                    return (
                                                        <Badge key={pId} variant="outline" className="text-[10px]">
                                                            {menu?.name || 'Unknown'}
                                                        </Badge>
                                                    );
                                                })
                                            ) : (
                                                <span className="text-xs text-red-500 italic">No access</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            {u.role !== 'admin' && (
                                                <>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setEditingPermissions({ userId: u.id, permissions: u.permissions || [] })}
                                                    >
                                                        Edit Access
                                                    </Button>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                                disabled={deleteUser.isPending}
                                                            >
                                                                {deleteUser.isPending ? (
                                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                                ) : (
                                                                    <Trash2 className="h-4 w-4" />
                                                                )}
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Delete User Profile</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    Are you sure you want to delete the profile for "{u.fullName}"?
                                                                    This will remove their menu access and profile data.
                                                                    Note: This only removes the app profile; the login account will remain until manually removed from Firebase Console.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction
                                                                    onClick={() => deleteUser.mutate(u.id)}
                                                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                                >
                                                                    Delete Profile
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>

            <Dialog
                open={!!editingPermissions}
                onOpenChange={(open) => !open && setEditingPermissions(null)}
            >
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Edit Permissions</DialogTitle>
                        <DialogDescription>
                            Modify menu access for {users.find(u => u.id === editingPermissions?.userId)?.fullName}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Select Menus</Label>
                            <div className="grid grid-cols-1 gap-2 mt-2 border rounded-md p-3 max-h-[300px] overflow-y-auto">
                                {topLevelMenus.map(menu => (
                                    <div key={menu.id} className="flex items-center gap-3 p-1 hover:bg-accent rounded transition-colors">
                                        <Checkbox
                                            id={`edit-menu-${menu.id}`}
                                            checked={editingPermissions?.permissions.includes(menu.id)}
                                            onCheckedChange={(checked) => {
                                                if (editingPermissions) {
                                                    const newPerms = checked
                                                        ? [...editingPermissions.permissions, menu.id]
                                                        : editingPermissions.permissions.filter(id => id !== menu.id);
                                                    setEditingPermissions({ ...editingPermissions, permissions: newPerms });
                                                }
                                            }}
                                        />
                                        <label
                                            htmlFor={`edit-menu-${menu.id}`}
                                            className="text-sm font-medium leading-none cursor-pointer flex-1"
                                        >
                                            {menu.name}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingPermissions(null)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSavePermissions} disabled={updatePermissions.isPending}>
                            {updatePermissions.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
