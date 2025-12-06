import React, { useState, useMemo } from 'react';
import { 
  Search, 
  X
} from 'lucide-react';
import { WorkflowNode, NodeTemplate, Workflow } from '../types/workflow';
import { nodeTemplates } from '../data/nodeTemplates';
import * as Icons from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddNodeMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onNodeAdd: (node: WorkflowNode) => void;
  connectingFromNode?: string | null;
  currentWorkflow: Workflow;
}

const AddNodeMenu: React.FC<AddNodeMenuProps> = ({
  isOpen,
  onClose,
  onNodeAdd,
  connectingFromNode,
  currentWorkflow
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const hasExistingTrigger = currentWorkflow.nodes.some(node => node.type === 'trigger');
  const isEmptyWorkflow = currentWorkflow.nodes.length === 0;

  // Separate triggers and operations
  const triggerTemplates = nodeTemplates.filter(template => template.type === 'trigger');
  const operationTemplates = nodeTemplates.filter(template => template.type !== 'trigger');

  // Get unique categories
  const categories = useMemo(() => {
    const uniqueCategories = Array.from(new Set(operationTemplates.map(t => t.category)));
    return uniqueCategories.sort();
  }, [operationTemplates]);

  // Filter all templates based on search and category
  const filteredTriggers = useMemo(() => {
    if (!searchQuery) return triggerTemplates;
    
    return triggerTemplates.filter(template => 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [triggerTemplates, searchQuery]);

  const filteredOperations = useMemo(() => {
    let filtered = operationTemplates;
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }

    if (searchQuery) {
      filtered = filtered.filter(template => 
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [operationTemplates, selectedCategory, searchQuery]);

  const handleAddNode = (template: NodeTemplate) => {
    // Validation: First node must be a trigger
    if (currentWorkflow.nodes.length === 0 && template.type !== 'trigger') {
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
      position: { x: 0, y: 0 },
      config: { ...template.defaultConfig },
      inputs: template.type === 'trigger' ? [] : ['input'],
      outputs: ['output']
    };

    onNodeAdd(newNode);
    handleClose();
  };

  const handleClose = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    onClose();
  };

  // if (!isOpen) return null; // Removed to allow exit animation

  return (
    <>
      {/* Backdrop */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={handleClose}
      />

      {/* Floating Menu */}
      <div 
        className={cn(
          "fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4 transition-all duration-300 transform origin-bottom",
          isOpen 
            ? "opacity-100 scale-100 translate-y-0 ease-out" 
            : "opacity-0 scale-95 translate-y-8 pointer-events-none ease-in"
        )}
      >
        <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200/80 overflow-hidden backdrop-blur-xl">
          {/* Header */}
          <div className="px-6 pt-5 pb-4 border-b border-zinc-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900">Add Node</h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {isEmptyWorkflow 
                    ? 'Start with a trigger'
                    : 'Choose a trigger or operation'}
                </p>
              </div>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-zinc-100 rounded-lg transition-colors text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search nodes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
                autoFocus
              />
            </div>

            {/* Category Filter */}
            {!isEmptyWorkflow && (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
                    selectedCategory === 'all'
                      ? "bg-zinc-900 text-white shadow-sm"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  )}
                >
                  All Operations
                </button>
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
                      selectedCategory === category
                        ? "bg-zinc-900 text-white shadow-sm"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                    )}
                  >
                    {category}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="max-h-[60vh] overflow-y-auto overscroll-contain">
            <div className="p-3">
              {/* Triggers */}
              {filteredTriggers.length > 0 && (
                <div className="mb-2">
                  <div className="px-3 py-2">
                    <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Triggers</p>
                  </div>
                  <div className="space-y-1">
                    {filteredTriggers.map((template) => {
                      const IconComponent = Icons[template.icon as keyof typeof Icons] as React.ComponentType<any>;
                      
                      return (
                        <button
                          key={template.id}
                          onClick={() => handleAddNode(template)}
                          className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-zinc-50 transition-all text-left group cursor-pointer active:scale-[0.98]"
                        >
                          {IconComponent && (
                            <IconComponent className="w-5 h-5 flex-shrink-0 text-blue-500 group-hover:text-blue-600 transition-colors" />
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-zinc-900 group-hover:text-zinc-950 transition-colors">
                              {template.name}
                            </h4>
                            <p className="text-xs mt-0.5 text-zinc-500 line-clamp-1">
                              {template.description}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Operations */}
              {!isEmptyWorkflow && filteredOperations.length > 0 && (
                <div>
                  <div className="px-3 py-2">
                    <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Operations</p>
                  </div>
                  <div className="space-y-1">
                    {filteredOperations.map((template) => {
                      const IconComponent = Icons[template.icon as keyof typeof Icons] as React.ComponentType<any>;
                      
                      return (
                        <button
                          key={template.id}
                          onClick={() => handleAddNode(template)}
                          className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-zinc-50 transition-all text-left group cursor-pointer active:scale-[0.98]"
                        >
                          {IconComponent && (
                            <IconComponent className="w-5 h-5 flex-shrink-0 text-green-500 group-hover:text-green-600 transition-colors" />
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-zinc-900 group-hover:text-zinc-950 transition-colors">
                              {template.name}
                            </h4>
                            <p className="text-xs mt-0.5 text-zinc-500 line-clamp-1">
                              {template.description}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {filteredTriggers.length === 0 && filteredOperations.length === 0 && (
                <div className="text-center py-12 px-4">
                  <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-3">
                    <Search className="w-5 h-5 text-zinc-400" />
                  </div>
                  <p className="text-sm text-zinc-500">No nodes found</p>
                  <p className="text-xs text-zinc-400 mt-1">Try a different search term</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AddNodeMenu;

