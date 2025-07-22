import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed. Use POST.' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const body = await req.json()
    const {
      workflowId,
      userId,
      status = 'success',
      executionTimeMs,
      pageUrl,
      sessionId,
      errorMessage,
      userAgent,
      deviceType,
      actions = []
    } = body

    // Validate required fields
    if (!workflowId) {
      return new Response(
        JSON.stringify({ success: false, error: 'workflowId is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`📊 Tracking execution for workflow ${workflowId}:`, {
      status,
      executionTimeMs,
      pageUrl,
      actionsExecuted: actions.length
    })

    // Track the workflow execution using the database function
    const { data: executionId, error: executionError } = await supabaseClient.rpc('track_workflow_execution', {
      p_workflow_id: workflowId,
      p_user_id: userId,
      p_status: status,
      p_execution_time_ms: executionTimeMs || null,
      p_error_message: errorMessage || null,
      p_page_url: pageUrl || null,
      p_session_id: sessionId || null,
      p_user_agent: userAgent || null
    })

    if (executionError) {
      console.error('Failed to track workflow execution:', executionError)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to track execution',
          details: executionError.message
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`✅ Workflow execution tracked successfully: ${executionId}`)

    // Track individual action executions if provided
    if (actions.length > 0 && executionId) {
      const actionPromises = actions.map(async (action: any) => {
        return supabaseClient.rpc('track_analytics_event', {
          p_user_id: userId,
          p_workflow_id: workflowId,
          p_workflow_execution_id: executionId,
          p_session_id: sessionId || null,
          p_event_type: 'action_executed',
          p_element_selector: action.selector || null,
          p_element_text: action.text || null,
          p_page_url: pageUrl || null,
          p_device_type: deviceType || null,
          p_event_data: {
            action_name: action.name,
            action_config: action.config,
            execution_time_ms: action.executionTimeMs || null
          }
        })
      })

      await Promise.allSettled(actionPromises)
      console.log(`📈 Tracked ${actions.length} action executions`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        executionId,
        message: 'Workflow execution tracked successfully',
        data: {
          workflowId,
          status,
          actionsTracked: actions.length
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in track-execution endpoint:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        details: error.message
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}) 