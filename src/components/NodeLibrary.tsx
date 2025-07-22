import React, { useState } from 'react';
import { X, Plus, AlertTriangle } from 'lucide-react';
import { WorkflowNode, NodeTemplate, Workflow } from '../types/workflow';
import { nodeTemplates } from '../data/nodeTemplates';
import * as Icons from 'lucide-react';

interface NodeLibraryProps {
  onNodeAdd: (node: WorkflowNode) => void;
  onClose: () => void;
  connectingFromNode?: string | null;
  currentWorkflow: Workflow;
}

const NodeLibrary: React.FC<NodeLibraryProps> = ({ onNodeAdd, onClose, connectingFromNode, currentWorkflow }) => {
  const hasExistingTrigger = currentWorkflow.nodes.some(node => node.type === 'trigger');
  const isEmptyWorkflow = currentWorkflow.nodes.length === 0;

  // Separate triggers and operations
  const triggerTemplates = nodeTemplates.filter(template => template.type === 'trigger');
  const operationTemplates = nodeTemplates.filter(template => template.type !== 'trigger');

  const handleAddNode = (template: NodeTemplate) => {
    // Validation: First node must be a trigger
    if (currentWorkflow.nodes.length === 0 && template.type !== 'trigger') {
      alert('The first node in a workflow must be a trigger. Please add a trigger node first.');
      return;
    }

    // Check if trying to add a trigger when one already exists
    if (template.type === 'trigger' && hasExistingTrigger) {
      const confirmReplace = window.confirm(
        'A workflow can only have one trigger. Do you want to replace the existing trigger?'
      );
      if (!confirmReplace) {
        return;
      }
    }

    const newNode: WorkflowNode = {
      id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: template.type,
      category: template.category,
      name: template.name,
      description: template.description,
      icon: template.icon,
      position: { x: 0, y: 0 }, // Position will be calculated by WorkflowBuilder
      config: { ...template.defaultConfig },
      inputs: template.type === 'trigger' ? [] : ['input'],
      outputs: ['output']
    };

    onNodeAdd(newNode);
  };

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'trigger': return 'bg-blue-500';
      case 'action': return 'bg-green-500';
      case 'condition': return 'bg-orange-500';
      default: return 'bg-secondary-500';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white border border-secondary-200 rounded-lg w-full max-w-4xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-secondary-200">
          <div>
            <h2 className="text-2xl font-medium text-secondary-900">
              {connectingFromNode ? 'Add Connected Node' : 'Node Library'}
            </h2>
            {connectingFromNode && (
              <p className="text-sm text-secondary-600 mt-1">
                Select a node to connect to your trigger
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary-100 rounded-lg text-secondary-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Triggers Section */}
          {triggerTemplates.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-secondary-900 mb-4">Triggers</h3>
              {hasExistingTrigger && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm text-yellow-800">
                    Adding a trigger will replace the existing one
                  </span>
                </div>
              )}
              <div className="grid gap-3 md:grid-cols-2">
                {triggerTemplates.map((template) => {
                  const IconComponent = Icons[template.icon as keyof typeof Icons] as React.ComponentType<any>;
                  return (
                    <div
                      key={template.id}
                      className={`bg-white border border-secondary-200 rounded-lg p-4 hover:border-secondary-300 transition-colors cursor-pointer ${
                        hasExistingTrigger ? 'opacity-75' : ''
                      }`}
                      onClick={() => handleAddNode(template)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <div className={`w-8 h-8 rounded-lg ${getNodeColor(template.type)} flex items-center justify-center`}>
                            {IconComponent && <IconComponent className="w-4 h-4 text-white" />}
                          </div>
                          <div>
                            <h3 className="font-semibold text-secondary-900">{template.name}</h3>
                            <p className="text-sm text-secondary-600">{template.category}</p>
                          </div>
                        </div>
                        <button className="p-2 hover:bg-secondary-100 rounded-lg text-secondary-400 hover:text-primary-600 transition-colors">
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-sm text-secondary-600">{template.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Operations Section */}
          {operationTemplates.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-secondary-900 mb-4">Operations</h3>
              {isEmptyWorkflow && (
                <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                  <span className="text-sm text-orange-800">
                    Add a trigger first before adding operations
                  </span>
                </div>
              )}
              <div className="grid gap-3 md:grid-cols-2">
                {operationTemplates.map((template) => {
                  const IconComponent = Icons[template.icon as keyof typeof Icons] as React.ComponentType<any>;
                  const isDisabled = isEmptyWorkflow;
                  return (
                    <div
                      key={template.id}
                      className={`bg-white border border-secondary-200 rounded-lg p-4 transition-colors ${
                        isDisabled 
                          ? 'opacity-50 cursor-not-allowed' 
                          : 'hover:border-secondary-300 cursor-pointer'
                      }`}
                      onClick={() => !isDisabled && handleAddNode(template)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <div className={`w-8 h-8 rounded-lg ${getNodeColor(template.type)} flex items-center justify-center ${
                            isDisabled ? 'opacity-60' : ''
                          }`}>
                            {IconComponent && <IconComponent className="w-4 h-4 text-white" />}
                          </div>
                          <div>
                            <h3 className={`font-semibold ${isDisabled ? 'text-secondary-500' : 'text-secondary-900'}`}>
                              {template.name}
                            </h3>
                            <p className={`text-sm ${isDisabled ? 'text-secondary-400' : 'text-secondary-600'}`}>
                              {template.category}
                            </p>
                          </div>
                        </div>
                        <button 
                          className={`p-2 rounded-lg transition-colors ${
                            isDisabled 
                              ? 'text-secondary-300 cursor-not-allowed' 
                              : 'hover:bg-secondary-100 text-secondary-400 hover:text-primary-600'
                          }`}
                          disabled={isDisabled}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <p className={`text-sm ${isDisabled ? 'text-secondary-400' : 'text-secondary-600'}`}>
                        {template.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NodeLibrary;