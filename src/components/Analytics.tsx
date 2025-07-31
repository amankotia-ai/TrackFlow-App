import React, { useMemo } from 'react';
import { 
  Activity, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  AlertCircle,
  Globe,
  Zap,
  Target,
  BarChart3,
  PieChart,
  Eye,
  MousePointer,
  Timer,
  Users,
  ExternalLink,
  FileText,
  Play,
  Pause,
  Edit,
  XCircle
} from 'lucide-react';
import { Workflow } from '../types/workflow';
import * as Icons from 'lucide-react';

interface AnalyticsProps {
  workflows: Workflow[];
}

interface TriggerStats {
  category: string;
  count: number;
  icon: string;
  percentage: number;
}

interface ActionStats {
  nodeType: string;
  count: number;
  percentage: number;
}

interface URLStats {
  url: string;
  playbookCount: number;
  totalExecutions: number;
  activeCount: number;
  lastActivity: Date | null;
  avgComplexity: number;
}

const Analytics: React.FC<AnalyticsProps> = ({ workflows }) => {
  
  // Calculate analytics metrics from workflow data
  const analytics = useMemo(() => {
    // Basic counts
    const totalPlaybooks = workflows.length;
    const activePlaybooks = workflows.filter(w => w.status === 'active').length;
    const pausedPlaybooks = workflows.filter(w => w.status === 'paused').length;
    const draftPlaybooks = workflows.filter(w => w.status === 'draft').length;
    const errorPlaybooks = workflows.filter(w => w.status === 'error').length;
    
    const totalExecutions = workflows.reduce((sum, w) => sum + w.executions, 0);
    const avgExecutionsPerPlaybook = totalPlaybooks > 0 ? Math.round(totalExecutions / totalPlaybooks) : 0;

    // URL-based grouping
    const urlStats: URLStats[] = [];
    const urlGroups = workflows.reduce((acc, workflow) => {
      const url = workflow.targetUrl || 'No Target URL';
      if (!acc[url]) {
        acc[url] = [];
      }
      acc[url].push(workflow);
      return acc;
    }, {} as Record<string, Workflow[]>);
    
    Object.entries(urlGroups).forEach(([url, urlWorkflows]) => {
      const totalExecutions = urlWorkflows.reduce((sum, w) => sum + w.executions, 0);
      const activeCount = urlWorkflows.filter(w => w.status === 'active').length;
      const avgComplexity = urlWorkflows.length > 0 
        ? urlWorkflows.reduce((sum, w) => sum + w.nodes.length, 0) / urlWorkflows.length
        : 0;
      
      // Find most recent activity
      const lastActivity = urlWorkflows
        .filter(w => w.lastRun)
        .map(w => w.lastRun!)
        .sort((a, b) => b.getTime() - a.getTime())[0] || null;
      
      urlStats.push({
        url,
        playbookCount: urlWorkflows.length,
        totalExecutions,
        activeCount,
        lastActivity,
        avgComplexity: Math.round(avgComplexity)
      });
    });
    
    urlStats.sort((a, b) => b.totalExecutions - a.totalExecutions);
    
    // Trigger analysis
    const triggerCounts: Record<string, { count: number; icon: string }> = {};
    workflows.forEach(workflow => {
      workflow.nodes.filter(node => node.type === 'trigger').forEach(trigger => {
        if (!triggerCounts[trigger.category]) {
          triggerCounts[trigger.category] = { count: 0, icon: trigger.icon };
        }
        triggerCounts[trigger.category].count++;
      });
    });
    
    const totalTriggers = Object.values(triggerCounts).reduce((sum, t) => sum + t.count, 0);
    const triggerStats: TriggerStats[] = Object.entries(triggerCounts).map(([category, data]) => ({
      category,
      count: data.count,
      icon: data.icon,
      percentage: totalTriggers > 0 ? Math.round((data.count / totalTriggers) * 100) : 0
    })).sort((a, b) => b.count - a.count);
    
    // Action analysis
    const actionCounts: Record<string, number> = {};
    workflows.forEach(workflow => {
      workflow.nodes.filter(node => node.type === 'action').forEach(action => {
        if (!actionCounts[action.name]) {
          actionCounts[action.name] = 0;
        }
        actionCounts[action.name]++;
      });
    });
    
    const totalActions = Object.values(actionCounts).reduce((sum, count) => sum + count, 0);
    const actionStats: ActionStats[] = Object.entries(actionCounts).map(([nodeType, count]) => ({
      nodeType,
      count,
      percentage: totalActions > 0 ? Math.round((count / totalActions) * 100) : 0
    })).sort((a, b) => b.count - a.count);
    
    // Age analysis
    const now = new Date();
    const ageAnalysis = {
      lastWeek: workflows.filter(w => (now.getTime() - w.createdAt.getTime()) <= 7 * 24 * 60 * 60 * 1000).length,
      lastMonth: workflows.filter(w => (now.getTime() - w.createdAt.getTime()) <= 30 * 24 * 60 * 60 * 1000).length,
      older: workflows.filter(w => (now.getTime() - w.createdAt.getTime()) > 30 * 24 * 60 * 60 * 1000).length
    };

    // Complexity analysis
    const totalNodes = workflows.reduce((sum, w) => sum + w.nodes.length, 0);
    const avgComplexity = totalPlaybooks > 0 ? Math.round(totalNodes / totalPlaybooks) : 0;
    const simplePlaybooks = workflows.filter(w => w.nodes.length <= 3).length;
    const complexPlaybooks = workflows.filter(w => w.nodes.length > 7).length;
    
    return {
      totalPlaybooks,
      activePlaybooks,
      pausedPlaybooks,
      draftPlaybooks,
      errorPlaybooks,
      totalExecutions,
      avgExecutionsPerPlaybook,
      urlStats,
      triggerStats,
      actionStats,
      ageAnalysis,
      avgComplexity,
      simplePlaybooks,
      complexPlaybooks,
      totalNodes,
      totalTriggers,
      totalActions,
      uniqueUrls: urlStats.length
    };
  }, [workflows]);

  // Helper function to get icon component
  const getIconComponent = (iconName: string, className: string = "w-4 h-4") => {
    const IconComponent = Icons[iconName as keyof typeof Icons] as React.ComponentType<{ className?: string }>;
    if (IconComponent) {
      return <IconComponent className={className} />;
      }
    return <Activity className={className} />;
  };

  // Helper function to format time ago
  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  // Status distribution for pie chart
  const statusDistribution = [
    { status: 'active', count: analytics.activePlaybooks, color: 'bg-green-500' },
    { status: 'paused', count: analytics.pausedPlaybooks, color: 'bg-yellow-500' },
    { status: 'draft', count: analytics.draftPlaybooks, color: 'bg-gray-500' },
    { status: 'error', count: analytics.errorPlaybooks, color: 'bg-red-500' }
  ].filter(item => item.count > 0);

  return (
    <div className="flex-1 bg-secondary-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="px-8 py-6 pt-12">
          <div className="flex items-center justify-between">
            <div className="flex-1">
            <div>
                <h1 className="text-3xl font-medium text-secondary-900 tracking-tight">Analytics Dashboard</h1>
                <p className="text-sm text-secondary-600">Operational insights and performance metrics for your playbooks</p>
            </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-8 pb-8">
                    {/* Account Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-6 rounded-lg border border-secondary-200">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-primary-50 rounded-lg">
                  <Activity className="w-6 h-6 text-primary-600" />
                </div>
                <span className="text-sm font-medium text-green-600">
                  {analytics.activePlaybooks} active
                </span>
              </div>
              <h3 className="text-2xl font-bold text-secondary-900 tracking-tight mb-1">{analytics.totalPlaybooks}</h3>
              <p className="text-sm text-secondary-600">Total Playbooks</p>
            </div>

            <div className="bg-white p-6 rounded-lg border border-secondary-200">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-primary-50 rounded-lg">
                  <Target className="w-6 h-6 text-primary-600" />
                </div>
                <span className="text-sm font-medium text-secondary-500">
                  {analytics.avgExecutionsPerPlaybook} avg
                </span>
              </div>
              <h3 className="text-2xl font-bold text-secondary-900 tracking-tight mb-1">{analytics.totalExecutions.toLocaleString()}</h3>
              <p className="text-sm text-secondary-600">Total Executions</p>
            </div>

            <div className="bg-white p-6 rounded-lg border border-secondary-200">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-primary-50 rounded-lg">
                  <Globe className="w-6 h-6 text-primary-600" />
                </div>
                <span className="text-sm font-medium text-secondary-500">
                  coverage
                </span>
              </div>
              <h3 className="text-2xl font-bold text-secondary-900 tracking-tight mb-1">{analytics.uniqueUrls}</h3>
              <p className="text-sm text-secondary-600">Target URLs</p>
            </div>

            <div className="bg-white p-6 rounded-lg border border-secondary-200">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-primary-50 rounded-lg">
                  <BarChart3 className="w-6 h-6 text-primary-600" />
                </div>
                <span className="text-sm font-medium text-secondary-500">
                  nodes/playbook
                </span>
              </div>
              <h3 className="text-2xl font-bold text-secondary-900 tracking-tight mb-1">{analytics.avgComplexity}</h3>
              <p className="text-sm text-secondary-600">Avg Complexity</p>
            </div>
          </div>

          {/* URL Performance */}
                  <div className="bg-white rounded-lg border border-secondary-200 overflow-hidden mb-8">
                    <div className="px-6 py-4 border-b border-secondary-200">
                      <div className="flex items-center justify-between">
                        <div>
                  <h3 className="text-lg font-semibold text-secondary-900">URL Performance</h3>
                  <p className="text-sm text-secondary-600 mt-1">Playbook performance grouped by target URLs</p>
                        </div>
                <span className="text-sm text-secondary-500">{analytics.urlStats.length} URLs</span>
                      </div>
                    </div>
                    
            {analytics.urlStats.length > 0 ? (
                      <div className="divide-y divide-secondary-200">
                {analytics.urlStats.map((urlStat, index) => (
                          <div key={index} className="p-6 hover:bg-secondary-50">
                    <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-2">
                                  <Globe className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                  <div>
                                    <h4 className="text-sm font-medium text-secondary-900">
                              {urlStat.url}
                                    </h4>
                                    <p className="text-xs text-secondary-500">
                              {urlStat.playbookCount} playbook{urlStat.playbookCount !== 1 ? 's' : ''} • 
                              {urlStat.activeCount} active • 
                              Avg {urlStat.avgComplexity} nodes
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-medium text-secondary-900">
                          {urlStat.totalExecutions.toLocaleString()} executions
                                </div>
                        {urlStat.lastActivity && (
                                <div className="text-xs text-secondary-500">
                            Last: {formatTimeAgo(urlStat.lastActivity)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                                 ) : (
               <div className="text-center py-16">
                 <div className="p-4 bg-secondary-100 rounded-lg w-fit mx-auto mb-4">
                   <Globe className="w-8 h-8 text-secondary-400" />
                 </div>
                 <h4 className="text-lg font-medium text-secondary-900 mb-2">No Target URLs</h4>
                 <p className="text-secondary-600 max-w-sm mx-auto">Configure target URLs for your playbooks to see URL-based performance analytics.</p>
               </div>
             )}
                  </div>

          {/* Analysis Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                         {/* Trigger Analysis */}
             <div className="bg-white rounded-lg border border-secondary-200 p-6">
               <h3 className="text-lg font-semibold text-secondary-900 mb-4 flex items-center">
                 <Zap className="w-5 h-5 mr-2" />
                 Trigger Categories
               </h3>
               {analytics.triggerStats.length > 0 ? (
                 <div className="space-y-3">
                   {analytics.triggerStats.map((trigger, index) => (
                     <div key={index} className="flex items-center justify-between p-3 border border-secondary-200 rounded-lg hover:bg-secondary-50 transition-colors">
                       <div className="flex items-center">
                         <div className="p-2 bg-primary-50 rounded-lg mr-3">
                           {getIconComponent(trigger.icon, "w-4 h-4 text-primary-600")}
                         </div>
                         <span className="text-sm font-medium text-secondary-900">{trigger.category}</span>
                       </div>
                       <div className="flex items-center space-x-2">
                         <span className="text-lg font-bold text-secondary-900">{trigger.count}</span>
                         <span className="text-xs text-secondary-500 bg-secondary-100 px-2 py-1 rounded-full">
                           {trigger.percentage}%
                         </span>
                       </div>
                     </div>
                   ))}
                 </div>
               ) : (
                 <div className="text-center py-8">
                   <div className="p-3 bg-secondary-100 rounded-lg w-fit mx-auto mb-3">
                     <Zap className="w-6 h-6 text-secondary-400" />
                   </div>
                   <p className="text-secondary-500">No triggers configured yet</p>
                 </div>
               )}
             </div>

             {/* Action Analysis */}
             <div className="bg-white rounded-lg border border-secondary-200 p-6">
               <h3 className="text-lg font-semibold text-secondary-900 mb-4 flex items-center">
                 <MousePointer className="w-5 h-5 mr-2" />
                 Action Categories
               </h3>
               {analytics.actionStats.length > 0 ? (
                 <div className="space-y-3">
                   {analytics.actionStats.map((action, index) => (
                     <div key={index} className="flex items-center justify-between p-3 border border-secondary-200 rounded-lg hover:bg-secondary-50 transition-colors">
                       <div className="flex items-center">
                         <div className="p-2 bg-primary-50 rounded-lg mr-3">
                           <Target className="w-4 h-4 text-primary-600" />
                         </div>
                         <span className="text-sm font-medium text-secondary-900">{action.nodeType}</span>
                       </div>
                       <div className="flex items-center space-x-2">
                         <span className="text-lg font-bold text-secondary-900">{action.count}</span>
                         <span className="text-xs text-secondary-500 bg-secondary-100 px-2 py-1 rounded-full">
                           {action.percentage}%
                         </span>
                       </div>
                     </div>
                   ))}
                 </div>
               ) : (
                 <div className="text-center py-8">
                   <div className="p-3 bg-secondary-100 rounded-lg w-fit mx-auto mb-3">
                     <MousePointer className="w-6 h-6 text-secondary-400" />
                   </div>
                   <p className="text-secondary-500">No actions configured yet</p>
                 </div>
               )}
             </div>
                  </div>
                  
          {/* Status Distribution & Lifecycle Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                         {/* Status Distribution */}
             <div className="bg-white rounded-lg border border-secondary-200 p-6">
               <h3 className="text-lg font-semibold text-secondary-900 mb-4 flex items-center">
                 <PieChart className="w-5 h-5 mr-2" />
                 Playbook Status
               </h3>
               {statusDistribution.length > 0 ? (
                 <div className="space-y-3">
                   {statusDistribution.map((item, index) => (
                     <div key={index} className="flex items-center justify-between p-3 border border-secondary-200 rounded-lg hover:bg-secondary-50 transition-colors">
                       <div className="flex items-center">
                         <div className={`w-4 h-4 rounded-full ${item.color} mr-3`}></div>
                         <span className="text-sm font-medium text-secondary-900 capitalize">{item.status}</span>
                       </div>
                       <div className="flex items-center space-x-2">
                         <span className="text-lg font-bold text-secondary-900">{item.count}</span>
                         <span className="text-xs text-secondary-500 bg-secondary-100 px-2 py-1 rounded-full">
                           {Math.round((item.count / analytics.totalPlaybooks) * 100)}%
                         </span>
                       </div>
                     </div>
                   ))}
                 </div>
               ) : (
                 <div className="text-center py-8">
                   <div className="p-3 bg-secondary-100 rounded-lg w-fit mx-auto mb-3">
                     <PieChart className="w-6 h-6 text-secondary-400" />
                   </div>
                   <p className="text-secondary-500">No playbooks created yet</p>
                 </div>
               )}
             </div>

                         {/* Lifecycle Analysis */}
             <div className="bg-white rounded-lg border border-secondary-200 p-6">
               <h3 className="text-lg font-semibold text-secondary-900 mb-4 flex items-center">
                 <Clock className="w-5 h-5 mr-2" />
                 Creation Timeline
               </h3>
               <div className="space-y-3">
                 <div className="flex items-center justify-between p-4 border border-secondary-200 rounded-lg hover:bg-secondary-50 transition-colors">
                   <div className="flex items-center">
                     <div className="p-2 bg-primary-50 rounded-lg mr-3">
                       <Clock className="w-4 h-4 text-primary-600" />
                     </div>
                     <span className="text-sm font-medium text-secondary-900">Last 7 Days</span>
                   </div>
                   <span className="text-lg font-bold text-secondary-900">{analytics.ageAnalysis.lastWeek}</span>
                 </div>
                 
                 <div className="flex items-center justify-between p-4 border border-secondary-200 rounded-lg hover:bg-secondary-50 transition-colors">
                   <div className="flex items-center">
                     <div className="p-2 bg-primary-50 rounded-lg mr-3">
                       <Timer className="w-4 h-4 text-primary-600" />
                     </div>
                     <span className="text-sm font-medium text-secondary-900">Last 30 Days</span>
                   </div>
                   <span className="text-lg font-bold text-secondary-900">{analytics.ageAnalysis.lastMonth}</span>
                 </div>
                 
                 <div className="flex items-center justify-between p-4 border border-secondary-200 rounded-lg hover:bg-secondary-50 transition-colors">
                   <div className="flex items-center">
                     <div className="p-2 bg-primary-50 rounded-lg mr-3">
                       <Users className="w-4 h-4 text-primary-600" />
                     </div>
                     <span className="text-sm font-medium text-secondary-900">Older</span>
                   </div>
                   <span className="text-lg font-bold text-secondary-900">{analytics.ageAnalysis.older}</span>
                 </div>
               </div>
             </div>
                                </div>
                                
          {/* Playbook Performance Table */}
                <div className="bg-white rounded-lg border border-secondary-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-secondary-200">
              <h3 className="text-lg font-semibold text-secondary-900">Individual Playbook Performance</h3>
              <p className="text-sm text-secondary-600 mt-1">Detailed breakdown of each playbook's operational metrics</p>
                  </div>
                  
            {workflows.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-secondary-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                        Playbook
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                        Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                        Target URL
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                        Executions
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                        Complexity
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                        Last Run
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                        Age
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-secondary-200">
                    {workflows
                      .sort((a, b) => b.executions - a.executions)
                      .map((workflow) => {
                        const triggerNode = workflow.nodes.find(node => node.type === 'trigger');
                            return (
                          <tr key={workflow.id} className="hover:bg-secondary-50">
                                                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center mr-3 shadow-sm">
                                  {triggerNode ? getIconComponent(triggerNode.icon, "w-5 h-5 text-white") : <Activity className="w-5 h-5 text-white" />}
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-secondary-900">{workflow.name}</div>
                                  <div className="text-xs text-secondary-500 truncate max-w-40">{workflow.description}</div>
                                </div>
                              </div>
                            </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                workflow.status === 'active' ? 'bg-green-100 text-green-800' :
                                workflow.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                                workflow.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {workflow.status}
                              </span>
                                </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-900">
                                  <div className="flex items-center">
                                <ExternalLink className="w-3 h-3 text-secondary-400 mr-1" />
                                {workflow.targetUrl || 'Not set'}
                                  </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-900">
                              {workflow.executions.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-900">
                              {workflow.nodes.length} nodes
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-600">
                              {workflow.lastRun ? formatTimeAgo(workflow.lastRun) : 'Never'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-600">
                              {formatTimeAgo(workflow.createdAt)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                         ) : (
               <div className="text-center py-16">
                 <div className="p-4 bg-secondary-100 rounded-lg w-fit mx-auto mb-4">
                   <FileText className="w-8 h-8 text-secondary-400" />
                 </div>
                 <h4 className="text-lg font-medium text-secondary-900 mb-2">No Playbooks Found</h4>
                 <p className="text-secondary-600 max-w-sm mx-auto">Create your first playbook to see detailed analytics and performance metrics here.</p>
               </div>
             )}
                          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics; 