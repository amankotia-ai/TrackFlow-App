import React from 'react';
import { Copy, Eye, Download, RefreshCw } from 'lucide-react';
import { Workflow } from '../types/workflow';

interface TemplatesProps {
  templates: Workflow[];
  onTemplateUse: (template: Workflow) => void;
}

const Templates: React.FC<TemplatesProps> = ({ templates, onTemplateUse }) => {
  return (
    <div className="flex-1 bg-secondary-50">
      <div className="max-w-7xl mx-auto">
        {/* Clean Header */}
        <div className="px-8 py-6 pt-12">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              {/* Page Title and Description */}
              <div>
                <h1 className="text-3xl font-medium text-secondary-900 tracking-tight">Playbook Templates</h1>
                <p className="text-sm text-secondary-600">Start with pre-built templates for common website personalization scenarios</p>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              <button className="flex items-center space-x-2 px-4 py-2 text-secondary-700 bg-white border border-secondary-300 hover:bg-secondary-50 transition-colors font-medium text-sm rounded-lg">
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-8">
          {templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center mb-6">
                <Copy className="w-10 h-10 text-primary-500" />
              </div>
              <h2 className="text-2xl font-semibold text-secondary-900 mb-2">No Templates Available</h2>
              <p className="text-secondary-600 mb-6 text-center max-w-md">
                There are currently no playbook templates. Check back later or create your own playbooks from scratch.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="bg-white p-6 rounded-lg border border-secondary-200 hover:border-secondary-300 transition-colors"
                >
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-secondary-900 tracking-tight mb-2">{template.name}</h3>
                    <p className="text-sm text-secondary-600">{template.description}</p>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center space-x-4 text-sm text-secondary-500">
                      <span>{template.nodes.length} rules</span>
                      <span>{template.connections.length} flows</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onTemplateUse(template)}
                      className="flex-1 flex items-center justify-center space-x-2 bg-primary-500 text-white py-2.5 px-4 hover:bg-primary-600 transition-colors font-medium text-sm rounded-lg"
                    >
                      <Copy className="w-4 h-4" />
                      <span>Use Template</span>
                    </button>
                    <button className="p-2.5 hover:bg-secondary-50 rounded-lg transition-colors">
                      <Eye className="w-4 h-4 text-secondary-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Templates;