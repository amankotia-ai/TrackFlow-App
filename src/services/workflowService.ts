import { apiClient, ApiResponse } from '../lib/apiClient';
import { Workflow } from '../types/workflow';

/**
 * Simple, reliable WorkflowService using the new ApiClient
 * No more complex transformations or timeout handling - that's in ApiClient
 */
export class WorkflowService {
  /**
   * Get all workflows for the current user
   */
  static async getUserWorkflows(): Promise<Workflow[]> {
    console.log('📋 Loading user workflows...');
    
    const response: ApiResponse = await apiClient.getUserWorkflows();
    
    if (!response.success) {
      console.error('Failed to load workflows:', response.error);
      throw new Error(response.error || 'Failed to load workflows');
    }
    
    console.log(`✅ Loaded ${response.data?.length || 0} workflows`);
    return response.data || [];
  }

  /**
   * Save a workflow (create or update)
   */
  static async saveWorkflow(workflow: Workflow): Promise<Workflow> {
    console.log(`💾 Saving workflow: ${workflow.name}...`);
    
    const response: ApiResponse = await apiClient.saveWorkflow(workflow);
    
    if (!response.success) {
      console.error('Failed to save workflow:', response.error);
      throw new Error(response.error || 'Failed to save workflow');
    }
    
    console.log(`✅ Saved workflow: ${response.data.name}`);
    return response.data;
  }

  /**
   * Delete a workflow
   */
  static async deleteWorkflow(workflowId: string): Promise<void> {
    console.log(`🗑️ Deleting workflow: ${workflowId}...`);
    
    const response: ApiResponse = await apiClient.deleteWorkflow(workflowId);
    
    if (!response.success) {
      console.error('Failed to delete workflow:', response.error);
      throw new Error(response.error || 'Failed to delete workflow');
    }
    
    console.log('✅ Workflow deleted successfully');
  }

  /**
   * Get workflow templates (public templates)
   */
  static async getWorkflowTemplates(): Promise<Workflow[]> {
    console.log('📋 Loading workflow templates...');
    
    const response: ApiResponse = await apiClient.getWorkflowTemplates();
    
    if (!response.success) {
      console.error('Failed to load templates:', response.error);
      throw new Error(response.error || 'Failed to load templates');
    }
    
    console.log(`✅ Loaded ${response.data?.length || 0} templates`);
    return response.data || [];
  }

  /**
   * Get a workflow by its ID
   */
  static async getWorkflowById(workflowId: string): Promise<Workflow | null> {
    console.log(`🔍 Loading workflow by ID: ${workflowId}...`);
    
    try {
      // Get all workflows and find the one we need
      // This is simpler than creating a separate API method
      const workflows = await this.getUserWorkflows();
      const workflow = workflows.find(w => w.id === workflowId);
      
      if (!workflow) {
        console.warn(`Workflow ${workflowId} not found`);
        return null;
      }
      
      console.log(`✅ Found workflow: ${workflow.name}`);
      return workflow;
    } catch (error) {
      console.error('Error loading workflow by ID:', error);
      return null;
    }
  }

  /**
   * Generate API key for user
   */
  static async generateApiKey(keyName: string): Promise<string> {
    console.log(`🔑 Generating API key: ${keyName}...`);
    
    const response: ApiResponse = await apiClient.generateApiKey(keyName);
    
    if (!response.success) {
      console.error('Failed to generate API key:', response.error);
      throw new Error(response.error || 'Failed to generate API key');
    }
    
    console.log('✅ API key generated successfully');
    return response.data;
  }

  /**
   * Get user's API keys
   */
  static async getUserApiKeys(): Promise<any[]> {
    console.log('🔑 Loading user API keys...');
    
    const response: ApiResponse = await apiClient.getUserApiKeys();
    
    if (!response.success) {
      console.error('Failed to load API keys:', response.error);
      throw new Error(response.error || 'Failed to load API keys');
    }
    
    console.log(`✅ Loaded ${response.data?.length || 0} API keys`);
    return response.data || [];
  }

  /**
   * Delete an API key
   */
  static async deleteApiKey(keyId: string): Promise<void> {
    console.log(`🗑️ Deleting API key: ${keyId}...`);
    
    const response: ApiResponse = await apiClient.deleteApiKey(keyId);
    
    if (!response.success) {
      console.error('Failed to delete API key:', response.error);
      throw new Error(response.error || 'Failed to delete API key');
    }
    
    console.log('✅ API key deleted successfully');
  }

  /**
   * Update an API key
   */
  static async updateApiKey(keyId: string, updates: { key_name?: string; is_active?: boolean }): Promise<any> {
    console.log(`✏️ Updating API key: ${keyId}...`);
    
    const response: ApiResponse = await apiClient.updateApiKey(keyId, updates);
    
    if (!response.success) {
      console.error('Failed to update API key:', response.error);
      throw new Error(response.error || 'Failed to update API key');
    }
    
    console.log('✅ API key updated successfully');
    return response.data;
  }
} 