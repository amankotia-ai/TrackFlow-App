import React from 'react';
import { 
  Home, 
  Workflow, 
  Settings, 
  Activity, 
  CircleDot,
  BarChart3,
  FolderKanban,
  Users,
  Database,
  FileText,
  FileSpreadsheet,
  HelpCircle,
  Plus,
  Mail,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  Sidebar as SidebarUI,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { NavMain } from '@/components/nav-main';
import { NavDocuments } from '@/components/nav-documents';
import { NavSecondary } from '@/components/nav-secondary';
import { NavUser } from '@/components/nav-user';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onCreateWorkflow: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, onCreateWorkflow }) => {
  const { user, signOut } = useAuth();

  const data = {
    user: {
      name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User',
      email: user?.email || '',
      avatar: user?.user_metadata?.avatar_url,
    },
    navMain: [
      {
        title: "Dashboard",
        url: "#",
        icon: Home,
        isActive: activeTab === 'dashboard',
      },
      {
        title: "Playbooks",
        url: "#",
        icon: Workflow,
        isActive: activeTab === 'workflows',
      },
      {
        title: "Analytics",
        url: "#",
        icon: BarChart3,
        isActive: activeTab === 'analytics',
      },
      {
        title: "Templates",
        url: "#",
        icon: FolderKanban,
        isActive: activeTab === 'templates',
      },
    ],
    navSecondary: [
      {
        title: "Settings",
        url: "#",
        icon: Settings,
      },
      {
        title: "Get Help",
        url: "#",
        icon: HelpCircle,
      },
    ],
    documents: [
      {
        name: "Executions",
        url: "#",
        icon: Database,
      },
      {
        name: "Reports",
        url: "#",
        icon: FileText,
      },
      {
        name: "API Keys",
        url: "#",
        icon: FileSpreadsheet,
      },
    ],
  };

  // Handle navigation clicks
  const handleNavClick = (itemTitle: string) => {
    const tabMap: { [key: string]: string } = {
      'Dashboard': 'dashboard',
      'Playbooks': 'workflows',
      'Analytics': 'analytics',
      'Templates': 'templates',
      'Team': 'team',
      'Settings': 'settings',
      'Executions': 'executions',
      'Reports': 'reports',
      'API Keys': 'api-keys',
    };
    
    const tab = tabMap[itemTitle] || itemTitle.toLowerCase();
    onTabChange(tab);
  };

  // Update nav items with onClick handlers
  const navMainWithHandlers = data.navMain.map(item => ({
    ...item,
    url: '#',
    onClick: () => handleNavClick(item.title),
  }));

  const navSecondaryWithHandlers = data.navSecondary.map(item => ({
    ...item,
    url: '#',
    onClick: () => handleNavClick(item.title),
  }));

  const documentsWithHandlers = data.documents.map(item => ({
    ...item,
    url: '#',
    onClick: () => handleNavClick(item.name),
  }));

  return (
    <SidebarUI collapsible="icon" className="border-r border-secondary-200">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-secondary-900 text-white">
                <img 
                  src="/iconLogo.svg" 
                  alt="TrackFlow" 
                  className="size-5"
                />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">TrackFlow</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={onCreateWorkflow}
              className="bg-secondary-900 hover:bg-secondary-800 text-white"
              tooltip="Quick Create"
            >
              <Plus className="size-4" />
              <span className="font-medium">Quick Create</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={navMainWithHandlers as any} />
        <NavDocuments items={documentsWithHandlers as any} />
        <NavSecondary items={navSecondaryWithHandlers as any} className="mt-auto" />
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={data.user} onSignOut={signOut} />
      </SidebarFooter>
    </SidebarUI>
  );
};

export default Sidebar;
