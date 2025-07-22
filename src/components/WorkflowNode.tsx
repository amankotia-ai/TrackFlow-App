import React from 'react';
import { MoreHorizontal, Trash2, Copy, Edit, Plus } from 'lucide-react';
import { WorkflowNode as WorkflowNodeType } from '../types/workflow';
import * as Icons from 'lucide-react';

interface WorkflowNodeProps {
  node: WorkflowNodeType;
  isSelected: boolean;
  onSelect: () => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onDelete: () => void;
  onAddConnection?: () => void;
}

const WorkflowNode: React.FC<WorkflowNodeProps> = ({
  node,
  isSelected,
  onSelect,
  onMouseDown,
  onDelete,
  onAddConnection
}) => {
  const IconComponent = Icons[node.icon as keyof typeof Icons] as React.ComponentType<any>;

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'trigger': return 'bg-blue-500';
      case 'action': return 'bg-green-500';
      case 'condition': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getNodeBorderColor = (type: string) => {
    switch (type) {
      case 'trigger': return '';
      case 'action': return '';
      case 'condition': return '';
      default: return '';
    }
  };

  return (
    <div className="relative group">
      <div
        className={`w-80 bg-white border border-secondary-200 rounded-lg cursor-grab active:cursor-grabbing transition-all duration-200 ${
          isSelected ? 'ring-2 ring-primary-200' : ''
        }`}
        onClick={onSelect}
        onMouseDown={onMouseDown}
      >
        {/* Header */}
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getNodeColor(node.type)}`}>
                {IconComponent && <IconComponent className="w-5 h-5 text-white" />}
              </div>
              <div>
                <h3 className="font-semibold text-secondary-900">{node.name}</h3>
                <p className="text-sm text-secondary-600">{node.category}</p>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="p-1 hover:bg-secondary-100 rounded text-secondary-400 hover:text-red-600 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button className="p-1 hover:bg-secondary-100 rounded text-secondary-400 transition-colors">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 pb-4">
          <p className="text-sm text-secondary-600 mb-3">{node.description}</p>
          
          {/* Configuration Preview */}
          <div className="space-y-2">
            {Object.entries(node.config).slice(0, 2).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-xs text-secondary-500 font-medium">{key}:</span>
                <span className="text-xs text-secondary-700 truncate max-w-32">
                  {typeof value === 'string' ? value : JSON.stringify(value)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Connection Points - Only show for trigger nodes */}
        {node.type === 'trigger' && node.inputs.length > 0 && (
          <div className="absolute -left-2 top-1/2 transform -translate-y-1/2">
            <div className="w-4 h-4 bg-primary-500 rounded-full border-2 border-white" />
          </div>
        )}
        {node.type === 'trigger' && node.outputs.length > 0 && (
          <div className="absolute -right-2 top-1/2 transform -translate-y-1/2">
            <div className="w-4 h-4 bg-primary-500 rounded-full border-2 border-white" />
          </div>
        )}
      </div>

      {/* Hover Add Button - Only show for trigger nodes */}
      {node.type === 'trigger' && onAddConnection && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddConnection();
          }}
          className="absolute -right-12 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-primary-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-primary-700 flex items-center justify-center border border-secondary-200"
        >
          <Plus className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default WorkflowNode;