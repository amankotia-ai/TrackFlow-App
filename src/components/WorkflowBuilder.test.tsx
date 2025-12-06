import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import WorkflowBuilder from './WorkflowBuilder';
import { Workflow, WorkflowNode } from '../types/workflow';

// Mock Toast
vi.mock('./Toast', () => ({
  useToast: () => ({
    showToast: vi.fn()
  })
}));

// Mock node templates
vi.mock('../data/nodeTemplates', () => ({
  nodeTemplates: [
    {
      id: 'tpl-1',
      type: 'trigger',
      category: 'browser',
      name: 'Page Load',
      description: 'Triggers when page loads',
      icon: 'Globe',
      defaultConfig: {},
      configFields: []
    },
    {
      id: 'tpl-2',
      type: 'action',
      category: 'browser',
      name: 'Click Element',
      description: 'Clicks an element',
      icon: 'MousePointer',
      defaultConfig: {},
      configFields: []
    },
    {
        id: 'tpl-3',
        type: 'action',
        category: 'browser',
        name: 'New Action',
        description: 'A new action',
        icon: 'Zap',
        defaultConfig: {},
        configFields: []
    }
  ]
}));

// Global store for mocks to share state
const store = {
    nodes: [] as any[],
    edges: [] as any[]
};

// Mock ReactFlow to inspect props and avoid canvas issues
vi.mock('reactflow', async () => {
    const actual = await vi.importActual<any>('reactflow');
    const React = await import('react');
    
    const MockReactFlow = ({ nodes, edges, nodeTypes }: any) => {
        // Sync store whenever render happens
        store.nodes = nodes || [];
        store.edges = edges || [];
        
        return (
            <div data-testid="react-flow-mock">
                {nodes?.map((node: any) => {
                    const NodeComponent = nodeTypes?.[node.type] || (() => <div>Unknown Node</div>);
                    return (
                        <div key={node.id} data-testid={`node-${node.id}`}>
                            <NodeComponent id={node.id} data={node.data} selected={false} />
                        </div>
                    );
                })}
            </div>
        );
    };

    return {
        ...actual,
        __esModule: true,
        default: MockReactFlow,
        ReactFlow: MockReactFlow,
        Background: () => <div />,
        Controls: () => <div />,
        MiniMap: () => <div />,
        Handle: () => <div data-testid="handle" />,
        ReactFlowProvider: ({ children }: any) => <div>{children}</div>,
        useReactFlow: () => ({
            fitView: vi.fn(),
            getNodes: () => store.nodes,
            getEdges: () => store.edges,
        }),
        useNodesState: (initial: any) => React.useState(initial),
        useEdgesState: (initial: any) => React.useState(initial),
    };
});

// Mock ELK to avoid layout complexity and errors
vi.mock('elkjs/lib/elk.bundled.js', () => {
    return {
        default: class ELK {
            layout(graph: any) {
                return Promise.resolve({
                    ...graph,
                    children: graph.children?.map((c: any) => ({ ...c, x: 0, y: 0 })) || []
                });
            }
        }
    }
});

const mockWorkflow: Workflow = {
  id: 'wf-1',
  name: 'Test Workflow',
  description: 'Test Description',
  isActive: true,
  status: 'draft',
  nodes: [
    {
      id: 'node-1',
      type: 'trigger',
      category: 'browser',
      name: 'Page Load',
      description: 'Triggers when page loads',
      icon: 'Globe',
      position: { x: 100, y: 100 },
      config: {},
      inputs: [],
      outputs: []
    },
    {
      id: 'node-2',
      type: 'action',
      category: 'browser',
      name: 'Click Element',
      description: 'Clicks an element',
      icon: 'MousePointer',
      position: { x: 100, y: 300 },
      config: {},
      inputs: [],
      outputs: []
    }
  ],
  connections: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  executions: 0
};

describe('WorkflowBuilder State Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    store.nodes = [];
    store.edges = [];
  });

  it('should maintain correct state when deleting and adding nodes', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const onBack = vi.fn();
    
    await act(async () => {
        render(
        <WorkflowBuilder
            workflow={mockWorkflow}
            onSave={onSave}
            onBack={onBack}
        />
        );
    });

    // Verify initial nodes
    expect(screen.getByTestId('react-flow-mock')).toBeInTheDocument();
    expect(screen.getByText('Page Load')).toBeInTheDocument();
    expect(screen.getByText('Click Element')).toBeInTheDocument();

    // 1. Delete "Click Element" node (node-2)
    const node2Element = screen.getByTestId('node-node-2');
    const deleteBtn = node2Element.querySelector('button[title="Delete Node"]');
    
    if (!deleteBtn) throw new Error('Delete button not found');
    
    await user.click(deleteBtn);

    // Verify node is gone
    await waitFor(() => {
        expect(screen.queryByText('Click Element')).not.toBeInTheDocument();
    });

    // 2. Add a new node
    const addNodeBtn = screen.getByText('Add Node');
    await user.click(addNodeBtn);

    // Library should open
    expect(screen.getByText('Node Library')).toBeInTheDocument();

    // Add "New Action"
    const newActionNode = screen.getByText('New Action');
    await user.click(newActionNode);

    // 3. Verify:
    // - "New Action" should be present
    // - "Click Element" should NOT be present
    
    await waitFor(async () => {
        const newAction = screen.queryByText('New Action');
        const oldAction = screen.queryByText('Click Element');
        
        if (!newAction) throw new Error('New Action node not found');
        if (oldAction) throw new Error('Old deleted node returned!');
    }, { timeout: 2000 });
  });
});
