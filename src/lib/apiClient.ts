/**
 * Simple, reliable API client for TrackFlow
 * Handles all backend communication with proper error handling
 */

import { supabase } from './supabase';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  
  constructor(message: string, status: number = 500, code: string = 'UNKNOWN_ERROR') {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

class ApiClient {
  private readonly baseTimeout = 15000; // 15 seconds
  private readonly maxRetries = 2;
  
  /**
   * Make a simple HTTP request with timeout and retry logic
   */
  private async makeRequest<T>(
    url: string, 
    options: RequestInit = {}, 
    timeout: number = this.baseTimeout
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new ApiError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          'HTTP_ERROR'
        );
      }
      
      const data = await response.json();
      return data;
      
         } catch (error: any) {
       clearTimeout(timeoutId);
       
       if (error instanceof ApiError) {
         throw error;
       }
       
       if (error.name === 'AbortError') {
         throw new ApiError('Request timed out', 408, 'TIMEOUT');
       }
       
       throw new ApiError(
         error.message || 'Network request failed',
         0,
         'NETWORK_ERROR'
       );
     }
  }
  
  /**
   * Make request with automatic retries
   */
     private async requestWithRetry<T>(
     url: string,
     options: RequestInit = {},
     retries: number = this.maxRetries
   ): Promise<T> {
     let lastError: Error = new ApiError('Request failed', 500, 'UNKNOWN_ERROR');
     
     for (let attempt = 0; attempt <= retries; attempt++) {
       try {
         return await this.makeRequest<T>(url, options);
       } catch (error: any) {
         lastError = error;
         
         // Don't retry on client errors (4xx)
         if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
           throw error;
         }
         
         // Don't retry on last attempt
         if (attempt === retries) {
           break;
         }
         
         // Wait before retry (exponential backoff)
         await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
       }
     }
     
     throw lastError;
   }
  
  /**
   * Authenticate user and return session
   */
  async signIn(email: string, password: string): Promise<ApiResponse> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        return {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        };
      }
      
      return {
        success: true,
        data: data.user,
        timestamp: new Date().toISOString(),
      };
         } catch (error: any) {
       return {
         success: false,
         error: error.message || 'Authentication failed',
         timestamp: new Date().toISOString(),
       };
     }
  }
  
  /**
   * Register new user
   */
  async signUp(email: string, password: string, metadata?: any): Promise<ApiResponse> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata || {}
        }
      });
      
      if (error) {
        return {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        };
      }
      
      return {
        success: true,
        data: data.user,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Registration failed',
        timestamp: new Date().toISOString(),
      };
    }
  }
  
  /**
   * Sign out user
   */
  async signOut(): Promise<ApiResponse> {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        return {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        };
      }
      
      return {
        success: true,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Sign out failed',
        timestamp: new Date().toISOString(),
      };
    }
  }
  
  /**
   * Get current user session
   */
  async getCurrentSession(): Promise<ApiResponse> {
    try {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        return {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        };
      }
      
      return {
        success: true,
        data: data.session,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to get session',
        timestamp: new Date().toISOString(),
      };
    }
  }
  
  /**
   * Get user workflows - direct table query
   */
  async getUserWorkflows(): Promise<ApiResponse> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated',
          timestamp: new Date().toISOString(),
        };
      }
      
      // Simple direct query - no complex views or RPC calls
      const { data, error } = await supabase
        .from('workflows')
        .select(`
          *,
          workflow_nodes (*),
          workflow_connections (*)
        `)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
      
      if (error) {
        return {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        };
      }
      
             // Transform data to frontend format
       const workflows = data.map((workflow: any) => ({
         id: workflow.id,
         name: workflow.name,
         description: workflow.description || '',
         isActive: workflow.is_active,
         status: workflow.status,
         targetUrl: workflow.target_url || '*',
         executions: workflow.executions || 0,
         lastRun: workflow.last_run ? new Date(workflow.last_run) : null,
         createdAt: new Date(workflow.created_at),
         updatedAt: new Date(workflow.updated_at),
         nodes: workflow.workflow_nodes.map((node: any) => ({
           id: node.id,
           type: node.type,
           category: node.category,
           name: node.name,
           description: node.description,
           icon: node.icon,
           position: node.position,
           config: node.config,
           inputs: node.inputs,
           outputs: node.outputs,
         })),
         connections: workflow.workflow_connections.map((conn: any) => ({
           id: conn.id,
           sourceNodeId: conn.source_node_id,
           targetNodeId: conn.target_node_id,
           sourceHandle: conn.source_handle,
           targetHandle: conn.target_handle,
         })),
       }));
      
      return {
        success: true,
        data: workflows,
        timestamp: new Date().toISOString(),
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to load workflows',
        timestamp: new Date().toISOString(),
      };
    }
  }
  
  /**
   * Save workflow - simple approach
   */
  async saveWorkflow(workflow: any): Promise<ApiResponse> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated',
          timestamp: new Date().toISOString(),
        };
      }
      
      // Determine if this is create or update
      const isNewWorkflow = workflow.id.startsWith('workflow-');
      
      let workflowData;
      
      if (isNewWorkflow) {
        // Create new workflow
        const { data, error } = await supabase
          .from('workflows')
          .insert({
            user_id: user.id,
            name: workflow.name,
            description: workflow.description || null,
            is_active: workflow.isActive,
            status: workflow.status,
            target_url: workflow.targetUrl || '*',
          })
          .select()
          .single();
        
        if (error) {
          return {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString(),
          };
        }
        
        workflowData = data;
      } else {
        // Update existing workflow
        const { data, error } = await supabase
          .from('workflows')
          .update({
            name: workflow.name,
            description: workflow.description || null,
            is_active: workflow.isActive,
            status: workflow.status,
            target_url: workflow.targetUrl || '*',
            updated_at: new Date().toISOString(),
          })
          .eq('id', workflow.id)
          .eq('user_id', user.id)
          .select()
          .single();
        
        if (error) {
          return {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString(),
          };
        }
        
        workflowData = data;
        
        // Delete existing nodes and connections
        await supabase
          .from('workflow_connections')
          .delete()
          .eq('workflow_id', workflow.id);
        
        await supabase
          .from('workflow_nodes')
          .delete()
          .eq('workflow_id', workflow.id);
      }
      
      // Insert nodes
      if (workflow.nodes && workflow.nodes.length > 0) {
        const nodes = workflow.nodes.map(node => ({
          id: node.id,
          workflow_id: workflowData.id,
          type: node.type,
          category: node.category,
          name: node.name,
          description: node.description || null,
          icon: node.icon,
          position: node.position,
          config: node.config,
          inputs: node.inputs || [],
          outputs: node.outputs || [],
        }));
        
        const { error: nodesError } = await supabase
          .from('workflow_nodes')
          .insert(nodes);
        
        if (nodesError) {
          return {
            success: false,
            error: `Failed to save nodes: ${nodesError.message}`,
            timestamp: new Date().toISOString(),
          };
        }
      }
      
      // Insert connections
      if (workflow.connections && workflow.connections.length > 0) {
        const connections = workflow.connections.map(conn => ({
          id: conn.id,
          workflow_id: workflowData.id,
          source_node_id: conn.sourceNodeId,
          target_node_id: conn.targetNodeId,
          source_handle: conn.sourceHandle,
          target_handle: conn.targetHandle,
        }));
        
        const { error: connectionsError } = await supabase
          .from('workflow_connections')
          .insert(connections);
        
        if (connectionsError) {
          return {
            success: false,
            error: `Failed to save connections: ${connectionsError.message}`,
            timestamp: new Date().toISOString(),
          };
        }
      }
      
      return {
        success: true,
        data: {
          ...workflow,
          id: workflowData.id,
          updatedAt: new Date(workflowData.updated_at),
        },
        timestamp: new Date().toISOString(),
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to save workflow',
        timestamp: new Date().toISOString(),
      };
    }
  }
  
  /**
   * Delete workflow
   */
  async deleteWorkflow(workflowId: string): Promise<ApiResponse> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated',
          timestamp: new Date().toISOString(),
        };
      }
      
      const { error } = await supabase
        .from('workflows')
        .delete()
        .eq('id', workflowId)
        .eq('user_id', user.id);
      
      if (error) {
        return {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        };
      }
      
      return {
        success: true,
        timestamp: new Date().toISOString(),
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to delete workflow',
        timestamp: new Date().toISOString(),
      };
    }
  }
  
  /**
   * Get workflow templates
   */
  async getWorkflowTemplates(): Promise<ApiResponse> {
    try {
      const { data, error } = await supabase
        .from('workflow_templates')
        .select('*')
        .eq('is_public', true)
        .order('usage_count', { ascending: false });
      
      if (error) {
        return {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        };
      }
      
      const templates = data.map(template => ({
        id: `template-${template.id}`,
        name: template.name,
        description: template.description || '',
        isActive: false,
        status: 'draft',
        executions: 0,
        createdAt: new Date(template.created_at),
        updatedAt: new Date(template.updated_at),
        targetUrl: '*',
        nodes: template.nodes || [],
        connections: template.connections || [],
      }));
      
      return {
        success: true,
        data: templates,
        timestamp: new Date().toISOString(),
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to load templates',
        timestamp: new Date().toISOString(),
      };
    }
  }
  
  /**
   * Get user analytics stats
   */
  async getUserStats(): Promise<ApiResponse> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated',
          timestamp: new Date().toISOString(),
        };
      }
      
      // Get user's workflows first
      const { data: userWorkflows, error: workflowError } = await supabase
        .from('workflows')
        .select('id, is_active')
        .eq('user_id', user.id);

      if (workflowError) {
        return {
          success: false,
          error: workflowError.message,
          timestamp: new Date().toISOString(),
        };
      }

      const workflows = userWorkflows || [];
      const userWorkflowIds = workflows.map(w => w.id);

      if (userWorkflowIds.length === 0) {
        return {
          success: true,
          data: {
            total_workflows: 0,
            active_workflows: 0,
            total_executions: 0,
            total_events: 0,
            avg_success_rate: 0,
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Get ALL execution data for user's workflows (including anonymous executions)
      // This is the key fix - we query by workflow_id (which the user owns) rather than user_id
      const [executionsResult, eventsResult] = await Promise.all([
        supabase
          .from('workflow_executions')
          .select('status')
          .in('workflow_id', userWorkflowIds), // Query by workflow ownership, not execution user_id
        supabase
          .from('analytics_events')
          .select('id')
          .in('workflow_id', userWorkflowIds) // Query by workflow ownership
      ]);
      
      const executions = executionsResult.data || [];
      const events = eventsResult.data || [];
      
      const stats = {
        total_workflows: workflows.length,
        active_workflows: workflows.filter(w => w.is_active).length,
        total_executions: executions.length, // Now includes all executions for user's workflows
        total_events: events.length, // Now includes all events for user's workflows
        avg_success_rate: executions.length > 0 
          ? (executions.filter(e => e.status === 'success').length / executions.length) * 100 
          : 0,
      };
      
      return {
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
      };
      
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to load user stats',
        timestamp: new Date().toISOString(),
      };
    }
  }
  
  /**
   * Get workflow executions
   */
  async getWorkflowExecutions(workflowId?: string, limit: number = 50): Promise<ApiResponse> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated',
          timestamp: new Date().toISOString(),
        };
      }
      
      // If a specific workflow is requested, verify the user owns it
      if (workflowId) {
        const { data: workflow, error: workflowError } = await supabase
          .from('workflows')
          .select('id')
          .eq('id', workflowId)
          .eq('user_id', user.id)
          .single();
          
        if (workflowError || !workflow) {
          return {
            success: false,
            error: 'Workflow not found or access denied',
            timestamp: new Date().toISOString(),
          };
        }
        
        // Get all executions for this specific workflow (including anonymous)
        const { data, error } = await supabase
          .from('workflow_executions')
          .select('*')
          .eq('workflow_id', workflowId)
          .order('executed_at', { ascending: false })
          .limit(limit);
        
        if (error) {
          return {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString(),
          };
        }
        
        return {
          success: true,
          data: data || [],
          timestamp: new Date().toISOString(),
        };
      } else {
        // Get all of user's workflows first
        const { data: userWorkflows, error: workflowError } = await supabase
          .from('workflows')
          .select('id')
          .eq('user_id', user.id);
          
        if (workflowError) {
          return {
            success: false,
            error: workflowError.message,
            timestamp: new Date().toISOString(),
          };
        }
        
        const userWorkflowIds = userWorkflows?.map(w => w.id) || [];
        
        if (userWorkflowIds.length === 0) {
          return {
            success: true,
            data: [],
            timestamp: new Date().toISOString(),
          };
        }
        
        // Get all executions for user's workflows (including anonymous executions)
        const { data, error } = await supabase
          .from('workflow_executions')
          .select('*')
          .in('workflow_id', userWorkflowIds) // Query by workflow ownership
          .order('executed_at', { ascending: false })
          .limit(limit);
        
        if (error) {
          return {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString(),
          };
        }
        
        return {
          success: true,
          data: data || [],
          timestamp: new Date().toISOString(),
        };
      }
      
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to load executions',
        timestamp: new Date().toISOString(),
      };
    }
  }
  
  /**
   * Get total page visits count across all workflows
   */
  async getTotalPageVisits(days: number = 30): Promise<ApiResponse> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated',
          timestamp: new Date().toISOString(),
        };
      }
      
      // Get all page_load and page_view events for user's workflows
      const { data, error } = await supabase
        .from('analytics_events')
        .select(`
          id,
          event_type,
          session_id,
          page_url,
          created_at,
          workflows!inner(user_id)
        `)
        .eq('workflows.user_id', user.id)
        .in('event_type', ['page_load', 'page_view'])
        .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());
      
      if (error) {
        return {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        };
      }
      
      const events = data || [];
      
      // Calculate various metrics
      const totalPageVisits = events.length;
      const uniqueSessions = new Set(events.map(e => e.session_id)).size;
      const uniquePages = new Set(events.map(e => e.page_url)).size;
      
      // Group by date for trend data
      const visitsByDate = events.reduce((acc, event) => {
        const date = new Date(event.created_at).toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // Get today's visits
      const today = new Date().toISOString().split('T')[0];
      const todayVisits = visitsByDate[today] || 0;
      
      return {
        success: true,
        data: {
          totalPageVisits,
          uniqueSessions,
          uniquePages,
          todayVisits,
          visitsByDate,
          events: events.slice(0, 100) // Return recent 100 events for detail view
        },
        timestamp: new Date().toISOString(),
      };
      
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to load page visits',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get page analytics for user's workflows
   */
  async getPageAnalytics(workflowId?: string, days: number = 30): Promise<ApiResponse> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated',
          timestamp: new Date().toISOString(),
        };
      }
      
      // Build the query for analytics events with page information
      let query = supabase
        .from('analytics_events')
        .select(`
          id,
          workflow_id,
          session_id,
          event_type,
          page_url,
          page_title,
          referrer_url,
          device_type,
          browser_info,
          user_agent,
          viewport_size,
          screen_size,
          event_data,
          created_at,
          workflows!inner(name, user_id)
        `)
        .eq('workflows.user_id', user.id)
        .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });
      
      if (workflowId) {
        query = query.eq('workflow_id', workflowId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        return {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        };
      }
      
      return {
        success: true,
        data: data || [],
        timestamp: new Date().toISOString(),
      };
      
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to load page analytics',
        timestamp: new Date().toISOString(),
      };
    }
  }
  
  /**
   * Get page analytics summary for workflows
   */
  async getPageAnalyticsSummary(workflowId?: string, days: number = 30): Promise<ApiResponse> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated',
          timestamp: new Date().toISOString(),
        };
      }
      
      // Get user's workflows first
      const { data: userWorkflows, error: workflowError } = await supabase
        .from('workflows')
        .select('id, name')
        .eq('user_id', user.id);
      
      if (workflowError) {
        console.error('Error fetching workflows:', workflowError);
        return {
          success: false,
          error: workflowError.message,
          timestamp: new Date().toISOString(),
        };
      }
      
      const userWorkflowIds = userWorkflows?.map(w => w.id) || [];
      
      if (userWorkflowIds.length === 0) {
        return {
          success: true,
          data: { executions: [], events: [] },
          timestamp: new Date().toISOString(),
        };
      }
      
      console.log('User workflows:', userWorkflowIds);
      
      // Get workflow executions for user's workflows (including anonymous executions)
      let executionQuery = supabase
        .from('workflow_executions')
        .select(`
          id,
          workflow_id,
          page_url,
          user_agent,
          session_id,
          status,
          execution_time_ms,
          executed_at
        `)
        .in('workflow_id', userWorkflowIds)
        .gte('executed_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
        .order('executed_at', { ascending: false });
      
      if (workflowId) {
        executionQuery = executionQuery.eq('workflow_id', workflowId);
      }
      
      const { data: executions, error: executionError } = await executionQuery;
      
      if (executionError) {
        console.error('Error fetching executions:', executionError);
      }
      
      // Get analytics events for user's workflows (including anonymous events)
      let eventQuery = supabase
        .from('analytics_events')
        .select(`
          workflow_id,
          page_url,
          page_title,
          referrer_url,
          device_type,
          session_id,
          event_type,
          created_at
        `)
        .in('workflow_id', userWorkflowIds)
        .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());
      
      if (workflowId) {
        eventQuery = eventQuery.eq('workflow_id', workflowId);
      }
      
      const { data: events, error: eventError } = await eventQuery;
      
      if (eventError) {
        console.error('Error fetching events:', eventError);
      }
      
      console.log('Page analytics summary:', {
        userWorkflows: userWorkflowIds.length,
        executions: executions?.length || 0,
        events: events?.length || 0
      });
      
      return {
        success: true,
        data: {
          executions: executions || [],
          events: events || []
        },
        timestamp: new Date().toISOString(),
      };
      
    } catch (error: any) {
      console.error('Error in getPageAnalyticsSummary:', error);
      return {
        success: false,
        error: error.message || 'Failed to load page analytics summary',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get detailed action tracking data with individual action performance
   */
  async getActionTrackingData(workflowId?: string, days: number = 30): Promise<ApiResponse> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated',
          timestamp: new Date().toISOString(),
        };
      }

      // Get user's workflows
      const { data: userWorkflows, error: workflowError } = await supabase
        .from('workflows')
        .select('id, name')
        .eq('user_id', user.id);

      if (workflowError) {
        return {
          success: false,
          error: workflowError.message,
          timestamp: new Date().toISOString(),
        };
      }

      const userWorkflowIds = userWorkflows?.map(w => w.id) || [];

      if (userWorkflowIds.length === 0) {
        return {
          success: true,
          data: [],
          timestamp: new Date().toISOString(),
        };
      }

      // Get action execution events from analytics_events where event_type = 'action_executed'
      let query = supabase
        .from('analytics_events')
        .select(`
          id,
          workflow_id,
          workflow_execution_id,
          session_id,
          event_type,
          element_selector,
          element_text,
          page_url,
          page_title,
          device_type,
          user_agent,
          event_data,
          created_at
        `)
        .in('workflow_id', userWorkflowIds)
        .eq('event_type', 'action_executed')
        .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      if (workflowId) {
        query = query.eq('workflow_id', workflowId);
      }

      const { data, error } = await query;

      if (error) {
        return {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        };
      }

      console.log(`✅ Loaded ${data?.length || 0} action tracking events`);
      return {
        success: true,
        data: data || [],
        timestamp: new Date().toISOString(),
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to load action tracking data',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get detailed user interaction events (clicks, hovers, scrolls, form submissions, etc.)
   */
  async getUserInteractionEvents(workflowId?: string, days: number = 30): Promise<ApiResponse> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated',
          timestamp: new Date().toISOString(),
        };
      }

      // Get user's workflows
      const { data: userWorkflows, error: workflowError } = await supabase
        .from('workflows')
        .select('id, name')
        .eq('user_id', user.id);

      if (workflowError) {
        return {
          success: false,
          error: workflowError.message,
          timestamp: new Date().toISOString(),
        };
      }

      const userWorkflowIds = userWorkflows?.map(w => w.id) || [];

      if (userWorkflowIds.length === 0) {
        return {
          success: true,
          data: [],
          timestamp: new Date().toISOString(),
        };
      }

      // Get all user interaction events (excluding action_executed)
      let query = supabase
        .from('analytics_events')
        .select(`
          id,
          workflow_id,
          workflow_execution_id,
          session_id,
          event_type,
          element_selector,
          element_text,
          element_attributes,
          page_url,
          page_title,
          referrer_url,
          device_type,
          browser_info,
          user_agent,
          viewport_size,
          screen_size,
          event_data,
          created_at
        `)
        .in('workflow_id', userWorkflowIds)
        .neq('event_type', 'action_executed') // Exclude action tracking events
        .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(500); // Limit to prevent overwhelming response

      if (workflowId) {
        query = query.eq('workflow_id', workflowId);
      }

      const { data, error } = await query;

      if (error) {
        return {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        };
      }

      console.log(`✅ Loaded ${data?.length || 0} user interaction events`);
      return {
        success: true,
        data: data || [],
        timestamp: new Date().toISOString(),
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to load user interaction events',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get detailed workflow execution data with associated actions
   */
  async getDetailedWorkflowExecutions(workflowId?: string, days: number = 30): Promise<ApiResponse> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated',
          timestamp: new Date().toISOString(),
        };
      }

      // Get user's workflows
      const { data: userWorkflows, error: workflowError } = await supabase
        .from('workflows')
        .select('id, name')
        .eq('user_id', user.id);

      if (workflowError) {
        return {
          success: false,
          error: workflowError.message,
          timestamp: new Date().toISOString(),
        };
      }

      const userWorkflowIds = userWorkflows?.map(w => w.id) || [];

      if (userWorkflowIds.length === 0) {
        return {
          success: true,
          data: [],
          timestamp: new Date().toISOString(),
        };
      }

      // Get detailed workflow executions
      let executionQuery = supabase
        .from('workflow_executions')
        .select(`
          id,
          workflow_id,
          user_id,
          status,
          execution_time_ms,
          error_message,
          page_url,
          user_agent,
          session_id,
          executed_at
        `)
        .in('workflow_id', userWorkflowIds)
        .gte('executed_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
        .order('executed_at', { ascending: false })
        .limit(200);

      if (workflowId) {
        executionQuery = executionQuery.eq('workflow_id', workflowId);
      }

      const { data: executions, error: executionError } = await executionQuery;

      if (executionError) {
        return {
          success: false,
          error: executionError.message,
          timestamp: new Date().toISOString(),
        };
      }

      // For each execution, get associated action events
      const executionsWithActions = await Promise.all(
        (executions || []).map(async (execution) => {
          const { data: actions } = await supabase
            .from('analytics_events')
            .select(`
              id,
              event_type,
              element_selector,
              element_text,
              event_data,
              created_at
            `)
            .eq('workflow_execution_id', execution.id)
            .eq('event_type', 'action_executed')
            .order('created_at', { ascending: true });

          return {
            ...execution,
            actions: actions || []
          };
        })
      );

      console.log(`✅ Loaded ${executionsWithActions.length} detailed executions with actions`);
      return {
        success: true,
        data: executionsWithActions,
        timestamp: new Date().toISOString(),
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to load detailed workflow executions',
        timestamp: new Date().toISOString(),
      };
    }
  }
  
  /**
   * Scrape website content
   */
  async scrapeWebsite(url: string): Promise<ApiResponse> {
    try {
      const apiUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3001/api/scrape'
        : 'https://trackflow-webapp-production.up.railway.app/api/scrape';
      
      const data = await this.requestWithRetry(apiUrl, {
        method: 'POST',
        body: JSON.stringify({ url }),
      });
      
      return {
        success: true,
        data,
        timestamp: new Date().toISOString(),
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to scrape website',
        timestamp: new Date().toISOString(),
      };
    }
  }
}

// Export singleton instance
export const apiClient = new ApiClient(); 