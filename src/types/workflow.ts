export interface WorkflowNode {
  id: string;
  type: 'trigger' | 'action' | 'condition';
  category: string;
  name: string;
  description: string;
  icon: string;
  position: { x: number; y: number };
  config: Record<string, any>;
  inputs: string[];
  outputs: string[];
}

export interface WorkflowConnection {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceHandle: string;
  targetHandle: string;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  createdAt: Date;
  updatedAt: Date;
  executions: number;
  lastRun?: Date;
  status: 'draft' | 'active' | 'paused' | 'error';
  targetUrl?: string;
}

export type TemplateCategoryGroup = 'generic' | 'trigger' | 'industry';

export interface TemplateMeta {
  group: TemplateCategoryGroup;
  categoryId: string;
  categoryLabel: string;
  icon?: string;
  summary?: string;
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
  estimatedTime?: string;
  tags?: string[];
}

export interface WorkflowTemplate extends Workflow {
  templateMeta: TemplateMeta;
}

export interface TemplateCategory {
  id: string;
  label: string;
  group: TemplateCategoryGroup;
  description?: string;
  icon?: string;
}

export interface TemplateCategoryGroupDefinition {
  id: TemplateCategoryGroup;
  label: string;
  description: string;
  categories: TemplateCategory[];
}

export interface NodeTemplate {
  id: string;
  type: 'trigger' | 'action' | 'condition';
  category: string;
  name: string;
  description: string;
  icon: string;
  defaultConfig: Record<string, any>;
  configFields: ConfigField[];
}

export interface ConfigField {
  key: string;
  type: 'text' | 'select' | 'number' | 'boolean' | 'textarea' | 'url' | 'css-selector';
  label: string;
  required: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  default?: any;
  description?: string;
}