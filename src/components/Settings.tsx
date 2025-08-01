import React, { useState } from 'react';
import { Key, User, Bell, Shield, Settings as SettingsIcon } from 'lucide-react';
import ApiKeyManager from './ApiKeyManager';

const Settings: React.FC = () => {
  const [activeSettingsTab, setActiveSettingsTab] = useState('api-keys');

  const settingsTabs = [
    { id: 'api-keys', label: 'API Keys', icon: Key, component: ApiKeyManager },
    { id: 'profile', label: 'Profile', icon: User, component: () => <div>Profile settings coming soon...</div> },
    { id: 'notifications', label: 'Notifications', icon: Bell, component: () => <div>Notification settings coming soon...</div> },
    { id: 'security', label: 'Security', icon: Shield, component: () => <div>Security settings coming soon...</div> },
  ];

  const activeTab = settingsTabs.find(tab => tab.id === activeSettingsTab);
  const ActiveComponent = activeTab?.component || (() => <div>Settings section not found</div>);

  return (
    <div className="flex-1 bg-secondary-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="px-8 py-6 pt-12">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div>
                <h1 className="text-3xl font-medium text-secondary-900 tracking-tight flex items-center space-x-3">
                  <SettingsIcon className="w-8 h-8" />
                  <span>Settings</span>
                </h1>
                <p className="text-sm text-secondary-600 mt-1">Manage your account settings and preferences</p>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Content */}
        <div className="px-8 pb-8">
          <div className="bg-white rounded-lg border border-secondary-200 overflow-hidden">
            {/* Settings Navigation */}
            <div className="border-b border-secondary-200">
              <nav className="flex space-x-8 px-6">
                {settingsTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveSettingsTab(tab.id)}
                    className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors ${
                      activeSettingsTab === tab.id
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Settings Content */}
            <div className="p-6">
              <ActiveComponent />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings; 