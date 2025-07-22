import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Pause,
  TrendingUp,
  Users,
  Zap,
  Plus,
  Download,
  RefreshCw,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { AnalyticsService, UserStats, WorkflowExecution } from '../services/analyticsService';
import { Workflow } from '../types/workflow';

interface DashboardProps {
  workflows?: Workflow[];
}

const Dashboard: React.FC<DashboardProps> = ({ workflows = [] }) => {
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [recentExecutions, setRecentExecutions] = useState<WorkflowExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!isMountedRef.current) return;
      
      try {
        setLoading(true);
        setError(null);

        // Safety timeout for dashboard loading
        const loadingTimeout = setTimeout(() => {
          if (isMountedRef.current) {
            console.warn('Dashboard loading timeout reached');
            setLoading(false);
            setError('Dashboard is taking longer than expected to load. Please refresh.');
          }
        }, 20000);

        // Load data using the new AnalyticsService
        const [stats, executions] = await Promise.all([
          AnalyticsService.getUserStats(),
          AnalyticsService.getWorkflowExecutions(undefined, 10)
        ]);
        
        clearTimeout(loadingTimeout);

        if (isMountedRef.current) {
          setUserStats(stats);
          setRecentExecutions(executions);
        }
      } catch (err) {
        console.error('Error loading dashboard data:', err);
        if (isMountedRef.current) {
          setError('Failed to load dashboard data');
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    isMountedRef.current = true;
    loadDashboardData();
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const getStatsData = () => {
    // Calculate stats from workflows if userStats is not available
    const totalExecutions = workflows.reduce((sum, workflow) => sum + workflow.executions, 0);
    const activeWorkflows = workflows.filter(w => w.status === 'active').length;
    const totalWorkflows = workflows.length;

    // Use actual workflow data if userStats is not available or seems outdated
    const useWorkflowData = !userStats || (userStats.total_workflows === 0 && totalWorkflows > 0);

    if (useWorkflowData) {
      return [
        { 
          label: 'Total Playbooks', 
          value: totalWorkflows.toString(), 
          change: `${activeWorkflows} active`, 
          changeType: 'positive' as const,
          icon: Activity 
        },
        { 
          label: 'Active Playbooks', 
          value: activeWorkflows.toString(), 
          change: `${totalWorkflows - activeWorkflows} inactive`, 
          changeType: 'positive' as const,
          icon: CheckCircle 
        },
        { 
          label: 'Total Executions', 
          value: formatNumber(totalExecutions), 
          change: totalExecutions > 0 ? 'Real execution data' : 'No executions yet', 
          changeType: totalExecutions > 0 ? 'positive' : 'negative' as const,
          icon: Zap 
        },
        { 
          label: 'Avg. per Playbook', 
          value: totalWorkflows > 0 ? Math.round(totalExecutions / totalWorkflows).toString() : '0', 
          change: 'executions per playbook', 
          changeType: 'positive' as const,
          icon: TrendingUp 
        }
      ];
    }

    // Use userStats if available and seems current
    return [
      { 
        label: 'Total Playbooks', 
        value: userStats.total_workflows.toString(), 
        change: `${userStats.active_workflows} active`, 
        changeType: 'positive' as const,
        icon: Activity 
      },
      { 
        label: 'Active Playbooks', 
        value: userStats.active_workflows.toString(), 
        change: `${userStats.total_workflows - userStats.active_workflows} inactive`, 
        changeType: 'positive' as const,
        icon: CheckCircle 
      },
      { 
        label: 'Total Executions', 
        value: formatNumber(userStats.total_executions), 
        change: `${formatNumber(userStats.total_events)} events tracked`, 
        changeType: 'positive' as const,
        icon: Zap 
      },
      { 
        label: 'Success Rate', 
        value: `${userStats.avg_success_rate.toFixed(1)}%`, 
        change: userStats.avg_success_rate >= 90 ? 'Excellent' : userStats.avg_success_rate >= 70 ? 'Good' : 'Needs improvement', 
        changeType: userStats.avg_success_rate >= 90 ? 'positive' : 'negative' as const,
        icon: TrendingUp 
      }
    ];
  };

  const stats = getStatsData();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'timeout': return <Clock className="w-4 h-4 text-yellow-600" />;
      default: return <Pause className="w-4 h-4 text-secondary-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-50';
      case 'error': return 'text-red-600 bg-red-50';
      case 'timeout': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-secondary-600 bg-secondary-50';
    }
  };

  const formatExecutionTime = (timeMs: number | null): string => {
    if (!timeMs) return 'N/A';
    if (timeMs < 1000) return `${timeMs}ms`;
    return `${(timeMs / 1000).toFixed(1)}s`;
  };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-secondary-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary-600" />
          <p className="mt-4 text-secondary-600">Loading dashboard...</p>
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

  return (
    <div className="flex-1 bg-secondary-50">
      <div className="max-w-7xl mx-auto">
        {/* Clean Header */}
        <div className="px-8 py-6 pt-12">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              {/* Page Title and Description */}
              <div>
                <h1 className="text-3xl font-medium text-secondary-900 tracking-tight">Dashboard</h1>
                <p className="text-sm text-secondary-600">Monitor your website personalization performance and visitor engagement</p>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              <button className="flex items-center space-x-2 px-4 py-2 text-secondary-700 bg-white border border-secondary-300 hover:bg-secondary-50 transition-colors font-medium text-sm rounded-lg">
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
              <button className="flex items-center space-x-2 px-4 py-2 text-secondary-700 bg-white border border-secondary-300 hover:bg-secondary-50 transition-colors font-medium text-sm rounded-lg">
                <RefreshCw className="w-4 h-4" />
                <span>Refresh</span>
              </button>
              <button className="flex items-center space-x-2 px-4 py-2 bg-primary-500 text-white hover:bg-primary-600 transition-colors font-medium text-sm rounded-lg">
                <Plus className="w-4 h-4" />
                <span>New Playbook</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-8">
          {/* Stats Grid - Clean design with borders instead of shadows */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {stats.map((stat) => (
              <div key={stat.label} className="bg-white p-6 rounded-lg border border-secondary-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-primary-50 rounded-lg">
                    <stat.icon className="w-6 h-6 text-primary-600" />
                  </div>
                  <span className={`text-sm font-medium ${
                    stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {stat.change}
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-secondary-900 tracking-tight mb-1">{stat.value}</h3>
                <p className="text-sm text-secondary-600">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Recent Executions - Table with border instead of shadow */}
          <div className="bg-white rounded-lg border border-secondary-200">
            <div className="p-6 border-b border-secondary-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-secondary-900 tracking-tight">Recent Personalizations</h2>
                  <p className="text-sm text-secondary-600 mt-1">Latest workflow executions and their performance</p>
                </div>
                <button className="text-primary-600 hover:text-primary-700 text-sm font-medium transition-colors">
                  View All
                </button>
              </div>
            </div>
            
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-secondary-50 text-sm font-medium text-secondary-700 tracking-tight border-b border-secondary-200">
              <div className="col-span-1 flex items-center">Status</div>
              <div className="col-span-4 flex items-center">Workflow</div>
              <div className="col-span-3 flex items-center">Execution Time</div>
              <div className="col-span-2 flex items-center">Duration</div>
              <div className="col-span-2 flex items-center">Actions</div>
            </div>
            
            {/* Table Rows */}
            <div className="divide-y divide-secondary-200">
              {recentExecutions.map((execution) => (
                <div key={execution.id} className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-secondary-50 transition-colors items-center">
                  <div className="col-span-1 flex items-center">
                    <div className={`w-3 h-3 rounded-full ${
                      execution.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                  </div>
                  <div className="col-span-4">
                    <h3 className="font-medium text-secondary-900">Workflow {execution.workflow_id.slice(-8)}</h3>
                    <p className="text-sm text-secondary-600">{execution.page_url || 'Unknown page'}</p>
                  </div>
                  <div className="col-span-3 flex items-center">
                    <span className="text-sm text-secondary-900">{formatTimeAgo(execution.executed_at)}</span>
                  </div>
                  <div className="col-span-2 flex items-center">
                    <span className="text-sm text-secondary-600">{formatExecutionTime(execution.execution_time_ms)}</span>
                  </div>
                  <div className="col-span-2 flex items-center">
                    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(execution.status)}`}>
                      {getStatusIcon(execution.status)}
                      <span className="ml-1 capitalize">{execution.status}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;