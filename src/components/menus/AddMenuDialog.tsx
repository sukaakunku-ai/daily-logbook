 import { useState } from 'react';
 import { Button } from '@/components/ui/button';
 import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
 } from '@/components/ui/dialog';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from '@/components/ui/select';
 import { useMenus } from '@/hooks/useMenus';
 import { Loader2, FileText, BarChart3, CheckSquare, Calendar, Briefcase, Users, Folder } from 'lucide-react';
 
 const iconOptions = [
   { value: 'file-text', label: 'Document', icon: FileText },
   { value: 'bar-chart', label: 'Chart', icon: BarChart3 },
   { value: 'check-square', label: 'Tasks', icon: CheckSquare },
   { value: 'calendar', label: 'Calendar', icon: Calendar },
   { value: 'briefcase', label: 'Work', icon: Briefcase },
   { value: 'users', label: 'Team', icon: Users },
   { value: 'folder', label: 'Folder', icon: Folder },
 ];
 
 interface AddMenuDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
 }
 
 export function AddMenuDialog({ open, onOpenChange }: AddMenuDialogProps) {
   const [name, setName] = useState('');
   const [icon, setIcon] = useState('file-text');
   const { createMenu } = useMenus();
 
   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!name.trim()) return;
 
     await createMenu.mutateAsync({ name: name.trim(), icon });
     setName('');
     setIcon('file-text');
     onOpenChange(false);
   };
 
   return (
     <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent className="sm:max-w-[425px]">
         <DialogHeader>
           <DialogTitle>Create New Tracker</DialogTitle>
           <DialogDescription>
             Add a new tracker to organize your daily work entries.
           </DialogDescription>
         </DialogHeader>
         <form onSubmit={handleSubmit}>
           <div className="grid gap-4 py-4">
             <div className="grid gap-2">
               <Label htmlFor="name">Name</Label>
               <Input
                 id="name"
                 placeholder="e.g., Daily Sales Log"
                 value={name}
                 onChange={(e) => setName(e.target.value)}
                 required
               />
             </div>
             <div className="grid gap-2">
               <Label htmlFor="icon">Icon</Label>
               <Select value={icon} onValueChange={setIcon}>
                 <SelectTrigger>
                   <SelectValue placeholder="Select an icon" />
                 </SelectTrigger>
                 <SelectContent>
                   {iconOptions.map((opt) => (
                     <SelectItem key={opt.value} value={opt.value}>
                       <div className="flex items-center gap-2">
                         <opt.icon className="h-4 w-4" />
                         <span>{opt.label}</span>
                       </div>
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
           </div>
           <DialogFooter>
             <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
               Cancel
             </Button>
             <Button type="submit" disabled={createMenu.isPending || !name.trim()}>
               {createMenu.isPending ? (
                 <>
                   <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                   Creating...
                 </>
               ) : (
                 'Create Tracker'
               )}
             </Button>
           </DialogFooter>
         </form>
       </DialogContent>
     </Dialog>
   );
 }