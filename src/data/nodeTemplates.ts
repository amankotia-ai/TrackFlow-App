import { NodeTemplate } from '../types/workflow';

export const nodeTemplates: NodeTemplate[] = [
  // Website Behavior Triggers
  {
    id: 'page-visit-trigger',
    type: 'trigger',
    category: 'Visitor Behavior',
    name: 'Page Visits',
    description: 'Trigger when visitor reaches specific number of page views',
    icon: 'Eye',
    defaultConfig: {
      visitCount: 3,
      timeframe: 'session'
    },
    configFields: [
      { 
        key: 'visitCount', 
        type: 'number', 
        label: 'Number of Visits', 
        required: true, 
        default: 3,
        description: 'Trigger after this many page visits'
      },
      { 
        key: 'timeframe', 
        type: 'select', 
        label: 'Timeframe', 
        required: true, 
        options: [
          { value: 'session', label: 'Current Session' },
          { value: 'day', label: 'Last 24 Hours' },
          { value: 'week', label: 'Last 7 Days' },
          { value: 'month', label: 'Last 30 Days' }
        ],
        default: 'session'
      }
    ]
  },
  {
    id: 'time-on-page-trigger',
    type: 'trigger',
    category: 'Visitor Behavior',
    name: 'Time on Page',
    description: 'Trigger when visitor spends specific time on page',
    icon: 'Clock',
    defaultConfig: {
      duration: 30,
      unit: 'seconds'
    },
    configFields: [
      { 
        key: 'duration', 
        type: 'number', 
        label: 'Duration', 
        required: true, 
        default: 30,
        description: 'Time threshold to trigger'
      },
      { 
        key: 'unit', 
        type: 'select', 
        label: 'Time Unit', 
        required: true, 
        options: [
          { value: 'seconds', label: 'Seconds' },
          { value: 'minutes', label: 'Minutes' }
        ],
        default: 'seconds'
      }
    ]
  },
  {
    id: 'scroll-depth-trigger',
    type: 'trigger',
    category: 'Visitor Behavior',
    name: 'Scroll Depth',
    description: 'Trigger when visitor scrolls to specific page depth',
    icon: 'ArrowDown',
    defaultConfig: {
      percentage: 50,
      element: ''
    },
    configFields: [
      { 
        key: 'percentage', 
        type: 'number', 
        label: 'Scroll Percentage', 
        required: true, 
        default: 50,
        description: 'Percentage of page scrolled (0-100)'
      },
      { 
        key: 'element', 
        type: 'css-selector', 
        label: 'Target Element (Optional)', 
        required: false, 
        placeholder: '#section-id, .class-name',
        description: 'CSS selector for specific element to track'
      }
    ]
  },
  {
    id: 'utm-parameter-trigger',
    type: 'trigger',
    category: 'Traffic Source',
    name: 'UTM Parameters',
    description: 'Trigger based on incoming UTM parameters',
    icon: 'Link',
    defaultConfig: {
      parameter: 'utm_source',
      value: '',
      operator: 'equals',
      predefinedValue: ''
    },
    configFields: [
      { 
        key: 'parameter', 
        type: 'select', 
        label: 'UTM Parameter', 
        required: true, 
        options: [
          { value: 'utm_source', label: 'UTM Source' },
          { value: 'utm_medium', label: 'UTM Medium' },
          { value: 'utm_campaign', label: 'UTM Campaign' },
          { value: 'utm_term', label: 'UTM Term' },
          { value: 'utm_content', label: 'UTM Content' }
        ],
        default: 'utm_source'
      },
      { 
        key: 'operator', 
        type: 'select', 
        label: 'Condition', 
        required: true, 
        options: [
          { value: 'equals', label: 'Equals' },
          { value: 'contains', label: 'Contains' },
          { value: 'starts_with', label: 'Starts With' },
          { value: 'exists', label: 'Parameter Exists' }
        ],
        default: 'equals'
      },
      { 
        key: 'predefinedValue', 
        type: 'select', 
        label: 'Common Values', 
        required: false, 
        options: [
          { value: '', label: 'Select a common value...' },
          { value: 'google', label: 'Google' },
          { value: 'facebook', label: 'Facebook' },
          { value: 'twitter', label: 'Twitter' },
          { value: 'linkedin', label: 'LinkedIn' },
          { value: 'instagram', label: 'Instagram' },
          { value: 'youtube', label: 'YouTube' },
          { value: 'email', label: 'Email' },
          { value: 'newsletter', label: 'Newsletter' },
          { value: 'direct', label: 'Direct' },
          { value: 'referral', label: 'Referral' },
          { value: 'organic', label: 'Organic' },
          { value: 'paid', label: 'Paid' },
          { value: 'social', label: 'Social' },
          { value: 'cpc', label: 'CPC' },
          { value: 'cpm', label: 'CPM' },
          { value: 'affiliate', label: 'Affiliate' },
          { value: 'display', label: 'Display' },
          { value: 'video', label: 'Video' },
          { value: 'banner', label: 'Banner' }
        ],
        description: 'Select a common UTM value or use custom value below'
      },
      { 
        key: 'value', 
        type: 'text', 
        label: 'Custom Value', 
        required: false, 
        placeholder: 'Enter custom value or leave empty for "exists" condition',
        description: 'Custom value to match (overrides common values selection)'
      }
    ]
  },
  {
    id: 'user-journey-trigger',
    type: 'trigger',
    category: 'Visitor Behavior',
    name: 'User Journey',
    description: 'Trigger based on visitor navigation path',
    icon: 'Route',
    defaultConfig: {
      pages: [],
      order: 'any'
    },
    configFields: [
      { 
        key: 'pages', 
        type: 'textarea', 
        label: 'Page URLs', 
        required: true, 
        placeholder: '/home\n/products\n/pricing',
        description: 'List of page URLs (one per line)'
      },
      { 
        key: 'order', 
        type: 'select', 
        label: 'Visit Order', 
        required: true, 
        options: [
          { value: 'any', label: 'Any Order' },
          { value: 'sequence', label: 'Exact Sequence' }
        ],
        default: 'any'
      }
    ]
  },
  {
    id: 'device-type-trigger',
    type: 'trigger',
    category: 'Device & Browser',
    name: 'Device Type',
    description: 'Trigger based on visitor device type',
    icon: 'Smartphone',
    defaultConfig: {
      deviceType: 'mobile'
    },
    configFields: [
      { 
        key: 'deviceType', 
        type: 'select', 
        label: 'Device Type', 
        required: true, 
        options: [
          { value: 'mobile', label: 'Mobile' },
          { value: 'tablet', label: 'Tablet' },
          { value: 'desktop', label: 'Desktop' }
        ]
      }
    ]
  },

  // Element-Based Event Triggers
  {
    id: 'element-click-trigger',
    type: 'trigger',
    category: 'Element Events',
    name: 'Element Click',
    description: 'Trigger when specific elements are clicked',
    icon: 'MousePointer',
    defaultConfig: {
      elementSelector: '.cta-button, .btn',
      clickCount: 1,
      timeWindow: 300000
    },
    configFields: [
      { 
        key: 'elementSelector', 
        type: 'css-selector', 
        label: 'CSS Selector', 
        required: true, 
        default: '.cta-button, .btn',
        description: 'CSS selector for elements to track (e.g., .cta-button, #signup-btn)'
      },
      { 
        key: 'clickCount', 
        type: 'number', 
        label: 'Click Count', 
        required: true, 
        default: 1,
        description: 'Number of clicks required to trigger'
      },
      { 
        key: 'timeWindow', 
        type: 'select', 
        label: 'Time Window', 
        required: true, 
        options: [
          { value: '60000', label: '1 minute' },
          { value: '300000', label: '5 minutes' },
          { value: '1800000', label: '30 minutes' },
          { value: '3600000', label: '1 hour' }
        ],
        default: '300000'
      }
    ]
  },
  {
    id: 'form-interaction-trigger',
    type: 'trigger',
    category: 'Element Events',
    name: 'Form Interaction',
    description: 'Trigger based on form field interactions',
    icon: 'FileText',
    defaultConfig: {
      formSelector: 'form',
      interactionType: 'focus',
      fieldType: 'any'
    },
    configFields: [
      { 
        key: 'formSelector', 
        type: 'css-selector', 
        label: 'Form Selector', 
        required: true, 
        default: 'form',
        description: 'CSS selector for forms to track'
      },
      { 
        key: 'interactionType', 
        type: 'select', 
        label: 'Interaction Type', 
        required: true, 
        options: [
          { value: 'focus', label: 'Field Focus' },
          { value: 'blur', label: 'Field Blur' },
          { value: 'input', label: 'Field Input' },
          { value: 'submit', label: 'Form Submit' }
        ],
        default: 'focus'
      },
      { 
        key: 'fieldType', 
        type: 'select', 
        label: 'Field Type', 
        required: false, 
        options: [
          { value: 'any', label: 'Any Field' },
          { value: 'email', label: 'Email Fields' },
          { value: 'text', label: 'Text Fields' },
          { value: 'password', label: 'Password Fields' },
          { value: 'textarea', label: 'Text Areas' }
        ],
        default: 'any'
      }
    ]
  },
  {
    id: 'element-visibility-trigger',
    type: 'trigger',
    category: 'Element Events',
    name: 'Element Visibility',
    description: 'Trigger when elements become visible in viewport',
    icon: 'Eye',
    defaultConfig: {
      elementSelector: '.content-section, article',
      visibilityThreshold: 50,
      duration: 0
    },
    configFields: [
      { 
        key: 'elementSelector', 
        type: 'css-selector', 
        label: 'Element Selector', 
        required: true, 
        default: '.content-section, article',
        description: 'CSS selector for elements to track visibility'
      },
      { 
        key: 'visibilityThreshold', 
        type: 'number', 
        label: 'Visibility Threshold (%)', 
        required: true, 
        default: 50,
        description: 'Percentage of element that must be visible (0-100)'
      },
      { 
        key: 'duration', 
        type: 'number', 
        label: 'Minimum Duration (ms)', 
        required: false, 
        default: 0,
        description: 'Minimum time element must be visible before triggering (milliseconds)'
      }
    ]
  },
  {
    id: 'element-hover-trigger',
    type: 'trigger',
    category: 'Element Events',
    name: 'Element Hover',
    description: 'Trigger when elements are hovered for specified duration',
    icon: 'MousePointer',
    defaultConfig: {
      elementSelector: '.product-card, .feature',
      hoverDuration: 2000,
      includeTouch: false
    },
    configFields: [
      { 
        key: 'elementSelector', 
        type: 'css-selector', 
        label: 'Element Selector', 
        required: true, 
        default: '.product-card, .feature',
        description: 'CSS selector for elements to track hover'
      },
      { 
        key: 'hoverDuration', 
        type: 'number', 
        label: 'Hover Duration (ms)', 
        required: true, 
        default: 2000,
        description: 'Minimum hover duration to trigger (milliseconds)'
      },
      { 
        key: 'includeTouch', 
        type: 'boolean', 
        label: 'Include Touch Events', 
        required: false, 
        default: false,
        description: 'Also trigger on touch/tap events on mobile'
      }
    ]
  },


  // Advanced Engagement Triggers
  {
    id: 'exit-intent-trigger',
    type: 'trigger',
    category: 'Engagement',
    name: 'Exit Intent',
    description: 'Trigger when user shows intent to leave the page',
    icon: 'LogOut',
    defaultConfig: {
      sensitivity: 'medium',
      delay: 500
    },
    configFields: [
      { 
        key: 'sensitivity', 
        type: 'select', 
        label: 'Detection Sensitivity', 
        required: true, 
        options: [
          { value: 'low', label: 'Low - Less sensitive' },
          { value: 'medium', label: 'Medium - Balanced' },
          { value: 'high', label: 'High - Very sensitive' }
        ],
        default: 'medium'
      },
      { 
        key: 'delay', 
        type: 'number', 
        label: 'Delay (milliseconds)', 
        required: true, 
        default: 500,
        description: 'Delay before triggering after exit intent detected'
      }
    ]
  },
  {
    id: 'inactivity-trigger',
    type: 'trigger',
    category: 'Engagement',
    name: 'User Inactivity',
    description: 'Trigger after user is inactive for specified time',
    icon: 'Timer',
    defaultConfig: {
      inactivityTime: 30,
      unit: 'seconds'
    },
    configFields: [
      { 
        key: 'inactivityTime', 
        type: 'number', 
        label: 'Inactivity Duration', 
        required: true, 
        default: 30,
        description: 'Time of inactivity before triggering'
      },
      { 
        key: 'unit', 
        type: 'select', 
        label: 'Time Unit', 
        required: true, 
        options: [
          { value: 'seconds', label: 'Seconds' },
          { value: 'minutes', label: 'Minutes' }
        ],
        default: 'seconds'
      }
    ]
  },
  {
    id: 'repeat-visitor-trigger',
    type: 'trigger',
    category: 'Engagement',
    name: 'Repeat Visitor',
    description: 'Trigger for returning visitors based on visit count',
    icon: 'RotateCcw',
    defaultConfig: {
      visitCount: 2,
      timeframe: 'all_time'
    },
    configFields: [
      { 
        key: 'visitCount', 
        type: 'number', 
        label: 'Minimum Visit Count', 
        required: true, 
        default: 2,
        description: 'Minimum number of visits to trigger'
      },
      { 
        key: 'timeframe', 
        type: 'select', 
        label: 'Timeframe', 
        required: true, 
        options: [
          { value: 'all_time', label: 'All Time' },
          { value: 'last_30_days', label: 'Last 30 Days' },
          { value: 'last_7_days', label: 'Last 7 Days' },
          { value: 'last_24_hours', label: 'Last 24 Hours' }
        ],
        default: 'all_time'
      }
    ]
  },
  {
    id: 'geolocation-trigger',
    type: 'trigger',
    category: 'Context',
    name: 'Geolocation',
    description: 'Trigger based on visitor\'s geographic location',
    icon: 'MapPin',
    defaultConfig: {
      locationType: 'country',
      locations: '',
      operator: 'includes'
    },
    configFields: [
      { 
        key: 'locationType', 
        type: 'select', 
        label: 'Location Type', 
        required: true, 
        options: [
          { value: 'country', label: 'Country' },
          { value: 'region', label: 'State/Region' },
          { value: 'city', label: 'City' }
        ],
        default: 'country'
      },
      { 
        key: 'locations', 
        type: 'textarea', 
        label: 'Target Locations', 
        required: true, 
        placeholder: 'United States\nCanada\nUnited Kingdom',
        description: 'List of locations (one per line)'
      },
      { 
        key: 'operator', 
        type: 'select', 
        label: 'Condition', 
        required: true, 
        options: [
          { value: 'includes', label: 'Is in list' },
          { value: 'excludes', label: 'Is not in list' }
        ],
        default: 'includes'
      }
    ]
  },
  {
    id: 'session-status-trigger',
    type: 'trigger',
    category: 'Context',
    name: 'Session Status',
    description: 'Trigger based on user login or session status',
    icon: 'Users',
    defaultConfig: {
      sessionType: 'logged_out',
      sessionDuration: 30
    },
    configFields: [
      { 
        key: 'sessionType', 
        type: 'select', 
        label: 'Session Status', 
        required: true, 
        options: [
          { value: 'logged_in', label: 'User is logged in' },
          { value: 'logged_out', label: 'User is not logged in' },
          { value: 'session_expiring', label: 'Session expiring soon' },
          { value: 'new_session', label: 'First session (new user)' }
        ],
        default: 'logged_out'
      },
      { 
        key: 'sessionDuration', 
        type: 'number', 
        label: 'Session Duration (minutes)', 
        required: false, 
        default: 30,
        description: 'For session expiring trigger - minutes before expiry'
      }
    ]
  },

  // Content Modification Actions
  {
    id: 'text-replacement-action',
    type: 'action',
    category: 'Content Modification',
    name: 'Replace Text',
    description: 'Replace text content in selected elements',
    icon: 'Type',
    defaultConfig: {
      selector: '',
      newText: '',
      originalText: ''
    },
    configFields: [
      { 
        key: 'selector', 
        type: 'css-selector', 
        label: 'CSS Selector', 
        required: true, 
        placeholder: '#headline, .cta-button, h1',
        description: 'CSS selector for target element(s)'
      },
      { 
        key: 'newText', 
        type: 'textarea', 
        label: 'New Text', 
        required: true, 
        placeholder: 'Your new text content here',
        description: 'Text to replace with'
      },
      { 
        key: 'originalText', 
        type: 'text', 
        label: 'Original Text (Optional)', 
        required: false, 
        placeholder: 'Text to replace',
        description: 'Specific text to replace (leave empty to replace all content)'
      }
    ]
  },
  {
    id: 'hide-element-action',
    type: 'action',
    category: 'Content Modification',
    name: 'Hide Element',
    description: 'Hide selected elements from view',
    icon: 'EyeOff',
    defaultConfig: {
      selector: '',
      animation: 'fade'
    },
    configFields: [
      { 
        key: 'selector', 
        type: 'css-selector', 
        label: 'CSS Selector', 
        required: true, 
        placeholder: '#banner, .popup, .sidebar',
        description: 'CSS selector for element(s) to hide'
      },
      { 
        key: 'animation', 
        type: 'select', 
        label: 'Hide Animation', 
        required: true, 
        options: [
          { value: 'none', label: 'No Animation' },
          { value: 'fade', label: 'Fade Out' },
          { value: 'slide', label: 'Slide Up' }
        ],
        default: 'fade'
      }
    ]
  },
  {
    id: 'show-element-action',
    type: 'action',
    category: 'Content Modification',
    name: 'Show Element',
    description: 'Show previously hidden elements',
    icon: 'Eye',
    defaultConfig: {
      selector: '',
      animation: 'fade'
    },
    configFields: [
      { 
        key: 'selector', 
        type: 'css-selector', 
        label: 'CSS Selector', 
        required: true, 
        placeholder: '#special-offer, .hidden-content',
        description: 'CSS selector for element(s) to show'
      },
      { 
        key: 'animation', 
        type: 'select', 
        label: 'Show Animation', 
        required: true, 
        options: [
          { value: 'none', label: 'No Animation' },
          { value: 'fade', label: 'Fade In' },
          { value: 'slide', label: 'Slide Down' }
        ],
        default: 'fade'
      }
    ]
  },
  {
    id: 'css-modification-action',
    type: 'action',
    category: 'Content Modification',
    name: 'Modify CSS',
    description: 'Apply custom CSS styles to elements',
    icon: 'Palette',
    defaultConfig: {
      selector: '',
      property: 'background-color',
      value: '',
      customProperty: ''
    },
    configFields: [
      { 
        key: 'selector', 
        type: 'css-selector', 
        label: 'CSS Selector', 
        required: true, 
        placeholder: '.button, #header, .cta-section',
        description: 'CSS selector for target element(s)'
      },
      { 
        key: 'property', 
        type: 'select', 
        label: 'CSS Property', 
        required: false, 
        options: [
          { value: '', label: 'Select a common property...' },
          { value: 'background-color', label: 'Background Color' },
          { value: 'color', label: 'Text Color' },
          { value: 'font-size', label: 'Font Size' },
          { value: 'font-weight', label: 'Font Weight' },
          { value: 'font-family', label: 'Font Family' },
          { value: 'margin', label: 'Margin' },
          { value: 'padding', label: 'Padding' },
          { value: 'border', label: 'Border' },
          { value: 'border-radius', label: 'Border Radius' },
          { value: 'width', label: 'Width' },
          { value: 'height', label: 'Height' },
          { value: 'display', label: 'Display' },
          { value: 'visibility', label: 'Visibility' },
          { value: 'opacity', label: 'Opacity' },
          { value: 'text-align', label: 'Text Alignment' },
          { value: 'text-decoration', label: 'Text Decoration' },
          { value: 'transform', label: 'Transform' },
          { value: 'transition', label: 'Transition' },
          { value: 'box-shadow', label: 'Box Shadow' }
        ],
        description: 'Select a common CSS property or use custom property below'
      },
      { 
        key: 'customProperty', 
        type: 'text', 
        label: 'Custom CSS Property', 
        required: false, 
        placeholder: 'line-height, z-index, position',
        description: 'Custom CSS property name (overrides selection above)'
      },
      { 
        key: 'value', 
        type: 'text', 
        label: 'CSS Value', 
        required: true, 
        placeholder: '#ff0000, 16px, bold, 10px 20px',
        description: 'New value for the CSS property'
      }
    ]
  },
  {
    id: 'redirect-action',
    type: 'action',
    category: 'Navigation',
    name: 'Redirect User',
    description: 'Redirect visitor to a different page',
    icon: 'ExternalLink',
    defaultConfig: {
      url: '',
      delay: 0,
      newTab: false
    },
    configFields: [
      { 
        key: 'url', 
        type: 'url', 
        label: 'Redirect URL', 
        required: true, 
        placeholder: 'https://example.com/special-page',
        description: 'URL to redirect the visitor to'
      },
      { 
        key: 'delay', 
        type: 'number', 
        label: 'Delay (seconds)', 
        required: false, 
        default: 0,
        description: 'Delay before redirect (0 for immediate)'
      },
      { 
        key: 'newTab', 
        type: 'boolean', 
        label: 'Open in New Tab', 
        required: false, 
        default: false
      }
    ]
  },
  {
    id: 'button-press-action',
    type: 'action',
    category: 'Navigation',
    name: 'Button Press',
    description: 'Change navigation path when a button is clicked',
    icon: 'MousePointer',
    defaultConfig: {
      buttonSelector: '',
      newPath: '',
      navigationType: 'push',
      delay: 0
    },
    configFields: [
      { 
        key: 'buttonSelector', 
        type: 'css-selector', 
        label: 'Button Selector', 
        required: true, 
        placeholder: '#cta-button, .nav-link, button[data-action]',
        description: 'CSS selector for the button to monitor'
      },
      { 
        key: 'newPath', 
        type: 'text', 
        label: 'New Navigation Path', 
        required: true, 
        placeholder: '/special-offer, /checkout, /pricing',
        description: 'The navigation path to change to when button is clicked'
      },
      { 
        key: 'navigationType', 
        type: 'select', 
        label: 'Navigation Type', 
        required: true, 
        options: [
          { value: 'push', label: 'Push State (Add to History)' },
          { value: 'replace', label: 'Replace State (No History)' },
          { value: 'redirect', label: 'Full Page Redirect' }
        ],
        default: 'push',
        description: 'How to handle the navigation change'
      },
      { 
        key: 'delay', 
        type: 'number', 
        label: 'Delay (seconds)', 
        required: false, 
        default: 0,
        description: 'Delay before navigation change (0 for immediate)'
      }
    ]
  },

  // Advanced Operations & Experiences
  {
    id: 'display-overlay-action',
    type: 'action',
    category: 'Advanced UI',
    name: 'Display Overlay',
    description: 'Show custom overlay, popup, or modal',
    icon: 'Square',
    defaultConfig: {
      overlayType: 'popup',
      position: 'center',
      content: '',
      showCloseButton: true,
      backdrop: true,
      width: 'medium',
      animation: 'fade',
      autoClose: false,
      autoCloseDelay: 5
    },
    configFields: [
      { 
        key: 'overlayType', 
        type: 'select', 
        label: 'Overlay Type', 
        required: true, 
        options: [
          { value: 'popup', label: 'Popup Modal' },
          { value: 'banner', label: 'Banner Notification' },
          { value: 'sidebar', label: 'Sidebar Slide-in' },
          { value: 'tooltip', label: 'Tooltip' },
          { value: 'fullscreen', label: 'Fullscreen Overlay' },
          { value: 'corner', label: 'Corner Notification' }
        ],
        default: 'popup'
      },
      { 
        key: 'position', 
        type: 'select', 
        label: 'Position', 
        required: true, 
        options: [
          { value: 'center', label: 'Center' },
          { value: 'top', label: 'Top' },
          { value: 'bottom', label: 'Bottom' },
          { value: 'left', label: 'Left' },
          { value: 'right', label: 'Right' },
          { value: 'top-left', label: 'Top Left' },
          { value: 'top-right', label: 'Top Right' },
          { value: 'bottom-left', label: 'Bottom Left' },
          { value: 'bottom-right', label: 'Bottom Right' }
        ],
        default: 'center'
      },
      { 
        key: 'width', 
        type: 'select', 
        label: 'Overlay Width', 
        required: true, 
        options: [
          { value: 'small', label: 'Small (300px)' },
          { value: 'medium', label: 'Medium (500px)' },
          { value: 'large', label: 'Large (700px)' },
          { value: 'full', label: 'Full Width' },
          { value: 'auto', label: 'Auto (content-based)' }
        ],
        default: 'medium'
      },
      { 
        key: 'animation', 
        type: 'select', 
        label: 'Animation', 
        required: true, 
        options: [
          { value: 'fade', label: 'Fade In' },
          { value: 'slide', label: 'Slide In' },
          { value: 'zoom', label: 'Zoom In' },
          { value: 'bounce', label: 'Bounce In' },
          { value: 'none', label: 'No Animation' }
        ],
        default: 'fade'
      },
      { 
        key: 'content', 
        type: 'textarea', 
        label: 'HTML Content', 
        required: true, 
        placeholder: '<h2>Special Offer!</h2><p>Get 20% off your order</p><button>Claim Now</button>',
        description: 'HTML content to display in the overlay'
      },
      { 
        key: 'showCloseButton', 
        type: 'boolean', 
        label: 'Show Close Button', 
        required: false, 
        default: true,
        description: 'Display an X button to close the overlay'
      },
      { 
        key: 'backdrop', 
        type: 'boolean', 
        label: 'Show Backdrop', 
        required: false, 
        default: true,
        description: 'Show semi-transparent background behind overlay'
      },
      { 
        key: 'autoClose', 
        type: 'boolean', 
        label: 'Auto Close', 
        required: false, 
        default: false,
        description: 'Automatically close overlay after specified time'
      },
      { 
        key: 'autoCloseDelay', 
        type: 'number', 
        label: 'Auto Close Delay (seconds)', 
        required: false, 
        default: 5,
        description: 'Time before auto-closing (when auto close is enabled)'
      },
      { 
        key: 'targetElement', 
        type: 'css-selector', 
        label: 'Target Element (Optional)', 
        required: false, 
        placeholder: '#specific-container, .content-area',
        description: 'CSS selector for specific element to attach overlay to (leave empty for body)'
      }
    ]
  },

  {
    id: 'custom-event-action',
    type: 'action',
    category: 'Advanced Integration',
    name: 'Custom Event',
    description: 'Trigger custom JavaScript events or analytics',
    icon: 'Code',
    defaultConfig: {
      eventType: 'analytics',
      eventName: '',
      eventData: '{}',
      targetSelector: ''
    },
    configFields: [
      { 
        key: 'eventType', 
        type: 'select', 
        label: 'Event Type', 
        required: true, 
        options: [
          { value: 'analytics', label: 'Analytics Event' },
          { value: 'custom_js', label: 'Custom JavaScript' },
          { value: 'api_call', label: 'API Call' },
          { value: 'dom_event', label: 'DOM Event' }
        ],
        default: 'analytics'
      },
      { 
        key: 'eventName', 
        type: 'text', 
        label: 'Event Name', 
        required: true, 
        placeholder: 'conversion_attempt, user_engagement',
        description: 'Name of the event to trigger'
      },
      { 
        key: 'eventData', 
        type: 'textarea', 
        label: 'Event Data (JSON)', 
        required: false, 
        placeholder: '{"category": "conversion", "value": 100}',
        description: 'JSON data to send with the event'
      },
      { 
        key: 'targetSelector', 
        type: 'css-selector', 
        label: 'Target Element (Optional)', 
        required: false, 
        placeholder: '#conversion-button',
        description: 'Element to attach event to (for DOM events)'
      }
    ]
  },
  {
    id: 'progressive-form-action',
    type: 'action',
    category: 'Lead Generation',
    name: 'Progressive Form',
    description: 'Show progressive profiling form fields',
    icon: 'FileText',
    defaultConfig: {
      formContainer: '',
      fieldType: 'email',
      placeholder: '',
      label: '',
      step: 1,
      isRequired: true,
      fieldName: '',
      options: ''
    },
    configFields: [
      { 
        key: 'formContainer', 
        type: 'css-selector', 
        label: 'Form Container', 
        required: true, 
        placeholder: '#progressive-form, .signup-form, .lead-form',
        description: 'Container where form field will be added'
      },
      { 
        key: 'fieldType', 
        type: 'select', 
        label: 'Field Type', 
        required: true, 
        options: [
          { value: 'email', label: 'Email Address' },
          { value: 'phone', label: 'Phone Number' },
          { value: 'text', label: 'Text Input' },
          { value: 'textarea', label: 'Multi-line Text' },
          { value: 'select', label: 'Dropdown Select' },
          { value: 'radio', label: 'Radio Buttons' },
          { value: 'checkbox', label: 'Checkbox' },
          { value: 'number', label: 'Number Input' },
          { value: 'date', label: 'Date Picker' },
          { value: 'url', label: 'URL Input' }
        ],
        default: 'email'
      },
      { 
        key: 'fieldName', 
        type: 'text', 
        label: 'Field Name', 
        required: true, 
        placeholder: 'email, phone, company, job_title',
        description: 'Internal name for the form field (used for data collection)'
      },
      { 
        key: 'label', 
        type: 'text', 
        label: 'Field Label', 
        required: true, 
        placeholder: 'What\'s your email address?',
        description: 'Label text displayed to the user'
      },
      { 
        key: 'placeholder', 
        type: 'text', 
        label: 'Placeholder Text', 
        required: false, 
        placeholder: 'Enter your email...',
        description: 'Placeholder text for the input field'
      },
      { 
        key: 'isRequired', 
        type: 'boolean', 
        label: 'Required Field', 
        required: false, 
        default: true,
        description: 'Whether this field is required to submit the form'
      },
      { 
        key: 'options', 
        type: 'textarea', 
        label: 'Options (for select/radio)', 
        required: false, 
        placeholder: 'Option 1\nOption 2\nOption 3',
        description: 'Options for dropdown or radio buttons (one per line)'
      },
      { 
        key: 'step', 
        type: 'number', 
        label: 'Progressive Step', 
        required: true, 
        default: 1,
        description: 'Step number in the progressive sequence (1, 2, 3, etc.)'
      }
    ]
  },
  {
    id: 'dynamic-content-action',
    type: 'action',
    category: 'Personalization',
    name: 'Dynamic Content',
    description: 'Show personalized content based on user data',
    icon: 'User',
    defaultConfig: {
      contentType: 'recommendation',
      dataSource: 'browsing_history',
      targetElement: '',
      templateHtml: ''
    },
    configFields: [
      { 
        key: 'contentType', 
        type: 'select', 
        label: 'Content Type', 
        required: true, 
        options: [
          { value: 'recommendation', label: 'Product/Content Recommendations' },
          { value: 'personalized_message', label: 'Personalized Message' },
          { value: 'location_specific', label: 'Location-Specific Content' },
          { value: 'behavior_based', label: 'Behavior-Based Content' }
        ],
        default: 'recommendation'
      },
      { 
        key: 'dataSource', 
        type: 'select', 
        label: 'Data Source', 
        required: true, 
        options: [
          { value: 'browsing_history', label: 'Browsing History' },
          { value: 'purchase_history', label: 'Purchase History' },
          { value: 'user_preferences', label: 'User Preferences' },
          { value: 'geolocation', label: 'Geographic Location' },
          { value: 'session_data', label: 'Current Session Data' }
        ],
        default: 'browsing_history'
      },
      { 
        key: 'targetElement', 
        type: 'css-selector', 
        label: 'Target Container', 
        required: true, 
        placeholder: '#recommendations, .personalized-section',
        description: 'Where to display the dynamic content'
      },
      { 
        key: 'templateHtml', 
        type: 'textarea', 
        label: 'Content Template', 
        required: true, 
        placeholder: '<div class="recommendation">{{title}}</div>',
        description: 'HTML template with placeholder variables'
      }
    ]
  },

  // Conditions


];