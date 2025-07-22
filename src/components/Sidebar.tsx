import React from 'react';
import { 
  Home, 
  Workflow, 
  Settings, 
  FileText, 
  Activity, 
  Users, 
  Database,
  Plus,
  User,
  LogOut
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onCreateWorkflow: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, onCreateWorkflow }) => {
  const { user, signOut } = useAuth();

  // Organization section items
  const organizationItems = [
    { id: 'dashboard', icon: Home, label: 'Dashboard' },
    { id: 'workflows', icon: Workflow, label: 'Playbooks' },
    { id: 'templates', icon: FileText, label: 'Templates' },
    { id: 'analytics', icon: Activity, label: 'Analytics' },
  ];

  // Account section items
  const accountItems = [
    { id: 'settings', icon: Settings, label: 'Settings' },
    { id: 'profile', icon: User, label: 'Profile' },
  ];

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="w-64 bg-white h-screen flex flex-col fixed left-0 top-0 z-10 border-r border-secondary-200">
      {/* Logo Section */}
      <div className="px-6 py-6">
        <div className="px-4">
          <img 
            src="/logo.svg" 
            alt="TrackFlow Logo" 
            className="h-10 w-auto object-contain"
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-6 py-4">
        {/* Organization Section */}
        <div className="mb-8">
          <h3 className="text-xs font-semibold text-secondary-500 uppercase tracking-wider mb-4">
            Organization
          </h3>
          <div className="space-y-1">
            {organizationItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2 text-left transition-colors ${
                  activeTab === item.id
                    ? 'text-primary-600 font-medium'
                    : 'text-secondary-600 hover:text-secondary-900'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-sm">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Account Section */}
        <div className="mb-8">
          <h3 className="text-xs font-semibold text-secondary-500 uppercase tracking-wider mb-4">
            Account
          </h3>
          <div className="space-y-1">
            {accountItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2 text-left transition-colors ${
                  activeTab === item.id
                    ? 'text-primary-600 font-medium'
                    : 'text-secondary-600 hover:text-secondary-900'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-sm">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* User Profile Section */}
      <div className="px-6 pb-4 border-t border-secondary-200">
        <div className="pt-4 space-y-3">
          {/* User Info */}
          <div className="flex items-center space-x-3 px-3 py-2">
            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-primary-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-secondary-900 truncate">
                {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
              </p>
              <p className="text-xs text-secondary-500 truncate">
                {user?.email}
              </p>
            </div>
          </div>

          {/* Sign Out Button */}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center space-x-3 px-3 py-2 text-left text-secondary-600 hover:text-secondary-900 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm">Sign Out</span>
          </button>
        </div>
      </div>

      {/* Bottom Action */}
      <div className="px-6 pb-6">
        <button 
          onClick={onCreateWorkflow}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-primary-500 text-white hover:bg-primary-600 transition-colors font-medium text-sm rounded-lg"
        >
          <Plus className="w-4 h-4" />
          <span>New Playbook</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;