import React, { useState } from 'react';
import { X, Target } from 'lucide-react';
import { WorkflowNode } from '../types/workflow';
import { nodeTemplates } from '../data/nodeTemplates';
import ElementSelectorButton from './ElementSelectorButton';
import { ScrapedElement } from '../utils/scraperEnhanced';

interface NodeConfigPanelProps {
  node: WorkflowNode;
  onNodeUpdate: (node: WorkflowNode) => void;
  onClose: () => void;
  scrapedElements?: ScrapedElement[];
  onElementSelectorOpen?: (fieldKey: string) => void;
}

const NodeConfigPanel: React.FC<NodeConfigPanelProps> = ({ node, onNodeUpdate, onClose, scrapedElements = [], onElementSelectorOpen }) => {
  // Find the template for this node by matching name and type
  const template = nodeTemplates.find(t => t.name === node.name && t.type === node.type);
  
  // Local state for staging changes before saving
  const [localNode, setLocalNode] = useState<WorkflowNode>({ ...node });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Debug logging
  console.log('Node:', node.name, node.type);
  console.log('Template found:', template ? template.name : 'Not found');
  console.log('Available templates:', nodeTemplates.map(t => `${t.name} (${t.type})`));

  const handleConfigChange = (key: string, value: any) => {
    const updatedNode = {
      ...localNode,
      config: {
        ...localNode.config,
        [key]: value
      }
    };
    setLocalNode(updatedNode);
    setHasUnsavedChanges(true);
  };

  const handleNodePropertyChange = (property: 'name' | 'description', value: string) => {
    const updatedNode = {
      ...localNode,
      [property]: value
    };
    setLocalNode(updatedNode);
    setHasUnsavedChanges(true);
  };

  const handleSave = () => {
    onNodeUpdate(localNode);
    setHasUnsavedChanges(false);
    onClose();
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      if (confirm('You have unsaved changes. Are you sure you want to cancel?')) {
        setLocalNode({ ...node });
        setHasUnsavedChanges(false);
        onClose();
      }
    } else {
      onClose();
    }
  };

  const renderConfigField = (field: any) => {
    const value = localNode.config[field.key] || field.default || '';

    switch (field.type) {
      case 'text':
        return (
          <div key={field.key} className="mb-6">
            <label className="block text-sm font-medium text-secondary-900 tracking-tight mb-2">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="text"
              value={value}
              onChange={(e) => handleConfigChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              className="w-full px-4 py-3 border border-secondary-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors bg-white"
            />
            {field.description && (
              <p className="text-xs text-secondary-500 mt-2">{field.description}</p>
            )}
          </div>
        );

      case 'css-selector':
        return (
          <div key={field.key} className="mb-6">
            <label className="block text-sm font-medium text-secondary-900 tracking-tight mb-2">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="space-y-2">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={value}
                  onChange={(e) => handleConfigChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="flex-1 px-4 py-3 border border-secondary-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors bg-white font-mono text-sm"
                />
                {scrapedElements.length > 0 && (
                  <ElementSelectorButton
                    elements={scrapedElements}
                    onElementSelect={(element, selector) => {
                      handleConfigChange(field.key, selector);
                      
                      // For text replacement node, also update the originalText field
                      if (localNode.type === 'action' && localNode.name === 'Replace Text' && field.key === 'selector') {
                        // Update the originalText field with the selected element's text
                        handleConfigChange('originalText', element.text);
                      }
                    }}
                    className="px-4 py-3 whitespace-nowrap"
                  />
                )}
              </div>
              {field.description && (
                <p className="text-xs text-secondary-500">{field.description}</p>
              )}
              {scrapedElements.length === 0 && (
                <p className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded border border-yellow-200">
                  💡 Tip: Scrape a webpage first to enable element selection
                </p>
              )}
            </div>
          </div>
        );

      case 'textarea':
        return (
          <div key={field.key} className="mb-6">
            <label className="block text-sm font-medium text-secondary-900 tracking-tight mb-2">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <textarea
              value={value}
              onChange={(e) => handleConfigChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              rows={4}
              className="w-full px-4 py-3 border border-secondary-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors bg-white resize-none"
            />
            {field.description && (
              <p className="text-xs text-secondary-500 mt-2">{field.description}</p>
            )}
          </div>
        );

      case 'select':
        return (
          <div key={field.key} className="mb-6">
            <label className="block text-sm font-medium text-secondary-900 tracking-tight mb-2">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <select
              value={value}
              onChange={(e) => handleConfigChange(field.key, e.target.value)}
              className="w-full px-4 py-3 border border-secondary-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors bg-white"
            >
              {!field.required && <option value="">Select an option...</option>}
              {field.options?.map((option: any) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {field.description && (
              <p className="text-xs text-secondary-500 mt-2">{field.description}</p>
            )}
          </div>
        );

      case 'number':
        return (
          <div key={field.key} className="mb-6">
            <label className="block text-sm font-medium text-secondary-900 tracking-tight mb-2">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="number"
              value={value}
              onChange={(e) => handleConfigChange(field.key, parseInt(e.target.value) || 0)}
              placeholder={field.placeholder}
              className="w-full px-4 py-3 border border-secondary-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors bg-white"
            />
            {field.description && (
              <p className="text-xs text-secondary-500 mt-2">{field.description}</p>
            )}
          </div>
        );

      case 'url':
        return (
          <div key={field.key} className="mb-6">
            <label className="block text-sm font-medium text-secondary-900 tracking-tight mb-2">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="url"
              value={value}
              onChange={(e) => handleConfigChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              className="w-full px-4 py-3 border border-secondary-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors bg-white"
            />
            {field.description && (
              <p className="text-xs text-secondary-500 mt-2">{field.description}</p>
            )}
          </div>
        );

      case 'boolean':
        return (
          <div key={field.key} className="mb-6">
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                checked={value}
                onChange={(e) => handleConfigChange(field.key, e.target.checked)}
                className="w-5 h-5 text-primary-600 border-secondary-300 rounded focus:ring-primary-500 mt-0.5"
              />
              <div className="flex-1">
                <label className="text-sm font-medium text-secondary-900 tracking-tight">
                  {field.label}
                </label>
                {field.description && (
                  <p className="text-xs text-secondary-500 mt-1">{field.description}</p>
                )}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-full bg-white/95 backdrop-blur-sm shadow-2xl border-l border-secondary-200 flex flex-col">
      {/* Header - Fixed */}
      <div className="px-6 py-4 border-b border-secondary-200 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-secondary-900 tracking-tight">Configure Node</h3>
            <p className="text-sm text-secondary-600 mt-1">
              Customize the behavior of this node
              {hasUnsavedChanges && <span className="ml-2 text-orange-600 font-medium">• Unsaved changes</span>}
            </p>
          </div>
          <button
            onClick={handleCancel}
            className="p-2 hover:bg-secondary-100 rounded-lg text-secondary-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Node Name */}
          <div>
            <label className="block text-sm font-medium text-secondary-900 tracking-tight mb-2">
              Node Name
            </label>
            <input
              type="text"
              value={localNode.name}
              onChange={(e) => handleNodePropertyChange('name', e.target.value)}
              className="w-full px-4 py-3 border border-secondary-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors bg-white"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-secondary-900 tracking-tight mb-2">
              Description
            </label>
            <textarea
              value={localNode.description}
              onChange={(e) => handleNodePropertyChange('description', e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border border-secondary-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors bg-white resize-none"
            />
            <p className="text-xs text-secondary-500 mt-2">Brief description of what this node does</p>
          </div>

          {/* Node Information */}
          <div className="bg-secondary-50 border border-secondary-200 p-4 rounded-lg">
            <h4 className="font-semibold text-secondary-900 tracking-tight mb-3">Node Information</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-secondary-700">Type:</span>
                <span className="text-secondary-600 capitalize px-2 py-1 bg-white rounded-md border border-secondary-200">{localNode.type}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-secondary-700">Category:</span>
                <span className="text-secondary-600 px-2 py-1 bg-white rounded-md border border-secondary-200">{localNode.category}</span>
              </div>
            </div>
          </div>

          {/* Configuration Fields */}
          {template && template.configFields && template.configFields.length > 0 ? (
            <div>
              <h4 className="font-semibold text-secondary-900 tracking-tight mb-4">Configuration</h4>
              <div className="space-y-6">
                {template.configFields.map(field => renderConfigField(field))}
              </div>
            </div>
          ) : (
            <div>
              <h4 className="font-semibold text-secondary-900 tracking-tight mb-4">Configuration</h4>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  {template ? 'No configuration fields available for this node.' : 'Template not found for this node.'}
                </p>
                <p className="text-xs text-yellow-600 mt-1">
                  Node: {localNode.name} ({localNode.type})
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer - Fixed */}
      <div className="px-6 py-4 border-t border-secondary-200 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center space-x-3">
          <button
            onClick={handleSave}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium shadow-sm transition-colors ${
              hasUnsavedChanges
                ? 'bg-primary-600 text-white hover:bg-primary-700'
                : 'bg-secondary-300 text-secondary-500 cursor-not-allowed'
            }`}
            disabled={!hasUnsavedChanges}
          >
            <span>Save Changes</span>
          </button>
          <button
            onClick={handleCancel}
            className="px-4 py-3 text-secondary-600 hover:text-secondary-900 transition-colors font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default NodeConfigPanel;