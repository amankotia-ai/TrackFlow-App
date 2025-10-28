import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  CheckCircle,
  Users,
  Zap,
  Plus,
  RefreshCw,
  Loader2,
  AlertCircle,
  Smartphone
} from 'lucide-react';
import { AnalyticsService, WorkflowExecution } from '../services/analyticsService';
import { Workflow } from '../types/workflow';
import EnhancedStatCard from './EnhancedStatCard';
import TopPerformers from './TopPerformers';
import EnhancedExecutionList from './EnhancedExecutionList';
import {
  calculateTodayStats,
  groupExecutionsByTime,
  getDeviceBreakdown,
  getTopPerformers,
  getUniqueVisitorCount,
  getUniquePagesCount
} from '../utils/dashboardHelpers';

interface DashboardProps {
  workflows?: Workflow[];
  onCreateWorkflow?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ workflows = [], onCreateWorkflow }) => {
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

        // Load data using the new AnalyticsService - get more executions for analysis
        const executions = await AnalyticsService.getWorkflowExecutions(undefined, 100); // Get more for better analytics
        
        clearTimeout(loadingTimeout);

        if (isMountedRef.current) {
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


  // Calculate dashboard analytics using helper functions
  const dashboardData = useMemo(() => {
    if (!recentExecutions.length) {
      return {
        todayStats: { count: 0, successRate: 0, avgTime: 0, errorCount: 0 },
        groupedExecutions: { recent: [], last30: [], earlier: [] },
        deviceBreakdown: { mobile: 0, desktop: 0, tablet: 0, unknown: 0 },
        topPerformers: [],
        uniqueVisitors: 0,
        uniquePages: 0
      };
    }

    return {
      todayStats: calculateTodayStats(recentExecutions),
      groupedExecutions: groupExecutionsByTime(recentExecutions),
      deviceBreakdown: getDeviceBreakdown(recentExecutions),
      topPerformers: getTopPerformers(recentExecutions, workflows, 3),
      uniqueVisitors: getUniqueVisitorCount(recentExecutions),
      uniquePages: getUniquePagesCount(recentExecutions)
    };
  }, [recentExecutions, workflows]);


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
              <button 
                onClick={() => window.location.reload()}
                className="flex items-center space-x-2 px-4 py-2 text-secondary-700 bg-white border border-secondary-300 hover:bg-secondary-50 transition-colors font-medium text-sm rounded-lg"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh</span>
              </button>
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
        <div className="p-8 space-y-6">
          {/* Enhanced Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <EnhancedStatCard
              title="Executions Today"
              value={dashboardData.todayStats.count}
              icon={Zap}
              subMetric={dashboardData.todayStats.errorCount > 0 
                ? `⚠️ ${dashboardData.todayStats.errorCount} errors to review`
                : '✓ All systems running smoothly'}
              trend={dashboardData.todayStats.yesterdayCount !== undefined ? {
                value: dashboardData.todayStats.trendPercentage || 0,
                label: 'vs yesterday'
              } : undefined}
            />
            
            <EnhancedStatCard
              title="Success Rate (24h)"
              value={`${dashboardData.todayStats.successRate}%`}
              icon={CheckCircle}
              subMetric={dashboardData.todayStats.successRate >= 95 
                ? '🎯 Excellent performance'
                : dashboardData.todayStats.successRate >= 80 
                ? '👍 Good performance'
                : '⚠️ Needs attention'}
            />
            
            <EnhancedStatCard
              title="Unique Visitors"
              value={dashboardData.uniqueVisitors}
              icon={Users}
              subMetric={`${dashboardData.uniquePages} unique pages`}
            />
            
            <EnhancedStatCard
              title="Top Device"
              value={(() => {
                const { mobile, desktop, tablet } = dashboardData.deviceBreakdown;
                const total = mobile + desktop + tablet;
                if (total === 0) return 'No data';
                if (mobile > desktop && mobile > tablet) {
                  return `${Math.round((mobile / total) * 100)}%`;
                }
                if (desktop > mobile && desktop > tablet) {
                  return `${Math.round((desktop / total) * 100)}%`;
                }
                return `${Math.round((tablet / total) * 100)}%`;
              })()}
              icon={Smartphone}
              subMetric={(() => {
                const { mobile, desktop, tablet } = dashboardData.deviceBreakdown;
                const total = mobile + desktop + tablet;
                if (total === 0) return 'No activity yet';
                if (mobile > desktop && mobile > tablet) {
                  return `Mobile (Desktop: ${Math.round((desktop / total) * 100)}%)`;
                }
                if (desktop > mobile && desktop > tablet) {
                  return `Desktop (Mobile: ${Math.round((mobile / total) * 100)}%)`;
                }
                return `Tablet (Mobile: ${Math.round((mobile / total) * 100)}%)`;
              })()}
            />
          </div>

          {/* Top Performers */}
          <TopPerformers performers={dashboardData.topPerformers} />

          {/* Enhanced Execution List with Time Grouping */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-secondary-900 tracking-tight">Recent Activity</h2>
                <p className="text-sm text-secondary-600 mt-1">Latest playbook executions and their performance</p>
              </div>
            </div>
            <EnhancedExecutionList 
              groupedExecutions={dashboardData.groupedExecutions} 
              workflows={workflows}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;