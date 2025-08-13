import React, { useState } from 'react';
import { X, Copy, Check, Code } from 'lucide-react';
import { Workflow } from '../types/workflow';

interface IntegrationModalProps {
  workflow: Workflow;
  isOpen: boolean;
  onClose: () => void;
}

const IntegrationModal: React.FC<IntegrationModalProps> = ({ workflow, isOpen, onClose }) => {
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  // Minimal, single-snippet integration code with API key one-liner
  const headSnippet = `<!-- Unified Workflow System with Anti-Flicker - Add to <head> section -->
<script>
  // Configure anti-flicker settings
  window.unifiedWorkflowConfig = {
    maxHideTime: 5000,
    showLoadingIndicator: true,
    debug: true,
    hideMethod: 'opacity'
  };
</script>
<!-- Anti-flicker script (loads first to prevent FOOC) -->
<script src="https://trackflow-app-production.up.railway.app/api/anti-flicker.js"></script>
<!-- Main workflow system -->
<script src="https://trackflow-app-production.up.railway.app/api/unified-workflow-system.js"></script>
<!-- API key (replace YOUR_API_KEY) -->
<script>window.workflowSystem = new UnifiedWorkflowSystem({apiKey: 'YOUR_API_KEY'});</script>`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(headSnippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = headSnippet;
      textArea.style.position = 'absolute';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-secondary-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
              <Code className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-secondary-900">Integration Code</h2>
              <p className="text-sm text-secondary-600">{workflow.name} • {workflow.targetUrl || 'No URL specified'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-secondary-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-secondary-500" />
          </button>
        </div>
        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-lg font-medium text-secondary-900">Head Code</h3>
              <p className="text-sm text-secondary-600">Add to &lt;head&gt; section</p>
            </div>
            <button
              onClick={copyToClipboard}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                copied ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-primary-500 text-white hover:bg-primary-600'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>
          <div className="bg-secondary-900 text-secondary-100 rounded-lg p-4 font-mono text-sm overflow-auto">
            <pre className="whitespace-pre-wrap">{headSnippet}</pre>
          </div>
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              Replace <code className="bg-blue-100 px-1 rounded">YOUR_API_KEY</code> with your key from Settings → API Keys.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-secondary-200 bg-secondary-25">
          <div className="flex items-center justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-secondary-600 hover:bg-secondary-100 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntegrationModal; 