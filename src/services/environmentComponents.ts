import { supabase } from '../lib/supabase';

export interface EnvironmentComponent {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  component_type: 'css_selector' | 'url' | 'text' | 'custom';
  value: string;
  metadata?: Record<string, any>;
  tags?: string[];
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateEnvironmentComponent {
  name: string;
  description?: string;
  component_type: 'css_selector' | 'url' | 'text' | 'custom';
  value: string;
  metadata?: Record<string, any>;
  tags?: string[];
}

export interface UpdateEnvironmentComponent {
  name?: string;
  description?: string;
  component_type?: 'css_selector' | 'url' | 'text' | 'custom';
  value?: string;
  metadata?: Record<string, any>;
  tags?: string[];
}

/**
 * Fetch all environment components for the current user
 */
export async function getEnvironmentComponents(): Promise<EnvironmentComponent[]> {
  const { data, error } = await supabase
    .from('environment_components')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching environment components:', error);
    throw error;
  }

  return data || [];
}

/**
 * Fetch environment components by type
 */
export async function getEnvironmentComponentsByType(
  type: 'css_selector' | 'url' | 'text' | 'custom'
): Promise<EnvironmentComponent[]> {
  const { data, error } = await supabase
    .from('environment_components')
    .select('*')
    .eq('component_type', type)
    .order('usage_count', { ascending: false });

  if (error) {
    console.error('Error fetching environment components by type:', error);
    throw error;
  }

  return data || [];
}

/**
 * Search environment components by name or tags
 */
export async function searchEnvironmentComponents(
  query: string
): Promise<EnvironmentComponent[]> {
  const { data, error } = await supabase
    .from('environment_components')
    .select('*')
    .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
    .order('usage_count', { ascending: false });

  if (error) {
    console.error('Error searching environment components:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get a single environment component by ID
 */
export async function getEnvironmentComponent(
  id: string
): Promise<EnvironmentComponent | null> {
  const { data, error } = await supabase
    .from('environment_components')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching environment component:', error);
    throw error;
  }

  return data;
}

/**
 * Create a new environment component
 */
export async function createEnvironmentComponent(
  component: CreateEnvironmentComponent
): Promise<EnvironmentComponent> {
  const { data: userData } = await supabase.auth.getUser();
  
  if (!userData.user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('environment_components')
    .insert({
      ...component,
      user_id: userData.user.id,
      usage_count: 0
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating environment component:', error);
    throw error;
  }

  return data;
}

/**
 * Update an existing environment component
 */
export async function updateEnvironmentComponent(
  id: string,
  updates: UpdateEnvironmentComponent
): Promise<EnvironmentComponent> {
  const { data, error } = await supabase
    .from('environment_components')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating environment component:', error);
    throw error;
  }

  return data;
}

/**
 * Delete an environment component
 */
export async function deleteEnvironmentComponent(id: string): Promise<void> {
  const { error } = await supabase
    .from('environment_components')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting environment component:', error);
    throw error;
  }
}

/**
 * Increment the usage count of a component
 */
export async function incrementComponentUsage(id: string): Promise<void> {
  const { error } = await supabase.rpc('increment_component_usage', {
    component_id: id
  });

  if (error) {
    console.error('Error incrementing component usage:', error);
    // Don't throw - this is not critical
  }
}

/**
 * Duplicate an environment component
 */
export async function duplicateEnvironmentComponent(
  id: string,
  newName: string
): Promise<EnvironmentComponent> {
  const original = await getEnvironmentComponent(id);
  
  if (!original) {
    throw new Error('Component not found');
  }

  return createEnvironmentComponent({
    name: newName,
    description: original.description,
    component_type: original.component_type,
    value: original.value,
    metadata: original.metadata,
    tags: original.tags
  });
}

/**
 * Get most used components
 */
export async function getMostUsedComponents(
  limit: number = 10
): Promise<EnvironmentComponent[]> {
  const { data, error } = await supabase
    .from('environment_components')
    .select('*')
    .order('usage_count', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching most used components:', error);
    throw error;
  }

  return data || [];
}

