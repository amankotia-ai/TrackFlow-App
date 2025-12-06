import {
  WorkflowConnection,
  WorkflowNode,
  WorkflowTemplate,
  TemplateCategoryGroupDefinition
} from '../types/workflow';

type NodeConfig = Omit<WorkflowNode, 'id' | 'type' | 'inputs' | 'outputs'>;

const createTriggerNode = (
  id: string,
  config: NodeConfig & { outputs?: string[] }
): WorkflowNode => ({
  id,
  type: 'trigger',
  inputs: [],
  outputs: config.outputs ?? ['output'],
  ...config,
});

const createActionNode = (
  id: string,
  config: NodeConfig & { inputs?: string[]; outputs?: string[] }
): WorkflowNode => ({
  id,
  type: 'action',
  inputs: config.inputs ?? ['input'],
  outputs: config.outputs ?? ['output'],
  ...config,
});

const createConnection = (
  id: string,
  sourceNodeId: string,
  targetNodeId: string,
  sourceHandle: string = 'output',
  targetHandle: string = 'input'
): WorkflowConnection => ({
  id,
  sourceNodeId,
  targetNodeId,
  sourceHandle,
  targetHandle,
});

type TemplateInput = Omit<
  WorkflowTemplate,
  'createdAt' | 'updatedAt' | 'executions' | 'isActive' | 'status'
> & {
  createdAt?: Date;
  updatedAt?: Date;
  executions?: number;
  isActive?: boolean;
  status?: 'draft' | 'active' | 'paused' | 'error';
};

const withDefaults = (template: TemplateInput): WorkflowTemplate => ({
  ...template,
  isActive: template.isActive ?? false,
  status: template.status ?? 'draft',
  executions: template.executions ?? 0,
  createdAt: template.createdAt ?? new Date(),
  updatedAt: template.updatedAt ?? template.createdAt ?? new Date(),
});

export const TEMPLATE_CATEGORY_GROUPS: TemplateCategoryGroupDefinition[] = [
  {
    id: 'generic',
    label: 'Use Cases',
    description: 'Jump-start common personalization goals with curated plays.',
    categories: [
      {
        id: 'lead-capture',
        label: 'Lead Capture',
        group: 'generic',
        description: 'Grow your list with exit intents, form helpers, and offers.',
        icon: 'MailPlus',
      },
      {
        id: 'user-onboarding',
        label: 'User Onboarding',
        group: 'generic',
        description: 'Guide new accounts toward activation.',
        icon: 'Sparkles',
      },
      {
        id: 'generic-ecommerce',
        label: 'E-commerce',
        group: 'generic',
        description: 'Increase conversion and order value on storefront pages.',
        icon: 'ShoppingBag',
      },
      {
        id: 'analytics-testing',
        label: 'Analytics & Testing',
        group: 'generic',
        description: 'Run experiments and capture behavioral signals.',
        icon: 'Activity',
      },
    ],
  },
  {
    id: 'trigger',
    label: 'Trigger Based',
    description: 'Pick templates by how the automation starts.',
    categories: [
      {
        id: 'page-visit',
        label: 'Page Visit',
        group: 'trigger',
        description: 'Fire when visitors land on specific pages or segments.',
        icon: 'Globe',
      },
      {
        id: 'time-based',
        label: 'Time Based',
        group: 'trigger',
        description: 'Schedule nudges after delays or inactivity.',
        icon: 'Clock',
      },
      {
        id: 'click-event',
        label: 'Click Event',
        group: 'trigger',
        description: 'Listen for clicks on priority elements.',
        icon: 'MousePointer',
      },
      {
        id: 'scroll-behavior',
        label: 'Scroll & Behavior',
        group: 'trigger',
        description: 'Respond to scroll depth and micro-behaviors.',
        icon: 'ArrowDown',
      },
    ],
  },
  {
    id: 'industry',
    label: 'Industry Packs',
    description: 'Ready-to-use patterns for your business model.',
    categories: [
      {
        id: 'saas',
        label: 'SaaS',
        group: 'industry',
        description: 'Drive trial activation, onboarding, and upgrades.',
        icon: 'Laptop',
      },
      {
        id: 'industry-ecommerce',
        label: 'E-commerce',
        group: 'industry',
        description: 'Reduce cart abandonment and boost revenue.',
        icon: 'ShoppingCart',
      },
      {
        id: 'marketing',
        label: 'Marketing',
        group: 'industry',
        description: 'Personalize campaign and landing page journeys.',
        icon: 'Megaphone',
      },
    ],
  },
];

// USE CASES TEMPLATES
const genericTemplates: WorkflowTemplate[] = [
  withDefaults({
    id: 'template-exit-intent-lead-magnet',
    name: 'Exit Intent Lead Magnet',
    description: 'Convert abandoning visitors with a targeted popup offer.',
    targetUrl: 'https://example.com',
    templateMeta: {
      group: 'generic',
      categoryId: 'lead-capture',
      categoryLabel: 'Lead Capture',
      icon: 'MailPlus',
      summary: 'Show popup when visitor tries to leave the page.',
      difficulty: 'Beginner',
      estimatedTime: '3 min',
      tags: ['exit intent', 'popup', 'lead magnet'],
    },
    nodes: [
      createTriggerNode('exit-intent', {
        category: 'Visitor Behavior',
        name: 'Exit Intent',
        description: 'Detect when visitor is about to leave',
        icon: 'LogOut',
        position: { x: 100, y: 150 },
        config: {
          sensitivity: 'medium',
          delay: 500
        },
      }),
      createActionNode('show-popup', {
        category: 'Advanced UI',
        name: 'Display Overlay',
        description: 'Show lead capture popup',
        icon: 'Square',
        position: { x: 400, y: 150 },
        config: {
          overlayType: 'popup',
          position: 'center',
          content: '<h2>Wait! Before you go...</h2><p>Download our free guide</p><input type="email" placeholder="Your email"><button>Get Free Guide</button>',
          showCloseButton: true,
          backdrop: true,
          width: 'medium',
          animation: 'fade'
        },
      }),
    ],
    connections: [
      createConnection('exit-to-popup', 'exit-intent', 'show-popup'),
    ],
  }),
  
  withDefaults({
    id: 'template-scroll-engagement-offer',
    name: 'Scroll Engagement Offer',
    description: 'Show special offer when visitor shows strong engagement.',
    targetUrl: 'https://example.com/blog',
    templateMeta: {
      group: 'generic',
      categoryId: 'lead-capture',
      categoryLabel: 'Lead Capture',
      icon: 'Gift',
      summary: 'Display offer after visitor scrolls 75% of page.',
      difficulty: 'Beginner',
      estimatedTime: '3 min',
      tags: ['scroll', 'engagement', 'offer'],
    },
    nodes: [
      createTriggerNode('scroll-depth', {
        category: 'Visitor Behavior',
        name: 'Scroll Depth',
        description: 'Trigger at 75% scroll',
        icon: 'ArrowDown',
        position: { x: 100, y: 150 },
        config: {
          percentage: 75,
          element: ''
        },
      }),
      createActionNode('show-offer', {
        category: 'Advanced UI',
        name: 'Display Overlay',
        description: 'Show corner notification with offer',
        icon: 'Square',
        position: { x: 400, y: 150 },
        config: {
          overlayType: 'corner',
          position: 'bottom-right',
          content: '<strong>🎉 Special Offer!</strong><p>Get 20% off with code SAVE20</p>',
          showCloseButton: true,
          backdrop: false,
          width: 'small',
          animation: 'slide',
          autoClose: true,
          autoCloseDelay: 10
        },
      }),
    ],
    connections: [
      createConnection('scroll-to-offer', 'scroll-depth', 'show-offer'),
    ],
  }),

  withDefaults({
    id: 'template-time-based-popup',
    name: 'Timed Engagement Popup',
    description: 'Show popup after visitor spends time on page.',
    targetUrl: 'https://example.com',
    templateMeta: {
      group: 'generic',
      categoryId: 'user-onboarding',
      categoryLabel: 'User Onboarding',
      icon: 'Clock',
      summary: 'Display welcome message after 30 seconds on site.',
      difficulty: 'Beginner',
      estimatedTime: '3 min',
      tags: ['time', 'welcome', 'engagement'],
    },
    nodes: [
      createTriggerNode('time-trigger', {
        category: 'Visitor Behavior',
        name: 'Time on Page',
        description: 'Wait 30 seconds',
        icon: 'Clock',
        position: { x: 100, y: 150 },
        config: {
          duration: 30,
          unit: 'seconds'
        },
      }),
      createActionNode('welcome-banner', {
        category: 'Advanced UI',
        name: 'Display Overlay',
        description: 'Show welcome banner',
        icon: 'Square',
        position: { x: 400, y: 150 },
        config: {
          overlayType: 'banner',
          position: 'top',
          content: '<p>👋 New here? <strong>Get 10% off your first purchase!</strong> <button>Shop Now</button></p>',
          showCloseButton: true,
          backdrop: false,
          width: 'full',
          animation: 'slide'
        },
      }),
    ],
    connections: [
      createConnection('time-to-banner', 'time-trigger', 'welcome-banner'),
    ],
  }),

  withDefaults({
    id: 'template-hero-headline-swap',
    name: 'UTM-Based Headline Swap',
    description: 'Personalize hero headline based on traffic source.',
    targetUrl: 'https://example.com',
    templateMeta: {
      group: 'generic',
      categoryId: 'analytics-testing',
      categoryLabel: 'Analytics & Testing',
      icon: 'Link',
      summary: 'Change hero text for Google Ads visitors.',
      difficulty: 'Intermediate',
      estimatedTime: '5 min',
      tags: ['utm', 'personalization', 'headline'],
    },
    nodes: [
      createTriggerNode('utm-source', {
        category: 'Traffic Source',
        name: 'UTM Parameters',
        description: 'Detect Google Ads traffic',
        icon: 'Link',
        position: { x: 100, y: 150 },
        config: {
          parameter: 'utm_source',
          value: 'google',
          operator: 'equals',
          predefinedValue: 'google'
        },
      }),
      createActionNode('change-headline', {
        category: 'Content Modification',
        name: 'Replace Text',
        description: 'Update hero headline',
        icon: 'Type',
        position: { x: 400, y: 150 },
        config: {
          selector: 'h1.hero-title',
          newText: 'Special Offer for Google Visitors!',
          originalText: ''
        },
      }),
    ],
    connections: [
      createConnection('utm-to-headline', 'utm-source', 'change-headline'),
    ],
  }),

  withDefaults({
    id: 'template-sticky-promo-banner',
    name: 'Sticky Promotional Banner',
    description: 'Show persistent promo banner on all pages.',
    targetUrl: 'https://example.com',
    templateMeta: {
      group: 'generic',
      categoryId: 'generic-ecommerce',
      categoryLabel: 'E-commerce',
      icon: 'Tag',
      summary: 'Display promo banner that stays visible while scrolling.',
      difficulty: 'Beginner',
      estimatedTime: '2 min',
      tags: ['promo', 'banner', 'sale'],
    },
    nodes: [
      createTriggerNode('page-visit', {
        category: 'Visitor Behavior',
        name: 'Page Visits',
        description: 'Trigger on first page visit',
        icon: 'Eye',
        position: { x: 100, y: 150 },
        config: {
          visitCount: 1,
          timeframe: 'session'
        },
      }),
      createActionNode('promo-banner', {
        category: 'Advanced UI',
        name: 'Display Overlay',
        description: 'Show promo banner',
        icon: 'Square',
        position: { x: 400, y: 150 },
        config: {
          overlayType: 'banner',
          position: 'top',
          content: '<p><strong>🎊 Flash Sale!</strong> Use code <strong>FLASH20</strong> for 20% off - Ends tonight! <button>Shop Now</button></p>',
          showCloseButton: true,
          backdrop: false,
          width: 'full',
          animation: 'slide'
        },
      }),
    ],
    connections: [
      createConnection('visit-to-banner', 'page-visit', 'promo-banner'),
    ],
  }),

  withDefaults({
    id: 'template-cart-urgency-timer',
    name: 'Cart Urgency Timer',
    description: 'Show countdown timer to create purchasing urgency.',
    targetUrl: 'https://shop.example.com/cart',
    templateMeta: {
      group: 'generic',
      categoryId: 'generic-ecommerce',
      categoryLabel: 'E-commerce',
      icon: 'Timer',
      summary: 'Display countdown on cart to drive immediate action.',
      difficulty: 'Beginner',
      estimatedTime: '4 min',
      tags: ['urgency', 'cart', 'countdown'],
    },
    nodes: [
      createTriggerNode('cart-visit', {
        category: 'Visitor Behavior',
        name: 'Page Visits',
        description: 'Detect cart page visit',
        icon: 'ShoppingCart',
        position: { x: 100, y: 150 },
        config: {
          visitCount: 1,
          timeframe: 'session'
        },
      }),
      createActionNode('urgency-banner', {
        category: 'Advanced UI',
        name: 'Display Overlay',
        description: 'Show urgency banner',
        icon: 'Square',
        position: { x: 400, y: 150 },
        config: {
          overlayType: 'banner',
          position: 'top',
          content: '<p>⏰ <strong>Items in your cart are reserved for 15 minutes!</strong> Complete purchase now to secure your items.</p>',
          showCloseButton: false,
          backdrop: false,
          width: 'full',
          animation: 'slide'
        },
      }),
    ],
    connections: [
      createConnection('cart-to-urgency', 'cart-visit', 'urgency-banner'),
    ],
  }),
];

// TRIGGER-BASED TEMPLATES
const triggerTemplates: WorkflowTemplate[] = [
  withDefaults({
    id: 'template-returning-visitor-welcome',
    name: 'Returning Visitor Welcome',
    description: 'Greet repeat visitors with personalized message.',
    targetUrl: 'https://example.com',
    templateMeta: {
      group: 'trigger',
      categoryId: 'page-visit',
      categoryLabel: 'Page Visit',
      icon: 'Users',
      summary: 'Show welcome back message for returning visitors.',
      difficulty: 'Beginner',
      estimatedTime: '3 min',
      tags: ['returning', 'welcome', 'personalization'],
    },
    nodes: [
      createTriggerNode('repeat-visitor', {
        category: 'Visitor Behavior',
        name: 'Repeat Visitor',
        description: 'Detect returning visitors',
        icon: 'Users',
        position: { x: 100, y: 150 },
        config: {
          minVisits: 2,
          timeframe: 'all_time'
        },
      }),
      createActionNode('welcome-back', {
        category: 'Advanced UI',
        name: 'Display Overlay',
        description: 'Show welcome message',
        icon: 'Square',
        position: { x: 400, y: 150 },
        config: {
          overlayType: 'corner',
          position: 'bottom-right',
          content: '<p>👋 <strong>Welcome back!</strong> Pick up where you left off.</p>',
          showCloseButton: true,
          backdrop: false,
          width: 'small',
          animation: 'slide',
          autoClose: true,
          autoCloseDelay: 5
        },
      }),
    ],
    connections: [
      createConnection('repeat-to-welcome', 'repeat-visitor', 'welcome-back'),
    ],
  }),

  withDefaults({
    id: 'template-mobile-cta-optimization',
    name: 'Mobile CTA Optimization',
    description: 'Optimize call-to-action for mobile visitors.',
    targetUrl: 'https://example.com',
    templateMeta: {
      group: 'trigger',
      categoryId: 'page-visit',
      categoryLabel: 'Page Visit',
      icon: 'Smartphone',
      summary: 'Change CTA text for mobile devices.',
      difficulty: 'Beginner',
      estimatedTime: '3 min',
      tags: ['mobile', 'cta', 'responsive'],
    },
    nodes: [
      createTriggerNode('mobile-device', {
        category: 'Traffic Source',
        name: 'Device Type',
        description: 'Target mobile visitors',
        icon: 'Smartphone',
        position: { x: 100, y: 150 },
        config: {
          deviceType: 'mobile',
          includeTablet: false
        },
      }),
      createActionNode('mobile-cta', {
        category: 'Content Modification',
        name: 'Replace Text',
        description: 'Update CTA for mobile',
        icon: 'Type',
        position: { x: 400, y: 150 },
        config: {
          selector: '.cta-button',
          newText: 'Tap to Get Started',
          originalText: 'Click to Get Started'
        },
      }),
    ],
    connections: [
      createConnection('mobile-to-cta', 'mobile-device', 'mobile-cta'),
    ],
  }),

  withDefaults({
    id: 'template-inactivity-recovery',
    name: 'Inactivity Recovery Prompt',
    description: 'Re-engage users after period of inactivity.',
    targetUrl: 'https://example.com',
    templateMeta: {
      group: 'trigger',
      categoryId: 'time-based',
      categoryLabel: 'Time Based',
      icon: 'PauseCircle',
      summary: 'Show gentle prompt after 2 minutes of no interaction.',
      difficulty: 'Beginner',
      estimatedTime: '3 min',
      tags: ['inactivity', 'engagement', 'recovery'],
    },
    nodes: [
      createTriggerNode('inactive', {
        category: 'Visitor Behavior',
        name: 'Inactivity',
        description: 'Detect 2 minutes of inactivity',
        icon: 'PauseCircle',
        position: { x: 100, y: 150 },
        config: {
          duration: 120,
          unit: 'seconds'
        },
      }),
      createActionNode('engagement-prompt', {
        category: 'Advanced UI',
        name: 'Display Overlay',
        description: 'Show re-engagement message',
        icon: 'Square',
        position: { x: 400, y: 150 },
        config: {
          overlayType: 'corner',
          position: 'bottom-right',
          content: '<p>💡 <strong>Still browsing?</strong> Need help finding something?</p><button>Chat with us</button>',
          showCloseButton: true,
          backdrop: false,
          width: 'small',
          animation: 'bounce'
        },
      }),
    ],
    connections: [
      createConnection('inactive-to-prompt', 'inactive', 'engagement-prompt'),
    ],
  }),

  withDefaults({
    id: 'template-cta-click-tracker',
    name: 'CTA Click Tracker',
    description: 'Track and celebrate CTA button clicks.',
    targetUrl: 'https://example.com',
    templateMeta: {
      group: 'trigger',
      categoryId: 'click-event',
      categoryLabel: 'Click Event',
      icon: 'MousePointer',
      summary: 'Show confirmation when primary CTA is clicked.',
      difficulty: 'Beginner',
      estimatedTime: '4 min',
      tags: ['click', 'tracking', 'cta'],
    },
    nodes: [
      createTriggerNode('cta-click', {
        category: 'Visitor Behavior',
        name: 'Element Click',
        description: 'Detect CTA button click',
        icon: 'MousePointer',
        position: { x: 100, y: 150 },
        config: {
          elementSelector: '.primary-cta',
          clickCount: 1
        },
      }),
      createActionNode('track-event', {
        category: 'Advanced Integration',
        name: 'Custom Event',
        description: 'Send analytics event',
        icon: 'Activity',
        position: { x: 400, y: 100 },
        config: {
          eventType: 'analytics',
          eventName: 'cta_clicked',
          eventData: '{"button": "primary_cta", "location": "hero"}',
          targetSelector: ''
        },
      }),
      createActionNode('show-confirmation', {
        category: 'Advanced UI',
        name: 'Display Overlay',
        description: 'Show success message',
        icon: 'CheckCircle',
        position: { x: 400, y: 220 },
        config: {
          overlayType: 'corner',
          position: 'top-right',
          content: '<p>✅ <strong>Great choice!</strong> Redirecting you now...</p>',
          showCloseButton: false,
          backdrop: false,
          width: 'small',
          animation: 'slide',
          autoClose: true,
          autoCloseDelay: 3
        },
      }),
    ],
    connections: [
      createConnection('click-to-track', 'cta-click', 'track-event'),
      createConnection('click-to-confirm', 'cta-click', 'show-confirmation'),
    ],
  }),

  withDefaults({
    id: 'template-scroll-reveal-content',
    name: 'Scroll-Triggered Content Reveal',
    description: 'Reveal hidden content when visitor scrolls.',
    targetUrl: 'https://example.com/features',
    templateMeta: {
      group: 'trigger',
      categoryId: 'scroll-behavior',
      categoryLabel: 'Scroll & Behavior',
      icon: 'ArrowDown',
      summary: 'Show special content at 50% scroll depth.',
      difficulty: 'Beginner',
      estimatedTime: '3 min',
      tags: ['scroll', 'reveal', 'content'],
    },
    nodes: [
      createTriggerNode('scroll-50', {
        category: 'Visitor Behavior',
        name: 'Scroll Depth',
        description: 'Trigger at 50% scroll',
        icon: 'ArrowDown',
        position: { x: 100, y: 150 },
        config: {
          percentage: 50,
          element: ''
        },
      }),
      createActionNode('reveal-content', {
        category: 'Content Modification',
        name: 'Show Element',
        description: 'Reveal hidden section',
        icon: 'Eye',
        position: { x: 400, y: 150 },
        config: {
          selector: '#hidden-offer',
          animation: 'fade',
          delay: 0
        },
      }),
    ],
    connections: [
      createConnection('scroll-to-reveal', 'scroll-50', 'reveal-content'),
    ],
  }),
];

// INDUSTRY TEMPLATES
const industryTemplates: WorkflowTemplate[] = [
  withDefaults({
    id: 'template-trial-expiry-warning',
    name: 'Trial Expiry Warning',
    description: 'Notify trial users before their trial expires.',
    targetUrl: 'https://app.example.com',
    templateMeta: {
      group: 'industry',
      categoryId: 'saas',
      categoryLabel: 'SaaS',
      icon: 'AlertTriangle',
      summary: 'Show upgrade prompt for trial users on dashboard.',
      difficulty: 'Intermediate',
      estimatedTime: '5 min',
      tags: ['trial', 'conversion', 'upgrade'],
    },
    nodes: [
      createTriggerNode('dashboard-visit', {
        category: 'Visitor Behavior',
        name: 'Page Visits',
        description: 'Detect dashboard visit',
        icon: 'Layout',
        position: { x: 100, y: 150 },
        config: {
          visitCount: 1,
          timeframe: 'session'
        },
      }),
      createActionNode('trial-warning', {
        category: 'Advanced UI',
        name: 'Display Overlay',
        description: 'Show trial expiry banner',
        icon: 'AlertTriangle',
        position: { x: 400, y: 150 },
        config: {
          overlayType: 'banner',
          position: 'top',
          content: '<p>⚠️ <strong>Your trial expires in 3 days!</strong> Upgrade now to keep your data and features. <button>Upgrade Now</button></p>',
          showCloseButton: true,
          backdrop: false,
          width: 'full',
          animation: 'slide'
        },
      }),
    ],
    connections: [
      createConnection('visit-to-warning', 'dashboard-visit', 'trial-warning'),
    ],
  }),

  withDefaults({
    id: 'template-feature-discovery-tooltip',
    name: 'Feature Discovery Tooltip',
    description: 'Help users discover hidden features.',
    targetUrl: 'https://app.example.com',
    templateMeta: {
      group: 'industry',
      categoryId: 'saas',
      categoryLabel: 'SaaS',
      icon: 'Lightbulb',
      summary: 'Show tooltip highlighting new feature after page load.',
      difficulty: 'Beginner',
      estimatedTime: '4 min',
      tags: ['onboarding', 'features', 'discovery'],
    },
    nodes: [
      createTriggerNode('feature-page', {
        category: 'Visitor Behavior',
        name: 'Time on Page',
        description: 'Wait 5 seconds on page',
        icon: 'Clock',
        position: { x: 100, y: 150 },
        config: {
          duration: 5,
          unit: 'seconds'
        },
      }),
      createActionNode('feature-highlight', {
        category: 'Content Modification',
        name: 'Modify CSS',
        description: 'Highlight new feature',
        icon: 'Palette',
        position: { x: 400, y: 100 },
        config: {
          selector: '.new-feature-button',
          property: 'box-shadow',
          value: '0 0 0 4px rgba(59, 130, 246, 0.3)',
          customProperty: '',
          delay: 0
        },
      }),
      createActionNode('feature-tooltip', {
        category: 'Advanced UI',
        name: 'Display Overlay',
        description: 'Show feature tooltip',
        icon: 'MessageCircle',
        position: { x: 400, y: 220 },
        config: {
          overlayType: 'tooltip',
          position: 'bottom',
          content: '<p>✨ <strong>New!</strong> Try our AI-powered workflow builder</p>',
          showCloseButton: true,
          backdrop: false,
          width: 'small',
          animation: 'fade',
          targetElement: '.new-feature-button'
        },
      }),
    ],
    connections: [
      createConnection('time-to-highlight', 'feature-page', 'feature-highlight'),
      createConnection('time-to-tooltip', 'feature-page', 'feature-tooltip'),
    ],
  }),

  withDefaults({
    id: 'template-abandoned-cart-recovery',
    name: 'Abandoned Cart Recovery',
    description: 'Recover abandoned carts with exit intent popup.',
    targetUrl: 'https://shop.example.com/cart',
    templateMeta: {
      group: 'industry',
      categoryId: 'industry-ecommerce',
      categoryLabel: 'E-commerce',
      icon: 'ShoppingCart',
      summary: 'Show special offer when user tries to leave cart page.',
      difficulty: 'Intermediate',
      estimatedTime: '5 min',
      tags: ['cart', 'exit intent', 'recovery'],
    },
    nodes: [
      createTriggerNode('cart-exit', {
        category: 'Visitor Behavior',
        name: 'Exit Intent',
        description: 'Detect exit on cart page',
        icon: 'LogOut',
        position: { x: 100, y: 150 },
        config: {
          sensitivity: 'high',
          delay: 200
        },
      }),
      createActionNode('recovery-offer', {
        category: 'Advanced UI',
        name: 'Display Overlay',
        description: 'Show cart recovery popup',
        icon: 'Gift',
        position: { x: 400, y: 150 },
        config: {
          overlayType: 'popup',
          position: 'center',
          content: '<h2>Wait! Don\'t leave empty-handed! 🎁</h2><p><strong>Get 15% OFF</strong> your order with code <strong>SAVE15</strong></p><button>Apply Discount & Checkout</button>',
          showCloseButton: true,
          backdrop: true,
          width: 'medium',
          animation: 'zoom'
        },
      }),
    ],
    connections: [
      createConnection('exit-to-recovery', 'cart-exit', 'recovery-offer'),
    ],
  }),

  withDefaults({
    id: 'template-social-proof-notification',
    name: 'Social Proof Notification',
    description: 'Display recent purchase notifications to build trust.',
    targetUrl: 'https://shop.example.com',
    templateMeta: {
      group: 'industry',
      categoryId: 'industry-ecommerce',
      categoryLabel: 'E-commerce',
      icon: 'Users',
      summary: 'Show "X just purchased" notifications every 15 seconds.',
      difficulty: 'Beginner',
      estimatedTime: '3 min',
      tags: ['social proof', 'trust', 'conversion'],
    },
    nodes: [
      createTriggerNode('page-time', {
        category: 'Visitor Behavior',
        name: 'Time on Page',
        description: 'Wait 15 seconds',
        icon: 'Clock',
        position: { x: 100, y: 150 },
        config: {
          duration: 15,
          unit: 'seconds'
        },
      }),
      createActionNode('social-proof', {
        category: 'Advanced UI',
        name: 'Display Overlay',
        description: 'Show purchase notification',
        icon: 'Users',
        position: { x: 400, y: 150 },
        config: {
          overlayType: 'corner',
          position: 'bottom-left',
          content: '<p>🔥 <strong>Sarah from New York</strong> just purchased<br/><em>Premium Plan</em> • 2 minutes ago</p>',
          showCloseButton: false,
          backdrop: false,
          width: 'small',
          animation: 'slide',
          autoClose: true,
          autoCloseDelay: 5
        },
      }),
    ],
    connections: [
      createConnection('time-to-proof', 'page-time', 'social-proof'),
    ],
  }),

  withDefaults({
    id: 'template-utm-campaign-banner',
    name: 'Campaign-Specific Landing Banner',
    description: 'Show custom banner for campaign traffic.',
    targetUrl: 'https://example.com/landing',
    templateMeta: {
      group: 'industry',
      categoryId: 'marketing',
      categoryLabel: 'Marketing',
      icon: 'Megaphone',
      summary: 'Display special banner for Facebook ad visitors.',
      difficulty: 'Intermediate',
      estimatedTime: '5 min',
      tags: ['utm', 'campaign', 'personalization'],
    },
    nodes: [
      createTriggerNode('facebook-traffic', {
        category: 'Traffic Source',
        name: 'UTM Parameters',
        description: 'Detect Facebook campaign traffic',
        icon: 'Link',
        position: { x: 100, y: 150 },
        config: {
          parameter: 'utm_source',
          value: 'facebook',
          operator: 'equals',
          predefinedValue: 'facebook'
        },
      }),
      createActionNode('campaign-banner', {
        category: 'Advanced UI',
        name: 'Display Overlay',
        description: 'Show Facebook-specific banner',
        icon: 'Square',
        position: { x: 400, y: 100 },
        config: {
          overlayType: 'banner',
          position: 'top',
          content: '<p>👋 <strong>Welcome Facebook visitors!</strong> Exclusive deal: <strong>30% OFF</strong> with code <strong>FB30</strong></p>',
          showCloseButton: true,
          backdrop: false,
          width: 'full',
          animation: 'slide'
        },
      }),
      createActionNode('update-hero', {
        category: 'Content Modification',
        name: 'Replace Text',
        description: 'Personalize hero headline',
        icon: 'Type',
        position: { x: 400, y: 220 },
        config: {
          selector: 'h1.hero-title',
          newText: 'Exclusive Facebook Offer - 30% OFF!',
          originalText: ''
        },
      }),
    ],
    connections: [
      createConnection('fb-to-banner', 'facebook-traffic', 'campaign-banner'),
      createConnection('fb-to-hero', 'facebook-traffic', 'update-hero'),
    ],
  }),

  withDefaults({
    id: 'template-geo-targeted-content',
    name: 'Geographic Content Personalization',
    description: 'Show location-specific content to visitors.',
    targetUrl: 'https://example.com',
    templateMeta: {
      group: 'industry',
      categoryId: 'marketing',
      categoryLabel: 'Marketing',
      icon: 'MapPin',
      summary: 'Display regional offer based on visitor location.',
      difficulty: 'Advanced',
      estimatedTime: '7 min',
      tags: ['geo', 'location', 'personalization'],
    },
    nodes: [
      createTriggerNode('us-visitor', {
        category: 'Traffic Source',
        name: 'Geolocation',
        description: 'Target US visitors',
        icon: 'MapPin',
        position: { x: 100, y: 150 },
        config: {
          targetType: 'country',
          countries: ['US'],
          cities: [],
          regions: []
        },
      }),
      createActionNode('us-offer', {
        category: 'Advanced UI',
        name: 'Display Overlay',
        description: 'Show US-specific offer',
        icon: 'Gift',
        position: { x: 400, y: 150 },
        config: {
          overlayType: 'banner',
          position: 'top',
          content: '<p>🇺🇸 <strong>US Customers:</strong> Free shipping on all orders over $50!</p>',
          showCloseButton: true,
          backdrop: false,
          width: 'full',
          animation: 'slide'
        },
      }),
    ],
    connections: [
      createConnection('geo-to-offer', 'us-visitor', 'us-offer'),
    ],
  }),
];

export const workflowTemplates: WorkflowTemplate[] = [
  ...genericTemplates,
  ...triggerTemplates,
  ...industryTemplates,
];
