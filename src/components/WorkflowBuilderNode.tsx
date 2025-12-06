import React, { memo, useState, useEffect } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import * as Icons from 'lucide-react';
import { WorkflowNode } from '../types/workflow';
import { Trash2, Database } from 'lucide-react';
import { nodeTemplates } from '../data/nodeTemplates';

const getNodeTypeColor = (type: string) => {
  switch (type) {
    case 'trigger': return 'text-green-600'; // Green for triggers
    case 'action': return 'text-blue-600'; // Blue for actions (operations)
    case 'condition': return 'text-purple-600'; // Purple for conditions
    default: return 'text-zinc-900';
  }
};

const getNodeTypeBg = (type: string) => {
  switch (type) {
    case 'trigger': return 'bg-green-50';
    case 'action': return 'bg-blue-50';
    case 'condition': return 'bg-purple-50';
    default: return 'bg-zinc-50';
  }
};

const WorkflowBuilderNode = memo(({ data, selected }: NodeProps) => {
  const node = data.node as WorkflowNode;
  const IconComponent = Icons[node.icon as keyof typeof Icons] as React.ComponentType<any>;
  
  // Find template
  const template = nodeTemplates.find(t => t.name === node.name && t.type === node.type);

  // Local state for inputs to avoid frequent re-renders/focus loss
  const [config, setConfig] = useState(node.config);

  // Sync local state if node.config changes externally (e.g. undo/redo or initial load)
  useEffect(() => {
    setConfig(node.config);
  }, [node.config]);

  const handleUpdate = (key: string, value: any) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    if (data.onUpdate) {
      data.onUpdate({
        ...node,
        config: newConfig
      });
    }
  };

  const handleAction = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  return (
    <div className={`w-80 bg-white border rounded-md shadow-sm transition-all group
      ${selected ? 'ring-2 ring-primary-500 border-transparent shadow-md' : 'border-zinc-200 hover:border-zinc-300 hover:shadow-md'}
    `}>
      {/* Connection Handles - Top/Bottom Layout */}
      {node.type !== 'trigger' && (
        <Handle
          type="target"
          id="input"
          position={Position.Top}
          className="!w-3 !h-3 !bg-zinc-400 !border-2 !border-white hover:!bg-primary-500 hover:!w-4 hover:!h-4 transition-all"
        />
      )}
      <Handle
        type="source"
        id="output"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-zinc-400 !border-2 !border-white hover:!bg-primary-500 hover:!w-4 hover:!h-4 transition-all"
      />

      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-100 rounded-t-md">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`p-1 rounded bg-zinc-100 ${getNodeTypeColor(node.type)}`}>
              {IconComponent ? (
                <IconComponent className="size-3.5" />
              ) : (
                <Icons.Activity className="size-3.5" />
              )}
            </div>
            <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">{node.category}</span>
          </div>
          
          {/* Node Actions */}
          <div className={`flex items-center gap-1 ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
             {data.onDelete && (
              <button
                onClick={(e) => handleAction(e, () => data.onDelete(node.id))}
                className="p-1 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                title="Delete Node"
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
          </div>
        </div>
        
        <h3 className="font-semibold text-zinc-900 text-base leading-tight -ml-px">{node.name}</h3>
      </div>

      {/* Content & Config */}
      <div className="p-4 bg-white rounded-b-md">
        <p className="text-xs text-zinc-600 line-clamp-2 mb-3">
          {node.description}
        </p>
        
        {/* Configuration Fields */}
        {template?.configFields && template.configFields.length > 0 && (
          <div className="space-y-3 pt-3 border-t border-zinc-100">
            {template.configFields.map((field: any) => {
               const value = config[field.key] ?? field.default ?? '';
               
               return (
                 <div key={field.key} className="space-y-1">
                    <label className="block text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                        {field.label} {field.required && <span className="text-red-500">*</span>}
                    </label>
                    
                    {field.type === 'select' ? (
                        <select
                            value={value}
                            onChange={(e) => handleUpdate(field.key, e.target.value)}
                            className="w-full text-xs px-2 py-1.5 border border-zinc-200 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 bg-zinc-50"
                        >
                            {!field.required && <option value="">Select...</option>}
                            {field.options?.map((opt: any) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    ) : field.type === 'boolean' ? (
                         <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={!!value}
                                onChange={(e) => handleUpdate(field.key, e.target.checked)}
                                className="w-4 h-4 text-primary-600 rounded border-zinc-300 focus:ring-primary-500"
                            />
                            <span className="text-xs text-zinc-700">{field.description || field.label}</span>
                         </div>
                    ) : field.type === 'textarea' ? (
                        <textarea
                            value={value}
                            onChange={(e) => setConfig({ ...config, [field.key]: e.target.value })}
                            onBlur={(e) => handleUpdate(field.key, e.target.value)}
                            rows={3}
                            className="w-full text-xs px-2 py-1.5 border border-zinc-200 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 bg-zinc-50 resize-none"
                            placeholder={field.placeholder}
                        />
                    ) : (
                        <div className="flex items-center gap-1">
                            <input
                                type={field.type === 'number' ? 'number' : 'text'}
                                value={value}
                                onChange={(e) => {
                                    const val = field.type === 'number' ? e.target.value : e.target.value;
                                    setConfig({ ...config, [field.key]: val });
                                }}
                                onBlur={(e) => {
                                     const val = field.type === 'number' ? parseFloat(e.target.value) : e.target.value;
                                     handleUpdate(field.key, val);
                                }}
                                className="w-full text-xs px-2 py-1.5 border border-zinc-200 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 bg-zinc-50"
                                placeholder={field.placeholder}
                            />
                            {field.type === 'css-selector' && data.onOpenComponentPicker && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        data.onOpenComponentPicker((val: string) => {
                                            setConfig(prev => ({ ...prev, [field.key]: val }));
                                            handleUpdate(field.key, val);
                                        });
                                    }}
                                    className="p-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded border border-zinc-200 transition-colors"
                                    title="Select Component"
                                >
                                    <Database className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    )}
                 </div>
               );
            })}
          </div>
        )}
      </div>
    </div>
  );
});

WorkflowBuilderNode.displayName = 'WorkflowBuilderNode';

export default WorkflowBuilderNode;

