import React, { useState } from 'react';
import * as Icons from 'lucide-react';
import {
  Play,
  Pause,
  Edit,
  Trash2,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  Activity,
  Clock,
  RefreshCw
} from 'lucide-react';
import { Workflow } from '../types/workflow';

interface MyWorkflowsProps {
  workflows: Workflow[];
  onWorkflowSelect: (workflow: Workflow) => void;
  onWorkflowToggle: (workflow: Workflow) => void;
  onWorkflowDelete: (workflowId: string) => void;
  onViewAll: () => void;
  maxDisplay?: number;
}

const MyWorkflows: React.FC<MyWorkflowsProps> = ({
  workflows,
  onWorkflowSelect,
  onWorkflowToggle,
  onWorkflowDelete,
  onViewAll,
  maxDisplay = 5,
}) => {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [togglingWorkflow, setTogglingWorkflow] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const sortedWorkflows = workflows.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  const displayWorkflows = expanded ? sortedWorkflows : sortedWorkflows.slice(0, maxDisplay);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'paused':
        return 'bg-yellow-500';
      case 'draft':
        return 'bg-secondary-400';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-secondary-400';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'paused':
        return 'Paused';
      case 'draft':
        return 'Draft';
      case 'error':
        return 'Error';
      default:
        return status;
    }
  };

  const getTriggerIcon = (workflow: Workflow) => {
    const triggerNode = workflow.nodes.find(node => node.type === 'trigger');
    if (triggerNode && triggerNode.icon) {
      const IconComponent = (Icons as any)[triggerNode.icon];
      if (IconComponent) {
        return IconComponent;
      }
    }
    return Activity;
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleToggle = async (workflow: Workflow, e: React.MouseEvent) => {
    e.stopPropagation();
    setTogglingWorkflow(workflow.id);
    try {
      await onWorkflowToggle(workflow);
    } finally {
      setTogglingWorkflow(null);
    }
  };

  const handleDelete = async (workflowId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this workflow?')) {
      setOpenDropdown(null);
      await onWorkflowDelete(workflowId);
    }
  };

  if (workflows.length === 0) {
    return (
      <div className="p-12 text-center">
        <div className="w-16 h-16 bg-secondary-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Activity className="w-8 h-8 text-secondary-400" />
        </div>
        <h3 className="text-lg font-semibold text-secondary-900 mb-2">
          No workflows yet
        </h3>
        <p className="text-sm text-secondary-600">
          Create your first workflow from a template or start from scratch.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Table Header */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-secondary-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-700 uppercase tracking-wider">
                Workflow
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-700 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-700 uppercase tracking-wider">
                Executions
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-700 uppercase tracking-wider">
                Nodes
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-700 uppercase tracking-wider">
                Last Updated
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-secondary-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-secondary-200">
            {displayWorkflows.map(workflow => {
              const TriggerIcon = getTriggerIcon(workflow);
              const isToggling = togglingWorkflow === workflow.id;

              return (
                <tr 
                  key={workflow.id} 
                  className="hover:bg-secondary-50 transition-colors cursor-pointer"
                  onClick={() => onWorkflowSelect(workflow)}
                >
                  {/* Workflow Name & Icon */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <TriggerIcon className="w-5 h-5 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-secondary-900 truncate">
                          {workflow.name}
                        </p>
                        <p className="text-xs text-secondary-500 truncate">
                          {workflow.description}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <div
                        className={`w-2 h-2 rounded-full ${getStatusColor(workflow.status)}`}
                      />
                      <span className="text-sm text-secondary-900">
                        {getStatusLabel(workflow.status)}
                      </span>
                    </div>
                  </td>

                  {/* Executions */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-1 text-sm text-secondary-700">
                      <Activity className="w-4 h-4 text-secondary-400" />
                      <span>{workflow.executions.toLocaleString()}</span>
                    </div>
                  </td>

                  {/* Nodes */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-secondary-700">{workflow.nodes.length}</span>
                  </td>

                  {/* Last Updated */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-1 text-sm text-secondary-600">
                      <Clock className="w-3.5 h-3.5 text-secondary-400" />
                      <span>{formatDate(workflow.updatedAt)}</span>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 whitespace-nowrap text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={e => handleToggle(workflow, e)}
                        disabled={isToggling}
                        className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          workflow.status === 'active'
                            ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                            : 'bg-green-50 text-green-700 hover:bg-green-100'
                        } ${isToggling ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {isToggling ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>...</span>
                          </>
                        ) : workflow.status === 'active' ? (
                          <>
                            <Pause className="w-3.5 h-3.5" />
                            <span>Pause</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5" />
                            <span>Activate</span>
                          </>
                        )}
                      </button>

                      {/* Dropdown Menu */}
                      <div className="relative">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setOpenDropdown(openDropdown === workflow.id ? null : workflow.id);
                          }}
                          className="p-1.5 hover:bg-secondary-100 rounded-lg transition-colors"
                        >
                          <MoreVertical className="w-4 h-4 text-secondary-500" />
                        </button>

                        {openDropdown === workflow.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setOpenDropdown(null)}
                            />
                            <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-secondary-200 rounded-lg shadow-lg z-20 py-1">
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  setOpenDropdown(null);
                                  onWorkflowSelect(workflow);
                                }}
                                className="w-full text-left px-3 py-2 text-sm text-secondary-700 hover:bg-secondary-50 flex items-center space-x-2"
                              >
                                <Edit className="w-4 h-4" />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={e => handleDelete(workflow.id, e)}
                                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span>Delete</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Expand/Collapse Button */}
      {workflows.length > maxDisplay && (
        <div className="px-6 py-4 bg-secondary-50 border-t border-secondary-200">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-center space-x-2 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
          >
            {expanded ? (
              <>
                <ChevronUp className="w-4 h-4" />
                <span>Show Less</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                <span>Show All {workflows.length} Workflows</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default MyWorkflows;

