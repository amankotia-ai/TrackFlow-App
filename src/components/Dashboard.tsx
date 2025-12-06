import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Play, 
  Pause, 
  Zap, 
  Activity, 
  Clock,
  ArrowRight,
  Globe,
  BarChart3,
  Copy,
  Eye,
  BookTemplate,
  Trash2,
  Settings
} from 'lucide-react';
import * as Icons from 'lucide-react';
import { Workflow, WorkflowTemplate } from '../types/workflow';
import { WorkflowService } from '../services/workflowService';
import { workflowTemplates } from '../data/workflowTemplates';
import TemplatePreviewModal from './TemplatePreviewModal';
import RealTimeUsers from './RealTimeUsers';

interface DashboardProps {
  workflows?: Workflow[];
  onCreateWorkflow?: () => void;
  onWorkflowSelect?: (workflow: Workflow) => void;
  onWorkflowUpdate?: (workflow: Workflow) => void;
  onWorkflowDelete?: (workflowId: string) => void;
  onViewAllWorkflows?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  workflows = [], 
  onCreateWorkflow,
  onWorkflowSelect,
  onWorkflowUpdate,
  onWorkflowDelete,
  onViewAllWorkflows
}) => {
  const [previewTemplate, setPreviewTemplate] = useState<WorkflowTemplate | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [cloningTemplate, setCloningTemplate] = useState(false);

  // Stats Calculation
  const stats = useMemo(() => {
    const totalPlaybooks = workflows.length;
    const activePlaybooks = workflows.filter(w => w.status === 'active').length;
    const totalExecutions = workflows.reduce((sum, w) => sum + w.executions, 0);
    
    // Calculate success rate (mock data for now as we don't have error counts in basic workflow type)
    // In a real app, this would come from execution logs
    const successRate = totalExecutions > 0 ? 98 : 0; 

    return {
      totalPlaybooks,
      activePlaybooks,
      totalExecutions,
      successRate
    };
  }, [workflows]);

  // Recent Workflows
  const recentWorkflows = useMemo(() => {
    return [...workflows]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);
  }, [workflows]);

  // Featured Templates (First 3 generic/popular ones)
  const featuredTemplates = useMemo(() => {
    return workflowTemplates.slice(0, 3);
  }, []);

  const handleWorkflowToggle = async (workflow: Workflow) => {
    const newStatus = workflow.status === 'active' ? 'paused' : 'active';
    const updatedWorkflow = {
      ...workflow,
      status: newStatus as 'draft' | 'active' | 'paused' | 'error',
      isActive: newStatus === 'active',
      updatedAt: new Date()
    };

    try {
      const saved = await WorkflowService.saveWorkflow(updatedWorkflow);
      if (onWorkflowUpdate) {
        onWorkflowUpdate(saved);
      }
    } catch (error) {
      console.error('Error toggling workflow:', error);
    }
  };

  const handleTemplatePreview = (template: WorkflowTemplate) => {
    setPreviewTemplate(template);
    setIsPreviewOpen(true);
  };

  const handleCloneTemplate = async (template: WorkflowTemplate) => {
    if (cloningTemplate) return;

    setCloningTemplate(true);
    try {
      const clonedWorkflow = await WorkflowService.cloneTemplate(template);
      if (onWorkflowSelect) {
        onWorkflowSelect(clonedWorkflow);
      }
    } catch (error) {
      console.error('Error cloning template:', error);
      alert('Failed to clone template. Please try again.');
    } finally {
      setCloningTemplate(false);
    }
  };

  // Helper to get icon component
  const getIconComponent = (iconName: string, className: string = "size-4") => {
    const IconComponent = Icons[iconName as keyof typeof Icons] as React.ComponentType<{ className?: string }>;
    if (IconComponent) {
      return <IconComponent className={className} />;
    }
    return <Activity className={className} />;
  };

  const getStatusDotColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-500',
      paused: 'bg-amber-500',
      draft: 'bg-zinc-400',
      error: 'bg-rose-500'
    };
    return colors[status] || colors.draft;
  };

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <div className="flex-1 bg-white">
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {/* Real-Time Users Widget */}
          <RealTimeUsers className="lg:col-span-1" />

          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-px bg-zinc-200 border border-zinc-200 rounded-md overflow-hidden lg:col-span-4">
            <div className="bg-white p-6 hover:bg-zinc-50 transition-colors">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="size-4 text-zinc-400" />
                <span className="text-xs text-zinc-500 uppercase tracking-wider">Total Playbooks</span>
              </div>
              <div className="text-3xl font-light mb-1">{stats.totalPlaybooks}</div>
              <div className="text-xs text-zinc-500">All workflows</div>
            </div>

            <div className="bg-white p-6 hover:bg-zinc-50 transition-colors">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="size-4 text-zinc-400" />
                <span className="text-xs text-zinc-500 uppercase tracking-wider">Active</span>
              </div>
              <div className="text-3xl font-light mb-1">{stats.activePlaybooks}</div>
              <div className="text-xs text-zinc-500">Running now</div>
            </div>

            <div className="bg-white p-6 hover:bg-zinc-50 transition-colors">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="size-4 text-zinc-400" />
                <span className="text-xs text-zinc-500 uppercase tracking-wider">Executions</span>
              </div>
              <div className="text-3xl font-light mb-1">{stats.totalExecutions.toLocaleString()}</div>
              <div className="text-xs text-zinc-500">Total runs</div>
            </div>

            <div className="bg-white p-6 hover:bg-zinc-50 transition-colors">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="size-4 text-zinc-400" />
                <span className="text-xs text-zinc-500 uppercase tracking-wider">Success Rate</span>
              </div>
              <div className="text-3xl font-light mb-1">{stats.successRate}%</div>
              <div className="text-xs text-zinc-500">Estimated</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Workflows */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-medium text-zinc-900">Recent Playbooks</h2>
                <p className="text-xs text-zinc-500 mt-1">Recently updated or executed workflows</p>
              </div>
              {workflows.length > 0 && (
                <button 
                  onClick={onViewAllWorkflows}
                  className="text-xs text-zinc-500 hover:text-zinc-900 flex items-center gap-1 transition-colors"
                >
                  View all <ArrowRight className="size-3" />
                </button>
              )}
            </div>

            {workflows.length === 0 ? (
              <div className="border border-zinc-200 rounded-md bg-white py-12 text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-zinc-100 flex items-center justify-center">
                  <BarChart3 className="size-6 text-zinc-400" />
                </div>
                <h3 className="text-sm font-medium mb-1">No playbooks yet</h3>
                <p className="text-xs text-zinc-500 mb-4">Create your first workflow to get started</p>
                <button 
                  onClick={onCreateWorkflow}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  Create new playbook
                </button>
              </div>
            ) : (
              <div className="border border-zinc-200 rounded-md overflow-hidden bg-white">
                <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-zinc-50 text-xs text-zinc-500 uppercase tracking-wider border-b border-zinc-200">
                  <div className="col-span-5">Name</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-3">Last Run</div>
                  <div className="col-span-2 text-right">Actions</div>
                </div>
                {recentWorkflows.map((workflow) => {
                  const triggerNode = workflow.nodes.find(node => node.type === 'trigger');
                  return (
                    <div key={workflow.id} className="grid grid-cols-12 gap-4 px-4 py-3 text-sm border-b border-zinc-100 last:border-0 hover:bg-zinc-50 transition-colors items-center">
                      <div className="col-span-5 flex items-center gap-3 min-w-0">
                        {triggerNode ? getIconComponent(triggerNode.icon, "size-4 text-zinc-500 flex-shrink-0") : <Activity className="size-4 text-zinc-500 flex-shrink-0" />}
                        <div className="min-w-0">
                          <div 
                            className="font-medium truncate cursor-pointer hover:text-blue-600 transition-colors"
                            onClick={() => onWorkflowSelect && onWorkflowSelect(workflow)}
                          >
                            {workflow.name}
                          </div>
                          <div className="text-xs text-zinc-500 truncate flex items-center gap-1">
                            {workflow.targetUrl && (
                              <>
                                <Globe className="size-3" />
                                <span className="truncate max-w-[150px]">{new URL(workflow.targetUrl).hostname}</span>
                              </>
                            )}
                            {!workflow.targetUrl && workflow.description}
                          </div>
                        </div>
                      </div>
                      
                      <div className="col-span-2">
                        <div className="flex items-center gap-1.5">
                          <div className={`size-2 rounded-full ${getStatusDotColor(workflow.status)}`} />
                          <span className="capitalize text-zinc-600 text-xs">{workflow.status}</span>
                        </div>
                      </div>
                      
                      <div className="col-span-3 text-zinc-600 text-xs">
                        {workflow.lastRun ? formatTimeAgo(workflow.lastRun) : 'Never'}
                      </div>
                      
                      <div className="col-span-2 flex justify-end">
                         {/* Simple Actions */}
                         <div className="flex items-center gap-1">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleWorkflowToggle(workflow);
                              }}
                              className="p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded transition-colors"
                              title={workflow.status === 'active' ? 'Pause' : 'Activate'}
                            >
                              {workflow.status === 'active' ? <Pause className="size-4" /> : <Play className="size-4" />}
                            </button>
                            
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onWorkflowSelect) onWorkflowSelect(workflow);
                              }}
                              className="p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded transition-colors"
                              title="Edit"
                            >
                              <Settings className="size-4" />
                            </button>

                            {onWorkflowDelete && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm('Are you sure you want to delete this workflow?')) {
                                    onWorkflowDelete(workflow.id);
                                  }
                                }}
                                className="p-1.5 text-zinc-500 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            )}
                         </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Featured Templates */}
          <div>
            <div className="mb-4">
              <h2 className="text-sm font-medium text-zinc-900">Quick Start</h2>
              <p className="text-xs text-zinc-500 mt-1">Start with a popular template</p>
            </div>

            <div className="space-y-3">
              {featuredTemplates.map((template) => {
                const triggerNode = template.nodes.find(n => n.type === 'trigger');
                const IconComponent = triggerNode?.icon 
                  ? (Icons[triggerNode.icon as keyof typeof Icons] as React.ComponentType<{ className?: string }>) 
                  : BookTemplate;

                return (
                  <div 
                    key={template.id} 
                    className="group border border-zinc-200 rounded-md bg-white p-4 hover:border-zinc-300 transition-all hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {IconComponent && <IconComponent className="size-4 text-zinc-500" />}
                        <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                          {template.templateMeta?.categoryLabel || 'Template'}
                        </div>
                      </div>
                    </div>
                    
                    <h3 className="text-sm font-medium text-zinc-900 mb-1">{template.name}</h3>
                    <p className="text-xs text-zinc-500 mb-4 line-clamp-2">{template.description}</p>
                    
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleTemplatePreview(template)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 transition-colors text-xs font-medium rounded-md"
                      >
                        <Eye className="size-3.5" />
                        Preview
                      </button>
                      <button 
                        onClick={() => handleCloneTemplate(template)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-zinc-900 text-white hover:bg-zinc-800 transition-colors text-xs font-medium rounded-md"
                      >
                        <Copy className="size-3.5" />
                        Use
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Template Preview Modal */}
      <TemplatePreviewModal
        template={previewTemplate}
        isOpen={isPreviewOpen}
        onClose={() => {
          setIsPreviewOpen(false);
          setPreviewTemplate(null);
        }}
        onUseTemplate={handleCloneTemplate}
      />
    </div>
  );
};

export default Dashboard;
