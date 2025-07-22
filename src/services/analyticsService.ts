import { apiClient, ApiResponse } from '../lib/apiClient';

export interface AnalyticsEvent {
  id: string
  user_id: string
  workflow_id: string | null
  workflow_execution_id: string | null
  session_id: string
  event_type: string
  element_selector: string | null
  element_text: string | null
  element_attributes: any
  page_url: string | null
  page_title: string | null
  referrer_url: string | null
  device_type: string | null
  browser_info: any
  user_agent: string | null
  viewport_size: any
  screen_size: any
  event_data: any
  created_at: string
}

export interface ComprehensiveAnalytics {
  total_visitors: number
  total_pageviews: number
  total_sessions: number
  total_conversions: number
  conversion_rate: number
  top_pages: Array<{page_url: string, visits: number}>
  top_utm_sources: Array<{utm_source: string, visits: number}>
  device_breakdown: Array<{device_type: string, count: number}>
  daily_stats: Array<{date: string, visitors: number, pageviews: number, conversions: number}>
}

export interface WorkflowMapping {
  workflow_id: string
  user_id: string
  workflow_name: string
  target_url: string
  match_type: string
}

export interface WorkflowExecution {
  id: string
  workflow_id: string
  user_id: string
  status: 'success' | 'error' | 'timeout'
  execution_time_ms: number | null
  error_message: string | null
  page_url: string | null
  user_agent: string | null
  session_id: string | null
  executed_at: string
}

export interface PageAnalyticsEvent extends AnalyticsEvent {
  workflows?: {
    name: string
    user_id: string
  }
}

export interface WorkflowExecutionWithPage extends WorkflowExecution {
  workflows?: {
    name: string
    user_id: string
  }
}

export interface PageAnalyticsSummary {
  executions: WorkflowExecutionWithPage[]
  events: PageAnalyticsEvent[]
}

export interface WorkflowPageMetrics {
  workflowId: string
  workflowName: string
  totalPageViews: number
  uniquePages: number
  uniqueSessions: number
  totalExecutions: number
  successfulExecutions: number
  successRate: number
  avgExecutionTime: number
  deviceBreakdown: Record<string, number>
  topPages: Array<{
    url: string
    executions: number
  }>
  topReferrers: Array<{
    source: string
    visits: number
  }>
  recentExecutions: Array<{
    id: string
    pageUrl: string
    status: string
    executionTime: number
    timestamp: string
    deviceType?: string
    sessionId?: string
  }>
}

export interface UserStats {
  total_workflows: number
  active_workflows: number
  total_executions: number
  total_events: number
  avg_success_rate: number
}

/**
 * Simple, reliable AnalyticsService using the new ApiClient
 * No more complex RPC calls or timeout handling - that's in ApiClient
 */
export class AnalyticsService {
  /**
   * Get user's workflow statistics
   */
  static async getUserStats(): Promise<UserStats | null> {
    console.log('📊 Loading user stats...');
    
    const response: ApiResponse = await apiClient.getUserStats();
    
    if (!response.success) {
      console.error('Failed to load user stats:', response.error);
      throw new Error(response.error || 'Failed to load user stats');
    }
    
    console.log('✅ Loaded user stats');
    return response.data;
  }

  /**
   * Get workflow executions for user
   */
  static async getWorkflowExecutions(
    workflowId?: string,
    limit: number = 50
  ): Promise<WorkflowExecution[]> {
    console.log(`📊 Loading workflow executions (limit: ${limit})...`);
    
    const response: ApiResponse = await apiClient.getWorkflowExecutions(workflowId, limit);
    
    if (!response.success) {
      console.error('Failed to load workflow executions:', response.error);
      throw new Error(response.error || 'Failed to load workflow executions');
    }
    
    console.log(`✅ Loaded ${response.data?.length || 0} executions`);
    return response.data || [];
  }

  /**
   * Get comprehensive analytics for the user
   */
  static async getComprehensiveAnalytics(days: number = 30): Promise<ApiResponse<ComprehensiveAnalytics>> {
    console.log(`📊 Loading comprehensive analytics for last ${days} days...`);
    
    try {
      const response = await fetch(`/api/analytics/comprehensive?days=${days}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch comprehensive analytics');
      }
      
      console.log('✅ Comprehensive analytics loaded successfully');
      return {
        success: true,
        data: result.data,
        timestamp: new Date().toISOString(),
      };
      
    } catch (error: any) {
      console.error('❌ Error loading comprehensive analytics:', error);
      return {
        success: false,
        error: error.message || 'Failed to load comprehensive analytics',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get workflow mappings for a specific page URL
   */
  static async getWorkflowMappings(pageUrl: string): Promise<ApiResponse<WorkflowMapping[]>> {
    console.log(`📊 Finding workflow mappings for page: ${pageUrl}`);
    
    try {
      const response = await fetch(`/api/analytics/workflow-mappings?page_url=${encodeURIComponent(pageUrl)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch workflow mappings');
      }
      
      console.log(`✅ Found ${result.count} workflow mappings for page`);
      return {
        success: true,
        data: result.matching_workflows,
        timestamp: new Date().toISOString(),
      };
      
    } catch (error: any) {
      console.error('❌ Error loading workflow mappings:', error);
      return {
        success: false,
        error: error.message || 'Failed to load workflow mappings',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get analytics events for user's workflows
   * Note: This method is simplified - advanced analytics features can be added later
   */
  static async getAnalyticsEvents(
    workflowId?: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<AnalyticsEvent[]> {
    console.log(`📊 Loading analytics events (workflowId: ${workflowId}, limit: ${limit})...`);
    
    // For now, return empty array as this would require additional API endpoint
    // Advanced analytics can be implemented later when needed
    console.log('Advanced analytics events not yet implemented in new system');
    return [];
  }

  /**
   * Get daily analytics summary for user's workflows
   * Note: This method is simplified - advanced analytics features can be added later
   */
  static async getWorkflowAnalyticsSummary(
    workflowId?: string,
    days: number = 30
  ): Promise<any[]> {
    console.log(`📊 Loading analytics summary (workflowId: ${workflowId}, days: ${days})...`);
    
    // For now, return empty array as this would require additional API endpoint
    // Advanced analytics can be implemented later when needed
    console.log('Analytics summary not yet implemented in new system');
    return [];
  }

  /**
   * Get real-time analytics for user's workflows
   * Note: This method is simplified - real-time features can be added later
   */
  static async getRealtimeAnalytics(): Promise<any[]> {
    console.log('📊 Loading real-time analytics...');
    
    // For now, return empty array as this would require additional API endpoint
    // Real-time analytics can be implemented later when needed
    console.log('Real-time analytics not yet implemented in new system');
    return [];
  }

  /**
   * Track a workflow execution (for server-side use)
   * Note: This method is simplified - execution tracking can be enhanced later
   */
  static async trackWorkflowExecution(
    workflowId: string,
    status: 'success' | 'error' | 'timeout',
    executionTimeMs?: number,
    errorMessage?: string,
    pageUrl?: string,
    sessionId?: string
  ): Promise<string | null> {
    console.log(`📊 Tracking workflow execution (${workflowId}, ${status})...`);
    
    // For now, just log the execution - server-side tracking can be implemented later
    console.log('Workflow execution tracking not yet implemented in new system');
    return null;
  }

  /**
   * Track an analytics event (for client-side use)
   * Note: This method is simplified - event tracking can be enhanced later
   */
  static async trackAnalyticsEvent(
    workflowId: string | null,
    workflowExecutionId: string | null,
    sessionId: string,
    eventType: string,
    elementSelector?: string,
    elementText?: string,
    pageUrl?: string,
    deviceType?: string,
    eventData?: any
  ): Promise<string | null> {
    console.log(`📊 Tracking analytics event (${eventType})...`);
    
    // For now, just log the event - client-side tracking can be implemented later
    console.log('Analytics event tracking not yet implemented in new system');
    return null;
  }

  /**
   * Get analytics data for dashboard charts
   */
  static async getDashboardAnalytics(days: number = 30) {
    console.log(`📊 Loading dashboard analytics (${days} days)...`);
    
    try {
      // Get user stats (this is implemented)
      const userStats = await this.getUserStats();
      
      // Get workflow executions (this is implemented)
      const executions = await this.getWorkflowExecutions(undefined, 50);
      
      // Return basic analytics data
      const analytics = {
        userStats: userStats || {
          total_workflows: 0,
          active_workflows: 0,
          total_executions: 0,
          total_events: 0,
          avg_success_rate: 0
        },
        realtimeData: [], // Will be implemented later
        summaryData: [], // Will be implemented later
        executions: executions
      };
      
      console.log('✅ Loaded dashboard analytics');
      return analytics;
      
    } catch (error) {
      console.error('Error loading dashboard analytics:', error);
      
      // Return safe defaults on error
      return {
        userStats: {
          total_workflows: 0,
          active_workflows: 0,
          total_executions: 0,
          total_events: 0,
          avg_success_rate: 0
        },
        realtimeData: [],
        summaryData: [],
        executions: []
      };
    }
  }

  /**
   * Get page analytics for user's workflows
   */
  static async getPageAnalytics(
    workflowId?: string,
    days: number = 30
  ): Promise<PageAnalyticsEvent[]> {
    console.log(`📊 Loading page analytics (workflowId: ${workflowId}, days: ${days})...`);
    
    const response: ApiResponse = await apiClient.getPageAnalytics(workflowId, days);
    
    if (!response.success) {
      console.error('Failed to load page analytics:', response.error);
      throw new Error(response.error || 'Failed to load page analytics');
    }
    
    console.log(`✅ Loaded ${response.data?.length || 0} page analytics events`);
    return response.data || [];
  }

  /**
   * Get page analytics summary for workflows
   */
  static async getPageAnalyticsSummary(
    workflowId?: string,
    days: number = 30
  ): Promise<PageAnalyticsSummary> {
    console.log(`📊 Loading page analytics summary (workflowId: ${workflowId}, days: ${days})...`);
    
    const response: ApiResponse = await apiClient.getPageAnalyticsSummary(workflowId, days);
    
    if (!response.success) {
      console.error('Failed to load page analytics summary:', response.error);
      throw new Error(response.error || 'Failed to load page analytics summary');
    }
    
    console.log(`✅ Loaded page analytics summary with ${response.data?.executions?.length || 0} executions and ${response.data?.events?.length || 0} events`);
    return response.data || { executions: [], events: [] };
  }

  /**
   * Get total page visits data
   */
  static async getTotalPageVisits(days: number = 30) {
    console.log(`📊 Loading total page visits (${days} days)...`);
    
    try {
      const response = await apiClient.getTotalPageVisits(days);
      
      if (response.success && response.data) {
        console.log('✅ Loaded page visits data:', response.data);
        return response.data;
      } else {
        console.error('❌ Failed to load page visits:', response.error);
        return null;
      }
    } catch (error) {
      console.error('❌ Error loading page visits:', error);
      return null;
    }
  }

  /**
   * Process page metrics from real execution and analytics data
   */
  static processWorkflowPageMetrics(workflowId: string, workflowName: string, summary: PageAnalyticsSummary): WorkflowPageMetrics {
    const executions = summary.executions.filter(exec => exec.workflow_id === workflowId);
    const events = summary.events.filter(event => event.workflow_id === workflowId);
    
    // Get unique pages from executions and events
    const pageUrls = new Set([
      ...executions.map(exec => exec.page_url).filter(Boolean),
      ...events.map(event => event.page_url).filter(Boolean)
    ]);
    
    // Get unique sessions from executions and events
    const sessionIds = new Set([
      ...executions.map(exec => exec.session_id).filter(Boolean),
      ...events.map(event => event.session_id).filter(Boolean)
    ]);
    
    // Get page view events
    const pageViewEvents = events.filter(event => event.event_type === 'page_view');
    
    // Get device breakdown from executions (since they have more reliable device info)
    const deviceBreakdown = executions.reduce((acc, exec) => {
      const deviceType = this.extractDeviceTypeFromUserAgent(exec.user_agent) || 'unknown';
      acc[deviceType] = (acc[deviceType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Calculate success rate
    const successfulExecutions = executions.filter(exec => exec.status === 'success').length;
    const successRate = executions.length > 0 ? (successfulExecutions / executions.length) * 100 : 0;
    
    // Get top pages by execution count
    const pageExecutionCounts = executions.reduce((acc, exec) => {
      if (exec.page_url) {
        acc[exec.page_url] = (acc[exec.page_url] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    
    const topPages = Object.entries(pageExecutionCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([url, count]) => ({ url, executions: count }));
    
    // Get referrer data from events
    const referrerCounts = events.reduce((acc, event) => {
      if (event.referrer_url) {
        const domain = this.extractDomain(event.referrer_url);
        acc[domain] = (acc[domain] || 0) + 1;
      } else {
        acc['Direct'] = (acc['Direct'] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    
    const topReferrers = Object.entries(referrerCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([source, count]) => ({ source, visits: count }));

    return {
      workflowId,
      workflowName,
      totalPageViews: pageViewEvents.length,
      uniquePages: pageUrls.size,
      uniqueSessions: sessionIds.size,
      totalExecutions: executions.length,
      successfulExecutions,
      successRate: Math.round(successRate),
      avgExecutionTime: executions.length > 0 ? 
        Math.round(executions.reduce((sum, exec) => sum + (exec.execution_time_ms || 0), 0) / executions.length) : 0,
      deviceBreakdown,
      topPages,
      topReferrers,
      recentExecutions: executions
        .sort((a, b) => new Date(b.executed_at).getTime() - new Date(a.executed_at).getTime())
        .slice(0, 10)
        .map(exec => ({
          id: exec.id,
          pageUrl: exec.page_url || 'Unknown',
          status: exec.status,
          executionTime: exec.execution_time_ms || 0,
          timestamp: exec.executed_at,
          deviceType: this.extractDeviceTypeFromUserAgent(exec.user_agent),
          sessionId: exec.session_id || undefined
        }))
    };
  }
  
  /**
   * Extract device type from user agent string
   */
  static extractDeviceTypeFromUserAgent(userAgent: string | null): string {
    if (!userAgent) return 'unknown';
    
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return 'mobile';
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
      return 'tablet';
    } else {
      return 'desktop';
    }
  }
  
  /**
   * Extract domain from URL
   */
  static extractDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  }
} 