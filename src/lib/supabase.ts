import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xlzihfstoqdbgdegqkoi.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsemloZnN0b3FkYmdkZWdxa29pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMTUzMDQsImV4cCI6MjA2ODU5MTMwNH0.uE0aEwBJN-sQCesYVjKNJdRyBAaaI_q0tFkSlTBilHw'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
})

// Types for our database
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          organization: string | null
          plan: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          organization?: string | null
          plan?: string
        }
        Update: {
          full_name?: string | null
          avatar_url?: string | null
          organization?: string | null
          plan?: string
        }
      }
      workflows: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          is_active: boolean
          status: 'draft' | 'active' | 'paused' | 'error'
          target_url: string
          executions: number
          last_run: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          name: string
          description?: string | null
          is_active?: boolean
          status?: 'draft' | 'active' | 'paused' | 'error'
          target_url?: string
        }
        Update: {
          name?: string
          description?: string | null
          is_active?: boolean
          status?: 'draft' | 'active' | 'paused' | 'error'
          target_url?: string
        }
      }
      user_api_keys: {
        Row: {
          id: string
          user_id: string
          key_name: string
          api_key: string
          is_active: boolean
          last_used: string | null
          created_at: string
          expires_at: string | null
        }
        Insert: {
          user_id: string
          key_name: string
          api_key: string
          is_active?: boolean
          expires_at?: string | null
        }
        Update: {
          key_name?: string
          is_active?: boolean
          expires_at?: string | null
        }
      }
    }
    Views: {
      workflows_with_nodes: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          is_active: boolean
          status: 'draft' | 'active' | 'paused' | 'error'
          target_url: string
          executions: number
          last_run: string | null
          created_at: string
          updated_at: string
          nodes: any[]
          connections: any[]
        }
      }
    }
    Functions: {
      save_workflow_complete: {
        Args: {
          p_workflow_id?: string
          p_user_id: string
          p_name: string
          p_description?: string
          p_is_active: boolean
          p_status: string
          p_target_url: string
          p_nodes: any
          p_connections: any
        }
        Returns: string
      }
      generate_api_key: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_workflow_stats: {
        Args: {
          p_user_id: string
        }
        Returns: {
          total_workflows: number
          active_workflows: number
          total_executions: number
          total_events: number
          avg_success_rate: number
        }[]
      }
    }
  }
} 