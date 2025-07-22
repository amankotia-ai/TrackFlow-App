import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Code, FileText, Play, Download, Globe } from 'lucide-react';
import { Workflow } from '../types/workflow';
import { generateIntegrationCode, generateTestPage, IntegrationCode } from '../utils/integrationCodeGenerator';
import NgrokConfigModal from './NgrokConfigModal';

interface IntegrationModalProps {
  workflow: Workflow;
  isOpen: boolean;
  onClose: () => void;
}

const IntegrationModal: React.FC<IntegrationModalProps> = ({ workflow, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'head' | 'body' | 'instructions' | 'test'>('head');
  const [integrationCode, setIntegrationCode] = useState<IntegrationCode | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [showNgrokModal, setShowNgrokModal] = useState(false);
  const [ngrokUrl, setNgrokUrl] = useState<string>('');

  useEffect(() => {
    if (isOpen && workflow) {
      console.log('🎯 Integration Modal: Generating code for workflow:', workflow.name);
      
      // Configure for ngrok if URL is provided
      const config = ngrokUrl ? {
        apiEndpoint: `${ngrokUrl}/api/analytics/track`,
        trackingScriptUrl: `${ngrokUrl}/tracking-script.js`
      } : {};
      
      const code = generateIntegrationCode(workflow, config);
      setIntegrationCode(code);
    }
  }, [isOpen, workflow, ngrokUrl]);

  const handleNgrokConfig = (url: string) => {
    console.log('🌐 Ngrok URL configured:', url);
    setNgrokUrl(url);
  };

  const copyToClipboard = async (text: string, section: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 2000);
      console.log(`📋 Integration: Copied ${section} code to clipboard`);
    } catch (err) {
      console.error('❌ Failed to copy to clipboard:', err);
      
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'absolute';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 2000);
    }
  };

  const downloadTestPage = () => {
    if (!integrationCode) return;
    
    const testPageHtml = generateTestPage(workflow);
    const blob = new Blob([testPageHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${workflow.name.replace(/[^a-zA-Z0-9]/g, '-')}-test-page.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log('📥 Integration: Test page downloaded');
  };

  if (!isOpen || !integrationCode) return null;

  const tabs = [
    { id: 'head', label: 'Head Code', icon: Code, description: 'Add to <head> section' },
    { id: 'body', label: 'Body Code', icon: FileText, description: 'Add before </body>' },
    { id: 'instructions', label: 'Instructions', icon: FileText, description: 'Implementation guide' },
    { id: 'test', label: 'Test Page', icon: Play, description: 'Download test page' }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-secondary-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
              <Code className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-secondary-900">Integration Code</h2>
              <p className="text-sm text-secondary-600">
                {workflow.name} • {workflow.targetUrl || 'No URL specified'}
                {ngrokUrl && <span className="text-purple-600 font-medium"> • External Testing Enabled</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowNgrokModal(true)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                ngrokUrl 
                  ? 'bg-purple-100 text-purple-700 border border-purple-200 hover:bg-purple-150'
                  : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-150'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>{ngrokUrl ? 'External Testing' : 'Setup External Testing'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-secondary-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-secondary-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-64 bg-secondary-50 border-r border-secondary-200 p-4">
            <div className="space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`w-full text-left p-3 rounded-lg transition-colors flex items-center space-x-3 ${
                      activeTab === tab.id
                        ? 'bg-primary-100 text-primary-700 border border-primary-200'
                        : 'hover:bg-secondary-100 text-secondary-600'
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="font-medium text-sm">{tab.label}</div>
                      <div className="text-xs opacity-75">{tab.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Workflow Info */}
            <div className="mt-6 p-3 bg-white border border-secondary-200 rounded-lg">
              <h3 className="text-sm font-medium text-secondary-900 mb-2">Workflow Info</h3>
              <div className="space-y-1 text-xs text-secondary-600">
                <div>Nodes: {workflow.nodes.length}</div>
                <div>Triggers: {workflow.nodes.filter(n => n.type === 'trigger').length}</div>
                <div>Actions: {workflow.nodes.filter(n => n.type === 'action').length}</div>
                <div>Status: {workflow.status}</div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            {/* Tab Content Header */}
            <div className="p-4 border-b border-secondary-200 bg-secondary-25">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-secondary-900">
                    {tabs.find(t => t.id === activeTab)?.label}
                  </h3>
                  <p className="text-sm text-secondary-600">
                    {tabs.find(t => t.id === activeTab)?.description}
                  </p>
                </div>
                
                {activeTab !== 'test' && activeTab !== 'instructions' && (
                  <button
                    onClick={() => {
                      const content = activeTab === 'head' ? integrationCode.headCode : integrationCode.bodyCode;
                      copyToClipboard(content, activeTab);
                    }}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                      copiedSection === activeTab
                        ? 'bg-green-100 text-green-700 border border-green-200'
                        : 'bg-primary-500 text-white hover:bg-primary-600'
                    }`}
                  >
                    {copiedSection === activeTab ? (
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
                )}
                
                {activeTab === 'test' && (
                  <button
                    onClick={downloadTestPage}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium text-sm"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Test Page</span>
                  </button>
                )}
              </div>
            </div>

            {/* Code/Content Display */}
            <div className="flex-1 overflow-auto">
              {activeTab === 'head' && (
                <div className="p-4">
                  <div className="bg-secondary-900 text-secondary-100 rounded-lg p-4 font-mono text-sm overflow-auto">
                    <pre className="whitespace-pre-wrap">{integrationCode.headCode}</pre>
                  </div>
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-white text-xs font-bold">1</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-blue-900">Installation Step 1</h4>
                        <p className="text-sm text-blue-800">
                          Copy this code and paste it in the <code className="bg-blue-100 px-1 rounded">&lt;head&gt;</code> section of your webpage.
                          This loads the tracking configuration and script.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'body' && (
                <div className="p-4">
                  <div className="bg-secondary-900 text-secondary-100 rounded-lg p-4 font-mono text-sm overflow-auto">
                    <pre className="whitespace-pre-wrap">{integrationCode.bodyCode}</pre>
                  </div>
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-white text-xs font-bold">2</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-green-900">Installation Step 2</h4>
                        <p className="text-sm text-green-800">
                          Copy this code and paste it just before the closing <code className="bg-green-100 px-1 rounded">&lt;/body&gt;</code> tag.
                          This initializes the tracking and sets up workflow triggers.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'instructions' && (
                <div className="p-6">
                  <div className="prose max-w-none">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                      <div className="flex items-start space-x-2">
                        <div className="w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white text-xs font-bold">!</span>
                        </div>
                        <div>
                          <h4 className="font-medium text-yellow-900">Important</h4>
                          <p className="text-sm text-yellow-800">
                            Make sure to implement this code on the correct webpage: <strong>{workflow.targetUrl || 'URL not specified'}</strong>
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="whitespace-pre-wrap font-mono text-sm bg-secondary-50 p-4 rounded-lg border">
                      {integrationCode.instructions}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'test' && (
                <div className="p-6">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Play className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-secondary-900 mb-2">Test Page Generator</h3>
                    <p className="text-secondary-600 mb-6 max-w-md mx-auto">
                      Download a pre-built HTML test page with your workflow integration already implemented. 
                      Perfect for testing your tracking setup.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto mb-6">
                      <div className="bg-secondary-50 p-4 rounded-lg border">
                        <h4 className="font-medium text-secondary-900 mb-2">Included Elements</h4>
                        <ul className="text-sm text-secondary-600 text-left space-y-1">
                          <li>• CTA buttons for click tracking</li>
                          <li>• Forms for interaction tracking</li>
                          <li>• Long content for scroll testing</li>
                          <li>• Hidden elements for workflow actions</li>
                        </ul>
                      </div>
                      <div className="bg-secondary-50 p-4 rounded-lg border">
                        <h4 className="font-medium text-secondary-900 mb-2">Features</h4>
                        <ul className="text-sm text-secondary-600 text-left space-y-1">
                          <li>• Debug console logging</li>
                          <li>• Visual tracking counter</li>
                          <li>• Pre-configured triggers</li>
                          <li>• Example workflow actions</li>
                        </ul>
                      </div>
                    </div>
                    
                    <button
                      onClick={downloadTestPage}
                      className="flex items-center space-x-2 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium mx-auto"
                    >
                      <Download className="w-5 h-5" />
                      <span>Download Test Page</span>
                    </button>
                    
                    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg max-w-lg mx-auto">
                      <h4 className="font-medium text-blue-900 mb-2">How to Use</h4>
                      <ol className="text-sm text-blue-800 text-left space-y-1">
                        <li>1. Download the test page</li>
                        <li>2. Open it in your web browser</li>
                        <li>3. Open browser developer tools (F12)</li>
                        <li>4. Interact with elements and watch the console</li>
                        <li>5. Verify tracking events and workflow triggers</li>
                      </ol>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-secondary-200 bg-secondary-25">
          <div className="flex items-center justify-between">
            <div className="text-sm text-secondary-600">
              {workflow.nodes.length > 0 
                ? `Ready to integrate "${workflow.name}" with ${workflow.nodes.length} nodes`
                : 'Add some nodes to your workflow first'
              }
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-secondary-600 hover:bg-secondary-100 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>

        {/* Ngrok Configuration Modal */}
        <NgrokConfigModal
          isOpen={showNgrokModal}
          onClose={() => setShowNgrokModal(false)}
          onSaveConfig={handleNgrokConfig}
        />
      </div>
    </div>
  );
};

export default IntegrationModal; 