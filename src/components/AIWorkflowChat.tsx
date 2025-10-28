/**
 * AI Workflow Chat Component
 * Natural language workflow creation interface
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Sparkles, 
  Loader2, 
  Check, 
  ChevronDown,
  Wand2,
  MessageSquare,
  X,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { aiService } from '../services/aiService';
import { Workflow } from '../types/workflow';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  workflow?: Partial<Workflow>;
  loading?: boolean;
  error?: boolean;
}

interface AIWorkflowChatProps {
  onWorkflowGenerated?: (workflow: Partial<Workflow>) => void;
  onClose?: () => void;
  context?: {
    currentPage?: string;
    userProfile?: any;
  };
}

const AIWorkflowChat: React.FC<AIWorkflowChatProps> = ({
  onWorkflowGenerated,
  onClose,
  context
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "👋 Hi! I'm your AI workflow assistant. Tell me what you'd like to personalize on your website, and I'll create a workflow for you.\n\nFor example:\n• \"Show a discount popup to mobile users from paid ads\"\n• \"Personalize headlines for enterprise visitors\"\n• \"Auto A/B test CTAs on the pricing page\"",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [expandedWorkflow, setExpandedWorkflow] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Add loading message
      const loadingMessage: Message = {
        id: `${Date.now()}-loading`,
        role: 'assistant',
        content: '✨ Analyzing your request and generating workflow...',
        timestamp: new Date(),
        loading: true
      };
      setMessages(prev => [...prev, loadingMessage]);

      // Generate workflow from natural language
      const result = await aiService.generateWorkflowFromPrompt(input.trim());

      // Remove loading message and add result
      setMessages(prev => prev.filter(m => m.id !== loadingMessage.id));

      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `✅ Perfect! I've created a workflow for you:\n\n**${result.workflow.name}**\n\n${result.workflow.description}\n\n**Confidence:** ${Math.round((result.confidence || 0.8) * 100)}%\n\nWould you like me to:\n1. Deploy this workflow\n2. Make adjustments\n3. Create a different workflow`,
        timestamp: new Date(),
        workflow: result.workflow
      };

      setMessages(prev => [...prev, assistantMessage]);
      setExpandedWorkflow(assistantMessage.id);

    } catch (error: any) {
      console.error('Error generating workflow:', error);
      
      // Remove loading message
      setMessages(prev => prev.filter(m => !m.loading));

      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `❌ Oops! ${error.message || 'Something went wrong'}. Could you try rephrasing your request?`,
        timestamp: new Date(),
        error: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDeployWorkflow = (workflow: Partial<Workflow>) => {
    onWorkflowGenerated?.(workflow);
    
    // Add confirmation message
    const confirmMessage: Message = {
      id: Date.now().toString(),
      role: 'system',
      content: '🚀 Great! Opening workflow builder with your AI-generated workflow...',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, confirmMessage]);
  };

  const handleFeedback = async (messageId: string, helpful: boolean) => {
    // Track feedback for AI improvement
    console.log(`Feedback for ${messageId}: ${helpful ? 'helpful' : 'not helpful'}`);
    
    // Show confirmation
    const confirmMessage: Message = {
      id: Date.now().toString(),
      role: 'system',
      content: helpful 
        ? '👍 Thanks! Your feedback helps improve the AI.'
        : '👎 Thanks for the feedback. I\'ll try to do better!',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, confirmMessage]);
  };

  // Quick action suggestions
  const quickActions = [
    "Show exit popup to first-time visitors",
    "Personalize CTA for mobile users",
    "A/B test pricing page headline",
    "Hide elements for paid traffic"
  ];

  const handleQuickAction = (action: string) => {
    setInput(action);
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-xl border border-secondary-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-secondary-200 bg-gradient-to-r from-primary-50 to-purple-50">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary-100 rounded-lg">
            <Sparkles className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h3 className="font-semibold text-secondary-900">AI Workflow Assistant</h3>
            <p className="text-xs text-secondary-600">Powered by GPT-4</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-secondary-500" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-primary-500 text-white'
                  : message.role === 'system'
                  ? 'bg-secondary-100 text-secondary-700 text-sm italic'
                  : 'bg-secondary-50 text-secondary-900'
              } ${message.error ? 'border border-red-300 bg-red-50' : ''}`}
            >
              {/* Message content */}
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {message.content}
              </div>

              {/* Loading indicator */}
              {message.loading && (
                <div className="flex items-center space-x-2 mt-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary-500" />
                  <span className="text-xs text-secondary-500">Thinking...</span>
                </div>
              )}

              {/* Workflow preview */}
              {message.workflow && (
                <div className="mt-3 border border-secondary-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedWorkflow(
                      expandedWorkflow === message.id ? null : message.id
                    )}
                    className="w-full px-3 py-2 bg-white hover:bg-secondary-50 transition-colors flex items-center justify-between text-sm font-medium text-secondary-900"
                  >
                    <span className="flex items-center space-x-2">
                      <Wand2 className="w-4 h-4 text-primary-500" />
                      <span>View Workflow Details</span>
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${
                        expandedWorkflow === message.id ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {expandedWorkflow === message.id && (
                    <div className="p-3 bg-white border-t border-secondary-200 space-y-3">
                      {/* Trigger nodes */}
                      <div>
                        <h4 className="text-xs font-semibold text-secondary-700 mb-2">
                          Triggers ({message.workflow.nodes?.filter(n => n.type === 'trigger').length || 0})
                        </h4>
                        <div className="space-y-1">
                          {message.workflow.nodes
                            ?.filter(n => n.type === 'trigger')
                            .map((node, idx) => (
                              <div
                                key={idx}
                                className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded"
                              >
                                {node.name}
                              </div>
                            ))}
                        </div>
                      </div>

                      {/* Action nodes */}
                      <div>
                        <h4 className="text-xs font-semibold text-secondary-700 mb-2">
                          Actions ({message.workflow.nodes?.filter(n => n.type === 'action').length || 0})
                        </h4>
                        <div className="space-y-1">
                          {message.workflow.nodes
                            ?.filter(n => n.type === 'action')
                            .map((node, idx) => (
                              <div
                                key={idx}
                                className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded"
                              >
                                {node.name}
                              </div>
                            ))}
                        </div>
                      </div>

                      {/* Deploy button */}
                      <button
                        onClick={() => handleDeployWorkflow(message.workflow!)}
                        className="w-full py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors flex items-center justify-center space-x-2 text-sm font-medium"
                      >
                        <Check className="w-4 h-4" />
                        <span>Use This Workflow</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Timestamp and feedback */}
              {message.role === 'assistant' && !message.loading && !message.error && (
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-secondary-200">
                  <span className="text-xs text-secondary-500">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleFeedback(message.id, true)}
                      className="p-1 hover:bg-secondary-100 rounded transition-colors"
                      title="Helpful"
                    >
                      <ThumbsUp className="w-3 h-3 text-secondary-500" />
                    </button>
                    <button
                      onClick={() => handleFeedback(message.id, false)}
                      className="p-1 hover:bg-secondary-100 rounded transition-colors"
                      title="Not helpful"
                    >
                      <ThumbsDown className="w-3 h-3 text-secondary-500" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick actions */}
      {messages.length <= 2 && (
        <div className="px-4 pb-2">
          <p className="text-xs text-secondary-600 mb-2">Quick actions:</p>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => handleQuickAction(action)}
                className="text-xs px-3 py-1.5 bg-secondary-100 hover:bg-secondary-200 text-secondary-700 rounded-full transition-colors"
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-secondary-200 bg-secondary-50">
        <div className="flex space-x-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Describe what you want to do..."
            className="flex-1 px-4 py-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
            rows={2}
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:bg-secondary-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span className="hidden sm:inline">Send</span>
              </>
            )}
          </button>
        </div>
        <p className="text-xs text-secondary-500 mt-2">
          💡 Tip: Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
};

export default AIWorkflowChat;


