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