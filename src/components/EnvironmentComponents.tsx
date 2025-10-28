import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Plus,
  Edit2,
  Trash2,
  Copy,
  Tag,
  Database,
  Link,
  Type,
  Code,
  Save,
  Loader2,
  TrendingUp
} from 'lucide-react';
import {
  EnvironmentComponent,
  CreateEnvironmentComponent,
  getEnvironmentComponents,
  createEnvironmentComponent,
  updateEnvironmentComponent,
  deleteEnvironmentComponent,
  duplicateEnvironmentComponent
} from '../services/environmentComponents';
import { useToast } from './Toast';

interface EnvironmentComponentsProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectComponent?: (component: EnvironmentComponent) => void;
  selectionMode?: boolean;
  filterType?: 'css_selector' | 'url' | 'text' | 'custom';
}

const EnvironmentComponents: React.FC<EnvironmentComponentsProps> = ({
  isOpen,
  onClose,
  onSelectComponent,
  selectionMode = false,
  filterType
}) => {
  const [components, setComponents] = useState<EnvironmentComponent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingComponent, setEditingComponent] = useState<EnvironmentComponent | null>(null);
  const { showToast } = useToast();

  // Filter and sort components for display
  const displayComponents = useMemo(() => {
    let filtered = [...components];
    
    // Filter by type if specified
    if (filterType && filterType !== 'all') {
      filtered = filtered.filter(c => c.component_type === filterType);
    }
    
    // Sort by usage (most used first), then by name
    filtered.sort((a, b) => {
      if (b.usage_count !== a.usage_count) {
        return b.usage_count - a.usage_count;
      }
      return a.name.localeCompare(b.name);
    });
    
    return filtered;
  }, [components, filterType]);

  useEffect(() => {
    if (isOpen) {
      loadComponents();
    }
  }, [isOpen]);

  const loadComponents = async () => {
    try {
      setIsLoading(true);
      const data = await getEnvironmentComponents();
      setComponents(data);
    } catch (error: any) {
      showToast(error.message || 'Failed to load components', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this component?')) {
      return;
    }

    try {
      await deleteEnvironmentComponent(id);
      setComponents(prev => prev.filter(c => c.id !== id));
      showToast('Component deleted successfully', 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to delete component', 'error');
    }
  };

  const handleDuplicate = async (component: EnvironmentComponent) => {
    try {
      const newName = `${component.name} (Copy)`;
      const duplicated = await duplicateEnvironmentComponent(component.id, newName);
      setComponents(prev => [...prev, duplicated]);
      showToast('Component duplicated successfully', 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to duplicate component', 'error');
    }
  };

  const handleSelect = (component: EnvironmentComponent) => {
    if (selectionMode && onSelectComponent) {
      onSelectComponent(component);
      onClose();
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'css_selector':
        return <Code className="w-4 h-4" />;
      case 'url':
        return <Link className="w-4 h-4" />;
      case 'text':
        return <Type className="w-4 h-4" />;
      default:
        return <Database className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'css_selector':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'url':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'text':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="border-b border-secondary-200">
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-secondary-900 tracking-tight">
                Environment Components
              </h2>
              <p className="text-sm text-secondary-600 mt-1">
                {selectionMode
                  ? 'Select a component to use in your workflow'
                  : 'Manage your reusable CSS selectors and components'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-secondary-100 rounded-lg text-secondary-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {selectionMode && (
            <div className="px-6 py-3 bg-blue-50 border-t border-blue-100">
              <p className="text-sm text-blue-800 flex items-center space-x-2">
                <span className="font-medium">💡 Tip:</span>
                <span>Click on any component below to select it for your workflow node</span>
              </p>
            </div>
          )}
        </div>

        {/* Add Button - Only show when not in selection mode */}
        {!selectionMode && (
          <div className="px-6 py-4 border-b border-secondary-200 bg-secondary-50/50">
            <button
              onClick={() => {
                setEditingComponent(null);
                setShowAddModal(true);
              }}
              className="w-full flex items-center justify-center space-x-2 px-5 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all font-medium shadow-sm hover:shadow-md"
            >
              <Plus className="w-5 h-5" />
              <span>Add New Component</span>
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
            </div>
          ) : displayComponents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-96 text-center px-4">
              <div className="bg-secondary-100 rounded-full p-6 mb-4">
                <Database className="w-12 h-12 text-secondary-400" />
              </div>
              <h3 className="text-lg font-semibold text-secondary-900 mb-2">
                No components yet
              </h3>
              <p className="text-sm text-secondary-600 max-w-sm mb-6">
                Start building your library of reusable components. Save CSS selectors, URLs, and more for quick access across all your workflows.
              </p>
              {!selectionMode && (
                <button
                  onClick={() => {
                    setEditingComponent(null);
                    setShowAddModal(true);
                  }}
                  className="flex items-center space-x-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all font-medium shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Your First Component</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {displayComponents.map(component => (
                <div
                  key={component.id}
                  onClick={() => handleSelect(component)}
                  className={`border-2 rounded-lg p-4 transition-all ${
                    selectionMode 
                      ? 'cursor-pointer border-secondary-200 hover:border-primary-500 hover:bg-primary-50/30 hover:shadow-lg' 
                      : 'border-secondary-200 hover:shadow-md'
                  }`}
                >
                  {/* Header with name, badge, and actions */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center flex-wrap gap-2 mb-2">
                        <h3 className="font-semibold text-secondary-900 text-base">
                          {component.name}
                        </h3>
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-medium border ${getTypeColor(
                            component.component_type
                          )}`}
                        >
                          {getTypeIcon(component.component_type)}
                          <span className="ml-1 capitalize">
                            {component.component_type.replace('_', ' ')}
                          </span>
                        </span>
                      </div>
                      {component.description && (
                        <p className="text-sm text-secondary-600 leading-relaxed">
                          {component.description}
                        </p>
                      )}
                    </div>
                    {!selectionMode && (
                      <div className="flex items-center space-x-1 flex-shrink-0">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setEditingComponent(component);
                            setShowAddModal(true);
                          }}
                          className="p-2 hover:bg-secondary-100 rounded-lg text-secondary-600 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleDuplicate(component);
                          }}
                          className="p-2 hover:bg-secondary-100 rounded-lg text-secondary-600 transition-colors"
                          title="Duplicate"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleDelete(component.id);
                          }}
                          className="p-2 hover:bg-red-100 rounded-lg text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Value display */}
                  <div className="bg-secondary-50 rounded-lg p-3 mb-3 border border-secondary-100">
                    <code className="text-sm text-secondary-800 font-mono break-all block">
                      {component.value}
                    </code>
                  </div>

                  {/* Footer with metadata */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-secondary-500">
                    {component.tags && component.tags.length > 0 && (
                      <div className="flex items-center space-x-1.5">
                        <Tag className="w-3.5 h-3.5" />
                        <span className="font-medium">{component.tags.join(', ')}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-1.5">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>
                        {component.usage_count === 0 
                          ? 'Not used yet' 
                          : `Used ${component.usage_count} ${component.usage_count === 1 ? 'time' : 'times'}`
                        }
                      </span>
                    </div>
                    <div className="ml-auto">
                      {new Date(component.updated_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-secondary-200 flex items-center justify-between bg-secondary-50/50">
          <p className="text-sm text-secondary-600 font-medium">
            {displayComponents.length} {displayComponents.length === 1 ? 'component' : 'components'}
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 text-secondary-700 hover:text-secondary-900 hover:bg-secondary-100 rounded-lg transition-all font-medium"
          >
            {selectionMode ? 'Cancel' : 'Close'}
          </button>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <ComponentFormModal
          component={editingComponent}
          onClose={() => {
            setShowAddModal(false);
            setEditingComponent(null);
          }}
          onSave={component => {
            if (editingComponent) {
              setComponents(prev =>
                prev.map(c => (c.id === component.id ? component : c))
              );
            } else {
              setComponents(prev => [...prev, component]);
            }
            setShowAddModal(false);
            setEditingComponent(null);
          }}
        />
      )}
    </div>
  );
};

// Component Form Modal
interface ComponentFormModalProps {
  component: EnvironmentComponent | null;
  onClose: () => void;
  onSave: (component: EnvironmentComponent) => void;
}

const ComponentFormModal: React.FC<ComponentFormModalProps> = ({
  component,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState<CreateEnvironmentComponent>({
    name: component?.name || '',
    description: component?.description || '',
    component_type: component?.component_type || 'css_selector',
    value: component?.value || '',
    tags: component?.tags || []
  });
  const [tagInput, setTagInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.value) {
      showToast('Name and value are required', 'error');
      return;
    }

    try {
      setIsSaving(true);
      let savedComponent: EnvironmentComponent;

      if (component) {
        savedComponent = await updateEnvironmentComponent(component.id, formData);
        showToast('Component updated successfully', 'success');
      } else {
        savedComponent = await createEnvironmentComponent(formData);
        showToast('Component created successfully', 'success');
      }

      onSave(savedComponent);
    } catch (error: any) {
      showToast(error.message || 'Failed to save component', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddTag = () => {
    if (tagInput && !formData.tags?.includes(tagInput)) {
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), tagInput]
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.filter(t => t !== tag) || []
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="px-6 py-4 border-b border-secondary-200 flex items-center justify-between">
            <h3 className="text-xl font-bold text-secondary-900 tracking-tight">
              {component ? 'Edit Component' : 'Add Component'}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-secondary-100 rounded-lg text-secondary-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-6 space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-secondary-900 mb-2">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Primary Button"
                className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-secondary-900 mb-2">
                Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.component_type}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    component_type: e.target.value as any
                  }))
                }
                className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="css_selector">CSS Selector</option>
                <option value="url">URL</option>
                <option value="text">Text</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            {/* Value */}
            <div>
              <label className="block text-sm font-medium text-secondary-900 mb-2">
                Value <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.value}
                onChange={e => setFormData(prev => ({ ...prev, value: e.target.value }))}
                placeholder={
                  formData.component_type === 'css_selector'
                    ? 'e.g., .btn-primary'
                    : formData.component_type === 'url'
                    ? 'e.g., https://example.com'
                    : 'Enter the component value'
                }
                rows={3}
                className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-sm"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-secondary-900 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={e =>
                  setFormData(prev => ({ ...prev, description: e.target.value }))
                }
                placeholder="Optional description of this component"
                rows={2}
                className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-secondary-900 mb-2">
                Tags
              </label>
              <div className="flex items-center space-x-2 mb-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="Add a tag"
                  className="flex-1 px-4 py-2 border border-secondary-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-4 py-2 bg-secondary-100 text-secondary-700 rounded-lg hover:bg-secondary-200 transition-colors"
                >
                  Add
                </button>
              </div>
              {formData.tags && formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center space-x-1 px-2 py-1 bg-primary-100 text-primary-800 rounded text-sm"
                    >
                      <Tag className="w-3 h-3" />
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:text-primary-900"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-secondary-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-secondary-600 hover:text-secondary-900 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{component ? 'Update' : 'Create'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EnvironmentComponents;

