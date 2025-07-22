import { Workflow } from '../types/workflow';

export const workflowTemplates: Workflow[] = [
  {
    id: 'mobile-cta-optimization',
    name: 'Mobile CTA Optimization',
    description: 'Show different call-to-action for mobile visitors',
    isActive: false,
    status: 'draft',
    executions: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    targetUrl: 'https://example.com',
    nodes: [
      {
        id: 'trigger-1',
        type: 'trigger',
        category: 'Device & Browser',
        name: 'Device Type',
        description: 'Trigger based on visitor device type',
        icon: 'Smartphone',
        position: { x: 100, y: 100 },
        config: { deviceType: 'mobile' },
        inputs: [],
        outputs: ['output']
      },
      {
        id: 'action-1',
        type: 'action',
        category: 'Content Modification',
        name: 'Replace Text',
        description: 'Replace text content in selected elements',
        icon: 'Type',
        position: { x: 400, y: 100 },
        config: { 
          selector: '.cta-button', 
          newText: 'Tap to Get Started',
          originalText: 'Click to Get Started'
        },
        inputs: ['input'],
        outputs: ['output']
      }
    ],
    connections: [
      {
        id: 'conn-1',
        sourceNodeId: 'trigger-1',
        targetNodeId: 'action-1',
        sourceHandle: 'output',
        targetHandle: 'input'
      }
    ]
  },
  {
    id: 'utm-campaign-personalization',
    name: 'UTM Campaign Personalization',
    description: 'Personalize content based on traffic source',
    isActive: true,
    status: 'active',
    executions: 156,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(),
    lastRun: new Date(),
    targetUrl: 'https://example.com/landing',
    nodes: [
      {
        id: 'trigger-2',
        type: 'trigger',
        category: 'Traffic Source',
        name: 'UTM Parameters',
        description: 'Trigger based on incoming UTM parameters',
        icon: 'Link',
        position: { x: 100, y: 150 },
        config: { parameter: 'utm_source', value: 'google', operator: 'equals' },
        inputs: [],
        outputs: ['output']
      },
      {
        id: 'action-2',
        type: 'action',
        category: 'Content Modification',
        name: 'Replace Text',
        description: 'Replace headline for Google traffic',
        icon: 'Type',
        position: { x: 400, y: 100 },
        config: { 
          selector: 'h1', 
          newText: 'Welcome from Google! Special offer inside.',
          originalText: ''
        },
        inputs: ['input'],
        outputs: ['output']
      },
      {
        id: 'action-3',
        type: 'action',
        category: 'Content Modification',
        name: 'Show Element',
        description: 'Show special Google offer banner',
        icon: 'Eye',
        position: { x: 400, y: 200 },
        config: { 
          selector: '#google-offer-banner', 
          animation: 'fade'
        },
        inputs: ['input'],
        outputs: ['output']
      }
    ],
    connections: [
      {
        id: 'conn-2',
        sourceNodeId: 'trigger-2',
        targetNodeId: 'action-2',
        sourceHandle: 'output',
        targetHandle: 'input'
      },
      {
        id: 'conn-3',
        sourceNodeId: 'trigger-2',
        targetNodeId: 'action-3',
        sourceHandle: 'output',
        targetHandle: 'input'
      }
    ]
  },
  {
    id: 'scroll-engagement-boost',
    name: 'Scroll Engagement Boost',
    description: 'Show special content when user scrolls 75% down',
    isActive: true,
    status: 'active',
    executions: 89,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(),
    lastRun: new Date(),
    targetUrl: 'https://example.com/blog',
    nodes: [
      {
        id: 'trigger-3',
        type: 'trigger',
        category: 'Visitor Behavior',
        name: 'Scroll Depth',
        description: 'Trigger when visitor scrolls to specific page depth',
        icon: 'ArrowDown',
        position: { x: 100, y: 150 },
        config: { percentage: 75, element: '' },
        inputs: [],
        outputs: ['output']
      },
      {
        id: 'condition-1',
        type: 'condition',
        category: 'Page Context',
        name: 'Page URL',
        description: 'Check if on blog page',
        icon: 'Globe',
        position: { x: 300, y: 150 },
        config: { operator: 'contains', value: '/blog' },
        inputs: ['input'],
        outputs: ['true', 'false']
      },
      {
        id: 'action-4',
        type: 'action',
        category: 'Content Modification',
        name: 'Show Element',
        description: 'Show newsletter signup',
        icon: 'Eye',
        position: { x: 500, y: 150 },
        config: { 
          selector: '#newsletter-popup', 
          animation: 'slide'
        },
        inputs: ['input'],
        outputs: ['output']
      }
    ],
    connections: [
      {
        id: 'conn-4',
        sourceNodeId: 'trigger-3',
        targetNodeId: 'condition-1',
        sourceHandle: 'output',
        targetHandle: 'input'
      },
      {
        id: 'conn-5',
        sourceNodeId: 'condition-1',
        targetNodeId: 'action-4',
        sourceHandle: 'true',
        targetHandle: 'input'
      }
    ]
  },
  {
    id: 'exit-intent-conversion',
    name: 'Exit Intent Conversion Recovery',
    description: 'Show special offer when user tries to leave',
    isActive: true,
    status: 'active',
    executions: 234,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(),
    lastRun: new Date(),
    targetUrl: 'https://example.com/checkout',
    nodes: [
      {
        id: 'trigger-4',
        type: 'trigger',
        category: 'Engagement',
        name: 'Exit Intent',
        description: 'Trigger when user shows intent to leave the page',
        icon: 'LogOut',
        position: { x: 100, y: 150 },
        config: { sensitivity: 'medium', delay: 500 },
        inputs: [],
        outputs: ['output']
      },
      {
        id: 'action-5',
        type: 'action',
        category: 'Advanced UI',
        name: 'Display Overlay',
        description: 'Show exit intent offer popup',
        icon: 'Square',
        position: { x: 400, y: 150 },
        config: { 
          overlayType: 'popup', 
          position: 'center',
          content: '<h2>Wait! Don\'t leave empty handed!</h2><p>Get 15% off your order with code SAVE15</p><button onclick="closeOffer()">Claim Offer</button>',
          showCloseButton: true,
          backdrop: true
        },
        inputs: ['input'],
        outputs: ['output']
      }
    ],
    connections: [
      {
        id: 'conn-6',
        sourceNodeId: 'trigger-4',
        targetNodeId: 'action-5',
        sourceHandle: 'output',
        targetHandle: 'input'
      }
    ]
  },
  {
    id: 'element-tracking-demo',
    name: 'Element Tracking Demo',
    description: 'Comprehensive demo showcasing element-based event tracking',
    isActive: false,
    status: 'draft',
    executions: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    targetUrl: 'https://example.com/demo-page',
    nodes: [
      {
        id: 'trigger-element-click',
        type: 'trigger',
        category: 'Element Events',
        name: 'Element Click',
        description: 'Track CTA button clicks',
        icon: 'MousePointer',
        position: { x: 100, y: 50 },
        config: { 
          elementSelector: '.cta-button, .btn-primary',
          clickCount: 1,
          timeWindow: '300000'
        },
        inputs: [],
        outputs: ['output']
      },
      {
        id: 'action-show-offer',
        type: 'action',
        category: 'Content Modification',
        name: 'Show Element',
        description: 'Show special offer modal',
        icon: 'Eye',
        position: { x: 400, y: 50 },
        config: { 
          selector: '#special-offer-modal', 
          animation: 'fade'
        },
        inputs: ['input'],
        outputs: ['output']
      },
      {
        id: 'trigger-form-focus',
        type: 'trigger',
        category: 'Element Events', 
        name: 'Form Interaction',
        description: 'Track email field focus',
        icon: 'FileText',
        position: { x: 100, y: 200 },
        config: {
          formSelector: 'form',
          interactionType: 'focus',
          fieldType: 'email'
        },
        inputs: [],
        outputs: ['output']
      },
      {
        id: 'action-progress-form',
        type: 'action',
        category: 'Content Modification',
        name: 'Show Element',
        description: 'Show progressive form fields',
        icon: 'Eye',
        position: { x: 400, y: 200 },
        config: { 
          selector: '#progressive-fields', 
          animation: 'slide'
        },
        inputs: ['input'],
        outputs: ['output']
      },
      {
        id: 'trigger-scroll-depth',
        type: 'trigger',
        category: 'Element Events',
        name: 'Element Visibility',
        description: 'Track content section visibility',
        icon: 'Eye',
        position: { x: 100, y: 350 },
        config: {
          elementSelector: '.content-section, article',
          visibilityThreshold: 75,
          duration: 2000
        },
        inputs: [],
        outputs: ['output']
      },
      {
        id: 'action-newsletter-popup',
        type: 'action',
        category: 'Content Modification',
        name: 'Show Element',
        description: 'Show newsletter signup',
        icon: 'Eye',
        position: { x: 400, y: 350 },
        config: { 
          selector: '#newsletter-popup', 
          animation: 'slide'
        },
        inputs: ['input'],
        outputs: ['output']
      },
      {
        id: 'trigger-hover-product',
        type: 'trigger',
        category: 'Element Events',
        name: 'Element Hover',
        description: 'Track product card hover',
        icon: 'MousePointer',
        position: { x: 100, y: 500 },
        config: {
          elementSelector: '.product-card, .feature-card',
          hoverDuration: 1500,
          includeTouch: true
        },
        inputs: [],
        outputs: ['output']
      },
      {
        id: 'action-show-details',
        type: 'action',
        category: 'Content Modification',
        name: 'Show Element',
        description: 'Show product details overlay',
        icon: 'Eye', 
        position: { x: 400, y: 500 },
        config: { 
          selector: '.product-details-overlay', 
          animation: 'fade'
        },
        inputs: ['input'],
        outputs: ['output']
      }
    ],
    connections: [
      {
        id: 'conn-click-offer',
        sourceNodeId: 'trigger-element-click',
        targetNodeId: 'action-show-offer',
        sourceHandle: 'output',
        targetHandle: 'input'
      },
      {
        id: 'conn-focus-progress',
        sourceNodeId: 'trigger-form-focus',
        targetNodeId: 'action-progress-form',
        sourceHandle: 'output',
        targetHandle: 'input'
      },
      {
        id: 'conn-scroll-newsletter',
        sourceNodeId: 'trigger-scroll-depth',
        targetNodeId: 'action-newsletter-popup',
        sourceHandle: 'output',
        targetHandle: 'input'
      },
      {
        id: 'conn-hover-details',
        sourceNodeId: 'trigger-hover-product',
        targetNodeId: 'action-show-details',
        sourceHandle: 'output',
        targetHandle: 'input'
      }
    ]
  }
];