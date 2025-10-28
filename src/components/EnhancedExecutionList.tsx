import React, { useState } from 'react';
import { CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, Monitor, Smartphone, Tablet } from 'lucide-react';
import { WorkflowExecution } from '../services/analyticsService';
import { TimeGroupedExecutions } from '../utils/dashboardHelpers';
import { Workflow } from '../types/workflow';

interface EnhancedExecutionListProps {
  groupedExecutions: TimeGroupedExecutions;
  workflows: Workflow[];
}

const EnhancedExecutionList: React.FC<EnhancedExecutionListProps> = ({ 
  groupedExecutions,
  workflows 
}) => {
  const [expandLast30, setExpandLast30] = useState(false);
  const [expandEarlier, setExpandEarlier] = useState(false);
  
  const getWorkflowName = (workflowId: string): string => {
    const workflow = workflows.find(w => w.id === workflowId);
    return workflow ? workflow.name : `Playbook ${workflowId.slice(-8)}`;
  };

  const getDeviceIcon = (userAgent: string | null) => {
    if (!userAgent) return <Monitor className="w-4 h-4" />;
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return <Smartphone className="w-4 h-4" />;
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
      return <Tablet className="w-4 h-4" />;
    }
    return <Monitor className="w-4 h-4" />;
  };

  const getDeviceName = (userAgent: string | null): string => {
    if (!userAgent) return 'Unknown Device';
    const ua = userAgent.toLowerCase();
    
    if (ua.includes('iphone')) return 'iPhone';
    if (ua.includes('ipad')) return 'iPad';
    if (ua.includes('android')) {
      if (ua.includes('mobile')) return 'Android Phone';
      return 'Android Tablet';
    }
    if (ua.includes('mac')) return 'Mac';
    if (ua.includes('windows')) return 'Windows PC';
    if (ua.includes('linux')) return 'Linux';
    
    return 'Desktop';
  };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const ExecutionCard = ({ execution }: { execution: WorkflowExecution }) => {
    const isSuccess = execution.status === 'success';
    
    return (
      <div className="bg-white border border-secondary-200 rounded-lg p-4 hover:border-secondary-300 transition-colors">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center flex-1">
            <div className={`w-2 h-2 rounded-full mr-3 flex-shrink-0 ${
              isSuccess ? 'bg-green-500' : 'bg-red-500'
            }`} />
            <h4 className="font-medium text-secondary-900">
              {getWorkflowName(execution.workflow_id)}
            </h4>
          </div>
          <span className="text-xs text-secondary-500 ml-2">
            {formatTimeAgo(execution.executed_at)}
          </span>
        </div>
        
        {/* Details */}
        <div className="ml-5 space-y-2">
          <div className="flex items-center text-sm text-secondary-600">
            <span className="truncate">{execution.page_url || 'Unknown page'}</span>
          </div>
          
          <div className="flex items-center gap-4 text-xs text-secondary-500">
            <div className="flex items-center">
              {getDeviceIcon(execution.user_agent)}
              <span className="ml-1">{getDeviceName(execution.user_agent)}</span>
            </div>
            
            <div className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
              isSuccess ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {isSuccess ? 'Success' : 'Failed'}
            </div>
          </div>
          
          {/* Error Message */}
          {!isSuccess && execution.error_message && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
              <span className="font-medium">Error: </span>
              {execution.error_message}
            </div>
          )}
        </div>
      </div>
    );
  };

  const SummaryCard = ({ 
    executions, 
    label, 
    expanded, 
    onToggle 
  }: { 
    executions: WorkflowExecution[], 
    label: string,
    expanded: boolean,
    onToggle: () => void
  }) => {
    const successCount = executions.filter(e => e.status === 'success').length;
    const errorCount = executions.filter(e => e.status === 'error' || e.status === 'timeout').length;
    
    return (
      <div className="bg-white border border-secondary-200 rounded-lg">
        <button
          onClick={onToggle}
          className="w-full p-4 flex items-center justify-between hover:bg-secondary-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-secondary-900">{label}</span>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-green-600">✓ {successCount}</span>
              <span className="text-red-600">✗ {errorCount}</span>
            </div>
          </div>
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-secondary-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-secondary-500" />
          )}
        </button>
        
        {expanded && (
          <div className="border-t border-secondary-200 p-4 space-y-2">
            {executions.map(execution => (
              <ExecutionCard key={execution.id} execution={execution} />
            ))}
          </div>
        )}
      </div>
    );
  };

  const totalExecutions = groupedExecutions.recent.length + 
                         groupedExecutions.last30.length + 
                         groupedExecutions.earlier.length;

  if (totalExecutions === 0) {
    return (
      <div className="bg-white rounded-lg border border-secondary-200 p-8 text-center">
        <Clock className="w-12 h-12 text-secondary-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-secondary-900 mb-2">No Recent Activity</h3>
        <p className="text-sm text-secondary-600">
          Playbook executions will appear here as your workflows run on your website.
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Recent - Always Expanded */}
      {groupedExecutions.recent.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-secondary-700 mb-3 flex items-center">
            <Clock className="w-4 h-4 mr-2" />
            Last 5 Minutes ({groupedExecutions.recent.length} execution{groupedExecutions.recent.length !== 1 ? 's' : ''})
          </h3>
          <div className="space-y-2">
            {groupedExecutions.recent.map(execution => (
              <ExecutionCard key={execution.id} execution={execution} />
            ))}
          </div>
        </div>
      )}
      
      {/* Last 30 minutes - Collapsible */}
      {groupedExecutions.last30.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-secondary-700 mb-3 flex items-center">
            <Clock className="w-4 h-4 mr-2" />
            5-30 Minutes Ago
          </h3>
          <SummaryCard
            executions={groupedExecutions.last30}
            label={`${groupedExecutions.last30.length} executions`}
            expanded={expandLast30}
            onToggle={() => setExpandLast30(!expandLast30)}
          />
        </div>
      )}
      
      {/* Execution History - Collapsible */}
      {groupedExecutions.earlier.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-secondary-700 mb-3 flex items-center">
            <Clock className="w-4 h-4 mr-2" />
            Execution History
          </h3>
          <SummaryCard
            executions={groupedExecutions.earlier}
            label={`${groupedExecutions.earlier.length} executions`}
            expanded={expandEarlier}
            onToggle={() => setExpandEarlier(!expandEarlier)}
          />
        </div>
      )}
    </div>
  );
};

export default EnhancedExecutionList;

