import React, { useState } from 'react';
import { 
  Play, 
  Pause, 
  Activity, 
  MoreHorizontal,
  Download,
  RefreshCw,
  Trash2,
  Settings,
  Globe,
  Clock,
  Circle,
  Square
} from 'lucide-react';
import * as Icons from 'lucide-react';
import { Workflow, WorkflowNode } from '../types/workflow';
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

const getNodeIcon = (iconName: string) => {
  const IconComponent = (Icons as any)[iconName];
  return IconComponent || Circle;
};

const WorkflowList: React.FC<WorkflowListProps> = ({ 
  workflows, 
  onWorkflowSelect, 
  onCreateWorkflow,
  onWorkflowImport,
  onWorkflowUpdate,
  onWorkflowDelete
}) => {
  const [exportingWorkflow, setExportingWorkflow] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [deletingWorkflow, setDeletingWorkflow] = useState<string | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'paused': return 'bg-amber-500';
      case 'draft': return 'bg-zinc-400';
      case 'error': return 'bg-rose-500';
      default: return 'bg-zinc-400';
    }
  };
  
  // Format for display
  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const handleExportWorkflow = async (workflow: Workflow) => {
    try {
      setExportingWorkflow(workflow.id);
      await StorageService.exportWorkflow(workflow);
    } catch (error) {
      console.error('Error exporting workflow:', error);
    } finally {
      setExportingWorkflow(null);
    }
  };

  const handleStatusChange = async (workflow: Workflow, newStatus: 'draft' | 'active' | 'paused' | 'error') => {
    try {
      setUpdatingStatus(workflow.id);
      
      const updatedWorkflow = {
        ...workflow,
        status: newStatus,
        isActive: newStatus === 'active',
        updatedAt: new Date()
      };

      const savedWorkflow = await WorkflowService.saveWorkflow(updatedWorkflow);
      
      if (onWorkflowUpdate) {
        onWorkflowUpdate(savedWorkflow);
      }
    } catch (error) {
      console.error('Error updating workflow status:', error);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleQuickToggle = async (workflow: Workflow, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = workflow.status === 'active' ? 'paused' : 'active';
    await handleStatusChange(workflow, newStatus);
  };

  const handleDeleteWorkflow = async (workflowId: string) => {
    if (!window.confirm('Are you sure you want to delete this workflow? This action cannot be undone.')) {
      return;
    }

    try {
      setDeletingWorkflow(workflowId);
      await WorkflowService.deleteWorkflow(workflowId);
      
      if (onWorkflowDelete) {
        onWorkflowDelete(workflowId);
      }
    } catch (error) {
      console.error('Error deleting workflow:', error);
    } finally {
      setDeletingWorkflow(null);
    }
  };

  const StatusDot: React.FC<{ workflow: Workflow }> = ({ workflow }) => {
    return (
      <div className="flex items-center gap-2">
        {updatingStatus === workflow.id ? (
          <RefreshCw className="size-2 animate-spin text-zinc-400" />
        ) : (
          <div 
            className={`size-2 rounded-full ${getStatusColor(workflow.status)}`}
          />
        )}
        <span className="text-sm text-zinc-600">{getStatusLabel(workflow.status)}</span>
      </div>
    );
  };

  const NodePill: React.FC<{ node: WorkflowNode }> = ({ node }) => {
    const Icon = getNodeIcon(node.icon);
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-100 border border-zinc-200 rounded text-xs text-zinc-600 max-w-[140px]">
        <Icon className="size-3 flex-shrink-0 text-zinc-500" />
        <span className="truncate">{node.name}</span>
      </div>
    );
  };

  return (
    <div className="flex-1 bg-white">
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        
        {/* Main Content */}
        <div className="relative">
          {workflows.length === 0 ? (
            <div className="text-center py-16 border border-zinc-200 rounded-md bg-white">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-zinc-100 flex items-center justify-center">
                <Activity className="size-6 text-zinc-400" />
              </div>
              <h3 className="text-sm font-medium text-zinc-900 mb-1">No playbooks yet</h3>
              <p className="text-xs text-zinc-500 mb-4">
                Create your first personalization playbook to get started.
              </p>
              <button
                onClick={onCreateWorkflow}
                className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white hover:bg-zinc-800 transition-colors font-medium text-sm rounded-md shadow-sm"
              >
                Create Your First Playbook
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Groups */}
              {groupWorkflowsByUrl(workflows).map((group) => (
                <div key={group.url}>
                  {/* Website Title */}
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <Globe className="size-4 text-zinc-500" />
                    <h2 className="font-medium text-zinc-900">
                      {group.url === 'No Target URL' ? 'General Playbooks' : group.url}
                    </h2>
                    <span className="text-zinc-400 text-sm ml-1">
                      {group.workflows.length}
                    </span>
                  </div>
                  
                  {/* Table for this website */}
                  <div className="border border-zinc-200 rounded-md bg-white overflow-hidden">
                    <div className="divide-y divide-zinc-100">
                      {group.workflows.map((workflow) => {
                        // Filter out trigger node to show only action/logic nodes
                        const contentNodes = workflow.nodes.filter(n => n.type !== 'trigger');
                        // Take first 2 nodes to display
                        const displayNodes = contentNodes.slice(0, 2);
                        const remainingCount = contentNodes.length - 2;

                        return (
                          <div
                            key={workflow.id}
                            className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-zinc-50 transition-colors cursor-pointer"
                            onClick={() => onWorkflowSelect(workflow)}
                          >
                            {/* Name Column */}
                            <div className="col-span-5 flex items-center gap-4 min-w-0">
                              <div className="size-10 rounded-md border border-zinc-200 flex items-center justify-center flex-shrink-0 bg-white">
                                {React.createElement(getTriggerIcon(workflow), { className: "size-5 text-zinc-500" })}
                              </div>
                              
                              <div className="min-w-0 flex-1">
                                <div className="font-medium text-zinc-900 truncate text-sm mb-0.5">
                                  {workflow.name}
                                </div>
                                <div className="text-xs text-zinc-500 truncate flex items-center gap-1.5">
                                  <span className="truncate">
                                    {workflow.description || 'No description'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Status Column */}
                            <div className="col-span-2">
                              <StatusDot workflow={workflow} />
                            </div>

                            {/* Nodes Column (was Last Run) */}
                            <div className="col-span-3 flex items-center gap-2 min-w-0">
                              {displayNodes.length > 0 ? (
                                <>
                                  {displayNodes.map(node => (
                                    <NodePill key={node.id} node={node} />
                                  ))}
                                  {remainingCount > 0 && (
                                    <div className="text-xs text-zinc-400 px-1">+{remainingCount}</div>
                                  )}
                                </>
                              ) : (
                                <span className="text-xs text-zinc-400 italic">No actions</span>
                              )}
                            </div>

                            {/* Actions Column */}
                            <div className="col-span-2 flex items-center justify-end gap-2">
                              <button
                                onClick={(e) => handleQuickToggle(workflow, e)}
                                disabled={updatingStatus === workflow.id}
                                className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-md transition-colors"
                                title={workflow.status === 'active' ? 'Pause' : 'Activate'}
                              >
                                {updatingStatus === workflow.id ? (
                                  <RefreshCw className="size-4 animate-spin" />
                                ) : workflow.status === 'active' ? (
                                  <Pause className="size-4" />
                                ) : (
                                  <Play className="size-4" />
                                )}
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onWorkflowSelect) onWorkflowSelect(workflow);
                                }}
                                className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-md transition-colors"
                                title="Settings"
                              >
                                <Settings className="size-4" />
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteWorkflow(workflow.id);
                                }}
                                disabled={deletingWorkflow === workflow.id}
                                className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                                title="Delete"
                              >
                                {deletingWorkflow === workflow.id ? (
                                  <RefreshCw className="size-4 animate-spin" />
                                ) : (
                                  <Trash2 className="size-4" />
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
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
