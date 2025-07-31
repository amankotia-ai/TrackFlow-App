import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Globe, Target, ChevronRight } from 'lucide-react';

interface NewWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateWorkflow: (workflowData: NewWorkflowData) => void;
}

export interface NewWorkflowData {
  name: string;
  description?: string;
  targetUrl: string;
  targetingMode: 'exact' | 'domain' | 'path' | 'universal';
}

const NewWorkflowModal: React.FC<NewWorkflowModalProps> = ({
  isOpen,
  onClose,
  onCreateWorkflow
}) => {
  const [formData, setFormData] = useState<NewWorkflowData>({
    name: '',
    description: '',
    targetUrl: '',
    targetingMode: 'exact'
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isValidating, setIsValidating] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: '',
        description: '',
        targetUrl: '',
        targetingMode: 'exact'
      });
      setErrors({});
    }
  }, [isOpen]);

  const validateForm = async (data: NewWorkflowData): Promise<Record<string, string>> => {
    const newErrors: Record<string, string> = {};
    
    // Name validation
    if (!data.name.trim()) {
      newErrors.name = 'Workflow name is required';
    } else if (data.name.length < 3) {
      newErrors.name = 'Name must be at least 3 characters';
    } else if (data.name.length > 50) {
      newErrors.name = 'Name must be less than 50 characters';
    }
    
    // URL validation
    if (!data.targetUrl.trim()) {
      newErrors.targetUrl = 'Target URL is required';
    } else if (data.targetUrl !== '*' && data.targetingMode !== 'universal') {
      try {
        new URL(data.targetUrl);
      } catch (error) {
        newErrors.targetUrl = 'Please enter a valid URL';
      }
    }
    
    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsValidating(true);
    
    const validationErrors = await validateForm(formData);
    setErrors(validationErrors);
    
    if (Object.keys(validationErrors).length === 0) {
      onCreateWorkflow(formData);
      onClose();
    }
    
    setIsValidating(false);
  };

  const handleInputChange = (field: keyof NewWorkflowData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const getTargetingDescription = (mode: string) => {
    switch (mode) {
      case 'exact':
        return 'Run only on the exact URL specified';
      case 'domain':
        return 'Run on all pages within the same domain';
      case 'path':
        return 'Run on all pages with the same path pattern';
      case 'universal':
        return 'Run on all pages (use with caution)';
      default:
        return '';
    }
  };

  const getUrlPlaceholder = (mode: string) => {
    switch (mode) {
      case 'exact':
        return 'https://example.com/specific-page';
      case 'domain':
        return 'https://example.com';
      case 'path':
        return 'https://example.com/category/*';
      case 'universal':
        return '*';
      default:
        return '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-secondary-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-secondary-900">Create New Workflow</h2>
              <p className="text-sm text-secondary-600">Set up your personalization playbook</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-secondary-500" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-secondary-900 mb-3">Basic Information</h3>
            </div>
            
            {/* Name Field */}
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Workflow Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g., Homepage Personalization, Product Page Optimizer"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  errors.name ? 'border-red-300 focus:border-red-500' : 'border-secondary-300 focus:border-primary-500'
                }`}
                autoFocus
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.name}</span>
                </p>
              )}
            </div>

            {/* Description Field */}
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Briefly describe what this workflow will do..."
                rows={3}
                className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
              />
            </div>
          </div>

          {/* Target Configuration */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-secondary-900 mb-3">Target Configuration</h3>
            </div>

            {/* Targeting Mode */}
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Targeting Mode
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'exact', label: 'Exact URL', icon: Target },
                  { value: 'domain', label: 'Entire Domain', icon: Globe },
                  { value: 'path', label: 'Path Pattern', icon: ChevronRight },
                  { value: 'universal', label: 'Universal', icon: Globe }
                ].map((mode) => {
                  const IconComponent = mode.icon;
                  return (
                    <button
                      key={mode.value}
                      type="button"
                      onClick={() => {
                        handleInputChange('targetingMode', mode.value);
                        if (mode.value === 'universal') {
                          handleInputChange('targetUrl', '*');
                        } else if (formData.targetUrl === '*') {
                          handleInputChange('targetUrl', '');
                        }
                      }}
                      className={`p-3 border rounded-lg text-left transition-colors ${
                        formData.targetingMode === mode.value
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-secondary-200 hover:border-secondary-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2 mb-1">
                        <IconComponent className="w-4 h-4" />
                        <span className="font-medium text-sm">{mode.label}</span>
                      </div>
                      <p className="text-xs text-secondary-600">
                        {getTargetingDescription(mode.value)}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* URL Input */}
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Target URL *
              </label>
              <input
                type={formData.targetingMode === 'universal' ? 'text' : 'url'}
                value={formData.targetUrl}
                onChange={(e) => handleInputChange('targetUrl', e.target.value)}
                placeholder={getUrlPlaceholder(formData.targetingMode)}
                disabled={formData.targetingMode === 'universal'}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  formData.targetingMode === 'universal' 
                    ? 'bg-secondary-50 text-secondary-500'
                    : errors.targetUrl 
                    ? 'border-red-300 focus:border-red-500' 
                    : 'border-secondary-300 focus:border-primary-500'
                }`}
              />
              {errors.targetUrl && (
                <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.targetUrl}</span>
                </p>
              )}
              <p className="mt-1 text-sm text-secondary-500">
                {getTargetingDescription(formData.targetingMode)}
              </p>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-secondary-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-secondary-700 bg-secondary-100 hover:bg-secondary-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isValidating}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isValidating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Creating...</span>
              </>
            ) : (
              <>
                <Target className="w-4 h-4" />
                <span>Create & Open</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewWorkflowModal; 