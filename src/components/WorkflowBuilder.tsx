import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { 
  ArrowLeft,
  Loader2,
  Check,
  AlertTriangle,
  Play,
  Pause,
  AlertCircle,
  Edit,
  Database,
  Code2,
  Save,
  Plus,
  Layout
} from 'lucide-react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  addEdge,
  Connection,
  MarkerType,
  useReactFlow,
  BackgroundVariant,
  NodeChange,
  EdgeChange,
  applyNodeChanges,
  applyEdgeChanges
} from 'reactflow';
import ELK from 'elkjs/lib/elk.bundled.js';
import 'reactflow/dist/style.css';

import { Workflow, WorkflowNode, WorkflowConnection } from '../types/workflow';
import AddNodeMenu from './AddNodeMenu';
// import NodeConfigPanel from './NodeConfigPanel';
import IntegrationModal from './IntegrationModal';
import EnvironmentComponents from './EnvironmentComponents';
import { useAutoSave } from '../hooks/useAutoSave';
import { useToast } from './Toast';
import WorkflowBuilderNode from './WorkflowBuilderNode';

interface WorkflowBuilderProps {
  workflow: Workflow;
  onBack: () => void;
  onSave: (workflow: Workflow) => Promise<void>;
}

const nodeTypes = {
  custom: WorkflowBuilderNode,
};

// ELK instance for layout
const elk = new ELK();

// ELK layout options
const elkOptions = {
  'elk.algorithm': 'layered',
  'elk.layered.spacing.nodeNodeBetweenLayers': '100',
  'elk.spacing.nodeNode': '100',
  'elk.direction': 'DOWN',
};

// Function to apply ELK layout
async function getLayoutedElements(nodes: Node[], edges: Edge[]) {
  const graph = {
    id: 'root',
    layoutOptions: elkOptions,
    children: nodes.map((node) => {
      // Use measured dimensions if available, otherwise fallback to defaults
      // ReactFlow v11+ stores dimensions in 'measured' object, older versions or initial state might use width/height or nothing
      const width = node.measured?.width ?? node.width ?? 320;
      const height = node.measured?.height ?? node.height ?? 300; // Increased default height to be safe
      
      return {
        id: node.id,
        width: width + 40, // Add horizontal padding for layout
        height: height + 40, // Add vertical padding for layout
      };
    }),
    edges: edges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  };

  try {
    const layoutedGraph = await elk.layout(graph);

    const layoutedNodes = nodes.map((node) => {
      const layoutedNode = layoutedGraph.children?.find((n) => n.id === node.id);
      return {
        ...node,
        position: {
          x: layoutedNode?.x ?? node.position.x,
          y: layoutedNode?.y ?? node.position.y,
        },
      };
    });

    return { nodes: layoutedNodes, edges };
  } catch (error) {
    console.error('Layout calculation failed:', error);
    return { nodes, edges };
  }
}

// Helper to convert WorkflowNode to ReactFlow Node
const toRfNode = (
  node: WorkflowNode, 
  onUpdate?: (node: WorkflowNode) => void, 
  onDelete?: (id: string) => void,
  onOpenComponentPicker?: (callback: (value: string) => void) => void
): Node => ({
  id: node.id,
  type: 'custom',
  position: node.position,
  data: { 
    node, 
    onUpdate,
    onDelete,
    onOpenComponentPicker
  },
  dragHandle: '.drag-handle',
});

// Helper to convert WorkflowConnection to ReactFlow Edge
const toRfEdge = (conn: WorkflowConnection): Edge => ({
  id: conn.id,
  source: conn.sourceNodeId,
  target: conn.targetNodeId,
  sourceHandle: conn.sourceHandle,
  targetHandle: conn.targetHandle,
  type: 'smoothstep',
  animated: true,
  style: { stroke: '#a1a1aa', strokeWidth: 2, strokeDasharray: '5,5' },
  markerEnd: { type: MarkerType.ArrowClosed, color: '#a1a1aa' },
});

const WorkflowBuilderContent: React.FC<WorkflowBuilderProps> = ({ 
  workflow, 
  onBack, 
  onSave 
}) => {
  // --- State ---
  const [nodes, setNodes] = useNodesState([]);
  const [edges, setEdges] = useEdgesState([]);
  
  // Internal state for workflow metadata (name, etc.)
  const [currentWorkflowMeta, setCurrentWorkflowMeta] = useState<Omit<Workflow, 'nodes' | 'connections'>>({
    ...workflow
  });
  
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [connectingFromNode, setConnectingFromNode] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(workflow.name);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [url, setUrl] = useState(workflow.targetUrl || '');
  const [showIntegrationModal, setShowIntegrationModal] = useState(false);
  const [showEnvironmentComponents, setShowEnvironmentComponents] = useState(false);
  const [componentPickerCallback, setComponentPickerCallback] = useState<((value: string) => void) | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [originalWorkflow, setOriginalWorkflow] = useState<Workflow>(workflow);

  const { showToast } = useToast();
  const { fitView, getNodes, getEdges } = useReactFlow();

  // --- Event Handlers (Defined before effects) ---

  const handleNodeDelete = useCallback((nodeId: string) => {
    setNodes(nds => nds.filter(n => n.id !== nodeId));
    setEdges(eds => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
  }, [selectedNodeId, setNodes, setEdges]);

  const handleNodeUpdate = useCallback((updatedWorkflowNode: WorkflowNode) => {
    setNodes(nds => nds.map(n => {
        if (n.id === updatedWorkflowNode.id) {
            return {
                ...n,
                // Do NOT update position here to avoid jumping issues
                // Position is managed by ReactFlow via onNodesChange
                data: { 
                    ...n.data, 
                    node: updatedWorkflowNode 
                }
            };
        }
        return n;
    }));
  }, [setNodes]);

  const handleOpenComponentPicker = useCallback((callback: (value: string) => void) => {
    setComponentPickerCallback(() => callback);
    setShowEnvironmentComponents(true);
  }, []);

  // --- Layout Helper ---
  const onLayout = useCallback(async () => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = await getLayoutedElements(
      nodes,
      edges
    );
    setNodes([...layoutedNodes]);
    setEdges([...layoutedEdges]);
    
    setTimeout(() => {
      fitView({ padding: 0.2, maxZoom: 1, duration: 300 });
    }, 50);
  }, [nodes, edges, setNodes, setEdges, fitView]);

  // --- Initialization ---
  useEffect(() => {
    if (workflow.id !== originalWorkflow.id) {
        const initialNodes = workflow.nodes.map(n => toRfNode(n, handleNodeUpdate, handleNodeDelete, handleOpenComponentPicker));
        const initialEdges = workflow.connections.map(toRfEdge);
        setNodes(initialNodes);
        setEdges(initialEdges);
        setCurrentWorkflowMeta({ ...workflow });
        setOriginalWorkflow(workflow);
        setTempName(workflow.name);
        setUrl(workflow.targetUrl || '');
        
        // Apply layout on load if nodes exist but positions are all 0,0 or clumped
        // Or just always apply for consistency if requested
        if (initialNodes.length > 0) {
            getLayoutedElements(initialNodes, initialEdges).then(({ nodes: lNodes, edges: lEdges }) => {
                setNodes(lNodes);
                setEdges(lEdges);
                setTimeout(() => fitView({ padding: 0.2, maxZoom: 1 }), 50);
            });
        }
    }
  }, [workflow.id, originalWorkflow.id, handleNodeUpdate, handleNodeDelete, handleOpenComponentPicker]);

  // Initial load
  useEffect(() => {
    const initialNodes = workflow.nodes.map(n => toRfNode(n, handleNodeUpdate, handleNodeDelete, handleOpenComponentPicker));
    const initialEdges = workflow.connections.map(toRfEdge);
    
    getLayoutedElements(initialNodes, initialEdges).then(({ nodes: lNodes, edges: lEdges }) => {
        setNodes(lNodes);
        setEdges(lEdges);
        setTimeout(() => fitView({ padding: 0.2, maxZoom: 1 }), 50);
    });
  }, []); // Only run once on mount

  // --- Computed Data ---
  
  // Construct current workflow object for comparison and saving
  const currentWorkflow = useMemo((): Workflow => {
    return {
      ...currentWorkflowMeta,
      nodes: nodes.map(n => ({
        ...n.data.node,
        position: n.position
      })),
      connections: edges.map(e => ({
        id: e.id,
        sourceNodeId: e.source,
        targetNodeId: e.target,
        sourceHandle: e.sourceHandle || 'output',
        targetHandle: e.targetHandle || 'input'
      }))
    };
  }, [currentWorkflowMeta, nodes, edges]);

  // Check for changes
  const hasChanges = useMemo(() => {
    const isSame = 
      currentWorkflow.name === originalWorkflow.name &&
      currentWorkflow.description === originalWorkflow.description &&
      currentWorkflow.targetUrl === originalWorkflow.targetUrl &&
      currentWorkflow.status === originalWorkflow.status &&
      JSON.stringify(currentWorkflow.nodes) === JSON.stringify(originalWorkflow.nodes) &&
      JSON.stringify(currentWorkflow.connections) === JSON.stringify(originalWorkflow.connections);
    
    return !isSame;
  }, [currentWorkflow, originalWorkflow]);

  // --- Event Handlers ---

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, [setNodes]);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, [setEdges]);

  const onConnect = useCallback((params: Connection) => {
    const newEdge = {
        ...params,
        id: `conn-${Date.now()}`,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#a1a1aa', strokeWidth: 2, strokeDasharray: '5,5' },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#a1a1aa' },
    };
    setEdges((eds) => addEdge(newEdge, eds));
  }, [setEdges]);

  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const handleSave = async () => {
    if (!hasChanges || isSaving) return;
    
    try {
      setIsSaving(true);
      await onSave(currentWorkflow);
      setOriginalWorkflow(currentWorkflow);
    } catch (error) {
      console.error('Save failed:', error);
      showToast('Failed to save workflow', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-save
  useAutoSave(currentWorkflow, {
    enabled: hasChanges && !isSaving,
    delay: 3000,
    onSave: async (wf) => {
      await onSave(wf);
      return wf;
    },
    onSuccess: () => {
        setOriginalWorkflow(currentWorkflow);
        console.log('🔄 Auto-saved workflow');
    },
    onError: (error) => {
      console.error('❌ Auto-save failed:', error);
      showToast('Auto-save failed', 'error');
    }
  });

  // Node Library & Adding Nodes
  const calculateNodePosition = useCallback((nodeType: string, currentNodes: Node[]) => {
    const triggerNode = currentNodes.find(n => n.data.node.type === 'trigger');
    
    if (nodeType === 'trigger') {
      return { x: 400, y: 50 };
    }
    
    if (triggerNode) {
      // Simple layout logic: find lowest node and place below
      let maxY = triggerNode.position.y;
      currentNodes.forEach(n => {
          if (n.position.y > maxY) maxY = n.position.y;
      });
      
      return { x: triggerNode.position.x, y: maxY + 150 };
    }
    
    return { x: 400, y: 200 };
  }, []);

  const handleNodeAdd = useCallback(async (newNodeData: WorkflowNode) => {
    const currentNodes = getNodes();
    const currentEdges = getEdges();

    let updatedNodes = [...currentNodes];
    let updatedEdges = [...currentEdges];

    // If adding trigger and one exists, remove it
    if (newNodeData.type === 'trigger') {
        updatedNodes = updatedNodes.filter(n => n.data.node.type !== 'trigger');
        // Also remove edges connected to old trigger
        updatedEdges = updatedEdges.filter(e => {
            const isConnectedToTrigger = currentNodes.find(n => n.data.node.type === 'trigger' && (n.id === e.source || n.id === e.target));
            return !isConnectedToTrigger;
        });
    }

    const position = calculateNodePosition(newNodeData.type, updatedNodes);
    
    const newNode: Node = {
        id: newNodeData.id,
        type: 'custom',
        position,
        data: { 
            node: { ...newNodeData, position }, // Keep position in sync
            onDelete: handleNodeDelete, // Pass delete handler to node
            onUpdate: handleNodeUpdate,
            onOpenComponentPicker: handleOpenComponentPicker
        },
    };
    
    updatedNodes.push(newNode);

    // Determine source for connection: explicitly selected node OR default to trigger
    let sourceNodeId = connectingFromNode;
    
    if (!sourceNodeId && newNodeData.type !== 'trigger') {
        const triggerNode = updatedNodes.find(n => n.data.node.type === 'trigger');
        if (triggerNode) {
            sourceNodeId = triggerNode.id;
        }
    }

    // If we have a source to connect from
    if (sourceNodeId) {
        const newEdge = {
            id: `conn-${Date.now()}`,
            source: sourceNodeId,
            target: newNode.id,
            sourceHandle: 'output',
            targetHandle: 'input', // Explicitly set target handle
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#a1a1aa', strokeWidth: 2, strokeDasharray: '5,5' },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#a1a1aa' },
        };
        updatedEdges = addEdge(newEdge, updatedEdges);
    }

    // Auto layout immediately with new nodes/edges
    const { nodes: layoutedNodes, edges: layoutedEdges } = await getLayoutedElements(
        updatedNodes,
        updatedEdges
    );
    
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
    
    setTimeout(() => {
        fitView({ padding: 0.2, maxZoom: 1, duration: 300 });
    }, 50);

    setConnectingFromNode(null);
    setIsLibraryOpen(false);
  }, [connectingFromNode, calculateNodePosition, setNodes, setEdges, handleNodeDelete, handleNodeUpdate, handleOpenComponentPicker, getNodes, getEdges, fitView]);

  // Removed duplicate definitions of handleNodeDelete and handleNodeUpdate from here as they were moved up

  // Pass delete handler to existing nodes
  useEffect(() => {
    setNodes(nds => nds.map(n => ({
        ...n,
        data: {
            ...n.data,
            onDelete: handleNodeDelete,
            onOpenComponentPicker: handleOpenComponentPicker
        }
    })));
  }, [handleNodeDelete, handleOpenComponentPicker]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (hasChanges && !isSaving) {
          handleSave();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasChanges, isSaving, handleSave]);


  // --- UI Helpers ---
  const handleNameSave = () => {
    setCurrentWorkflowMeta(prev => ({ ...prev, name: tempName }));
    setEditingName(false);
  };

  const handleUrlChange = (newUrl: string) => {
    setUrl(newUrl);
    setCurrentWorkflowMeta(prev => ({ ...prev, targetUrl: newUrl }));
    
    if (newUrl.trim() && (newUrl.includes('.') || newUrl.includes('http'))) {
      setIsProcessing(true);
      setTimeout(() => {
        setIsProcessing(false);
        setIsDone(true);
      }, 500);
    } else {
      setIsDone(false);
      setIsProcessing(false);
    }
  };

  // Selected Node Object for Config Panel
  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    const node = nodes.find(n => n.id === selectedNodeId);
    if (!node) return null;
    
    // Ensure we pass the current visual position, not the stale data.node position
    return {
        ...node.data.node,
        position: node.position
    } as WorkflowNode;
  }, [selectedNodeId, nodes]);

  return (
    <div className="h-screen flex flex-col bg-zinc-50 relative">
      {/* Header Bar */}
      <div className="w-full bg-white border-b border-zinc-200 z-30">
        <div className="px-6 py-3 flex items-center justify-between">
          {/* Left: Back & Title */}
          <div className="flex items-center space-x-4 flex-1">
            <button
              onClick={onBack}
              className="p-1.5 hover:bg-zinc-100 rounded-md text-zinc-500 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            {editingName ? (
              <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  onBlur={handleNameSave}
                  onKeyDown={(e) => e.key === 'Enter' && handleNameSave()}
                  className="text-sm font-semibold text-zinc-900 bg-white border border-zinc-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  autoFocus
              />
            ) : (
              <h1 
                  className="text-sm font-semibold text-zinc-900 cursor-pointer hover:text-primary-600 transition-colors"
                  onDoubleClick={() => { setEditingName(true); setTempName(currentWorkflowMeta.name); }}
              >
                  {currentWorkflowMeta.name}
              </h1>
            )}
          </div>
          
          {/* Right: Actions */}
          <div className="flex items-center space-x-3">
             {/* Status Toggle with Dot Indicator */}
              <button
                  onClick={() => {
                      const nextStatus = currentWorkflowMeta.status === 'active' ? 'paused' : 'active';
                      setCurrentWorkflowMeta(prev => ({ ...prev, status: nextStatus, isActive: nextStatus === 'active' }));
                      handleSave();
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
              >
                  <div className={`w-2 h-2 rounded-full ${
                      currentWorkflowMeta.status === 'active' 
                      ? 'bg-green-500' 
                      : 'bg-zinc-300'
                  }`}></div>
                  <span>{currentWorkflowMeta.status === 'active' ? 'Active' : 'Paused'}</span>
              </button>

            <button
              onClick={() => setShowEnvironmentComponents(true)}
              className="flex items-center space-x-2 px-3 py-2 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors font-medium text-sm rounded-lg"
            >
              <Database className="w-4 h-4" />
              <span>Components</span>
            </button>
            
            {/* Integration */}
            <button
              onClick={() => setShowIntegrationModal(true)}
              className="flex items-center space-x-2 px-3 py-2 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors font-medium text-sm rounded-lg"
            >
              <Code2 className="w-4 h-4" />
              <span>Integration</span>
            </button>

            {/* Save */}
            <button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className={`flex items-center space-x-2 px-4 py-2 transition-all font-medium text-sm rounded-lg ${
                isSaving
                  ? 'text-zinc-400 bg-zinc-100'
                  : hasChanges
                  ? 'text-white bg-zinc-900 hover:bg-zinc-800 shadow-sm'
                  : 'text-zinc-400 bg-zinc-100'
              } ${(!hasChanges || isSaving) ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : hasChanges ? (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Saved</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 w-full h-full">
        <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            onNodeClick={handleNodeClick}
            onPaneClick={handlePaneClick}
            fitView
            attributionPosition="bottom-right"
            proOptions={{ hideAttribution: true }}
            className="bg-zinc-50"
        >
            <Background 
              color="#a1a1aa" 
              gap={20} 
              size={1}
              variant={BackgroundVariant.Dots}
            />
            <Controls className="bg-transparent border-none shadow-none !bottom-4 !right-4" />
        </ReactFlow>
      </div>

      {/* Add Node Floating Button (if no library open) */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30">
        <button
            onClick={() => setIsLibraryOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-full shadow-lg hover:bg-zinc-800 hover:scale-105 transition-all font-medium text-sm"
        >
            <Plus className="w-4 h-4" />
            <span>Add Node</span>
        </button>
      </div>

      {/* Config Panel - Removed as requested, config is now on the node */}
      {/* {selectedNode && (
        <div className="fixed inset-0 z-40 pointer-events-none">
          <div className="absolute inset-y-0 right-0 w-96 pointer-events-auto bg-white border-l border-zinc-200 shadow-xl">
            <NodeConfigPanel
              key={selectedNode.id}
              node={selectedNode}
              onNodeUpdate={handleNodeUpdate}
              onClose={() => setSelectedNodeId(null)}
            />
          </div>
        </div>
      )} */}

      {/* Add Node Menu */}
      <AddNodeMenu
        isOpen={isLibraryOpen}
        onClose={() => {
          setIsLibraryOpen(false);
          setConnectingFromNode(null);
        }}
        onNodeAdd={handleNodeAdd}
        connectingFromNode={connectingFromNode}
        currentWorkflow={currentWorkflow}
      />

      {/* Modals */}
      <IntegrationModal
        workflow={currentWorkflow}
        isOpen={showIntegrationModal}
        onClose={() => setShowIntegrationModal(false)}
      />

      <EnvironmentComponents
        isOpen={showEnvironmentComponents}
        onClose={() => {
            setShowEnvironmentComponents(false);
            setComponentPickerCallback(null);
        }}
        selectionMode={!!componentPickerCallback}
        filterType="css_selector"
        onSelectComponent={(component) => {
            if (componentPickerCallback) {
                componentPickerCallback(component.value);
                setShowEnvironmentComponents(false);
                setComponentPickerCallback(null);
            }
        }}
      />
    </div>
  );
};

const WorkflowBuilder: React.FC<WorkflowBuilderProps> = (props) => (
  <ReactFlowProvider>
    <WorkflowBuilderContent {...props} />
  </ReactFlowProvider>
);

export default WorkflowBuilder;
