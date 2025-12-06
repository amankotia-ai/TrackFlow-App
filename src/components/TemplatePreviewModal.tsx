import React, { useEffect, useMemo } from 'react';
import * as Icons from 'lucide-react';
import {
  X,
  Copy,
  Clock,
  Tag,
} from 'lucide-react';
import { WorkflowTemplate, WorkflowNode as WorkflowNodeType } from '../types/workflow';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  useReactFlow,
  BackgroundVariant,
  MarkerType,
  Handle,
  Position,
} from 'reactflow';
import ELK from 'elkjs/lib/elk.bundled.js';
import 'reactflow/dist/style.css';

interface TemplatePreviewModalProps {
  template: WorkflowTemplate | null;
  isOpen: boolean;
  onClose: () => void;
  onUseTemplate: (template: WorkflowTemplate) => void;
}

// ELK instance for layout
const elk = new ELK();

// ELK layout options
const elkOptions = {
  'elk.algorithm': 'layered',
  'elk.layered.spacing.nodeNodeBetweenLayers': '100',
  'elk.spacing.nodeNode': '80',
  'elk.direction': 'DOWN',
};

// Custom Node Component - Matching Analytics/Templates design
const CustomNode: React.FC<{ data: any }> = ({ data }) => {
  const node = data.node as WorkflowNodeType;
  const IconComponent = Icons[node.icon as keyof typeof Icons] as React.ComponentType<any>;

  const getNodeTypeColor = (type: string) => {
    switch (type) {
      case 'trigger': return 'text-blue-600';
      case 'action': return 'text-green-600';
      case 'condition': return 'text-purple-600';
      default: return 'text-zinc-600';
    }
  };

  const getNodeTypeBg = (type: string) => {
    switch (type) {
      case 'trigger': return 'bg-blue-50';
      case 'action': return 'bg-green-50';
      case 'condition': return 'bg-purple-50';
      default: return 'bg-zinc-50';
    }
  };

  return (
    <div className="w-80 bg-white border border-zinc-200 rounded-md shadow-sm hover:shadow-md transition-all">
      {/* Connection Handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-zinc-400 !border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-zinc-400 !border-2 !border-white"
      />

      {/* Header */}
      <div className={`px-4 py-3 border-b border-zinc-200 ${getNodeTypeBg(node.type)}`}>
        <div className="flex items-center gap-3">
          {IconComponent && (
            <IconComponent className={`size-4 ${getNodeTypeColor(node.type)}`} />
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-zinc-900 text-sm truncate">{node.name}</h3>
            <p className="text-xs text-zinc-500 truncate">{node.category}</p>
          </div>
          <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">
            {node.type}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 bg-white">
        <p className="text-xs text-zinc-600 mb-3 line-clamp-2">{node.description}</p>
        
        {/* Configuration Preview */}
        {Object.keys(node.config).length > 0 && (
          <div className="space-y-2 pt-3 border-t border-zinc-100">
            <div className="flex items-center gap-2">
              <div className="text-xs text-zinc-400 uppercase tracking-wider">Config</div>
              <div className="flex-1 h-px bg-zinc-200"></div>
            </div>
            <div className="space-y-1.5">
              {Object.entries(node.config).slice(0, 2).map(([key, value]) => (
                <div key={key} className="flex items-start justify-between gap-2 text-xs">
                  <span className="text-zinc-500">{key}</span>
                  <span className="text-zinc-900 truncate max-w-40 text-right font-mono text-[11px]">
                    {typeof value === 'string' ? value : JSON.stringify(value)}
                  </span>
                </div>
              ))}
              {Object.keys(node.config).length > 2 && (
                <div className="text-xs text-zinc-400">
                  +{Object.keys(node.config).length - 2} more
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const nodeTypes = {
  custom: CustomNode,
};

// Function to apply ELK layout
async function getLayoutedElements(nodes: Node[], edges: Edge[]) {
  const graph = {
    id: 'root',
    layoutOptions: elkOptions,
    children: nodes.map((node) => ({
      id: node.id,
      width: 320,
      height: 200,
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  };

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
}

// Inner component that uses React Flow hooks
const FlowContent: React.FC<{
  template: WorkflowTemplate;
  onUseTemplate: (template: WorkflowTemplate) => void;
  onClose: () => void;
}> = ({ template, onUseTemplate, onClose }) => {
  const { fitView } = useReactFlow();

  // Convert workflow nodes to React Flow nodes
  const initialNodes: Node[] = useMemo(() => {
    return template.nodes.map((node) => ({
      id: node.id,
      type: 'custom',
      position: node.position,
      data: { node },
      draggable: false,
      selectable: false,
    }));
  }, [template.nodes]);

  // Convert workflow connections to React Flow edges
  const initialEdges: Edge[] = useMemo(() => {
    return template.connections.map((conn) => ({
      id: conn.id,
      source: conn.sourceNodeId,
      target: conn.targetNodeId,
      type: 'smoothstep',
      animated: false,
      style: { 
        stroke: '#a1a1aa',
        strokeWidth: 2,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#a1a1aa',
      },
    }));
  }, [template.connections]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Apply ELK layout on mount
  useEffect(() => {
    const applyLayout = async () => {
      const { nodes: layoutedNodes, edges: layoutedEdges } = await getLayoutedElements(
        initialNodes,
        initialEdges
      );
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
      
      // Fit view after layout
      setTimeout(() => {
        fitView({ padding: 0.2, duration: 300 });
      }, 50);
    };

    applyLayout();
  }, [initialNodes, initialEdges, setNodes, setEdges, fitView]);

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'Beginner':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'Intermediate':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Advanced':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-zinc-50 text-zinc-700 border-zinc-200';
    }
  };

  const TemplateIcon = template.templateMeta.icon
    ? (Icons as any)[template.templateMeta.icon]
    : Icons.Zap;

  const triggerCount = template.nodes.filter(n => n.type === 'trigger').length;
  const actionCount = template.nodes.filter(n => n.type === 'action').length;
  const conditionCount = template.nodes.filter(n => n.type === 'condition').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="relative bg-white rounded-md shadow-xl w-full max-w-7xl h-[90vh] flex flex-col border border-zinc-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-zinc-200">
          <div className="flex flex-col items-start gap-3 flex-1 min-w-0">
            {TemplateIcon && <TemplateIcon className="size-5 text-zinc-900 flex-shrink-0" />}
            <div className="flex-1 min-w-0 w-full">
              <h2 className="text-lg font-medium text-zinc-900 mb-1 truncate">
                {template.name}
              </h2>
              <p className="text-sm text-zinc-600 mb-3 line-clamp-1">
                {template.description}
              </p>
              {/* Meta badges */}
              <div className="flex flex-wrap items-center gap-2">
                {template.templateMeta.difficulty && (
                  <span
                    className={`inline-flex items-center text-xs px-2 py-0.5 rounded border font-medium ${getDifficultyColor(
                      template.templateMeta.difficulty
                    )}`}
                  >
                    {template.templateMeta.difficulty}
                  </span>
                )}
                {template.templateMeta.estimatedTime && (
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-zinc-50 text-zinc-700 rounded border border-zinc-200">
                    <Clock className="size-3" />
                    <span>{template.templateMeta.estimatedTime}</span>
                  </span>
                )}
                <span className="inline-flex items-center text-xs px-2 py-0.5 bg-zinc-50 text-zinc-700 rounded border border-zinc-200">
                  {template.templateMeta.categoryLabel}
                </span>
                <span className="inline-flex items-center text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200">
                  {triggerCount} Trigger{triggerCount !== 1 ? 's' : ''}
                </span>
                {conditionCount > 0 && (
                  <span className="inline-flex items-center text-xs px-2 py-0.5 bg-purple-50 text-purple-700 rounded border border-purple-200">
                    {conditionCount} Condition{conditionCount !== 1 ? 's' : ''}
                  </span>
                )}
                <span className="inline-flex items-center text-xs px-2 py-0.5 bg-green-50 text-green-700 rounded border border-green-200">
                  {actionCount} Action{actionCount !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-1.5 hover:bg-zinc-100 rounded transition-colors flex-shrink-0"
          >
            <X className="size-4 text-zinc-500" />
          </button>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 relative bg-zinc-50">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            attributionPosition="bottom-right"
            proOptions={{ hideAttribution: true }}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            panOnDrag={true}
            zoomOnScroll={true}
            zoomOnPinch={true}
            panOnScroll={false}
          >
            <Background 
              color="#a1a1aa" 
              gap={20} 
              size={1}
              variant={BackgroundVariant.Dots}
            />
            <Controls 
              showInteractive={false}
              className="bg-white border border-zinc-200 rounded-md shadow-sm"
            />
            <MiniMap
              nodeColor={(node) => {
                const nodeData = node.data.node as WorkflowNodeType;
                switch (nodeData.type) {
                  case 'trigger': return '#2563eb';
                  case 'action': return '#16a34a';
                  case 'condition': return '#9333ea';
                  default: return '#71717a';
                }
              }}
              maskColor="rgba(255, 255, 255, 0.8)"
              className="bg-white border border-zinc-200 rounded-md shadow-sm"
            />
          </ReactFlow>
        </div>

        {/* Footer with Summary */}
        <div className="px-6 py-4 border-t border-zinc-200 bg-white">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-4 flex-1 min-w-0">
              {template.templateMeta.summary && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-600 line-clamp-2">
                    {template.templateMeta.summary}
                  </p>
                </div>
              )}
              {template.templateMeta.tags && template.templateMeta.tags.length > 0 && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Tag className="size-3 text-zinc-400" />
                  <div className="flex flex-wrap gap-1.5">
                    {template.templateMeta.tags.slice(0, 3).map((tag, idx) => (
                      <span
                        key={idx}
                        className="inline-block text-xs px-2 py-0.5 bg-zinc-100 text-zinc-600 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                    {template.templateMeta.tags.length > 3 && (
                      <span className="inline-block text-xs px-2 py-0.5 bg-zinc-100 text-zinc-600 rounded">
                        +{template.templateMeta.tags.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-zinc-700 bg-white border border-zinc-300 hover:bg-zinc-50 transition-colors font-medium rounded-md"
              >
                Close
              </button>
              <button
                onClick={() => {
                  onUseTemplate(template);
                  onClose();
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-zinc-900 text-white hover:bg-zinc-800 transition-colors font-medium rounded-md"
              >
                <Copy className="size-4" />
                <span>Use Template</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main component with provider
const TemplatePreviewModal: React.FC<TemplatePreviewModalProps> = ({
  template,
  isOpen,
  onClose,
  onUseTemplate,
}) => {
  if (!isOpen || !template) return null;

  return (
    <ReactFlowProvider>
      <FlowContent template={template} onUseTemplate={onUseTemplate} onClose={onClose} />
    </ReactFlowProvider>
  );
};

export default TemplatePreviewModal;
