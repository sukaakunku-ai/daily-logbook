 import { DashboardLayout } from '@/components/layout/DashboardLayout';
 import { useMenus } from '@/hooks/useMenus';
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { Plus, ClipboardList, FileText, Calendar, TrendingUp } from 'lucide-react';
 import { useState } from 'react';
 import { AddMenuDialog } from '@/components/menus/AddMenuDialog';
 import { useNavigate } from 'react-router-dom';
 
 export default function Dashboard() {
   const { menus, isLoading } = useMenus();
   const [addMenuOpen, setAddMenuOpen] = useState(false);
   const navigate = useNavigate();
 
   const stats = [
     {
       title: 'Active Trackers',
       value: menus.length,
       icon: ClipboardList,
       description: 'Custom work trackers',
     },
     {
       title: 'Today',
       value: new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
       icon: Calendar,
       description: 'Current date',
     },
   ];
 
   return (
     <DashboardLayout>
       <div className="space-y-6 animate-fade-in">
         <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
           <div>
             <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
             <p className="text-muted-foreground">
               Welcome back! Track your daily work efficiently.
             </p>
           </div>
           <Button onClick={() => setAddMenuOpen(true)}>
             <Plus className="mr-2 h-4 w-4" />
             New Tracker
           </Button>
         </div>
 
         <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
           {stats.map((stat) => (
             <Card key={stat.title}>
               <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                 <CardTitle className="text-sm font-medium">
                   {stat.title}
                 </CardTitle>
                 <stat.icon className="h-4 w-4 text-muted-foreground" />
               </CardHeader>
               <CardContent>
                 <div className="text-2xl font-bold">{stat.value}</div>
                 <p className="text-xs text-muted-foreground">
                   {stat.description}
                 </p>
               </CardContent>
             </Card>
           ))}
         </div>
 
         <Card>
           <CardHeader>
             <CardTitle>Your Trackers</CardTitle>
             <CardDescription>
               Quick access to all your work tracking forms
             </CardDescription>
           </CardHeader>
           <CardContent>
             {isLoading ? (
               <div className="text-center py-8 text-muted-foreground">
                 Loading trackers...
               </div>
             ) : menus.length === 0 ? (
               <div className="text-center py-12">
                 <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground/50" />
                 <h3 className="mt-4 text-lg font-semibold">No trackers yet</h3>
                 <p className="text-muted-foreground mt-2">
                   Create your first tracker to start logging your daily work.
                 </p>
                 <Button className="mt-4" onClick={() => setAddMenuOpen(true)}>
                   <Plus className="mr-2 h-4 w-4" />
                   Create Tracker
                 </Button>
               </div>
             ) : (
               <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                 {menus.map((menu) => (
                   <Card 
                     key={menu.id} 
                     className="cursor-pointer hover:shadow-md transition-shadow border-border/50"
                     onClick={() => navigate(`/menu/${menu.id}`)}
                   >
                     <CardHeader className="pb-3">
                       <div className="flex items-center gap-3">
                         <div className="p-2 rounded-lg bg-accent">
                           <FileText className="h-4 w-4 text-accent-foreground" />
                         </div>
                         <CardTitle className="text-base">{menu.name}</CardTitle>
                       </div>
                     </CardHeader>
                     <CardContent className="pt-0">
                       <p className="text-sm text-muted-foreground">
                         Click to view entries or submit new data
                       </p>
                     </CardContent>
                   </Card>
                 ))}
               </div>
             )}
           </CardContent>
         </Card>
       </div>
 
       <AddMenuDialog open={addMenuOpen} onOpenChange={setAddMenuOpen} />
     </DashboardLayout>
   );
 }