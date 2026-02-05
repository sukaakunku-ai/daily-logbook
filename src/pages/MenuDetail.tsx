 import { useParams, useNavigate } from 'react-router-dom';
 import { DashboardLayout } from '@/components/layout/DashboardLayout';
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
 import { useMenus } from '@/hooks/useMenus';
 import { Plus, FileText, List, Settings2, ArrowLeft } from 'lucide-react';
 import { Badge } from '@/components/ui/badge';
 
 export default function MenuDetail() {
   const { menuId } = useParams();
   const navigate = useNavigate();
   const { menus, isLoading } = useMenus();
 
   const menu = menus.find((m) => m.id === menuId);
 
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
 
         <Tabs defaultValue="entries" className="space-y-4">
           <TabsList>
             <TabsTrigger value="entries" className="gap-2">
               <List className="h-4 w-4" />
               Entries
             </TabsTrigger>
             <TabsTrigger value="submit" className="gap-2">
               <Plus className="h-4 w-4" />
               Submit Entry
             </TabsTrigger>
             <TabsTrigger value="form-builder" className="gap-2">
               <Settings2 className="h-4 w-4" />
               Form Builder
             </TabsTrigger>
           </TabsList>
 
           <TabsContent value="entries" className="space-y-4">
             <Card>
               <CardHeader>
                 <CardTitle>All Entries</CardTitle>
                 <CardDescription>
                   View, search, and manage your submitted entries.
                 </CardDescription>
               </CardHeader>
               <CardContent>
                 <div className="text-center py-12">
                   <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
                   <h3 className="mt-4 text-lg font-semibold">No entries yet</h3>
                   <p className="text-muted-foreground mt-2">
                     Start by defining your form fields, then submit your first entry.
                   </p>
                   <Badge variant="secondary" className="mt-4">
                     Coming soon: Full data table with search, sort, and pagination
                   </Badge>
                 </div>
               </CardContent>
             </Card>
           </TabsContent>
 
           <TabsContent value="submit" className="space-y-4">
             <Card>
               <CardHeader>
                 <CardTitle>Submit New Entry</CardTitle>
                 <CardDescription>
                   Fill out the form to add a new entry.
                 </CardDescription>
               </CardHeader>
               <CardContent>
                 <div className="text-center py-12">
                   <Plus className="mx-auto h-12 w-12 text-muted-foreground/50" />
                   <h3 className="mt-4 text-lg font-semibold">No form fields defined</h3>
                   <p className="text-muted-foreground mt-2">
                     Go to Form Builder to define fields for this tracker.
                   </p>
                   <Badge variant="secondary" className="mt-4">
                     Coming soon: Dynamic form submission with file uploads
                   </Badge>
                 </div>
               </CardContent>
             </Card>
           </TabsContent>
 
           <TabsContent value="form-builder" className="space-y-4">
             <Card>
               <CardHeader>
                 <div className="flex items-center justify-between">
                   <div>
                     <CardTitle>Form Builder</CardTitle>
                     <CardDescription>
                       Define custom fields for this tracker.
                     </CardDescription>
                   </div>
                   <Button>
                     <Plus className="mr-2 h-4 w-4" />
                     Add Field
                   </Button>
                 </div>
               </CardHeader>
               <CardContent>
                 <div className="text-center py-12">
                   <Settings2 className="mx-auto h-12 w-12 text-muted-foreground/50" />
                   <h3 className="mt-4 text-lg font-semibold">No fields yet</h3>
                   <p className="text-muted-foreground mt-2">
                     Add text, number, date, select, checkbox, or file upload fields.
                   </p>
                   <Badge variant="secondary" className="mt-4">
                     Coming soon: Drag-and-drop field ordering
                   </Badge>
                 </div>
               </CardContent>
             </Card>
           </TabsContent>
         </Tabs>
       </div>
     </DashboardLayout>
   );
 }