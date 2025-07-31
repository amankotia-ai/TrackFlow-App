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
  Trash2,
  Check,
  X,
  Settings,
  Globe
} from 'lucide-react';
import * as Icons from 'lucide-react';
import { Workflow } from '../types/workflow';
import { StorageService } from '../services/storageService';
import { WorkflowService } from '../services/workflowService';

interface WorkflowListProps {
  workflows: Workflow[];
  onWorkflowSelect: (workflow: Workflow) => void;
  onCreateWorkflow: () => void;
  onWorkflowImport?: (workflow: Workflow) => void;
  onWorkflowUpdate?: (workflow: Workflow) => void;
  onWorkflowDelete?: (workflowId: string) => void;
}

// Group workflows by URL
interface WorkflowGroup {
  url: string;
  workflows: Workflow[];
}

const groupWorkflowsByUrl = (workflows: Workflow[]): WorkflowGroup[] => {
  const grouped = workflows.reduce((acc: Record<string, Workflow[]>, workflow) => {
    const url = workflow.targetUrl || 'No Target URL';
    if (!acc[url]) {
      acc[url] = [];
    }
    acc[url].push(workflow);
    return acc;
  }, {});

  // Convert to array and sort by URL, with "No Target URL" at the end
  return Object.entries(grouped)
    .map(([url, workflows]) => ({ url, workflows }))
    .sort((a, b) => {
      if (a.url === 'No Target URL') return 1;
      if (b.url === 'No Target URL') return -1;
      return a.url.localeCompare(b.url);
    });
};

// Get trigger icon for a workflow
const getTriggerIcon = (workflow: Workflow) => {
  const triggerNode = workflow.nodes.find(node => node.type === 'trigger');
  if (triggerNode && triggerNode.icon) {
    // Get the icon component from lucide-react
    const IconComponent = (Icons as any)[triggerNode.icon];
    if (IconComponent) {
      return IconComponent;
    }
  }
  return Activity; // fallback icon
};

const WorkflowList: React.FC<WorkflowListProps> = ({ 
  workflows, 
  onWorkflowSelect, 
  onCreateWorkflow,
  onWorkflowImport,
  onWorkflowUpdate,
  onWorkflowDelete
}) => {
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);
  const [exportingWorkflow, setExportingWorkflow] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [deletingWorkflow, setDeletingWorkflow] = useState<string | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'paused': return 'bg-yellow-500';
      case 'draft': return 'bg-secondary-400';
      case 'error': return 'bg-red-500';
      default: return 'bg-secondary-400';
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
      
      console.log(`🔄 Changing workflow "${workflow.name}" status from ${workflow.status} to ${newStatus}`);
      
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



  const handleDeleteWorkflow = async (workflowId: string) => {
    if (!window.confirm('Are you sure you want to delete this workflow? This action cannot be undone.')) {
      return;
    }

    try {
      setDeletingWorkflow(workflowId);
      
      // Delete from database
      await WorkflowService.deleteWorkflow(workflowId);
      
      // Notify parent component to update the list
      if (onWorkflowDelete) {
        onWorkflowDelete(workflowId);
      }
      
      console.log(`✅ Deleted workflow ${workflowId}`);
    } catch (error) {
      console.error('❌ Error deleting workflow:', error);
      // You could show an error message here
    } finally {
      setDeletingWorkflow(null);
      setOpenDropdown(null);
    }
  };

  const StatusDot: React.FC<{ workflow: Workflow }> = ({ workflow }) => {
    return (
      <div className="flex items-center">
        {updatingStatus === workflow.id ? (
          <RefreshCw className="w-2 h-2 animate-spin text-secondary-400" />
        ) : (
          <div 
            className={`w-2 h-2 rounded-full ${getStatusColor(workflow.status)}`}
            title={`Status: ${workflow.status}`}
          />
        )}
      </div>
    );
  };

  const WorkflowMenu: React.FC<{ workflow: Workflow }> = ({ workflow }) => {
    const isOpen = openDropdown === workflow.id;
    
    return (
      <div className="relative z-[60]">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setOpenDropdown(isOpen ? null : workflow.id);
          }}
          className="p-2 hover:bg-secondary-100 rounded-lg transition-colors"
          title="More options"
        >
          <MoreHorizontal className="w-4 h-4 text-secondary-400" />
        </button>
        
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-[55]"
              onClick={() => setOpenDropdown(null)}
            />
            <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-secondary-200 rounded-lg shadow-xl z-[60] max-h-64 overflow-y-auto">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenDropdown(null);
                  handleExportWorkflow(workflow);
                }}
                disabled={exportingWorkflow === workflow.id}
                className="w-full text-left px-3 py-2 flex items-center hover:bg-secondary-50 first:rounded-t-lg disabled:opacity-50 transition-colors"
              >
                <Download className="w-4 h-4 mr-3 text-secondary-500" />
                <span className="text-sm text-secondary-700">
                  {exportingWorkflow === workflow.id ? 'Exporting...' : 'Export'}
                </span>
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // Add duplicate functionality here if needed
                  setOpenDropdown(null);
                }}
                className="w-full text-left px-3 py-2 flex items-center hover:bg-secondary-50 transition-colors"
              >
                <Settings className="w-4 h-4 mr-3 text-secondary-500" />
                <span className="text-sm text-secondary-700">Settings</span>
              </button>
              
              <hr className="border-secondary-100" />
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteWorkflow(workflow.id);
                }}
                disabled={deletingWorkflow === workflow.id}
                className="w-full text-left px-3 py-2 flex items-center hover:bg-red-50 last:rounded-b-lg disabled:opacity-50 transition-colors"
              >
                <Trash2 className="w-4 h-4 mr-3 text-red-500" />
                <span className="text-sm text-red-600">
                  {deletingWorkflow === workflow.id ? 'Deleting...' : 'Delete'}
                </span>
              </button>
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
                <button
                  onClick={onCreateWorkflow}
                  className="flex items-center space-x-2 px-4 py-2 bg-primary-500 text-white hover:bg-primary-600 transition-colors font-medium text-sm rounded-lg"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Playbook</span>
                </button>
              </div>
            </div>
          </div>

        {/* Main Content */}
        <div className="px-8 pb-8 relative">
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
            <div className="space-y-4 relative">
              {groupWorkflowsByUrl(workflows).map((group) => (
                <div key={group.url} className="bg-white rounded-lg border border-secondary-200 shadow-sm">
                  {/* URL Group Header */}
                  <div className="px-6 py-4 bg-secondary-50 border-b border-secondary-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-white rounded-lg">
                          <Globe className="w-4 h-4 text-secondary-500" />
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-secondary-900">
                            {group.url === 'No Target URL' ? 'General Playbooks' : group.url}
                          </h3>
                          <p className="text-xs text-secondary-600">
                            {group.workflows.length} playbook{group.workflows.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Workflows List */}
                  <div className="divide-y divide-secondary-100 relative overflow-visible">
                    {group.workflows.map((workflow, index) => (
                      <div
                        key={workflow.id}
                        className={`px-6 py-5 hover:bg-secondary-50 transition-colors cursor-pointer group relative overflow-visible ${
                          index === group.workflows.length - 1 ? 'rounded-b-lg' : ''
                        }`}
                        onClick={() => onWorkflowSelect(workflow)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4 min-w-0 flex-1">
                            {/* Workflow Icon */}
                            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
                              {React.createElement(getTriggerIcon(workflow), { className: "w-5 h-5 text-white" })}
                            </div>
                            
                            {/* Workflow Info */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center space-x-3 mb-1">
                                <h3 className="text-base font-medium text-secondary-900 truncate">{workflow.name}</h3>
                                <StatusDot workflow={workflow} />
                              </div>
                              <p className="text-sm text-secondary-600 line-clamp-1">{workflow.description}</p>
                            </div>
                          </div>

                          {/* Workflow Metrics and Actions */}
                          <div className="flex items-center space-x-6 ml-4 flex-shrink-0">
                            {/* Metrics */}
                            <div className="hidden md:flex items-center space-x-6 text-sm text-secondary-500">
                              <span className="font-medium text-primary-600">{workflow.executions} executions</span>
                              <span>{workflow.nodes.length} nodes</span>
                              <span>Updated {workflow.updatedAt.toLocaleDateString()}</span>
                            </div>

                            {/* Quick Actions */}
                            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                              
                              {/* Export Button */}
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
                              
                              {/* More Options */}
                              <WorkflowMenu workflow={workflow} />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
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