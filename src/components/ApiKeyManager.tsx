import React, { useState, useEffect } from 'react';
import { Key, Copy, Check, Plus, Trash2, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { WorkflowService } from '../services/workflowService';

interface ApiKey {
  id: string;
  key_name: string;
  api_key: string;
  is_active: boolean;
  last_used: string | null;
  created_at: string;
}

const ApiKeyManager: React.FC = () => {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    try {
      setLoading(true);
      setError(null);
      const keys = await WorkflowService.getUserApiKeys();
      setApiKeys(keys);
    } catch (err) {
      console.error('Error loading API keys:', err);
      setError('Failed to load API keys. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generateApiKey = async () => {
    if (!newKeyName.trim()) {
      setError('Please enter a name for your API key');
      return;
    }

    try {
      setGenerating(true);
      setError(null);
      
      const apiKey = await WorkflowService.generateApiKey(newKeyName.trim());
      
      // Reload the keys list
      await loadApiKeys();
      
      // Reset form
      setNewKeyName('');
      setShowCreateForm(false);
      
      // Auto-show the new key
      setVisibleKeys(new Set([apiKey]));
      
      console.log('✅ API Key generated:', apiKey);
    } catch (err) {
      console.error('Error generating API key:', err);
      setError('Failed to generate API key. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const toggleKeyVisibility = (keyId: string) => {
    const newVisible = new Set(visibleKeys);
    if (newVisible.has(keyId)) {
      newVisible.delete(keyId);
    } else {
      newVisible.add(keyId);
    }
    setVisibleKeys(newVisible);
  };

  const copyApiKey = async (apiKey: string) => {
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopiedKey(apiKey);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (err) {
      console.error('Failed to copy API key:', err);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const maskApiKey = (apiKey: string) => {
    return `${apiKey.substring(0, 8)}${'•'.repeat(apiKey.length - 12)}${apiKey.substring(apiKey.length - 4)}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
        <span className="ml-2 text-secondary-600">Loading API keys...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-secondary-900 flex items-center space-x-2">
            <Key className="w-5 h-5" />
            <span>API Keys</span>
          </h2>
          <p className="text-sm text-secondary-600 mt-1">
            Manage API keys for external website integration
          </p>
        </div>
        
        {!showCreateForm && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Generate API Key</span>
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center space-x-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-white border border-secondary-200 rounded-lg p-6">
          <h3 className="font-medium text-secondary-900 mb-4">Generate New API Key</h3>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="keyName" className="block text-sm font-medium text-secondary-700 mb-2">
                API Key Name
              </label>
              <input
                id="keyName"
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="e.g., Webflow Integration, Production Site"
                className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <p className="text-xs text-secondary-500 mt-1">
                Choose a descriptive name to help you identify this key later
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={generateApiKey}
                disabled={generating || !newKeyName.trim()}
                className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {generating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Key className="w-4 h-4" />
                )}
                <span>{generating ? 'Generating...' : 'Generate Key'}</span>
              </button>
              
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setNewKeyName('');
                  setError(null);
                }}
                className="px-4 py-2 text-secondary-700 border border-secondary-300 rounded-lg hover:bg-secondary-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* API Keys List */}
      <div className="space-y-4">
        {apiKeys.length === 0 ? (
          <div className="text-center py-12 bg-white border border-secondary-200 rounded-lg">
            <Key className="w-12 h-12 text-secondary-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-secondary-900 mb-2">No API Keys</h3>
            <p className="text-secondary-600 mb-4">
              Create your first API key to integrate workflows with external websites
            </p>
            {!showCreateForm && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Generate API Key</span>
              </button>
            )}
          </div>
        ) : (
          apiKeys.map((key) => (
            <div key={key.id} className="bg-white border border-secondary-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h3 className="font-medium text-secondary-900">{key.key_name}</h3>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      key.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {key.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  <div className="mt-2 flex items-center space-x-4 text-sm text-secondary-600">
                    <span>Created: {formatDate(key.created_at)}</span>
                    {key.last_used && (
                      <span>Last used: {formatDate(key.last_used)}</span>
                    )}
                  </div>
                  
                  <div className="mt-3 flex items-center space-x-2">
                    <code className="flex-1 px-3 py-2 bg-secondary-50 border border-secondary-200 rounded font-mono text-sm">
                      {visibleKeys.has(key.api_key) ? key.api_key : maskApiKey(key.api_key)}
                    </code>
                    
                    <button
                      onClick={() => toggleKeyVisibility(key.api_key)}
                      className="p-2 text-secondary-500 hover:text-secondary-700 transition-colors"
                      title={visibleKeys.has(key.api_key) ? "Hide key" : "Show key"}
                    >
                      {visibleKeys.has(key.api_key) ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                    
                    <button
                      onClick={() => copyApiKey(key.api_key)}
                      className="p-2 text-secondary-500 hover:text-secondary-700 transition-colors"
                      title="Copy API key"
                    >
                      {copiedKey === key.api_key ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Usage Instructions */}
      {apiKeys.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">How to Use Your API Key</h3>
          <div className="text-sm text-blue-800 space-y-2">
            <p><strong>Option 1:</strong> Add to unified system configuration:</p>
            <code className="block bg-blue-100 p-2 rounded font-mono text-xs">
              {`<script>\n  window.workflowSystem = new UnifiedWorkflowSystem({\n    apiKey: 'your-api-key-here'\n  });\n</script>`}
            </code>
            
            <p><strong>Option 2:</strong> Add as header in requests:</p>
            <code className="block bg-blue-100 p-2 rounded font-mono text-xs">
              X-API-Key: your-api-key-here
            </code>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApiKeyManager; 