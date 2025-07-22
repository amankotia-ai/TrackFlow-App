import React, { useCallback, useState, useRef, useEffect } from 'react';
import { Workflow, WorkflowNode } from '../types/workflow';
import NodeComponent from './WorkflowNode';
import { Plus, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface WorkflowCanvasProps {
  workflow: Workflow;
  selectedNode: WorkflowNode | null;
  onNodeSelect: (node: WorkflowNode) => void;
  onNodeUpdate: (node: WorkflowNode) => void;
  onNodeDelete: (nodeId: string) => void;
  onAddConnection?: (sourceNodeId: string) => void;
  onAddNode?: () => void;
}

const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({
  workflow,
  selectedNode,
  onNodeSelect,
  onNodeUpdate,
  onNodeDelete,
  onAddConnection,
  onAddNode
}) => {
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  // Pan and zoom state
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent, node: WorkflowNode) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setDraggedNode(node.id);
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  }, []);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as Element).closest('.canvas-background')) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
      e.preventDefault();
    }
  }, [transform]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (draggedNode) {
      // Node dragging
      const canvasRect = e.currentTarget.getBoundingClientRect();
      const newX = (e.clientX - canvasRect.left - dragOffset.x - transform.x) / transform.scale;
      const newY = (e.clientY - canvasRect.top - dragOffset.y - transform.y) / transform.scale;

      const node = workflow.nodes.find(n => n.id === draggedNode);
      if (node) {
        const updatedNode = {
          ...node,
          position: { x: newX, y: newY }
        };
        onNodeUpdate(updatedNode);
      }
    } else if (isPanning) {
      // Canvas panning
      setTransform(prev => ({
        ...prev,
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      }));
    }
  }, [draggedNode, dragOffset, workflow.nodes, onNodeUpdate, isPanning, panStart, transform.scale]);

  const handleMouseUp = useCallback(() => {
    setDraggedNode(null);
    setIsPanning(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    
    if (e.ctrlKey || e.metaKey) {
      // Zoom
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      // Reduced sensitivity: smaller delta values for more gradual zooming
      const delta = e.deltaY > 0 ? 0.95 : 1.05;
      const newScale = Math.min(Math.max(transform.scale * delta, 0.25), 3);
      
      const scaleChange = newScale / transform.scale;
      
      setTransform(prev => ({
        x: mouseX - (mouseX - prev.x) * scaleChange,
        y: mouseY - (mouseY - prev.y) * scaleChange,
        scale: newScale
      }));
    } else {
      // Pan
      setTransform(prev => ({
        ...prev,
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY
      }));
    }
  }, [transform.scale]);

  const handleZoomIn = useCallback(() => {
    setTransform(prev => ({
      ...prev,
      scale: Math.min(prev.scale * 1.1, 3)
    }));
  }, []);

  const handleZoomOut = useCallback(() => {
    setTransform(prev => ({
      ...prev,
      scale: Math.max(prev.scale / 1.1, 0.25)
    }));
  }, []);

  const handleResetView = useCallback(() => {
    setTransform({ x: 0, y: 0, scale: 1 });
  }, []);

  // Add keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case '=':
          case '+':
            e.preventDefault();
            handleZoomIn();
            break;
          case '-':
            e.preventDefault();
            handleZoomOut();
            break;
          case '0':
            e.preventDefault();
            handleResetView();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleZoomIn, handleZoomOut, handleResetView]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Zoom Controls - Moved to bottom right */}
      <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-2">
        <button
          onClick={handleZoomIn}
          className="bg-white border border-secondary-300 hover:bg-secondary-50 p-2 rounded-lg transition-colors"
          title="Zoom In (Ctrl/Cmd + +)"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="bg-white border border-secondary-300 hover:bg-secondary-50 p-2 rounded-lg transition-colors"
          title="Zoom Out (Ctrl/Cmd + -)"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleResetView}
          className="bg-white border border-secondary-300 hover:bg-secondary-50 p-2 rounded-lg transition-colors"
          title="Reset View (Ctrl/Cmd + 0)"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Zoom Level Indicator */}
      <div className="absolute top-4 left-4 z-20 bg-white border border-secondary-300 px-3 py-1 text-sm font-medium rounded-lg hidden">
        {Math.round(transform.scale * 100)}%
      </div>

      {/* Canvas */}
      <div 
        ref={canvasRef}
        className="w-full h-full bg-secondary-100 cursor-grab active:cursor-grabbing canvas-background"
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{
          cursor: isPanning ? 'grabbing' : draggedNode ? 'grabbing' : 'grab'
        }}
      >
        {/* Transformed Content */}
        <div
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            transformOrigin: '0 0',
            width: '100%',
            height: '100%',
            position: 'relative'
          }}
        >
          {/* Grid Background */}
          <div 
            className="absolute opacity-20 pointer-events-none"
            style={{
              backgroundImage: `
                linear-gradient(to right, #cbd5e1 1px, transparent 1px),
                linear-gradient(to bottom, #cbd5e1 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px',
              width: '5000px',
              height: '5000px',
              left: '-2500px',
              top: '-2500px'
            }}
          />

          {/* Connection Lines */}
          <svg 
            className="absolute pointer-events-none"
            style={{
              width: '5000px',
              height: '5000px',
              left: '-2500px',
              top: '-2500px'
            }}
            viewBox="-2500 -2500 5000 5000"
          >
            {workflow.connections.map((connection) => {
              const sourceNode = workflow.nodes.find(n => n.id === connection.sourceNodeId);
              const targetNode = workflow.nodes.find(n => n.id === connection.targetNodeId);
              
              if (!sourceNode || !targetNode) return null;

              const sourceX = sourceNode.position.x + 160; // Node width (320px) / 2
              const sourceY = sourceNode.position.y + 60; // Node height / 2
              const targetX = targetNode.position.x + 160;
              const targetY = targetNode.position.y + 60;

              const midX = (sourceX + targetX) / 2;

              return (
                <g key={connection.id}>
                  <path
                    d={`M ${sourceX} ${sourceY} C ${midX} ${sourceY}, ${midX} ${targetY}, ${targetX} ${targetY}`}
                    stroke="#f73029"
                    strokeWidth="2"
                    fill="none"
                    className="drop-shadow-sm"
                  />
                  <circle
                    cx={targetX}
                    cy={targetY}
                    r="4"
                    fill="#f73029"
                  />
                </g>
              );
            })}
          </svg>

          {/* Nodes */}
          {workflow.nodes.map((node) => (
            <div
              key={node.id}
              style={{
                position: 'absolute',
                left: node.position.x,
                top: node.position.y,
                transform: draggedNode === node.id ? 'scale(1.02)' : 'scale(1)',
                zIndex: draggedNode === node.id ? 10 : 1
              }}
              className="transition-transform duration-150"
            >
              <NodeComponent
                node={node}
                isSelected={selectedNode?.id === node.id}
                onSelect={() => onNodeSelect(node)}
                onMouseDown={(e) => handleMouseDown(e, node)}
                onDelete={() => onNodeDelete(node.id)}
                onAddConnection={onAddConnection ? () => onAddConnection(node.id) : undefined}
              />
            </div>
          ))}

          {/* Empty State */}
          {workflow.nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center pointer-events-auto">
                <div className="w-16 h-16 bg-white border border-secondary-300 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Plus className="w-8 h-8 text-secondary-400" />
                </div>
                <h3 className="text-xl font-semibold text-secondary-900 mb-2">Start Building Your Workflow</h3>
                <p className="text-secondary-600 mb-4">Add nodes to create your automation workflow</p>
                {onAddNode && (
                  <button 
                    onClick={onAddNode}
                    className="bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 transition-colors font-medium"
                  >
                    Add First Node
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Help Text */}
      <div className="absolute bottom-4 left-4 z-20 bg-white border border-gray-300 px-3 py-2 text-xs text-gray-600 shadow-sm hidden">
        <div>• Drag to pan canvas</div>
        <div>• Ctrl/Cmd + scroll to zoom</div>
        <div>• Ctrl/Cmd + 0 to reset view</div>
      </div>
    </div>
  );
};

export default WorkflowCanvas;