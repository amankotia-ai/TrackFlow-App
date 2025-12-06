import React, { useMemo, useState, useEffect } from 'react';
import { 
  Activity, 
  Globe,
  BarChart3,
  TrendingUp
} from 'lucide-react';
import { Workflow } from '../types/workflow';
import * as Icons from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, LabelList, Rectangle, XAxis, YAxis } from 'recharts';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiClient } from '@/lib/apiClient';

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
  const [timeRange, setTimeRange] = useState('30d');
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [timeseriesData, setTimeseriesData] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      try {
        const [statsRes, seriesRes] = await Promise.all([
          apiClient.getAnalyticsDashboard(days),
          apiClient.getAnalyticsTimeseries(days)
        ]);
        
        if (statsRes.success && statsRes.data?.stats) {
            setDashboardStats(statsRes.data.stats);
        }
        if (seriesRes.success && seriesRes.data?.data) {
            setTimeseriesData(seriesRes.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch analytics:', err);
      }
    };
    
    fetchStats();
  }, [timeRange]);
  
  // Shades of main blue (#3B82F6) - darkest to lightest
  const barColors = ['#3B82F6', '#2563EB', '#1D4ED8', '#60A5FA', '#93C5FD'];
  
  // Calculate analytics metrics from workflow data
  const analytics = useMemo(() => {
    // Basic counts
    const totalPlaybooks = workflows.length;
    const activePlaybooks = workflows.filter(w => w.status === 'active').length;
    const pausedPlaybooks = workflows.filter(w => w.status === 'paused').length;
    const draftPlaybooks = workflows.filter(w => w.status === 'draft').length;
    const errorPlaybooks = workflows.filter(w => w.status === 'error').length;
    
    // Use dashboard stats if available, otherwise fallback
    const totalExecutions = dashboardStats?.totalEvents || workflows.reduce((sum, w) => sum + w.executions, 0);
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
      const groupExecutions = urlWorkflows.reduce((sum, w) => sum + w.executions, 0);
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
        totalExecutions: groupExecutions,
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
      totalPlaybooks: dashboardStats?.totalPlaybooks || totalPlaybooks,
      activePlaybooks: dashboardStats?.activePlaybooks || activePlaybooks,
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
  }, [workflows, dashboardStats]);

  // Generate chart data based on workflow creation dates and executions
  const chartData = useMemo(() => {
    if (timeseriesData.length > 0) {
        return timeseriesData.map((d: any) => ({
            date: d.date,
            active: 0, // We could fetch active count history but simplified for now
            executions: parseInt(d.events || 0)
        }));
    }

    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const data: { date: string; active: number; executions: number }[] = [];
    const now = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Count workflows created on or before this date and active
      const activeCount = workflows.filter(w => {
        const createdDate = new Date(w.createdAt);
        return createdDate <= date && w.status === 'active';
      }).length;
      
      // Simulate executions (fallback)
      const executionsCount = workflows.filter(w => {
        if (!w.lastRun) return false;
        const lastRunDate = new Date(w.lastRun);
        return lastRunDate.toISOString().split('T')[0] === dateStr;
      }).reduce((sum, w) => sum + Math.floor(w.executions / 30), 0);
      
      data.push({
        date: dateStr,
        active: activeCount,
        executions: executionsCount
      });
    }
    
    return data;
  }, [workflows, timeRange, timeseriesData]);

  const chartConfig = {
    active: {
      label: 'Active Playbooks',
      color: '#3b82f6',
    },
    executions: {
      label: 'Daily Executions',
      color: '#60a5fa',
    },
  } satisfies ChartConfig;

  // Helper function to get icon component
  const getIconComponent = (iconName: string, className: string = "size-4") => {
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

  const getStatusDotColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-500',
      paused: 'bg-amber-500',
      draft: 'bg-zinc-400',
      error: 'bg-rose-500'
    };
    return colors[status] || colors.draft;
  };

  return (
    <div className="flex-1 bg-white">
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        {/* Stats Grid - Compact & Minimal */}
        <div className="grid grid-cols-4 gap-px bg-zinc-200 border border-zinc-200 rounded-md mb-6 overflow-hidden">
          <div className="bg-white p-6 hover:bg-zinc-50 transition-colors">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="size-4 text-zinc-400" />
              <span className="text-xs text-zinc-500 uppercase tracking-wider">Playbooks</span>
            </div>
            <div className="text-3xl font-light mb-1">{analytics.totalPlaybooks}</div>
            <div className="text-xs text-zinc-500">{analytics.activePlaybooks} active</div>
          </div>

          <div className="bg-white p-6 hover:bg-zinc-50 transition-colors">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="size-4 text-zinc-400" />
              <span className="text-xs text-zinc-500 uppercase tracking-wider">Executions</span>
            </div>
            <div className="text-3xl font-light mb-1">{analytics.totalExecutions.toLocaleString()}</div>
            <div className="text-xs text-zinc-500">{analytics.avgExecutionsPerPlaybook} avg</div>
          </div>

          <div className="bg-white p-6 hover:bg-zinc-50 transition-colors">
            <div className="flex items-center gap-2 mb-3">
              <Globe className="size-4 text-zinc-400" />
              <span className="text-xs text-zinc-500 uppercase tracking-wider">URLs</span>
            </div>
            <div className="text-3xl font-light mb-1">{analytics.uniqueUrls}</div>
            <div className="text-xs text-zinc-500">target domains</div>
          </div>

          <div className="bg-white p-6 hover:bg-zinc-50 transition-colors">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="size-4 text-zinc-400" />
              <span className="text-xs text-zinc-500 uppercase tracking-wider">Complexity</span>
            </div>
            <div className="text-3xl font-light mb-1">{analytics.avgComplexity}</div>
            <div className="text-xs text-zinc-500">nodes avg</div>
          </div>
        </div>

        {/* Activity Chart */}
        <div className="mb-6 border border-zinc-200 bg-white rounded-md overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
            <div>
              <h2 className="text-sm font-medium mb-0.5">Playbook Activity</h2>
              <p className="text-xs text-zinc-500">Active playbooks and executions over time</p>
            </div>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[140px] h-8 text-xs border-zinc-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-zinc-200">
                <SelectItem value="7d" className="text-xs">Last 7 days</SelectItem>
                <SelectItem value="30d" className="text-xs">Last 30 days</SelectItem>
                <SelectItem value="90d" className="text-xs">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="px-6 py-6">
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="fillActive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="fillExecutions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#60a5fa" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={32}
                  tick={{ fontSize: 11, fill: '#71717a' }}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    });
                  }}
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      className="border-zinc-200"
                      labelFormatter={(value) => {
                        return new Date(value).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        });
                      }}
                      indicator="line"
                    />
                  }
                />
                <Area
                  dataKey="active"
                  type="monotone"
                  fill="url(#fillActive)"
                  stroke="#3b82f6"
                  strokeWidth={1.5}
                />
                <Area
                  dataKey="executions"
                  type="monotone"
                  fill="url(#fillExecutions)"
                  stroke="#60a5fa"
                  strokeWidth={1.5}
                />
              </AreaChart>
            </ChartContainer>
          </div>
        </div>

        {/* Triggers & Actions */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Triggers */}
          <div className="border border-zinc-200 bg-white rounded-md overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100">
              <h2 className="text-sm font-medium mb-0.5">Triggers</h2>
              <p className="text-xs text-zinc-500">Most used trigger types</p>
            </div>
            {analytics.triggerStats.length > 0 ? (
              <>
                <div className="px-6 py-6">
                  <ChartContainer 
                    config={{
                      count: {
                        label: "Triggers",
                        color: '#3b82f6',
                      },
                      ...analytics.triggerStats.slice(0, 5).reduce((acc, trigger) => {
                        acc[trigger.category] = {
                          label: trigger.category,
                          color: '#3b82f6',
                        };
                        return acc;
                      }, {} as Record<string, { label: string; color: string }>),
                    } satisfies ChartConfig}
                    className="h-[240px] w-full"
                  >
                    <BarChart
                      accessibilityLayer
                      data={analytics.triggerStats.slice(0, 5).map((trigger) => ({
                        category: trigger.category,
                        count: trigger.count,
                      }))}
                      layout="vertical"
                      margin={{
                        right: 16,
                      }}
                    >
                      <CartesianGrid horizontal={false} stroke="#e4e4e7" />
                      <YAxis
                        dataKey="category"
                        type="category"
                        tickLine={false}
                        tickMargin={10}
                        axisLine={false}
                        tickFormatter={(value) => value.slice(0, 3)}
                        hide
                      />
                      <XAxis dataKey="count" type="number" hide />
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent indicator="line" className="border-zinc-200" />}
                      />
                      <Bar
                        dataKey="count"
                        layout="vertical"
                        radius={4}
                        fill="#3B82F6"
                      >
                        <LabelList
                          dataKey="category"
                          position="insideLeft"
                          offset={8}
                          className="fill-white"
                          fontSize={12}
                        />
                        <LabelList
                          dataKey="count"
                          position="right"
                          offset={8}
                          className="fill-foreground"
                          fontSize={12}
                        />
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                </div>
                <div className="px-6 py-4 border-t border-zinc-100 flex flex-col gap-2 text-xs">
                  <div className="flex gap-2 leading-none font-medium text-zinc-700">
                    {analytics.triggerStats[0] && (
                      <>
                        Trending up by {analytics.triggerStats[0].percentage}% <TrendingUp className="h-4 w-4" />
                      </>
                    )}
                  </div>
                  <div className="text-zinc-500 leading-none">
                    Showing total triggers for the last {analytics.triggerStats.length} categories
                  </div>
                </div>
              </>
            ) : (
              <div className="py-12 text-center text-sm text-zinc-400">No triggers configured</div>
            )}
          </div>

          {/* Actions */}
          <div className="border border-zinc-200 bg-white rounded-md overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100">
              <h2 className="text-sm font-medium mb-0.5">Actions</h2>
              <p className="text-xs text-zinc-500">Most used action types</p>
            </div>
            {analytics.actionStats.length > 0 ? (
              <div className="px-6 py-6">
                <ChartContainer 
                  config={{
                    count: {
                      label: "Actions",
                      color: '#3b82f6',
                    },
                    ...analytics.actionStats.slice(0, 5).reduce((acc, action, index) => {
                      acc[action.nodeType] = {
                        label: action.nodeType,
                        color: barColors[index % barColors.length],
                      };
                      return acc;
                    }, {} as Record<string, { label: string; color: string }>),
                  } satisfies ChartConfig}
                  className="h-[240px] w-full"
                >
                  <BarChart 
                    accessibilityLayer 
                    data={analytics.actionStats.slice(0, 5).map((action, index) => ({
                      nodeType: action.nodeType,
                      count: action.count,
                      fill: barColors[index % barColors.length],
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                    <XAxis
                      dataKey="nodeType"
                      tickLine={false}
                      tickMargin={10}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: '#71717a' }}
                      tickFormatter={(value) => value}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent hideLabel className="border-zinc-200" />}
                    />
                    <Bar
                      dataKey="count"
                      strokeWidth={2}
                      radius={8}
                      activeIndex={0}
                      activeBar={({ ...props }) => {
                        return (
                          <Rectangle
                            {...props}
                            fillOpacity={0.8}
                            stroke={props.payload.fill}
                            strokeDasharray={4}
                            strokeDashoffset={4}
                          />
                        )
                      }}
                    />
                  </BarChart>
                </ChartContainer>
                <div className="flex flex-col gap-2 text-xs mt-4 pt-4 border-t border-zinc-100">
                  <div className="flex gap-2 leading-none font-medium text-zinc-700">
                    {analytics.actionStats[0] && (
                      <>
                        {analytics.actionStats[0].nodeType} is most popular at {analytics.actionStats[0].percentage}%
                      </>
                    )}
                  </div>
                  <div className="text-zinc-500 leading-none">
                    {analytics.totalActions} total actions across all playbooks
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-sm text-zinc-400">No actions configured</div>
            )}
          </div>
        </div>

        {/* URL Performance */}
        {analytics.urlStats.length > 0 && (
          <div className="mb-6">
            <div className="mb-4">
              <h2 className="text-sm font-medium mb-1">URL Performance</h2>
              <p className="text-xs text-zinc-500">{analytics.urlStats.length} unique target URLs</p>
            </div>
            <div className="border border-zinc-200 rounded-md overflow-hidden">
              <div className="grid grid-cols-6 gap-4 px-4 py-3 bg-zinc-50 text-xs text-zinc-500 uppercase tracking-wider border-b border-zinc-200">
                <div className="col-span-2">URL</div>
                <div>Playbooks</div>
                <div>Active</div>
                <div>Executions</div>
                <div>Last Active</div>
              </div>
              {analytics.urlStats.slice(0, 10).map((urlStat, index) => (
                <div key={index} className="grid grid-cols-6 gap-4 px-4 py-3 text-sm border-b border-zinc-100 last:border-0 hover:bg-zinc-50 transition-colors items-center">
                  <div className="col-span-2 flex items-center gap-2 truncate">
                    <Globe className="size-4 text-zinc-400 flex-shrink-0" />
                    <span className="truncate">{urlStat.url}</span>
                  </div>
                  <div className="flex items-center text-zinc-600">{urlStat.playbookCount}</div>
                  <div className="flex items-center text-zinc-600">{urlStat.activeCount}</div>
                  <div className="flex items-center font-medium">{urlStat.totalExecutions.toLocaleString()}</div>
                  <div className="flex items-center text-zinc-500 text-xs">
                    {urlStat.lastActivity ? formatTimeAgo(urlStat.lastActivity) : 'Never'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Playbooks */}
        {workflows.length > 0 && (
          <div>
            <div className="mb-4">
              <h2 className="text-sm font-medium mb-1">All Playbooks</h2>
              <p className="text-xs text-zinc-500">{workflows.length} total playbooks</p>
            </div>
            <div className="border border-zinc-200 rounded-md overflow-hidden">
              <div className="grid grid-cols-7 gap-4 px-4 py-3 bg-zinc-50 text-xs text-zinc-500 uppercase tracking-wider border-b border-zinc-200">
                <div className="col-span-2">Name</div>
                <div>Status</div>
                <div>URL</div>
                <div>Executions</div>
                <div>Nodes</div>
                <div>Last Run</div>
              </div>
              {workflows
                .sort((a, b) => b.executions - a.executions)
                .map((workflow) => {
                  const triggerNode = workflow.nodes.find(node => node.type === 'trigger');
                  return (
                    <div key={workflow.id} className="grid grid-cols-7 gap-4 px-4 py-3 text-sm border-b border-zinc-100 last:border-0 hover:bg-zinc-50 transition-colors items-center">
                      <div className="col-span-2 flex items-center gap-2 min-w-0">
                        {triggerNode ? getIconComponent(triggerNode.icon, "size-4 text-zinc-700 flex-shrink-0") : <Activity className="size-4 text-zinc-700 flex-shrink-0" />}
                        <div className="min-w-0">
                          <div className="font-medium truncate">{workflow.name}</div>
                          <div className="text-xs text-zinc-500 truncate">{workflow.description}</div>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full ${getStatusDotColor(workflow.status)}`} title={workflow.status}></div>
                      </div>
                      <div className="flex items-center truncate text-zinc-600 text-xs">
                        {workflow.targetUrl ? new URL(workflow.targetUrl).hostname : 'Not set'}
                      </div>
                      <div className="flex items-center font-medium">{workflow.executions.toLocaleString()}</div>
                      <div className="flex items-center text-zinc-600">{workflow.nodes.length}</div>
                      <div className="flex items-center text-zinc-500 text-xs">
                        {workflow.lastRun ? formatTimeAgo(workflow.lastRun) : 'Never'}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {workflows.length === 0 && (
          <div className="py-20 text-center border border-zinc-200 rounded-md bg-white">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-zinc-100 flex items-center justify-center">
              <BarChart3 className="size-6 text-zinc-400" />
            </div>
            <h3 className="text-sm font-medium mb-1">No playbooks yet</h3>
            <p className="text-xs text-zinc-500">Create your first playbook to see analytics</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Analytics;
