import { WorkflowService } from '../src/services/workflowService';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { workflowId, eventData } = req.body;
  if (!workflowId) {
    return res.status(400).json({ error: 'Missing workflowId' });
  }

  // Fetch the workflow
  const workflow = await WorkflowService.getWorkflowById(workflowId);
  if (!workflow) {
    return res.status(404).json({ error: 'Workflow not found' });
  }

  // Find the trigger node
  const triggerNode = workflow.nodes.find(node => node.type === 'trigger');
  let triggerMatches = false;
  let actions = [];

  if (triggerNode) {
    // Simulate trigger evaluation (basic UTM and device type support)
    if (triggerNode.name === 'UTM Parameters' && eventData && eventData.utm) {
      const { parameter, value, operator } = triggerNode.config;
      const utmValue = eventData.utm[parameter];
      switch (operator || 'equals') {
        case 'equals':
          triggerMatches = utmValue === value;
          break;
        case 'contains':
          triggerMatches = utmValue && utmValue.includes(value);
          break;
        case 'exists':
          triggerMatches = Boolean(utmValue);
          break;
        default:
          triggerMatches = false;
      }
    } else if (triggerNode.name === 'Device Type' && eventData && eventData.deviceType) {
      triggerMatches = triggerNode.config.deviceType === eventData.deviceType;
    } else {
      // For other triggers, just return false (extend as needed)
      triggerMatches = false;
    }

    // If trigger matches, find connected actions
    if (triggerMatches) {
      const connectedActionIds = workflow.connections
        .filter(conn => conn.sourceNodeId === triggerNode.id)
        .map(conn => conn.targetNodeId);
      actions = workflow.nodes.filter(node => connectedActionIds.includes(node.id));
    }
  }

  return res.json({
    workflowId,
    workflow,
    triggerNode,
    triggerMatches,
    actions
  });
} 