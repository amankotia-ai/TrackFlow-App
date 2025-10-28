import { WorkflowExecution } from '../services/analyticsService';
import { Workflow } from '../types/workflow';

export interface Alert {
  severity: 'high' | 'medium' | 'info';
  playbook: string;
  workflowId: string;
  message: string;
  details?: string;
  action: 'debug' | 'optimize' | 'configure';
}

export interface TodayStats {
  count: number;
  successRate: number;
  avgTime: number;
  errorCount: number;
  yesterdayCount?: number;
  trendPercentage?: number;
}

export interface DeviceBreakdown {
  mobile: number;
  desktop: number;
  tablet: number;
  unknown: number;
}

export interface TimeGroupedExecutions {
  recent: WorkflowExecution[]; // Last 5 minutes
  last30: WorkflowExecution[]; // 5-30 minutes
  earlier: WorkflowExecution[]; // Earlier today
}

export interface TopPerformer {
  name: string;
  workflowId: string;
  executions: number;
  successRate: number;
  avgTime: number;
  uniquePages: number;
  uniqueSessions: number;
  errorCount: number;
  successCount: number;
  lastExecuted: string;
  firstExecuted: string;
  deviceBreakdown: {
    mobile: number;
    desktop: number;
    tablet: number;
  };
  topPages: Array<{ url: string; count: number }>;
  executionsPerPage: number;
}

/**
 * Calculate today's statistics from executions
 */
export function calculateTodayStats(executions: WorkflowExecution[]): TodayStats {
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
  
  const todayExecutions = executions.filter(e => 
    new Date(e.executed_at).toDateString() === today
  );
  
  const yesterdayExecutions = executions.filter(e => 
    new Date(e.executed_at).toDateString() === yesterday
  );

  const successfulToday = todayExecutions.filter(e => e.status === 'success').length;
  const errorsToday = todayExecutions.filter(e => e.status === 'error' || e.status === 'timeout').length;
  
  const successRate = todayExecutions.length > 0 
    ? (successfulToday / todayExecutions.length) * 100 
    : 0;
  
  const avgTime = todayExecutions.length > 0
    ? todayExecutions.reduce((sum, e) => sum + (e.execution_time_ms || 0), 0) / todayExecutions.length
    : 0;

  const trendPercentage = yesterdayExecutions.length > 0
    ? ((todayExecutions.length - yesterdayExecutions.length) / yesterdayExecutions.length) * 100
    : 0;
  
  return {
    count: todayExecutions.length,
    successRate: Math.round(successRate * 10) / 10,
    avgTime: Math.round(avgTime),
    errorCount: errorsToday,
    yesterdayCount: yesterdayExecutions.length,
    trendPercentage: Math.round(trendPercentage)
  };
}

/**
 * Detect issues and generate alerts
 */
export function detectAlerts(
  executions: WorkflowExecution[], 
  workflows: Workflow[]
): Alert[] {
  const alerts: Alert[] = [];
  
  workflows.forEach(workflow => {
    const workflowExecs = executions
      .filter(e => e.workflow_id === workflow.id)
      .slice(0, 20); // Last 20 executions for this workflow
    
    if (workflowExecs.length === 0) {
      // Check if workflow should have run by now (has been active for more than 6 hours)
      const createdAt = new Date(workflow.createdAt).getTime();
      const sixHoursAgo = Date.now() - (6 * 60 * 60 * 1000);
      
      if (workflow.status === 'active' && createdAt < sixHoursAgo) {
        alerts.push({
          severity: 'info',
          playbook: workflow.name,
          workflowId: workflow.id,
          message: `No activity in last 6 hours`,
          details: 'Expected triggers based on historical patterns',
          action: 'configure'
        });
      }
      return;
    }
    
    // High error rate alert
    const errorCount = workflowExecs.filter(e => e.status === 'error' || e.status === 'timeout').length;
    const errorRate = errorCount / workflowExecs.length;
    
    if (errorRate > 0.2 && workflowExecs.length >= 5) {
      const mostRecentError = workflowExecs.find(e => e.status === 'error');
      alerts.push({
        severity: 'high',
        playbook: workflow.name,
        workflowId: workflow.id,
        message: `Failing ${Math.round(errorRate * 100)}% of the time`,
        details: mostRecentError?.error_message || `${errorCount} failures in last ${workflowExecs.length} attempts`,
        action: 'debug'
      });
    }
    
    // Slow execution alert
    if (workflowExecs.length >= 10) {
      const recentAvg = workflowExecs.slice(0, 5)
        .reduce((sum, e) => sum + (e.execution_time_ms || 0), 0) / 5;
      const historicalAvg = workflowExecs.slice(5, 20)
        .reduce((sum, e) => sum + (e.execution_time_ms || 0), 0) / Math.min(15, workflowExecs.length - 5);
      
      if (recentAvg > historicalAvg * 1.3 && historicalAvg > 0) {
        const increase = Math.round((recentAvg / historicalAvg - 1) * 100);
        alerts.push({
          severity: 'medium',
          playbook: workflow.name,
          workflowId: workflow.id,
          message: `Execution time increased ${increase}%`,
          details: `Average execution time: ${Math.round(recentAvg)}ms (was ${Math.round(historicalAvg)}ms)`,
          action: 'optimize'
        });
      }
    }
  });
  
  // Sort alerts by severity (high > medium > info)
  const severityOrder = { high: 0, medium: 1, info: 2 };
  alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  
  return alerts;
}

/**
 * Group executions by time buckets
 */
export function groupExecutionsByTime(executions: WorkflowExecution[]): TimeGroupedExecutions {
  const now = Date.now();
  const fiveMin = 5 * 60 * 1000;
  const thirtyMin = 30 * 60 * 1000;
  
  return {
    recent: executions.filter(e => {
      const diff = now - new Date(e.executed_at).getTime();
      return diff < fiveMin;
    }),
    last30: executions.filter(e => {
      const diff = now - new Date(e.executed_at).getTime();
      return diff >= fiveMin && diff < thirtyMin;
    }),
    earlier: executions.filter(e => {
      const diff = now - new Date(e.executed_at).getTime();
      return diff >= thirtyMin;
    })
  };
}

/**
 * Get device breakdown from executions
 */
export function getDeviceBreakdown(executions: WorkflowExecution[]): DeviceBreakdown {
  const breakdown: DeviceBreakdown = { mobile: 0, desktop: 0, tablet: 0, unknown: 0 };
  
  executions.forEach(e => {
    const ua = (e.user_agent || '').toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      breakdown.mobile++;
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
      breakdown.tablet++;
    } else if (ua) {
      breakdown.desktop++;
    } else {
      breakdown.unknown++;
    }
  });
  
  return breakdown;
}

/**
 * Get top performing playbooks with detailed metrics
 */
export function getTopPerformers(
  executions: WorkflowExecution[], 
  workflows: Workflow[], 
  limit = 3
): TopPerformer[] {
  const playbooks = workflows
    .filter(w => w.status === 'active') // Only active playbooks
    .map(w => {
      const execs = executions.filter(e => e.workflow_id === w.id);
      
      if (execs.length === 0) {
        return null;
      }
      
      const successCount = execs.filter(e => e.status === 'success').length;
      const errorCount = execs.filter(e => e.status === 'error' || e.status === 'timeout').length;
      const successRate = (successCount / execs.length) * 100;
      const avgTime = execs.reduce((sum, e) => sum + (e.execution_time_ms || 0), 0) / execs.length;
      
      // Get unique pages
      const uniquePages = new Set(execs.map(e => e.page_url).filter(Boolean)).size;
      
      // Get unique sessions
      const uniqueSessions = new Set(execs.map(e => e.session_id).filter(Boolean)).size;
      
      // Get device breakdown
      const deviceBreakdown = { mobile: 0, desktop: 0, tablet: 0 };
      execs.forEach(e => {
        const ua = (e.user_agent || '').toLowerCase();
        if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
          deviceBreakdown.mobile++;
        } else if (ua.includes('tablet') || ua.includes('ipad')) {
          deviceBreakdown.tablet++;
        } else if (ua) {
          deviceBreakdown.desktop++;
        }
      });
      
      // Get last and first execution times
      const lastExecuted = execs.reduce((latest, e) => {
        const execTime = new Date(e.executed_at).getTime();
        return execTime > new Date(latest).getTime() ? e.executed_at : latest;
      }, execs[0].executed_at);
      
      const firstExecuted = execs.reduce((earliest, e) => {
        const execTime = new Date(e.executed_at).getTime();
        return execTime < new Date(earliest).getTime() ? e.executed_at : earliest;
      }, execs[0].executed_at);
      
      // Get top pages
      const pageCounts: Record<string, number> = {};
      execs.forEach(e => {
        if (e.page_url) {
          pageCounts[e.page_url] = (pageCounts[e.page_url] || 0) + 1;
        }
      });
      
      const topPages = Object.entries(pageCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([url, count]) => ({ url, count }));
      
      const executionsPerPage = uniquePages > 0 ? Math.round(execs.length / uniquePages) : 0;
      
      return {
        name: w.name,
        workflowId: w.id,
        executions: execs.length,
        successRate: Math.round(successRate),
        avgTime: Math.round(avgTime),
        uniquePages,
        uniqueSessions,
        errorCount,
        successCount,
        lastExecuted,
        firstExecuted,
        deviceBreakdown,
        topPages,
        executionsPerPage
      };
    })
    .filter((p): p is TopPerformer => p !== null); // Filter out null values and type guard
  
  return playbooks
    .sort((a, b) => {
      // Sort by success rate first, then execution count
      if (Math.abs(a.successRate - b.successRate) > 5) {
        return b.successRate - a.successRate;
      }
      return b.executions - a.executions;
    })
    .slice(0, limit);
}

/**
 * Get unique visitor count from executions
 */
export function getUniqueVisitorCount(executions: WorkflowExecution[]): number {
  const uniqueSessions = new Set(
    executions
      .filter(e => e.session_id)
      .map(e => e.session_id)
  );
  return uniqueSessions.size;
}

/**
 * Get unique pages count from executions
 */
export function getUniquePagesCount(executions: WorkflowExecution[]): number {
  const uniquePages = new Set(
    executions
      .filter(e => e.page_url)
      .map(e => e.page_url)
  );
  return uniquePages.size;
}

/**
 * Calculate hourly execution data for timeline chart
 */
export function calculateHourlyData(executions: WorkflowExecution[]): Array<{
  hour: number;
  success: number;
  error: number;
  total: number;
}> {
  const now = new Date();
  const currentHour = now.getHours();
  const hours = Array(24).fill(0).map((_, i) => ({
    hour: i,
    success: 0,
    error: 0,
    total: 0
  }));
  
  // Filter to last 24 hours only
  const last24Hours = executions.filter(e => {
    const execTime = new Date(e.executed_at).getTime();
    const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
    return execTime >= twentyFourHoursAgo;
  });
  
  last24Hours.forEach(e => {
    const hour = new Date(e.executed_at).getHours();
    if (e.status === 'success') {
      hours[hour].success++;
    } else {
      hours[hour].error++;
    }
    hours[hour].total++;
  });
  
  return hours;
}

