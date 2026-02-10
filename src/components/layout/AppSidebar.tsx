import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ClipboardList,
  Settings,
  Plus,
  Home,
  FileText,
  BarChart3,
  CheckSquare,
  Calendar,
  Briefcase,
  Users,
  Folder,
  ChevronDown,
  ChevronRight,
  type LucideIcon
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { useMenus, type Menu } from '@/hooks/useMenus';
import { AddMenuDialog } from '@/components/menus/AddMenuDialog';
import { useAuth } from '@/contexts/AuthContext';

const iconMap: Record<string, LucideIcon> = {
  'file-text': FileText,
  'bar-chart': BarChart3,
  'check-square': CheckSquare,
  'calendar': Calendar,
  'briefcase': Briefcase,
  'users': Users,
  'folder': Folder,
  'home': Home,
};

function getIcon(iconName: string): LucideIcon {
  return iconMap[iconName] || FileText;
}

export function AppSidebar() {
  const { menus, isLoading } = useMenus();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <Sidebar className="border-r-0">
        <SidebarHeader className="p-4 gradient-sidebar border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sidebar-primary/20">
              <ClipboardList className="h-5 w-5 text-sidebar-primary" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-sidebar-foreground">Management KST</span>
              <span className="text-xs text-sidebar-foreground/60">Digital Logbook</span>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent className="gradient-sidebar">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => navigate('/dashboard')}
                    isActive={isActive('/dashboard')}
                    className="hover:bg-sidebar-accent"
                  >
                    <Home className="h-4 w-4" />
                    <span>Dashboard</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/60 px-4 flex items-center justify-between">
              <span>My Menus</span>
              {user && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 hover:bg-sidebar-accent"
                  onClick={() => setAddMenuOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              )}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {isLoading ? (
                  <div className="px-4 py-2 text-sm text-sidebar-foreground/50">Loading...</div>
                ) : menus.filter(m => !m.parentId).length === 0 ? (
                  <div className="px-4 py-2 text-sm text-sidebar-foreground/50">
                    No menus available.
                  </div>
                ) : (
                  menus.filter(m => !m.parentId).map((menu: Menu) => {
                    const Icon = getIcon(menu.icon);
                    const subMenus = menus.filter(m => m.parentId === menu.id);

                    return (
                      <div key={menu.id}>
                        <SidebarMenuItem>
                          <SidebarMenuButton
                            onClick={() => navigate(`/menu/${menu.id}`)}
                            isActive={location.pathname.startsWith(`/menu/${menu.id}`)}
                            className="hover:bg-sidebar-accent"
                          >
                            <Icon className="h-4 w-4" />
                            <span className="font-medium">{menu.name}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>

                        {subMenus.length > 0 && (
                          <div className="ml-6 border-l border-sidebar-border/50 pl-2 mt-1 mb-2 space-y-1">
                            {subMenus.map((sub) => (
                              <SidebarMenuItem key={sub.id}>
                                <SidebarMenuButton
                                  onClick={() => navigate(`/menu/${sub.id}`)}
                                  isActive={location.pathname === `/menu/${sub.id}`}
                                  size="sm"
                                  className="h-8 py-0 hover:bg-sidebar-accent text-xs"
                                >
                                  <span className="truncate opacity-80">{sub.name}</span>
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {user && (
          <SidebarFooter className="gradient-sidebar border-t border-sidebar-border p-4">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate('/settings')}
                  isActive={isActive('/settings')}
                  className="hover:bg-sidebar-accent"
                >
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        )}
      </Sidebar>

      <AddMenuDialog open={addMenuOpen} onOpenChange={setAddMenuOpen} />
    </>
  );
}