import React, { useState, useCallback, useEffect } from 'react';
import { 
  Plus, 
  Play, 
  Save, 
  Settings, 
  ArrowLeft,
  Trash2,
  Copy,
  Loader2,
  Check,
  Code2,
  Pause,
  Edit
} from 'lucide-react';
import { Workflow, WorkflowNode } from '../types/workflow';
import NodeLibrary from './NodeLibrary';
import WorkflowCanvas from './WorkflowCanvas';
import NodeConfigPanel from './NodeConfigPanel';
import ScrapingResults from './ScrapingResults';
import IntegrationModal from './IntegrationModal';
import { useWebScraper } from '../hooks/useWebScraper';

interface WorkflowBuilderProps {
  workflow: Workflow;
  onBack: () => void;
  onSave: (workflow: Workflow) => void;
}

const WorkflowBuilder: React.FC<WorkflowBuilderProps> = ({ 
  workflow, 
  onBack, 
  onSave 
}) => {
  const [currentWorkflow, setCurrentWorkflow] = useState<Workflow>(workflow);
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [connectingFromNode, setConnectingFromNode] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(workflow.name);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [url, setUrl] = useState(workflow.targetUrl || '');
  const [showIntegrationModal, setShowIntegrationModal] = useState(false);
  
  // Web scraping functionality
  const { isScraping, scrapingResult, scrapeUrl, clearResult } = useWebScraper();
  const [showScrapingResults, setShowScrapingResults] = useState(false);

  // Sync internal state with workflow prop when it changes
  useEffect(() => {
    setCurrentWorkflow(workflow);
    setTempName(workflow.name);
    setUrl(workflow.targetUrl || '');
    setSelectedNode(null);
  }, [workflow]);

  useEffect(() => {
    setUrl(workflow.targetUrl || '');
  }, [workflow.targetUrl]);

  const calculateNodePosition = useCallback((nodeType: string, currentNodes: WorkflowNode[]) => {
    const triggerNode = currentNodes.find(n => n.type === 'trigger');
    
    if (nodeType === 'trigger') {
      // Trigger should be at the top
      return { x: 400, y: 50 };
    }
    
    if (triggerNode) {
      // Find all operation nodes
      const operationNodes = currentNodes.filter(n => n.type !== 'trigger');
      const nodeHeight = 120; // Approximate node height
      const nodeSpacing = 50;
      
      // Calculate position below trigger - stack nodes vertically
      const yPosition = triggerNode.position.y + nodeHeight + nodeSpacing + (operationNodes.length * (nodeHeight + nodeSpacing));
      
      // Keep x position centered with the trigger
      const xPosition = triggerNode.position.x;
      
      return { x: xPosition, y: yPosition };
    }
    
    // Default position if no trigger exists
    return { x: 100, y: 100 };
  }, []);

  const handleNodeAdd = useCallback((node: WorkflowNode) => {
    setCurrentWorkflow(prev => {
      let updatedNodes = [...prev.nodes];
      let updatedConnections = [...prev.connections];

      // Validation: First node must be a trigger
      if (updatedNodes.length === 0 && node.type !== 'trigger') {
        alert('The first node in a workflow must be a trigger. Please add a trigger node first.');
        return prev;
      }

      // Calculate proper position for the new node
      const position = calculateNodePosition(node.type, updatedNodes);
      const positionedNode = { ...node, position };

      // If adding a trigger and one already exists, replace it
      if (node.type === 'trigger') {
        const existingTriggerIndex = updatedNodes.findIndex(n => n.type === 'trigger');
        if (existingTriggerIndex !== -1) {
          const existingTriggerId = updatedNodes[existingTriggerIndex].id;
          // Remove the existing trigger
          updatedNodes.splice(existingTriggerIndex, 1);
          // Remove connections from the old trigger
          updatedConnections = updatedConnections.filter(
            conn => conn.sourceNodeId !== existingTriggerId
          );
        }
      }

      // Add the new node
      updatedNodes.push(positionedNode);

      // If we're connecting from another node, create a connection
      if (connectingFromNode) {
        const connection = {
          id: `conn-${Date.now()}`,
          sourceNodeId: connectingFromNode,
          targetNodeId: positionedNode.id,
          sourceHandle: 'output',
          targetHandle: 'input'
        };
        updatedConnections.push(connection);
      }

      return {
        ...prev,
        nodes: updatedNodes,
        connections: updatedConnections
      };
    });

    if (connectingFromNode) {
      setConnectingFromNode(null);
    }
    setIsLibraryOpen(false);
  }, [connectingFromNode, calculateNodePosition]);

  const handleNodeUpdate = useCallback((updatedNode: WorkflowNode) => {
    setCurrentWorkflow(prev => ({
      ...prev,
      nodes: prev.nodes.map(node => 
        node.id === updatedNode.id ? updatedNode : node
      )
    }));
    setSelectedNode(updatedNode);
  }, []);

  const handleNodeDelete = useCallback((nodeId: string) => {
    setCurrentWorkflow(prev => ({
      ...prev,
      nodes: prev.nodes.filter(node => node.id !== nodeId),
      connections: prev.connections.filter(
        conn => conn.sourceNodeId !== nodeId && conn.targetNodeId !== nodeId
      )
    }));
    setSelectedNode(null);
  }, []);

  const handleSave = () => {
    onSave(currentWorkflow);
  };

  const handleAddConnection = useCallback((sourceNodeId: string) => {
    setConnectingFromNode(sourceNodeId);
    setIsLibraryOpen(true);
  }, []);

  const handleCanvasAddNode = useCallback(() => {
    setIsLibraryOpen(true);
  }, []);

  const handleNameDoubleClick = () => {
    setEditingName(true);
    setTempName(currentWorkflow.name);
  };

  const handleNameSave = () => {
    setCurrentWorkflow(prev => ({ ...prev, name: tempName }));
    setEditingName(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSave();
    } else if (e.key === 'Escape') {
      setTempName(currentWorkflow.name);
      setEditingName(false);
    }
  };

  const handleUrlChange = (newUrl: string) => {
    setUrl(newUrl);
    
    // Update the workflow with the new URL
    setCurrentWorkflow(prev => ({ ...prev, targetUrl: newUrl }));
    
    // Only trigger scraping if URL is not empty and looks like a URL
    if (newUrl.trim() && (newUrl.includes('.') || newUrl.includes('http'))) {
      setIsProcessing(true);
      setIsDone(false);
      
      // Trigger web scraping
      scrapeUrl(newUrl).then(() => {
        setIsProcessing(false);
        setIsDone(true);
      }).catch(() => {
        setIsProcessing(false);
        setIsDone(false);
      });
    } else {
      // Hide done icon for invalid URLs
      setIsDone(false);
      clearResult();
    }
  };

  return (
    <div className="h-screen flex flex-col bg-secondary-50 relative">
      {/* Floating Elements - No container, truly floating on canvas */}
      <div className="fixed top-4 left-72 right-4 z-30 flex items-start justify-between pointer-events-none">
        {/* Floating Workflow Details - Left side */}
        <div className="flex items-start space-x-3 pointer-events-auto">
          <button
            onClick={onBack}
            className="p-2 bg-white/90 backdrop-blur-sm hover:bg-white border border-secondary-200 rounded-lg text-secondary-600 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="pt-1">
            {editingName ? (
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onBlur={handleNameSave}
                onKeyDown={handleNameKeyDown}
                className="text-lg font-medium text-secondary-900 bg-white/90 backdrop-blur-sm border border-secondary-300 rounded px-1 py-0 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 w-auto min-w-0"
                style={{ width: `${Math.max(tempName.length * 0.6, 8)}ch` }}
                autoFocus
              />
            ) : (
              <h1 
                className="text-lg font-medium text-secondary-900 drop-shadow-sm cursor-pointer hover:text-primary-600 transition-colors"
                onDoubleClick={handleNameDoubleClick}
                title="Double-click to edit"
              >
                {currentWorkflow.name}
              </h1>
            )}
            <div className="flex items-center space-x-2">
              <input
                type="url"
                value={url}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder="Add a webpage URL"
                className="text-xs text-secondary-600 bg-white/90 backdrop-blur-sm border border-secondary-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-w-0"
                style={{ width: `${Math.max(url.length * 0.5, 20)}ch` }}
              />
              {isProcessing && (
                <Loader2 className="w-3 h-3 text-primary-500 animate-spin" />
              )}
              {isDone && scrapingResult?.success && (
                <div 
                  title={`Scraped ${scrapingResult.data?.length || 0} elements`}
                  className="cursor-pointer hover:scale-110 transition-transform"
                  onClick={() => setShowScrapingResults(true)}
                >
                  <Check className="w-3 h-3 text-green-500" />
                </div>
              )}
              {isDone && scrapingResult && !scrapingResult.success && (
                <div className="w-3 h-3 text-red-500" title={scrapingResult.error}>⚠️</div>
              )}
            </div>
          </div>
        </div>
        
        {/* Floating Action Buttons - Right side */}
        <div className="flex items-center space-x-3 pointer-events-auto">
          {/* Workflow Status Toggle */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-secondary-600">Status:</span>
            <button
              onClick={() => {
                const newStatus = currentWorkflow.status === 'active' ? 'draft' : 'active';
                setCurrentWorkflow(prev => ({
                  ...prev,
                  status: newStatus,
                  isActive: newStatus === 'active'
                }));
              }}
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                currentWorkflow.status === 'active'
                  ? 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200'
                  : currentWorkflow.status === 'paused'
                  ? 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200'
                  : 'bg-secondary-100 text-secondary-800 border-secondary-200 hover:bg-secondary-200'
              }`}
            >
              {currentWorkflow.status === 'active' ? (
                <>
                  <Play className="w-3 h-3 mr-1" />
                  Active
                </>
              ) : currentWorkflow.status === 'paused' ? (
                <>
                  <Pause className="w-3 h-3 mr-1" />
                  Paused
                </>
              ) : (
                <>
                  <Edit className="w-3 h-3 mr-1" />
                  Draft
                </>
              )}
            </button>
          </div>
          
          {/* Integration Button - Show when URL is set and scraping is complete */}
          {url && isDone && scrapingResult?.success && (
            <button
              onClick={() => setShowIntegrationModal(true)}
              className="flex items-center space-x-2 px-4 py-2 text-primary-700 bg-primary-50/90 backdrop-blur-sm border border-primary-200 hover:bg-primary-100 transition-colors font-medium text-sm rounded-lg shadow-sm"
            >
              <Code2 className="w-4 h-4" />
              <span>Integration</span>
            </button>
          )}
          <button
            onClick={handleSave}
            className="flex items-center space-x-2 px-4 py-2 text-secondary-700 bg-white/90 backdrop-blur-sm border border-secondary-200 hover:bg-white transition-colors font-medium text-sm rounded-lg shadow-sm"
          >
            <Save className="w-4 h-4" />
            <span>Save</span>
          </button>
          <button 
            className={`flex items-center space-x-2 px-4 py-2 backdrop-blur-sm text-white transition-colors font-medium text-sm rounded-lg shadow-sm ${
              currentWorkflow.status === 'active' 
                ? 'bg-green-600/90 hover:bg-green-700' 
                : 'bg-secondary-600/90 hover:bg-secondary-700'
            }`}
          >
            <Play className="w-4 h-4" />
            <span>{currentWorkflow.status === 'active' ? 'Test Live' : 'Test Draft'}</span>
          </button>
        </div>
      </div>

      {/* Main Content - Canvas takes full height */}
      <div className="flex-1 flex">
        {/* Canvas */}
        <div className="flex-1 relative">
          <WorkflowCanvas
            workflow={currentWorkflow}
            selectedNode={selectedNode}
            onNodeSelect={setSelectedNode}
            onNodeUpdate={handleNodeUpdate}
            onNodeDelete={handleNodeDelete}
            onAddConnection={handleAddConnection}
            onAddNode={handleCanvasAddNode}
          />
        </div>
      </div>

      {/* Modern Floating Configuration Panel */}
      {selectedNode && (
        <div className="fixed inset-0 z-40 pointer-events-none">
          <div className="absolute inset-y-0 right-0 w-96 pointer-events-auto">
            <NodeConfigPanel
              node={selectedNode}
              onNodeUpdate={handleNodeUpdate}
              onClose={() => setSelectedNode(null)}
              scrapedElements={scrapingResult?.data || []}
            />
          </div>
        </div>
      )}

      {/* Node Library Modal */}
      {isLibraryOpen && (
        <NodeLibrary
          onNodeAdd={handleNodeAdd}
          onClose={() => setIsLibraryOpen(false)}
          connectingFromNode={connectingFromNode}
          currentWorkflow={currentWorkflow}
        />
      )}

      {/* Scraping Results Modal */}
      {showScrapingResults && scrapingResult && (
        <ScrapingResults
          result={scrapingResult}
          onClose={() => setShowScrapingResults(false)}
        />
      )}

      {/* Integration Modal */}
      <IntegrationModal
        workflow={currentWorkflow}
        isOpen={showIntegrationModal}
        onClose={() => setShowIntegrationModal(false)}
      />
    </div>
  );
};

export default WorkflowBuilder;