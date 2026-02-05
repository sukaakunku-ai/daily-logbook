 import { useAuth } from '@/contexts/AuthContext';
 import { Button } from '@/components/ui/button';
 import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuLabel,
   DropdownMenuSeparator,
   DropdownMenuTrigger,
 } from '@/components/ui/dropdown-menu';
 import { Avatar, AvatarFallback } from '@/components/ui/avatar';
 import { SidebarTrigger } from '@/components/ui/sidebar';
 import { LogOut, User, Settings, Moon, Sun } from 'lucide-react';
 import { useNavigate } from 'react-router-dom';
 import { useState, useEffect } from 'react';
 
 export function TopNav() {
   const { user, signOut } = useAuth();
   const navigate = useNavigate();
   const [isDark, setIsDark] = useState(false);
 
   useEffect(() => {
     const isDarkMode = document.documentElement.classList.contains('dark');
     setIsDark(isDarkMode);
   }, []);
 
   const toggleTheme = () => {
     const newIsDark = !isDark;
     setIsDark(newIsDark);
     document.documentElement.classList.toggle('dark', newIsDark);
   };
 
   const handleSignOut = async () => {
     await signOut();
     navigate('/login');
   };
 
   const getInitials = () => {
     if (!user?.email) return 'U';
     return user.email.charAt(0).toUpperCase();
   };
 
   return (
     <header className="sticky top-0 z-40 h-14 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
       <div className="flex h-full items-center justify-between px-4">
         <div className="flex items-center gap-4">
           <SidebarTrigger className="-ml-2" />
         </div>
 
         <div className="flex items-center gap-2">
           <Button 
             variant="ghost" 
             size="icon" 
             onClick={toggleTheme}
             className="h-9 w-9"
           >
             {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
           </Button>
 
           <DropdownMenu>
             <DropdownMenuTrigger asChild>
               <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                 <Avatar className="h-9 w-9">
                   <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                     {getInitials()}
                   </AvatarFallback>
                 </Avatar>
               </Button>
             </DropdownMenuTrigger>
             <DropdownMenuContent className="w-56" align="end" forceMount>
               <DropdownMenuLabel className="font-normal">
                 <div className="flex flex-col space-y-1">
                   <p className="text-sm font-medium leading-none">Account</p>
                   <p className="text-xs leading-none text-muted-foreground">
                     {user?.email}
                   </p>
                 </div>
               </DropdownMenuLabel>
               <DropdownMenuSeparator />
               <DropdownMenuItem onClick={() => navigate('/settings')}>
                 <Settings className="mr-2 h-4 w-4" />
                 <span>Settings</span>
               </DropdownMenuItem>
               <DropdownMenuSeparator />
               <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                 <LogOut className="mr-2 h-4 w-4" />
                 <span>Sign out</span>
               </DropdownMenuItem>
             </DropdownMenuContent>
           </DropdownMenu>
         </div>
       </div>
     </header>
   );
 }