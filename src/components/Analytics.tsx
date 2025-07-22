import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  ArrowUp, 
  ArrowDown, 
  Download, 
  RefreshCw,
  XCircle,
  Pause,
  Globe,
  Monitor,
  Smartphone,
  ExternalLink,
  Eye,
  Users,
  AlertCircle,
  Database,
  BarChart3,
  Target,
  Timer,
  Zap,
  MousePointer,
  Settings,
  Play
} from 'lucide-react';
import { Workflow } from '../types/workflow';
import { apiClient } from '../lib/apiClient';
import { AnalyticsService, ComprehensiveAnalytics, WorkflowMapping } from '../services/analyticsService';

interface AnalyticsProps {
  workflows: Workflow[];
}

interface WorkflowExecution {
  id: string;
  workflow_id: string;
  user_id: string | null;
  status: 'success' | 'error' | 'timeout';
  execution_time_ms: number | null;
  error_message: string | null;
  page_url: string | null;
  user_agent: string | null;
  session_id: string | null;
  executed_at: string;
  actions?: ActionEvent[];
}

interface ActionEvent {
  id: string;
  workflow_id: string;
  workflow_execution_id: string | null;
  session_id: string;
  event_type: string;
  element_selector: string | null;
  element_text: string | null;
  page_url: string | null;
  device_type: string | null;
  event_data: {
    action_name?: string;
    action_config?: any;
    execution_time_ms?: number;
  };
  created_at: string;
}

interface UserInteractionEvent {
  id: string;
  workflow_id: string;
  session_id: string;
  event_type: string;
  element_selector: string | null;
  element_text: string | null;
  element_attributes: any;
  page_url: string | null;
  page_title: string | null;
  referrer_url: string | null;
  device_type: string | null;
  browser_info: any;
  viewport_size: any;
  screen_size: any;
  event_data: any;
  created_at: string;
}

interface UserStats {
  total_workflows: number;
  active_workflows: number;
  total_executions: number;
  total_events: number;
  avg_success_rate: number;
}

const Analytics: React.FC<AnalyticsProps> = ({ workflows }) => {
  const [timeRange, setTimeRange] = useState('7d');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'executions' | 'actions' | 'interactions' | 'comprehensive'>('overview');
  
  // Real data from database
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [workflowExecutions, setWorkflowExecutions] = useState<WorkflowExecution[]>([]);
  const [actionEvents, setActionEvents] = useState<ActionEvent[]>([]);
  const [userInteractions, setUserInteractions] = useState<UserInteractionEvent[]>([]);
  const [detailedExecutions, setDetailedExecutions] = useState<WorkflowExecution[]>([]);
  const [comprehensiveAnalytics, setComprehensiveAnalytics] = useState<ComprehensiveAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load workflow executions
  const loadWorkflowExecutions = async () => {
    try {
      console.log('📊 Loading workflow executions...');
      const response = await apiClient.getWorkflowExecutions(undefined, 100);
      if (response.success && response.data) {
        console.log(`✅ Loaded ${response.data.length} workflow executions`);
        setWorkflowExecutions(response.data);
      } else {
        console.error('❌ Failed to load executions:', response.error);
      }
    } catch (error) {
      console.error('❌ Error loading executions:', error);
    }
  };

  // Load action tracking data
  const loadActionTrackingData = async () => {
    try {
      console.log('⚡ Loading action tracking data...');
      const days = timeRange === '1d' ? 1 : timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const response = await apiClient.getActionTrackingData(undefined, days);
      if (response.success && response.data) {
        console.log(`✅ Loaded ${response.data.length} action events`);
        setActionEvents(response.data);
      } else {
        console.error('❌ Failed to load action tracking data:', response.error);
      }
    } catch (error) {
      console.error('❌ Error loading action tracking data:', error);
    }
  };

  // Load user interaction events
  const loadUserInteractionEvents = async () => {
    try {
      console.log('👤 Loading user interaction events...');
      const days = timeRange === '1d' ? 1 : timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const response = await apiClient.getUserInteractionEvents(undefined, days);
      if (response.success && response.data) {
        console.log(`✅ Loaded ${response.data.length} user interactions`);
        setUserInteractions(response.data);
      } else {
        console.error('❌ Failed to load user interaction events:', response.error);
      }
    } catch (error) {
      console.error('❌ Error loading user interaction events:', error);
    }
  };

  // Load detailed executions with actions
  const loadDetailedExecutions = async () => {
    try {
      console.log('🔍 Loading detailed executions...');
      const days = timeRange === '1d' ? 1 : timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const response = await apiClient.getDetailedWorkflowExecutions(undefined, days);
      if (response.success && response.data) {
        console.log(`✅ Loaded ${response.data.length} detailed executions`);
        setDetailedExecutions(response.data);
      } else {
        console.error('❌ Failed to load detailed executions:', response.error);
      }
    } catch (error) {
      console.error('❌ Error loading detailed executions:', error);
    }
  };

  // Load comprehensive analytics
  const loadComprehensiveAnalytics = async () => {
    try {
      console.log('📊 Loading comprehensive analytics...');
      const response = await AnalyticsService.getComprehensiveAnalytics(30);
      if (response.success && response.data) {
        console.log('✅ Loaded comprehensive analytics:', response.data);
        setComprehensiveAnalytics(response.data);
      } else {
        console.error('❌ Failed to load comprehensive analytics:', response.error);
      }
    } catch (error) {
      console.error('❌ Error loading comprehensive analytics:', error);
    }
  };

  // Load all data
  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Starting to load all analytics data...');
      
      await Promise.all([
        loadWorkflowExecutions(),
        loadActionTrackingData(),
        loadUserInteractionEvents(),
        loadDetailedExecutions(),
        loadComprehensiveAnalytics()
      ]);
      
      console.log('✅ Finished loading all analytics data');
    } catch (error) {
      console.error('❌ Error loading analytics data:', error);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  // Load data on mount and when timeRange changes
  useEffect(() => {
    loadAllData();
  }, [timeRange]);

  // Helper functions
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'timeout':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <Activity className="w-4 h-4 text-blue-500" />;
    }
  };

  const getEventTypeIcon = (eventType: string) => {
    switch (eventType) {
      case 'click':
        return <MousePointer className="w-4 h-4 text-blue-500" />;
      case 'form_submit':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'page_view':
        return <Eye className="w-4 h-4 text-purple-500" />;
      case 'scroll':
        return <ArrowDown className="w-4 h-4 text-gray-500" />;
      case 'hover':
        return <MousePointer className="w-4 h-4 text-orange-500" />;
      case 'action_executed':
        return <Zap className="w-4 h-4 text-yellow-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getDeviceIcon = (deviceType: string | null) => {
    if (!deviceType) return <Globe className="w-4 h-4" />;
    switch (deviceType.toLowerCase()) {
      case 'mobile':
        return <Smartphone className="w-4 h-4" />;
      case 'desktop':
        return <Monitor className="w-4 h-4" />;
      default:
        return <Globe className="w-4 h-4" />;
    }
  };

  const formatUrl = (url: string | null, maxLength: number = 50) => {
    if (!url) return 'Unknown';
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname + urlObj.search;
      if (path.length > maxLength) {
        return path.substring(0, maxLength) + '...';
      }
      return path;
    } catch {
      return url.length > maxLength ? url.substring(0, maxLength) + '...' : url;
    }
  };

  const extractDeviceFromUserAgent = (userAgent: string | null): string => {
    if (!userAgent) return 'unknown';
    if (userAgent.includes('Mobile') || userAgent.includes('Android')) return 'mobile';
    if (userAgent.includes('iPad') || userAgent.includes('Tablet')) return 'tablet';
    return 'desktop';
  };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
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

  // Calculate analytics metrics
  const analytics = React.useMemo(() => {
    // Group executions by workflow
    const executionsByWorkflow = workflowExecutions.reduce((acc, exec) => {
      if (!acc[exec.workflow_id]) {
        acc[exec.workflow_id] = [];
      }
      acc[exec.workflow_id].push(exec);
      return acc;
    }, {} as Record<string, WorkflowExecution[]>);

    // Group action events by workflow
    const actionsByWorkflow = actionEvents.reduce((acc, action) => {
      if (!acc[action.workflow_id]) {
        acc[action.workflow_id] = [];
      }
      acc[action.workflow_id].push(action);
      return acc;
    }, {} as Record<string, ActionEvent[]>);

    // Group interactions by workflow
    const interactionsByWorkflow = userInteractions.reduce((acc, interaction) => {
      if (!acc[interaction.workflow_id]) {
        acc[interaction.workflow_id] = [];
      }
      acc[interaction.workflow_id].push(interaction);
      return acc;
    }, {} as Record<string, UserInteractionEvent[]>);

    // Calculate device breakdown from executions
    const deviceBreakdown = workflowExecutions.reduce((acc, exec) => {
      const device = extractDeviceFromUserAgent(exec.user_agent);
      acc[device] = (acc[device] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Get unique sessions
    const uniqueSessions = new Set([
      ...workflowExecutions.map(exec => exec.session_id).filter(Boolean),
      ...userInteractions.map(interaction => interaction.session_id).filter(Boolean)
    ]).size;

    // Get unique pages
    const uniquePages = new Set([
      ...workflowExecutions.map(exec => exec.page_url).filter(Boolean),
      ...userInteractions.map(interaction => interaction.page_url).filter(Boolean)
    ]).size;

    // Calculate deployed websites based on target URLs and actual execution data
    const deployedWebsitesMap = new Map();
    
    workflows.forEach(workflow => {
      if (!workflow.isActive) return;
      
      const targetUrl = workflow.targetUrl || '*';
      const workflowExecutions = executionsByWorkflow[workflow.id] || [];
      const workflowActions = actionsByWorkflow[workflow.id] || [];
      const workflowInteractions = interactionsByWorkflow[workflow.id] || [];
      
      // Get unique pages from execution data
      const pagesFromExecutions = workflowExecutions.map(exec => exec.page_url).filter(Boolean);
      const pagesFromEvents = [
        ...workflowActions.map(action => action.page_url).filter(Boolean),
        ...workflowInteractions.map(interaction => interaction.page_url).filter(Boolean)
      ];
      const allPages = [...new Set([...pagesFromExecutions, ...pagesFromEvents])];
      
      // Group by target URL (deployment site)
      if (!deployedWebsitesMap.has(targetUrl)) {
        deployedWebsitesMap.set(targetUrl, {
          targetUrl,
          workflows: [],
          workflowNames: [],
          totalExecutions: 0,
          successfulExecutions: 0,
          uniquePages: 0,
          recentPages: [],
          lastActivity: null
        });
      }
      
      const site = deployedWebsitesMap.get(targetUrl);
      site.workflows.push(workflow);
      site.workflowNames.push(workflow.name);
      site.totalExecutions += workflowExecutions.length;
      site.successfulExecutions += workflowExecutions.filter(exec => exec.status === 'success').length;
      
      // Add unique pages for this workflow to the site
      allPages.forEach(page => {
        if (!site.recentPages.includes(page)) {
          site.recentPages.push(page);
        }
      });
      
      // Update last activity
      const latestExecution = workflowExecutions
        .sort((a, b) => new Date(b.executed_at).getTime() - new Date(a.executed_at).getTime())[0];
      if (latestExecution && (!site.lastActivity || new Date(latestExecution.executed_at) > new Date(site.lastActivity))) {
        site.lastActivity = latestExecution.executed_at;
      }
    });
    
    // Convert map to array and calculate final metrics
    const deployedWebsites = Array.from(deployedWebsitesMap.values()).map(site => ({
      ...site,
      uniquePages: site.recentPages.length,
      successRate: site.totalExecutions > 0 ? Math.round((site.successfulExecutions / site.totalExecutions) * 100) : 0,
      recentPages: site.recentPages.slice(0, 10) // Limit to recent 10 pages
    })).filter(site => site.workflows.length > 0); // Only include sites with workflows

    // Calculate real user stats from loaded data
    const realUserStats = {
      total_workflows: workflows.length,
      active_workflows: workflows.filter(w => w.status === 'active').length,
      total_executions: workflowExecutions.length,
      total_events: actionEvents.length + userInteractions.length,
      avg_success_rate: workflowExecutions.length > 0 
        ? (workflowExecutions.filter(e => e.status === 'success').length / workflowExecutions.length) * 100 
        : 0,
    };

    return {
      executionsByWorkflow,
      actionsByWorkflow,
      interactionsByWorkflow,
      deviceBreakdown,
      uniqueSessions,
      uniquePages,
      totalExecutions: workflowExecutions.length,
      totalActions: actionEvents.length,
      totalInteractions: userInteractions.length,
      successfulExecutions: workflowExecutions.filter(e => e.status === 'success').length,
      failedExecutions: workflowExecutions.filter(e => e.status === 'error').length,
      deployedWebsites, // Add deployed websites to analytics
      realUserStats // Add real stats calculated from actual data
    };
  }, [workflowExecutions, actionEvents, userInteractions, workflows]);

  return (
    <div className="min-h-screen bg-secondary-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white border-b border-secondary-200 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-secondary-900">Analytics Dashboard</h1>
              <p className="text-sm text-secondary-600 mt-1">
                Real-time tracking data from your workflows
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Time Range Selector */}
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-3 py-2 text-sm border border-secondary-300 rounded-lg bg-white text-secondary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="1d">Last 24 hours</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
              
              <button 
                onClick={loadAllData}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 text-secondary-700 bg-white border border-secondary-300 hover:bg-secondary-50 transition-colors font-medium text-sm rounded-lg disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <XCircle className="w-5 h-5 text-red-600 mr-2" />
                <span className="text-red-800 font-medium">Error Loading Data</span>
              </div>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="flex space-x-1 mb-6 bg-secondary-100 p-1 rounded-lg w-fit">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'overview'
                  ? 'bg-white text-secondary-900 shadow-sm'
                  : 'text-secondary-600 hover:text-secondary-900'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('executions')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'executions'
                  ? 'bg-white text-secondary-900 shadow-sm'
                  : 'text-secondary-600 hover:text-secondary-900'
              }`}
            >
              Executions
            </button>
            <button
              onClick={() => setActiveTab('actions')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'actions'
                  ? 'bg-white text-secondary-900 shadow-sm'
                  : 'text-secondary-600 hover:text-secondary-900'
              }`}
            >
              Action Tracking
            </button>
            <button
              onClick={() => setActiveTab('interactions')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'interactions'
                  ? 'bg-white text-secondary-900 shadow-sm'
                  : 'text-secondary-600 hover:text-secondary-900'
              }`}
            >
              User Interactions
            </button>
            <button
              onClick={() => setActiveTab('comprehensive')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'comprehensive'
                  ? 'bg-white text-secondary-900 shadow-sm'
                  : 'text-secondary-600 hover:text-secondary-900'
              }`}
            >
              Comprehensive
            </button>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-primary-600" />
              <span className="ml-3 text-secondary-600">Loading analytics data...</span>
            </div>
          )}

          {!loading && (
            <>
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <>
                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-lg border border-secondary-200 p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-secondary-600">Total Workflows</p>
                          <p className="text-2xl font-bold text-secondary-900">{analytics.realUserStats.total_workflows || 0}</p>
                          <p className="text-xs text-secondary-500 mt-1">
                            {analytics.realUserStats.active_workflows || 0} active
                          </p>
                        </div>
                        <div className="p-3 bg-blue-100 rounded-lg">
                          <Activity className="w-6 h-6 text-blue-600" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg border border-secondary-200 p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-secondary-600">Total Executions</p>
                          <p className="text-2xl font-bold text-secondary-900">{analytics.totalExecutions.toLocaleString()}</p>
                          <p className="text-xs text-green-600 mt-1">
                            {analytics.successfulExecutions} successful
                          </p>
                        </div>
                        <div className="p-3 bg-green-100 rounded-lg">
                          <Target className="w-6 h-6 text-green-600" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg border border-secondary-200 p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-secondary-600">Action Executions</p>
                          <p className="text-2xl font-bold text-secondary-900">{analytics.totalActions.toLocaleString()}</p>
                          <p className="text-xs text-secondary-500 mt-1">
                            Individual actions tracked
                          </p>
                        </div>
                        <div className="p-3 bg-purple-100 rounded-lg">
                          <Zap className="w-6 h-6 text-purple-600" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg border border-secondary-200 p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-secondary-600">User Interactions</p>
                          <p className="text-2xl font-bold text-secondary-900">{analytics.totalInteractions.toLocaleString()}</p>
                          <p className="text-xs text-secondary-500 mt-1">
                            {analytics.uniqueSessions} unique sessions
                          </p>
                        </div>
                        <div className="p-3 bg-indigo-100 rounded-lg">
                          <MousePointer className="w-6 h-6 text-indigo-600" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Deployed Websites Section */}
                  <div className="bg-white rounded-lg border border-secondary-200 overflow-hidden mb-8">
                    <div className="px-6 py-4 border-b border-secondary-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-secondary-900 flex items-center">
                            <Globe className="w-5 h-5 mr-2" />
                            Deployed Websites
                          </h3>
                          <p className="text-sm text-secondary-600 mt-1">
                            Websites where your workflows are currently active and tracking data
                          </p>
                        </div>
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                          {analytics.deployedWebsites?.length || 0} sites
                        </span>
                      </div>
                    </div>
                    
                    {analytics.deployedWebsites && analytics.deployedWebsites.length > 0 ? (
                      <div className="divide-y divide-secondary-200">
                        {analytics.deployedWebsites.map((site, index) => (
                          <div key={index} className="p-6 hover:bg-secondary-50">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-2">
                                  <Globe className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                  <div>
                                    <h4 className="text-sm font-medium text-secondary-900">
                                      {site.targetUrl === '*' ? 'Universal Deployment' : site.targetUrl}
                                    </h4>
                                    <p className="text-xs text-secondary-500">
                                      {site.workflowNames.join(', ')} • {site.totalExecutions} executions
                                    </p>
                                  </div>
                                </div>
                                <div className="ml-7">
                                  <p className="text-xs text-secondary-600 mb-2">
                                    <span className="font-medium">{site.workflows.length} workflows</span> deployed
                                    {site.uniquePages > 0 && (
                                      <> • <span className="font-medium">{site.uniquePages}</span> pages tracked</>
                                    )}
                                  </p>
                                  {site.recentPages.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                      {site.recentPages.slice(0, 3).map((page: string, pageIndex: number) => (
                                        <span 
                                          key={pageIndex} 
                                          className="inline-flex items-center px-2 py-1 bg-secondary-100 text-secondary-700 text-xs rounded"
                                        >
                                          <ExternalLink className="w-3 h-3 mr-1" />
                                          {page.length > 40 ? page.substring(0, 40) + '...' : page}
                                        </span>
                                      ))}
                                      {site.recentPages.length > 3 && (
                                        <span className="inline-flex items-center px-2 py-1 bg-secondary-100 text-secondary-600 text-xs rounded">
                                          +{site.recentPages.length - 3} more
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-medium text-secondary-900">
                                  {site.totalExecutions} executions
                                </div>
                                <div className="text-xs text-secondary-500">
                                  {site.successRate}% success rate
                                </div>
                                {site.lastActivity && (
                                  <div className="text-xs text-secondary-500 mt-1">
                                    Last: {formatTimeAgo(site.lastActivity)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Globe className="w-12 h-12 text-secondary-300 mx-auto mb-4" />
                        <h4 className="text-lg font-medium text-secondary-900 mb-2">No Deployed Websites</h4>
                        <p className="text-secondary-600 mb-4">
                          Your workflows haven't been deployed to any websites yet.
                        </p>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
                          <h5 className="text-sm font-medium text-blue-900 mb-2">How to deploy workflows:</h5>
                          <ol className="text-xs text-blue-800 space-y-1 text-left">
                            <li>1. Create and activate a workflow in the dashboard</li>
                            <li>2. Set the target URL (e.g., "*", "/pricing", "example.com")</li>
                            <li>3. Add the integration script to your website</li>
                            <li>4. Publish your site and visit the pages</li>
                          </ol>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Performance Overview */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Device Breakdown */}
                    <div className="bg-white rounded-lg border border-secondary-200 p-6">
                      <h3 className="text-lg font-semibold text-secondary-900 mb-4 flex items-center">
                        <Monitor className="w-5 h-5 mr-2" />
                        Device Breakdown
                      </h3>
                      {Object.keys(analytics.deviceBreakdown).length > 0 ? (
                        <div className="space-y-3">
                          {Object.entries(analytics.deviceBreakdown)
                            .sort(([,a], [,b]) => b - a)
                            .map(([device, count]) => (
                            <div key={device} className="flex items-center justify-between">
                              <div className="flex items-center">
                                {getDeviceIcon(device)}
                                <span className="ml-2 text-sm text-secondary-900 capitalize">{device}</span>
                              </div>
                              <div className="flex items-center">
                                <span className="text-sm text-secondary-600 mr-2">{count} executions</span>
                                <span className="text-xs text-secondary-500">
                                  ({Math.round((count / analytics.totalExecutions) * 100)}%)
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-secondary-500">
                          No device data available yet
                        </div>
                      )}
                    </div>

                    {/* Performance Summary */}
                    <div className="bg-white rounded-lg border border-secondary-200 p-6">
                      <h3 className="text-lg font-semibold text-secondary-900 mb-4 flex items-center">
                        <TrendingUp className="w-5 h-5 mr-2" />
                        Performance Summary
                      </h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                          <div className="flex items-center">
                            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                            <span className="text-sm font-medium text-green-900">Successful Executions</span>
                          </div>
                          <span className="text-green-600 font-bold">{analytics.successfulExecutions}</span>
                        </div>
                        
                        <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                          <div className="flex items-center">
                            <XCircle className="w-5 h-5 text-red-600 mr-2" />
                            <span className="text-sm font-medium text-red-900">Failed Executions</span>
                          </div>
                          <span className="text-red-600 font-bold">{analytics.failedExecutions}</span>
                        </div>
                        
                        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                          <div className="flex items-center">
                            <Timer className="w-5 h-5 text-blue-600 mr-2" />
                            <span className="text-sm font-medium text-blue-900">Avg Execution Time</span>
                          </div>
                          <span className="text-blue-600 font-bold">
                            {analytics.totalExecutions > 0 
                              ? Math.round(workflowExecutions.reduce((sum, exec) => sum + (exec.execution_time_ms || 0), 0) / analytics.totalExecutions)
                              : 0}ms
                          </span>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                          <div className="flex items-center">
                            <Zap className="w-5 h-5 text-purple-600 mr-2" />
                            <span className="text-sm font-medium text-purple-900">Actions per Execution</span>
                          </div>
                          <span className="text-purple-600 font-bold">
                            {analytics.totalExecutions > 0 
                              ? (analytics.totalActions / analytics.totalExecutions).toFixed(1)
                              : 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Per-Workflow Analytics */}
                  <div className="bg-white rounded-lg border border-secondary-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-secondary-200">
                      <h3 className="text-lg font-semibold text-secondary-900">Workflow Performance</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-secondary-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                              Workflow
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                              Executions
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                              Actions
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                              Interactions
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                              Success Rate
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                              Last Execution
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-secondary-200">
                          {workflows.map((workflow) => {
                            const executions = analytics.executionsByWorkflow[workflow.id] || [];
                            const actions = analytics.actionsByWorkflow[workflow.id] || [];
                            const interactions = analytics.interactionsByWorkflow[workflow.id] || [];
                            const successfulExecs = executions.filter(e => e.status === 'success').length;
                            const successRate = executions.length > 0 ? (successfulExecs / executions.length) * 100 : 0;
                            const lastExecution = executions.sort((a, b) => new Date(b.executed_at).getTime() - new Date(a.executed_at).getTime())[0];
                            
                            return (
                              <tr key={workflow.id} className="hover:bg-secondary-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-secondary-900">{workflow.name}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                    workflow.status === 'active'
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-secondary-100 text-secondary-600'
                                  }`}>
                                    {workflow.status}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-900">
                                  {executions.length}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-900">
                                  {actions.length}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-900">
                                  {interactions.length}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-900">
                                  {executions.length > 0 ? `${Math.round(successRate)}%` : '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-600">
                                  {lastExecution ? formatTimeAgo(lastExecution.executed_at) : 'Never'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

              {/* Executions Tab */}
              {activeTab === 'executions' && (
                <div className="bg-white rounded-lg border border-secondary-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-secondary-200">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-secondary-900">Detailed Workflow Executions</h3>
                      <span className="text-sm text-secondary-600">
                        {detailedExecutions.length} executions with action details
                      </span>
                    </div>
                  </div>
                  
                  {detailedExecutions.length === 0 ? (
                    <div className="text-center py-12">
                      <Database className="w-12 h-12 text-secondary-300 mx-auto mb-4" />
                      <h4 className="text-lg font-medium text-secondary-900 mb-2">No Detailed Executions Found</h4>
                      <p className="text-secondary-600">
                        Your workflows haven't executed with detailed tracking yet.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-secondary-200">
                      {detailedExecutions.slice(0, 20).map((execution) => {
                        const workflow = workflows.find(w => w.id === execution.workflow_id);
                        const device = extractDeviceFromUserAgent(execution.user_agent);
                        
                        return (
                          <div key={execution.id} className="p-6 hover:bg-secondary-50">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3">
                                  <h4 className="text-sm font-medium text-secondary-900">
                                    {workflow?.name || 'Unknown Workflow'}
                                  </h4>
                                  <div className="flex items-center">
                                    {getStatusIcon(execution.status)}
                                    <span className="ml-1 text-sm text-secondary-600 capitalize">
                                      {execution.status}
                                    </span>
                                  </div>
                                </div>
                                <div className="text-xs text-secondary-500 mt-1">
                                  {formatUrl(execution.page_url)} • {device} • {new Date(execution.executed_at).toLocaleString()}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-medium text-secondary-900">
                                  {execution.execution_time_ms ? `${execution.execution_time_ms}ms` : '-'}
                                </div>
                                <div className="text-xs text-secondary-500">
                                  {execution.actions?.length || 0} actions
                                </div>
                              </div>
                            </div>
                            
                            {execution.actions && execution.actions.length > 0 && (
                              <div className="bg-secondary-50 rounded-lg p-3">
                                <h5 className="text-xs font-medium text-secondary-700 mb-2">Actions Executed:</h5>
                                <div className="space-y-2">
                                  {execution.actions.map((action, index) => (
                                    <div key={action.id || index} className="flex items-center justify-between text-xs">
                                      <div className="flex items-center space-x-2">
                                        <Zap className="w-3 h-3 text-yellow-500" />
                                        <span className="text-secondary-900">
                                          {action.event_data?.action_name || 'Unknown Action'}
                                        </span>
                                        {action.element_selector && (
                                          <span className="text-secondary-500">
                                            ({action.element_selector})
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-secondary-600">
                                        {action.event_data?.execution_time_ms ? `${action.event_data.execution_time_ms}ms` : '-'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  {detailedExecutions.length > 20 && (
                    <div className="px-6 py-3 bg-secondary-50 border-t border-secondary-200">
                      <p className="text-sm text-secondary-600 text-center">
                        Showing 20 of {detailedExecutions.length} detailed executions
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Action Tracking Tab */}
              {activeTab === 'actions' && (
                <div className="space-y-6">
                  {/* Website Performance Overview */}
                  <div className="bg-white rounded-lg border border-secondary-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-secondary-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-secondary-900 flex items-center">
                            <BarChart3 className="w-5 h-5 mr-2" />
                            Website Performance Metrics
                          </h3>
                          <p className="text-sm text-secondary-600 mt-1">
                            Performance analytics for each target website where workflows are deployed
                          </p>
                        </div>
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                          {analytics.deployedWebsites?.length || 0} target sites
                        </span>
                      </div>
                    </div>
                    
                    {analytics.deployedWebsites && analytics.deployedWebsites.length > 0 ? (
                      <div className="divide-y divide-secondary-200">
                        {analytics.deployedWebsites.map((site, index) => {
                          // Calculate detailed metrics for this target website
                          const siteExecutions = workflowExecutions.filter(exec => 
                            site.workflows.some((w: Workflow) => w.id === exec.workflow_id) && 
                            (site.targetUrl === '*' || exec.page_url?.includes(site.targetUrl) || true)
                          );
                          
                          const siteActions = actionEvents.filter(action => 
                            site.workflows.some((w: Workflow) => w.id === action.workflow_id)
                          );
                          
                          const siteInteractions = userInteractions.filter(interaction => 
                            site.workflows.some((w: Workflow) => w.id === interaction.workflow_id)
                          );
                          
                          // Performance calculations
                          const avgExecutionTime = siteExecutions.length > 0 
                            ? Math.round(siteExecutions.reduce((sum, exec) => sum + (exec.execution_time_ms || 0), 0) / siteExecutions.length)
                            : 0;
                            
                          const avgActionsPerExecution = siteExecutions.length > 0 
                            ? (siteActions.length / siteExecutions.length).toFixed(1)
                            : '0';
                            
                          const uniqueSessions = new Set([
                            ...siteExecutions.map(exec => exec.session_id).filter(Boolean),
                            ...siteInteractions.map(interaction => interaction.session_id).filter(Boolean)
                          ]).size;
                          
                          const deviceBreakdown = siteExecutions.reduce((acc, exec) => {
                            const device = extractDeviceFromUserAgent(exec.user_agent);
                            acc[device] = (acc[device] || 0) + 1;
                            return acc;
                          }, {} as Record<string, number>);
                          
                          const topDevice = Object.entries(deviceBreakdown)
                            .sort(([,a], [,b]) => b - a)[0]?.[0] || 'unknown';
                            
                          const conversionRate = siteInteractions.length > 0 
                            ? ((siteExecutions.length / siteInteractions.length) * 100).toFixed(1)
                            : '0';
                            
                          const errorRate = siteExecutions.length > 0 
                            ? ((siteExecutions.filter(exec => exec.status === 'error').length / siteExecutions.length) * 100).toFixed(1)
                            : '0';
                          
                          return (
                            <div key={index} className="p-6">
                              <div className="flex items-start justify-between mb-6">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-3 mb-2">
                                    <Globe className="w-5 h-5 text-blue-500" />
                                    <div>
                                      <h4 className="text-lg font-medium text-secondary-900">
                                        {site.targetUrl === '*' ? 'Universal Deployment (All Pages)' : site.targetUrl}
                                      </h4>
                                      <p className="text-sm text-secondary-600">
                                        {site.workflows.length} active workflows • {site.workflowNames.join(', ')}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-lg font-bold text-secondary-900">
                                    {site.totalExecutions} total executions
                                  </div>
                                  <div className="text-sm text-secondary-600">
                                    {site.successRate}% success rate
                                  </div>
                                </div>
                              </div>
                              
                              {/* Performance Metrics Grid */}
                              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
                                <div className="bg-blue-50 rounded-lg p-4">
                                  <div className="flex items-center justify-between">
                                    <Timer className="w-4 h-4 text-blue-600" />
                                    <div className="text-right">
                                      <div className="text-lg font-bold text-blue-900">{avgExecutionTime}ms</div>
                                      <div className="text-xs text-blue-600">Avg Time</div>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="bg-green-50 rounded-lg p-4">
                                  <div className="flex items-center justify-between">
                                    <Zap className="w-4 h-4 text-green-600" />
                                    <div className="text-right">
                                      <div className="text-lg font-bold text-green-900">{avgActionsPerExecution}</div>
                                      <div className="text-xs text-green-600">Actions/Exec</div>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="bg-purple-50 rounded-lg p-4">
                                  <div className="flex items-center justify-between">
                                    <Users className="w-4 h-4 text-purple-600" />
                                    <div className="text-right">
                                      <div className="text-lg font-bold text-purple-900">{uniqueSessions}</div>
                                      <div className="text-xs text-purple-600">Sessions</div>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="bg-indigo-50 rounded-lg p-4">
                                  <div className="flex items-center justify-between">
                                    <Globe className="w-4 h-4 text-indigo-600" />
                                    <div className="text-right">
                                      <div className="text-lg font-bold text-indigo-900">{site.uniquePages}</div>
                                      <div className="text-xs text-indigo-600">Pages</div>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="bg-orange-50 rounded-lg p-4">
                                  <div className="flex items-center justify-between">
                                    <Target className="w-4 h-4 text-orange-600" />
                                    <div className="text-right">
                                      <div className="text-lg font-bold text-orange-900">{conversionRate}%</div>
                                      <div className="text-xs text-orange-600">Conversion</div>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="bg-red-50 rounded-lg p-4">
                                  <div className="flex items-center justify-between">
                                    <AlertCircle className="w-4 h-4 text-red-600" />
                                    <div className="text-right">
                                      <div className="text-lg font-bold text-red-900">{errorRate}%</div>
                                      <div className="text-xs text-red-600">Error Rate</div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Device and Page Breakdown */}
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Device Breakdown */}
                                <div className="bg-secondary-50 rounded-lg p-4">
                                  <h5 className="text-sm font-medium text-secondary-900 mb-3 flex items-center">
                                    <Monitor className="w-4 h-4 mr-2" />
                                    Device Breakdown
                                  </h5>
                                  {Object.keys(deviceBreakdown).length > 0 ? (
                                    <div className="space-y-2">
                                      {Object.entries(deviceBreakdown)
                                        .sort(([,a], [,b]) => b - a)
                                        .map(([device, count]) => (
                                        <div key={device} className="flex items-center justify-between">
                                          <div className="flex items-center">
                                            {getDeviceIcon(device)}
                                            <span className="ml-2 text-sm text-secondary-900 capitalize">{device}</span>
                                          </div>
                                          <div className="flex items-center">
                                            <span className="text-sm text-secondary-600 mr-2">{count}</span>
                                            <span className="text-xs text-secondary-500">
                                              ({Math.round((count / siteExecutions.length) * 100)}%)
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-secondary-500">No device data available</p>
                                  )}
                                </div>
                                
                                {/* Recent Pages */}
                                <div className="bg-secondary-50 rounded-lg p-4">
                                  <h5 className="text-sm font-medium text-secondary-900 mb-3 flex items-center">
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    Recent Active Pages
                                  </h5>
                                  {site.recentPages.length > 0 ? (
                                    <div className="space-y-2">
                                      {site.recentPages.slice(0, 5).map((page: string, pageIndex: number) => {
                                        const pageExecutions = siteExecutions.filter(exec => exec.page_url === page).length;
                                        return (
                                          <div key={pageIndex} className="flex items-center justify-between">
                                            <div className="flex items-center min-w-0 flex-1">
                                              <ExternalLink className="w-3 h-3 text-secondary-400 mr-2 flex-shrink-0" />
                                              <span className="text-sm text-secondary-900 truncate">
                                                {page.length > 35 ? page.substring(0, 35) + '...' : page}
                                              </span>
                                            </div>
                                            <span className="text-xs text-secondary-500 ml-2">
                                              {pageExecutions} exec
                                            </span>
                                          </div>
                                        );
                                      })}
                                      {site.recentPages.length > 5 && (
                                        <div className="text-xs text-secondary-500 text-center pt-2">
                                          +{site.recentPages.length - 5} more pages
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-secondary-500">No page data available</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <BarChart3 className="w-12 h-12 text-secondary-300 mx-auto mb-4" />
                        <h4 className="text-lg font-medium text-secondary-900 mb-2">No Website Performance Data</h4>
                        <p className="text-secondary-600 mb-4">
                          No workflows have been deployed to websites yet, so there's no performance data to display.
                        </p>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
                          <h5 className="text-sm font-medium text-blue-900 mb-2">To see performance metrics:</h5>
                          <ol className="text-xs text-blue-800 space-y-1 text-left">
                            <li>1. Create active workflows with target URLs</li>
                            <li>2. Deploy the integration script to your websites</li>
                            <li>3. Workflows will execute and generate performance data</li>
                            <li>4. Return here to view detailed analytics</li>
                          </ol>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* User Interactions Tab */}
              {activeTab === 'interactions' && (
                <div className="bg-white rounded-lg border border-secondary-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-secondary-200">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-secondary-900">User Interaction Events</h3>
                      <span className="text-sm text-secondary-600">
                        {userInteractions.length} user interactions tracked
                      </span>
                    </div>
                  </div>
                  
                  {userInteractions.length === 0 ? (
                    <div className="text-center py-12">
                      <MousePointer className="w-12 h-12 text-secondary-300 mx-auto mb-4" />
                      <h4 className="text-lg font-medium text-secondary-900 mb-2">No Interaction Events Found</h4>
                      <p className="text-secondary-600">
                        No user interaction events have been tracked yet for the selected time period.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-secondary-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                              Event Type
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                              Element
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                              Page
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                              Device
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                              Session
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                              Timestamp
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-secondary-200">
                          {userInteractions.slice(0, 100).map((interaction) => {
                            const workflow = workflows.find(w => w.id === interaction.workflow_id);
                            
                            return (
                              <tr key={interaction.id} className="hover:bg-secondary-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    {getEventTypeIcon(interaction.event_type)}
                                    <div className="ml-2">
                                      <div className="text-sm font-medium text-secondary-900">
                                        {interaction.event_type}
                                      </div>
                                      <div className="text-xs text-secondary-500">
                                        {workflow?.name || 'Unknown Workflow'}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-secondary-900">
                                    {interaction.element_selector && (
                                      <div className="font-mono text-xs">{interaction.element_selector}</div>
                                    )}
                                    {interaction.element_text && (
                                      <div className="text-xs text-secondary-600 truncate max-w-32">
                                        "{interaction.element_text}"
                                      </div>
                                    )}
                                    {!interaction.element_selector && !interaction.element_text && '-'}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-secondary-900">
                                    {formatUrl(interaction.page_url, 30)}
                                  </div>
                                  {interaction.page_title && (
                                    <div className="text-xs text-secondary-500 truncate max-w-32">
                                      {interaction.page_title}
                                    </div>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    {getDeviceIcon(interaction.device_type)}
                                    <span className="ml-2 text-sm text-secondary-900 capitalize">
                                      {interaction.device_type || 'unknown'}
                                    </span>
                                  </div>
                                  {interaction.viewport_size && (
                                    <div className="text-xs text-secondary-500">
                                      {interaction.viewport_size.width}x{interaction.viewport_size.height}
                                    </div>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-600">
                                  {interaction.session_id ? interaction.session_id.substring(0, 8) + '...' : '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-600">
                                  {new Date(interaction.created_at).toLocaleString()}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                  
                  {userInteractions.length > 100 && (
                    <div className="px-6 py-3 bg-secondary-50 border-t border-secondary-200">
                      <p className="text-sm text-secondary-600 text-center">
                        Showing 100 of {userInteractions.length} interaction events
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Comprehensive Analytics Tab */}
              {activeTab === 'comprehensive' && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-secondary-900 mb-2">
                      Comprehensive Analytics
                    </h3>
                    <p className="text-secondary-600">
                      Complete visitor tracking with workflow linking based on target URLs
                    </p>
                  </div>

                  {comprehensiveAnalytics ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {/* Key Metrics Cards */}
                      <div className="bg-white border border-secondary-200 rounded-lg p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-secondary-600">Total Visitors</p>
                            <p className="text-2xl font-bold text-secondary-900">
                              {comprehensiveAnalytics.total_visitors.toLocaleString()}
                            </p>
                          </div>
                          <Users className="w-8 h-8 text-blue-600" />
                        </div>
                      </div>

                      <div className="bg-white border border-secondary-200 rounded-lg p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-secondary-600">Page Views</p>
                            <p className="text-2xl font-bold text-secondary-900">
                              {comprehensiveAnalytics.total_pageviews.toLocaleString()}
                            </p>
                          </div>
                          <Eye className="w-8 h-8 text-green-600" />
                        </div>
                      </div>

                      <div className="bg-white border border-secondary-200 rounded-lg p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-secondary-600">Sessions</p>
                            <p className="text-2xl font-bold text-secondary-900">
                              {comprehensiveAnalytics.total_sessions.toLocaleString()}
                            </p>
                          </div>
                          <Activity className="w-8 h-8 text-purple-600" />
                        </div>
                      </div>

                      <div className="bg-white border border-secondary-200 rounded-lg p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-secondary-600">Conversions</p>
                            <p className="text-2xl font-bold text-secondary-900">
                              {comprehensiveAnalytics.total_conversions.toLocaleString()}
                            </p>
                            <p className="text-xs text-secondary-500">
                              {comprehensiveAnalytics.conversion_rate.toFixed(1)}% rate
                            </p>
                          </div>
                          <Target className="w-8 h-8 text-orange-600" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white border border-secondary-200 rounded-lg p-12 text-center">
                      <Database className="w-12 h-12 text-secondary-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-secondary-900 mb-2">
                        Comprehensive Analytics Coming Soon
                      </h3>
                      <p className="text-secondary-600">
                        Enhanced analytics with UTM tracking, device breakdown, and visitor journeys will be available once you start receiving traffic on your target pages.
                      </p>
                      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                        <h4 className="text-sm font-semibold text-blue-900 mb-2">
                          What this includes:
                        </h4>
                        <ul className="text-sm text-blue-800 text-left space-y-1">
                          <li>• UTM parameter tracking and attribution</li>
                          <li>• Device and browser breakdown</li>
                          <li>• Page-level analytics linked to workflows</li>
                          <li>• Conversion tracking and funnel analysis</li>
                          <li>• Real-time visitor sessions</li>
                        </ul>
                      </div>
                    </div>
                  )}

                  {comprehensiveAnalytics && (
                    <>
                      {/* Top Pages */}
                      {comprehensiveAnalytics.top_pages && comprehensiveAnalytics.top_pages.length > 0 && (
                        <div className="bg-white border border-secondary-200 rounded-lg overflow-hidden">
                          <div className="px-6 py-4 border-b border-secondary-200">
                            <h3 className="text-lg font-semibold text-secondary-900">Top Pages</h3>
                            <p className="text-sm text-secondary-600">Most visited pages with workflow connections</p>
                          </div>
                          <div className="p-6">
                            <div className="space-y-3">
                              {comprehensiveAnalytics.top_pages.slice(0, 5).map((page, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-secondary-50 rounded-lg">
                                  <div className="flex-1">
                                    <div className="font-medium text-secondary-900 truncate">{page.page_url}</div>
                                  </div>
                                  <div className="text-sm font-semibold text-secondary-700">
                                    {page.visits.toLocaleString()} visits
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Device Breakdown */}
                      {comprehensiveAnalytics.device_breakdown && comprehensiveAnalytics.device_breakdown.length > 0 && (
                        <div className="bg-white border border-secondary-200 rounded-lg overflow-hidden">
                          <div className="px-6 py-4 border-b border-secondary-200">
                            <h3 className="text-lg font-semibold text-secondary-900">Device Breakdown</h3>
                            <p className="text-sm text-secondary-600">Visitor distribution by device type</p>
                          </div>
                          <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {comprehensiveAnalytics.device_breakdown.map((device, index) => (
                                <div key={index} className="flex items-center p-4 bg-secondary-50 rounded-lg">
                                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center mr-3">
                                    {device.device_type === 'mobile' ? <Smartphone className="w-5 h-5 text-primary-600" /> : 
                                     device.device_type === 'desktop' ? <Monitor className="w-5 h-5 text-primary-600" /> :
                                     <Globe className="w-5 h-5 text-primary-600" />}
                                  </div>
                                  <div>
                                    <div className="font-medium text-secondary-900 capitalize">{device.device_type}</div>
                                    <div className="text-sm text-secondary-600">{device.count.toLocaleString()} visitors</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analytics; 