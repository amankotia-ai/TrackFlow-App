import React, { useState } from 'react';
import { 
  Plus, 
  Play, 
  Pause, 
  Edit, 
  Activity, 
  MoreHorizontal,
  Download,
  RefreshCw,
  Upload,
  Trash2,
  Check,
  X,
  Settings
} from 'lucide-react';
import { Workflow } from '../types/workflow';
import { StorageService } from '../services/storageService';
import { WorkflowService } from '../services/workflowService';

interface WorkflowListProps {
  workflows: Workflow[];
  onWorkflowSelect: (workflow: Workflow) => void;
  onCreateWorkflow: () => void;
  onWorkflowImport?: (workflow: Workflow) => void;
  onWorkflowUpdate?: (workflow: Workflow) => void;
}

const WorkflowList: React.FC<WorkflowListProps> = ({ 
  workflows, 
  onWorkflowSelect, 
  onCreateWorkflow,
  onWorkflowImport,
  onWorkflowUpdate
}) => {
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);
  const [exportingWorkflow, setExportingWorkflow] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'paused': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'draft': return 'bg-secondary-100 text-secondary-800 border-secondary-200';
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-secondary-100 text-secondary-800 border-secondary-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Play className="w-3 h-3 mr-1" />;
      case 'paused': return <Pause className="w-3 h-3 mr-1" />;
      case 'draft': return <Edit className="w-3 h-3 mr-1" />;
      case 'error': return <Activity className="w-3 h-3 mr-1" />;
      default: return null;
    }
  };

  const handleExportWorkflow = async (workflow: Workflow) => {
    try {
      setExportingWorkflow(workflow.id);
      await StorageService.exportWorkflow(workflow);
      // You could show a success message here
    } catch (error) {
      console.error('Error exporting workflow:', error);
      // You could show an error message here
    } finally {
      setExportingWorkflow(null);
    }
  };

  const handleStatusChange = async (workflow: Workflow, newStatus: 'draft' | 'active' | 'paused' | 'error') => {
    try {
      setUpdatingStatus(workflow.id);
      
      // Update workflow status
      const updatedWorkflow = {
        ...workflow,
        status: newStatus,
        isActive: newStatus === 'active', // Keep isActive in sync
        updatedAt: new Date()
      };

      // Save to database
      const savedWorkflow = await WorkflowService.saveWorkflow(updatedWorkflow);
      
      // Notify parent component to update the list
      if (onWorkflowUpdate) {
        onWorkflowUpdate(savedWorkflow);
      }
      
      console.log(`✅ Updated workflow "${workflow.name}" to ${newStatus}`);
    } catch (error) {
      console.error('❌ Error updating workflow status:', error);
      // You could show an error message here
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleQuickToggle = async (workflow: Workflow, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Quick toggle between active and paused
    const newStatus = workflow.status === 'active' ? 'paused' : 'active';
    await handleStatusChange(workflow, newStatus);
  };

  const handleImportWorkflow = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImporting(true);
      const workflow = await StorageService.importWorkflow(file);
      if (onWorkflowImport) {
        onWorkflowImport(workflow);
      }
    } catch (error) {
      console.error('Error importing workflow:', error);
      // You could show an error message here
    } finally {
      setImporting(false);
      // Clear the file input
      e.target.value = '';
    }
  };

  const StatusDropdown: React.FC<{ workflow: Workflow }> = ({ workflow }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    const statusOptions = [
      { value: 'draft', label: 'Draft', icon: Edit, color: 'text-secondary-600' },
      { value: 'active', label: 'Active', icon: Play, color: 'text-green-600' },
      { value: 'paused', label: 'Paused', icon: Pause, color: 'text-yellow-600' },
      { value: 'error', label: 'Error', icon: Activity, color: 'text-red-600' }
    ];
    
    const currentStatus = statusOptions.find(s => s.value === workflow.status);
    
    return (
      <div className="relative">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          disabled={updatingStatus === workflow.id}
          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
            getStatusColor(workflow.status)
          } hover:opacity-80 disabled:opacity-50`}
        >
          {updatingStatus === workflow.id ? (
            <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
          ) : (
            currentStatus && <currentStatus.icon className="w-3 h-3 mr-1" />
          )}
          {updatingStatus === workflow.id ? 'Updating...' : workflow.status}
        </button>
        
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute right-0 mt-1 w-32 bg-white border border-secondary-200 rounded-lg shadow-lg z-20">
              {statusOptions.map((status) => {
                const Icon = status.icon;
                return (
                  <button
                    key={status.value}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsOpen(false);
                      if (status.value !== workflow.status) {
                        handleStatusChange(workflow, status.value as any);
                      }
                    }}
                    className={`w-full text-left px-3 py-2 flex items-center hover:bg-secondary-50 first:rounded-t-lg last:rounded-b-lg ${
                      status.value === workflow.status ? 'bg-primary-50 text-primary-700' : 'text-secondary-700'
                    }`}
                  >
                    <Icon className={`w-3 h-3 mr-2 ${status.color}`} />
                    {status.label}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 bg-secondary-50">
      <div className="max-w-7xl mx-auto">
        {/* Clean Header */}
        <div className="px-8 py-6 pt-12">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              {/* Page Title and Description */}
              <div>
                <h1 className="text-3xl font-medium text-secondary-900 tracking-tight">Personalization Playbooks</h1>
                <p className="text-sm text-secondary-600">Create and manage website personalization rules for different visitor segments</p>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              {/* Import Button */}
              <label className="flex items-center space-x-2 px-4 py-2 text-secondary-700 bg-white border border-secondary-300 hover:bg-secondary-50 transition-colors font-medium text-sm rounded-lg cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>{importing ? 'Importing...' : 'Import'}</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportWorkflow}
                  className="hidden"
                  disabled={importing}
                />
              </label>
              <button
                onClick={onCreateWorkflow}
                className="flex items-center space-x-2 px-4 py-2 bg-primary-500 text-white hover:bg-primary-600 transition-colors font-medium text-sm rounded-lg"
              >
                <Plus className="w-4 h-4" />
                <span>Create Playbook</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-8 pb-8">
          {workflows.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-white border border-secondary-300 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Activity className="w-8 h-8 text-secondary-400" />
              </div>
              <h3 className="text-xl font-semibold text-secondary-900 mb-2">No playbooks yet</h3>
              <p className="text-secondary-600 mb-6 max-w-sm mx-auto">
                Create your first personalization playbook to get started with targeting different visitor segments.
              </p>
              <button
                onClick={onCreateWorkflow}
                className="bg-primary-500 text-white px-6 py-3 rounded-lg hover:bg-primary-600 transition-colors font-medium"
              >
                Create Your First Playbook
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {workflows.map((workflow) => (
                <div
                  key={workflow.id}
                  className="bg-white p-6 rounded-lg border border-secondary-200 hover:border-secondary-300 transition-colors cursor-pointer"
                  onClick={() => onWorkflowSelect(workflow)}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                        <Activity className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-secondary-900 tracking-tight">{workflow.name}</h3>
                        <p className="text-sm text-secondary-600">{workflow.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {/* Status Dropdown */}
                      <StatusDropdown workflow={workflow} />
                      
                      {/* Quick Toggle Button */}
                      <button
                        onClick={(e) => handleQuickToggle(workflow, e)}
                        disabled={updatingStatus === workflow.id}
                        className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                          workflow.status === 'active' 
                            ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                            : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'
                        }`}
                        title={workflow.status === 'active' ? 'Pause workflow' : 'Activate workflow'}
                      >
                        {updatingStatus === workflow.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : workflow.status === 'active' ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </button>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExportWorkflow(workflow);
                        }}
                        disabled={exportingWorkflow === workflow.id}
                        className="p-2 hover:bg-secondary-100 rounded-lg transition-colors disabled:opacity-50"
                        title="Export workflow"
                      >
                        <Download className="w-4 h-4 text-secondary-400" />
                      </button>
                      <button 
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 hover:bg-secondary-100 rounded-lg transition-colors"
                      >
                        <MoreHorizontal className="w-5 h-5 text-secondary-400" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm text-secondary-600">
                    <div className="flex items-center space-x-6">
                      <span>{workflow.nodes.length} nodes</span>
                      <span className="font-medium text-primary-600">{workflow.executions} executions</span>
                      <span>Updated {workflow.updatedAt.toLocaleDateString()}</span>
                      {workflow.lastRun && (
                        <span className="text-xs">Last run: {workflow.lastRun.toLocaleDateString()}</span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-secondary-500">•</span>
                      <span>View details</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkflowList;