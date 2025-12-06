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
import WorldMapVisualization from './WorldMapVisualization';

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
    <div className="flex-1 bg-white h-full overflow-hidden">
      <div className="max-w-[1600px] mx-auto px-6 py-4 h-full flex flex-col">
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-px bg-zinc-200 border border-zinc-200 rounded-md overflow-hidden mb-8 shrink-0">
          {/* Real-Time Users Widget */}
          <RealTimeUsers />

          <div className="bg-white p-4 hover:bg-zinc-50 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="size-4 text-zinc-400" />
              <span className="text-xs text-zinc-500 uppercase tracking-wider">Total Playbooks</span>
            </div>
            <div className="text-2xl font-light">{stats.totalPlaybooks}</div>
          </div>

          <div className="bg-white p-4 hover:bg-zinc-50 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="size-4 text-zinc-400" />
              <span className="text-xs text-zinc-500 uppercase tracking-wider">Active</span>
            </div>
            <div className="text-2xl font-light">{stats.activePlaybooks}</div>
          </div>

          <div className="bg-white p-4 hover:bg-zinc-50 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="size-4 text-zinc-400" />
              <span className="text-xs text-zinc-500 uppercase tracking-wider">Executions</span>
            </div>
            <div className="text-2xl font-light">{stats.totalExecutions.toLocaleString()}</div>
          </div>

          <div className="bg-white p-4 hover:bg-zinc-50 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="size-4 text-zinc-400" />
              <span className="text-xs text-zinc-500 uppercase tracking-wider">Success Rate</span>
            </div>
            <div className="text-2xl font-light">{stats.successRate}%</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch flex-1 min-h-0">
          {/* World Map Visualization */}
          <div className="lg:col-span-2 flex flex-col">
            <WorldMapVisualization />
          </div>

          {/* Featured Templates */}
          <div className="flex flex-col min-h-0">
            <div className="mb-3 shrink-0">
              <h2 className="text-sm font-medium text-zinc-900">Quick Start</h2>
              <p className="text-xs text-zinc-500 mt-0.5">Start with a popular template</p>
            </div>

            <div className="space-y-2 flex-1 flex flex-col min-h-0 overflow-hidden">
              {featuredTemplates.map((template) => {
                const triggerNode = template.nodes.find(n => n.type === 'trigger');
                const IconComponent = triggerNode?.icon 
                  ? (Icons[triggerNode.icon as keyof typeof Icons] as React.ComponentType<{ className?: string }>) 
                  : BookTemplate;

                return (
                  <div 
                    key={template.id} 
                    className="group flex-1 border border-zinc-200 rounded-md bg-white p-3 hover:border-zinc-300 transition-all hover:shadow-sm flex flex-col min-h-0"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      {IconComponent && <IconComponent className="size-3.5 text-zinc-500" />}
                      <div className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                        {template.templateMeta?.categoryLabel || 'Template'}
                      </div>
                    </div>
                    
                    <h3 className="text-sm font-medium text-zinc-900 mb-0.5">{template.name}</h3>
                    <p className="text-xs text-zinc-500 mb-2 line-clamp-1 flex-1">{template.description}</p>
                    
                    <div className="flex items-center gap-2 mt-auto shrink-0">
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
