/**
 * AI Service - Central hub for all AI-powered features
 * Integrates with OpenAI, Claude, and other AI providers
 */

import OpenAI from 'openai';
import { Workflow, WorkflowNode } from '../types/workflow';

// Configuration
const AI_CONFIG = {
  openai: {
    apiKey: import.meta.env.VITE_OPENAI_API_KEY,
    model: 'gpt-4-turbo-preview',
    visionModel: 'gpt-4-vision-preview',
    embeddingModel: 'text-embedding-3-small'
  },
  cache: {
    enabled: true,
    ttl: 3600 // 1 hour
  },
  rateLimit: {
    maxRequestsPerMinute: 60,
    maxTokensPerMinute: 100000
  }
};

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: AI_CONFIG.openai.apiKey,
  dangerouslyAllowBrowser: true // For demo - use server-side in production
});

// Types
interface ParsedWorkflowIntent {
  goal: string;
  triggers: Array<{
    type: string;
    conditions: Record<string, any>;
    description: string;
  }>;
  actions: Array<{
    type: string;
    config: Record<string, any>;
    description: string;
  }>;
  targetAudience: string;
  expectedImpact: string;
  confidence: number;
}

interface PageAnalysis {
  pageType: string;
  primaryGoal: string;
  keyElements: Array<{
    type: string;
    selector: string;
    importance: number;
    description: string;
  }>;
  conversionOpportunities: Array<{
    opportunity: string;
    expectedImpact: string;
    difficulty: 'easy' | 'medium' | 'hard';
    estimatedLift: number;
  }>;
  suggestedWorkflows: Array<{
    name: string;
    description: string;
    confidence: number;
    estimatedImpact: string;
  }>;
}

interface ContentVariation {
  content: string;
  reasoning: string;
  psychologicalTrigger: string;
  tone: string;
  predictedPerformance: number;
}

/**
 * AI Service Class
 */
export class AIService {
  private requestCache: Map<string, any> = new Map();
  private requestCount: number = 0;
  private lastResetTime: number = Date.now();

  /**
   * 1. NATURAL LANGUAGE WORKFLOW GENERATION
   * Convert user intent to complete workflow
   */
  async generateWorkflowFromPrompt(prompt: string): Promise<{
    workflow: Partial<Workflow>;
    intent: ParsedWorkflowIntent;
    confidence: number;
  }> {
    try {
      // Step 1: Parse user intent
      const intent = await this.parseWorkflowIntent(prompt);

      // Step 2: Generate workflow structure
      const workflow = await this.buildWorkflowFromIntent(intent);

      // Step 3: Optimize and validate
      const optimizedWorkflow = await this.optimizeWorkflow(workflow);

      return {
        workflow: optimizedWorkflow,
        intent,
        confidence: intent.confidence
      };
    } catch (error) {
      console.error('Error generating workflow from prompt:', error);
      throw new Error('Failed to generate workflow. Please try rephrasing your request.');
    }
  }

  /**
   * Parse user's natural language into structured workflow intent
   */
  private async parseWorkflowIntent(prompt: string): Promise<ParsedWorkflowIntent> {
    const cacheKey = `intent:${prompt}`;
    if (this.requestCache.has(cacheKey)) {
      return this.requestCache.get(cacheKey);
    }

    const response = await openai.chat.completions.create({
      model: AI_CONFIG.openai.model,
      messages: [
        {
          role: 'system',
          content: `You are a workflow automation expert. Extract structured workflow intent from user descriptions.

Available Trigger Types:
- page-visit: Track page visits
- time-on-page: Monitor time spent
- scroll-depth: Track scroll percentage
- exit-intent: Detect when user tries to leave
- utm-parameter: Track UTM campaign parameters
- device-type: Detect mobile/desktop/tablet
- geolocation: Target by location
- element-click: Track clicks on elements
- session-status: Detect logged in/out users

Available Action Types:
- replace-text: Replace text content
- display-overlay: Show modal/banner/popup
- hide-element: Hide page elements
- show-element: Show hidden elements
- modify-styles: Change CSS styling
- redirect-user: Navigate to different page
- trigger-event: Fire custom events
- inject-form-field: Add form fields dynamically

Output ONLY valid JSON in this exact format:
{
  "goal": "Brief description of the workflow goal",
  "triggers": [{
    "type": "trigger-type",
    "conditions": { "key": "value" },
    "description": "What this trigger detects"
  }],
  "actions": [{
    "type": "action-type", 
    "config": { "key": "value" },
    "description": "What this action does"
  }],
  "targetAudience": "Who this workflow targets",
  "expectedImpact": "Expected business outcome",
  "confidence": 0.85
}`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3, // Lower temperature for more consistent output
      response_format: { type: 'json_object' }
    });

    const intent = JSON.parse(response.choices[0].message.content || '{}');
    this.requestCache.set(cacheKey, intent);
    
    return intent;
  }

  /**
   * Build actual workflow from parsed intent
   */
  private async buildWorkflowFromIntent(intent: ParsedWorkflowIntent): Promise<Partial<Workflow>> {
    const nodes: WorkflowNode[] = [];
    const connections: any[] = [];

    // Create trigger nodes
    intent.triggers.forEach((trigger, index) => {
      const node: WorkflowNode = {
        id: `trigger-${Date.now()}-${index}`,
        type: 'trigger',
        name: trigger.type,
        position: { x: 400, y: 50 + (index * 150) },
        config: trigger.conditions
      };
      nodes.push(node);
    });

    // Create action nodes
    intent.actions.forEach((action, index) => {
      const node: WorkflowNode = {
        id: `action-${Date.now()}-${index}`,
        type: 'action',
        name: action.type,
        position: { x: 400, y: 250 + (index * 150) },
        config: action.config
      };
      nodes.push(node);

      // Connect to first trigger
      if (nodes.length > 1) {
        connections.push({
          id: `conn-${Date.now()}-${index}`,
          sourceNodeId: nodes[0].id,
          targetNodeId: node.id,
          sourceHandle: 'output',
          targetHandle: 'input'
        });
      }
    });

    return {
      name: intent.goal,
      description: `${intent.expectedImpact} - Targets: ${intent.targetAudience}`,
      nodes,
      connections,
      status: 'draft',
      isActive: false
    };
  }

  /**
   * 2. PAGE INTELLIGENCE & AUTO-CONFIGURATION
   * Analyze a webpage and suggest optimal workflows
   */
  async analyzePageIntelligence(url: string, htmlContent: string): Promise<PageAnalysis> {
    try {
      // For MVP, analyze HTML structure
      // In production, add screenshot analysis with GPT-4 Vision
      
      const response = await openai.chat.completions.create({
        model: AI_CONFIG.openai.model,
        messages: [
          {
            role: 'system',
            content: `You are a conversion optimization expert. Analyze webpage HTML and identify:

1. Page type (e-commerce product, SaaS landing, blog, etc.)
2. Primary conversion goal
3. Key UI elements (CTAs, forms, hero sections)
4. Optimization opportunities
5. Recommended workflows

Output valid JSON with this structure:
{
  "pageType": "saas_landing | ecommerce_product | blog_post | etc",
  "primaryGoal": "What the page aims to achieve",
  "keyElements": [{
    "type": "cta | form | hero | navigation",
    "selector": "CSS selector",
    "importance": 0.9,
    "description": "Brief description"
  }],
  "conversionOpportunities": [{
    "opportunity": "What could be improved",
    "expectedImpact": "Estimated outcome",
    "difficulty": "easy | medium | hard",
    "estimatedLift": 25
  }],
  "suggestedWorkflows": [{
    "name": "Workflow name",
    "description": "What it does",
    "confidence": 0.85,
    "estimatedImpact": "+X% conversions"
  }]
}`
          },
          {
            role: 'user',
            content: `Analyze this webpage:

URL: ${url}
HTML Structure: ${htmlContent.substring(0, 10000)} 

Provide optimization analysis and workflow suggestions.`
          }
        ],
        temperature: 0.4,
        response_format: { type: 'json_object' }
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error('Error analyzing page:', error);
      throw error;
    }
  }

  /**
   * 3. SMART CONTENT GENERATION
   * Generate optimized content variations
   */
  async generateContentVariations(
    element: string,
    originalContent: string,
    goal: string,
    audience: string,
    count: number = 5
  ): Promise<ContentVariation[]> {
    try {
      const response = await openai.chat.completions.create({
        model: AI_CONFIG.openai.model,
        messages: [
          {
            role: 'system',
            content: `You are a master copywriter and conversion optimizer. Generate compelling content variations.

Rules:
- Clear value proposition
- Emotional triggers (urgency, social proof, FOMO, curiosity)
- Action-oriented language
- Audience-specific messaging
- Test different psychological approaches

Output JSON:
{
  "variations": [{
    "content": "The variation text",
    "reasoning": "Why this might work",
    "psychologicalTrigger": "urgency | social_proof | curiosity | etc",
    "tone": "professional | casual | urgent | friendly",
    "predictedPerformance": 0.85
  }]
}`
          },
          {
            role: 'user',
            content: `Generate ${count} variations for:

Element Type: ${element}
Original: ${originalContent}
Goal: ${goal}
Target Audience: ${audience}

Each variation should test a different psychological trigger.`
          }
        ],
        temperature: 0.8, // Higher temperature for creative variations
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return result.variations || [];
    } catch (error) {
      console.error('Error generating content variations:', error);
      throw error;
    }
  }

  /**
   * 4. WORKFLOW OPTIMIZATION SUGGESTIONS
   * Analyze existing workflow and suggest improvements
   */
  async suggestWorkflowImprovements(workflow: Workflow): Promise<{
    score: number;
    suggestions: Array<{
      type: 'warning' | 'improvement' | 'idea';
      title: string;
      description: string;
      impact: 'low' | 'medium' | 'high';
      effort: 'low' | 'medium' | 'high';
    }>;
  }> {
    try {
      const response = await openai.chat.completions.create({
        model: AI_CONFIG.openai.model,
        messages: [
          {
            role: 'system',
            content: `You are a workflow optimization expert. Analyze workflows and provide actionable improvement suggestions.

Evaluate:
- Trigger effectiveness
- Action sequencing
- Missing opportunities
- Potential conflicts
- Best practice adherence

Output JSON:
{
  "score": 75,
  "suggestions": [{
    "type": "warning | improvement | idea",
    "title": "Brief suggestion",
    "description": "Detailed explanation",
    "impact": "low | medium | high",
    "effort": "low | medium | high"
  }]
}`
          },
          {
            role: 'user',
            content: `Analyze this workflow:

Name: ${workflow.name}
Nodes: ${JSON.stringify(workflow.nodes, null, 2)}
Connections: ${JSON.stringify(workflow.connections, null, 2)}

Provide optimization suggestions.`
          }
        ],
        temperature: 0.5,
        response_format: { type: 'json_object' }
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error('Error analyzing workflow:', error);
      throw error;
    }
  }

  /**
   * 5. CONVERSATIONAL ASSISTANCE
   * Chat-based help and workflow creation
   */
  async chat(
    message: string,
    conversationHistory: Array<{ role: string; content: string }>,
    context?: {
      currentPage?: string;
      userProfile?: any;
      recentWorkflows?: Workflow[];
    }
  ): Promise<string> {
    try {
      const systemPrompt = `You are TrackFlow AI, an expert assistant for website personalization and workflow automation.

You help users:
- Create workflows using natural language
- Understand workflow concepts
- Optimize their personalization strategies
- Troubleshoot issues
- Learn best practices

${context ? `
Current Context:
- Page: ${context.currentPage || 'Dashboard'}
- Recent workflows: ${context.recentWorkflows?.length || 0}
` : ''}

Be helpful, concise, and actionable. When users want to create workflows, guide them through the process conversationally.`;

      const response = await openai.chat.completions.create({
        model: AI_CONFIG.openai.model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationHistory,
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 500
      });

      return response.choices[0].message.content || '';
    } catch (error) {
      console.error('Error in chat:', error);
      throw error;
    }
  }

  /**
   * 6. ANALYTICS INSIGHTS
   * Generate insights from workflow performance data
   */
  async generateAnalyticsInsights(metrics: any): Promise<{
    summary: string;
    insights: Array<{
      type: 'positive' | 'negative' | 'neutral' | 'opportunity';
      title: string;
      description: string;
      recommendation: string;
      priority: number;
    }>;
    predictions: {
      trend: 'improving' | 'declining' | 'stable';
      nextWeekPrediction: number;
      confidence: number;
    };
  }> {
    try {
      const response = await openai.chat.completions.create({
        model: AI_CONFIG.openai.model,
        messages: [
          {
            role: 'system',
            content: `You are a data analyst expert. Analyze workflow performance metrics and provide actionable insights.

Focus on:
1. Performance trends
2. Anomalies or outliers
3. Optimization opportunities
4. Specific recommendations
5. Future predictions

Output JSON with clear, actionable insights.`
          },
          {
            role: 'user',
            content: `Analyze these workflow metrics:

${JSON.stringify(metrics, null, 2)}

Provide insights and recommendations.`
          }
        ],
        temperature: 0.4,
        response_format: { type: 'json_object' }
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error('Error generating insights:', error);
      throw error;
    }
  }

  /**
   * Helper: Optimize workflow structure
   */
  private async optimizeWorkflow(workflow: Partial<Workflow>): Promise<Partial<Workflow>> {
    // Add validation, optimization logic
    // For now, return as-is
    return workflow;
  }

  /**
   * Helper: Rate limiting
   */
  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceReset = now - this.lastResetTime;

    if (timeSinceReset > 60000) {
      // Reset every minute
      this.requestCount = 0;
      this.lastResetTime = now;
    }

    if (this.requestCount >= AI_CONFIG.rateLimit.maxRequestsPerMinute) {
      throw new Error('Rate limit exceeded. Please try again in a moment.');
    }

    this.requestCount++;
  }
}

// Export singleton instance
export const aiService = new AIService();

// Export types
export type { ParsedWorkflowIntent, PageAnalysis, ContentVariation };




