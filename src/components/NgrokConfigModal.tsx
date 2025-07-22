import React, { useState } from 'react';
import { X, ExternalLink, Copy, Check, Globe, Terminal } from 'lucide-react';

interface NgrokConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveConfig: (ngrokUrl: string) => void;
}

const NgrokConfigModal: React.FC<NgrokConfigModalProps> = ({ isOpen, onClose, onSaveConfig }) => {
  const [ngrokUrl, setNgrokUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const handleSave = () => {
    if (ngrokUrl.trim()) {
      // Ensure URL format is correct
      const cleanUrl = ngrokUrl.trim().replace(/\/$/, ''); // Remove trailing slash
      onSaveConfig(cleanUrl);
      onClose();
    }
  };

  const copyCommand = async (command: string) => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy command:', err);
    }
  };

  if (!isOpen) return null;

  const installCommands = [
    'npm install -g ngrok',
    'ngrok http 3001'
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-secondary-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <Globe className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-secondary-900">External Testing Setup</h2>
              <p className="text-sm text-secondary-600">Configure ngrok for Webflow and external site testing</p>
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
        <div className="flex-1 overflow-auto p-6">
          <div className="space-y-6">
            {/* Why Ngrok */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">Why do I need ngrok?</h3>
              <p className="text-sm text-blue-800">
                Your tracking system runs locally (localhost:3001) but external websites like Webflow 
                can't access localhost URLs. Ngrok creates a secure tunnel from a public URL to your 
                local server, allowing external sites to use your tracking system.
              </p>
            </div>

            {/* Setup Steps */}
            <div>
              <h3 className="text-lg font-medium text-secondary-900 mb-4">Setup Steps</h3>
              
              <div className="space-y-4">
                {/* Step 1 */}
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-white text-xs font-bold">1</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-secondary-900">Install ngrok</h4>
                    <div className="mt-2 bg-secondary-900 rounded-lg p-3 flex items-center justify-between">
                      <code className="text-secondary-100 font-mono text-sm">{installCommands[0]}</code>
                      <button
                        onClick={() => copyCommand(installCommands[0])}
                        className="flex items-center space-x-1 px-2 py-1 bg-secondary-700 text-secondary-200 rounded text-xs hover:bg-secondary-600 transition-colors"
                      >
                        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{copied ? 'Copied!' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-white text-xs font-bold">2</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-secondary-900">Start your local server</h4>
                    <p className="text-sm text-secondary-600 mt-1">Make sure your server is running on port 3001 (npm run dev:server)</p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-white text-xs font-bold">3</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-secondary-900">Create ngrok tunnel</h4>
                    <div className="mt-2 bg-secondary-900 rounded-lg p-3 flex items-center justify-between">
                      <code className="text-secondary-100 font-mono text-sm">{installCommands[1]}</code>
                      <button
                        onClick={() => copyCommand(installCommands[1])}
                        className="flex items-center space-x-1 px-2 py-1 bg-secondary-700 text-secondary-200 rounded text-xs hover:bg-secondary-600 transition-colors"
                      >
                        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{copied ? 'Copied!' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-white text-xs font-bold">4</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-secondary-900">Copy the ngrok URL</h4>
                    <p className="text-sm text-secondary-600 mt-1">
                      Ngrok will show you URLs like <code className="bg-secondary-100 px-1 rounded">https://abc123.ngrok.io</code>. 
                      Copy the <strong>https://</strong> URL and paste it below.
                    </p>
                    
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-secondary-700 mb-2">
                        Ngrok URL (https://)
                      </label>
                      <input
                        type="url"
                        value={ngrokUrl}
                        onChange={(e) => setNgrokUrl(e.target.value)}
                        placeholder="https://abc123.ngrok.io"
                        className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Example Terminal Output */}
            <div>
              <h4 className="font-medium text-secondary-900 mb-2">Expected Terminal Output</h4>
              <div className="bg-secondary-900 text-secondary-100 rounded-lg p-4 font-mono text-sm">
                <div className="flex items-center space-x-2 mb-2">
                  <Terminal className="w-4 h-4 text-green-400" />
                  <span className="text-green-400">ngrok by @inconshreveable</span>
                </div>
                <div className="space-y-1">
                  <div>Session Status    online</div>
                  <div>Account          your-email@example.com</div>
                  <div className="text-yellow-400">Web Interface     http://127.0.0.1:4040</div>
                  <div className="text-green-400">Forwarding        https://abc123.ngrok.io → http://localhost:3001</div>
                </div>
              </div>
              <p className="text-xs text-secondary-600 mt-2">
                Use the <span className="text-green-600 font-medium">https://</span> URL shown in "Forwarding"
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-secondary-200 bg-secondary-25">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-secondary-600">
              <ExternalLink className="w-4 h-4" />
              <span>This will update your integration code to use the public ngrok URL</span>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-secondary-600 hover:bg-secondary-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!ngrokUrl.trim()}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  ngrokUrl.trim()
                    ? 'bg-purple-500 text-white hover:bg-purple-600'
                    : 'bg-secondary-300 text-secondary-500 cursor-not-allowed'
                }`}
              >
                Save & Update Code
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NgrokConfigModal; 