import React, { useState, useEffect, useRef } from 'react';
import { Workflow } from './types/workflow';
import { WorkflowService } from './services/workflowService';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import WorkflowList from './components/WorkflowList';
import WorkflowBuilder from './components/WorkflowBuilder';
import Templates from './components/Templates';
import Analytics from './components/Analytics';
import ApiKeyManager from './components/ApiKeyManager';
import Auth from './components/Auth';
import ErrorBoundary from './components/ErrorBoundary';
import { Loader2, AlertCircle } from 'lucide-react';

// Simple loading component
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-secondary-50 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary-600" />
        <p className="mt-4 text-secondary-600">Loading TrackFlow...</p>
      </div>
    </div>
  );
}

// Main authenticated app component
function AuthenticatedApp() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [templates, setTemplates] = useState<Workflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  // Load data on mount - simple and clean
  useEffect(() => {
    const loadData = async () => {
      if (!isMountedRef.current) return;

      console.log('🚀 Loading app data...');
      setLoading(true);
      setError(null);

      try {
        // Load workflows and templates in parallel
        const [userWorkflows, workflowTemplates] = await Promise.all([
          WorkflowService.getUserWorkflows(),
          WorkflowService.getWorkflowTemplates()
        ]);

        if (isMountedRef.current) {
          setWorkflows(userWorkflows);
          setTemplates(workflowTemplates);
          console.log(`✅ Loaded ${userWorkflows.length} workflows and ${workflowTemplates.length} templates`);
        }
      } catch (err: any) {
        console.error('Error loading data:', err);
        if (isMountedRef.current) {
          setError(err.message || 'Failed to load data. Please try refreshing the page.');
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    isMountedRef.current = true;
    loadData();

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleWorkflowSelect = (workflow: Workflow) => {
    setSelectedWorkflow(workflow);
  };

  const handleCreateWorkflow = () => {
    const newWorkflow: Workflow = {
      id: `workflow-${Date.now()}`,
      name: 'New Playbook',
      description: 'A new personalization playbook',
      isActive: false,
      status: 'draft',
      executions: 0,
      nodes: [],
      connections: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      targetUrl: ''
    };
    setWorkflows(prev => [...prev, newWorkflow]);
    setSelectedWorkflow(newWorkflow);
  };

  const handleWorkflowSave = async (workflow: Workflow) => {
    try {
      console.log(`💾 Saving workflow: ${workflow.name}`);
      const savedWorkflow = await WorkflowService.saveWorkflow(workflow);
      
      setWorkflows(prev => 
        prev.map(w => w.id === workflow.id ? savedWorkflow : w)
      );
      
      setSelectedWorkflow(savedWorkflow);
      console.log('✅ Workflow saved successfully');
    } catch (error: any) {
      console.error('Error saving workflow:', error);
      alert(`Failed to save workflow: ${error.message}`);
    }
  };

  const handleWorkflowDelete = async (workflowId: string) => {
    try {
      console.log(`🗑️ Deleting workflow: ${workflowId}`);
      await WorkflowService.deleteWorkflow(workflowId);
      
      setWorkflows(prev => prev.filter(w => w.id !== workflowId));
      
      if (selectedWorkflow?.id === workflowId) {
        setSelectedWorkflow(null);
      }
      
      console.log('✅ Workflow deleted successfully');
    } catch (error: any) {
      console.error('Error deleting workflow:', error);
      alert(`Failed to delete workflow: ${error.message}`);
    }
  };

  const renderContent = () => {
    // Show loading state
    if (loading) {
      return (
        <div className="flex-1 flex items-center justify-center bg-secondary-50">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary-600" />
            <p className="mt-4 text-secondary-600">Loading your workflows...</p>
          </div>
        </div>
      );
    }

    // Show error state
    if (error) {
      return (
        <div className="flex-1 flex items-center justify-center bg-secondary-50">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 mx-auto text-red-600" />
            <p className="mt-4 text-red-600">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    // Show workflow builder if a workflow is selected
    if (selectedWorkflow) {
      return (
        <ErrorBoundary>
          <WorkflowBuilder
            workflow={selectedWorkflow}
            onBack={() => setSelectedWorkflow(null)}
            onSave={handleWorkflowSave}
          />
        </ErrorBoundary>
      );
    }

    // Show main content based on active tab
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard workflows={workflows} />;
      case 'workflows':
        return (
          <WorkflowList
            workflows={workflows}
            onWorkflowSelect={handleWorkflowSelect}
            onCreateWorkflow={handleCreateWorkflow}
          />
        );
      case 'templates':
        return <Templates templates={templates} onTemplateUse={handleWorkflowSelect} />;
      case 'analytics':
        return <Analytics workflows={workflows} />;
      case 'executions':
        return <Analytics workflows={workflows} />;
      case 'api-keys':
        return <ApiKeyManager />;
      default:
        return <Dashboard workflows={workflows} />;
    }
  };

  return (
    <div className="h-screen bg-secondary-50">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} onCreateWorkflow={handleCreateWorkflow} />
      <div className="ml-64">
        {renderContent()}
      </div>
    </div>
  );
}

// Main app with auth wrapper
function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Auth />;
  }

  return <AuthenticatedApp />;
}

// Root app component
function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;